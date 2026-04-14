import { api } from './client';
import { KnittingYarn, KnittingYarnFormData } from '@/lib/types/yarn';

/**
 * Knitting Yarns API Service
 */
export const knittingYarnsApi = {
  /**
   * Get all knitting yarns with relations
   */
  async getAll(): Promise<KnittingYarn[]> {
    const response = await api.get<{ data: KnittingYarn[] }>('/yarn/knitting');
    return response.data.data;
  },

  /**
   * Get lightweight lookup data for dropdowns
   */
  async getLookup(): Promise<{ id: number; code: string; name: string }[]> {
    const response = await api.get<{ data: { id: number; code: string; name: string }[] }>('/yarn/knitting/lookup');
    return response.data.data;
  },

  /**
   * Get a single knitting yarn by ID
   */
  async getById(id: number): Promise<KnittingYarn> {
    const response = await api.get<{ data: KnittingYarn }>(`/yarn/knitting/${id}`);
    return response.data.data;
  },

  /**
   * Create a new knitting yarn
   */
  async create(data: KnittingYarnFormData): Promise<KnittingYarn> {
    const response = await api.post<{ message: string; data: KnittingYarn }>(
      '/yarn/knitting',
      data
    );
    return response.data.data;
  },

  /**
   * Update an existing knitting yarn
   */
  async update(id: number, data: Partial<KnittingYarnFormData>): Promise<KnittingYarn> {
    const response = await api.put<{ message: string; data: KnittingYarn }>(
      `/yarn/knitting/${id}`,
      data
    );
    return response.data.data;
  },

  /**
   * Delete (soft delete) a knitting yarn
   */
  async delete(id: number): Promise<void> {
    await api.delete(`/yarn/knitting/${id}`);
  },
};
