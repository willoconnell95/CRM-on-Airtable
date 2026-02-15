import { Router, Request, Response } from 'express';
import { Tables, getRecords } from '../services/airtable';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// GET /api/search?q=query&type=contacts,companies,deals
router.get('/', async (req: Request, res: Response) => {
  try {
    const { q, type } = req.query;
    if (!q || String(q).trim().length === 0) {
      res.json({ results: [] });
      return;
    }

    const query = String(q).replace(/'/g, "\\'").toLowerCase();
    const types = type ? String(type).split(',') : ['contacts', 'companies', 'deals', 'interactions'];
    const results: Array<{ type: string; id: string; name: string; subtitle: string }> = [];

    const searches = [];

    if (types.includes('contacts')) {
      searches.push(
        getRecords(Tables.Contacts, {
          filterByFormula: `OR(FIND('${query}', LOWER({Name})), FIND('${query}', LOWER({Email})), FIND('${query}', LOWER({Title})))`,
          maxRecords: 10,
        }).then(({ records }) => {
          for (const r of records) {
            results.push({
              type: 'contact',
              id: r.id,
              name: r.Name || '',
              subtitle: [r.Title, r.Email].filter(Boolean).join(' · '),
            });
          }
        })
      );
    }

    if (types.includes('companies')) {
      searches.push(
        getRecords(Tables.Companies, {
          filterByFormula: `OR(FIND('${query}', LOWER({Name})), FIND('${query}', LOWER({Domain})), FIND('${query}', LOWER({Industry})))`,
          maxRecords: 10,
        }).then(({ records }) => {
          for (const r of records) {
            results.push({
              type: 'company',
              id: r.id,
              name: r.Name || '',
              subtitle: [r.Industry, r.Location].filter(Boolean).join(' · '),
            });
          }
        })
      );
    }

    if (types.includes('deals')) {
      searches.push(
        getRecords(Tables.Deals, {
          filterByFormula: `FIND('${query}', LOWER({Name}))`,
          maxRecords: 10,
        }).then(({ records }) => {
          for (const r of records) {
            results.push({
              type: 'deal',
              id: r.id,
              name: r.Name || '',
              subtitle: `${r.Stage || ''} · $${(r.Value || 0).toLocaleString()}`,
            });
          }
        })
      );
    }

    if (types.includes('interactions')) {
      searches.push(
        getRecords(Tables.Interactions, {
          filterByFormula: `OR(FIND('${query}', LOWER({Subject})), FIND('${query}', LOWER({Notes})))`,
          maxRecords: 10,
        }).then(({ records }) => {
          for (const r of records) {
            results.push({
              type: 'interaction',
              id: r.id,
              name: r.Subject || r.Type || '',
              subtitle: `${r.Type || ''} · ${r.Date || ''}`,
            });
          }
        })
      );
    }

    await Promise.all(searches);
    res.json({ results });
  } catch (err: any) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Search failed' });
  }
});

export default router;
