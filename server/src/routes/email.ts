import { Router, Request, Response } from 'express';
import { Tables, getRecords, createRecord, createRecords } from '../services/airtable';
import { authenticate } from '../middleware/auth';
import { testConnection, fetchRecentEmails, getProviderConfig, EmailAccount } from '../services/email';
import { extractContacts, detectDealSignals, detectSentiment, extractDomainFromEmail } from '../utils/email-parser';

const router = Router();
router.use(authenticate);

// In-memory store for email configs (per user session).
// In production, store encrypted in Airtable or a secrets manager.
const emailConfigs: Map<string, EmailAccount> = new Map();

// POST /api/email/connect - Connect an email account
router.post('/connect', async (req: Request, res: Response) => {
  try {
    const { provider, email, password, host, port } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password (or app password) are required' });
      return;
    }

    const providerConfig = provider ? getProviderConfig(provider) : {};

    const account: EmailAccount = {
      host: host || providerConfig.host || '',
      port: port || providerConfig.port || 993,
      secure: true,
      auth: { user: email, pass: password },
    };

    if (!account.host) {
      res.status(400).json({ error: 'Could not determine IMAP host. Provide a provider (gmail/outlook) or custom host.' });
      return;
    }

    const connected = await testConnection(account);
    if (!connected) {
      res.status(400).json({ error: 'Failed to connect. Check your credentials. For Gmail, use an App Password (not your regular password).' });
      return;
    }

    // Store config keyed by user
    emailConfigs.set(req.user!.email, account);

    res.json({ success: true, message: 'Email account connected successfully', email });
  } catch (err: any) {
    console.error('Email connect error:', err);
    res.status(500).json({ error: 'Failed to connect email account' });
  }
});

// GET /api/email/status - Check connection status
router.get('/status', async (req: Request, res: Response) => {
  const config = emailConfigs.get(req.user!.email);
  res.json({
    connected: !!config,
    email: config?.auth.user || null,
  });
});

// POST /api/email/disconnect - Disconnect email account
router.post('/disconnect', async (req: Request, res: Response) => {
  emailConfigs.delete(req.user!.email);
  res.json({ success: true, message: 'Email account disconnected' });
});

// POST /api/email/sync - Fetch emails and return parsed results
router.post('/sync', async (req: Request, res: Response) => {
  try {
    const config = emailConfigs.get(req.user!.email);
    if (!config) {
      res.status(400).json({ error: 'No email account connected. Connect one first.' });
      return;
    }

    const { limit = 30, sinceDays = 14 } = req.body;

    const emails = await fetchRecentEmails(config, Number(limit), Number(sinceDays));

    // Enrich each email with extracted contacts and deal signals
    const enrichedEmails = emails.map(email => {
      const contacts = extractContacts(email);
      const dealSignal = detectDealSignals(email);
      const sentiment = detectSentiment(email);

      return {
        ...email,
        extractedContacts: contacts,
        dealSignal,
        sentiment,
      };
    });

    res.json({ emails: enrichedEmails, count: enrichedEmails.length });
  } catch (err: any) {
    console.error('Email sync error:', err);
    res.status(500).json({ error: err.message || 'Failed to sync emails' });
  }
});

// POST /api/email/import-contact - Create a contact from an email
router.post('/import-contact', async (req: Request, res: Response) => {
  try {
    const { name, email: contactEmail, source } = req.body;

    if (!contactEmail) {
      res.status(400).json({ error: 'Email address is required' });
      return;
    }

    // Check if contact already exists
    const { records: existing } = await getRecords(Tables.Contacts, {
      filterByFormula: `LOWER({Email}) = '${contactEmail.toLowerCase().replace(/'/g, "\\'")}'`,
      maxRecords: 1,
    });

    if (existing.length > 0) {
      res.json({ contact: existing[0], alreadyExisted: true });
      return;
    }

    // Create new contact
    const domain = extractDomainFromEmail(contactEmail);
    const contact = await createRecord(Tables.Contacts, {
      Name: name || contactEmail.split('@')[0],
      Email: contactEmail,
      Owner: req.user!.email,
      Tags: ['email-import'],
      Notes: source ? `Imported from email: ${source}` : 'Imported from email sync',
    });

    // Log activity
    await createRecord(Tables.Activities, {
      User: req.user!.email,
      'Action Type': 'created',
      'Entity Type': 'contact',
      'Entity ID': contact.id,
      'Entity Name': name || contactEmail,
      Timestamp: new Date().toISOString(),
      Details: `Auto-imported contact from email`,
    });

    res.status(201).json({ contact, alreadyExisted: false });
  } catch (err: any) {
    console.error('Import contact error:', err);
    res.status(500).json({ error: 'Failed to import contact' });
  }
});

