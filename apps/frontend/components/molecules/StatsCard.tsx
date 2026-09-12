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
        'group glass-panel rounded-2xl p-5 relative overflow-hidden transition-all',
        onClick && 'cursor-pointer hover:border-white/[0.14] hover:bg-white/[0.06]',
        className
      )}
      onClick={onClick}
    >
      {/* subtle inner glow accent in the corner — barely visible, adds depth */}
      <div
        aria-hidden
        className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-primary-500/[0.06] blur-2xl pointer-events-none group-hover:bg-primary-500/[0.1] transition-colors"
      />
      <div className="relative flex items-start justify-between gap-3">
        <div className="space-y-1.5 min-w-0 flex-1">
          <p className="text-[11px] font-medium text-neutral-400 tracking-wider uppercase">
            {title}
          </p>
          <p className="text-3xl font-semibold text-white leading-none tabular-nums tracking-tight">
            {value}
          </p>
          {displayChange && (
            <p
              className={cn(
                'text-xs font-medium pt-1',
                changeColors[changeType]
              )}
            >
              {displayChange}
            </p>
          )}
        </div>
        {icon && (
          <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
            {typeof icon === 'string' ? (
              <span className="text-lg opacity-90" role="img" aria-label={title}>
                {icon}
              </span>
            ) : (
              <div className="opacity-90 text-primary-300">{icon}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
