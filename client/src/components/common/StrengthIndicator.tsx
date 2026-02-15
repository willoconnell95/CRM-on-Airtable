import { cn, getStrengthColor, getStrengthBgColor, getStrengthLabel } from '@/lib/utils';

interface StrengthIndicatorProps {
  score: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function StrengthIndicator({ score, showLabel = true, size = 'md' }: StrengthIndicatorProps) {
  const barWidth = `${Math.min(100, Math.max(0, score))}%`;
  const heights = { sm: 'h-1.5', md: 'h-2', lg: 'h-3' };

  return (
    <div className="flex items-center gap-2">
      <div className={cn('flex-1 rounded-full bg-gray-100', heights[size])}>
        <div
          className={cn('rounded-full transition-all', heights[size], getStrengthBgColor(score))}
          style={{ width: barWidth }}
        />
      </div>
      {showLabel && (
        <span className={cn('text-xs font-medium whitespace-nowrap', getStrengthColor(score))}>
          {score} - {getStrengthLabel(score)}
        </span>
      )}
    </div>
  );
}
