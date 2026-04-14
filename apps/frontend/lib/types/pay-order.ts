/**
 * Pay Order Types
 *
 * Pay Order workflow:
 * 1. Create Pay Order (purchase order to vendor)
 * 2. Material arrives → Verify against Pay Order
 * 3. Record any shortages/discrepancies
 * 4. After verification → Create Yarn Inward entry
 */

import { WeightUnit } from './yarn';

// ============================================
// PRICING TYPES
// ============================================

export type PricingType = 'PER_KG' | 'PER_BOX' | 'FIXED';

export const PRICING_TYPES: Record<PricingType, {
  code: PricingType;
  label: string;
  description: string;
}> = {
  PER_KG: {
    code: 'PER_KG',
    label: 'Per KG',
    description: 'Rate per kilogram × Quantity',
  },
  PER_BOX: {
    code: 'PER_BOX',
    label: 'Per Box',
    description: 'Rate per box × Number of boxes',
  },
  FIXED: {
    code: 'FIXED',
    label: 'Fixed Amount',
    description: 'Enter total amount directly',
  },
};

// ============================================
// PAY ORDER STATUS
// ============================================

export type PayOrderStatus =
  | 'DRAFT'              // Being prepared
  | 'PENDING_FINANCE'    // Awaiting Finance approval
  | 'PENDING_ADMIN'      // Awaiting Admin approval
  | 'APPROVED'           // Approved, ready to send to vendor
  | 'SENT'               // Sent to vendor, awaiting delivery
  | 'PARTIALLY_RECEIVED' // Some items received
  | 'RECEIVED'           // All items received, pending verification
  | 'VERIFIED'           // Verified, ready for inward
  | 'COMPLETED'          // Yarn inward done
  | 'REJECTED'           // Rejected by Finance or Admin
  | 'CANCELLED';         // Order cancelled

export const PAY_ORDER_STATUSES: Record<PayOrderStatus, {
  code: PayOrderStatus;
  label: string;
  color: string;
  description: string;
}> = {
  DRAFT: {
    code: 'DRAFT',
    label: 'Draft',
    color: 'neutral',
    description: 'Order is being prepared',
  },
  PENDING_FINANCE: {
    code: 'PENDING_FINANCE',
    label: 'Pending Finance',
    color: 'warning',
    description: 'Awaiting Finance department approval',
  },
  PENDING_ADMIN: {
    code: 'PENDING_ADMIN',
    label: 'Pending Admin',
    color: 'warning',
    description: 'Awaiting Admin approval',
  },
  APPROVED: {
    code: 'APPROVED',
    label: 'Approved',
    color: 'success',
    description: 'Approved and ready to send to vendor',
  },
  SENT: {
    code: 'SENT',
    label: 'Sent',
    color: 'info',
    description: 'Order sent to vendor, awaiting delivery',
  },
  PARTIALLY_RECEIVED: {
    code: 'PARTIALLY_RECEIVED',
    label: 'Partially Received',
    color: 'warning',
    description: 'Some items have been received',
  },
  RECEIVED: {
    code: 'RECEIVED',
    label: 'Received',
    color: 'info',
    description: 'Material received, pending verification',
  },
  VERIFIED: {
    code: 'VERIFIED',
    label: 'Verified',
    color: 'success',
    description: 'Verified and ready for yarn inward',
  },
  COMPLETED: {
    code: 'COMPLETED',
    label: 'Completed',
    color: 'success',
    description: 'Yarn inward completed',
  },
  REJECTED: {
    code: 'REJECTED',
    label: 'Rejected',
    color: 'error',
    description: 'Order rejected during approval',
  },
  CANCELLED: {
    code: 'CANCELLED',
    label: 'Cancelled',
    color: 'error',
    description: 'Order has been cancelled',
  },
};

// ============================================
// PAY ORDER ENTITY
// ============================================

