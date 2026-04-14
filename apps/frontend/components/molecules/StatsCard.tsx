'use client';

import { cn } from '@/lib/utils/cn';

export interface StatsCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon?: string;
  className?: string;
}

export function StatsCard({
  title,
  value,
  change,
  changeType = 'neutral',
  icon,
  className,
}: StatsCardProps) {
  const changeColors = {
    positive: 'text-success',
    negative: 'text-error',
    neutral: 'text-neutral-400',
  };

  return (
    <div
      className={cn(
        'bg-factory-dark rounded-2xl border border-factory-border p-5',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm text-neutral-400">{title}</p>
          <p className="text-2xl font-semibold text-white">{value}</p>
          {change && (
            <p className={cn('text-sm', changeColors[changeType])}>{change}</p>
          )}
        </div>
        {icon && (
          <span className="text-2xl opacity-80" role="img" aria-label={title}>
            {icon}
          </span>
        )}
      </div>
    </div>
  );
}
