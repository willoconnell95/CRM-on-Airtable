import { Router, Request, Response } from 'express';
import { Tables, getRecords, getRecord, createRecord, updateRecord, deleteRecord, createRecords } from '../services/airtable';
import { authenticate } from '../middleware/auth';
import { enrichByEmail, findDuplicateContacts, findConnections } from '../services/enrichment';
import { calculateRelationshipStrength } from '../utils/relationship-strength';

const router = Router();
router.use(authenticate);

// GET /api/contacts
router.get('/', async (req: Request, res: Response) => {
  try {
    const { search, tags, owner, sort, direction, company } = req.query;
    let filterParts: string[] = [];

    if (search) {
      filterParts.push(
        `OR(FIND(LOWER('${String(search).replace(/'/g, "\\'")}'), LOWER({Name})), FIND(LOWER('${String(search).replace(/'/g, "\\'")}'), LOWER({Email})), FIND(LOWER('${String(search).replace(/'/g, "\\'")}'), LOWER({Title})))`
      );
    }
    if (tags) {
      filterParts.push(`FIND('${String(tags).replace(/'/g, "\\'")}', ARRAYJOIN({Tags}, ','))`);
    }
    if (owner) {
      filterParts.push(`{Owner} = '${String(owner).replace(/'/g, "\\'")}'`);
    }
    if (company) {
      filterParts.push(`FIND('${String(company).replace(/'/g, "\\'")}', ARRAYJOIN({Company}))`);
    }

    const filterByFormula = filterParts.length > 0
      ? filterParts.length === 1
        ? filterParts[0]
        : `AND(${filterParts.join(', ')})`
      : undefined;

    const sortField = String(sort || 'Name');
    const sortDir = (direction === 'desc' ? 'desc' : 'asc') as 'asc' | 'desc';

    const { records } = await getRecords(Tables.Contacts, {
      filterByFormula,
      sort: [{ field: sortField, direction: sortDir }],
    });

    res.json({ records });
  } catch (err: any) {
    console.error('Get contacts error:', err);
    res.status(500).json({ error: 'Failed to fetch contacts' });
  }
});

// GET /api/contacts/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const record = await getRecord(Tables.Contacts, req.params.id);

    // Fetch related interactions
    const { records: interactions } = await getRecords(Tables.Interactions, {
      filterByFormula: `FIND('${req.params.id}', ARRAYJOIN({Contact}))`,
      sort: [{ field: 'Date', direction: 'desc' }],
    });

    // Calculate relationship strength
    const interactionData = interactions.map((i: any) => ({
      type: i.Type || 'note',
      date: i.Date || new Date().toISOString(),
      sentiment: i.Sentiment || 'neutral',
    }));
    const strength = calculateRelationshipStrength(interactionData);

    // Fetch deals involving this contact
    const { records: deals } = await getRecords(Tables.Deals, {
      filterByFormula: `FIND('${req.params.id}', ARRAYJOIN({Contacts}))`,
    });

    res.json({
      ...record,
      interactions,
      deals,
      calculatedStrength: strength,
    });
  } catch (err: any) {
    console.error('Get contact error:', err);
    res.status(500).json({ error: 'Failed to fetch contact' });
  }
});

// POST /api/contacts
router.post('/', async (req: Request, res: Response) => {
  try {
    const { Name, Email, Phone, Company, Title, LinkedIn, Tags, Owner, Notes } = req.body;

    if (!Name) {
      res.status(400).json({ error: 'Name is required' });
      return;
    }

    // Check for duplicates
    if (Email) {
      const duplicates = await findDuplicateContacts(Email);
      if (duplicates.length > 0) {
        res.status(409).json({
          error: 'Duplicate contact found',
          duplicates,
        });
        return;
      }
    }

    const fields: Record<string, any> = {
      Name,
      Email: Email || '',
      Phone: Phone || '',
      Title: Title || '',
      LinkedIn: LinkedIn || '',
      Tags: Tags || [],
      'Relationship Strength': 0,
      'Last Interaction Date': new Date().toISOString().split('T')[0],
      Owner: Owner || req.user!.email,
      Notes: Notes || '',
    };
    if (Company) fields.Company = Array.isArray(Company) ? Company : [Company];

    const record = await createRecord(Tables.Contacts, fields);

    // Log activity
    await createRecord(Tables.Activities, {
      User: req.user!.email,
      'Action Type': 'created',
      'Entity Type': 'contact',
      'Entity ID': record.id,
      'Entity Name': Name,
      Timestamp: new Date().toISOString(),
      Details: `Created contact ${Name}`,
    });

    // Try enrichment in background
    if (Email) {
      enrichByEmail(Email).then(async (enrichment) => {
        if (enrichment.person) {
          const updates: Record<string, any> = {};
          if (enrichment.person.title && !Title) updates.Title = enrichment.person.title;
          if (enrichment.person.linkedin && !LinkedIn) updates.LinkedIn = enrichment.person.linkedin;
          if (enrichment.person.avatar) updates.Avatar = enrichment.person.avatar;
          if (Object.keys(updates).length > 0) {
            await updateRecord(Tables.Contacts, record.id, updates);
          }
        }
      }).catch(() => { /* enrichment is best-effort */ });
    }

    res.status(201).json(record);
  } catch (err: any) {
    console.error('Create contact error:', err);
    res.status(500).json({ error: 'Failed to create contact' });
  }
});

