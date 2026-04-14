/**
 * Receivables & Customer Types
 *
 * Comprehensive types for customer management:
 * - Customer ledger (financial transactions)
 * - Material transactions (sales, returns)
 * - Aging reports and statements
 * - Payment tracking
 */

import { PaymentMethod } from './supplier';

// ============================================
// CUSTOMER ENTITY (Extended)
// ============================================

export interface Customer {
  id: string;
  code: string;                    // Unique: CUST-001
  name: string;
  contactPerson?: string;
  phone: string;
  email?: string;
  address?: string;
  city?: string;

  // Tax information
  ntn?: string;                    // National Tax Number
  strn?: string;                   // Sales Tax Registration Number

  // Financial
  creditLimit: number;             // Maximum credit allowed (PKR)
  paymentTerms: number;            // Payment terms in days
  currentBalance: number;          // Current amount owed by customer

  // Status
  rating: number;                  // 1-5 stars
  isActive: boolean;
  notes?: string;

  // Timestamps
  createdAt: string;
  updatedAt: string;
}

export interface CustomerFormData {
  code: string;
  name: string;
  contactPerson?: string;
  phone: string;
  email?: string;
  address?: string;
  city?: string;
  ntn?: string;
  strn?: string;
  creditLimit: number;
  paymentTerms: number;
  openingBalance?: number;
  rating: number;
  isActive: boolean;
  notes?: string;
}

// ============================================
// CUSTOMER LEDGER ENTRY TYPES
// ============================================

export type CustomerLedgerType =
  | 'OPENING_BALANCE'      // Initial balance when customer added
  | 'SALE'                 // Sale made (debit - they owe us more)
  | 'PAYMENT_RECEIVED'     // Payment received (credit - they owe us less)
  | 'RETURN'               // Goods returned by customer (credit)
  | 'ADJUSTMENT'           // Manual adjustment
  | 'DEBIT_NOTE'           // Debit note issued
  | 'CREDIT_NOTE'          // Credit note issued
  | 'CHEQUE_RECEIVED'      // Cheque received from customer
  | 'CHEQUE_CLEARED'       // Cheque cleared
  | 'CHEQUE_BOUNCED';      // Cheque bounced

export const CUSTOMER_LEDGER_TYPES: Record<CustomerLedgerType, {
  code: CustomerLedgerType;
  label: string;
  description: string;
  isDebit: boolean | 'both';
}> = {
  OPENING_BALANCE: {
    code: 'OPENING_BALANCE',
    label: 'Opening Balance',
    description: 'Initial balance when customer was added',
    isDebit: 'both',
  },
  SALE: {
    code: 'SALE',
    label: 'Sale',
    description: 'Sale made to customer',
    isDebit: true,
  },
  PAYMENT_RECEIVED: {
    code: 'PAYMENT_RECEIVED',
    label: 'Payment Received',
    description: 'Payment received from customer',
    isDebit: false,
  },
  RETURN: {
    code: 'RETURN',
    label: 'Return',
    description: 'Goods returned by customer',
    isDebit: false,
  },
  ADJUSTMENT: {
    code: 'ADJUSTMENT',
    label: 'Adjustment',
    description: 'Manual balance adjustment',
    isDebit: 'both',
  },
  DEBIT_NOTE: {
    code: 'DEBIT_NOTE',
    label: 'Debit Note',
    description: 'Debit note issued to customer',
    isDebit: true,
  },
  CREDIT_NOTE: {
    code: 'CREDIT_NOTE',
    label: 'Credit Note',
    description: 'Credit note issued to customer',
    isDebit: false,
  },
  CHEQUE_RECEIVED: {
    code: 'CHEQUE_RECEIVED',
    label: 'Cheque Received',
    description: 'Cheque received from customer',
    isDebit: false,
  },
  CHEQUE_CLEARED: {
    code: 'CHEQUE_CLEARED',
    label: 'Cheque Cleared',
    description: 'Cheque cleared successfully',
    isDebit: false,
  },
  CHEQUE_BOUNCED: {
    code: 'CHEQUE_BOUNCED',
    label: 'Cheque Bounced',
    description: 'Cheque bounced - reverses payment',
    isDebit: true,
  },
};

export interface CustomerLedgerEntry {
  id: string;
  customerId: string;
  entryDate: string;
  entryType: CustomerLedgerType;

