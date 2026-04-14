import { api } from './client';
import { User, CreateUserFormData, UpdateUserFormData, RoleInfo } from '@/lib/types/user';

export const usersApi = {
  /**
   * Get all users in the tenant
   */
  async getAll(): Promise<User[]> {
    const response = await api.get<{ data: User[] }>('/users');
    return response.data.data;
  },

  /**
   * Get available roles with their permissions
   */
  async getRoles(): Promise<RoleInfo[]> {
    const response = await api.get<{ data: RoleInfo[] }>('/users/roles');
    return response.data.data;
  },

  /**
   * Get a single user by ID
   */
  async getById(id: number): Promise<User> {
    const response = await api.get<{ data: User }>(`/users/${id}`);
    return response.data.data;
  },

  /**
   * Create a new user
   */
  async create(data: CreateUserFormData): Promise<{ id: number }> {
    const response = await api.post<{ message: string; data: { id: number } }>(
      '/users',
      data
    );
    return response.data.data;
  },

  /**
   * Update an existing user
   */
  async update(id: number, data: UpdateUserFormData): Promise<void> {
    await api.put(`/users/${id}`, data);
  },

  /**
   * Reset user password (admin action)
   */
  async resetPassword(id: number, password: string): Promise<void> {
    await api.put(`/users/${id}/password`, { password });
  },

  /**
   * Toggle user active status
   */
  async toggleStatus(id: number): Promise<{ isActive: boolean }> {
    const response = await api.put<{ message: string; data: { isActive: boolean } }>(
      `/users/${id}/toggle-status`
    );
    return response.data.data;
  },

  /**
   * Delete (deactivate) a user
   */
  async delete(id: number): Promise<void> {
    await api.delete(`/users/${id}`);
  },
};
