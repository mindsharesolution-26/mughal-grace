/**
 * Yarn Module Types
 *
 * Core entities:
 * - YarnType: Master data with composition, count, tags
 * - KnittingYarn: Blends of multiple yarn types
 * - Purchase Orders: Full workflow ordering
 * - Inward (YarnBox): Receive boxes against POs
 * - Outward: Issue yarn to machines
 * - Ledger: Running balance per yarn type
 */

// ============================================
// FIBER TYPES
// ============================================

export type FiberType =
  | 'COTTON'
  | 'POLYESTER'
  | 'VISCOSE'
  | 'NYLON'
  | 'WOOL'
  | 'SILK'
  | 'ACRYLIC'
  | 'SPANDEX'
  | 'ELASTANE'
  | 'LINEN'
  | 'BAMBOO'
  | 'MODAL'
  | 'TENCEL'
  | 'POLYPROPYLENE'
  | 'OTHER';

export const FIBER_TYPES: Record<FiberType, {
  code: FiberType;
  name: string;
  description: string;
  isNatural: boolean;
}> = {
  COTTON: { code: 'COTTON', name: 'Cotton', description: 'Natural cotton fiber', isNatural: true },
  POLYESTER: { code: 'POLYESTER', name: 'Polyester', description: 'Synthetic polyester fiber', isNatural: false },
  VISCOSE: { code: 'VISCOSE', name: 'Viscose', description: 'Semi-synthetic viscose rayon', isNatural: false },
  NYLON: { code: 'NYLON', name: 'Nylon', description: 'Synthetic polyamide fiber', isNatural: false },
  WOOL: { code: 'WOOL', name: 'Wool', description: 'Natural wool fiber', isNatural: true },
  SILK: { code: 'SILK', name: 'Silk', description: 'Natural silk fiber', isNatural: true },
  ACRYLIC: { code: 'ACRYLIC', name: 'Acrylic', description: 'Synthetic acrylic fiber', isNatural: false },
  SPANDEX: { code: 'SPANDEX', name: 'Spandex', description: 'Elastic synthetic fiber (Lycra)', isNatural: false },
  ELASTANE: { code: 'ELASTANE', name: 'Elastane', description: 'Elastic synthetic fiber', isNatural: false },
  LINEN: { code: 'LINEN', name: 'Linen', description: 'Natural flax fiber', isNatural: true },
  BAMBOO: { code: 'BAMBOO', name: 'Bamboo', description: 'Bamboo-derived fiber', isNatural: true },
  MODAL: { code: 'MODAL', name: 'Modal', description: 'Semi-synthetic beechwood fiber', isNatural: false },
  TENCEL: { code: 'TENCEL', name: 'Tencel', description: 'Lyocell from eucalyptus', isNatural: false },
  POLYPROPYLENE: { code: 'POLYPROPYLENE', name: 'Polypropylene', description: 'Thermoplastic fiber', isNatural: false },
  OTHER: { code: 'OTHER', name: 'Other', description: 'Other fiber type', isNatural: false },
};

export interface FiberComposition {
  fiberType: FiberType;
  percentage: number;
}

// ============================================
// COUNT SYSTEMS
// ============================================

export type CountSystem = 'NE' | 'TEX' | 'DENIER' | 'NM';

export const COUNT_SYSTEMS: Record<CountSystem, {
  code: CountSystem;
  name: string;
  fullName: string;
  description: string;
  higherIsFiner: boolean;
}> = {
  NE: {
    code: 'NE',
    name: 'Ne',
    fullName: 'English Count (Ne)',
    description: 'Number of 840-yard hanks per pound',
    higherIsFiner: true,
  },
  TEX: {
    code: 'TEX',
    name: 'Tex',
    fullName: 'Tex',
    description: 'Grams per 1000 meters',
    higherIsFiner: false,
  },
  DENIER: {
    code: 'DENIER',
    name: 'Denier',
    fullName: 'Denier',
    description: 'Grams per 9000 meters',
    higherIsFiner: false,
  },
  NM: {
    code: 'NM',
    name: 'Nm',
    fullName: 'Metric Count (Nm)',
    description: 'Kilometers per kilogram',
    higherIsFiner: true,
  },
};

// ============================================
// YARN CATEGORIES
// ============================================

export type YarnCategory =
  | 'RING_SPUN'
  | 'OPEN_END'
  | 'CARDED'
  | 'COMBED'
  | 'COMPACT'
  | 'SLUB'
  | 'MELANGE'
  | 'CORE_SPUN'
  | 'FANCY'
  | 'OTHER';

