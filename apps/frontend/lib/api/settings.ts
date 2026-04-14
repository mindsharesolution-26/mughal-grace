import { api } from './client';
import {
  Department,
  DepartmentFormData,
  ProductGroup,
  ProductGroupFormData,
  Brand,
  BrandFormData,
  Unit,
  UnitFormData,
  UnitCategory,
  Group,
  GroupFormData,
  Material,
  MaterialFormData,
  Fabric,
  FabricFormData,
  FabricLookupResponse,
  Color,
  ColorFormData,
  Grade,
  GradeFormData,
  KnittingMachineSize,
  KnittingMachineSizeFormData,
  FabricSize,
  FabricSizeFormData,
  FabricForm,
  FabricFormFormData,
  FabricType,
  FabricTypeFormData,
  FabricCompositionType,
  FabricCompositionFormData,
} from '@/lib/types/settings';

// ==================== DEPARTMENTS ====================

export const departmentsApi = {
  async getAll(): Promise<Department[]> {
    const response = await api.get<{ data: Department[] }>('/settings/departments');
    return response.data.data;
  },

  async getById(id: number): Promise<Department> {
    const response = await api.get<{ data: Department }>(`/settings/departments/${id}`);
    return response.data.data;
  },

  async create(data: DepartmentFormData): Promise<Department> {
    const response = await api.post<{ message: string; data: Department }>(
      '/settings/departments',
      data
    );
    return response.data.data;
  },

  async update(id: number, data: Partial<DepartmentFormData>): Promise<Department> {
    const response = await api.put<{ message: string; data: Department }>(
      `/settings/departments/${id}`,
      data
    );
    return response.data.data;
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/settings/departments/${id}`);
  },
};

// ==================== PRODUCT GROUPS ====================

export const productGroupsApi = {
  async getAll(): Promise<ProductGroup[]> {
    const response = await api.get<{ data: ProductGroup[] }>('/settings/product-groups');
    return response.data.data;
  },

  async getById(id: number): Promise<ProductGroup> {
    const response = await api.get<{ data: ProductGroup }>(`/settings/product-groups/${id}`);
    return response.data.data;
  },

  async create(data: ProductGroupFormData): Promise<ProductGroup> {
    const response = await api.post<{ message: string; data: ProductGroup }>(
      '/settings/product-groups',
      data
    );
    return response.data.data;
  },

  async update(id: number, data: Partial<ProductGroupFormData>): Promise<ProductGroup> {
    const response = await api.put<{ message: string; data: ProductGroup }>(
      `/settings/product-groups/${id}`,
      data
    );
    return response.data.data;
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/settings/product-groups/${id}`);
  },
};

// ==================== BRANDS ====================

export const brandsApi = {
  async getAll(): Promise<Brand[]> {
    const response = await api.get<{ data: Brand[] }>('/settings/brands');
    return response.data.data;
  },

  async getById(id: number): Promise<Brand> {
    const response = await api.get<{ data: Brand }>(`/settings/brands/${id}`);
    return response.data.data;
  },

  async create(data: BrandFormData): Promise<Brand> {
    const response = await api.post<{ message: string; data: Brand }>(
      '/settings/brands',
      data
    );
    return response.data.data;
  },

  async update(id: number, data: Partial<BrandFormData>): Promise<Brand> {
    const response = await api.put<{ message: string; data: Brand }>(
      `/settings/brands/${id}`,
      data
    );
    return response.data.data;
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/settings/brands/${id}`);
  },
};

// ==================== UNITS ====================

export const unitsApi = {
  async getAll(category?: UnitCategory): Promise<Unit[]> {
    const params = category ? `?category=${category}` : '';
    const response = await api.get<{ data: Unit[] }>(`/settings/units${params}`);
    return response.data.data;
  },

  async getById(id: number): Promise<Unit> {
    const response = await api.get<{ data: Unit }>(`/settings/units/${id}`);
    return response.data.data;
  },

  async create(data: UnitFormData): Promise<Unit> {
    const response = await api.post<{ message: string; data: Unit }>(
      '/settings/units',
      data
    );
    return response.data.data;
  },

  async update(id: number, data: Partial<UnitFormData>): Promise<Unit> {
    const response = await api.put<{ message: string; data: Unit }>(
      `/settings/units/${id}`,
      data
    );
    return response.data.data;
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/settings/units/${id}`);
  },

  async seedDefaults(): Promise<{ message: string }> {
    const response = await api.post<{ message: string }>('/settings/units/seed-defaults');
    return response.data;
  },
};

// ==================== GROUPS ====================

