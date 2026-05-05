import { api } from './client';
import {
  DyeingInvoiceListResponse,
  DyeingInvoiceWithRelations,
  DyeingInvoiceStats,
  DyeingInvoiceStatus,
  DyeingPaymentStatus,
  UpdatePricingData,
  RecordPaymentData,
  DyeingInvoicePrintData,
} from '../types/dyeing-invoice';

export const dyeingInvoicesApi = {
  // Get invoice stats for dashboard
  getStats: async (): Promise<DyeingInvoiceStats> => {
    const response = await api.get('/dyeing-invoices/stats');
    return response.data;
  },

  // Get all invoices with filtering and pagination
  getAll: async (params?: {
    page?: number;
    limit?: number;
    status?: DyeingInvoiceStatus;
    paymentStatus?: DyeingPaymentStatus;
    vendorId?: number;
    search?: string;
    fromDate?: string;
    toDate?: string;
  }): Promise<DyeingInvoiceListResponse> => {
    const response = await api.get('/dyeing-invoices', { params });
    return response.data;
  },

  // Get single invoice by ID
  getById: async (id: number): Promise<DyeingInvoiceWithRelations> => {
    const response = await api.get(`/dyeing-invoices/${id}`);
    return response.data;
  },

  // Update pricing (finance action)
  updatePricing: async (id: number, data: UpdatePricingData): Promise<DyeingInvoiceWithRelations> => {
    const response = await api.put(`/dyeing-invoices/${id}/pricing`, data);
    return response.data;
  },

  // Approve invoice
  approve: async (id: number): Promise<DyeingInvoiceWithRelations> => {
    const response = await api.put(`/dyeing-invoices/${id}/approve`);
    return response.data;
  },

  // Record payment
  recordPayment: async (id: number, data: RecordPaymentData): Promise<DyeingInvoiceWithRelations> => {
    const response = await api.post(`/dyeing-invoices/${id}/payment`, data);
    return response.data;
  },

  // Cancel invoice
  cancel: async (id: number, reason?: string): Promise<DyeingInvoiceWithRelations> => {
    const response = await api.put(`/dyeing-invoices/${id}/cancel`, { reason });
    return response.data;
  },

  // Get print data
  getPrintData: async (id: number): Promise<DyeingInvoicePrintData> => {
    const response = await api.get(`/dyeing-invoices/${id}/print`);
    return response.data;
  },
};
