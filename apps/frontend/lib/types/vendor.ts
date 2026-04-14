/**
 * Yarn Vendor Types
 *
 * Comprehensive types for vendor management including:
 * - Vendor entity and form data
 * - Financial ledger (payments, balances)
 * - Yarn/material ledger (purchases, receipts)
 * - Replacement tracking (returns, reissues)
 */

// ============================================
// VENDOR ENTITY
// ============================================

export interface YarnVendor {
  id: string;
  code: string;                    // Unique: VND-001
  name: string;
  contactPerson: string;
  phone: string;
  email?: string;
  address?: string;
  city?: string;
  country?: string;

  // Financial
  creditLimit: number;             // Maximum credit allowed (PKR)
  paymentTerms: number;            // Payment terms in days (e.g., 30, 60, 90)
  currentBalance: number;          // Current amount owed to vendor

  // Status & Rating
  rating: number;                  // 1-5 stars
  isActive: boolean;
  notes?: string;

  // Timestamps
  createdAt: string;
  updatedAt: string;
}

export interface YarnVendorFormData {
  code: string;
  name: string;
  contactPerson: string;
  phone: string;
  email?: string;
  address?: string;
  city?: string;
  country?: string;
  creditLimit: number;
  paymentTerms: number;
  openingBalance?: number;
  rating: number;
  isActive: boolean;
  notes?: string;
}

// ============================================
// FINANCIAL LEDGER
// ============================================

export type VendorLedgerEntryType =
  | 'OPENING_BALANCE'      // Initial balance when vendor added
  | 'PURCHASE'             // Yarn received (debit - we owe them more)
  | 'PAYMENT'              // Payment made (credit - we owe them less)
  | 'RETURN'               // Yarn returned (credit - reduces what we owe)
  | 'ADJUSTMENT'           // Manual adjustment (can be debit or credit)
  | 'REPLACEMENT_CREDIT'   // Credit for defective yarn returned
  | 'REPLACEMENT_DEBIT';   // Debit for replacement yarn received

export const VENDOR_LEDGER_ENTRY_TYPES: Record<VendorLedgerEntryType, {
  code: VendorLedgerEntryType;
  label: string;
  description: string;
  isDebit: boolean | 'both';
}> = {
  OPENING_BALANCE: {
    code: 'OPENING_BALANCE',
    label: 'Opening Balance',
    description: 'Initial balance when vendor was added',
    isDebit: 'both',
  },
  PURCHASE: {
    code: 'PURCHASE',
    label: 'Purchase',
    description: 'Yarn received from vendor',
    isDebit: true,
  },
  PAYMENT: {
    code: 'PAYMENT',
    label: 'Payment',
    description: 'Payment made to vendor',
    isDebit: false,
  },
  RETURN: {
    code: 'RETURN',
    label: 'Return',
    description: 'Yarn returned to vendor',
    isDebit: false,
  },
  ADJUSTMENT: {
    code: 'ADJUSTMENT',
    label: 'Adjustment',
    description: 'Manual balance adjustment',
    isDebit: 'both',
  },
  REPLACEMENT_CREDIT: {
    code: 'REPLACEMENT_CREDIT',
    label: 'Replacement Credit',
    description: 'Credit for defective yarn',
    isDebit: false,
  },
  REPLACEMENT_DEBIT: {
    code: 'REPLACEMENT_DEBIT',
    label: 'Replacement Debit',
    description: 'Replacement yarn received',
    isDebit: true,
  },
};

export interface VendorLedgerEntry {
  id: string;
  vendorId: string;
  entryDate: string;
  entryType: VendorLedgerEntryType;

  // Amounts (all in PKR)
  debit: number;                   // Increases balance (we owe more)
  credit: number;                  // Decreases balance (we owe less)
  balance: number;                 // Running balance after this entry

  // Reference to source document
  referenceType?: 'YARN_BOX' | 'PAYMENT' | 'REPLACEMENT' | 'ADJUSTMENT' | 'PAY_ORDER';
  referenceId?: string;
  referenceNumber?: string;        // Invoice/challan/voucher number

