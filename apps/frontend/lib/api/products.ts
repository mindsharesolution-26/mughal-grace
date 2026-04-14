import { api } from './client';
import {
  Product,
  ProductFormData,
  ProductLookup,
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
};
