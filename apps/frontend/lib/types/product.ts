// Lookup type for related entities
export interface EntityLookup {
  id: number;
  code: string;
  name: string;
}

export interface FabricSizeLookup {
  id: number;
  code: string;
  displayName: string;
}

export interface Product {
  id: number;
  name: string;
  articleNumber: string | null;
  qrCode: string;
  departmentId: number | null;
  groupId: number | null;
  materialId: number | null;
  brandId: number | null;
  colorId: number | null;
  fabricSizeId: number | null;
  description: string | null;
  unitPrice: string | null;
  currency: string;
  currentStock: string;
  images: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  // Expanded relations
  department?: EntityLookup | null;
  group?: EntityLookup | null;
  material?: EntityLookup | null;
  brand?: EntityLookup | null;
  color?: EntityLookup | null;
  fabricSize?: FabricSizeLookup | null;
}

export interface ProductFormData {
  name: string;
  articleNumber?: string;
  departmentId?: number;
  groupId?: number;
  materialId?: number;
  brandId?: number;
  colorId?: number;
  fabricSizeId?: number;
  description?: string;
  unitPrice?: number;
  images?: string[];
  isActive?: boolean;
}

export interface ProductLookup {
  id: number;
  name: string;
  articleNumber: string | null;
  currentStock: string;
}

export interface StockMovement {
  id: number;
  productId: number;
  type: 'IN' | 'OUT';
  quantity: string;
  referenceNumber: string | null;
  sourceType: string | null;
  destinationType: string | null;
  notes: string | null;
  createdBy: number | null;
  createdAt: string;
}

export interface StockMovementInput {
  productId: number;
  type: 'IN' | 'OUT';
  quantity: number;
  referenceNumber?: string;
  sourceType?: string;
  destinationType?: string;
  notes?: string;
}

export interface LedgerEntry {
  id: number;
  date: string;
  reference: 'Stock In' | 'Stock Out' | 'Production' | 'Adjustment';
  referenceNumber: string | null;
  qtyIn: number | null;
  qtyOut: number | null;
  balance: number;
  notes: string | null;
}
