import { api } from './client';
import { FabricLookup } from '@/lib/types/product';

// Lightweight fabric data for production dropdown
export interface FabricProductionLookup {
  id: number;
  code: string;
  name: string;
  qrPayload: string | null;
  machineId: number | null;
  machine?: { id: number; machineNumber: string; name: string } | null;
  fabricType?: { id: number; name: string } | null;
  gsm: string | null;
  width: string | null;
  widthUnit: string | null;
}

// Stock movement types
export interface FabricStockMovement {
  id: number;
  fabricId: number;
  type: 'IN' | 'OUT';
  quantity: string;
  referenceNumber: string | null;
  sourceType: string | null;
  destinationType: string | null;
  notes: string | null;
  createdBy: number | null;
  createdAt: string;
}

export interface FabricStockMovementInput {
  fabricId: number;
  type: 'IN' | 'OUT';
  quantity: number;
  referenceNumber?: string;
  sourceType?: string;
  destinationType?: string;
  notes?: string;
}

export interface FabricLedgerEntry {
  id: number;
  date: string;
  reference: 'Stock In' | 'Stock Out' | 'Production' | 'Adjustment';
  referenceNumber: string | null;
  qtyIn: number | null;
  qtyOut: number | null;
  balance: number;
  notes: string | null;
}

export interface FabricLedgerLookup {
  id: number;
  code: string;
  name: string;
  qrPayload: string | null;
  currentStock: string;
  department?: { id: number; name: string } | null;
  group?: { id: number; name: string } | null;
}

export interface Fabric {
  id: number;
  code: string;
  qrPayload: string | null;
  name: string;
  departmentId: number;
  groupId: number;
  materialId: number | null;
  brandId: number | null;
  colorId: number | null;
  machineId: number | null;
  fabricTypeId: number | null;
  fabricCompositionId: number | null;
  gradeId: number | null;
  gsm: string | null;
  width: string | null;
  widthUnit: string | null;
  isTube: boolean;
  currentStock: string;
  description: string | null;
  notes: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  // Relations
  department?: { id: number; code: string; name: string };
  group?: { id: number; code: string; name: string };
  material?: { id: number; code: string; name: string } | null;
  brand?: { id: number; code: string; name: string } | null;
  color?: { id: number; code: string; name: string; hexCode: string | null } | null;
  machine?: { id: number; machineNumber: string; name: string; gauge: number | null; diameter: number | null } | null;
  fabricType?: { id: number; code: string; name: string } | null;
  fabricComposition?: { id: number; code: string; name: string } | null;
  grade?: { id: number; code: string; name: string } | null;
}

export const fabricsApi = {
  /**
   * Get all fabrics
   */
  async getAll(): Promise<Fabric[]> {
    const response = await api.get<{ data: Fabric[] }>('/fabrics');
    return response.data.data;
  },

  /**
   * Get lightweight lookup data for dropdowns
   */
  async getLookup(): Promise<FabricLookup[]> {
    const response = await api.get<{ data: Fabric[] }>('/fabrics');
    // Map to lookup format
    return response.data.data
      .filter((f) => f.isActive)
      .map((f) => ({
        id: f.id,
        code: f.code,
        name: f.name,
      }));
  },

  /**
   * Get a single fabric by ID
   */
  async getById(id: number): Promise<Fabric> {
    const response = await api.get<{ data: Fabric }>(`/fabrics/${id}`);
    return response.data.data;
  },

  /**
   * Create a new fabric
   */
  async create(data: Partial<Fabric>): Promise<Fabric> {
    const response = await api.post<{ message: string; data: Fabric }>(
      '/fabrics',
      data
    );
    return response.data.data;
  },

  /**
   * Update an existing fabric
   */
  async update(id: number, data: Partial<Fabric>): Promise<Fabric> {
    const response = await api.put<{ message: string; data: Fabric }>(
      `/fabrics/${id}`,
      data
    );
    return response.data.data;
  },

  /**
   * Delete a fabric
   */
  async delete(id: number): Promise<void> {
    await api.delete(`/fabrics/${id}`);
  },

  /**
   * Get fabrics for daily production (only active with assigned machines)
   */
  async getProductionLookup(): Promise<FabricProductionLookup[]> {
    const response = await api.get<{ data: FabricProductionLookup[] }>('/fabrics/production-lookup');
    return response.data.data;
  },

  /**
   * Record a stock movement (in or out)
   */
  async recordStockMovement(
    data: FabricStockMovementInput
  ): Promise<{ movement: FabricStockMovement; fabric: Fabric }> {
    const response = await api.post<{
      message: string;
      data: { movement: FabricStockMovement; fabric: Fabric };
    }>('/fabrics/stock-movement', data);
    return response.data.data;
  },

  /**
   * Get stock movement history for a fabric
   */
  async getStockHistory(fabricId: number): Promise<FabricStockMovement[]> {
    const response = await api.get<{ data: FabricStockMovement[] }>(
      `/fabrics/${fabricId}/stock-history`
    );
    return response.data.data;
  },

  /**
   * Get fabric ledger with running balance
   */
  async getLedger(
    fabricId: number,
    params?: { startDate?: string; endDate?: string; page?: number; limit?: number }
  ): Promise<{
    fabric: FabricLedgerLookup;
    entries: FabricLedgerEntry[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const response = await api.get<{ data: any }>(`/fabrics/${fabricId}/ledger`, { params });
    return response.data.data;
  },
};