  description: string;
  createdBy?: string;
  createdAt: string;
}

// ============================================
// PAYMENT
// ============================================

export type PaymentMethod = 'CASH' | 'CHEQUE' | 'BANK_TRANSFER' | 'ONLINE';

export const PAYMENT_METHODS: Record<PaymentMethod, {
  code: PaymentMethod;
  label: string;
  requiresReference: boolean;
  requiresBank: boolean;
}> = {
  CASH: {
    code: 'CASH',
    label: 'Cash',
    requiresReference: false,
    requiresBank: false,
  },
  CHEQUE: {
    code: 'CHEQUE',
    label: 'Cheque',
    requiresReference: true,
    requiresBank: true,
  },
  BANK_TRANSFER: {
    code: 'BANK_TRANSFER',
    label: 'Bank Transfer',
    requiresReference: true,
    requiresBank: true,
  },
  ONLINE: {
    code: 'ONLINE',
    label: 'Online Payment',
    requiresReference: true,
    requiresBank: false,
  },
};

export interface VendorPayment {
  id: string;
  vendorId: string;
  paymentDate: string;
  amount: number;
  paymentMethod: PaymentMethod;
  referenceNumber?: string;        // Cheque # or transaction ID
  bankName?: string;
  notes?: string;
  voucherNumber: string;           // Auto-generated: PAY-2024-001
  createdBy: string;
  createdAt: string;
}

export interface VendorPaymentFormData {
  vendorId: string;
  paymentDate: string;
  amount: number;
  paymentMethod: PaymentMethod;
  referenceNumber?: string;
  bankName?: string;
  notes?: string;
}

// ============================================
// YARN RECEIPT (MATERIAL LEDGER)
// ============================================

export type QualityStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'PARTIAL';

export const QUALITY_STATUSES: Record<QualityStatus, {
  code: QualityStatus;
  label: string;
  color: string;
}> = {
  PENDING: {
    code: 'PENDING',
    label: 'Pending',
    color: 'warning',
  },
  APPROVED: {
    code: 'APPROVED',
    label: 'Approved',
    color: 'success',
  },
  REJECTED: {
    code: 'REJECTED',
    label: 'Rejected',
    color: 'error',
  },
  PARTIAL: {
    code: 'PARTIAL',
    label: 'Partial Accept',
    color: 'warning',
  },
};

export interface VendorYarnReceipt {
  id: string;
  vendorId: string;
  receiptDate: string;
  receiptNumber: string;           // GRN/Challan number

  // Yarn details
  yarnTypeId: string;
  yarnTypeName: string;
  yarnTypeCode: string;

  // Quantity
  quantityReceived: number;        // kg
  ratePerKg: number;               // PKR per kg
  totalAmount: number;             // quantityReceived * ratePerKg

  // Quality check
  qualityStatus: QualityStatus;
  qualityNotes?: string;
  approvedQuantity?: number;       // If partial, how much was accepted

  // Issue tracking
  hasIssue: boolean;
  issueType?: IssueType;
  issueDescription?: string;
  replacementStatus?: ReplacementStatus;

  createdBy?: string;
  createdAt: string;
}

// ============================================
// REPLACEMENT TRACKING
// ============================================

export type IssueType = 'WRONG_TYPE' | 'QUALITY_DEFECT' | 'SHORT_WEIGHT' | 'DAMAGED';

export const ISSUE_TYPES: Record<IssueType, {
  code: IssueType;
  label: string;
  description: string;
}> = {
  WRONG_TYPE: {
    code: 'WRONG_TYPE',
    label: 'Wrong Type',
    description: 'Different yarn type than ordered',
  },
  QUALITY_DEFECT: {
    code: 'QUALITY_DEFECT',
    label: 'Quality Defect',
    description: 'Yarn does not meet quality standards',
  },
  SHORT_WEIGHT: {
    code: 'SHORT_WEIGHT',
    label: 'Short Weight',
    description: 'Actual weight less than invoiced',
  },
  DAMAGED: {
    code: 'DAMAGED',
    label: 'Damaged',
    description: 'Yarn damaged during transport or storage',
  },
};