  // Amounts (all in PKR)
  debit: number;                   // Increases balance (they owe more)
  credit: number;                  // Decreases balance (they owe less)
  balance: number;                 // Running balance after this entry

  // Reference to source document
  referenceType?: string;
  referenceId?: string;
  referenceNumber?: string;        // Invoice/challan/voucher number

  description: string;
  createdBy?: string;
  createdAt: string;
}

// ============================================
// MATERIAL TRANSACTION TYPES
// ============================================

export type MaterialTransactionType = 'SALE' | 'RETURN' | 'SAMPLE' | 'ADJUSTMENT';

export const MATERIAL_TRANSACTION_TYPES: Record<MaterialTransactionType, {
  code: MaterialTransactionType;
  label: string;
  description: string;
}> = {
  SALE: {
    code: 'SALE',
    label: 'Sale',
    description: 'Material sold to customer',
  },
  RETURN: {
    code: 'RETURN',
    label: 'Return',
    description: 'Material returned by customer',
  },
  SAMPLE: {
    code: 'SAMPLE',
    label: 'Sample',
    description: 'Sample sent to customer',
  },
  ADJUSTMENT: {
    code: 'ADJUSTMENT',
    label: 'Adjustment',
    description: 'Inventory adjustment',
  },
};

export interface MaterialTransactionItem {
  id: string;
  materialTransactionId: string;
  productId?: string;
  productName?: string;
  productCode?: string;
  rollId?: string;
  rollNumber?: string;
  description: string;
  quantity: number;
  unit: string;
  ratePerUnit: number;
  amount: number;
  notes?: string;
}

export interface MaterialTransaction {
  id: string;
  transactionNumber: string;       // TRX-2024-001
  customerId: string;
  customerName?: string;
  customerCode?: string;

  transactionDate: string;
  transactionType: MaterialTransactionType;

  referenceNumber?: string;        // Invoice/DO number

  // Items
  items: MaterialTransactionItem[];

  // Financial
  subtotal: number;
  discount: number;
  taxAmount: number;
  totalAmount: number;

  // Delivery
  deliveryAddress?: string;
  vehicleNumber?: string;

  // Links
  salesOrderId?: string;
  ledgerEntryId?: string;

  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MaterialTransactionFormData {
  customerId: string;
  transactionDate: string;
  transactionType: MaterialTransactionType;
  referenceNumber?: string;
  items: {
    productId?: string;
    rollId?: string;
    description: string;
    quantity: number;
    unit: string;
    ratePerUnit: number;
  }[];
  discount?: number;
  taxAmount?: number;
  deliveryAddress?: string;
  vehicleNumber?: string;
  notes?: string;
}

// ============================================
// CUSTOMER PAYMENT
// ============================================

export interface CustomerPayment {
  id: string;
  customerId: string;
  customerName?: string;
  customerCode?: string;

  paymentDate: string;
  amount: number;
  paymentMethod: PaymentMethod;
  referenceNumber?: string;        // Cheque # or transaction ID
  transactionRef?: string;         // Bank transaction reference
  bankName?: string;
  notes?: string;
  receiptNumber: string;           // Auto-generated: RCV-2024-001

  // Cheque link
  chequeId?: string;

  // Ledger link
  ledgerEntryId?: string;

