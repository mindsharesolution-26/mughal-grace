import { api } from './client';

// ============================================
// CUSTOMER TYPES
// ============================================

export interface CustomerLookup {
  id: number;
  code: string;
  name: string;
  businessName?: string;
}

export interface Customer {
  id: number;
  code: string;
  name: string;
  businessName?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  ntn?: string;
  strn?: string;
  creditLimit: number;
  paymentTerms: number;
  bankDetails?: {
    bankName?: string;
    accountNumber?: string;
    accountTitle?: string;
    branchCode?: string;
    iban?: string;
  };
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerFormData {
  code?: string;
  name: string;
  businessName?: string;
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
  notes?: string;
  isActive?: boolean;
}

// ============================================
// LEDGER TYPES
// ============================================

export interface CustomerLedgerEntry {
  id: number;
  customerId: number;
  entryDate: string;
  entryType: 'OPENING_BALANCE' | 'SALE' | 'PAYMENT_RECEIVED' | 'RETURN' | 'ADJUSTMENT';
  debit: number;
  credit: number;
  balance: number;
  referenceType?: string;
  referenceId?: number;
  referenceNumber?: string;
  description?: string;
  createdAt: string;
}

export interface OutstandingBalance {
  entityType: string;
  entityId: number;
  openingBalance: number;
  totalDebit: number;
  totalCredit: number;
  currentBalance: number;
  creditLimit?: number;
  availableCredit?: number;
  isOverdue: boolean;
  overdueAmount: number;
  overdueDays: number;
  pendingChequeAmount: number;
  pendingChequeCount: number;
  lastTransactionAt?: string;
  customer?: Customer;
}

// ============================================
// TRANSACTION TYPES
// ============================================

export interface MaterialTransactionItem {
  id: number;
  rollId?: number;
  productId?: number;
  itemDescription: string;
  fabricType?: string;
  color?: string;
  quantity: number;
  unit: string;
  ratePerUnit: number;
  amount: number;
  notes?: string;
}

export interface MaterialTransaction {
  id: number;
  transactionNumber: string;
  customerId: number;
  customer?: Customer;
  transactionDate: string;
  transactionType: 'SALE' | 'RETURN' | 'SAMPLE' | 'ADJUSTMENT';
  referenceNumber?: string;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  deliveryAddress?: string;
  vehicleNumber?: string;
  salesOrderId?: number;
  ledgerEntryId?: number;
  notes?: string;
  items: MaterialTransactionItem[];
  createdAt: string;
}

export interface CreateTransactionData {
  customerId: number;
  transactionDate: string;
  transactionType: 'SALE' | 'RETURN' | 'SAMPLE' | 'ADJUSTMENT';
  referenceNumber?: string;
  items: {
    rollId?: number;
    productId?: number;
    itemDescription: string;
    fabricType?: string;
    color?: string;
    quantity: number;
    unit?: string;
    ratePerUnit: number;
    notes?: string;
  }[];
  discountAmount?: number;
  taxAmount?: number;
  deliveryAddress?: string;
  vehicleNumber?: string;
  salesOrderId?: number;
  notes?: string;
}

// ============================================
// PAYMENT TYPES
// ============================================

export interface CustomerPayment {
  id: number;
  customerId: number;
  customer?: Customer;
  paymentDate: string;
  amount: number;
  paymentMethod: 'CASH' | 'CHEQUE' | 'BANK_TRANSFER' | 'ONLINE';
  receiptNumber?: string;
  bankName?: string;
  chequeNumber?: string;
  transactionRef?: string;
  notes?: string;
  createdAt: string;
}

export interface CreatePaymentData {
  customerId: number;
  paymentDate: string;
  amount: number;
  paymentMethod: 'CASH' | 'CHEQUE' | 'BANK_TRANSFER' | 'ONLINE';
  receiptNumber?: string;
  bankName?: string;
  chequeNumber?: string;
  transactionRef?: string;
  notes?: string;
}

// ============================================
// SUMMARY TYPES
// ============================================

export interface ReceivablesSummary {
  totalReceivables: number;
  totalOverdue: number;
  pendingCheques: number;
  customerCount: number;
  recentPayments: CustomerPayment[];
  topDebtors: OutstandingBalance[];
}

export interface AgingData {
  customerId: number;
  customer: Customer;
  currentBalance: number;
  creditLimit: number;
  availableCredit: number;
  isOverdue: boolean;
  overdueAmount: number;
  overdueDays: number;
  pendingChequeAmount: number;
  pendingChequeCount: number;
}

// ============================================
// API FUNCTIONS
// ============================================

export const receivablesApi = {
  // Summary
  async getSummary(): Promise<ReceivablesSummary> {
    const response = await api.get<{ data: ReceivablesSummary }>('/receivables/summary');
    return response.data.data;
  },

  // Aging Report
  async getAgingReport(): Promise<AgingData[]> {
    const response = await api.get<{ data: AgingData[] }>('/receivables/aging');
    return response.data.data;
  },

  // Outstanding
  async getOutstanding(): Promise<OutstandingBalance[]> {
    const response = await api.get<{ data: OutstandingBalance[] }>('/receivables/outstanding');
    return response.data.data;
  },
};

// Customer Ledger API
export const customerLedgerApi = {
  async getEntries(
    customerId: number,
    options?: { page?: number; limit?: number; startDate?: string; endDate?: string }
  ): Promise<{ data: CustomerLedgerEntry[]; pagination: any }> {
    const params = new URLSearchParams();
    if (options?.page) params.append('page', String(options.page));
    if (options?.limit) params.append('limit', String(options.limit));
    if (options?.startDate) params.append('startDate', options.startDate);
    if (options?.endDate) params.append('endDate', options.endDate);

    const response = await api.get<{ data: CustomerLedgerEntry[]; pagination: any }>(
      `/receivables/customers/${customerId}/ledger?${params}`
    );
    return response.data;
  },

  async getBalance(customerId: number): Promise<{ currentBalance: number; totalDebit: number; totalCredit: number }> {
    const response = await api.get<{ data: any }>(`/receivables/customers/${customerId}/balance`);
    return response.data.data;
  },

  async addEntry(
    customerId: number,
    data: {
      entryDate: string;
      entryType: string;
      debit?: number;
      credit?: number;
      description?: string;
      referenceNumber?: string;
    }
  ): Promise<CustomerLedgerEntry> {
    const response = await api.post<{ message: string; data: CustomerLedgerEntry }>(
      `/receivables/customers/${customerId}/ledger`,
      data
    );
    return response.data.data;
  },

  async getStatement(
    customerId: number,
    options?: { startDate?: string; endDate?: string }
  ): Promise<{
    customer: Customer;
    entries: CustomerLedgerEntry[];
    summary: { totalDebit: number; totalCredit: number; currentBalance: number; creditLimit: number };
  }> {
    const params = new URLSearchParams();
    if (options?.startDate) params.append('startDate', options.startDate);
    if (options?.endDate) params.append('endDate', options.endDate);

    const response = await api.get<{ data: any }>(`/receivables/customers/${customerId}/statement?${params}`);
    return response.data.data;
  },
};

// Transactions API
export const transactionsApi = {
  async getAll(
    options?: { page?: number; limit?: number; startDate?: string; endDate?: string }
  ): Promise<{ data: MaterialTransaction[]; pagination: any }> {
    const params = new URLSearchParams();
    if (options?.page) params.append('page', String(options.page));
    if (options?.limit) params.append('limit', String(options.limit));
    if (options?.startDate) params.append('startDate', options.startDate);
    if (options?.endDate) params.append('endDate', options.endDate);

    const response = await api.get<{ data: MaterialTransaction[]; pagination: any }>(
      `/receivables/transactions?${params}`
    );
    return response.data;
  },

  async getById(id: number): Promise<MaterialTransaction> {
    const response = await api.get<{ data: MaterialTransaction }>(`/receivables/transactions/${id}`);
    return response.data.data;
  },

  async create(data: CreateTransactionData): Promise<MaterialTransaction> {
    const response = await api.post<{ message: string; data: MaterialTransaction }>(
      '/receivables/transactions',
      data
    );
    return response.data.data;
  },

  async getCustomerMaterials(
    customerId: number,
    options?: { page?: number; limit?: number; startDate?: string; endDate?: string }
  ): Promise<{ data: MaterialTransaction[]; pagination: any }> {
    const params = new URLSearchParams();
    if (options?.page) params.append('page', String(options.page));
    if (options?.limit) params.append('limit', String(options.limit));
    if (options?.startDate) params.append('startDate', options.startDate);
    if (options?.endDate) params.append('endDate', options.endDate);

    const response = await api.get<{ data: MaterialTransaction[]; pagination: any }>(
      `/receivables/customers/${customerId}/materials?${params}`
    );
    return response.data;
  },
};

// Customer Payments API
export const customerPaymentsApi = {
  async getAll(
    options?: { page?: number; limit?: number; startDate?: string; endDate?: string }
  ): Promise<{ data: CustomerPayment[]; pagination: any }> {
    const params = new URLSearchParams();
    if (options?.page) params.append('page', String(options.page));
    if (options?.limit) params.append('limit', String(options.limit));
    if (options?.startDate) params.append('startDate', options.startDate);
    if (options?.endDate) params.append('endDate', options.endDate);

    const response = await api.get<{ data: CustomerPayment[]; pagination: any }>(
      `/receivables/payments?${params}`
    );
    return response.data;
  },

  async create(data: CreatePaymentData): Promise<CustomerPayment> {
    const response = await api.post<{ message: string; data: CustomerPayment }>(
      '/receivables/payments',
      data
    );
    return response.data.data;
  },
};
