import { Router, Request, Response } from 'express';
import { Tables, getRecords, getRecord, createRecord, updateRecord, deleteRecord } from '../services/airtable';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// GET /api/lists
router.get('/', async (req: Request, res: Response) => {
  try {
    const { type } = req.query;
    let filterParts: string[] = [];

    // Show lists owned by user or shared with user
    filterParts.push(
      `OR({Owner} = '${req.user!.email.replace(/'/g, "\\'")}', FIND('${req.user!.email.replace(/'/g, "\\'")}', ARRAYJOIN({Shared With}, ',')))`
    );

    if (type) {
      filterParts.push(`{Type} = '${String(type).replace(/'/g, "\\'")}'`);
    }

    const filterByFormula = filterParts.length === 1
      ? filterParts[0]
      : `AND(${filterParts.join(', ')})`;

    const { records } = await getRecords(Tables.Lists, {
      filterByFormula,
      sort: [{ field: 'Name', direction: 'asc' }],
    });

    res.json({ records });
  } catch (err: any) {
    console.error('Get lists error:', err);
    res.status(500).json({ error: 'Failed to fetch lists' });
  }
});

// GET /api/lists/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const list = await getRecord(Tables.Lists, req.params.id);

    // Execute filters against the target table
    let matchedRecords: any[] = [];
    const targetTable = list.Type === 'companies' ? Tables.Companies : Tables.Contacts;

    if (list.Filters) {
      try {
        const filters = JSON.parse(list.Filters);
        let filterParts: string[] = [];

        for (const filter of filters) {
          switch (filter.operator) {
            case 'equals':
              filterParts.push(`{${filter.field}} = '${String(filter.value).replace(/'/g, "\\'")}'`);
              break;
            case 'contains':
              filterParts.push(`FIND('${String(filter.value).replace(/'/g, "\\'")}', {${filter.field}})`);
              break;
            case 'greater_than':
              filterParts.push(`{${filter.field}} > ${Number(filter.value)}`);
              break;
            case 'less_than':
              filterParts.push(`{${filter.field}} < ${Number(filter.value)}`);
              break;
            case 'is_empty':
              filterParts.push(`{${filter.field}} = ''`);
              break;
            case 'is_not_empty':
              filterParts.push(`{${filter.field}} != ''`);
              break;
          }
        }

        const filterByFormula = filterParts.length > 0
          ? filterParts.length === 1 ? filterParts[0] : `AND(${filterParts.join(', ')})`
          : undefined;

        const result = await getRecords(targetTable, { filterByFormula });
        matchedRecords = result.records;
      } catch {
        // If filters fail to parse, return empty
      }
    }

    res.json({ ...list, matchedRecords });
  } catch (err: any) {
    console.error('Get list error:', err);
    res.status(500).json({ error: 'Failed to fetch list' });
  }
});

// POST /api/lists
router.post('/', async (req: Request, res: Response) => {
  try {
    const { Name, Type, Filters, 'Shared With': SharedWith } = req.body;

    if (!Name || !Type) {
      res.status(400).json({ error: 'Name and Type are required' });
      return;
    }

    const fields: Record<string, any> = {
      Name,
      Type,
      Filters: typeof Filters === 'string' ? Filters : JSON.stringify(Filters || []),
      Owner: req.user!.email,
      'Shared With': SharedWith || [],
    };

    const record = await createRecord(Tables.Lists, fields);
    res.status(201).json(record);
  } catch (err: any) {
    console.error('Create list error:', err);
    res.status(500).json({ error: 'Failed to create list' });
  }
});

// PATCH /api/lists/:id
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const updates: Record<string, any> = {};
    const allowedFields = ['Name', 'Type', 'Filters', 'Shared With'];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        const val = req.body[field];
        updates[field] = field === 'Filters' && typeof val !== 'string'
          ? JSON.stringify(val)
          : val;
      }
    }

    const record = await updateRecord(Tables.Lists, req.params.id, updates);
    res.json(record);
  } catch (err: any) {
    console.error('Update list error:', err);
    res.status(500).json({ error: 'Failed to update list' });
  }
});

// DELETE /api/lists/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await deleteRecord(Tables.Lists, req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    console.error('Delete list error:', err);
    res.status(500).json({ error: 'Failed to delete list' });
  }
});

// POST /api/lists/:id/export
router.post('/:id/export', async (req: Request, res: Response) => {
  try {
    const list = await getRecord(Tables.Lists, req.params.id);
    const targetTable = list.Type === 'companies' ? Tables.Companies : Tables.Contacts;

    let filterByFormula: string | undefined;
    if (list.Filters) {
      try {
        const filters = JSON.parse(list.Filters);
        const filterParts: string[] = [];
        for (const filter of filters) {
          if (filter.operator === 'equals') {
            filterParts.push(`{${filter.field}} = '${String(filter.value).replace(/'/g, "\\'")}'`);
          } else if (filter.operator === 'contains') {
            filterParts.push(`FIND('${String(filter.value).replace(/'/g, "\\'")}', {${filter.field}})`);
          }
        }
        filterByFormula = filterParts.length > 1
          ? `AND(${filterParts.join(', ')})`
          : filterParts[0];
      } catch {}
    }

    const { records } = await getRecords(targetTable, { filterByFormula });

    // Convert to CSV
    if (records.length === 0) {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${list.Name}.csv"`);
      res.send('');
      return;
    }

    const headers = Object.keys(records[0]).filter(k => k !== 'id');
    const csvRows = [headers.join(',')];

    for (const record of records) {
      const values = headers.map(h => {
        const val = record[h];
        const str = Array.isArray(val) ? val.join(';') : String(val ?? '');
        return `"${str.replace(/"/g, '""')}"`;
      });
      csvRows.push(values.join(','));
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${list.Name}.csv"`);
    res.send(csvRows.join('\n'));
  } catch (err: any) {
    console.error('Export list error:', err);
    res.status(500).json({ error: 'Failed to export list' });
  }
});

export default router;
