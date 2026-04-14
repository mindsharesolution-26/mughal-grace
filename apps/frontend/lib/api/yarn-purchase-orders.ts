import { api } from './client';
import { PurchaseOrder, PurchaseOrderFormData, PurchaseOrderStatus } from '@/lib/types/yarn';

interface ApiPurchaseOrder {
  id: number;
  orderNumber: string;
  vendorId: number;
  orderDate: string;
  expectedDeliveryDate: string | null;
  status: PurchaseOrderStatus;
  totalQuantity: string;
  totalAmount: string | null;
  approvedBy: number | null;
  approvedAt: string | null;
  sentAt: string | null;
  terms: string | null;
  notes: string | null;
  createdBy: number | null;
  createdAt: string;
  updatedAt: string;
  vendor?: {
    id: number;
    code: string;
    name: string;
  };
  items?: Array<{
    id: number;
    purchaseOrderId: number;
    yarnTypeId: number;
    orderedQuantity: string;
    receivedQuantity: string;
    pricePerKg: string | null;
    amount: string | null;
    notes: string | null;
    createdAt: string;
    yarnType?: {
      id: number;
      code: string;
      name: string;
      brandName: string;
      color: string;
    };
  }>;
}

function transformPurchaseOrder(data: ApiPurchaseOrder): PurchaseOrder {
  return {
    id: data.id,
    orderNumber: data.orderNumber,
    vendorId: data.vendorId,
    orderDate: data.orderDate,
    expectedDeliveryDate: data.expectedDeliveryDate,
    status: data.status,
    totalQuantity: Number(data.totalQuantity),
    totalAmount: data.totalAmount ? Number(data.totalAmount) : null,
    approvedBy: data.approvedBy,
    approvedAt: data.approvedAt,
    sentAt: data.sentAt,
    terms: data.terms,
    notes: data.notes,
    createdBy: data.createdBy,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    vendor: data.vendor,
    items: data.items?.map(item => ({
      id: item.id,
      purchaseOrderId: item.purchaseOrderId,
      yarnTypeId: item.yarnTypeId,
      orderedQuantity: Number(item.orderedQuantity),
      receivedQuantity: Number(item.receivedQuantity),
      pricePerKg: item.pricePerKg ? Number(item.pricePerKg) : null,
      amount: item.amount ? Number(item.amount) : null,
      notes: item.notes,
      createdAt: item.createdAt,
      yarnType: item.yarnType,
    })),
  };
}

export const purchaseOrdersApi = {
  async getAll(params?: { status?: PurchaseOrderStatus; vendorId?: number }): Promise<PurchaseOrder[]> {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.vendorId) queryParams.append('vendorId', String(params.vendorId));

    const url = `/yarn/pay-orders${queryParams.toString() ? `?${queryParams}` : ''}`;
    const response = await api.get<{ data: ApiPurchaseOrder[] }>(url);
    return response.data.data.map(transformPurchaseOrder);
  },

  async getById(id: number): Promise<PurchaseOrder> {
    const response = await api.get<{ data: ApiPurchaseOrder }>(`/yarn/pay-orders/${id}`);
    return transformPurchaseOrder(response.data.data);
  },

  async create(data: PurchaseOrderFormData): Promise<PurchaseOrder> {
    const response = await api.post<{ message: string; data: ApiPurchaseOrder }>(
      '/yarn/pay-orders',
      {
        vendorId: data.vendorId,
        orderDate: data.orderDate,
        expectedDeliveryDate: data.expectedDeliveryDate,
        terms: data.terms,
        notes: data.notes,
        items: data.items,
      }
    );
    return transformPurchaseOrder(response.data.data);
  },

  async update(id: number, data: Partial<PurchaseOrderFormData>): Promise<PurchaseOrder> {
    const response = await api.put<{ message: string; data: ApiPurchaseOrder }>(
      `/yarn/pay-orders/${id}`,
      data
    );
    return transformPurchaseOrder(response.data.data);
  },

  async approve(id: number): Promise<PurchaseOrder> {
    const response = await api.post<{ message: string; data: ApiPurchaseOrder }>(
      `/yarn/pay-orders/${id}/approve`
    );
    return transformPurchaseOrder(response.data.data);
  },

  async send(id: number): Promise<PurchaseOrder> {
    const response = await api.post<{ message: string; data: ApiPurchaseOrder }>(
      `/yarn/pay-orders/${id}/send`
    );
    return transformPurchaseOrder(response.data.data);
  },

  async cancel(id: number, reason?: string): Promise<PurchaseOrder> {
    const response = await api.post<{ message: string; data: ApiPurchaseOrder }>(
      `/yarn/pay-orders/${id}/cancel`,
      { reason }
    );
    return transformPurchaseOrder(response.data.data);
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/yarn/pay-orders/${id}`);
  },
};
