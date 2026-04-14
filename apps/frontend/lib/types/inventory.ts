// ============================================
// ENUMS
// ============================================

export type LocationType =
  | 'WAREHOUSE'
  | 'ZONE'
  | 'RACK'
  | 'BIN'
  | 'PRODUCTION'
  | 'QUALITY'
  | 'QUARANTINE';

export type StockItemType =
  | 'GENERAL'
  | 'RAW_MATERIAL'
  | 'FINISHED_GOODS'
  | 'CONSUMABLE'
  | 'SPARE_PART'
  | 'PACKAGING';

export type ValuationMethod =
  | 'FIFO'
  | 'LIFO'
  | 'WEIGHTED_AVERAGE'
  | 'STANDARD_COST';

export type BatchStatus =
  | 'ACTIVE'
  | 'QUARANTINE'
  | 'EXPIRED'
  | 'DEPLETED';

export type StockTransactionType =
  // Inward
  | 'RECEIPT'
  | 'PURCHASE'
  | 'RETURN_IN'
  | 'TRANSFER_IN'
  | 'PRODUCTION_OUT'
  | 'ADJUSTMENT_IN'
  | 'OPENING_STOCK'
  // Outward
  | 'ISSUE'
  | 'SALE'
  | 'RETURN_OUT'
  | 'TRANSFER_OUT'
  | 'PRODUCTION_IN'
  | 'ADJUSTMENT_OUT'
  | 'SCRAP'
  | 'SAMPLE';

export type TransactionStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'COMPLETED'
  | 'REVERSED'
  | 'CANCELLED';

export type StockAlertType =
  | 'LOW_STOCK'
  | 'OUT_OF_STOCK'
  | 'REORDER_POINT'
  | 'OVERSTOCK'
  | 'EXPIRY_WARNING';

export type AlertStatus =
  | 'ACTIVE'
  | 'ACKNOWLEDGED'
  | 'RESOLVED'
  | 'IGNORED';

// ============================================
// UNIT
// ============================================

export interface Unit {
  id: number;
  code: string;
  name: string;
  category?: string;
}

// ============================================
// WAREHOUSE
// ============================================

export interface Warehouse {
  id: number;
  code: string;
  name: string;
  description: string | null;
  address: string | null;
  city: string | null;
  parentId: number | null;
  locationType: LocationType;
  isDefault: boolean;
  allowNegative: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  parent?: WarehouseLookup | null;
  children?: WarehouseLookup[];
  _count?: {
    stockLevels: number;
    children?: number;
  };
}

export interface WarehouseLookup {
  id: number;
  code: string;
  name: string;
  locationType?: LocationType;
  parentId?: number | null;
}

export interface WarehouseFormData {
  code: string;
  name: string;
  description?: string;
  address?: string;
  city?: string;
  parentId?: number;
  locationType?: LocationType;
  isDefault?: boolean;
  allowNegative?: boolean;
  isActive?: boolean;
}

// ============================================
// STOCK CATEGORY
// ============================================

export interface StockCategory {
  id: number;
  code: string;
  name: string;
  description: string | null;
  parentId: number | null;
  defaultUnitId: number | null;
  trackBatches: boolean;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  parent?: StockCategoryLookup | null;
  children?: StockCategoryLookup[];
  items?: StockItemLookup[];
  _count?: {
    items: number;
    children?: number;
  };
}

export interface StockCategoryLookup {
  id: number;
  code: string;
  name: string;
  parentId?: number | null;
  trackBatches?: boolean;
}

export interface StockCategoryTreeNode extends StockCategoryLookup {
  children: StockCategoryTreeNode[];
  _count?: { items: number };
}

export interface StockCategoryFormData {
  code: string;
  name: string;
  description?: string;
  parentId?: number;
  defaultUnitId?: number;
  trackBatches?: boolean;
  sortOrder?: number;
  isActive?: boolean;
}

// ============================================
// STOCK ITEM
// ============================================

