import { api } from './client';
import {
  Customer,
  CustomerLookup,
  CustomerFormData,
  CustomerListResponse,
  CustomerStats,
  CustomerLedgerResponse,
  CustomerLedgerEntryFormData,
  CustomerLedgerEntry,
  CustomerPayment,
  CustomerPaymentFormData,
  PaymentListResponse,
} from '../types/customer';

// ============ CUSTOMERS ============

export const customersApi = {
  // Get all customers with pagination
  getAll: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    isActive?: boolean;
    customerType?: string;
  }): Promise<CustomerListResponse> => {
    const response = await api.get('/sales/customers', { params });
    return response.data;
  },

  // Get customers for dropdown
  getLookup: async (): Promise<CustomerLookup[]> => {
    const response = await api.get('/sales/customers/lookup');
    return response.data;
  },

  // Get dashboard stats
  getStats: async (): Promise<CustomerStats> => {
    const response = await api.get('/sales/customers/stats');
    return response.data;
  },

  // Get customer by ID
  getById: async (id: number): Promise<Customer> => {
    const response = await api.get(`/sales/customers/${id}`);
    return response.data;
  },

  // Create customer
  create: async (data: CustomerFormData): Promise<Customer> => {
    const response = await api.post('/sales/customers', data);
    return response.data;
  },

  // Update customer
  update: async (id: number, data: Partial<CustomerFormData>): Promise<Customer> => {
    const response = await api.put(`/sales/customers/${id}`, data);
    return response.data;
  },

  // Delete customer (soft delete)
  delete: async (id: number): Promise<void> => {
    await api.delete(`/sales/customers/${id}`);
  },
};

// ============ CUSTOMER LEDGER ============

export const customerLedgerApi = {
  // Get customer ledger entries
  getEntries: async (
    customerId: number,
    params?: {
      page?: number;
      limit?: number;
      fromDate?: string;
      toDate?: string;
    }
  ): Promise<CustomerLedgerResponse> => {
    const response = await api.get(`/sales/customers/${customerId}/ledger`, { params });
    return response.data;
  },

  // Add ledger entry (opening balance, adjustment)
  addEntry: async (
    customerId: number,
    data: CustomerLedgerEntryFormData
  ): Promise<CustomerLedgerEntry> => {
    const response = await api.post(`/sales/customers/${customerId}/ledger`, data);
    return response.data;
  },
};

// ============ CUSTOMER PAYMENTS ============

export const customerPaymentsApi = {
  // Get all payments with pagination
  getAll: async (params?: {
    page?: number;
    limit?: number;
    customerId?: number;
    fromDate?: string;
    toDate?: string;
  }): Promise<PaymentListResponse> => {
    const response = await api.get('/sales/payments', { params });
    return response.data;
  },

  // Record payment
  create: async (data: CustomerPaymentFormData): Promise<CustomerPayment> => {
    const response = await api.post('/sales/payments', data);
    return response.data;
  },
};
