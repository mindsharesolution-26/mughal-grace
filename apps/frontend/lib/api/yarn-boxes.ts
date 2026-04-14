import { api } from './client';
import { YarnBox, YarnBoxFormData, YarnLedgerEntry, BoxStatus } from '@/lib/types/yarn';

export interface BoxQueryParams {
  vendorId?: number;
  yarnTypeId?: number;
  status?: BoxStatus;
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

export interface CreateBoxResponse {
  box: YarnBox;
  ledgerEntry: YarnLedgerEntry;
}

/**
 * Yarn Boxes API Service
 */
export const yarnBoxesApi = {
  /**
   * Get all yarn boxes with filters and pagination
   */
  async getAll(params: BoxQueryParams = {}): Promise<PaginatedResponse<YarnBox>> {
    const queryParams = new URLSearchParams();

    if (params.vendorId) queryParams.append('vendorId', params.vendorId.toString());
    if (params.yarnTypeId) queryParams.append('yarnTypeId', params.yarnTypeId.toString());
    if (params.status) queryParams.append('status', params.status);
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());

    const url = `/yarn/boxes${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await api.get<PaginatedResponse<YarnBox>>(url);
    return response.data;
  },

  /**
   * Get a single yarn box by ID
   */
  async getById(id: number): Promise<YarnBox> {
    const response = await api.get<{ data: YarnBox }>(`/yarn/boxes/${id}`);
    return response.data.data;
  },

  /**
   * Create a new yarn box (inward) - also creates ledger entry
   */
  async create(data: YarnBoxFormData): Promise<CreateBoxResponse> {
    const response = await api.post<{ message: string; data: CreateBoxResponse }>(
      '/yarn/boxes',
      data
    );
    return response.data.data;
  },
};
