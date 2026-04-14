// Needle kinds
export type NeedleKind = 'LATCH' | 'COMPOUND' | 'BEARDED';

// Damage types
export type DamageType = 'BROKEN' | 'BENT' | 'WORN' | 'HOOK_DAMAGE' | 'LATCH_DAMAGE';

// Damage causes
export type DamageCause = 'YARN_KNOT' | 'METAL_FATIGUE' | 'OPERATOR_ERROR' | 'UNKNOWN';

// Movement types
export type MovementType = 'IN' | 'OUT' | 'ADJUST' | 'DAMAGE' | 'RETURN';

// Allocation status
export type AllocationStatus = 'INSTALLED' | 'REMOVED';

// Resolution status
export type ResolutionStatus = 'PENDING' | 'REPLACED' | 'WRITTEN_OFF';

// Removal reasons
export type RemovalReason = 'REPLACEMENT' | 'MAINTENANCE' | 'DAMAGE';

// Stock status
export type StockStatus = 'OK' | 'REORDER' | 'LOW';

// Needle kind labels
export const needleKindLabels: Record<NeedleKind, string> = {
  LATCH: 'Latch Needle',
  COMPOUND: 'Compound Needle',
  BEARDED: 'Bearded Needle',
};

// Damage type labels
export const damageTypeLabels: Record<DamageType, string> = {
  BROKEN: 'Broken',
  BENT: 'Bent',
  WORN: 'Worn Out',
  HOOK_DAMAGE: 'Hook Damage',
  LATCH_DAMAGE: 'Latch Damage',
};

// Damage type colors
export const damageTypeColors: Record<DamageType, { bg: string; text: string }> = {
  BROKEN: { bg: 'bg-error/20', text: 'text-error' },
  BENT: { bg: 'bg-warning/20', text: 'text-warning' },
  WORN: { bg: 'bg-orange-500/20', text: 'text-orange-400' },
  HOOK_DAMAGE: { bg: 'bg-red-500/20', text: 'text-red-400' },
  LATCH_DAMAGE: { bg: 'bg-pink-500/20', text: 'text-pink-400' },
};

// Damage cause labels
export const damageCauseLabels: Record<DamageCause, string> = {
  YARN_KNOT: 'Yarn Knot',
  METAL_FATIGUE: 'Metal Fatigue',
  OPERATOR_ERROR: 'Operator Error',
  UNKNOWN: 'Unknown',
};

// Movement type labels
export const movementTypeLabels: Record<MovementType, string> = {
  IN: 'Stock In',
  OUT: 'Stock Out',
  ADJUST: 'Adjustment',
  DAMAGE: 'Damage',
  RETURN: 'Return',
};

// Movement type colors
export const movementTypeColors: Record<MovementType, { bg: string; text: string }> = {
  IN: { bg: 'bg-success/20', text: 'text-success' },
  OUT: { bg: 'bg-error/20', text: 'text-error' },
  ADJUST: { bg: 'bg-blue-500/20', text: 'text-blue-400' },
  DAMAGE: { bg: 'bg-warning/20', text: 'text-warning' },
  RETURN: { bg: 'bg-purple-500/20', text: 'text-purple-400' },
};

// Resolution status labels
export const resolutionStatusLabels: Record<ResolutionStatus, string> = {
  PENDING: 'Pending',
  REPLACED: 'Replaced',
  WRITTEN_OFF: 'Written Off',
};

// Resolution status colors
export const resolutionStatusColors: Record<ResolutionStatus, { bg: string; text: string }> = {
  PENDING: { bg: 'bg-warning/20', text: 'text-warning' },
  REPLACED: { bg: 'bg-success/20', text: 'text-success' },
  WRITTEN_OFF: { bg: 'bg-neutral-500/20', text: 'text-neutral-400' },
};

// Stock status colors
export const stockStatusColors: Record<StockStatus, { bg: string; text: string }> = {
  OK: { bg: 'bg-success/20', text: 'text-success' },
  REORDER: { bg: 'bg-warning/20', text: 'text-warning' },
  LOW: { bg: 'bg-error/20', text: 'text-error' },
};

// Stock status labels
export const stockStatusLabels: Record<StockStatus, string> = {
  OK: 'In Stock',
  REORDER: 'Reorder Soon',
  LOW: 'Low Stock',
};

// Needle Type interface
export interface NeedleType {
  id: number;
  code: string;
  name: string;
  needleKind: NeedleKind;
  gauge: number;
  length: number | null;
  material: string;
  brand: string | null;
  supplierCode: string | null;
  costPerNeedle: number | null;
  currency: string;
  minStockLevel: number;
  reorderPoint: number;
  compatibleMachines: string[];
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  // Calculated fields
  currentStock?: number;
  _count?: {
    stockBatches: number;
    machineAllocations: number;
    damageRecords: number;
  };
}

// Needle Type with stock summary
export interface NeedleTypeWithStock extends NeedleType {
  stockSummary: {
    totalReceived: number;
    currentStock: number;
    allocated: number;
    damaged: number;
  };
  stockBatches?: NeedleStockBatch[];
  machineAllocations?: NeedleMachineAllocation[];
}