// POST /api/email/log-interaction - Log an email as an interaction
router.post('/log-interaction', async (req: Request, res: Response) => {
  try {
    const { subject, date, from, to, snippet, sentiment, contactIds } = req.body;

    const participants = [from, ...(to || [])].filter(Boolean).join(', ');

    const fields: Record<string, any> = {
      Type: 'email',
      Date: date || new Date().toISOString(),
      Subject: subject || '(No Subject)',
      Notes: snippet || '',
      Sentiment: sentiment || 'neutral',
      'Auto-Captured': true,
      'Created By': req.user!.email,
      Participants: participants,
    };

    if (contactIds && contactIds.length > 0) {
      fields.Contact = contactIds;
    }

    const record = await createRecord(Tables.Interactions, fields);

    // Update last interaction date on related contacts
    if (contactIds) {
      for (const cid of contactIds) {
        try {
          const { updateRecord } = await import('../services/airtable');
          await updateRecord(Tables.Contacts, cid, {
            'Last Interaction Date': date || new Date().toISOString(),
          });
        } catch { /* best effort */ }
      }
    }

    await createRecord(Tables.Activities, {
      User: req.user!.email,
      'Action Type': 'logged',
      'Entity Type': 'interaction',
      'Entity ID': record.id,
      'Entity Name': subject || 'Email interaction',
      Timestamp: new Date().toISOString(),
      Details: `Auto-logged email: ${subject || '(No Subject)'}`,
    });

    res.status(201).json(record);
  } catch (err: any) {
    console.error('Log interaction error:', err);
    res.status(500).json({ error: 'Failed to log interaction' });
  }
});

// POST /api/email/bulk-import - Import multiple contacts + interactions from emails
router.post('/bulk-import', async (req: Request, res: Response) => {
  try {
    const { emails } = req.body;

    if (!Array.isArray(emails) || emails.length === 0) {
      res.status(400).json({ error: 'Provide an array of emails to import' });
      return;
    }

    let contactsCreated = 0;
    let contactsExisted = 0;
    let interactionsLogged = 0;

    for (const email of emails) {
      // Import contacts
      for (const contact of (email.extractedContacts || [])) {
        if (!contact.email || contact.email === req.user!.email) continue;

        const { records: existing } = await getRecords(Tables.Contacts, {
          filterByFormula: `LOWER({Email}) = '${contact.email.toLowerCase().replace(/'/g, "\\'")}'`,
          maxRecords: 1,
        });

        if (existing.length > 0) {
          contactsExisted++;
        } else {
          await createRecord(Tables.Contacts, {
            Name: contact.name || contact.email.split('@')[0],
            Email: contact.email,
            Owner: req.user!.email,
            Tags: ['email-import'],
          });
          contactsCreated++;
        }
      }

      // Log as interaction
      await createRecord(Tables.Interactions, {
        Type: 'email',
        Date: email.date || new Date().toISOString(),
        Subject: email.subject || '(No Subject)',
        Notes: email.snippet || '',
        Sentiment: email.sentiment || 'neutral',
        'Auto-Captured': true,
        'Created By': req.user!.email,
        Participants: [email.from?.address, ...(email.to || []).map((t: any) => t.address)].filter(Boolean).join(', '),
      });
      interactionsLogged++;
    }

    res.json({
      success: true,
      contactsCreated,
      contactsExisted,
      interactionsLogged,
    });
  } catch (err: any) {
    console.error('Bulk import error:', err);
    res.status(500).json({ error: 'Failed to bulk import emails' });
  }
});

export default router;
