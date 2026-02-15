import { Router, Request, Response } from 'express';
import { Tables, getRecords } from '../services/airtable';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// GET /api/activities
router.get('/', async (req: Request, res: Response) => {
  try {
    const { entityType, entityId, user, limit } = req.query;
    let filterParts: string[] = [];

    if (entityType) {
      filterParts.push(`{Entity Type} = '${String(entityType).replace(/'/g, "\\'")}'`);
    }
    if (entityId) {
      filterParts.push(`{Entity ID} = '${String(entityId).replace(/'/g, "\\'")}'`);
    }
    if (user) {
      filterParts.push(`{User} = '${String(user).replace(/'/g, "\\'")}'`);
    }

    const filterByFormula = filterParts.length > 0
      ? filterParts.length === 1 ? filterParts[0] : `AND(${filterParts.join(', ')})`
      : undefined;

    const { records } = await getRecords(Tables.Activities, {
      filterByFormula,
      sort: [{ field: 'Timestamp', direction: 'desc' }],
      maxRecords: Number(limit) || 50,
    });

    res.json({ records });
  } catch (err: any) {
    console.error('Get activities error:', err);
    res.status(500).json({ error: 'Failed to fetch activities' });
  }
});

export default router;