export interface StockItem {
  id: number;
  code: string;
  name: string;
  description: string | null;
  itemType: StockItemType;
  categoryId: number | null;
  primaryUnitId: number;
  secondaryUnitId: number | null;
  conversionFactor: string | null;
  trackBatches: boolean;
  trackSerials: boolean;
  trackExpiry: boolean;
  minStockLevel: string | null;
  reorderPoint: string | null;
  reorderQuantity: string | null;
  maxStockLevel: string | null;
  valuationMethod: ValuationMethod;
  standardCost: string | null;
  lastPurchaseCost: string | null;
  averageCost: string | null;
  currency: string;
  attributes: Record<string, any> | null;
  images: string[];
  moduleCode: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  category?: StockCategoryLookup | null;
  primaryUnit: Unit;
  secondaryUnit?: Unit | null;
  stockLevels?: StockLevel[];
  batches?: StockBatch[];
  alerts?: StockAlert[];
  _count?: {
    stockLevels: number;
    batches: number;
  };
}

export interface StockItemLookup {
  id: number;
  code: string;
  name: string;
  itemType?: StockItemType;
  primaryUnitId?: number;
  trackBatches?: boolean;
  primaryUnit?: Unit;
}

export interface StockItemFormData {
  code: string;
  name: string;
  description?: string;
  itemType?: StockItemType;
  categoryId?: number;
  primaryUnitId: number;
  secondaryUnitId?: number;
  conversionFactor?: number;
  trackBatches?: boolean;
  trackSerials?: boolean;
  trackExpiry?: boolean;
  minStockLevel?: number;
  reorderPoint?: number;
  reorderQuantity?: number;
  maxStockLevel?: number;
  valuationMethod?: ValuationMethod;
  standardCost?: number;
  currency?: string;
  attributes?: Record<string, any>;
  images?: string[];
  moduleCode?: string;
  isActive?: boolean;
}

// ============================================
// STOCK LEVEL
// ============================================

export interface StockLevel {
  id: number;
  itemId: number;
  warehouseId: number;
  quantityOnHand: string;
  quantityReserved: string;
  quantityAvailable: string;
  quantityOnOrder: string;
  totalValue: string;
  averageCost: string | null;
  lastMovementAt: string | null;
  updatedAt: string;
  item?: StockItemLookup & {
    minStockLevel?: string | null;
    reorderPoint?: string | null;
    primaryUnit?: Unit;
  };
  warehouse?: WarehouseLookup;
}

export interface StockLevelSummary {
  warehouse: WarehouseLookup;
  itemCount: number;
  totalOnHand: string;
  totalReserved: string;
  totalAvailable: string;
  totalValue: string;
}

// ============================================
// STOCK TRANSACTION
// ============================================

export interface StockTransaction {
  id: number;
  transactionNumber: string;
  transactionDate: string;
  transactionType: StockTransactionType;
  itemId: number;
  batchId: number | null;
  sourceWarehouseId: number | null;
  destWarehouseId: number | null;
  quantity: string;
  unitId: number;
  unitCost: string | null;
  totalCost: string | null;
  referenceType: string | null;
  referenceId: number | null;
  referenceNumber: string | null;
  reason: string | null;
  notes: string | null;
  createdBy: number | null;
  createdByName: string | null;
  approvedBy: number | null;
  approvedAt: string | null;
  status: TransactionStatus;
  isReversed: boolean;
  reversalId: number | null;
  createdAt: string;
  item?: StockItemLookup;
  batch?: StockBatchLookup | null;
  sourceWarehouse?: WarehouseLookup | null;
  destWarehouse?: WarehouseLookup | null;
  unit?: Unit;
}

export interface StockTransactionFormData {
  transactionDate: string;
  transactionType: StockTransactionType;
  itemId: number;
  batchId?: number;
  sourceWarehouseId?: number;
  destWarehouseId?: number;
  quantity: number;
  unitId: number;
  unitCost?: number;
  referenceType?: string;
  referenceId?: number;
  referenceNumber?: string;
  reason?: string;
  notes?: string;
}

