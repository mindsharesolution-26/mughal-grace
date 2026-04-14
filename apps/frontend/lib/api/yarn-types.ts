import { api } from './client';
import {
  YarnType,
  YarnTypeFormData,
  YarnTypeLookup,
  KnittingYarn,
  KnittingYarnFormData,
  KnittingYarnLookup,
  FiberComposition,
  CountSystem,
} from '@/lib/types/yarn';

// Demo mode flag - should match AuthContext
const DEMO_MODE = false;

// API response type
interface ApiYarnType {
  id: number;
  code: string;
  name: string;
  description: string | null;
  brandName: string;
  color: string;
  grade: string;
  composition: FiberComposition[] | null;
  countValue: string | null;
  countSystem: CountSystem | null;
  defaultPricePerKg: string | null;
  priceUnit: string;
  currency: string;
  category: string | null;
  tags: string[];
  certifications: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Transform API response to frontend YarnType format
 */
function transformYarnType(data: ApiYarnType): YarnType {
  return {
    id: data.id,
    code: data.code,
    name: data.name,
    description: data.description,
    brandName: data.brandName,
    color: data.color,
    grade: data.grade,
    composition: data.composition,
    countValue: data.countValue ? Number(data.countValue) : null,
    countSystem: data.countSystem,
    defaultPricePerKg: data.defaultPricePerKg ? Number(data.defaultPricePerKg) : null,
    priceUnit: data.priceUnit,
    currency: data.currency,
    category: data.category,
    tags: data.tags || [],
    certifications: data.certifications || [],
    isActive: data.isActive,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

/**
 * Transform frontend form data to API format
 */
function transformFormData(data: YarnTypeFormData): Record<string, unknown> {
  return {
    code: data.code || undefined,
    name: data.name,
    description: data.description || undefined,
    brandName: data.brandName,
    color: data.color,
    grade: data.grade,
    composition: data.composition && data.composition.length > 0 ? data.composition : undefined,
    countValue: data.countValue || undefined,
    countSystem: data.countSystem || undefined,
    defaultPricePerKg: data.defaultPricePerKg || undefined,
    priceUnit: data.priceUnit || 'KG',
    currency: data.currency || 'PKR',
    category: data.category || undefined,
    tags: data.tags || [],
    certifications: data.certifications || [],
    isActive: data.isActive,
  };
}

/**
 * Yarn Types API Service
 */
export const yarnTypesApi = {
  /**
   * Get lightweight lookup data for dropdowns (used across all modules)
   */
  async getLookup(): Promise<YarnTypeLookup[]> {
    const response = await api.get<{ data: YarnTypeLookup[] }>('/yarn/types/lookup');
    return response.data.data;
  },

  /**
   * Get all yarn types
   */
  async getAll(): Promise<YarnType[]> {
    const response = await api.get<{ data: ApiYarnType[] }>('/yarn/types');
    return response.data.data.map(transformYarnType);
  },

  /**
   * Get a single yarn type by ID
   */
  async getById(id: number): Promise<YarnType> {
    const response = await api.get<{ data: ApiYarnType }>(`/yarn/types/${id}`);
    return transformYarnType(response.data.data);
  },

  /**
   * Create a new yarn type
   */
  async create(data: YarnTypeFormData): Promise<YarnType> {
    const response = await api.post<{ message: string; data: ApiYarnType }>(
      '/yarn/types',
      transformFormData(data)
    );
    return transformYarnType(response.data.data);
  },

  /**
   * Update an existing yarn type
   */
  async update(id: number, data: Partial<YarnTypeFormData>): Promise<YarnType> {
    const response = await api.put<{ message: string; data: ApiYarnType }>(
      `/yarn/types/${id}`,
      transformFormData(data as YarnTypeFormData)
    );
    return transformYarnType(response.data.data);
  },

  /**
   * Delete (deactivate) a yarn type
   */
  async delete(id: number): Promise<void> {
    await api.delete(`/yarn/types/${id}`);
  },
};

/**
 * Knitting Yarns (Blends) API Service
 */
export const knittingYarnsApi = {
  /**
   * Get lightweight lookup data for dropdowns
   */
  async getLookup(): Promise<KnittingYarnLookup[]> {
    const response = await api.get<{ data: KnittingYarnLookup[] }>('/yarn/blends/lookup');
    return response.data.data;
  },

  /**
   * Get all knitting yarns/blends
   */
  async getAll(): Promise<KnittingYarn[]> {
    const response = await api.get<{ data: KnittingYarn[] }>('/yarn/blends');
    return response.data.data;
  },

  /**
   * Get a single knitting yarn by ID
   */
  async getById(id: number): Promise<KnittingYarn> {
    const response = await api.get<{ data: KnittingYarn }>(`/yarn/blends/${id}`);
    return response.data.data;
  },

  /**
   * Create a new knitting yarn/blend
   */
  async create(data: KnittingYarnFormData): Promise<KnittingYarn> {
    const response = await api.post<{ message: string; data: KnittingYarn }>(
      '/yarn/blends',
      data
    );
    return response.data.data;
  },

  /**
   * Update an existing knitting yarn/blend
   */
  async update(id: number, data: Partial<KnittingYarnFormData>): Promise<KnittingYarn> {
    const response = await api.put<{ message: string; data: KnittingYarn }>(
      `/yarn/blends/${id}`,
      data
    );
    return response.data.data;
  },

  /**
   * Delete (deactivate) a knitting yarn
   */
  async delete(id: number): Promise<void> {
    await api.delete(`/yarn/blends/${id}`);
  },
};
