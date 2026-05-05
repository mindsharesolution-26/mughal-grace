'use client';

import { cn } from '@/lib/utils/cn';
import { ReactNode } from 'react';

export interface StatsCardProps {
  title: string;
  value: string | number;
  change?: string;
  subtitle?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon?: string | ReactNode;
  trend?: string;
  className?: string;
  onClick?: () => void;
}

export function StatsCard({
  title,
  value,
  change,
  subtitle,
  changeType = 'neutral',
  icon,
  trend,
  className,
  onClick,
}: StatsCardProps) {
  const changeColors = {
    positive: 'text-success',
    negative: 'text-error',
    neutral: 'text-neutral-400',
  };

  const displayChange = change || subtitle || trend;

  return (
    <div
      className={cn(
        'bg-factory-dark rounded-2xl border border-factory-border p-5',
        onClick && 'cursor-pointer hover:border-primary-500/50 transition-colors',
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm text-neutral-400">{title}</p>
          <p className="text-2xl font-semibold text-white">{value}</p>
          {displayChange && (
            <p className={cn('text-sm', changeColors[changeType])}>{displayChange}</p>
          )}
        </div>
        {icon && (
          typeof icon === 'string' ? (
            <span className="text-2xl opacity-80" role="img" aria-label={title}>
              {icon}
            </span>
          ) : (
            <div className="opacity-80">
              {icon}
            </div>
          )
        )}
      </div>
    </div>
  );
}
