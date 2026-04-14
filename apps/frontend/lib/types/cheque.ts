/**
 * Cheque Management Types
 *
 * Comprehensive types for cheque lifecycle management:
 * - Issued cheques (payments to vendors)
 * - Received cheques (payments from customers)
 * - Status tracking (pending, deposited, cleared, bounced)
 * - Replacement workflow for bounced cheques
 */

import { VendorTypeEnum, PaymentMethod } from './supplier';

// ============================================
// CHEQUE ENUMS
// ============================================

export type ChequeType = 'ISSUED' | 'RECEIVED';

export const CHEQUE_TYPES: Record<ChequeType, {
  code: ChequeType;
  label: string;
  description: string;
}> = {
  ISSUED: {
    code: 'ISSUED',
    label: 'Issued',
    description: 'Cheques issued by us to vendors',
  },
  RECEIVED: {
    code: 'RECEIVED',
    label: 'Received',
    description: 'Cheques received from customers',
  },
};

export type ChequeStatus =
  | 'PENDING'      // Cheque created but not yet deposited
  | 'DEPOSITED'    // Cheque deposited in bank
  | 'CLEARED'      // Cheque cleared successfully
  | 'BOUNCED'      // Cheque bounced
  | 'CANCELLED'    // Cheque cancelled
  | 'REPLACED';    // Cheque replaced with another

export const CHEQUE_STATUSES: Record<ChequeStatus, {
  code: ChequeStatus;
  label: string;
  color: string;
  description: string;
  isTerminal: boolean;
}> = {
  PENDING: {
    code: 'PENDING',
    label: 'Pending',
    color: 'warning',
    description: 'Cheque not yet deposited',
    isTerminal: false,
  },
  DEPOSITED: {
    code: 'DEPOSITED',
    label: 'Deposited',
    color: 'info',
    description: 'Cheque deposited, awaiting clearance',
    isTerminal: false,
  },
  CLEARED: {
    code: 'CLEARED',
    label: 'Cleared',
    color: 'success',
    description: 'Cheque cleared successfully',
    isTerminal: true,
  },
  BOUNCED: {
    code: 'BOUNCED',
    label: 'Bounced',
    color: 'error',
    description: 'Cheque bounced',
    isTerminal: false,
  },
  CANCELLED: {
    code: 'CANCELLED',
    label: 'Cancelled',
    color: 'neutral',
    description: 'Cheque cancelled',
    isTerminal: true,
  },
  REPLACED: {
    code: 'REPLACED',
    label: 'Replaced',
    color: 'neutral',
    description: 'Cheque replaced with another',
    isTerminal: true,
  },
};

// ============================================
// CHEQUE ENTITY
// ============================================

export interface Cheque {
  id: string;
  chequeNumber: string;
  chequeType: ChequeType;

  // Party (one of these will be set)
  customerId?: string;
  customerName?: string;
  yarnVendorId?: string;
  dyeingVendorId?: string;
  generalSupplierId?: string;
  vendorType?: VendorTypeEnum;
  vendorName?: string;

  // Bank details
  bankName: string;
  branchName?: string;
  accountNumber?: string;

  // Amount
  amount: number;

  // Dates
  chequeDate: string;              // Date on cheque
  receivedDate?: string;           // When we received the cheque
  depositDate?: string;            // When deposited to bank
  clearanceDate?: string;          // When cleared
  bouncedDate?: string;            // When bounced

  // Status
  status: ChequeStatus;

  // Bounce details
  bounceReason?: string;
  bounceCharges?: number;
  bounceCount: number;

  // Replacement
  replacedByChequeId?: string;
  replacedByChequNumber?: string;

  // Payment links
  customerPaymentId?: string;
  vendorPaymentId?: string;

  // Audit
  createdBy?: string;
  createdAt: string;
  updatedAt: string;

  // Status history (populated on detail view)
  statusHistory?: ChequeStatusHistory[];
}

export interface ChequeFormData {
  chequeNumber: string;
  chequeType: ChequeType;
  customerId?: string;
  yarnVendorId?: string;
  dyeingVendorId?: string;
  generalSupplierId?: string;
  vendorType?: VendorTypeEnum;
  bankName: string;
  branchName?: string;
  accountNumber?: string;
  amount: number;
  chequeDate: string;
  receivedDate?: string;
  notes?: string;
}

// ============================================
// CHEQUE STATUS HISTORY
// ============================================

export interface ChequeStatusHistory {
  id: string;
  chequeId: string;
  fromStatus?: ChequeStatus;
  toStatus: ChequeStatus;
  changedBy?: string;
  changedByName?: string;
  reason?: string;
  changedAt: string;
}

// ============================================
// CHEQUE ACTIONS
// ============================================

export interface DepositChequeData {
  depositDate: string;
  bankAccount?: string;
  notes?: string;
}

export interface ClearChequeData {
  clearanceDate: string;
  notes?: string;
}

