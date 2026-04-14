import { api } from './client';
import { YarnLedgerEntry, YarnLedgerSummary, PaymentStatus, YarnLedgerEntryType } from '@/lib/types/yarn';

export interface LedgerQueryParams {
  yarnTypeId?: number;
  vendorId?: number;
  entryType?: YarnLedgerEntryType;
  startDate?: string;
  endDate?: string;
  paymentStatus?: PaymentStatus;
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface LedgerByTypeResponse {
  data: {
    yarnType: {
      id: number;
      code: string;
      name: string;
    };
    currentBalance: number;
    entries: YarnLedgerEntry[];
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface LedgerSummaryResponse {
  data: {
    summary: YarnLedgerSummary[];
    totals: {
      totalStock: number;
      totalIn: number;
      totalOut: number;
      totalValue: number;
    };
  };
}

export interface OpeningBalanceData {
  yarnTypeId: number;
  entryDate: string;
  quantity: number;
  pricePerKg?: number;
  notes?: string;
}

export interface AdjustmentData {
  yarnTypeId: number;
  entryDate: string;
  quantityIn?: number;
  quantityOut?: number;
  pricePerKg?: number;
  description: string;
  notes?: string;
}

/**
 * Yarn Ledger API Service
 */
export const yarnLedgerApi = {
  /**
   * Get all ledger entries with filters and pagination
   */
  async getAll(params: LedgerQueryParams = {}): Promise<PaginatedResponse<YarnLedgerEntry>> {
    const queryParams = new URLSearchParams();

    if (params.yarnTypeId) queryParams.append('yarnTypeId', params.yarnTypeId.toString());
    if (params.vendorId) queryParams.append('vendorId', params.vendorId.toString());
    if (params.entryType) queryParams.append('entryType', params.entryType);
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);
    if (params.paymentStatus) queryParams.append('paymentStatus', params.paymentStatus);
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());

    const url = `/yarn/ledger${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await api.get<PaginatedResponse<YarnLedgerEntry>>(url);
    return response.data;
  },

  /**
   * Get ledger entries for a specific yarn type
   */
  async getByYarnType(
    yarnTypeId: number,
    params: { startDate?: string; endDate?: string; page?: number; limit?: number } = {}
  ): Promise<LedgerByTypeResponse> {
    const queryParams = new URLSearchParams();

    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());

    const url = `/yarn/ledger/by-type/${yarnTypeId}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await api.get<LedgerByTypeResponse>(url);
    return response.data;
  },

  /**
   * Get stock summary by yarn type
   */
  async getSummary(): Promise<LedgerSummaryResponse> {
    const response = await api.get<LedgerSummaryResponse>('/yarn/ledger/summary');
    return response.data;
  },

  /**
   * Get a single ledger entry by ID
   */
  async getById(id: number): Promise<YarnLedgerEntry> {
    const response = await api.get<{ data: YarnLedgerEntry }>(`/yarn/ledger/${id}`);
    return response.data.data;
  },

  /**
   * Create opening balance for a yarn type
   */
  async createOpeningBalance(data: OpeningBalanceData): Promise<YarnLedgerEntry> {
    const response = await api.post<{ message: string; data: YarnLedgerEntry }>(
      '/yarn/ledger/opening-balance',
      data
    );
    return response.data.data;
  },

  /**
   * Create manual adjustment entry
   */
  async createAdjustment(data: AdjustmentData): Promise<YarnLedgerEntry> {
    const response = await api.post<{ message: string; data: YarnLedgerEntry }>(
      '/yarn/ledger/adjustment',
      data
    );
    return response.data.data;
  },
};
