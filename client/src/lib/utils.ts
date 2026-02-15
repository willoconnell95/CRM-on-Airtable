import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDate(date: string | undefined): string {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatRelativeDate(date: string | undefined): string {
  if (!date) return '';
  const now = new Date();
  const d = new Date(date);
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(date);
}

export function getStrengthColor(score: number): string {
  if (score >= 80) return 'text-emerald-600';
  if (score >= 60) return 'text-green-600';
  if (score >= 40) return 'text-amber-500';
  if (score >= 20) return 'text-orange-500';
  return 'text-red-500';
}

export function getStrengthBgColor(score: number): string {
  if (score >= 80) return 'bg-emerald-100';
  if (score >= 60) return 'bg-green-100';
  if (score >= 40) return 'bg-amber-100';
  if (score >= 20) return 'bg-orange-100';
  return 'bg-red-100';
}

export function getStrengthLabel(score: number): string {
  if (score >= 80) return 'Very Strong';
  if (score >= 60) return 'Strong';
  if (score >= 40) return 'Moderate';
  if (score >= 20) return 'Weak';
  return 'Very Weak';
}

export function getSentimentColor(sentiment: string): string {
  if (sentiment === 'positive') return 'text-emerald-600 bg-emerald-50';
  if (sentiment === 'negative') return 'text-red-600 bg-red-50';
  return 'text-gray-600 bg-gray-50';
}

export function getInteractionIcon(type: string): string {
  switch (type) {
    case 'email': return 'Mail';
    case 'meeting': return 'Users';
    case 'call': return 'Phone';
    case 'note': return 'FileText';
    default: return 'MessageSquare';
  }
}

export function truncate(str: string, length: number): string {
  if (!str) return '';
  return str.length > length ? str.slice(0, length) + '...' : str;
}
