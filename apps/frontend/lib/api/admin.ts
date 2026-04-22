import { api } from './client';

// Types for admin API
export interface TenantListItem {
  id: number;
  name: string;
  slug: string;
  ownerName: string;
  ownerEmail: string;
  status: string;
  plan: string;
  userCount: number;
  createdAt: string;
}

export interface UserListItem {
  id: number;
  email: string;
  username: string;
  fullName: string | null;
  role: string;
  isActive: boolean;
  lastLogin: string | null;
  createdAt: string;
  tenantId: number;
  tenantName: string;
}

export interface UserFilters {
  tenantId?: number;
  role?: string;
  isActive?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export interface UpdateUserData {
  fullName?: string;
  role?: string;
  isActive?: boolean;
  phone?: string;
}

export interface CreateSuperAdminData {
  email: string;
  username: string;
  password: string;
  fullName: string;
}

export interface CreateUserData {
  email: string;
  username: string;
  password: string;
  fullName: string;
  role: string;
  tenantId: number;
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

export interface AdminStats {
  totalTenants: number;
  activeTenants: number;
  totalUsers: number;
  superAdmins: number;
}

export const adminApi = {
  // ==================== TENANT OPERATIONS ====================

  /**
   * Get all tenants with user counts
   */
  async getTenants(): Promise<TenantListItem[]> {
    const response = await api.get<{ data: TenantListItem[] }>('/admin/tenants');
    return response.data.data;
  },

  /**
   * Get tenant by ID with details
   */
  async getTenant(id: number): Promise<TenantListItem> {
    const response = await api.get<{ data: TenantListItem }>(`/admin/tenants/${id}`);
    return response.data.data;
  },

  // ==================== USER OPERATIONS ====================

  /**
   * Get all users across all tenants with filtering
   */
  async getUsers(filters?: UserFilters): Promise<PaginatedResponse<UserListItem>> {
    const params = new URLSearchParams();

    if (filters?.tenantId) params.append('tenantId', filters.tenantId.toString());
    if (filters?.role) params.append('role', filters.role);
    if (filters?.isActive !== undefined) params.append('isActive', filters.isActive.toString());
    if (filters?.search) params.append('search', filters.search);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());

    const queryString = params.toString();
    const url = queryString ? `/admin/users?${queryString}` : '/admin/users';

    const response = await api.get<PaginatedResponse<UserListItem>>(url);
    return response.data;
  },

  /**
   * Get user by ID with tenant info
   */
  async getUser(id: number): Promise<UserListItem> {
    const response = await api.get<{ data: UserListItem }>(`/admin/users/${id}`);
    return response.data.data;
  },

  /**
   * Update user (role, status, etc.)
   */
  async updateUser(id: number, data: UpdateUserData): Promise<UserListItem> {
    const response = await api.put<{ message: string; data: UserListItem }>(
      `/admin/users/${id}`,
      data
    );
    return response.data.data;
  },

  /**
   * Deactivate user (soft delete)
   */
  async deactivateUser(id: number): Promise<void> {
    await api.delete(`/admin/users/${id}`);
  },

  /**
   * Create a new Super Admin user
   */
  async createSuperAdmin(data: CreateSuperAdminData): Promise<UserListItem> {
    const response = await api.post<{ message: string; data: UserListItem }>(
      '/admin/users/super-admin',
      data
    );
    return response.data.data;
  },

  /**
   * Create a new user with specified role and tenant
   */
  async createUser(data: CreateUserData): Promise<UserListItem> {
    const response = await api.post<{ message: string; data: UserListItem }>(
      '/admin/users',
      data
    );
    return response.data.data;
  },

  // ==================== STATS/DASHBOARD ====================

  /**
   * Get platform statistics
   */
  async getStats(): Promise<AdminStats> {
    const response = await api.get<{ data: AdminStats }>('/admin/stats');
    return response.data.data;
  },
};
