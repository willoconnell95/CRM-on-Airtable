import { Router, Request, Response } from 'express';
import { Tables, getRecords, getRecord, createRecord, updateRecord, deleteRecord } from '../services/airtable';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// GET /api/deals
router.get('/', async (req: Request, res: Response) => {
  try {
    const { stage, owner, minValue, maxValue, search, sort, direction } = req.query;
    let filterParts: string[] = [];

    if (stage) {
      filterParts.push(`{Stage} = '${String(stage).replace(/'/g, "\\'")}'`);
    }
    if (owner) {
      filterParts.push(`{Owner} = '${String(owner).replace(/'/g, "\\'")}'`);
    }
    if (minValue) {
      filterParts.push(`{Value} >= ${Number(minValue)}`);
    }
    if (maxValue) {
      filterParts.push(`{Value} <= ${Number(maxValue)}`);
    }
    if (search) {
      filterParts.push(`FIND(LOWER('${String(search).replace(/'/g, "\\'")}'), LOWER({Name}))`);
    }

    const filterByFormula = filterParts.length > 0
      ? filterParts.length === 1 ? filterParts[0] : `AND(${filterParts.join(', ')})`
      : undefined;

    const { records } = await getRecords(Tables.Deals, {
      filterByFormula,
      sort: [{ field: String(sort || 'Close Date'), direction: (direction === 'asc' ? 'asc' : 'desc') as 'asc' | 'desc' }],
    });

    res.json({ records });
  } catch (err: any) {
    console.error('Get deals error:', err);
    res.status(500).json({ error: 'Failed to fetch deals' });
  }
});

// GET /api/deals/pipeline
router.get('/pipeline', async (req: Request, res: Response) => {
  try {
    const { owner } = req.query;
    let filterByFormula: string | undefined;

    if (owner) {
      filterByFormula = `{Owner} = '${String(owner).replace(/'/g, "\\'")}'`;
    }

    const { records } = await getRecords(Tables.Deals, {
      filterByFormula,
      sort: [{ field: 'Value', direction: 'desc' }],
    });

    // Group by stage
    const pipeline: Record<string, any[]> = {};
    const stages = ['Prospecting', 'Qualification', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'];

    for (const stage of stages) {
      pipeline[stage] = [];
    }

    for (const record of records) {
      const stage = record.Stage || 'Prospecting';
      if (!pipeline[stage]) pipeline[stage] = [];
      pipeline[stage].push(record);
    }

    // Calculate weighted pipeline values
    const stageWeights: Record<string, number> = {
      Prospecting: 0.1,
      Qualification: 0.25,
      Proposal: 0.5,
      Negotiation: 0.75,
      'Closed Won': 1.0,
      'Closed Lost': 0,
    };

    const summary = {
      totalValue: records.reduce((sum: number, r: any) => sum + (r.Value || 0), 0),
      weightedValue: records.reduce((sum: number, r: any) => {
        const weight = stageWeights[r.Stage || 'Prospecting'] || 0;
        return sum + (r.Value || 0) * weight;
      }, 0),
      dealCount: records.length,
      stageBreakdown: Object.entries(pipeline).map(([stage, deals]) => ({
        stage,
        count: deals.length,
        value: deals.reduce((sum: number, d: any) => sum + (d.Value || 0), 0),
        weightedValue: deals.reduce((sum: number, d: any) => {
          const weight = stageWeights[stage] || 0;
          return sum + (d.Value || 0) * weight;
        }, 0),
      })),
    };

    res.json({ pipeline, summary });
  } catch (err: any) {
    console.error('Get pipeline error:', err);
    res.status(500).json({ error: 'Failed to fetch pipeline' });
  }
});

// GET /api/deals/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const record = await getRecord(Tables.Deals, req.params.id);
    res.json(record);
  } catch (err: any) {
    console.error('Get deal error:', err);
    res.status(500).json({ error: 'Failed to fetch deal' });
  }
});

// POST /api/deals
router.post('/', async (req: Request, res: Response) => {
  try {
    const { Name, Company, Contacts, Stage, Value, Probability, 'Close Date': CloseDate, Owner, Tags, Description } = req.body;

    if (!Name) {
      res.status(400).json({ error: 'Name is required' });
      return;
    }

    const fields: Record<string, any> = {
      Name,
      Stage: Stage || 'Prospecting',
      Value: Value || 0,
      Probability: Probability || 0,
      'Close Date': CloseDate || '',
      Owner: Owner || req.user!.email,
      Tags: Tags || [],
      Description: Description || '',
    };
    if (Company) fields.Company = Array.isArray(Company) ? Company : [Company];
    if (Contacts) fields.Contacts = Array.isArray(Contacts) ? Contacts : [Contacts];

    const record = await createRecord(Tables.Deals, fields);

    await createRecord(Tables.Activities, {
      User: req.user!.email,
      'Action Type': 'created',
      'Entity Type': 'deal',
      'Entity ID': record.id,
      'Entity Name': Name,
      Timestamp: new Date().toISOString(),
      Details: `Created deal ${Name} (${Stage || 'Prospecting'}) - $${Value || 0}`,
    });

    res.status(201).json(record);
  } catch (err: any) {
    console.error('Create deal error:', err);
    res.status(500).json({ error: 'Failed to create deal' });
  }
});

// PATCH /api/deals/:id
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    // Get current deal to detect stage changes
    const currentDeal = await getRecord(Tables.Deals, req.params.id);

    const updates: Record<string, any> = {};
    const allowedFields = ['Name', 'Company', 'Contacts', 'Stage', 'Value', 'Probability', 'Close Date', 'Owner', 'Tags', 'Description'];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    const record = await updateRecord(Tables.Deals, req.params.id, updates);

    // Log stage change specifically
    if (updates.Stage && updates.Stage !== currentDeal.Stage) {
      await createRecord(Tables.Activities, {
        User: req.user!.email,
        'Action Type': 'stage_changed',
        'Entity Type': 'deal',
        'Entity ID': req.params.id,
        'Entity Name': record.Name || '',
        Timestamp: new Date().toISOString(),
        Details: `Deal moved from ${currentDeal.Stage} to ${updates.Stage}`,
      });
    }

    res.json(record);
  } catch (err: any) {
    console.error('Update deal error:', err);
    res.status(500).json({ error: 'Failed to update deal' });
  }
});

// DELETE /api/deals/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await deleteRecord(Tables.Deals, req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    console.error('Delete deal error:', err);
    res.status(500).json({ error: 'Failed to delete deal' });
  }
});

export default router;
