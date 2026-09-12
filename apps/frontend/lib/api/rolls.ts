import { api } from './client';
import {
  Roll,
  RollWithDetails,
  RollListResponse,
  RollListParams,
  CreateRollData,
  CreateRollResponse,
  UpdateRollStatusData,
  UpdateStatusResponse,
  StockOutData,
  StockOutResponse,
  QRLookupResponse,
  RollHistoryResponse,
  GreyStockSummary,
  FinishedStockSummary,
  RollStatsOverview,
  CreateBatchRollsData,
  CreateBatchRollsResponse,
} from '../types/roll';

export const rollsApi = {
  // List rolls with filters
  getAll: async (params?: RollListParams): Promise<RollListResponse> => {
    const response = await api.get('/rolls', { params });
    return response.data;
  },

  // Get single roll by ID
  getById: async (id: number): Promise<RollWithDetails> => {
    const response = await api.get(`/rolls/${id}`);
    return response.data;
  },

  // Look up roll by QR code
  lookupByQR: async (qrCode: string): Promise<QRLookupResponse> => {
    const response = await api.get(`/rolls/by-qr/${encodeURIComponent(qrCode)}`);
    return response.data;
  },

  // Create new roll with QR code
  create: async (data: CreateRollData): Promise<CreateRollResponse> => {
    const response = await api.post('/rolls', data);
    return response.data;
  },

  // Create batch of rolls (LOT mode)
  createBatch: async (data: CreateBatchRollsData): Promise<CreateBatchRollsResponse> => {
    const response = await api.post('/rolls/batch', data);
    return response.data;
  },

  // Update roll status
  updateStatus: async (id: number, data: UpdateRollStatusData): Promise<UpdateStatusResponse> => {
    const response = await api.patch(`/rolls/${id}/status`, data);
    return response.data;
  },

  // Mark roll as stocked out / sold
  stockOut: async (id: number, data?: StockOutData): Promise<StockOutResponse> => {
    const response = await api.post(`/rolls/${id}/stock-out`, data || {});
    return response.data;
  },

  // Get roll status history
  getHistory: async (id: number): Promise<RollHistoryResponse> => {
    const response = await api.get(`/rolls/${id}/history`);
    return response.data;
  },

  // Get grey stock summary
  getGreyStockSummary: async (): Promise<GreyStockSummary> => {
    const response = await api.get('/rolls/grey-stock/summary');
    return response.data;
  },

  // Get finished stock summary
  getFinishedStockSummary: async (): Promise<FinishedStockSummary> => {
    const response = await api.get('/rolls/finished-stock/summary');
    return response.data;
  },

  // Get roll statistics overview
  getStatsOverview: async (): Promise<RollStatsOverview> => {
    const response = await api.get('/rolls/stats/overview');
    return response.data;
  },

  // Daily production logs (Roll-based; used by the Production Overview page).
  // Pass `date` for a single day or `startDate`+`endDate` for a range.
  // Defaults to today on the server.
  getProductionLogs: async (params?: {
    date?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }): Promise<{
    logs: Array<{
      id: number;
      rollNumber: string | null;
      weight: number;
      machine: string | null;
      machineName: string | null;
      product: { id: number | null; name: string; articleNumber: string | null; qrCode: string };
      createdAt: string;
    }>;
    summary: {
      totalWeight: number;
      totalRolls: number;
      byProduct: Array<{
        id: number;
        name: string;
        articleNumber: string | null;
        weight: number;
        rolls: number;
      }>;
    };
  }> => {
    const response = await api.get<{ data: any }>('/rolls/production-logs', { params });
    return response.data.data;
  },
};
