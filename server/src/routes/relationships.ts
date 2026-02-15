import { Router, Request, Response } from 'express';
import { Tables, getRecords, getRecord, createRecord, updateRecord, deleteRecord } from '../services/airtable';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// GET /api/relationships
router.get('/', async (req: Request, res: Response) => {
  try {
    const { contactId, minStrength } = req.query;
    let filterParts: string[] = [];

    if (contactId) {
      filterParts.push(
        `OR(FIND('${String(contactId)}', ARRAYJOIN({Person A})), FIND('${String(contactId)}', ARRAYJOIN({Person B})))`
      );
    }
    if (minStrength) {
      filterParts.push(`{Connection Strength} >= ${Number(minStrength)}`);
    }

    const filterByFormula = filterParts.length > 0
      ? filterParts.length === 1 ? filterParts[0] : `AND(${filterParts.join(', ')})`
      : undefined;

    const { records } = await getRecords(Tables.Relationships, {
      filterByFormula,
      sort: [{ field: 'Connection Strength', direction: 'desc' }],
    });

    res.json({ records });
  } catch (err: any) {
    console.error('Get relationships error:', err);
    res.status(500).json({ error: 'Failed to fetch relationships' });
  }
});

// GET /api/relationships/network
router.get('/network', async (req: Request, res: Response) => {
  try {
    const { minStrength } = req.query;
    let filterByFormula: string | undefined;

    if (minStrength) {
      filterByFormula = `{Connection Strength} >= ${Number(minStrength)}`;
    }

    const { records: relationships } = await getRecords(Tables.Relationships, {
      filterByFormula,
    });

    const { records: contacts } = await getRecords(Tables.Contacts, {
      fields: ['Name', 'Email', 'Company', 'Title', 'Relationship Strength', 'Tags'],
    });

    // Build graph nodes and edges
    const contactMap = new Map(contacts.map((c: any) => [c.id, c]));

    const nodes = contacts.map((c: any) => ({
      id: c.id,
      name: c.Name || '',
      email: c.Email || '',
      title: c.Title || '',
      company: c.Company || [],
      strength: c['Relationship Strength'] || 0,
      tags: c.Tags || [],
    }));

    const edges = relationships
      .filter((r: any) => {
        const personA = Array.isArray(r['Person A']) ? r['Person A'][0] : r['Person A'];
        const personB = Array.isArray(r['Person B']) ? r['Person B'][0] : r['Person B'];
        return personA && personB && contactMap.has(personA) && contactMap.has(personB);
      })
      .map((r: any) => ({
        id: r.id,
        source: Array.isArray(r['Person A']) ? r['Person A'][0] : r['Person A'],
        target: Array.isArray(r['Person B']) ? r['Person B'][0] : r['Person B'],
        strength: r['Connection Strength'] || 0,
        sharedInteractions: r['Shared Interactions'] || 0,
      }));

    res.json({ nodes, edges });
  } catch (err: any) {
    console.error('Get network error:', err);
    res.status(500).json({ error: 'Failed to fetch network data' });
  }
});

// POST /api/relationships
router.post('/', async (req: Request, res: Response) => {
  try {
    const { 'Person A': PersonA, 'Person B': PersonB, 'Connection Strength': strength, 'Introduction Path': introPath } = req.body;

    if (!PersonA || !PersonB) {
      res.status(400).json({ error: 'Person A and Person B are required' });
      return;
    }

    const fields: Record<string, any> = {
      'Person A': Array.isArray(PersonA) ? PersonA : [PersonA],
      'Person B': Array.isArray(PersonB) ? PersonB : [PersonB],
      'Connection Strength': strength || 0,
      'Shared Interactions': 0,
      'Introduction Path': introPath || '',
    };

    const record = await createRecord(Tables.Relationships, fields);
    res.status(201).json(record);
  } catch (err: any) {
    console.error('Create relationship error:', err);
    res.status(500).json({ error: 'Failed to create relationship' });
  }
});

// PATCH /api/relationships/:id
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const updates: Record<string, any> = {};
    const allowedFields = ['Connection Strength', 'Shared Interactions', 'Introduction Path'];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    const record = await updateRecord(Tables.Relationships, req.params.id, updates);
    res.json(record);
  } catch (err: any) {
    console.error('Update relationship error:', err);
    res.status(500).json({ error: 'Failed to update relationship' });
  }
});

// DELETE /api/relationships/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await deleteRecord(Tables.Relationships, req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    console.error('Delete relationship error:', err);
    res.status(500).json({ error: 'Failed to delete relationship' });
  }
});

// GET /api/relationships/path/:fromId/:toId - Find introduction path between two contacts
router.get('/path/:fromId/:toId', async (req: Request, res: Response) => {
  try {
    const { fromId, toId } = req.params;

    // BFS to find shortest path
    const { records: allRelationships } = await getRecords(Tables.Relationships);

    // Build adjacency list
    const adjacency = new Map<string, Array<{ neighbor: string; relationshipId: string; strength: number }>>();

    for (const rel of allRelationships) {
      const personA = Array.isArray(rel['Person A']) ? rel['Person A'][0] : rel['Person A'];
      const personB = Array.isArray(rel['Person B']) ? rel['Person B'][0] : rel['Person B'];
      if (!personA || !personB) continue;

      if (!adjacency.has(personA)) adjacency.set(personA, []);
      if (!adjacency.has(personB)) adjacency.set(personB, []);
      adjacency.get(personA)!.push({ neighbor: personB, relationshipId: rel.id, strength: rel['Connection Strength'] || 0 });
      adjacency.get(personB)!.push({ neighbor: personA, relationshipId: rel.id, strength: rel['Connection Strength'] || 0 });
    }

    // BFS
    const visited = new Set<string>();
    const queue: Array<{ node: string; path: string[] }> = [{ node: fromId, path: [fromId] }];
    visited.add(fromId);

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current.node === toId) {
        // Fetch names for path
        const pathContacts = await Promise.all(
          current.path.map(async (id) => {
            try {
              const contact = await getRecord(Tables.Contacts, id);
              return { id, name: contact.Name || '' };
            } catch {
              return { id, name: 'Unknown' };
            }
          })
        );
        res.json({ found: true, path: pathContacts, length: current.path.length - 1 });
        return;
      }

      const neighbors = adjacency.get(current.node) || [];
      for (const { neighbor } of neighbors) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push({ node: neighbor, path: [...current.path, neighbor] });
        }
      }
    }

    res.json({ found: false, path: [], length: -1 });
  } catch (err: any) {
    console.error('Find path error:', err);
    res.status(500).json({ error: 'Failed to find path' });
  }
});

export default router;
