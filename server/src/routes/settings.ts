import { Router, Request, Response } from 'express';
import { Tables, getRecords, createRecords, deleteRecords } from '../services/airtable';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// Default stages used as fallback when the PipelineStages table is empty
const DEFAULT_STAGES = [
  { Name: 'Prospecting', Order: 1, Color: '#6366f1', Weight: 0.1 },
  { Name: 'Qualification', Order: 2, Color: '#8b5cf6', Weight: 0.25 },
  { Name: 'Proposal', Order: 3, Color: '#a855f7', Weight: 0.5 },
  { Name: 'Negotiation', Order: 4, Color: '#f59e0b', Weight: 0.75 },
  { Name: 'Closed Won', Order: 5, Color: '#10b981', Weight: 1.0 },
  { Name: 'Closed Lost', Order: 6, Color: '#ef4444', Weight: 0 },
];

// GET /api/settings/stages - Fetch pipeline stages from Airtable
router.get('/stages', async (_req: Request, res: Response) => {
  try {
    const { records } = await getRecords(Tables.PipelineStages, {
      sort: [{ field: 'Order', direction: 'asc' }],
    });

    if (records.length === 0) {
      // Return defaults when the table is empty (user hasn't customized yet)
      res.json({ stages: DEFAULT_STAGES, source: 'defaults' });
      return;
    }

    const stages = records.map((r: any) => ({
      id: r.id,
      Name: r.Name || '',
      Order: r.Order ?? 0,
      Color: r.Color || '#6366f1',
      Weight: r.Weight ?? 0,
    }));

    res.json({ stages, source: 'airtable' });
  } catch (err: any) {
    // If the PipelineStages table doesn't exist yet, return defaults
    if (err.message?.includes('TABLE_NOT_FOUND') || err.statusCode === 404) {
      res.json({ stages: DEFAULT_STAGES, source: 'defaults' });
      return;
    }
    console.error('Get stages error:', err);
    res.status(500).json({ error: 'Failed to fetch pipeline stages' });
  }
});

// POST /api/settings/stages/seed - Seed the PipelineStages table with defaults
router.post('/stages/seed', async (_req: Request, res: Response) => {
  try {
    const { records: existing } = await getRecords(Tables.PipelineStages);

    if (existing.length > 0) {
      res.json({ message: 'Stages already exist', stages: existing });
      return;
    }

    const created = await createRecords(
      Tables.PipelineStages,
      DEFAULT_STAGES.map((s) => ({ fields: s }))
    );

    res.status(201).json({ message: 'Default stages seeded', stages: created });
  } catch (err: any) {
    console.error('Seed stages error:', err);
    res.status(500).json({ error: 'Failed to seed stages. Make sure the PipelineStages table exists (run npm run setup:airtable).' });
  }
});

export default router;
