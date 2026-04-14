import { api } from './client';
import {
  Machine,
  MachineWithDetails,
  MachineLookup,
  MachineStats,
  MaintenanceScheduleItem,
  MachineListResponse,
  MachineFormData,
  MachineStatus,
  MachineType,
  ProductionHistoryResponse,
  DowntimeHistoryResponse,
} from '../types/machine';

export interface MachineListParams {
  status?: MachineStatus;
  machineType?: MachineType;
  search?: string;
  sortBy?: 'machineNumber' | 'name' | 'status' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export const machinesApi = {
  // List machines with filters
  getAll: async (params?: MachineListParams): Promise<MachineListResponse> => {
    const response = await api.get('/machines', { params });
    return response.data;
  },

  // Get lightweight list for dropdowns
  getLookup: async (): Promise<MachineLookup[]> => {
    const response = await api.get('/machines/lookup');
    return response.data;
  },

  // Get dashboard statistics
  getStats: async (): Promise<MachineStats> => {
    const response = await api.get('/machines/stats');
    return response.data;
  },

  // Get maintenance schedule
  getMaintenanceSchedule: async (): Promise<MaintenanceScheduleItem[]> => {
    const response = await api.get('/machines/maintenance-schedule');
    return response.data;
  },

  // Get single machine by ID
  getById: async (id: number): Promise<MachineWithDetails> => {
    const response = await api.get(`/machines/${id}`);
    return response.data;
  },

  // Create new machine
  create: async (data: MachineFormData): Promise<Machine> => {
    const response = await api.post('/machines', data);
    return response.data;
  },

  // Update machine
  update: async (id: number, data: Partial<MachineFormData>): Promise<Machine> => {
    const response = await api.put(`/machines/${id}`, data);
    return response.data;
  },

  // Update machine status
  updateStatus: async (id: number, status: MachineStatus, notes?: string): Promise<Machine> => {
    const response = await api.patch(`/machines/${id}/status`, { status, notes });
    return response.data;
  },

  // Schedule maintenance
  scheduleMaintenance: async (id: number, nextMaintenanceAt: string, notes?: string): Promise<Machine> => {
    const response = await api.post(`/machines/${id}/schedule-maintenance`, { nextMaintenanceAt, notes });
    return response.data;
  },

  // Complete maintenance
  completeMaintenance: async (id: number, notes?: string, nextMaintenanceAt?: string): Promise<Machine> => {
    const response = await api.post(`/machines/${id}/complete-maintenance`, { notes, nextMaintenanceAt });
    return response.data;
  },

  // Get production history
  getProductionHistory: async (
    id: number,
    params?: { startDate?: string; endDate?: string; limit?: number }
  ): Promise<ProductionHistoryResponse> => {
    const response = await api.get(`/machines/${id}/production-history`, { params });
    return response.data;
  },

  // Get downtime history
  getDowntimeHistory: async (
    id: number,
    params?: { startDate?: string; endDate?: string; limit?: number }
  ): Promise<DowntimeHistoryResponse> => {
    const response = await api.get(`/machines/${id}/downtime-history`, { params });
    return response.data;
  },

  // Decommission machine (soft delete)
  decommission: async (id: number): Promise<{ message: string; machine: Machine }> => {
    const response = await api.delete(`/machines/${id}`);
    return response.data;
  },
};
