// Customer Types
export type CustomerType = 'REGULAR' | 'WHOLESALE' | 'RETAIL' | 'EXPORT';

export const customerTypeLabels: Record<CustomerType, string> = {
  REGULAR: 'Regular',
  WHOLESALE: 'Wholesale',
  RETAIL: 'Retail',
  EXPORT: 'Export',
};

export const customerTypeColors: Record<CustomerType, { bg: string; text: string }> = {
  REGULAR: { bg: 'bg-neutral-500/20', text: 'text-neutral-400' },
  WHOLESALE: { bg: 'bg-primary-500/20', text: 'text-primary-400' },
  RETAIL: { bg: 'bg-success/20', text: 'text-success' },
  EXPORT: { bg: 'bg-info/20', text: 'text-info' },
};

// Ledger Entry Types
export type LedgerEntryType = 'OPENING_BALANCE' | 'SALE' | 'PAYMENT_RECEIVED' | 'RETURN' | 'ADJUSTMENT';

export const ledgerEntryTypeLabels: Record<LedgerEntryType, string> = {
  OPENING_BALANCE: 'Opening Balance',
  SALE: 'Sale',
  PAYMENT_RECEIVED: 'Payment Received',
  RETURN: 'Return',
  ADJUSTMENT: 'Adjustment',
};

export const ledgerEntryTypeColors: Record<LedgerEntryType, { bg: string; text: string }> = {
  OPENING_BALANCE: { bg: 'bg-neutral-500/20', text: 'text-neutral-400' },
  SALE: { bg: 'bg-primary-500/20', text: 'text-primary-400' },
  PAYMENT_RECEIVED: { bg: 'bg-success/20', text: 'text-success' },
  RETURN: { bg: 'bg-warning/20', text: 'text-warning' },
  ADJUSTMENT: { bg: 'bg-info/20', text: 'text-info' },
};

// Payment Methods
export type PaymentMethod = 'CASH' | 'CHEQUE' | 'BANK_TRANSFER' | 'ONLINE';

export const paymentMethodLabels: Record<PaymentMethod, string> = {
  CASH: 'Cash',
  CHEQUE: 'Cheque',
  BANK_TRANSFER: 'Bank Transfer',
  ONLINE: 'Online',
};

// Customer
export interface Customer {
  id: number;
  code: string;
  name: string;
  businessName: string | null;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  ntn: string | null;
  strn: string | null;
  creditLimit: string | null;
  paymentTerms: number;
  customerType: CustomerType;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    salesOrders: number;
    ledgerEntries: number;
    payments?: number;
  };
  currentBalance?: number;
}

export interface CustomerLookup {
  id: number;
  code: string;
  name: string;
  businessName: string | null;
}

export interface CustomerFormData {
  code?: string;
  name: string;
  businessName?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  ntn?: string;
  strn?: string;
  creditLimit?: number;
  paymentTerms?: number;
  customerType?: CustomerType;
  isActive?: boolean;
}

// Customer Ledger Entry
export interface CustomerLedgerEntry {
  id: number;
  customerId: number;
  entryDate: string;
  entryType: LedgerEntryType;
  referenceType: string | null;
  referenceId: number | null;
  referenceNumber: string | null;
  debit: string;
  credit: string;
  balance: string;
  description: string | null;
  journalEntryId: number | null;
  journalLineId: number | null;
  createdAt: string;
}

export interface CustomerLedgerResponse {
  customer: {
    id: number;
    code: string;
    name: string;
  };
  entries: CustomerLedgerEntry[];
  summary: {
    totalDebit: number;
    totalCredit: number;
    currentBalance: number;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CustomerLedgerEntryFormData {
  entryDate: string;
  entryType: LedgerEntryType;
  debit?: number;
  credit?: number;
  referenceType?: string;
  referenceId?: number;
  referenceNumber?: string;
  description?: string;
}

// Customer Payment
export interface CustomerPayment {
  id: number;
  customerId: number;
  paymentDate: string;
  amount: string;
  paymentMethod: PaymentMethod;
  receiptNumber: string | null;
  bankName: string | null;
  chequeNumber: string | null;
  transactionRef: string | null;
  notes: string | null;
  createdBy: number | null;
  createdAt: string;
  customer?: {
    id: number;
    code: string;
    name: string;
  };
}

export interface CustomerPaymentFormData {
  customerId: number;
  paymentDate: string;
  amount: number;
  paymentMethod: PaymentMethod;
  receiptNumber?: string;
  bankName?: string;
  chequeNumber?: string;
  transactionRef?: string;
  notes?: string;
}

// Stats
export interface CustomerStats {
  totalCustomers: number;
  activeCustomers: number;
  inactiveCustomers: number;
  customersWithBalance: number;
  totalOutstanding: number;
}

// API Response Types
export interface CustomerListResponse {
  customers: Customer[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface PaymentListResponse {
  payments: CustomerPayment[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

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