export const groupsApi = {
  async getAll(departmentId?: number): Promise<Group[]> {
    const params = departmentId ? { departmentId } : undefined;
    const response = await api.get<{ data: Group[] }>('/settings/groups', { params });
    return response.data.data;
  },

  async getById(id: number): Promise<Group> {
    const response = await api.get<{ data: Group }>(`/settings/groups/${id}`);
    return response.data.data;
  },

  async create(data: GroupFormData): Promise<Group> {
    const response = await api.post<{ message: string; data: Group }>(
      '/settings/groups',
      data
    );
    return response.data.data;
  },

  async update(id: number, data: Partial<GroupFormData>): Promise<Group> {
    const response = await api.put<{ message: string; data: Group }>(
      `/settings/groups/${id}`,
      data
    );
    return response.data.data;
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/settings/groups/${id}`);
  },
};

// ==================== MATERIALS ====================

export const materialsApi = {
  async getAll(): Promise<Material[]> {
    const response = await api.get<{ data: Material[] }>('/settings/materials');
    return response.data.data;
  },

  async getById(id: number): Promise<Material> {
    const response = await api.get<{ data: Material }>(`/settings/materials/${id}`);
    return response.data.data;
  },

  async create(data: MaterialFormData): Promise<Material> {
    const response = await api.post<{ message: string; data: Material }>(
      '/settings/materials',
      data
    );
    return response.data.data;
  },

  async update(id: number, data: Partial<MaterialFormData>): Promise<Material> {
    const response = await api.put<{ message: string; data: Material }>(
      `/settings/materials/${id}`,
      data
    );
    return response.data.data;
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/settings/materials/${id}`);
  },

  async seedDefaults(): Promise<{ message: string }> {
    const response = await api.post<{ message: string }>('/settings/materials/seed-defaults');
    return response.data;
  },
};

// ==================== FABRICS ====================

export const fabricsApi = {
  async getAll(): Promise<Fabric[]> {
    const response = await api.get<{ data: Fabric[] }>('/fabrics');
    return response.data.data;
  },

  async getById(id: number): Promise<Fabric> {
    const response = await api.get<{ data: Fabric }>(`/fabrics/${id}`);
    return response.data.data;
  },

  async create(data: FabricFormData): Promise<Fabric> {
    const response = await api.post<{ message: string; data: Fabric }>('/fabrics', data);
    return response.data.data;
  },

  async update(id: number, data: Partial<FabricFormData>): Promise<Fabric> {
    const response = await api.put<{ message: string; data: Fabric }>(`/fabrics/${id}`, data);
    return response.data.data;
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/fabrics/${id}`);
  },

  /**
   * Scanner lookup endpoint
   * @param scanValue - QR payload (FABRIC|FAB000001) or fabric code (FAB000001)
   * @returns Fabric details with status
   */
  async lookup(scanValue: string): Promise<FabricLookupResponse> {
    const response = await api.post<FabricLookupResponse>('/fabrics/lookup', {
      scan_value: scanValue,
    });
    return response.data;
  },
};

// ==================== COLORS ====================

export const colorsApi = {
  async getAll(): Promise<Color[]> {
    const response = await api.get<{ data: Color[] }>('/settings/colors');
    return response.data.data;
  },

  async getById(id: number): Promise<Color> {
    const response = await api.get<{ data: Color }>(`/settings/colors/${id}`);
    return response.data.data;
  },

  async create(data: ColorFormData): Promise<Color> {
    const response = await api.post<{ message: string; data: Color }>(
      '/settings/colors',
      data
    );
    return response.data.data;
  },

  async update(id: number, data: Partial<ColorFormData>): Promise<Color> {
    const response = await api.put<{ message: string; data: Color }>(
      `/settings/colors/${id}`,
      data
    );
    return response.data.data;
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/settings/colors/${id}`);
  },
};

// ==================== GRADES ====================

export const gradesApi = {
  async getAll(): Promise<Grade[]> {
    const response = await api.get<{ data: Grade[] }>('/settings/grades');
    return response.data.data;
  },

  async getById(id: number): Promise<Grade> {
    const response = await api.get<{ data: Grade }>(`/settings/grades/${id}`);
    return response.data.data;
  },

  async create(data: GradeFormData): Promise<Grade> {
    const response = await api.post<{ message: string; data: Grade }>(
      '/settings/grades',
      data
    );
    return response.data.data;
  },

  async update(id: number, data: Partial<GradeFormData>): Promise<Grade> {
    const response = await api.put<{ message: string; data: Grade }>(
      `/settings/grades/${id}`,
      data
    );
    return response.data.data;
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/settings/grades/${id}`);
  },

  async seedDefaults(): Promise<{ message: string }> {
    const response = await api.post<{ message: string }>('/settings/grades/seed-defaults');
    return response.data;
  },
};

// ==================== KNITTING MACHINE SIZES ====================

export const knittingMachineSizesApi = {
  async getAll(): Promise<KnittingMachineSize[]> {
    const response = await api.get<{ data: KnittingMachineSize[] }>('/settings/knitting-machine-sizes');
    return response.data.data;
  },

  async getById(id: number): Promise<KnittingMachineSize> {
    const response = await api.get<{ data: KnittingMachineSize }>(`/settings/knitting-machine-sizes/${id}`);
    return response.data.data;
  },

  async create(data: KnittingMachineSizeFormData): Promise<KnittingMachineSize> {
    const response = await api.post<{ message: string; data: KnittingMachineSize }>(
      '/settings/knitting-machine-sizes',
      data
    );
    return response.data.data;
  },

  async update(id: number, data: Partial<KnittingMachineSizeFormData>): Promise<KnittingMachineSize> {
    const response = await api.put<{ message: string; data: KnittingMachineSize }>(
      `/settings/knitting-machine-sizes/${id}`,
      data
    );
    return response.data.data;
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/settings/knitting-machine-sizes/${id}`);
  },
};