// ============================================
// STOCK BATCH
// ============================================

export interface StockBatch {
  id: number;
  batchNumber: string;
  itemId: number;
  manufacturingDate: string | null;
  expiryDate: string | null;
  lotNumber: string | null;
  initialQuantity: string;
  currentQuantity: string;
  unitCost: string | null;
  totalCost: string | null;
  supplierId: number | null;
  purchaseOrderRef: string | null;
  attributes: Record<string, any> | null;
  notes: string | null;
  status: BatchStatus;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  item?: StockItemLookup;
  transactions?: Pick<StockTransaction, 'id' | 'transactionNumber' | 'transactionType' | 'quantity' | 'transactionDate'>[];
}

export interface StockBatchLookup {
  id: number;
  batchNumber: string;
  lotNumber?: string | null;
  expiryDate?: string | null;
}

export interface StockBatchFormData {
  batchNumber: string;
  itemId: number;
  manufacturingDate?: string;
  expiryDate?: string;
  lotNumber?: string;
  initialQuantity: number;
  unitCost?: number;
  supplierId?: number;
  purchaseOrderRef?: string;
  attributes?: Record<string, any>;
  notes?: string;
}

export interface StockBatchUpdateData {
  manufacturingDate?: string;
  expiryDate?: string;
  lotNumber?: string;
  unitCost?: number;
  supplierId?: number;
  purchaseOrderRef?: string;
  attributes?: Record<string, any>;
  notes?: string;
  status?: BatchStatus;
}

// ============================================
// STOCK ALERT
// ============================================

export interface StockAlert {
  id: number;
  itemId: number;
  warehouseId: number | null;
  alertType: StockAlertType;
  currentLevel: string;
  thresholdLevel: string;
  status: AlertStatus;
  acknowledgedBy: number | null;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
  createdAt: string;
  item?: StockItemLookup & {
    minStockLevel?: string | null;
    reorderPoint?: string | null;
    primaryUnit?: Unit;
  };
}

export interface StockAlertSummary {
  alertType: StockAlertType;
  status: AlertStatus;
  _count: { id: number };
}

// ============================================
// CONSTANTS & HELPERS
// ============================================

export const locationTypeOptions: { value: LocationType; label: string }[] = [
  { value: 'WAREHOUSE', label: 'Warehouse' },
  { value: 'ZONE', label: 'Zone' },
  { value: 'RACK', label: 'Rack' },
  { value: 'BIN', label: 'Bin' },
  { value: 'PRODUCTION', label: 'Production Floor' },
  { value: 'QUALITY', label: 'Quality Hold' },
  { value: 'QUARANTINE', label: 'Quarantine' },
];

export const stockItemTypeOptions: { value: StockItemType; label: string }[] = [
  { value: 'GENERAL', label: 'General' },
  { value: 'RAW_MATERIAL', label: 'Raw Material' },
  { value: 'FINISHED_GOODS', label: 'Finished Goods' },
  { value: 'CONSUMABLE', label: 'Consumable' },
  { value: 'SPARE_PART', label: 'Spare Part' },
  { value: 'PACKAGING', label: 'Packaging' },
];

export const valuationMethodOptions: { value: ValuationMethod; label: string; description: string }[] = [
  { value: 'FIFO', label: 'FIFO', description: 'First In, First Out' },
  { value: 'LIFO', label: 'LIFO', description: 'Last In, First Out' },
  { value: 'WEIGHTED_AVERAGE', label: 'Weighted Average', description: 'Average cost calculation' },
  { value: 'STANDARD_COST', label: 'Standard Cost', description: 'Fixed standard cost' },
];