export const YARN_CATEGORIES: Record<YarnCategory, {
  code: YarnCategory;
  name: string;
  description: string;
}> = {
  RING_SPUN: { code: 'RING_SPUN', name: 'Ring Spun', description: 'Traditional ring spinning' },
  OPEN_END: { code: 'OPEN_END', name: 'Open End', description: 'Rotor/open-end spun yarn' },
  CARDED: { code: 'CARDED', name: 'Carded', description: 'Carded cotton yarn' },
  COMBED: { code: 'COMBED', name: 'Combed', description: 'Combed cotton yarn (finer)' },
  COMPACT: { code: 'COMPACT', name: 'Compact', description: 'Compact spun yarn' },
  SLUB: { code: 'SLUB', name: 'Slub', description: 'Slub/effect yarn' },
  MELANGE: { code: 'MELANGE', name: 'Melange', description: 'Melange/heather yarn' },
  CORE_SPUN: { code: 'CORE_SPUN', name: 'Core Spun', description: 'Core-spun yarn' },
  FANCY: { code: 'FANCY', name: 'Fancy', description: 'Fancy/novelty yarn' },
  OTHER: { code: 'OTHER', name: 'Other', description: 'Other yarn category' },
};

// ============================================
// WEIGHT & MEASUREMENT UNITS
// ============================================

export type WeightUnit = 'KG' | 'LB' | 'G' | 'OZ';

export const WEIGHT_UNITS: Record<WeightUnit, {
  code: WeightUnit;
  name: string;
  symbol: string;
  toKg: number;
}> = {
  KG: { code: 'KG', name: 'Kilogram', symbol: 'kg', toKg: 1 },
  LB: { code: 'LB', name: 'Pound', symbol: 'lb', toKg: 0.453592 },
  G: { code: 'G', name: 'Gram', symbol: 'g', toKg: 0.001 },
  OZ: { code: 'OZ', name: 'Ounce', symbol: 'oz', toKg: 0.0283495 },
};

// ============================================
// CURRENCY
// ============================================

export type CurrencyCode = 'PKR' | 'USD' | 'EUR' | 'GBP' | 'CNY' | 'INR' | 'BDT' | 'TRY';

