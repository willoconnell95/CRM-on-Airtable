import { Router, Request, Response } from 'express';
import { Tables, getRecords, getRecord, createRecord, updateRecord, deleteRecord } from '../services/airtable';
import { authenticate } from '../middleware/auth';
import { enrichByDomain, findDuplicateCompanies } from '../services/enrichment';
import { calculateRelationshipStrength } from '../utils/relationship-strength';

const router = Router();
router.use(authenticate);

// GET /api/companies
router.get('/', async (req: Request, res: Response) => {
  try {
    const { search, industry, stage, tags, sort, direction } = req.query;
    let filterParts: string[] = [];

    if (search) {
      filterParts.push(
        `OR(FIND(LOWER('${String(search).replace(/'/g, "\\'")}'), LOWER({Name})), FIND(LOWER('${String(search).replace(/'/g, "\\'")}'), LOWER({Domain})))`
      );
    }
    if (industry) {
      filterParts.push(`{Industry} = '${String(industry).replace(/'/g, "\\'")}'`);
    }
    if (stage) {
      filterParts.push(`{Stage} = '${String(stage).replace(/'/g, "\\'")}'`);
    }
    if (tags) {
      filterParts.push(`FIND('${String(tags).replace(/'/g, "\\'")}', ARRAYJOIN({Tags}, ','))`);
    }

    const filterByFormula = filterParts.length > 0
      ? filterParts.length === 1 ? filterParts[0] : `AND(${filterParts.join(', ')})`
      : undefined;

    const sortField = String(sort || 'Name');
    const sortDir = (direction === 'desc' ? 'desc' : 'asc') as 'asc' | 'desc';

    const { records } = await getRecords(Tables.Companies, {
      filterByFormula,
      sort: [{ field: sortField, direction: sortDir }],
    });

    res.json({ records });
  } catch (err: any) {
    console.error('Get companies error:', err);
    res.status(500).json({ error: 'Failed to fetch companies' });
  }
});

// GET /api/companies/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const record = await getRecord(Tables.Companies, req.params.id);

    // Fetch contacts at this company
    const { records: contacts } = await getRecords(Tables.Contacts, {
      filterByFormula: `FIND('${req.params.id}', ARRAYJOIN({Company}))`,
    });

    // Fetch deals for this company
    const { records: deals } = await getRecords(Tables.Deals, {
      filterByFormula: `FIND('${req.params.id}', ARRAYJOIN({Company}))`,
    });

    // Fetch interactions for this company
    const { records: interactions } = await getRecords(Tables.Interactions, {
      filterByFormula: `FIND('${req.params.id}', ARRAYJOIN({Company}))`,
      sort: [{ field: 'Date', direction: 'desc' }],
    });

    const interactionData = interactions.map((i: any) => ({
      type: i.Type || 'note',
      date: i.Date || new Date().toISOString(),
      sentiment: i.Sentiment || 'neutral',
    }));
    const strength = calculateRelationshipStrength(interactionData);

    res.json({
      ...record,
      contacts,
      deals,
      interactions,
      calculatedStrength: strength,
    });
  } catch (err: any) {
    console.error('Get company error:', err);
    res.status(500).json({ error: 'Failed to fetch company' });
  }
});

// POST /api/companies
router.post('/', async (req: Request, res: Response) => {
  try {
    const { Name, Domain, Industry, Size, Location, Stage, Tags, Description } = req.body;

    if (!Name) {
      res.status(400).json({ error: 'Name is required' });
      return;
    }

    if (Domain) {
      const duplicates = await findDuplicateCompanies(Domain);
      if (duplicates.length > 0) {
        res.status(409).json({ error: 'Duplicate company found', duplicates });
        return;
      }
    }

    const fields: Record<string, any> = {
      Name,
      Domain: Domain || '',
      Industry: Industry || '',
      Size: Size || '',
      Location: Location || '',
      Stage: Stage || 'Prospect',
      Tags: Tags || [],
      'Relationship Strength': 0,
      Description: Description || '',
    };

    const record = await createRecord(Tables.Companies, fields);

    await createRecord(Tables.Activities, {
      User: req.user!.email,
      'Action Type': 'created',
      'Entity Type': 'company',
      'Entity ID': record.id,
      'Entity Name': Name,
      Timestamp: new Date().toISOString(),
      Details: `Created company ${Name}`,
    });

    // Try domain enrichment in background
    if (Domain) {
      enrichByDomain(Domain).then(async (enrichment) => {
        if (enrichment.company) {
          const updates: Record<string, any> = {};
          if (enrichment.company.industry && !Industry) updates.Industry = enrichment.company.industry;
          if (enrichment.company.size && !Size) updates.Size = enrichment.company.size;
          if (enrichment.company.location && !Location) updates.Location = enrichment.company.location;
          if (enrichment.company.description && !Description) updates.Description = enrichment.company.description;
          if (enrichment.company.logo) updates.Logo = enrichment.company.logo;
          if (Object.keys(updates).length > 0) {
            await updateRecord(Tables.Companies, record.id, updates);
          }
        }
      }).catch(() => {});
    }

    res.status(201).json(record);
  } catch (err: any) {
    console.error('Create company error:', err);
    res.status(500).json({ error: 'Failed to create company' });
  }
});

// PATCH /api/companies/:id
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const updates: Record<string, any> = {};
    const allowedFields = ['Name', 'Domain', 'Industry', 'Size', 'Location', 'Stage', 'Tags', 'Description', 'Relationship Strength', 'Logo'];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    const record = await updateRecord(Tables.Companies, req.params.id, updates);

    await createRecord(Tables.Activities, {
      User: req.user!.email,
      'Action Type': 'updated',
      'Entity Type': 'company',
      'Entity ID': req.params.id,
      'Entity Name': record.Name || '',
      Timestamp: new Date().toISOString(),
      Details: `Updated company fields: ${Object.keys(updates).join(', ')}`,
    });

    res.json(record);
  } catch (err: any) {
    console.error('Update company error:', err);
    res.status(500).json({ error: 'Failed to update company' });
  }
});

// DELETE /api/companies/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await deleteRecord(Tables.Companies, req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    console.error('Delete company error:', err);
    res.status(500).json({ error: 'Failed to delete company' });
  }
});

// POST /api/companies/:id/enrich
router.post('/:id/enrich', async (req: Request, res: Response) => {
  try {
    const company = await getRecord(Tables.Companies, req.params.id);
    const domain = company.Domain;

    if (!domain) {
      res.status(400).json({ error: 'Company has no domain for enrichment' });
      return;
    }

    const enrichment = await enrichByDomain(domain);
    const updates: Record<string, any> = {};

    if (enrichment.company) {
      if (enrichment.company.industry) updates.Industry = enrichment.company.industry;
      if (enrichment.company.size) updates.Size = enrichment.company.size;
      if (enrichment.company.location) updates.Location = enrichment.company.location;
      if (enrichment.company.description) updates.Description = enrichment.company.description;
      if (enrichment.company.logo) updates.Logo = enrichment.company.logo;
    }

    if (Object.keys(updates).length > 0) {
      const updated = await updateRecord(Tables.Companies, req.params.id, updates);
      res.json({ enriched: true, updates, record: updated });
    } else {
      res.json({ enriched: false, message: 'No enrichment data found' });
    }
  } catch (err: any) {
    console.error('Enrich company error:', err);
    res.status(500).json({ error: 'Failed to enrich company' });
  }
});

export default router;
