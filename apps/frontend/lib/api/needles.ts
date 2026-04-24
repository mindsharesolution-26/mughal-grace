import { api } from './client';
import {
  NeedleType,
  NeedleTypeWithStock,
  NeedleTypeLookup,
  NeedleTypeFormData,
  NeedleStockBatch,
  NeedleStockMovement,
  NeedleStockSummary,
  StockReceiptFormData,
  StockAdjustFormData,
  NeedleMachineAllocation,
  InstallNeedlesFormData,
  RemoveNeedlesFormData,
  NeedleDamage,
  ReportDamageFormData,
  ResolveDamageFormData,
  MachineNeedleStatus,
  LowStockAlert,
  NeedleDashboard,
} from '@/lib/types/needle';

// ============================================
// NEEDLE TYPES API
// ============================================

export const needleTypesApi = {
  /**
   * Get all needle types with stock info
   */
  async getAll(params?: {
    gauge?: number;
    needleKind?: string;
    isActive?: boolean;
  }): Promise<NeedleType[]> {
    const response = await api.get<{ data: NeedleType[] }>('/needles/types', { params });
    return response.data.data;
  },

  /**
   * Get needle types lookup for dropdowns
   */
  async getLookup(): Promise<NeedleTypeLookup[]> {
    const response = await api.get<{ data: NeedleTypeLookup[] }>('/needles/types/lookup');
    return response.data.data;
  },

  /**
   * Get single needle type with full details
   */
  async getById(id: number): Promise<NeedleTypeWithStock> {
    const response = await api.get<{ data: NeedleTypeWithStock }>(`/needles/types/${id}`);
    return response.data.data;
  },

  /**
   * Create a new needle type
   */
  async create(data: NeedleTypeFormData): Promise<NeedleType> {
    const response = await api.post<{ message: string; data: NeedleType }>(
      '/needles/types',
      data
    );
    return response.data.data;
  },

  /**
   * Update needle type
   */
  async update(id: number, data: Partial<NeedleTypeFormData>): Promise<NeedleType> {
    const response = await api.put<{ message: string; data: NeedleType }>(
      `/needles/types/${id}`,
      data
    );
    return response.data.data;
  },

  /**
   * Deactivate needle type
   */
  async delete(id: number): Promise<void> {
    await api.delete(`/needles/types/${id}`);
  },

  /**
   * Upload image for needle type
   */
  async uploadImage(id: number, file: File): Promise<{ imageUrl: string; needleType: NeedleType }> {
    const formData = new FormData();
    formData.append('image', file);
    const response = await api.post<{ message: string; data: { imageUrl: string; needleType: NeedleType } }>(
      `/needles/types/${id}/upload-image`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data.data;
  },

  /**
   * Delete image for needle type
   */
  async deleteImage(id: number): Promise<NeedleType> {
    const response = await api.delete<{ message: string; data: NeedleType }>(
      `/needles/types/${id}/image`
    );
    return response.data.data;
  },

  /**
   * Lookup needle type by barcode (for scanning)
   */
  async getByBarcode(barcode: string): Promise<NeedleType & { currentStock: number }> {
    const response = await api.get<{ data: NeedleType & { currentStock: number } }>(
      `/needles/types/barcode/${barcode}`
    );
    return response.data.data;
  },

  /**
   * Regenerate barcode for needle type
   */
  async regenerateBarcode(id: number): Promise<NeedleType> {
    const response = await api.post<{ message: string; data: NeedleType }>(
      `/needles/types/${id}/regenerate-barcode`
    );
    return response.data.data;
  },
};

// ============================================
// NEEDLE STOCK API
// ============================================

export const needleStockApi = {
  /**
   * Get stock summary by needle type
   */
  async getSummary(): Promise<NeedleStockSummary[]> {
    const response = await api.get<{ data: NeedleStockSummary[] }>('/needles/stock/summary');
    return response.data.data;
  },

  /**
   * Get all stock batches
   */
  async getAll(params?: {
    needleTypeId?: number;
    hasStock?: boolean;
  }): Promise<NeedleStockBatch[]> {
    const response = await api.get<{ data: NeedleStockBatch[] }>('/needles/stock', { params });
    return response.data.data;
  },

  /**
   * Get single batch details
   */
  async getById(id: number): Promise<NeedleStockBatch> {
    const response = await api.get<{ data: NeedleStockBatch }>(`/needles/stock/${id}`);
    return response.data.data;
  },

  /**
   * Receive new stock batch
   */
  async receive(data: StockReceiptFormData): Promise<NeedleStockBatch> {
    const response = await api.post<{ message: string; data: NeedleStockBatch }>(
      '/needles/stock',
      data
    );
    return response.data.data;
  },

  /**
   * Adjust stock quantity
   */
  async adjust(batchId: number, data: StockAdjustFormData): Promise<NeedleStockBatch> {
    const response = await api.post<{ message: string; data: NeedleStockBatch }>(
      `/needles/stock/${batchId}/adjust`,
      data
    );
    return response.data.data;
  },

  /**
   * Get movement history for a batch
   */
  async getMovements(batchId: number): Promise<NeedleStockMovement[]> {
    const response = await api.get<{ data: NeedleStockMovement[] }>(
      `/needles/stock/${batchId}/movements`
    );
    return response.data.data;
  },
};

// ============================================
// MACHINE ALLOCATIONS API
// ============================================

export const needleAllocationsApi = {
  /**
   * Get all allocations
   */
  async getAll(params?: {
    machineId?: number;
    status?: 'INSTALLED' | 'REMOVED';
    needleTypeId?: number;
  }): Promise<NeedleMachineAllocation[]> {
    const response = await api.get<{ data: NeedleMachineAllocation[] }>(
      '/needles/allocations',
      { params }
    );
    return response.data.data;
  },

  /**
   * Get needles for a specific machine
   */
  async getMachineNeedles(machineId: number): Promise<{
    machine: any;
    allocations: NeedleMachineAllocation[];
    recentDamages: NeedleDamage[];
    summary: {
      totalInstalled: number;
      totalSlots: number;
      utilizationPercent: number | null;
    };
  }> {
    const response = await api.get<{ data: any }>(`/needles/machines/${machineId}/needles`);
    return response.data.data;
  },

  /**
   * Install needles on machine
   */
  async install(machineId: number, data: InstallNeedlesFormData): Promise<NeedleMachineAllocation> {
    const response = await api.post<{ message: string; data: NeedleMachineAllocation }>(
      `/needles/machines/${machineId}/install`,
      data
    );
    return response.data.data;
  },

  /**
   * Remove needles from machine
   */
  async remove(machineId: number, data: RemoveNeedlesFormData): Promise<NeedleMachineAllocation> {
    const response = await api.post<{ message: string; data: NeedleMachineAllocation }>(
      `/needles/machines/${machineId}/remove`,
      data
    );
    return response.data.data;
  },

  /**
   * Get allocation history
   */
  async getHistory(allocationId: number): Promise<NeedleMachineAllocation> {
    const response = await api.get<{ data: NeedleMachineAllocation }>(
      `/needles/allocations/${allocationId}/history`
    );
    return response.data.data;
  },
};

// ============================================
// DAMAGE TRACKING API
// ============================================

export const needleDamageApi = {
  /**
   * Get all damage records
   */
  async getAll(params?: {
    needleTypeId?: number;
    machineId?: number;
    damageType?: string;
    resolutionStatus?: string;
  }): Promise<NeedleDamage[]> {
    const response = await api.get<{ data: NeedleDamage[] }>('/needles/damages', { params });
    return response.data.data;
  },

  /**
   * Get damage summary
   */
  async getSummary(params?: {
    startDate?: string;
    endDate?: string;
  }): Promise<{
    total: { count: number; quantity: number };
    byType: any[];
    byCause: any[];
    byStatus: any[];
  }> {
    const response = await api.get<{ data: any }>('/needles/damages/summary', { params });
    return response.data.data;
  },

  /**
   * Get single damage record
   */
  async getById(id: number): Promise<NeedleDamage> {
    const response = await api.get<{ data: NeedleDamage }>(`/needles/damages/${id}`);
    return response.data.data;
  },

  /**
   * Report damage
   */
  async report(data: ReportDamageFormData): Promise<NeedleDamage> {
    const response = await api.post<{ message: string; data: NeedleDamage }>(
      '/needles/damages',
      data
    );
    return response.data.data;
  },

  /**
   * Update damage record
   */
  async update(id: number, data: Partial<ReportDamageFormData>): Promise<NeedleDamage> {
    const response = await api.put<{ message: string; data: NeedleDamage }>(
      `/needles/damages/${id}`,
      data
    );
    return response.data.data;
  },

  /**
   * Resolve damage (replace or write off)
   */
  async resolve(id: number, data: ResolveDamageFormData): Promise<NeedleDamage> {
    const response = await api.post<{ message: string; data: NeedleDamage }>(
      `/needles/damages/${id}/resolve`,
      data
    );
    return response.data.data;
  },
};

// ============================================
// REPORTS API
// ============================================

export const needleReportsApi = {
  /**
   * Get low stock alerts
   */
  async getLowStock(): Promise<LowStockAlert[]> {
    const response = await api.get<{ data: LowStockAlert[] }>('/needles/reports/low-stock');
    return response.data.data;
  },

  /**
   * Get machine needle status
   */
  async getMachineStatus(): Promise<MachineNeedleStatus[]> {
    const response = await api.get<{ data: MachineNeedleStatus[] }>(
      '/needles/reports/machine-status'
    );
    return response.data.data;
  },

  /**
   * Get dashboard data
   */
  async getDashboard(): Promise<NeedleDashboard> {
    const response = await api.get<{ data: NeedleDashboard }>('/needles/dashboard');
    return response.data.data;
  },
};

// Combined export for convenience
export const needlesApi = {
  types: needleTypesApi,
  stock: needleStockApi,
  allocations: needleAllocationsApi,
  damages: needleDamageApi,
  reports: needleReportsApi,
};
