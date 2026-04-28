import { api } from './client';
import {
  DyeingVendor,
  DyeingVendorWithStats,
  DyeingVendorLookup,
  DyeingVendorFormData,
  DyeingOrder,
  DyeingOrderWithItems,
  DyeingOrderCreateData,
  DyeingOrderReceiveItem,
  DyeingOrderListResponse,
  DyeingStats,
  AvailableRoll,
  AvailableRollsSummary,
  DyeingStatus,
  ScannedRoll,
  DyeingOrderPrintData,
  DyedFabricStockItem,
  DyedFabricStockListResponse,
  DyedFabricStockStats,
  DyedFabricStockSummary,
  BulkMoveResponse,
} from '../types/dyeing';

// ============ VENDORS ============

export const dyeingVendorsApi = {
  // Get all vendors with stats
  getAll: async (params?: { search?: string; isActive?: boolean }): Promise<DyeingVendorWithStats[]> => {
    const response = await api.get('/dyeing/vendors', { params });
    return response.data;
  },

  // Get vendors for dropdown
  getLookup: async (): Promise<DyeingVendorLookup[]> => {
    const response = await api.get('/dyeing/vendors/lookup');
    return response.data;
  },

  // Get vendor by ID
  getById: async (id: number): Promise<DyeingVendor> => {
    const response = await api.get(`/dyeing/vendors/${id}`);
    return response.data;
  },

  // Create vendor
  create: async (data: DyeingVendorFormData): Promise<DyeingVendor> => {
    const response = await api.post('/dyeing/vendors', data);
    return response.data;
  },

  // Update vendor
  update: async (id: number, data: Partial<DyeingVendorFormData>): Promise<DyeingVendor> => {
    const response = await api.put(`/dyeing/vendors/${id}`, data);
    return response.data;
  },
};

// ============ ORDERS ============

export const dyeingOrdersApi = {
  // Get orders with pagination
  getAll: async (params?: {
    page?: number;
    limit?: number;
    status?: DyeingStatus;
    vendorId?: number;
    search?: string;
    fromDate?: string;
    toDate?: string;
  }): Promise<DyeingOrderListResponse> => {
    const response = await api.get('/dyeing/orders', { params });
    return response.data;
  },

  // Get dashboard stats
  getStats: async (): Promise<DyeingStats> => {
    const response = await api.get('/dyeing/orders/stats');
    return response.data;
  },

  // Get order by ID
  getById: async (id: number): Promise<DyeingOrderWithItems> => {
    const response = await api.get(`/dyeing/orders/${id}`);
    return response.data;
  },

  // Create order (send rolls for dyeing)
  create: async (data: DyeingOrderCreateData): Promise<DyeingOrderWithItems> => {
    const response = await api.post('/dyeing/orders', data);
    return response.data;
  },

  // Receive rolls from dyeing
  receive: async (id: number, items: DyeingOrderReceiveItem[]): Promise<DyeingOrderWithItems> => {
    const response = await api.post(`/dyeing/orders/${id}/receive`, { items });
    return response.data;
  },

  // Update order status
  updateStatus: async (id: number, status: DyeingStatus, notes?: string): Promise<DyeingOrder> => {
    const response = await api.put(`/dyeing/orders/${id}/status`, { status, notes });
    return response.data;
  },

  // Get print data for challan generation
  getPrintData: async (id: number): Promise<DyeingOrderPrintData> => {
    const response = await api.get(`/dyeing/orders/${id}/print-data`);
    return response.data;
  },
};

// ============ ROLLS ============

export const dyeingRollsApi = {
  // Get available rolls for dyeing
  getAvailable: async (params?: {
    search?: string;
    fabricType?: string;
    fabricId?: number;
    limit?: number;
  }): Promise<AvailableRoll[]> => {
    const response = await api.get('/dyeing/rolls/available', { params });
    return response.data;
  },

  // Get summary of available rolls
  getAvailableSummary: async (): Promise<AvailableRollsSummary[]> => {
    const response = await api.get('/dyeing/rolls/available/summary');
    return response.data;
  },

  // Lookup roll by QR code
  lookupByQR: async (qrCode: string): Promise<ScannedRoll> => {
    const response = await api.get(`/dyeing/rolls/by-qr/${encodeURIComponent(qrCode)}`);
    return response.data;
  },
};

// ============ DYED FABRIC STOCK ============

export const dyedFabricStockApi = {
  // Get dyed fabric stock stats for dashboard
  getStats: async (): Promise<DyedFabricStockStats> => {
    const response = await api.get('/dyeing/stock/stats');
    return response.data;
  },

  // Get dyed fabric stock list with pagination
  getAll: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    colorId?: number;
    fabricType?: string;
    fromDate?: string;
    toDate?: string;
  }): Promise<DyedFabricStockListResponse> => {
    const response = await api.get('/dyeing/stock', { params });
    return response.data;
  },

  // Get summary by fabric type
  getSummary: async (): Promise<DyedFabricStockSummary[]> => {
    const response = await api.get('/dyeing/stock/summary');
    return response.data;
  },

  // Move a single roll to finished stock
  moveToFinished: async (rollId: number): Promise<DyedFabricStockItem> => {
    const response = await api.put(`/dyeing/stock/${rollId}/move-to-finished`);
    return response.data;
  },

  // Bulk move rolls to finished stock
  bulkMoveToFinished: async (rollIds: number[]): Promise<BulkMoveResponse> => {
    const response = await api.put('/dyeing/stock/bulk-move-to-finished', { rollIds });
    return response.data;
  },
};