export type ReplacementStatus =
  | 'REPORTED'              // Issue reported, pending action
  | 'RETURN_PENDING'        // Approved for return, not yet returned
  | 'RETURNED'              // Yarn has been returned to vendor
  | 'REPLACEMENT_PENDING'   // Waiting for replacement yarn
  | 'REPLACED'              // Replacement received
  | 'CREDITED'              // Vendor gave credit instead of replacement
  | 'CLOSED';               // Issue resolved and closed

export const REPLACEMENT_STATUSES: Record<ReplacementStatus, {
  code: ReplacementStatus;
  label: string;
  color: string;
  isOpen: boolean;
}> = {
  REPORTED: {
    code: 'REPORTED',
    label: 'Reported',
    color: 'warning',
    isOpen: true,
  },
  RETURN_PENDING: {
    code: 'RETURN_PENDING',
    label: 'Return Pending',
    color: 'warning',
    isOpen: true,
  },
  RETURNED: {
    code: 'RETURNED',
    label: 'Returned',
    color: 'info',
    isOpen: true,
  },
  REPLACEMENT_PENDING: {
    code: 'REPLACEMENT_PENDING',
    label: 'Replacement Pending',
    color: 'warning',
    isOpen: true,
  },
  REPLACED: {
    code: 'REPLACED',
    label: 'Replaced',
    color: 'success',
    isOpen: false,
  },
  CREDITED: {
    code: 'CREDITED',
    label: 'Credited',
    color: 'success',
    isOpen: false,
  },
  CLOSED: {
    code: 'CLOSED',
    label: 'Closed',
    color: 'neutral',
    isOpen: false,
  },
};

export interface VendorReplacement {
  id: string;
  vendorId: string;
  originalReceiptId: string;       // Link to original yarn receipt

  // Original receipt details (denormalized for display)
  originalReceiptNumber?: string;
  originalYarnType?: string;
  originalQuantity?: number;

  // Issue details
  issueDate: string;
  issueType: IssueType;
  issueDescription: string;
  affectedQuantity: number;        // How much yarn was affected

  // Return details
  returnedQuantity?: number;
  returnedDate?: string;
  returnChallanNumber?: string;

  // Replacement details
  replacementQuantity?: number;
  replacementDate?: string;
  replacementChallanNumber?: string;

  // Resolution
  status: ReplacementStatus;
  creditAmount?: number;           // If credited instead of replaced
  creditDate?: string;

  notes?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface VendorReplacementFormData {
  vendorId: string;
  originalReceiptId: string;
  issueType: IssueType;
  issueDescription: string;
  affectedQuantity: number;
  notes?: string;
}

// ============================================
// SUMMARY & STATISTICS
// ============================================

export interface VendorSummary {
  totalPurchases: number;          // Total amount purchased (PKR)
  totalPayments: number;           // Total amount paid (PKR)
  currentBalance: number;          // Outstanding balance (PKR)
  totalYarnReceived: number;       // Total kg received
  replacementCount: number;        // Total replacement issues
  pendingReplacements: number;     // Open/unresolved issues
  lastPurchaseDate?: string;
  lastPaymentDate?: string;
}

export interface VendorListFilters {
  search?: string;
  status?: 'all' | 'active' | 'inactive';
  hasBalance?: boolean;
  hasPendingIssues?: boolean;
  city?: string;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Generate a suggested vendor code from name
 */
export function suggestVendorCode(name: string, existingCodes: string[]): string {
  // Get first 3 letters of name, uppercase
  const prefix = name.replace(/[^a-zA-Z]/g, '').substring(0, 3).toUpperCase() || 'VND';

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
  entries: Omit<VendorLedgerEntry, 'balance'>[],
  openingBalance: number = 0
): VendorLedgerEntry[] {
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
