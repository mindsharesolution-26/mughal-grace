import { api } from './client';
import {
  Warehouse,
  WarehouseLookup,
  WarehouseFormData,
  StockCategory,
  StockCategoryLookup,
  StockCategoryTreeNode,
  StockCategoryFormData,
  StockItem,
  StockItemLookup,
  StockItemFormData,
  StockLevel,
  StockLevelSummary,
  StockTransaction,
  StockTransactionFormData,
  StockBatch,
  StockBatchFormData,
  StockBatchUpdateData,
  StockAlert,
  StockAlertSummary,
  Unit,
  StockItemType,
  TransactionStatus,
  AlertStatus,
  StockAlertType,
} from '@/lib/types/inventory';

// Pagination response type
interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ============================================
// WAREHOUSES API
// ============================================

export const warehousesApi = {
  async getLookup(): Promise<WarehouseLookup[]> {
    const response = await api.get<{ data: WarehouseLookup[] }>('/inventory/warehouses/lookup');
    return response.data.data;
  },

  async getAll(): Promise<Warehouse[]> {
    const response = await api.get<{ data: Warehouse[] }>('/inventory/warehouses');
    return response.data.data;
  },

  async getById(id: number): Promise<Warehouse> {
    const response = await api.get<{ data: Warehouse }>(`/inventory/warehouses/${id}`);
    return response.data.data;
  },

  async create(data: WarehouseFormData): Promise<Warehouse> {
    const response = await api.post<{ message: string; data: Warehouse }>(
      '/inventory/warehouses',
      data
    );
    return response.data.data;
  },

  async update(id: number, data: Partial<WarehouseFormData>): Promise<Warehouse> {
    const response = await api.put<{ message: string; data: Warehouse }>(
      `/inventory/warehouses/${id}`,
      data
    );
    return response.data.data;
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/inventory/warehouses/${id}`);
  },
};

// ============================================
// STOCK CATEGORIES API
// ============================================

export const stockCategoriesApi = {
  async getLookup(): Promise<StockCategoryLookup[]> {
    const response = await api.get<{ data: StockCategoryLookup[] }>('/inventory/categories/lookup');
    return response.data.data;
  },

  async getAll(): Promise<StockCategory[]> {
    const response = await api.get<{ data: StockCategory[] }>('/inventory/categories');
    return response.data.data;
  },

  async getTree(): Promise<StockCategoryTreeNode[]> {
    const response = await api.get<{ data: StockCategoryTreeNode[] }>('/inventory/categories/tree');
    return response.data.data;
  },

  async getById(id: number): Promise<StockCategory> {
    const response = await api.get<{ data: StockCategory }>(`/inventory/categories/${id}`);
    return response.data.data;
  },

  async create(data: StockCategoryFormData): Promise<StockCategory> {
    const response = await api.post<{ message: string; data: StockCategory }>(
      '/inventory/categories',
      data
    );
    return response.data.data;
  },

  async update(id: number, data: Partial<StockCategoryFormData>): Promise<StockCategory> {
    const response = await api.put<{ message: string; data: StockCategory }>(
      `/inventory/categories/${id}`,
      data
    );
    return response.data.data;
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/inventory/categories/${id}`);
  },
};

// ============================================
// STOCK ITEMS API
// ============================================

export interface StockItemsQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: number;
  itemType?: StockItemType;
  isActive?: boolean;
}

