import type { ParsedEmail } from '../services/email';

export interface ExtractedContact {
  name: string;
  email: string;
}

export interface DealSignal {
  score: number;       // 0-100 likelihood this email involves a deal
  keywords: string[];  // which keywords triggered
  suggestedName: string;
  suggestedStage: string;
}

const DEAL_KEYWORDS: Record<string, number> = {
  'proposal': 15,
  'quote': 15,
  'pricing': 12,
  'contract': 15,
  'agreement': 12,
  'invoice': 10,
  'budget': 10,
  'cost': 8,
  'deal': 12,
  'partnership': 10,
  'collaboration': 8,
  'opportunity': 10,
  'purchase': 12,
  'order': 8,
  'subscription': 10,
  'license': 10,
  'renewal': 12,
  'negotiate': 12,
  'terms': 8,
  'scope of work': 15,
  'sow': 12,
  'rfp': 15,
  'rfi': 10,
  'pilot': 10,
  'trial': 8,
  'demo': 8,
  'onboarding': 8,
  'kick-off': 8,
  'kickoff': 8,
  'close': 8,
  'sign': 10,
  'payment': 10,
};

const STAGE_KEYWORDS: Record<string, string[]> = {
  'Prospecting': ['intro', 'introduction', 'interest', 'learn more', 'demo', 'trial'],
  'Qualification': ['requirements', 'needs', 'budget', 'timeline', 'decision maker'],
  'Proposal': ['proposal', 'quote', 'pricing', 'scope of work', 'sow', 'rfp'],
  'Negotiation': ['negotiate', 'terms', 'contract', 'agreement', 'counter', 'revision'],
  'Closed Won': ['signed', 'accepted', 'approved', 'confirmed', 'welcome aboard'],
};

export function extractContacts(email: ParsedEmail): ExtractedContact[] {
  const contacts: Map<string, ExtractedContact> = new Map();

  // From
  if (email.from.address) {
    contacts.set(email.from.address.toLowerCase(), {
      name: email.from.name || email.from.address.split('@')[0],
      email: email.from.address.toLowerCase(),
    });
  }

  // To
  for (const addr of email.to) {
    if (addr.address) {
      contacts.set(addr.address.toLowerCase(), {
        name: addr.name || addr.address.split('@')[0],
        email: addr.address.toLowerCase(),
      });
    }
  }

  // CC
  for (const addr of email.cc) {
    if (addr.address) {
      contacts.set(addr.address.toLowerCase(), {
        name: addr.name || addr.address.split('@')[0],
        email: addr.address.toLowerCase(),
      });
    }
  }

  return Array.from(contacts.values());
}

export function detectDealSignals(email: ParsedEmail): DealSignal {
  const text = `${email.subject} ${email.textBody}`.toLowerCase();
  let score = 0;
  const keywords: string[] = [];

  for (const [keyword, weight] of Object.entries(DEAL_KEYWORDS)) {
    if (text.includes(keyword)) {
      score += weight;
      keywords.push(keyword);
    }
  }

  // Detect dollar amounts as a strong signal
  const moneyPattern = /\$[\d,]+(\.\d{2})?|\d+k|\d+\s*(usd|eur|gbp)/gi;
  if (moneyPattern.test(text)) {
    score += 20;
    keywords.push('monetary value');
  }

  // Cap at 100
  score = Math.min(score, 100);

  // Determine suggested stage
  let suggestedStage = 'Prospecting';
  let maxStageMatch = 0;
  for (const [stage, stageKeywords] of Object.entries(STAGE_KEYWORDS)) {
    const matches = stageKeywords.filter(kw => text.includes(kw)).length;
    if (matches > maxStageMatch) {
      maxStageMatch = matches;
      suggestedStage = stage;
    }
  }

  // Generate suggested deal name from subject
  const suggestedName = email.subject
    .replace(/^(re|fw|fwd):\s*/gi, '')
    .trim() || 'New Deal';

  return {
    score,
    keywords,
    suggestedName,
    suggestedStage,
  };
}

export function detectSentiment(email: ParsedEmail): 'positive' | 'neutral' | 'negative' {
  const text = `${email.subject} ${email.textBody}`.toLowerCase();

  const positiveWords = ['thank', 'great', 'excellent', 'perfect', 'happy', 'pleased',
    'wonderful', 'fantastic', 'love', 'appreciate', 'excited', 'looking forward',
    'agree', 'yes', 'absolutely', 'delighted', 'congrats', 'congratulations'];

  const negativeWords = ['unfortunately', 'sorry', 'cancel', 'postpone', 'delay',
    'issue', 'problem', 'disappoint', 'concern', 'unable', 'cannot', 'decline',
    'reject', 'refund', 'complaint', 'frustrated', 'unhappy'];

  let positiveScore = 0;
  let negativeScore = 0;

  for (const word of positiveWords) {
    if (text.includes(word)) positiveScore++;
  }
  for (const word of negativeWords) {
    if (text.includes(word)) negativeScore++;
  }

  if (positiveScore > negativeScore + 1) return 'positive';
  if (negativeScore > positiveScore + 1) return 'negative';
  return 'neutral';
}

export function extractDomainFromEmail(email: string): string {
  const parts = email.split('@');
  return parts.length > 1 ? parts[1] : '';
}
