import { Router, Request, Response } from 'express';
import { Tables, getRecords } from '../services/airtable';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// GET /api/dashboard
router.get('/', async (req: Request, res: Response) => {
  try {
    // Fetch all data in parallel
    const [contactsResult, companiesResult, dealsResult, activitiesResult, interactionsResult] = await Promise.all([
      getRecords(Tables.Contacts, { sort: [{ field: 'Name', direction: 'asc' }] }),
      getRecords(Tables.Companies),
      getRecords(Tables.Deals),
      getRecords(Tables.Activities, {
        sort: [{ field: 'Timestamp', direction: 'desc' }],
        maxRecords: 20,
      }),
      getRecords(Tables.Interactions, {
        sort: [{ field: 'Date', direction: 'desc' }],
        maxRecords: 30,
      }),
    ]);

    const contacts = contactsResult.records;
    const companies = companiesResult.records;
    const deals = dealsResult.records;
    const activities = activitiesResult.records;
    const interactions = interactionsResult.records;

    // Calculate metrics
    const activeDeals = deals.filter((d: any) => !['Closed Won', 'Closed Lost'].includes(d.Stage));
    const totalPipelineValue = activeDeals.reduce((sum: number, d: any) => sum + (d.Value || 0), 0);
    const wonDeals = deals.filter((d: any) => d.Stage === 'Closed Won');
    const wonValue = wonDeals.reduce((sum: number, d: any) => sum + (d.Value || 0), 0);

    // Interaction volume by type (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentInteractions = interactions.filter((i: any) => new Date(i.Date) >= thirtyDaysAgo);

    const interactionsByType: Record<string, number> = {};
    for (const i of recentInteractions) {
      const type = i.Type || 'other';
      interactionsByType[type] = (interactionsByType[type] || 0) + 1;
    }

    // Contacts needing follow-up (no interaction in 14+ days)
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    const needsFollowUp = contacts.filter((c: any) => {
      if (!c['Last Interaction Date']) return true;
      return new Date(c['Last Interaction Date']) < fourteenDaysAgo;
    }).slice(0, 10);

    // Relationship strength distribution
    const strengthDistribution = {
      veryStrong: contacts.filter((c: any) => (c['Relationship Strength'] || 0) >= 80).length,
      strong: contacts.filter((c: any) => (c['Relationship Strength'] || 0) >= 60 && (c['Relationship Strength'] || 0) < 80).length,
      moderate: contacts.filter((c: any) => (c['Relationship Strength'] || 0) >= 40 && (c['Relationship Strength'] || 0) < 60).length,
      weak: contacts.filter((c: any) => (c['Relationship Strength'] || 0) >= 20 && (c['Relationship Strength'] || 0) < 40).length,
      veryWeak: contacts.filter((c: any) => (c['Relationship Strength'] || 0) < 20).length,
    };

    // Deal stages breakdown
    const stageBreakdown: Record<string, { count: number; value: number }> = {};
    for (const deal of deals) {
      const stage = deal.Stage || 'Unknown';
      if (!stageBreakdown[stage]) stageBreakdown[stage] = { count: 0, value: 0 };
      stageBreakdown[stage].count++;
      stageBreakdown[stage].value += deal.Value || 0;
    }

    res.json({
      metrics: {
        totalContacts: contacts.length,
        totalCompanies: companies.length,
        activeDeals: activeDeals.length,
        totalPipelineValue,
        wonDeals: wonDeals.length,
        wonValue,
        interactionVolume: recentInteractions.length,
        interactionsByType,
      },
      recentActivities: activities,
      recentInteractions: interactions.slice(0, 10),
      needsFollowUp,
      strengthDistribution,
      stageBreakdown,
    });
  } catch (err: any) {
    console.error('Dashboard error:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

export default router;