export interface PayOrder {
  id: string;
  orderNumber: string;             // Auto-generated: PO-2024-001
  vendorId: string;
  vendorName?: string;             // Denormalized
  vendorCode?: string;             // Denormalized

  // Dates
  orderDate: string;
  expectedDeliveryDate?: string;
  receivedDate?: string;
  verifiedDate?: string;

  // Items
  items: PayOrderItem[];

  // Totals
  totalQuantity: number;           // Total kg ordered
  totalAmount?: number;            // Sum of all item amounts (set after Finance approval)

  // Status
  status: PayOrderStatus;

  // Approval workflow
  financeApprovedBy?: string;
  financeApprovedAt?: string;
  financeRejectionReason?: string;
  adminApprovedBy?: string;
  adminApprovedAt?: string;
  adminRejectionReason?: string;

  // Notes
  terms?: string;                  // Delivery terms (no payment terms - pricing handled separately)
  notes?: string;

  // Verification
  verificationId?: string;         // Link to verification record
  yarnInwardId?: string;           // Link to yarn inward after completion

  // Audit
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PayOrderItem {
  id: string;
  payOrderId: string;

  // Yarn details
  yarnTypeId: string;
  yarnTypeName: string;
  yarnTypeCode: string;

  // Ordered quantity
  orderedQuantity: number;         // kg
  unit: string;                    // kg, cones, bags, etc.

  // Flexible Pricing (entered by Finance during approval)
  pricingType?: PricingType;       // How to calculate price
  ratePerUnit?: number;            // Rate per kg (for PER_KG)
  ratePerBox?: number;             // Rate per box (for PER_BOX)
  kgPerBox?: number;               // Weight per box (for PER_BOX)
  numberOfBoxes?: number;          // Number of boxes (for PER_BOX)
  totalAmount?: number;            // Final calculated/entered amount

  // Received (updated during verification)
  receivedQuantity?: number;
  shortageQuantity?: number;
  excessQuantity?: number;

  // Quality
  qualityStatus?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PARTIAL';
  qualityNotes?: string;

  notes?: string;
}

// ============================================
// PAY ORDER FORM DATA
// ============================================

export interface PayOrderFormData {
  vendorId: string;
  orderDate: string;
  expectedDeliveryDate?: string;
  items: PayOrderItemFormData[];
  terms?: string;
  notes?: string;
}

export interface PayOrderItemFormData {
  yarnTypeId: string;
  orderedQuantity: number;
  unit: string;                    // kg, cones, bags, etc.
  notes?: string;
}

// ============================================
// VERIFICATION
// ============================================

export type ShortageType =
  | 'QUANTITY_SHORT'      // Less quantity than ordered
  | 'QUANTITY_EXCESS'     // More quantity than ordered
  | 'WRONG_TYPE'          // Different yarn type received
  | 'QUALITY_ISSUE'       // Quality not as expected
  | 'DAMAGED'             // Damaged during transport
  | 'WEIGHT_MISMATCH';    // Actual weight differs from invoice

export const SHORTAGE_TYPES: Record<ShortageType, {
  code: ShortageType;
  label: string;
  description: string;
}> = {
  QUANTITY_SHORT: {
    code: 'QUANTITY_SHORT',
    label: 'Quantity Short',
    description: 'Received less than ordered quantity',
  },
  QUANTITY_EXCESS: {
    code: 'QUANTITY_EXCESS',
    label: 'Quantity Excess',
    description: 'Received more than ordered quantity',
  },
  WRONG_TYPE: {
    code: 'WRONG_TYPE',
    label: 'Wrong Type',
    description: 'Received different yarn type',
  },
  QUALITY_ISSUE: {
    code: 'QUALITY_ISSUE',
    label: 'Quality Issue',
    description: 'Yarn quality not as expected',
  },
  DAMAGED: {
    code: 'DAMAGED',
    label: 'Damaged',
    description: 'Material damaged during transport',
  },
  WEIGHT_MISMATCH: {
    code: 'WEIGHT_MISMATCH',
    label: 'Weight Mismatch',
    description: 'Actual weight differs from invoice weight',
  },
};

export type ShortageResolution =
  | 'PENDING'             // Not yet resolved
  | 'ACCEPTED'            // Accepted as is
  | 'CREDIT_NOTE'         // Vendor will issue credit
  | 'REPLACEMENT'         // Vendor will replace
  | 'REJECTED';           // Returned to vendor

export const SHORTAGE_RESOLUTIONS: Record<ShortageResolution, {
  code: ShortageResolution;
  label: string;
  color: string;
}> = {
  PENDING: {
    code: 'PENDING',
    label: 'Pending',
    color: 'warning',
  },
  ACCEPTED: {
    code: 'ACCEPTED',
    label: 'Accepted',
    color: 'neutral',
  },
  CREDIT_NOTE: {
    code: 'CREDIT_NOTE',
    label: 'Credit Note',
    color: 'info',
  },
  REPLACEMENT: {
    code: 'REPLACEMENT',
    label: 'Replacement',
    color: 'info',
  },
  REJECTED: {
    code: 'REJECTED',
    label: 'Rejected',
    color: 'error',
  },
};

export interface PayOrderVerification {
  id: string;
  payOrderId: string;
  payOrderNumber?: string;

