'use client';

import { cn } from '@/lib/utils/cn';

export type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral';

export interface StatusBadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  success: 'bg-success/20 text-success border-success/30',
  warning: 'bg-warning/20 text-warning border-warning/30',
  error: 'bg-error/20 text-error border-error/30',
  info: 'bg-primary-500/20 text-primary-400 border-primary-500/30',
  neutral: 'bg-neutral-500/20 text-neutral-400 border-neutral-500/30',
};

const sizeStyles = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
};

export function StatusBadge({
  label,
  variant = 'neutral',
  size = 'sm',
  className,
}: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-md border',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
    >
      {label}
    </span>
  );
}

// Cheque-specific status badge
export type ChequeStatus = 'PENDING' | 'DEPOSITED' | 'CLEARED' | 'BOUNCED' | 'CANCELLED' | 'REPLACED';

const chequeStatusConfig: Record<ChequeStatus, { label: string; variant: BadgeVariant }> = {
  PENDING: { label: 'Pending', variant: 'warning' },
  DEPOSITED: { label: 'Deposited', variant: 'info' },
  CLEARED: { label: 'Cleared', variant: 'success' },
  BOUNCED: { label: 'Bounced', variant: 'error' },
  CANCELLED: { label: 'Cancelled', variant: 'neutral' },
  REPLACED: { label: 'Replaced', variant: 'neutral' },
};

export interface ChequeStatusBadgeProps {
  status: ChequeStatus;
  size?: 'sm' | 'md';
  className?: string;
}

export function ChequeStatusBadge({ status, size = 'sm', className }: ChequeStatusBadgeProps) {
  const config = chequeStatusConfig[status] || { label: status, variant: 'neutral' as BadgeVariant };
  return <StatusBadge label={config.label} variant={config.variant} size={size} className={className} />;
}

// Quality status badge
export type QualityStatus = 'PENDING_INSPECTION' | 'APPROVED' | 'REJECTED' | 'PARTIAL';

const qualityStatusConfig: Record<QualityStatus, { label: string; variant: BadgeVariant }> = {
  PENDING_INSPECTION: { label: 'Pending', variant: 'warning' },
  APPROVED: { label: 'Approved', variant: 'success' },
  REJECTED: { label: 'Rejected', variant: 'error' },
  PARTIAL: { label: 'Partial', variant: 'warning' },
};

export interface QualityStatusBadgeProps {
  status: QualityStatus;
  size?: 'sm' | 'md';
  className?: string;
}

export function QualityStatusBadge({ status, size = 'sm', className }: QualityStatusBadgeProps) {
  const config = qualityStatusConfig[status] || { label: status, variant: 'neutral' as BadgeVariant };
  return <StatusBadge label={config.label} variant={config.variant} size={size} className={className} />;
}

// Replacement status badge
export type ReplacementStatus = 'REPORTED' | 'RETURN_PENDING' | 'RETURNED' | 'REPLACEMENT_PENDING' | 'REPLACED' | 'CREDITED' | 'CLOSED';

const replacementStatusConfig: Record<ReplacementStatus, { label: string; variant: BadgeVariant }> = {
  REPORTED: { label: 'Reported', variant: 'warning' },
  RETURN_PENDING: { label: 'Return Pending', variant: 'warning' },
  RETURNED: { label: 'Returned', variant: 'info' },
  REPLACEMENT_PENDING: { label: 'Replacement Pending', variant: 'warning' },
  REPLACED: { label: 'Replaced', variant: 'success' },
  CREDITED: { label: 'Credited', variant: 'success' },
  CLOSED: { label: 'Closed', variant: 'neutral' },
};

export interface ReplacementStatusBadgeProps {
  status: ReplacementStatus;
  size?: 'sm' | 'md';
  className?: string;
}

export function ReplacementStatusBadge({ status, size = 'sm', className }: ReplacementStatusBadgeProps) {
  const config = replacementStatusConfig[status] || { label: status, variant: 'neutral' as BadgeVariant };
  return <StatusBadge label={config.label} variant={config.variant} size={size} className={className} />;
}

// Payment method badge
export type PaymentMethod = 'CASH' | 'CHEQUE' | 'BANK_TRANSFER' | 'ONLINE';

const paymentMethodConfig: Record<PaymentMethod, { label: string; variant: BadgeVariant }> = {
  CASH: { label: 'Cash', variant: 'success' },
  CHEQUE: { label: 'Cheque', variant: 'info' },
  BANK_TRANSFER: { label: 'Bank Transfer', variant: 'info' },
  ONLINE: { label: 'Online', variant: 'info' },
};

export interface PaymentMethodBadgeProps {
  method: PaymentMethod;
  size?: 'sm' | 'md';
  className?: string;
}

export function PaymentMethodBadge({ method, size = 'sm', className }: PaymentMethodBadgeProps) {
  const config = paymentMethodConfig[method] || { label: method, variant: 'neutral' as BadgeVariant };
  return <StatusBadge label={config.label} variant={config.variant} size={size} className={className} />;
}