// Needle Stock Batch interface
export interface NeedleStockBatch {
  id: number;
  batchNumber: string;
  needleTypeId: number;
  receivedQuantity: number;
  currentQuantity: number;
  allocatedQuantity: number;
  damagedQuantity: number;
  receivedDate: string;
  invoiceNumber: string | null;
  invoiceDate: string | null;
  unitCost: number | null;
  totalCost: number | null;
  supplierId: number | null;
  supplierName: string | null;
  collectedBy: number | null;
  collectorName: string | null;
  collectionDate: string | null;
  lotNumber: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  // Relations
  needleType?: NeedleType;
  movements?: NeedleStockMovement[];
  allocations?: NeedleMachineAllocation[];
}

// Needle Stock Movement interface
export interface NeedleStockMovement {
  id: number;
  batchId: number;
  movementType: MovementType;
  quantity: number;
  referenceType: string | null;
  referenceId: number | null;
  performedBy: number;
  performerName: string;
  notes: string | null;
  createdAt: string;
  // Relations
  batch?: NeedleStockBatch;
}

// Machine allocation interface
export interface NeedleMachineAllocation {
  id: number;
  machineId: number;
  needleTypeId: number;
  batchId: number | null;
  installedQuantity: number;
  position: string | null;
  installedAt: string;
  installedBy: number;
  installerName: string;
  removedAt: string | null;
  removedBy: number | null;
  removerName: string | null;
  removalReason: RemovalReason | null;
  status: AllocationStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  // Relations
  machine?: {
    id: number;
    machineNumber: string;
    name: string;
  };
  needleType?: NeedleType;
  batch?: {
    id: number;
    batchNumber: string;
  };
  damages?: NeedleDamage[];
}

// Needle Damage interface
export interface NeedleDamage {
  id: number;
  needleTypeId: number;
  batchId: number | null;
  allocationId: number | null;
  machineId: number | null;
  damageDate: string;
  damageType: DamageType;
  damagedQuantity: number;
  cause: DamageCause | null;
  description: string | null;
  reportedBy: number;
  reporterName: string;
  resolutionStatus: ResolutionStatus;
  replacedQuantity: number | null;
  replacedAt: string | null;
  replacedBy: number | null;
  replacerName: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  // Relations
  needleType?: NeedleType;
  batch?: NeedleStockBatch;
  allocation?: NeedleMachineAllocation;
}

// Stock summary item
export interface NeedleStockSummary {
  id: number;
  code: string;
  name: string;
  gauge: number;
  needleKind: NeedleKind;
  minStockLevel: number;
  reorderPoint: number;
  totalReceived: number;
  currentStock: number;
  allocated: number;
  damaged: number;
  status: StockStatus;
}

// Machine needle status
export interface MachineNeedleStatus {
  machine: {
    id: number;
    machineNumber: string;
    name: string;
    status: string;
    needleGauge: number | null;
    totalNeedleSlots: number | null;
  };
  allocations: NeedleMachineAllocation[];
  totalInstalled: number;
  utilizationPercent: number | null;
  needsAttention: boolean;
}

// Low stock alert
export interface LowStockAlert {
  needleType: NeedleType;
  currentStock: number;
  minStockLevel: number;
  reorderPoint: number;
  severity: 'CRITICAL' | 'WARNING';
  shortfall: number;
}

// Dashboard stats
export interface NeedleDashboardStats {
  totalTypes: number;
  totalStock: number;
  allocated: number;
  damaged: number;
  lowStockAlerts: number;
  pendingDamages: number;
}

// Dashboard response
export interface NeedleDashboard {
  stats: NeedleDashboardStats;
  recentMovements: NeedleStockMovement[];
  recentDamages: NeedleDamage[];
}

// Form types
export interface NeedleTypeFormData {
  code?: string;
  name: string;
  needleKind: NeedleKind;
  gauge: number;
  length?: number;
  material: string;
  brand?: string;
  supplierCode?: string;
  costPerNeedle?: number;
  currency?: string;
  minStockLevel?: number;
  reorderPoint?: number;
  compatibleMachines?: string[];
  notes?: string;
  isActive?: boolean;
}

export interface StockReceiptFormData {
  needleTypeId: number;
  receivedQuantity: number;
  receivedDate?: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  unitCost?: number;
  supplierId?: number;
  supplierName?: string;
  collectedBy?: number;
  collectorName?: string;
  collectionDate?: string;
  lotNumber?: string;
  notes?: string;
}

export interface StockAdjustFormData {
  quantity: number;
  reason: string;
  notes?: string;
}

export interface InstallNeedlesFormData {
  needleTypeId: number;
  batchId?: number;
  installedQuantity: number;
  position?: string;
  notes?: string;
}

export interface RemoveNeedlesFormData {
  allocationId: number;
  removalReason: RemovalReason;
  returnToStock?: boolean;
  returnQuantity?: number;
  notes?: string;
}

export interface ReportDamageFormData {
  needleTypeId: number;
  batchId?: number;
  allocationId?: number;
  machineId?: number;
  damageDate?: string;
  damageType: DamageType;
  damagedQuantity: number;
  cause?: DamageCause;
  description?: string;
  notes?: string;
}

export interface ResolveDamageFormData {
  resolutionStatus: 'REPLACED' | 'WRITTEN_OFF';
  replacedQuantity?: number;
  replacementBatchId?: number;
  notes?: string;
}

// Lookup types (lightweight for dropdowns)
export interface NeedleTypeLookup {
  id: number;
  code: string;
  name: string;
  needleKind: NeedleKind;
  gauge: number;
  material: string;
}
