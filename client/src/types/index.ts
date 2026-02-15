export interface Contact {
  id: string;
  Name: string;
  Email: string;
  Phone: string;
  Company: string[];
  CompanyName?: string;
  Title: string;
  LinkedIn: string;
  Tags: string[];
  'Relationship Strength': number;
  'Last Interaction Date': string;
  Owner: string;
  Notes?: string;
  Avatar?: string;
  interactions?: Interaction[];
  deals?: Deal[];
  calculatedStrength?: number;
}

export interface Company {
  id: string;
  Name: string;
  Domain: string;
  Industry: string;
  Size: string;
  Location: string;
  Stage: string;
  Tags: string[];
  'Relationship Strength': number;
  Description?: string;
  Logo?: string;
  contacts?: Contact[];
  deals?: Deal[];
  interactions?: Interaction[];
  calculatedStrength?: number;
}

export interface Interaction {
  id: string;
  Type: 'email' | 'meeting' | 'call' | 'note';
  Date: string;
  Contact: string[];
  Company: string[];
  Participants: string;
  Subject: string;
  Notes: string;
  Sentiment: 'positive' | 'neutral' | 'negative';
  'Auto-Captured': boolean;
  'Created By': string;
}

export interface Deal {
  id: string;
  Name: string;
  Company: string[];
  Contacts: string[];
  Stage: string;
  Value: number;
  Probability: number;
  'Close Date': string;
  Owner: string;
  Tags: string[];
  Description?: string;
}

export interface List {
  id: string;
  Name: string;
  Type: 'contacts' | 'companies';
  Filters: string;
  Owner: string;
  'Shared With': string[];
  matchedRecords?: any[];
}

export interface Relationship {
  id: string;
  'Person A': string[];
  'Person B': string[];
  'Connection Strength': number;
  'Shared Interactions': number;
  'Introduction Path': string;
}

export interface Activity {
  id: string;
  User: string;
  'Action Type': string;
  'Entity Type': string;
  'Entity ID': string;
  'Entity Name': string;
  Timestamp: string;
  Details: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'member' | 'viewer';
  avatar?: string;
}

export interface SearchResult {
  type: string;
  id: string;
  name: string;
  subtitle: string;
}

export interface DashboardData {
  metrics: {
    totalContacts: number;
    totalCompanies: number;
    activeDeals: number;
    totalPipelineValue: number;
    wonDeals: number;
    wonValue: number;
    interactionVolume: number;
    interactionsByType: Record<string, number>;
  };
  recentActivities: Activity[];
  recentInteractions: Interaction[];
  needsFollowUp: Contact[];
  strengthDistribution: {
    veryStrong: number;
    strong: number;
    moderate: number;
    weak: number;
    veryWeak: number;
  };
  stageBreakdown: Record<string, { count: number; value: number }>;
}

export interface PipelineData {
  pipeline: Record<string, Deal[]>;
  summary: {
    totalValue: number;
    weightedValue: number;
    dealCount: number;
    stageBreakdown: Array<{
      stage: string;
      count: number;
      value: number;
      weightedValue: number;
    }>;
  };
}

export interface NetworkData {
  nodes: Array<{
    id: string;
    name: string;
    email: string;
    title: string;
    company: string[];
    strength: number;
    tags: string[];
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    strength: number;
    sharedInteractions: number;
  }>;
}

export interface PipelineStage {
  id?: string;
  Name: string;
  Order: number;
  Color: string;
  Weight: number;
}

// Fallback defaults — used only while the API response is loading
export const DEFAULT_STAGES: PipelineStage[] = [
  { Name: 'Prospecting', Order: 1, Color: '#6366f1', Weight: 0.1 },
  { Name: 'Qualification', Order: 2, Color: '#8b5cf6', Weight: 0.25 },
  { Name: 'Proposal', Order: 3, Color: '#a855f7', Weight: 0.5 },
  { Name: 'Negotiation', Order: 4, Color: '#f59e0b', Weight: 0.75 },
  { Name: 'Closed Won', Order: 5, Color: '#10b981', Weight: 1.0 },
  { Name: 'Closed Lost', Order: 6, Color: '#ef4444', Weight: 0 },
];

// Kept for backward compat — derive from DEFAULT_STAGES
export const DEAL_STAGES = DEFAULT_STAGES.map(s => s.Name);

export const DEAL_STAGE_COLORS: Record<string, string> = Object.fromEntries(
  DEFAULT_STAGES.map(s => [s.Name, s.Color])
);

export const INTERACTION_TYPES = ['email', 'meeting', 'call', 'note'] as const;

export const SENTIMENT_OPTIONS = ['positive', 'neutral', 'negative'] as const;

export interface EmailContact {
  name: string;
  address: string;
}

export interface DealSignal {
  score: number;
  keywords: string[];
  suggestedName: string;
  suggestedStage: string;
}

export interface SyncedEmail {
  messageId: string;
  from: EmailContact;
  to: EmailContact[];
  cc: EmailContact[];
  subject: string;
  date: string;
  textBody: string;
  htmlBody: string;
  snippet: string;
  extractedContacts: Array<{ name: string; email: string }>;
  dealSignal: DealSignal;
  sentiment: 'positive' | 'neutral' | 'negative';
}

export interface EmailStatus {
  connected: boolean;
  email: string | null;
}
