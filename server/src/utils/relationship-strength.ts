/**
 * Relationship Strength Algorithm
 * Calculates a score from 0-100 based on:
 * - Interaction recency (decay over time)
 * - Interaction frequency
 * - Interaction types (weighted: meeting > call > email > note)
 * - Mutual connections count
 */

interface InteractionData {
  type: 'email' | 'meeting' | 'call' | 'note';
  date: string;
  sentiment: 'positive' | 'neutral' | 'negative';
}

const TYPE_WEIGHTS: Record<string, number> = {
  meeting: 10,
  call: 7,
  email: 4,
  note: 2,
};

const SENTIMENT_MULTIPLIER: Record<string, number> = {
  positive: 1.3,
  neutral: 1.0,
  negative: 0.7,
};

const RECENCY_HALF_LIFE_DAYS = 30;

function daysSince(dateStr: string): number {
  const date = new Date(dateStr);
  const now = new Date();
  return Math.max(0, (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
}

function recencyDecay(days: number): number {
  return Math.pow(0.5, days / RECENCY_HALF_LIFE_DAYS);
}

export function calculateRelationshipStrength(
  interactions: InteractionData[],
  mutualConnectionsCount: number = 0
): number {
  if (interactions.length === 0) return 0;

  // Interaction score with recency decay
  let interactionScore = 0;
  for (const interaction of interactions) {
    const days = daysSince(interaction.date);
    const typeWeight = TYPE_WEIGHTS[interaction.type] || 2;
    const sentimentMult = SENTIMENT_MULTIPLIER[interaction.sentiment] || 1.0;
    const decay = recencyDecay(days);
    interactionScore += typeWeight * sentimentMult * decay;
  }

  // Frequency bonus (more interactions = stronger relationship, with diminishing returns)
  const frequencyBonus = Math.log2(interactions.length + 1) * 5;

  // Most recent interaction recency bonus
  const sortedByDate = [...interactions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  const mostRecentDays = daysSince(sortedByDate[0].date);
  const recencyBonus = mostRecentDays < 7 ? 15 : mostRecentDays < 14 ? 10 : mostRecentDays < 30 ? 5 : 0;

  // Mutual connections bonus
  const connectionBonus = Math.min(mutualConnectionsCount * 3, 15);

  // Calculate raw score
  const rawScore = interactionScore + frequencyBonus + recencyBonus + connectionBonus;

  // Normalize to 0-100
  const normalized = Math.min(100, Math.round(rawScore));

  return normalized;
}

export function getStrengthLabel(score: number): string {
  if (score >= 80) return 'Very Strong';
  if (score >= 60) return 'Strong';
  if (score >= 40) return 'Moderate';
  if (score >= 20) return 'Weak';
  return 'Very Weak';
}

export function getStrengthColor(score: number): string {
  if (score >= 80) return '#10b981';
  if (score >= 60) return '#22c55e';
  if (score >= 40) return '#f59e0b';
  if (score >= 20) return '#f97316';
  return '#ef4444';
}
