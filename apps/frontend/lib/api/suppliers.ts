import { api } from './client';

// Lightweight lookup type for dropdowns
export interface SupplierLookup {
  id: number;
  code: string;
  name: string;
  supplierType?: string;
}

// Full supplier type
export interface GeneralSupplier {
  id: number;
  code: string;
  name: string;
  supplierType: string | null;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  ntn: string | null;
  strn: string | null;
  creditLimit: string | null;
  paymentTerms: number;
  bankDetails: {
    bankName?: string;
    accountNumber?: string;
    accountTitle?: string;
    branchCode?: string;
    iban?: string;
  } | null;
  rating: number | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  balance?: {
    currentBalance: number;
    totalDebit: number;
    totalCredit: number;
  };
}

export interface SupplierFormData {
  code?: string; // Auto-generated if not provided
  name: string;
  supplierType?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  ntn?: string;
  strn?: string;
  creditLimit?: number;
  paymentTerms?: number;
  bankDetails?: {
    bankName?: string;
    accountNumber?: string;
    accountTitle?: string;
    branchCode?: string;
    iban?: string;
  };
  rating?: number;
  notes?: string;
  isActive?: boolean;
}

export const suppliersApi = {
  /**
   * Get lightweight lookup data for dropdowns
   */
  async getLookup(): Promise<SupplierLookup[]> {
    const response = await api.get<{ data: SupplierLookup[] }>('/payables/suppliers/lookup');
    return response.data.data;
  },

  /**
   * Get all suppliers
   */
  async getAll(): Promise<GeneralSupplier[]> {
    const response = await api.get<{ data: GeneralSupplier[] }>('/payables/suppliers');
    return response.data.data;
  },

  /**
   * Get a single supplier by ID
   */
  async getById(id: number): Promise<GeneralSupplier> {
    const response = await api.get<{ data: GeneralSupplier }>(`/payables/suppliers/${id}`);
    return response.data.data;
  },

  /**
   * Create a new supplier
   */
  async create(data: SupplierFormData): Promise<GeneralSupplier> {
    const response = await api.post<{ message: string; data: GeneralSupplier }>(
      '/payables/suppliers',
      data
    );
    return response.data.data;
  },

  /**
   * Update an existing supplier
   */
  async update(id: number, data: Partial<SupplierFormData>): Promise<GeneralSupplier> {
    const response = await api.put<{ message: string; data: GeneralSupplier }>(
      `/payables/suppliers/${id}`,
      data
    );
    return response.data.data;
  },

  /**
   * Delete (deactivate) a supplier
   */
  async delete(id: number): Promise<void> {
    await api.delete(`/payables/suppliers/${id}`);
  },
};

// Vendor Ledger API
export interface VendorLedgerEntry {
  id: number;
  vendorType: string;
  entryDate: string;
  entryType: string;
  debit: number;
  credit: number;
  balance: number;
  referenceType?: string;
  referenceId?: number;
  referenceNumber?: string;
  description?: string;
  createdAt: string;
}

export const vendorLedgerApi = {
  /**
   * Get ledger entries for a vendor
   */
  async getEntries(
    vendorType: 'YARN' | 'DYEING' | 'GENERAL',
    vendorId: number,
    options?: { page?: number; limit?: number; startDate?: string; endDate?: string }
  ): Promise<{ data: VendorLedgerEntry[]; pagination: any }> {
    const params = new URLSearchParams();
    if (options?.page) params.append('page', String(options.page));
    if (options?.limit) params.append('limit', String(options.limit));
    if (options?.startDate) params.append('startDate', options.startDate);
    if (options?.endDate) params.append('endDate', options.endDate);

    const response = await api.get<{ data: VendorLedgerEntry[]; pagination: any }>(
      `/payables/vendors/${vendorType}/${vendorId}/ledger?${params}`
    );
    return response.data;
  },

  /**
   * Get current balance for a vendor
   */
  async getBalance(
    vendorType: 'YARN' | 'DYEING' | 'GENERAL',
    vendorId: number
  ): Promise<{ currentBalance: number; totalDebit: number; totalCredit: number }> {
    const response = await api.get<{ data: any }>(
      `/payables/vendors/${vendorType}/${vendorId}/balance`
    );
    return response.data.data;
  },

  /**
   * Add a manual ledger entry
   */
  async addEntry(
    vendorType: 'YARN' | 'DYEING' | 'GENERAL',
    vendorId: number,
    data: {
      entryDate: string;
      entryType: string;
      debit?: number;
      credit?: number;
      description?: string;
      referenceNumber?: string;
    }
  ): Promise<VendorLedgerEntry> {
    const response = await api.post<{ message: string; data: VendorLedgerEntry }>(
      `/payables/vendors/${vendorType}/${vendorId}/ledger`,
      data
    );
    return response.data.data;
  },
};

// Vendor Payments API
export interface VendorPayment {
  id: number;
  vendorType: string;
  paymentDate: string;
  amount: number;
  paymentMethod: string;
  voucherNumber?: string;
  chequeNumber?: string;
  bankName?: string;
  transactionRef?: string;
  notes?: string;
  createdAt: string;
}

export const vendorPaymentsApi = {
  /**
   * Get all vendor payments
   */
  async getAll(options?: { page?: number; limit?: number; startDate?: string; endDate?: string }): Promise<{ data: VendorPayment[]; pagination: any }> {
    const params = new URLSearchParams();
    if (options?.page) params.append('page', String(options.page));
    if (options?.limit) params.append('limit', String(options.limit));
    if (options?.startDate) params.append('startDate', options.startDate);
    if (options?.endDate) params.append('endDate', options.endDate);

    const response = await api.get<{ data: VendorPayment[]; pagination: any }>(
      `/payables/payments?${params}`
    );
    return response.data;
  },

  /**
   * Create a payment
   */
  async create(data: {
    vendorType: 'YARN' | 'DYEING' | 'GENERAL';
    vendorId: number;
    paymentDate: string;
    amount: number;
    paymentMethod: 'CASH' | 'CHEQUE' | 'BANK_TRANSFER' | 'ONLINE';
    voucherNumber?: string;
    chequeNumber?: string;
    bankName?: string;
    transactionRef?: string;
    notes?: string;
  }): Promise<VendorPayment> {
    const response = await api.post<{ message: string; data: VendorPayment }>(
      '/payables/payments',
      data
    );
    return response.data.data;
  },
};