  // Verification details
  verifiedDate: string;
  verifiedBy?: string;
  receivedChallanNumber?: string;  // Vendor's challan/invoice number

  // Items verification
  itemVerifications: PayOrderItemVerification[];

  // Shortages/Discrepancies
  shortages: PayOrderShortage[];
  hasShortages: boolean;
  totalShortageAmount: number;

  // Summary
  totalOrderedQuantity: number;
  totalReceivedQuantity: number;
  totalOrderedAmount: number;
  totalReceivedAmount: number;

  // Notes
  notes?: string;

  // Status
  isComplete: boolean;             // All items verified
  canProceedToInward: boolean;     // Ready for yarn inward

  createdAt: string;
  updatedAt: string;
}

export interface PayOrderItemVerification {
  payOrderItemId: string;
  yarnTypeId: string;
  yarnTypeName: string;
  yarnTypeCode: string;

  // Ordered
  orderedQuantity: number;
  orderedRate: number;
  orderedAmount: number;

  // Received
  receivedQuantity: number;
  actualRate?: number;             // If different from ordered
  receivedAmount: number;

  // Variance
  quantityVariance: number;        // receivedQuantity - orderedQuantity
  amountVariance: number;

  // Quality
  qualityStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PARTIAL';
  qualityNotes?: string;
  acceptedQuantity: number;        // Quantity that passed quality check

  // Flags
  hasShortage: boolean;
  hasExcess: boolean;
  hasQualityIssue: boolean;
}

export interface PayOrderShortage {
  id: string;
  verificationId: string;
  payOrderItemId?: string;         // Link to specific item if applicable

  // Shortage details
  shortageType: ShortageType;
  description: string;

  // Quantities
  expectedQuantity?: number;
  actualQuantity?: number;
  shortageQuantity?: number;

  // Value
  shortageAmount?: number;         // Financial impact

  // Resolution
  resolution: ShortageResolution;
  resolutionDate?: string;
  resolutionNotes?: string;
  creditNoteNumber?: string;
  creditNoteAmount?: number;

  // Evidence
  photos?: string[];               // URLs to photos

