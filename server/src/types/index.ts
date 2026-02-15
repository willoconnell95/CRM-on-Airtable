export interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string[];
  companyName?: string;
  title: string;
  linkedin: string;
  tags: string[];
  relationshipStrength: number;
  lastInteractionDate: string;
  owner: string;
  createdAt: string;
  updatedAt: string;
  notes?: string;
  avatar?: string;
}

export interface Company {
  id: string;
  name: string;
  domain: string;
  industry: string;
  size: string;
  location: string;
  stage: string;
  tags: string[];
  relationshipStrength: number;
  createdAt: string;
  updatedAt: string;
  logo?: string;
  description?: string;
}

export interface Interaction {
  id: string;
  type: 'email' | 'meeting' | 'call' | 'note';
  date: string;
  participants: string[];
  participantNames?: string[];
  subject: string;
  notes: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  autoCaptured: boolean;
  contactId: string[];
  companyId: string[];
  createdBy: string;
  attachments?: string[];
}

export interface Deal {
  id: string;
  name: string;
  company: string[];
  companyName?: string;
  contacts: string[];
  contactNames?: string[];
  stage: string;
  value: number;
  probability: number;
  closeDate: string;
  owner: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  description?: string;
}

export interface List {
  id: string;
  name: string;
  type: 'contacts' | 'companies';
  filters: string;
  owner: string;
  sharedWith: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Relationship {
  id: string;
  personA: string[];
  personB: string[];
  personAName?: string;
  personBName?: string;
  connectionStrength: number;
  sharedInteractions: number;
  introductionPath: string;
  createdAt: string;
  updatedAt: string;
}

export interface Activity {
  id: string;
  user: string;
  actionType: string;
  entityType: string;
  entityId: string;
  entityName: string;
  timestamp: string;
  details: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'member' | 'viewer';
  avatar?: string;
  passwordHash: string;
}

export interface AuthPayload {
  userId: string;
  email: string;
  role: string;
}

export interface PaginatedResponse<T> {
  records: T[];
  offset?: string;
  total?: number;
}

export interface DealStage {
  name: string;
  order: number;
  color: string;
}

export const DEAL_STAGES: DealStage[] = [
  { name: 'Prospecting', order: 1, color: '#6366f1' },
  { name: 'Qualification', order: 2, color: '#8b5cf6' },
  { name: 'Proposal', order: 3, color: '#a855f7' },
  { name: 'Negotiation', order: 4, color: '#f59e0b' },
  { name: 'Closed Won', order: 5, color: '#10b981' },
  { name: 'Closed Lost', order: 6, color: '#ef4444' },
];
