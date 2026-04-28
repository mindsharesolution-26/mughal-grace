// Sales Ledger Types

export type PartyType = 'customer' | 'vendor';
export type PaymentDirection = 'receivable' | 'payable';

// Combined Ledger Entry (from both CustomerLedgerEntry and VendorLedgerEntry)
export interface SalesLedgerEntry {
  id: number;
  partyType: PartyType;
  partyId: number;
  partyName: string;
  partyCode: string;
  entryDate: string;
  entryType: string;
  debit: string;
  credit: string;
  balance: string;
  description: string | null;
  referenceNumber: string | null;
}

// Summary totals
export interface SalesLedgerSummary {
  totalReceivable: number; // What customers owe us
  totalPayable: number;    // What we owe vendors
  netBalance: number;      // totalReceivable - totalPayable
}

// Pagination
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Main ledger response
export interface SalesLedgerResponse {
  entries: SalesLedgerEntry[];
  summary: SalesLedgerSummary;
  pagination: Pagination;
}

// Pending payment (outstanding balance)
export interface PendingPayment {
  partyType: PartyType;
  partyId: number;
  partyName: string;
  partyCode: string;
  amount: number;
  direction: PaymentDirection;
}

// Upcoming cheque
export interface UpcomingCheque {
  id: number;
  chequeNumber: string;
  chequeType: 'ISSUED' | 'RECEIVED';
  partyName: string;
  partyCode: string;
  amount: number;
  chequeDate: string;
  daysUntilDue: number;
  status: string;
}

// Alerts response
export interface SalesLedgerAlerts {
  pendingPayments: PendingPayment[];
  upcomingCheques: UpcomingCheque[];
}

// Query params for ledger API
export interface SalesLedgerQueryParams {
  type?: 'all' | 'customer' | 'vendor';
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

// Entry type labels
export const entryTypeLabels: Record<string, string> = {
  OPENING_BALANCE: 'Opening Balance',
  SALE: 'Sale',
  PAYMENT_RECEIVED: 'Payment Received',
  RETURN: 'Return',
  ADJUSTMENT: 'Adjustment',
  PURCHASE: 'Purchase',
  PAYMENT_MADE: 'Payment Made',
  DEBIT_NOTE: 'Debit Note',
  CREDIT_NOTE: 'Credit Note',
};

// Entry type colors
export const entryTypeColors: Record<string, { bg: string; text: string }> = {
  OPENING_BALANCE: { bg: 'bg-neutral-500/20', text: 'text-neutral-400' },
  SALE: { bg: 'bg-primary-500/20', text: 'text-primary-400' },
  PAYMENT_RECEIVED: { bg: 'bg-success/20', text: 'text-success' },
  RETURN: { bg: 'bg-warning/20', text: 'text-warning' },
  ADJUSTMENT: { bg: 'bg-info/20', text: 'text-info' },
  PURCHASE: { bg: 'bg-primary-500/20', text: 'text-primary-400' },
  PAYMENT_MADE: { bg: 'bg-success/20', text: 'text-success' },
  DEBIT_NOTE: { bg: 'bg-error/20', text: 'text-error' },
  CREDIT_NOTE: { bg: 'bg-info/20', text: 'text-info' },
};

// Helper function to format PKR
export const formatPKR = (amount: number | string): string => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
};

// Helper to format date
export const formatDate = (date: string): string => {
  return new Date(date).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};