export const transactionTypeOptions: { value: StockTransactionType; label: string; direction: 'IN' | 'OUT' }[] = [
  // Inward
  { value: 'RECEIPT', label: 'Receipt', direction: 'IN' },
  { value: 'PURCHASE', label: 'Purchase Receipt', direction: 'IN' },
  { value: 'RETURN_IN', label: 'Customer Return', direction: 'IN' },
  { value: 'TRANSFER_IN', label: 'Transfer In', direction: 'IN' },
  { value: 'PRODUCTION_OUT', label: 'Production Output', direction: 'IN' },
  { value: 'ADJUSTMENT_IN', label: 'Adjustment (Increase)', direction: 'IN' },
  { value: 'OPENING_STOCK', label: 'Opening Stock', direction: 'IN' },
  // Outward
  { value: 'ISSUE', label: 'Issue', direction: 'OUT' },
  { value: 'SALE', label: 'Sale/Delivery', direction: 'OUT' },
  { value: 'RETURN_OUT', label: 'Return to Vendor', direction: 'OUT' },
  { value: 'TRANSFER_OUT', label: 'Transfer Out', direction: 'OUT' },
  { value: 'PRODUCTION_IN', label: 'Production Consumption', direction: 'OUT' },
  { value: 'ADJUSTMENT_OUT', label: 'Adjustment (Decrease)', direction: 'OUT' },
  { value: 'SCRAP', label: 'Scrap/Write-off', direction: 'OUT' },
  { value: 'SAMPLE', label: 'Sample Issue', direction: 'OUT' },
];

export const transactionStatusOptions: { value: TransactionStatus; label: string; color: string }[] = [
  { value: 'PENDING', label: 'Pending', color: 'yellow' },
  { value: 'APPROVED', label: 'Approved', color: 'blue' },
  { value: 'COMPLETED', label: 'Completed', color: 'green' },
  { value: 'REVERSED', label: 'Reversed', color: 'orange' },
  { value: 'CANCELLED', label: 'Cancelled', color: 'gray' },
];

export const batchStatusOptions: { value: BatchStatus; label: string; color: string }[] = [
  { value: 'ACTIVE', label: 'Active', color: 'green' },
  { value: 'QUARANTINE', label: 'Quarantine', color: 'yellow' },
  { value: 'EXPIRED', label: 'Expired', color: 'red' },
  { value: 'DEPLETED', label: 'Depleted', color: 'gray' },
];

export const alertTypeOptions: { value: StockAlertType; label: string; color: string; icon: string }[] = [
  { value: 'OUT_OF_STOCK', label: 'Out of Stock', color: 'red', icon: 'XCircle' },
  { value: 'LOW_STOCK', label: 'Low Stock', color: 'orange', icon: 'AlertTriangle' },
  { value: 'REORDER_POINT', label: 'Reorder Point', color: 'yellow', icon: 'ShoppingCart' },
  { value: 'OVERSTOCK', label: 'Overstock', color: 'blue', icon: 'Package' },
  { value: 'EXPIRY_WARNING', label: 'Expiry Warning', color: 'purple', icon: 'Clock' },
];

export const alertStatusOptions: { value: AlertStatus; label: string; color: string }[] = [
  { value: 'ACTIVE', label: 'Active', color: 'red' },
  { value: 'ACKNOWLEDGED', label: 'Acknowledged', color: 'yellow' },
  { value: 'RESOLVED', label: 'Resolved', color: 'green' },
  { value: 'IGNORED', label: 'Ignored', color: 'gray' },
];

// Helper functions
export const isInwardTransaction = (type: StockTransactionType): boolean => {
  return ['RECEIPT', 'PURCHASE', 'RETURN_IN', 'TRANSFER_IN', 'PRODUCTION_OUT', 'ADJUSTMENT_IN', 'OPENING_STOCK'].includes(type);
};

export const getTransactionDirection = (type: StockTransactionType): 'IN' | 'OUT' => {
  return isInwardTransaction(type) ? 'IN' : 'OUT';
};

export const formatQuantity = (value: string | number | null | undefined, decimals: number = 2): string => {
  if (value === null || value === undefined) return '0';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return num.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
};

export const formatCurrency = (value: string | number | null | undefined, currency: string = 'PKR'): string => {
  if (value === null || value === undefined) return `${currency} 0.00`;
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return `${currency} ${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};
