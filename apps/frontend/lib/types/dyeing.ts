// Dyeing Status
export type DyeingStatus = 'SENT' | 'IN_PROCESS' | 'READY' | 'PARTIALLY_RECEIVED' | 'COMPLETED' | 'CANCELLED';

export const dyeingStatusLabels: Record<DyeingStatus, string> = {
  SENT: 'Sent',
  IN_PROCESS: 'Processing',
  READY: 'Ready',
  PARTIALLY_RECEIVED: 'Partial',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

export const dyeingStatusColors: Record<DyeingStatus, { bg: string; text: string }> = {
  SENT: { bg: 'bg-warning/20', text: 'text-warning' },
  IN_PROCESS: { bg: 'bg-primary-500/20', text: 'text-primary-400' },
  READY: { bg: 'bg-info/20', text: 'text-info' },
  PARTIALLY_RECEIVED: { bg: 'bg-orange-500/20', text: 'text-orange-400' },
  COMPLETED: { bg: 'bg-success/20', text: 'text-success' },
  CANCELLED: { bg: 'bg-error/20', text: 'text-error' },
};

// Dyeing Vendor
export interface DyeingVendor {
  id: number;
  code: string;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  ntn: string | null;
  strn: string | null;
  paymentTerms: string | null;
  defaultRatePerKg: string | null;
  qualityRating: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    dyeingOrders: number;
  };
}

export interface DyeingVendorWithStats extends DyeingVendor {
  activeOrders: number;
  completedOrders: number;
  avgTurnaround: number;
  avgWeightVariance: number;
}

export interface DyeingVendorLookup {
  id: number;
  code: string;
  name: string;
}

export interface DyeingVendorFormData {
  code: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  ntn?: string;
  strn?: string;
  paymentTerms?: string;
  defaultRatePerKg?: number;
  qualityRating?: number;
}

// Dyeing Order
export interface DyeingOrder {
  id: number;
  orderNumber: string;
  vendorId: number;
  colorCode: string | null;
  colorName: string | null;
  processType: string | null;
  sentWeight: string;
  receivedWeight: string | null;
  weightGainLoss: string | null;
  weightVariance: string | null;
  ratePerKg: string;
  totalAmount: string | null;
  sentAt: string;
  expectedReturnAt: string | null;
  receivedAt: string | null;
  status: DyeingStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  vendor: {
    id: number;
    code: string;
    name: string;
  };
  _count?: {
    items: number;
  };
}

export interface DyeingOrderItem {
  id: number;
  dyeingOrderId: number;
  rollId: number;
  sentWeight: string;
  receivedWeight: string | null;
  isReceived: boolean;
  grade: string | null;
  defects: string | null;
  createdAt: string;
  roll: {
    id: number;
    rollNumber: string;
    fabricType: string;
    greyWeight: string;
    finishedWeight: string | null;
    grade: string;
  };
}

export interface DyeingOrderWithItems extends DyeingOrder {
  items: DyeingOrderItem[];
}

export interface DyeingOrderCreateData {
  vendorId: number;
  colorCode?: string;
  colorName?: string;
  processType?: string;
  ratePerKg?: number; // Optional - Finance handles rates
  expectedReturnAt?: string;
  notes?: string;
  rollIds: number[];
  // New: Fabric grouping support
  fabricGroups?: FabricGroupData[];
}

// Fabric group for order creation
export interface FabricGroupData {
  fabricId?: number;
  colorId?: number;
  colorCode?: string;
  colorName?: string;
  rollIds: number[];
  notes?: string;
}

export interface DyeingOrderReceiveItem {
  dyeingOrderItemId: number;
  receivedWeight: number;
  grade?: string;
  defects?: string;
  colorId?: number; // Color received from dyeing
}

// Stats
export interface DyeingStats {
  pending: number;
  inProgress: number;
  ready: number;
  pendingWeight: number;
  avgWeightLoss: number;
}

// Available Rolls
export interface AvailableRoll {
  id: number;
  rollNumber: string;
  fabricType: string;
  greyWeight: string;
  grade: string;
  producedAt: string;
  machine: {
    id: number;
    machineNumber: string;
    name: string;
  };
}

export interface AvailableRollsSummary {
  fabricType: string;
  rollCount: number;
  totalWeight: number;
}