export interface BounceChequeData {
  bouncedDate: string;
  bounceReason: string;
  bounceCharges?: number;
  notes?: string;
}

export interface ReplaceChequeData {
  newChequeNumber: string;
  bankName: string;
  branchName?: string;
  accountNumber?: string;
  amount: number;
  chequeDate: string;
  receivedDate?: string;
  notes?: string;
}

export interface CancelChequeData {
  reason: string;
  notes?: string;
}

// ============================================
// CHEQUE FILTERS & LISTS
// ============================================

export interface ChequeListFilters {
  search?: string;
  chequeType?: ChequeType | 'all';
  status?: ChequeStatus | 'all';
  bankName?: string;
  dateFrom?: string;
  dateTo?: string;
  amountMin?: number;
  amountMax?: number;
  customerId?: string;
  vendorId?: string;
  vendorType?: VendorTypeEnum;
}

export interface ChequeSummary {
  // Issued cheques (to vendors)
  issuedTotal: number;
  issuedCount: number;
  issuedPending: number;
  issuedPendingAmount: number;
  issuedCleared: number;
  issuedClearedAmount: number;
  issuedBounced: number;
  issuedBouncedAmount: number;

  // Received cheques (from customers)
  receivedTotal: number;
  receivedCount: number;
  receivedPending: number;
  receivedPendingAmount: number;
  receivedDeposited: number;
  receivedDepositedAmount: number;
  receivedCleared: number;
  receivedClearedAmount: number;
  receivedBounced: number;
  receivedBouncedAmount: number;
}

export interface PendingClearanceEntry {
  id: string;
  chequeNumber: string;
  chequeType: ChequeType;
  partyName: string;
  bankName: string;
  amount: number;
  chequeDate: string;
  depositDate: string;
  daysInClearing: number;
  status: ChequeStatus;
}

export interface PostDatedEntry {
  id: string;
  chequeNumber: string;
  chequeType: ChequeType;
  partyName: string;
  bankName: string;
  amount: number;
  chequeDate: string;
  daysUntilMaturity: number;
  status: ChequeStatus;
}

export interface MaturingCheque {
  id: string;
  chequeNumber: string;
  chequeType: ChequeType;
  partyName: string;
  bankName: string;
  amount: number;
  chequeDate: string;
  status: ChequeStatus;
}

export interface ChequeMaturityReport {
  today: MaturingCheque[];
  thisWeek: MaturingCheque[];
  thisMonth: MaturingCheque[];
  overdue: MaturingCheque[];
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Get status color for badge display
 */
export function getChequeStatusColor(status: ChequeStatus): string {
  return CHEQUE_STATUSES[status]?.color || 'neutral';
}

/**
 * Check if cheque can be deposited
 */
export function canDeposit(cheque: Cheque): boolean {
  return cheque.status === 'PENDING' && cheque.chequeType === 'RECEIVED';
}

/**
 * Check if cheque can be cleared
 */
export function canClear(cheque: Cheque): boolean {
  return cheque.status === 'DEPOSITED';
}

/**
 * Check if cheque can be bounced
 */
export function canBounce(cheque: Cheque): boolean {
  return cheque.status === 'DEPOSITED' || cheque.status === 'PENDING';
}

/**
 * Check if cheque can be replaced
 */
export function canReplace(cheque: Cheque): boolean {
  return cheque.status === 'BOUNCED';
}

/**
 * Check if cheque can be cancelled
 */
export function canCancel(cheque: Cheque): boolean {
  return cheque.status === 'PENDING';
}

/**
 * Get available actions for a cheque
 */
export function getAvailableActions(cheque: Cheque): string[] {
  const actions: string[] = [];

  if (canDeposit(cheque)) actions.push('deposit');
  if (canClear(cheque)) actions.push('clear');
  if (canBounce(cheque)) actions.push('bounce');
  if (canReplace(cheque)) actions.push('replace');
  if (canCancel(cheque)) actions.push('cancel');

  return actions;
}

/**
 * Format cheque amount for display
 */
export function formatChequeAmount(amount: number): string {
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Calculate days until cheque maturity
 */
export function getDaysUntilMaturity(chequeDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const maturityDate = new Date(chequeDate);
  maturityDate.setHours(0, 0, 0, 0);

  const diffTime = maturityDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Check if cheque is post-dated
 */
export function isPostDated(chequeDate: string): boolean {
  return getDaysUntilMaturity(chequeDate) > 0;
}

/**
 * Check if cheque is overdue
 */
export function isOverdue(chequeDate: string): boolean {
  return getDaysUntilMaturity(chequeDate) < 0;
}

/**
 * Format date for display
 */
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-PK', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Get party name from cheque (customer or vendor)
 */
export function getChequePartyName(cheque: Cheque): string {
  if (cheque.chequeType === 'RECEIVED') {
    return cheque.customerName || 'Unknown Customer';
  } else {
    return cheque.vendorName || 'Unknown Vendor';
  }
}