// ==================== FABRIC SIZES ====================

export const fabricSizesApi = {
  async getAll(): Promise<FabricSize[]> {
    const response = await api.get<{ data: FabricSize[] }>('/settings/fabric-sizes');
    return response.data.data;
  },

  async getById(id: number): Promise<FabricSize> {
    const response = await api.get<{ data: FabricSize }>(`/settings/fabric-sizes/${id}`);
    return response.data.data;
  },

  async create(data: FabricSizeFormData): Promise<FabricSize> {
    const response = await api.post<{ message: string; data: FabricSize }>(
      '/settings/fabric-sizes',
      data
    );
    return response.data.data;
  },

  async update(id: number, data: Partial<FabricSizeFormData>): Promise<FabricSize> {
    const response = await api.put<{ message: string; data: FabricSize }>(
      `/settings/fabric-sizes/${id}`,
      data
    );
    return response.data.data;
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/settings/fabric-sizes/${id}`);
  },

  async seedDefaults(): Promise<{ message: string }> {
    const response = await api.post<{ message: string }>('/settings/fabric-sizes/seed-defaults');
    return response.data;
  },
};

// ==================== FABRIC FORMS ====================

export const fabricFormsApi = {
  async getAll(): Promise<FabricForm[]> {
    const response = await api.get<{ data: FabricForm[] }>('/settings/fabric-forms');
    return response.data.data;
  },

  async getById(id: number): Promise<FabricForm> {
    const response = await api.get<{ data: FabricForm }>(`/settings/fabric-forms/${id}`);
    return response.data.data;
  },

  async create(data: FabricFormFormData): Promise<FabricForm> {
    const response = await api.post<{ message: string; data: FabricForm }>(
      '/settings/fabric-forms',
      data
    );
    return response.data.data;
  },

  async update(id: number, data: Partial<FabricFormFormData>): Promise<FabricForm> {
    const response = await api.put<{ message: string; data: FabricForm }>(
      `/settings/fabric-forms/${id}`,
      data
    );
    return response.data.data;
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/settings/fabric-forms/${id}`);
  },

  async seedDefaults(): Promise<{ message: string }> {
    const response = await api.post<{ message: string }>('/settings/fabric-forms/seed-defaults');
    return response.data;
  },
};

// ==================== FABRIC TYPES ====================

export const fabricTypesApi = {
  async getAll(): Promise<FabricType[]> {
    const response = await api.get<{ data: FabricType[] }>('/settings/fabric-types');
    return response.data.data;
  },

  async getById(id: number): Promise<FabricType> {
    const response = await api.get<{ data: FabricType }>(`/settings/fabric-types/${id}`);
    return response.data.data;
  },

  async create(data: FabricTypeFormData): Promise<FabricType> {
    const response = await api.post<{ message: string; data: FabricType }>(
      '/settings/fabric-types',
      data
    );
    return response.data.data;
  },

  async update(id: number, data: Partial<FabricTypeFormData>): Promise<FabricType> {
    const response = await api.put<{ message: string; data: FabricType }>(
      `/settings/fabric-types/${id}`,
      data
    );
    return response.data.data;
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/settings/fabric-types/${id}`);
  },

  async seedDefaults(): Promise<{ message: string }> {
    const response = await api.post<{ message: string }>('/settings/fabric-types/seed-defaults');
    return response.data;
  },
};

// ==================== FABRIC COMPOSITIONS ====================

export const fabricCompositionsApi = {
  async getAll(): Promise<FabricCompositionType[]> {
    const response = await api.get<{ data: FabricCompositionType[] }>('/settings/fabric-compositions');
    return response.data.data;
  },

  async getById(id: number): Promise<FabricCompositionType> {
    const response = await api.get<{ data: FabricCompositionType }>(`/settings/fabric-compositions/${id}`);
    return response.data.data;
  },

  async create(data: FabricCompositionFormData): Promise<FabricCompositionType> {
    const response = await api.post<{ message: string; data: FabricCompositionType }>(
      '/settings/fabric-compositions',
      data
    );
    return response.data.data;
  },

  async update(id: number, data: Partial<FabricCompositionFormData>): Promise<FabricCompositionType> {
    const response = await api.put<{ message: string; data: FabricCompositionType }>(
      `/settings/fabric-compositions/${id}`,
      data
    );
    return response.data.data;
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/settings/fabric-compositions/${id}`);
  },

  async seedDefaults(): Promise<{ message: string }> {
    const response = await api.post<{ message: string }>('/settings/fabric-compositions/seed-defaults');
    return response.data;
  },
};