export const CURRENCIES: Record<CurrencyCode, {
  code: CurrencyCode;
  name: string;
  symbol: string;
  locale: string;
}> = {
  PKR: { code: 'PKR', name: 'Pakistani Rupee', symbol: 'Rs.', locale: 'en-PK' },
  USD: { code: 'USD', name: 'US Dollar', symbol: '$', locale: 'en-US' },
  EUR: { code: 'EUR', name: 'Euro', symbol: '€', locale: 'de-DE' },
  GBP: { code: 'GBP', name: 'British Pound', symbol: '£', locale: 'en-GB' },
  CNY: { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', locale: 'zh-CN' },
  INR: { code: 'INR', name: 'Indian Rupee', symbol: '₹', locale: 'en-IN' },
  BDT: { code: 'BDT', name: 'Bangladeshi Taka', symbol: '৳', locale: 'bn-BD' },
  TRY: { code: 'TRY', name: 'Turkish Lira', symbol: '₺', locale: 'tr-TR' },
};

// ============================================
// YARN TYPE (FULL)
// ============================================

export interface YarnType {
  id: number;
  code: string;
  name: string;
  brandName: string;
  color: string;
  grade: string;
  description?: string | null;

  // Composition
  composition?: FiberComposition[] | null;

  // Count/thickness
  countValue?: number | null;
  countSystem?: CountSystem | null;

  // Pricing
  defaultPricePerKg?: number | null;
  priceUnit: string;
  currency: string;

  // Classification
  category?: string | null;
  tags: string[];
  certifications: string[];

  // Status & timestamps
  isActive: boolean;
  createdAt: string;
  updatedAt: string;

  // Relations
  blendItems?: YarnTypeKnittingYarn[];
}

export interface YarnTypeFormData {
  code?: string;
  name: string;
  brandName: string;
  color: string;
  grade: string;
  description?: string;

  // Composition
  composition?: FiberComposition[];

  // Count/thickness
  countValue?: number;
  countSystem?: CountSystem;

  // Pricing
  defaultPricePerKg?: number;
  priceUnit?: string;
  currency?: string;

  // Classification
  category?: string;
  tags?: string[];
  certifications?: string[];

  isActive: boolean;
}

// Lightweight lookup for dropdowns
export interface YarnTypeLookup {
  id: number;
  code: string;
  name: string;
  brandName: string;
  color: string;
  grade?: string;
  defaultPricePerKg: number | null;
}

// ============================================
// KNITTING YARN / BLEND
// ============================================

export interface YarnTypeKnittingYarn {
  id: number;
  knittingYarnId: number;
  yarnTypeId: number;
  percentage: number;
  createdAt: string;
  yarnType?: {
    id: number;
    code: string;
    name: string;
    brandName: string;
    color: string;
  };
}

export interface KnittingYarn {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  blendSummary?: string | null;
  defaultPricePerKg?: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  yarnTypes?: YarnTypeKnittingYarn[];
}

export interface KnittingYarnFormData {
  code?: string;
  name: string;
  description?: string;
  defaultPricePerKg?: number;
  yarnTypes: {
    yarnTypeId: number;
    percentage: number;
  }[];
  isActive?: boolean;
}

export interface KnittingYarnLookup {
  id: number;
  code: string;
  name: string;
  blendSummary: string | null;
  defaultPricePerKg: number | null;
}

// ============================================
// PURCHASE ORDER
// ============================================

export type PurchaseOrderStatus =
  | 'DRAFT'
  | 'APPROVED'
  | 'SENT'
  | 'PARTIALLY_RECEIVED'
  | 'COMPLETED'
  | 'CANCELLED';

export const PURCHASE_ORDER_STATUSES: Record<PurchaseOrderStatus, {
  code: PurchaseOrderStatus;
  label: string;
  color: string;
  description: string;
}> = {
  DRAFT: {
    code: 'DRAFT',
    label: 'Draft',
    color: 'gray',
    description: 'Order is being prepared'
  },
  APPROVED: {
    code: 'APPROVED',
    label: 'Approved',
    color: 'blue',
    description: 'Order has been approved'
  },
  SENT: {
    code: 'SENT',
    label: 'Sent',
    color: 'purple',
    description: 'Order sent to vendor'
  },
  PARTIALLY_RECEIVED: {
    code: 'PARTIALLY_RECEIVED',
    label: 'Partial',
    color: 'yellow',
    description: 'Some items received'
  },
  COMPLETED: {
    code: 'COMPLETED',
    label: 'Completed',
    color: 'green',
    description: 'All items received'
  },
  CANCELLED: {
    code: 'CANCELLED',
    label: 'Cancelled',
    color: 'red',
    description: 'Order was cancelled'
  },
};

export interface PurchaseOrderItem {
  id: number;
  purchaseOrderId: number;
  yarnTypeId: number;
  orderedQuantity: number;
  receivedQuantity: number;
  pricePerKg: number | null;
  amount: number | null;
  notes: string | null;
  createdAt: string;
  yarnType?: {
    id: number;
    code: string;
    name: string;
    brandName: string;
    color: string;
  };
}

export interface PurchaseOrder {
  id: number;
  orderNumber: string;
  vendorId: number;
  orderDate: string;
  expectedDeliveryDate: string | null;
  status: PurchaseOrderStatus;
  totalQuantity: number;
  totalAmount: number | null;
  approvedBy: number | null;
  approvedAt: string | null;
  sentAt: string | null;
  terms: string | null;
  notes: string | null;
  createdBy: number | null;
  createdAt: string;
  updatedAt: string;
  vendor?: {
    id: number;
    code: string;
    name: string;
  };
  items?: PurchaseOrderItem[];
  receivedBoxes?: YarnBox[];
}

export interface PurchaseOrderFormData {
  vendorId: number;
  orderDate: string;
  expectedDeliveryDate?: string;
  terms?: string;
  notes?: string;
  items: {
    yarnTypeId: number;
    orderedQuantity: number;
    pricePerKg?: number;
    notes?: string;
  }[];
}

// ============================================
// YARN OUTWARD (ISSUE TO MACHINES)
// ============================================

export type YarnOutwardStatus = 'ISSUED' | 'IN_USE' | 'COMPLETED' | 'RETURNED';
export type YarnOutwardPurpose = 'PRODUCTION' | 'SAMPLE' | 'TESTING' | 'OTHER';

export const YARN_OUTWARD_STATUSES: Record<YarnOutwardStatus, {
  code: YarnOutwardStatus;
  label: string;
  color: string;
}> = {
  ISSUED: { code: 'ISSUED', label: 'Issued', color: 'blue' },
  IN_USE: { code: 'IN_USE', label: 'In Use', color: 'yellow' },
  COMPLETED: { code: 'COMPLETED', label: 'Completed', color: 'green' },
  RETURNED: { code: 'RETURNED', label: 'Returned', color: 'purple' },
};

export const YARN_OUTWARD_PURPOSES: Record<YarnOutwardPurpose, {
  code: YarnOutwardPurpose;
  label: string;
  description: string;
}> = {
  PRODUCTION: {
    code: 'PRODUCTION',
    label: 'Production',
    description: 'Yarn issued for machine production',
  },
  SAMPLE: {
    code: 'SAMPLE',
    label: 'Sample',
    description: 'Yarn issued for making samples',
  },
  TESTING: {
    code: 'TESTING',
    label: 'Testing',
    description: 'Yarn issued for quality testing',
  },
  OTHER: {
    code: 'OTHER',
    label: 'Other',
    description: 'Other purposes',
  },
};

export interface YarnOutward {
  id: number;
  outwardNumber: string;
  yarnTypeId: number;
  boxId: number | null;
  quantityIssued: number;
  machineId: number;
  issuedAt: string;
  issuedBy: number | null;
  collectedBy: string;
  status: YarnOutwardStatus;
  quantityReturned: number;
  quantityUsed: number;
  shiftId: number | null;
  purpose: YarnOutwardPurpose;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  yarnType?: {
    id: number;
    code: string;
    name: string;
    brandName: string;
    color: string;
  };
  machine?: {
    id: number;
    machineNumber: number;
    name: string;
  };
  box?: {
    id: number;
    boxNumber: string;
  };
  shift?: {
    id: number;
    name: string;
    code: string;
  };
}

export interface YarnOutwardFormData {
  yarnTypeId: number;
  boxId?: number;
  quantityIssued: number;
  machineId: number;
  issuedAt: string;
  collectedBy: string;
  shiftId?: number;
  purpose?: YarnOutwardPurpose;
  notes?: string;
}

export interface YarnOutwardCompleteData {
  quantityUsed: number;
  quantityReturned: number;
  notes?: string;
}

// ============================================
// YARN LEDGER
// ============================================

export type YarnLedgerEntryType =
  | 'OPENING_BALANCE'
  | 'INWARD'
  | 'OUTWARD'
  | 'ADJUSTMENT'
  | 'RETURN';

export type PaymentStatus = 'UNPAID' | 'PARTIAL' | 'PAID' | 'OVERDUE';

export interface YarnLedgerEntry {
  id: number;
  yarnTypeId: number;
  entryDate: string;
  entryType: YarnLedgerEntryType;
  quantityIn: number;
  quantityOut: number;
  runningBalance: number;
  pricePerKg: number | null;
  totalValue: number | null;
  referenceType: string | null;
  referenceId: number | null;
  referenceNumber: string | null;
  vendorId: number | null;
  invoiceNumber: string | null;
  description: string | null;
  notes: string | null;
  paymentStatus: PaymentStatus | null;
  createdBy: number | null;
  createdAt: string;
  yarnType?: {
    id: number;
    code: string;
    name: string;
    brandName?: string;
    color?: string;
  };
  vendor?: {
    id: number;
    code: string;
    name: string;
  };
}

export interface YarnLedgerSummary {
  id: number;
  code: string;
  name: string;
  brandName: string;
  color: string;
  defaultPricePerKg: number | null;
  currentBalance: number;
  lastPricePerKg: number;
  lastEntryDate: string | null;
  totalIn: number;
  totalOut: number;
  totalValue: number;
}

// ============================================
// YARN BOX (INWARD)
// ============================================

export type BoxStatus = 'IN_STOCK' | 'PARTIALLY_USED' | 'EMPTY' | 'RETURNED';
export type ConeStatus = 'AVAILABLE' | 'IN_USE' | 'EMPTY' | 'DEFECTIVE';

export interface YarnCone {
  id: number;
  coneNumber: string;
  boxId: number;
  yarnTypeId: number;
  initialWeight: number;
  currentWeight: number;
  usedWeight: number;
  status: ConeStatus;
  assignedMachineId: number | null;
  assignedMachine?: {
    id: number;
    code: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface YarnBox {
  id: number;
  boxNumber: string;
  vendorId: number;
  yarnTypeId: number;
  lotNumber: string | null;
  grossWeight: number;
  tareWeight: number;
  netWeight: number;
  pricePerKg: number;
  totalValue: number;
  receivedAt: string;
  invoiceNumber: string | null;
  gatePassNumber: string | null;
  payOrderId: number | null;
  status: BoxStatus;
  createdAt: string;
  updatedAt: string;
  vendor?: {
    id: number;
    code: string;
    name: string;
  };
  yarnType?: {
    id: number;
    code: string;
    name: string;
    brandName?: string;
    color?: string;
  };
  cones?: YarnCone[];
  payOrder?: {
    id: number;
    orderNumber: string;
    status: string;
  };
  ledgerEntry?: YarnLedgerEntry;
}

export interface YarnBoxFormData {
  vendorId: number;
  yarnTypeId: number;
  lotNumber?: string;
  grossWeight: number;
  tareWeight?: number;
  pricePerKg: number;
  receivedAt: string;
  invoiceNumber?: string;
  gatePassNumber?: string;
  payOrderId?: number;
  paymentStatus?: PaymentStatus;
  notes?: string;
  cones?: {
    coneNumber: string;
    weight: number;
  }[];
}

// ============================================
// YARN VENDOR
// ============================================

export interface YarnVendor {
  id: number;
  code: string;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  paymentTerms: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface YarnVendorFormData {
  code?: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  paymentTerms?: string;
  notes?: string;
  isActive?: boolean;
}