export const stockItemsApi = {
  async getLookup(): Promise<StockItemLookup[]> {
    const response = await api.get<{ data: StockItemLookup[] }>('/inventory/items/lookup');
    return response.data.data;
  },

  async getAll(params?: StockItemsQueryParams): Promise<PaginatedResponse<StockItem>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.set('page', params.page.toString());
    if (params?.limit) queryParams.set('limit', params.limit.toString());
    if (params?.search) queryParams.set('search', params.search);
    if (params?.categoryId) queryParams.set('categoryId', params.categoryId.toString());
    if (params?.itemType) queryParams.set('itemType', params.itemType);
    if (params?.isActive !== undefined) queryParams.set('isActive', params.isActive.toString());

    const query = queryParams.toString();
    const response = await api.get<PaginatedResponse<StockItem>>(
      `/inventory/items${query ? `?${query}` : ''}`
    );
    return response.data;
  },

  async getById(id: number): Promise<StockItem> {
    const response = await api.get<{ data: StockItem }>(`/inventory/items/${id}`);
    return response.data.data;
  },

  async create(data: StockItemFormData): Promise<StockItem> {
    const response = await api.post<{ message: string; data: StockItem }>(
      '/inventory/items',
      data
    );
    return response.data.data;
  },

  async update(id: number, data: Partial<StockItemFormData>): Promise<StockItem> {
    const response = await api.put<{ message: string; data: StockItem }>(
      `/inventory/items/${id}`,
      data
    );
    return response.data.data;
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/inventory/items/${id}`);
  },
};

// ============================================
// STOCK LEVELS API
// ============================================

export interface StockLevelsQueryParams {
  warehouseId?: number;
  itemId?: number;
  lowStock?: boolean;
}

export const stockLevelsApi = {
  async getAll(params?: StockLevelsQueryParams): Promise<StockLevel[]> {
    const queryParams = new URLSearchParams();
    if (params?.warehouseId) queryParams.set('warehouseId', params.warehouseId.toString());
    if (params?.itemId) queryParams.set('itemId', params.itemId.toString());
    if (params?.lowStock) queryParams.set('lowStock', 'true');

    const query = queryParams.toString();
    const response = await api.get<{ data: StockLevel[] }>(
      `/inventory/stock-levels${query ? `?${query}` : ''}`
    );
    return response.data.data;
  },

  async getSummary(): Promise<StockLevelSummary[]> {
    const response = await api.get<{ data: StockLevelSummary[] }>('/inventory/stock-levels/summary');
    return response.data.data;
  },
};

// ============================================
// STOCK TRANSACTIONS API
// ============================================

export interface StockTransactionsQueryParams {
  page?: number;
  limit?: number;
  itemId?: number;
  warehouseId?: number;
  transactionType?: string;
  startDate?: string;
  endDate?: string;
  status?: TransactionStatus;
}

export const stockTransactionsApi = {
  async getAll(params?: StockTransactionsQueryParams): Promise<PaginatedResponse<StockTransaction>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.set('page', params.page.toString());
    if (params?.limit) queryParams.set('limit', params.limit.toString());
    if (params?.itemId) queryParams.set('itemId', params.itemId.toString());
    if (params?.warehouseId) queryParams.set('warehouseId', params.warehouseId.toString());
    if (params?.transactionType) queryParams.set('transactionType', params.transactionType);
    if (params?.startDate) queryParams.set('startDate', params.startDate);
    if (params?.endDate) queryParams.set('endDate', params.endDate);
    if (params?.status) queryParams.set('status', params.status);

    const query = queryParams.toString();
    const response = await api.get<PaginatedResponse<StockTransaction>>(
      `/inventory/transactions${query ? `?${query}` : ''}`
    );
    return response.data;
  },

  async getById(id: number): Promise<StockTransaction> {
    const response = await api.get<{ data: StockTransaction }>(`/inventory/transactions/${id}`);
    return response.data.data;
  },

  async create(data: StockTransactionFormData): Promise<StockTransaction> {
    const response = await api.post<{ message: string; data: StockTransaction }>(
      '/inventory/transactions',
      data
    );
    return response.data.data;
  },

  async reverse(id: number, notes?: string): Promise<StockTransaction> {
    const response = await api.post<{ message: string; data: StockTransaction }>(
      `/inventory/transactions/${id}/reverse`,
      { notes }
    );
    return response.data.data;
  },
};

// ============================================
// STOCK BATCHES API
// ============================================

export interface StockBatchesQueryParams {
  itemId?: number;
  status?: string;
  expiringSoon?: boolean;
}

export const stockBatchesApi = {
  async getAll(params?: StockBatchesQueryParams): Promise<StockBatch[]> {
    const queryParams = new URLSearchParams();
    if (params?.itemId) queryParams.set('itemId', params.itemId.toString());
    if (params?.status) queryParams.set('status', params.status);
    if (params?.expiringSoon) queryParams.set('expiringSoon', 'true');

    const query = queryParams.toString();
    const response = await api.get<{ data: StockBatch[] }>(
      `/inventory/batches${query ? `?${query}` : ''}`
    );
    return response.data.data;
  },

  async getById(id: number): Promise<StockBatch> {
    const response = await api.get<{ data: StockBatch }>(`/inventory/batches/${id}`);
    return response.data.data;
  },

  async create(data: StockBatchFormData): Promise<StockBatch> {
    const response = await api.post<{ message: string; data: StockBatch }>(
      '/inventory/batches',
      data
    );
    return response.data.data;
  },

  async update(id: number, data: StockBatchUpdateData): Promise<StockBatch> {
    const response = await api.put<{ message: string; data: StockBatch }>(
      `/inventory/batches/${id}`,
      data
    );
    return response.data.data;
  },
};

// ============================================
// STOCK ALERTS API
// ============================================

export interface StockAlertsQueryParams {
  status?: AlertStatus;
  alertType?: StockAlertType;
  itemId?: number;
}

export const stockAlertsApi = {
  async getAll(params?: StockAlertsQueryParams): Promise<StockAlert[]> {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.set('status', params.status);
    if (params?.alertType) queryParams.set('alertType', params.alertType);
    if (params?.itemId) queryParams.set('itemId', params.itemId.toString());

    const query = queryParams.toString();
    const response = await api.get<{ data: StockAlert[] }>(
      `/inventory/alerts${query ? `?${query}` : ''}`
    );
    return response.data.data;
  },

  async getSummary(): Promise<StockAlertSummary[]> {
    const response = await api.get<{ data: StockAlertSummary[] }>('/inventory/alerts/summary');
    return response.data.data;
  },

  async acknowledge(id: number): Promise<StockAlert> {
    const response = await api.put<{ message: string; data: StockAlert }>(
      `/inventory/alerts/${id}/acknowledge`
    );
    return response.data.data;
  },

  async resolve(id: number): Promise<StockAlert> {
    const response = await api.put<{ message: string; data: StockAlert }>(
      `/inventory/alerts/${id}/resolve`
    );
    return response.data.data;
  },

  async ignore(id: number): Promise<StockAlert> {
    const response = await api.put<{ message: string; data: StockAlert }>(
      `/inventory/alerts/${id}/ignore`
    );
    return response.data.data;
  },
};

// ============================================
// UNITS API (for inventory)
// ============================================

export const unitsApi = {
  async getLookup(): Promise<Unit[]> {
    const response = await api.get<{ data: Unit[] }>('/inventory/units/lookup');
    return response.data.data;
  },
};

// ============================================
// COMBINED INVENTORY API EXPORT
// ============================================

export const inventoryApi = {
  warehouses: warehousesApi,
  categories: stockCategoriesApi,
  items: stockItemsApi,
  stockLevels: stockLevelsApi,
  transactions: stockTransactionsApi,
  batches: stockBatchesApi,
  alerts: stockAlertsApi,
  units: unitsApi,
};
