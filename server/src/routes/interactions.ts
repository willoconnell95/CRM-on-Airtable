import { Router, Request, Response } from 'express';
import { Tables, getRecords, getRecord, createRecord, updateRecord, deleteRecord } from '../services/airtable';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// GET /api/interactions
router.get('/', async (req: Request, res: Response) => {
  try {
    const { type, contactId, companyId, startDate, endDate, sort, direction } = req.query;
    let filterParts: string[] = [];

    if (type) {
      filterParts.push(`{Type} = '${String(type).replace(/'/g, "\\'")}'`);
    }
    if (contactId) {
      filterParts.push(`FIND('${String(contactId)}', ARRAYJOIN({Contact}))`);
    }
    if (companyId) {
      filterParts.push(`FIND('${String(companyId)}', ARRAYJOIN({Company}))`);
    }
    if (startDate) {
      filterParts.push(`IS_AFTER({Date}, '${String(startDate)}')`);
    }
    if (endDate) {
      filterParts.push(`IS_BEFORE({Date}, '${String(endDate)}')`);
    }

    const filterByFormula = filterParts.length > 0
      ? filterParts.length === 1 ? filterParts[0] : `AND(${filterParts.join(', ')})`
      : undefined;

    const { records } = await getRecords(Tables.Interactions, {
      filterByFormula,
      sort: [{ field: String(sort || 'Date'), direction: (direction === 'asc' ? 'asc' : 'desc') as 'asc' | 'desc' }],
    });

    res.json({ records });
  } catch (err: any) {
    console.error('Get interactions error:', err);
    res.status(500).json({ error: 'Failed to fetch interactions' });
  }
});

// GET /api/interactions/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const record = await getRecord(Tables.Interactions, req.params.id);
    res.json(record);
  } catch (err: any) {
    console.error('Get interaction error:', err);
    res.status(500).json({ error: 'Failed to fetch interaction' });
  }
});

// POST /api/interactions
router.post('/', async (req: Request, res: Response) => {
  try {
    const { Type, Date: InteractionDate, Subject, Notes, Sentiment, Contact, Company, Participants } = req.body;

    if (!Type || !InteractionDate) {
      res.status(400).json({ error: 'Type and Date are required' });
      return;
    }

    const fields: Record<string, any> = {
      Type,
      Date: InteractionDate,
      Subject: Subject || '',
      Notes: Notes || '',
      Sentiment: Sentiment || 'neutral',
      'Auto-Captured': false,
      'Created By': req.user!.email,
      Participants: Participants || '',
    };
    if (Contact) fields.Contact = Array.isArray(Contact) ? Contact : [Contact];
    if (Company) fields.Company = Array.isArray(Company) ? Company : [Company];

    const record = await createRecord(Tables.Interactions, fields);

    // Update last interaction date on related contacts
    if (Contact) {
      const contactIds = Array.isArray(Contact) ? Contact : [Contact];
      for (const cid of contactIds) {
        try {
          await updateRecord(Tables.Contacts, cid, {
            'Last Interaction Date': InteractionDate,
          });
        } catch { /* best effort */ }
      }
    }

    // Log activity
    await createRecord(Tables.Activities, {
      User: req.user!.email,
      'Action Type': 'logged',
      'Entity Type': 'interaction',
      'Entity ID': record.id,
      'Entity Name': Subject || Type,
      Timestamp: new Date().toISOString(),
      Details: `Logged ${Type}: ${Subject || 'No subject'}`,
    });

    res.status(201).json(record);
  } catch (err: any) {
    console.error('Create interaction error:', err);
    res.status(500).json({ error: 'Failed to create interaction' });
  }
});

// PATCH /api/interactions/:id
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const updates: Record<string, any> = {};
    const allowedFields = ['Type', 'Date', 'Subject', 'Notes', 'Sentiment', 'Contact', 'Company', 'Participants'];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    const record = await updateRecord(Tables.Interactions, req.params.id, updates);
    res.json(record);
  } catch (err: any) {
    console.error('Update interaction error:', err);
    res.status(500).json({ error: 'Failed to update interaction' });
  }
});

// DELETE /api/interactions/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await deleteRecord(Tables.Interactions, req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    console.error('Delete interaction error:', err);
    res.status(500).json({ error: 'Failed to delete interaction' });
  }
});

export default router;
