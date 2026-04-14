import { api } from './client';
import { VendorLookup } from './yarn-vendors';
import { YarnTypeLookup } from './yarn-types';

export type PayOrderStatus =
  | 'DRAFT'
  | 'PENDING_FINANCE'
  | 'PENDING_ADMIN'
  | 'APPROVED'
  | 'PARTIALLY_RECEIVED'
  | 'COMPLETED'
  | 'REJECTED'
  | 'CANCELLED';

export interface PayOrderItem {
  id: number;
  payOrderId: number;
  yarnTypeId: number;
  orderedQuantity: string;
  receivedQuantity: string;
  unit: string;
  pricePerUnit: string | null;
  amount: string | null;
  notes: string | null;
  yarnType: YarnTypeLookup;
}

export interface PayOrder {
  id: number;
  orderNumber: string;
  vendorId: number;
  orderDate: string;
  expectedDeliveryDate: string | null;
  totalQuantity: string;
  totalAmount: string | null;
  status: PayOrderStatus;
  terms: string | null;
  notes: string | null;
  createdBy: number | null;
  approvedByFinance: number | null;
  financeApprovedAt: string | null;
  approvedByAdmin: number | null;
  adminApprovedAt: string | null;
  rejectedBy: number | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
  vendor: VendorLookup;
  items: PayOrderItem[];
}

export interface PayOrderItemInput {
  yarnTypeId: number;
  orderedQuantity: number;
  unit?: string;
  pricePerUnit?: number;
  notes?: string;
}

export interface CreatePayOrderData {
  vendorId: number;
  orderDate: string;
  expectedDeliveryDate?: string;
  items: PayOrderItemInput[];
  terms?: string;
  notes?: string;
  status?: 'DRAFT' | 'PENDING_FINANCE';
}

export interface UpdatePayOrderData {
  expectedDeliveryDate?: string;
  terms?: string;
  notes?: string;
  status?: PayOrderStatus;
  rejectionReason?: string;
}

export const payOrdersApi = {
  /**
   * Get all pay orders
   */
  async getAll(): Promise<PayOrder[]> {
    const response = await api.get<{ data: PayOrder[] }>('/yarn/pay-orders');
    return response.data.data;
  },

  /**
   * Get a single pay order by ID
   */
  async getById(id: number): Promise<PayOrder> {
    const response = await api.get<{ data: PayOrder }>(`/yarn/pay-orders/${id}`);
    return response.data.data;
  },

  /**
   * Create a new pay order
   */
  async create(data: CreatePayOrderData): Promise<PayOrder> {
    const response = await api.post<{ message: string; data: PayOrder }>(
      '/yarn/pay-orders',
      data
    );
    return response.data.data;
  },

  /**
   * Update a pay order (status changes, notes, etc.)
   */
  async update(id: number, data: UpdatePayOrderData): Promise<PayOrder> {
    const response = await api.put<{ message: string; data: PayOrder }>(
      `/yarn/pay-orders/${id}`,
      data
    );
    return response.data.data;
  },

  /**
   * Cancel a pay order
   */
  async cancel(id: number): Promise<void> {
    await api.delete(`/yarn/pay-orders/${id}`);
  },

  /**
   * Approve pay order (finance approval)
   */
  async approveFinance(id: number): Promise<PayOrder> {
    return this.update(id, { status: 'PENDING_ADMIN' });
  },

  /**
   * Approve pay order (admin/final approval)
   */
  async approveAdmin(id: number): Promise<PayOrder> {
    return this.update(id, { status: 'APPROVED' });
  },

  /**
   * Reject a pay order
   */
  async reject(id: number, reason: string): Promise<PayOrder> {
    return this.update(id, { status: 'REJECTED', rejectionReason: reason });
  },
};
