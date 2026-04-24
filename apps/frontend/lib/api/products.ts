import { api } from './client';
import {
  Product,
  ProductFormData,
  ProductLookup,
  ProductType,
  StockMovement,
  StockMovementInput,
  LedgerEntry,
} from '@/lib/types/product';

export const productsApi = {
  /**
   * Get lightweight lookup data for dropdowns
   */
  async getLookup(): Promise<ProductLookup[]> {
    const response = await api.get<{ data: ProductLookup[] }>('/products/lookup');
    return response.data.data;
  },

  /**
   * Get all products
   */
  async getAll(): Promise<Product[]> {
    const response = await api.get<{ data: Product[] }>('/products');
    return response.data.data;
  },

  /**
   * Get a single product by ID
   */
  async getById(id: number): Promise<Product> {
    const response = await api.get<{ data: Product }>(`/products/${id}`);
    return response.data.data;
  },

  /**
   * Create a new product
   */
  async create(data: ProductFormData): Promise<Product> {
    const response = await api.post<{ message: string; data: Product }>(
      '/products',
      data
    );
    return response.data.data;
  },

  /**
   * Update an existing product
   */
  async update(id: number, data: Partial<ProductFormData>): Promise<Product> {
    const response = await api.put<{ message: string; data: Product }>(
      `/products/${id}`,
      data
    );
    return response.data.data;
  },

  /**
   * Delete (deactivate) a product
   */
  async delete(id: number): Promise<void> {
    await api.delete(`/products/${id}`);
  },

  /**
   * Record a stock movement (in or out)
   */
  async recordStockMovement(
    data: StockMovementInput
  ): Promise<{ movement: StockMovement; product: Product }> {
    const response = await api.post<{
      message: string;
      data: { movement: StockMovement; product: Product };
    }>('/products/stock-movement', data);
    return response.data.data;
  },

  /**
   * Get stock movement history for a product
   */
  async getStockHistory(productId: number): Promise<StockMovement[]> {
    const response = await api.get<{ data: StockMovement[] }>(
      `/products/${productId}/stock-history`
    );
    return response.data.data;
  },

  /**
   * Search product by QR code
   */
  async searchByQR(qrCode: string): Promise<ProductLookup & { qrCode: string; department?: { id: number; name: string }; group?: { id: number; name: string } }> {
    const response = await api.get<{ data: any }>(`/products/search-by-qr/${encodeURIComponent(qrCode)}`);
    return response.data.data;
  },

  /**
   * Get product ledger with running balance
   */
  async getLedger(
    productId: number,
    params?: { startDate?: string; endDate?: string; page?: number; limit?: number }
  ): Promise<{
    product: ProductLookup & { qrCode: string; department?: { id: number; name: string }; group?: { id: number; name: string } };
    entries: LedgerEntry[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const response = await api.get<{ data: any }>(`/products/${productId}/ledger`, { params });
    return response.data.data;
  },

  /**
   * Get production logs (stock movements from production)
   */
  async getProductionLogs(params?: {
    date?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }): Promise<{
    logs: Array<{
      id: number;
      rollNumber: string | null;
      weight: number;
      machine: string | null;
      product: { id: number; name: string; articleNumber: string | null; qrCode: string };
      createdAt: string;
    }>;
    summary: {
      totalWeight: number;
      totalRolls: number;
      byProduct: Array<{
        id: number;
        name: string;
        articleNumber: string | null;
        weight: number;
        rolls: number;
      }>;
    };
  }> {
    const response = await api.get<{ data: any }>('/products/production-logs', { params });
    return response.data.data;
  },

  /**
   * Get products pending approval (admin only)
   */
  async getPendingApproval(): Promise<Product[]> {
    const response = await api.get<{ data: Product[] }>('/products/pending-approval');
    return response.data.data;
  },

  /**
   * Approve a pending product (admin only)
   */
  async approve(id: number): Promise<Product> {
    const response = await api.post<{ message: string; data: Product }>(
      `/products/${id}/approve`
    );
    return response.data.data;
  },

  /**
   * Reject a pending product (admin only)
   */
  async reject(id: number, rejectionReason?: string): Promise<Product> {
    const response = await api.post<{ message: string; data: Product }>(
      `/products/${id}/reject`,
      { rejectionReason }
    );
    return response.data.data;
  },

  /**
   * Get all products (with optional status and type filter)
   */
  async getAllWithStatus(params?: { status?: string; showAll?: boolean; type?: ProductType }): Promise<Product[]> {
    const response = await api.get<{ data: Product[] }>('/products', { params });
    return response.data.data;
  },

  /**
   * Get products by type (FABRIC or GOODS)
   */
  async getByType(type: ProductType): Promise<Product[]> {
    const response = await api.get<{ data: Product[] }>('/products', { params: { type } });
    return response.data.data;
  },
};
