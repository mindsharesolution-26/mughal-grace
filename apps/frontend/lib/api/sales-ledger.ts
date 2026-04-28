import { api } from './client';
import {
  SalesLedgerResponse,
  SalesLedgerAlerts,
  SalesLedgerQueryParams,
} from '../types/sales-ledger';

export const salesLedgerApi = {
  /**
   * Get combined customer and vendor ledger entries
   */
  async getLedger(params?: SalesLedgerQueryParams): Promise<SalesLedgerResponse> {
    const response = await api.get('/sales/ledger', { params });
    return response.data;
  },

  /**
   * Get pending payments and upcoming cheques alerts
   */
  async getAlerts(): Promise<SalesLedgerAlerts> {
    const response = await api.get('/sales/ledger/alerts');
    return response.data;
  },
};