  createdAt: string;
  updatedAt: string;
}

// ============================================
// VERIFICATION FORM DATA
// ============================================

export interface VerificationFormData {
  payOrderId: string;
  verifiedDate: string;
  receivedChallanNumber?: string;
  items: VerificationItemFormData[];
  shortages: ShortageFormData[];
  notes?: string;
}

export interface VerificationItemFormData {
  payOrderItemId: string;
  receivedQuantity: number;
  actualRate?: number;
  qualityStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PARTIAL';
  acceptedQuantity: number;
  qualityNotes?: string;
}

export interface ShortageFormData {
  payOrderItemId?: string;
  shortageType: ShortageType;
  description: string;
  expectedQuantity?: number;
  actualQuantity?: number;
  shortageQuantity?: number;
  shortageAmount?: number;
}

// ============================================
// SUMMARY & FILTERS
// ============================================

export interface PayOrderSummary {
  totalOrders: number;
  draftOrders: number;
  pendingDelivery: number;
  pendingVerification: number;
  completed: number;
  totalValue: number;
  totalShortages: number;
}

export interface PayOrderFilters {
  search?: string;
  status?: PayOrderStatus | 'all';
  vendorId?: string;
  dateFrom?: string;
  dateTo?: string;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Generate pay order number
 */
export function generatePayOrderNumber(existingNumbers: string[]): string {
  const year = new Date().getFullYear();
  const prefix = `PO-${year}-`;

  let maxNumber = 0;
  existingNumbers.forEach((num) => {
    if (num.startsWith(prefix)) {
      const n = parseInt(num.replace(prefix, ''), 10);
      if (!isNaN(n) && n > maxNumber) {
        maxNumber = n;
      }
    }
  });

  return `${prefix}${String(maxNumber + 1).padStart(4, '0')}`;
}

/**
 * Calculate totals for pay order
 */
export function calculatePayOrderTotals(items: PayOrderItemFormData[]): {
  totalQuantity: number;
} {
  let totalQuantity = 0;

  items.forEach((item) => {
    totalQuantity += item.orderedQuantity;
  });

  return { totalQuantity };
}

/**
 * Calculate totals for pay order with pricing (after Finance approval)
 */
export function calculatePayOrderTotalsWithPricing(items: PayOrderItem[]): {
  totalQuantity: number;
  totalAmount: number;
} {
  let totalQuantity = 0;
  let totalAmount = 0;

  items.forEach((item) => {
    totalQuantity += item.orderedQuantity;
    totalAmount += item.totalAmount || 0;
  });

  return { totalQuantity, totalAmount };
}

/**
 * Calculate verification variance
 */
export function calculateVariance(
  orderedQuantity: number,
  receivedQuantity: number,
  rate: number
): {
  quantityVariance: number;
  amountVariance: number;
  percentageVariance: number;
} {
  const quantityVariance = receivedQuantity - orderedQuantity;
  const amountVariance = quantityVariance * rate;
  const percentageVariance = orderedQuantity > 0
    ? (quantityVariance / orderedQuantity) * 100
    : 0;

  return { quantityVariance, amountVariance, percentageVariance };
}

/**
 * Check if pay order can proceed to yarn inward
 */
export function canProceedToInward(verification: PayOrderVerification): boolean {
  // All items must be verified
  if (!verification.isComplete) return false;

  // All shortages must be resolved (not pending)
  const pendingShortages = verification.shortages.filter(
    (s) => s.resolution === 'PENDING'
  );
  if (pendingShortages.length > 0) return false;

  // At least some quantity must be accepted
  const totalAccepted = verification.itemVerifications.reduce(
    (sum, item) => sum + item.acceptedQuantity,
    0
  );
  if (totalAccepted <= 0) return false;

  return true;
}

/**
 * Format currency
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
 * Calculate item amount based on pricing type
 */
export function calculateItemAmount(
  orderedQuantity: number,
  pricingType: PricingType,
  pricing: {
    ratePerUnit?: number;
    ratePerBox?: number;
    numberOfBoxes?: number;
    fixedAmount?: number;
  }
): number {
  switch (pricingType) {
    case 'PER_KG':
      return orderedQuantity * (pricing.ratePerUnit || 0);
    case 'PER_BOX':
      return (pricing.numberOfBoxes || 0) * (pricing.ratePerBox || 0);
    case 'FIXED':
      return pricing.fixedAmount || 0;
    default:
      return 0;
  }
}
