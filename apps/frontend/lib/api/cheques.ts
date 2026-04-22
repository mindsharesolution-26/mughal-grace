import { api } from './client';

// ============================================
// CHEQUE TYPES
// ============================================

export type ChequeType = 'ISSUED' | 'RECEIVED';
export type ChequeStatus = 'PENDING' | 'DEPOSITED' | 'CLEARED' | 'BOUNCED' | 'CANCELLED' | 'REPLACED';

export interface ChequeStatusHistory {
  id: number;
  chequeId: number;
  fromStatus: ChequeStatus | null;
  toStatus: ChequeStatus;
  changedBy?: number;
  reason?: string;
  changedAt: string;
}

export interface Cheque {
  id: number;
  chequeNumber: string;
  chequeType: ChequeType;
  // Entity references
  customerId?: number;
  customer?: { id: number; code: string; name: string };
  yarnVendorId?: number;
  yarnVendor?: { id: number; code: string; name: string };
  dyeingVendorId?: number;
  dyeingVendor?: { id: number; code: string; name: string };
  generalSupplierId?: number;
  generalSupplier?: { id: number; code: string; name: string };
  // Bank details
  bankName: string;
  branchName?: string;
  accountNumber?: string;
  // Amount and dates
  amount: number;
  chequeDate: string;
  receivedDate?: string;
  depositDate?: string;
  clearanceDate?: string;
  bouncedDate?: string;
  // Status
  status: ChequeStatus;
  bounceReason?: string;
  bounceCharges?: number;
  bounceCount: number;
  // Links
  originalChequeId?: number;
  replacedByChequeId?: number;
  replacedBy?: Cheque;
  replaces?: Cheque;
  customerPaymentId?: number;
  vendorPaymentId?: number;
  notes?: string;
  // History
  statusHistory?: ChequeStatusHistory[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateChequeData {
  chequeNumber: string;
  chequeType: ChequeType;
  // Entity reference
  customerId?: number;
  vendorType?: 'YARN' | 'DYEING' | 'GENERAL';
  vendorId?: number;
  // Bank details
  bankName: string;
  branchName?: string;
  accountNumber?: string;
  // Amount and dates
  amount: number;
  chequeDate: string;
  receivedDate?: string;
  // Links
  customerPaymentId?: number;
  vendorPaymentId?: number;
  notes?: string;
}

export interface ChequeSummary {
  byStatus: Array<{
    status: ChequeStatus;
    _count: number;
    _sum: { amount: number };
  }>;
  byType: Array<{
    chequeType: ChequeType;
    _count: number;
    _sum: { amount: number };
  }>;
  pendingClearance: {
    count: number;
    amount: number;
  };
  bouncedCount: number;
  recentBounced: Cheque[];
}

// ============================================
// API FUNCTIONS
// ============================================

export const chequesApi = {
  // List cheques with filters
  async getAll(options?: {
    page?: number;
    limit?: number;
    type?: ChequeType;
    status?: ChequeStatus;
    startDate?: string;
    endDate?: string;
  }): Promise<{ data: Cheque[]; pagination: any }> {
    const params = new URLSearchParams();
    if (options?.page) params.append('page', String(options.page));
    if (options?.limit) params.append('limit', String(options.limit));
    if (options?.type) params.append('type', options.type);
    if (options?.status) params.append('status', options.status);
    if (options?.startDate) params.append('startDate', options.startDate);
    if (options?.endDate) params.append('endDate', options.endDate);

    const response = await api.get<{ data: Cheque[]; pagination: any }>(`/cheques?${params}`);
    return response.data;
  },

  // Get single cheque with full details
  async getById(id: number): Promise<Cheque> {
    const response = await api.get<{ data: Cheque }>(`/cheques/${id}`);
    return response.data.data;
  },

  // Create new cheque
  async create(data: CreateChequeData): Promise<Cheque> {
    const response = await api.post<{ message: string; data: Cheque }>('/cheques', data);
    return response.data.data;
  },

  // Mark as deposited
  async deposit(id: number, data?: { depositDate?: string; notes?: string }): Promise<Cheque> {
    const response = await api.post<{ message: string; data: Cheque }>(`/cheques/${id}/deposit`, data || {});
    return response.data.data;
  },

  // Mark as cleared
  async clear(id: number, data?: { clearanceDate?: string; notes?: string }): Promise<Cheque> {
    const response = await api.post<{ message: string; data: Cheque }>(`/cheques/${id}/clear`, data || {});
    return response.data.data;
  },

  // Mark as bounced
  async bounce(
    id: number,
    data: { bouncedDate?: string; bounceReason?: string; bounceCharges?: number; notes?: string }
  ): Promise<Cheque> {
    const response = await api.post<{ message: string; data: Cheque }>(`/cheques/${id}/bounce`, data);
    return response.data.data;
  },

  // Create replacement cheque
  async replace(
    id: number,
    data: Omit<CreateChequeData, 'chequeType' | 'customerId' | 'vendorType' | 'vendorId'>
  ): Promise<Cheque> {
    const response = await api.post<{ message: string; data: Cheque }>(`/cheques/${id}/replace`, data);
    return response.data.data;
  },

  // Cancel cheque
  async cancel(id: number, reason?: string): Promise<Cheque> {
    const response = await api.post<{ message: string; data: Cheque }>(`/cheques/${id}/cancel`, { reason });
    return response.data.data;
  },

  // Get pending clearance
  async getPendingClearance(): Promise<Cheque[]> {
    const response = await api.get<{ data: Cheque[] }>('/cheques/pending-clearance');
    return response.data.data;
  },

  // Get post-dated cheques
  async getPostDated(): Promise<Cheque[]> {
    const response = await api.get<{ data: Cheque[] }>('/cheques/post-dated');
    return response.data.data;
  },

  // Get maturing cheques
  async getMaturing(days?: number): Promise<Cheque[]> {
    const params = days ? `?days=${days}` : '';
    const response = await api.get<{ data: Cheque[] }>(`/cheques/maturing${params}`);
    return response.data.data;
  },

  // Get summary stats
  async getSummary(): Promise<ChequeSummary> {
    const response = await api.get<{ data: ChequeSummary }>('/cheques/summary');
    return response.data.data;
  },
};

// Helper function to get entity name from cheque
export function getChequeEntityName(cheque: Cheque): string {
  if (cheque.customer) return cheque.customer.name;
  if (cheque.yarnVendor) return cheque.yarnVendor.name;
  if (cheque.dyeingVendor) return cheque.dyeingVendor.name;
  if (cheque.generalSupplier) return cheque.generalSupplier.name;
  return 'Unknown';
}

// Helper function to get status color
export function getChequeStatusColor(status: ChequeStatus): string {
  const colors: Record<ChequeStatus, string> = {
    PENDING: 'warning',
    DEPOSITED: 'info',
    CLEARED: 'success',
    BOUNCED: 'error',
    CANCELLED: 'neutral',
    REPLACED: 'neutral',
  };
  return colors[status] || 'neutral';
}
