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

export const DEAL_STAGES = [
  'Prospecting',
  'Qualification',
  'Proposal',
  'Negotiation',
  'Closed Won',
  'Closed Lost',
] as const;

export const DEAL_STAGE_COLORS: Record<string, string> = {
  Prospecting: '#6366f1',
  Qualification: '#8b5cf6',
  Proposal: '#a855f7',
  Negotiation: '#f59e0b',
  'Closed Won': '#10b981',
  'Closed Lost': '#ef4444',
};

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