// PATCH /api/contacts/:id
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const updates: Record<string, any> = {};
    const allowedFields = ['Name', 'Email', 'Phone', 'Company', 'Title', 'LinkedIn', 'Tags', 'Owner', 'Notes', 'Relationship Strength'];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    const record = await updateRecord(Tables.Contacts, req.params.id, updates);

    await createRecord(Tables.Activities, {
      User: req.user!.email,
      'Action Type': 'updated',
      'Entity Type': 'contact',
      'Entity ID': req.params.id,
      'Entity Name': record.Name || '',
      Timestamp: new Date().toISOString(),
      Details: `Updated contact fields: ${Object.keys(updates).join(', ')}`,
    });

    res.json(record);
  } catch (err: any) {
    console.error('Update contact error:', err);
    res.status(500).json({ error: 'Failed to update contact' });
  }
});

// DELETE /api/contacts/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await deleteRecord(Tables.Contacts, req.params.id);

    await createRecord(Tables.Activities, {
      User: req.user!.email,
      'Action Type': 'deleted',
      'Entity Type': 'contact',
      'Entity ID': req.params.id,
      'Entity Name': '',
      Timestamp: new Date().toISOString(),
      Details: 'Deleted contact',
    });

    res.json({ success: true });
  } catch (err: any) {
    console.error('Delete contact error:', err);
    res.status(500).json({ error: 'Failed to delete contact' });
  }
});

// POST /api/contacts/bulk-import
router.post('/bulk-import', async (req: Request, res: Response) => {
  try {
    const { contacts } = req.body;
    if (!Array.isArray(contacts) || contacts.length === 0) {
      res.status(400).json({ error: 'contacts array is required' });
      return;
    }

    const recordsData = contacts.map((c: any) => ({
      fields: {
        Name: c.Name || c.name || '',
        Email: c.Email || c.email || '',
        Phone: c.Phone || c.phone || '',
        Title: c.Title || c.title || '',
        LinkedIn: c.LinkedIn || c.linkedin || '',
        Tags: c.Tags || c.tags || [],
        'Relationship Strength': 0,
        'Last Interaction Date': new Date().toISOString().split('T')[0],
        Owner: req.user!.email,
      },
    }));

    const created = await createRecords(Tables.Contacts, recordsData);
    res.status(201).json({ created: created.length, records: created });
  } catch (err: any) {
    console.error('Bulk import error:', err);
    res.status(500).json({ error: 'Failed to bulk import contacts' });
  }
});

// POST /api/contacts/:id/enrich
router.post('/:id/enrich', async (req: Request, res: Response) => {
  try {
    const contact = await getRecord(Tables.Contacts, req.params.id);
    const email = contact.Email;

    if (!email) {
      res.status(400).json({ error: 'Contact has no email for enrichment' });
      return;
    }

    const enrichment = await enrichByEmail(email);
    const updates: Record<string, any> = {};

    if (enrichment.person) {
      if (enrichment.person.title) updates.Title = enrichment.person.title;
      if (enrichment.person.linkedin) updates.LinkedIn = enrichment.person.linkedin;
      if (enrichment.person.avatar) updates.Avatar = enrichment.person.avatar;
    }

    if (Object.keys(updates).length > 0) {
      const updated = await updateRecord(Tables.Contacts, req.params.id, updates);
      res.json({ enriched: true, updates, record: updated });
    } else {
      res.json({ enriched: false, message: 'No enrichment data found' });
    }
  } catch (err: any) {
    console.error('Enrich contact error:', err);
    res.status(500).json({ error: 'Failed to enrich contact' });
  }
});

export default router;
