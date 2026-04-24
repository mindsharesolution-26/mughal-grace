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

export interface MachineLookup {
  id: number;
  machineNumber: string;
  name: string;
  gauge: number | null;
  diameter: number | null;
}

export interface FabricLookup {
  id: number;
  code: string;
  name: string;
  gsm?: string | null;
  width?: string | null;
  widthUnit?: string | null;
  isTube?: boolean;
  machine?: { id: number; machineNumber: string; name: string } | null;
  fabricType?: { id: number; code: string; name: string } | null;
  grade?: { id: number; code: string; name: string } | null;
  color?: { id: number; code: string; name: string } | null;
}

export type ProductApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type ProductType = 'FABRIC' | 'GOODS';

export interface Product {
  id: number;
  name: string;
  type: ProductType;
  articleNumber: string | null;
  qrCode: string;
  departmentId: number | null;
  groupId: number | null;
  materialId: number | null;
  brandId: number | null;
  colorId: number | null;
  fabricSizeId: number | null;
  // Fabric Master Data Reference
  fabricId: number | null;
  // Fabric/Production fields
  machineId: number | null;
  gradeId: number | null;
  fabricTypeId: number | null;
  fabricCompositionId: number | null;
  gsm: string | null;
  width: string | null;
  widthUnit: string | null;
  isTube: boolean;
  // Other fields
  description: string | null;
  unitPrice: string | null;
  currency: string;
  currentStock: string;
  images: string[];
  isActive: boolean;
  // Approval workflow
  approvalStatus: ProductApprovalStatus;
  approvedBy: number | null;
  approvedAt: string | null;
  rejectionReason: string | null;
  createdBy: number | null;
  createdAt: string;
  updatedAt: string;
  // Expanded relations
  department?: EntityLookup | null;
  group?: EntityLookup | null;
  material?: EntityLookup | null;
  brand?: EntityLookup | null;
  color?: EntityLookup | null;
  fabricSize?: FabricSizeLookup | null;
  fabric?: FabricLookup | null;
  machine?: MachineLookup | null;
  grade?: EntityLookup | null;
  fabricType?: EntityLookup | null;
  fabricComposition?: EntityLookup | null;
}

export interface ProductFormData {
  name: string;
  type?: ProductType;
  articleNumber?: string;
  departmentId?: number;
  groupId?: number;
  materialId?: number;
  brandId?: number;
  colorId?: number;
  fabricSizeId?: number;
  // Fabric Master Data Reference
  fabricId?: number;
  // Fabric/Production fields
  machineId?: number;
  gradeId?: number;
  fabricTypeId?: number;
  fabricCompositionId?: number;
  gsm?: number;
  width?: number;
  widthUnit?: 'inch' | 'cm';
  isTube?: boolean;
  // Other fields
  description?: string;
  unitPrice?: number;
  images?: string[];
  isActive?: boolean;
}

export interface ProductLookup {
  id: number;
  name: string;
  articleNumber: string | null;
  qrCode: string | null;
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
  reference: 'Stock In' | 'Stock Out' | 'Production' | 'Adjustment' | 'Sale';
  referenceNumber: string | null;
  qtyIn: number | null;
  qtyOut: number | null;
  balance: number;
  notes: string | null;
}