  createdBy?: string;
  createdAt: string;
}

export interface CustomerPaymentFormData {
  customerId: string;
  paymentDate: string;
  amount: number;
  paymentMethod: PaymentMethod;
  referenceNumber?: string;
  bankName?: string;
  notes?: string;
  // Cheque details (if payment method is CHEQUE)
  chequeNumber?: string;
  chequeDate?: string;
}

// ============================================
// AGING & REPORTS
// ============================================

export interface AgingBucket {
  current: number;      // Not yet due
  days1To30: number;    // 1-30 days overdue
  days31To60: number;   // 31-60 days overdue
  days61To90: number;   // 61-90 days overdue
  daysOver90: number;   // Over 90 days overdue
  total: number;
}

export interface CustomerAgingEntry {
  customerId: string;
  customerCode: string;
  customerName: string;
  creditLimit: number;
  availableCredit: number;
  aging: AgingBucket;
}

export interface ReceivablesAgingReport {
  asOfDate: string;
  summary: AgingBucket;
  entries: CustomerAgingEntry[];
}

export interface CustomerStatement {
  customer: {
    id: string;
    code: string;
    name: string;
    address?: string;
    phone: string;
    email?: string;
  };
  statementDate: string;
  periodFrom: string;
  periodTo: string;
  openingBalance: number;
  closingBalance: number;
  totalDebit: number;
  totalCredit: number;
  entries: CustomerLedgerEntry[];
  aging: AgingBucket;
}

export interface OutstandingEntry {
  customerId: string;
  customerCode: string;
  customerName: string;
  city?: string;
  creditLimit: number;
  totalOutstanding: number;
  overdueAmount: number;
  lastPaymentDate?: string;
  lastPaymentAmount?: number;
  pendingCheques: number;
  pendingChequeAmount: number;
}

export interface OutstandingReport {
  asOfDate: string;
  totalOutstanding: number;
  totalOverdue: number;
  totalCreditLimit: number;
  totalAvailableCredit: number;
  customerCount: number;
  entries: OutstandingEntry[];
}

// ============================================
// SUMMARY & STATISTICS
// ============================================

export interface CustomerSummary {
  totalSales: number;              // Total amount sold (PKR)
  totalPayments: number;           // Total amount received (PKR)
  currentBalance: number;          // Outstanding balance (PKR)
  totalMaterialSold: number;       // Total quantity sold
  returnCount: number;             // Total returns
  pendingReturns: number;          // Unresolved returns
  creditLimit: number;
  availableCredit: number;
  lastSaleDate?: string;
  lastPaymentDate?: string;
}

export interface CustomerListFilters {
  search?: string;
  status?: 'all' | 'active' | 'inactive';
  hasBalance?: boolean;
  overdueOnly?: boolean;
  city?: string;
}

export interface ReceivablesSummary {
  totalReceivables: number;
  overdueAmount: number;
  dueThisWeek: number;
  dueThisMonth: number;
  pendingCheques: number;
  pendingChequeAmount: number;
  customerCount: number;
  activeCustomers: number;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Generate a suggested customer code from name
 */
export function suggestCustomerCode(name: string, existingCodes: string[]): string {
  // Get first 3 letters of name, uppercase
  const prefix = name.replace(/[^a-zA-Z]/g, '').substring(0, 3).toUpperCase() || 'CUS';

  // Find the next available number
  let number = 1;
  let code = `${prefix}-${String(number).padStart(3, '0')}`;

  while (existingCodes.includes(code)) {
    number++;
    code = `${prefix}-${String(number).padStart(3, '0')}`;
  }

  return code;
}

/**
 * Calculate running balance for ledger entries
 */
export function calculateRunningBalance(
  entries: Omit<CustomerLedgerEntry, 'balance'>[],
  openingBalance: number = 0
): CustomerLedgerEntry[] {
  let runningBalance = openingBalance;

  return entries.map((entry) => {
    runningBalance = runningBalance + entry.debit - entry.credit;
    return {
      ...entry,
      balance: runningBalance,
    };
  });
}

/**
 * Calculate available credit
 */
export function calculateAvailableCredit(
  creditLimit: number,
  currentBalance: number
): number {
  return Math.max(0, creditLimit - currentBalance);
}

/**
 * Check if customer is over credit limit
 */
export function isOverCreditLimit(
  creditLimit: number,
  currentBalance: number
): boolean {
  return creditLimit > 0 && currentBalance > creditLimit;
}

/**
 * Format currency for display
 */
export function formatPKR(amount: number): string {
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
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
 * Get aging bucket label
 */
export function getAgingBucketLabel(bucket: keyof AgingBucket): string {
  const labels: Record<keyof AgingBucket, string> = {
    current: 'Current',
    days1To30: '1-30 Days',
    days31To60: '31-60 Days',
    days61To90: '61-90 Days',
    daysOver90: '90+ Days',
    total: 'Total',
  };
  return labels[bucket];
}

/**
 * Get aging bucket color
 */
export function getAgingBucketColor(bucket: keyof AgingBucket): string {
  const colors: Record<keyof AgingBucket, string> = {
    current: 'success',
    days1To30: 'warning',
    days31To60: 'warning',
    days61To90: 'error',
    daysOver90: 'error',
    total: 'info',
  };
  return colors[bucket];
}