// API Response Types
export interface DyeingOrderListResponse {
  orders: DyeingOrder[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ============ SEND FOR DYEING WORKFLOW ============

// Scanned roll from QR code lookup
export interface ScannedRoll {
  id: number;
  rollNumber: string;
  qrCode?: string;
  fabricType: string;
  greyWeight: string;
  grade: string;
  status: string;
  producedAt: string;
  fabricId?: number;
  machine?: {
    id: number;
    machineNumber: string;
    name: string;
  };
  fabric?: {
    id: number;
    code: string;
    name: string;
  };
}

// Fabric entry in send for dyeing form
export interface FabricEntry {
  id: string; // Local UUID for tracking
  fabricId?: number;
  fabricCode: string;
  fabricName: string;
  colorId?: number;
  colorCode?: string;
  colorName?: string;
  hexCode?: string;
  rolls: ScannedRoll[];
  notes?: string;
}

// Print data for dyeing challan
export interface DyeingOrderPrintData {
  order: {
    id: number;
    orderNumber: string;
    status: DyeingStatus;
    sentAt: string;
    receivedAt: string | null;
    notes: string | null;
  };
  vendor: {
    id: number;
    code: string;
    name: string;
    contactPerson: string | null;
    phone: string | null;
    address: string | null;
    city: string | null;
  };
  summary: {
    totalRolls: number;
    totalSentWeight: number;
    totalReceivedWeight: number | null;
    weightVariance: number | null;
  };
  fabricGroups: {
    fabricCode: string;
    fabricName: string;
    rollCount: number;
    totalSentWeight: number;
    totalReceivedWeight: number;
    items: {
      id: number;
      rollNumber: string;
      greyWeight: number;
      sentWeight: number;
      receivedWeight: number | null;
      grade: string | null;
      fabric: { id: number; code: string; name: string } | null;
      color: { id: number; code: string; name: string; hexCode: string } | null;
    }[];
  }[];
  printDate: string;
  copies: ('FINANCE' | 'GATE_PASS' | 'DYEING')[];
}

// Print copy type
export type DyeingPrintCopyType = 'FINANCE' | 'GATE_PASS' | 'DYEING';

export const dyeingPrintCopyLabels: Record<DyeingPrintCopyType, string> = {
  FINANCE: 'Finance Copy',
  GATE_PASS: 'Gate Pass Copy',
  DYEING: 'Dyeing Copy',
};

// ============ DYED FABRIC STOCK ============

// Dyed fabric stock item (roll in DYEING_COMPLETE status)
export interface DyedFabricStockItem {
  id: number;
  rollNumber: string;
  qrCode: string | null;
  fabricType: string;
  greyWeight: number;
  finishedWeight: number | null;
  grade: string;
  status: string;
  producedAt: string;
  updatedAt: string;
  color: {
    id: number;
    code: string;
    name: string;
    hexCode: string | null;
  } | null;
  fabric: {
    id: number;
    code: string;
    name: string;
  } | null;
  machine: {
    id: number;
    machineNumber: string;
    name: string;
  } | null;
  dyeingOrder: {
    id: number;
    orderNumber: string;
    vendor: {
      id: number;
      code: string;
      name: string;
    };
  } | null;
}

// Dyed fabric stock list response
export interface DyedFabricStockListResponse {
  rolls: DyedFabricStockItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Dyed fabric stock stats
export interface DyedFabricStockStats {
  totalRolls: number;
  totalWeight: number;
  recentCompletions: number;
  byColor: {
    colorId: number;
    colorCode: string;
    colorName: string;
    hexCode: string;
    rollCount: number;
    totalWeight: number;
  }[];
  byFabric: {
    fabricType: string;
    rollCount: number;
    totalWeight: number;
  }[];
}

// Dyed fabric stock summary by fabric type
export interface DyedFabricStockSummary {
  fabricType: string;
  totalRolls: number;
  totalWeight: number;
  colors: {
    colorId: number;
    colorCode: string;
    colorName: string;
    hexCode: string;
    rollCount: number;
    totalWeight: number;
  }[];
}

// Bulk move response
export interface BulkMoveResponse {
  success: boolean;
  movedCount: number;
  message: string;
}
