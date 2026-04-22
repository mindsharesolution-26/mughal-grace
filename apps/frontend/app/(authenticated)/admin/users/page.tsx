'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  adminApi,
  TenantListItem,
  UserListItem,
  UserFilters,
  UpdateUserData,
  CreateUserData,
} from '@/lib/api/admin';
import { UserRole, roleLabels, roleColors } from '@/lib/types/user';

const allRoles: UserRole[] = [
  'SUPER_ADMIN',
  'FACTORY_OWNER',
  'MANAGER',
  'SUPERVISOR',
  'OPERATOR',
  'ACCOUNTANT',
  'VIEWER',
];

export default function AdminUsersPage() {
  const router = useRouter();
  const { user: currentUser, isLoading: authLoading } = useAuth();
  const { showToast } = useToast();

  // Data
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [tenants, setTenants] = useState<TenantListItem[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });

  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTenant, setFilterTenant] = useState<number | 'ALL'>('ALL');
  const [filterRole, setFilterRole] = useState<UserRole | 'ALL'>('ALL');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'true' | 'false'>('ALL');

  // Modals
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserListItem | null>(null);

  // Edit form
  const [editForm, setEditForm] = useState<UpdateUserData>({});

  // Create user form
  const [createForm, setCreateForm] = useState<CreateUserData>({
    email: '',
    username: '',
    password: '',
    fullName: '',
    role: 'VIEWER',
    tenantId: 0,
  });

  // Check if user is SUPER_ADMIN
  useEffect(() => {
    if (currentUser && currentUser.role !== 'SUPER_ADMIN') {
      router.push('/dashboard');
      showToast('error', 'Access denied. Super Admin only.');
    }
  }, [currentUser, router, showToast]);

  const fetchTenants = useCallback(async () => {
    try {
      const data = await adminApi.getTenants();
      setTenants(data);
    } catch (err) {
      console.error('Failed to fetch tenants:', err);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const filters: UserFilters = {
        page: pagination.page,
        limit: pagination.limit,
      };

      if (filterTenant !== 'ALL') {
        filters.tenantId = filterTenant;
      }
      if (filterRole !== 'ALL') {
        filters.role = filterRole;
      }
      if (filterStatus !== 'ALL') {
        filters.isActive = filterStatus === 'true';
      }
      if (searchQuery) {
        filters.search = searchQuery;
      }

      const result = await adminApi.getUsers(filters);
      setUsers(result.data);
      setPagination(result.pagination);
    } catch (err: any) {
      const message = err.response?.data?.error || 'Failed to load users';
      setError(message);
      showToast('error', message);
    } finally {
      setIsLoading(false);
    }
  }, [pagination.page, pagination.limit, filterTenant, filterRole, filterStatus, searchQuery, showToast]);

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      fetchUsers();
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [fetchUsers]);

  const handleEditUser = (user: UserListItem) => {
    setSelectedUser(user);
    setEditForm({
      fullName: user.fullName || '',
      role: user.role,
      isActive: user.isActive,
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedUser) return;

    try {
      setActionLoading(true);
      await adminApi.updateUser(selectedUser.id, editForm);
      showToast('success', 'User updated successfully');
      setShowEditModal(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (err: any) {
      showToast('error', err.response?.data?.error || 'Failed to update user');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeactivateUser = async (user: UserListItem) => {
    if (!confirm(`Are you sure you want to deactivate ${user.fullName || user.email}?`)) {
      return;
    }

    try {
      setActionLoading(true);
      await adminApi.deactivateUser(user.id);
      showToast('success', 'User deactivated successfully');
      fetchUsers();
    } catch (err: any) {
      showToast('error', err.response?.data?.error || 'Failed to deactivate user');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateUser = async () => {
    if (!createForm.email || !createForm.username || !createForm.password || !createForm.fullName) {
      showToast('error', 'All fields are required');
      return;
    }

    if (createForm.password.length < 8) {
      showToast('error', 'Password must be at least 8 characters');
      return;
    }

    if (!createForm.tenantId || createForm.tenantId === 0) {
      showToast('error', 'Please select a factory');
      return;
    }

    try {
      setActionLoading(true);
      await adminApi.createUser(createForm);
      showToast('success', 'User created successfully');
      setShowCreateUser(false);
      setCreateForm({ email: '', username: '', password: '', fullName: '', role: 'VIEWER', tenantId: 0 });
      fetchUsers();
    } catch (err: any) {
      showToast('error', err.response?.data?.error || 'Failed to create user');
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Show loading while auth is being checked
  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
        <span className="ml-3 text-neutral-400">Loading...</span>
      </div>
    );
  }

  if (!currentUser || currentUser.role !== 'SUPER_ADMIN') {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">All Users</h1>
          <p className="text-neutral-400 mt-1">
            Manage users across all factories
          </p>
        </div>
        <Button onClick={() => setShowCreateUser(true)}>
          + Create User
        </Button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
          <span className="ml-3 text-neutral-400">Loading users...</span>
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div className="bg-error/10 border border-error/20 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-error text-xl">!</span>
            <span className="text-error">{error}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={fetchUsers}>
            Retry
          </Button>
        </div>
      )}

      {!isLoading && !error && (
        <>
          {/* Filters */}
          <div className="bg-factory-dark rounded-2xl border border-factory-border p-4">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Search by name, email, or username..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <select
                value={filterTenant === 'ALL' ? 'ALL' : filterTenant.toString()}
                onChange={(e) =>
                  setFilterTenant(e.target.value === 'ALL' ? 'ALL' : parseInt(e.target.value))
                }
                className="px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white"
              >
                <option value="ALL">All Factories</option>
                {tenants.map((tenant) => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.name}
                  </option>
                ))}
              </select>

              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value as UserRole | 'ALL')}
                className="px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white"
              >
                <option value="ALL">All Roles</option>
                {allRoles.map((role) => (
                  <option key={role} value={role}>
                    {roleLabels[role]}
                  </option>
                ))}
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as 'ALL' | 'true' | 'false')}
                className="px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white"
              >
                <option value="ALL">All Status</option>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-factory-dark rounded-2xl border border-factory-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-factory-border">
                    <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">
                      User
                    </th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">
                      Factory
                    </th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">
                      Role
                    </th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">
                      Status
                    </th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">
                      Last Login
                    </th>
                    <th className="text-right px-6 py-4 text-sm font-medium text-neutral-400">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-factory-border">
                  {users.map((user) => {
                    const colors = roleColors[user.role as UserRole] || {
                      bg: 'bg-neutral-500/20',
                      text: 'text-neutral-400',
                    };
                    return (
                      <tr
                        key={user.id}
                        className={`hover:bg-factory-gray transition-colors ${
                          !user.isActive ? 'opacity-60' : ''
                        }`}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary-500/20 flex items-center justify-center">
                              <span className="text-primary-400 font-medium">
                                {(user.fullName || user.email).charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="text-white font-medium">
                                {user.fullName || user.username}
                              </p>
                              <p className="text-sm text-neutral-400">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-white">{user.tenantName}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-2.5 py-1 rounded-lg text-xs font-medium ${colors.bg} ${colors.text}`}
                          >
                            {roleLabels[user.role as UserRole] || user.role}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                              user.isActive
                                ? 'bg-success/20 text-success'
                                : 'bg-neutral-500/20 text-neutral-400'
                            }`}
                          >
                            {user.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-neutral-400 text-sm">
                            {formatDate(user.lastLogin)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditUser(user)}
                            >
                              Edit
                            </Button>
                            {user.id !== currentUser?.id && user.isActive && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeactivateUser(user)}
                                disabled={actionLoading}
                              >
                                Deactivate
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {users.length === 0 && (
              <div className="text-center py-12">
                <span className="text-4xl">👥</span>
                <p className="text-neutral-400 mt-2">No users found</p>
              </div>
            )}

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-factory-border">
                <p className="text-sm text-neutral-400">
                  Showing {users.length} of {pagination.total} users
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={pagination.page === 1}
                    onClick={() =>
                      setPagination((prev) => ({ ...prev, page: prev.page - 1 }))
                    }
                  >
                    Previous
                  </Button>
                  <span className="px-4 py-2 text-white">
                    {pagination.page} / {pagination.totalPages}
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={pagination.page === pagination.totalPages}
                    onClick={() =>
                      setPagination((prev) => ({ ...prev, page: prev.page + 1 }))
                    }
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => {
              setShowEditModal(false);
              setSelectedUser(null);
            }}
          />
          <div className="relative bg-factory-dark border border-factory-border rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-white mb-4">
              Edit User: {selectedUser.fullName || selectedUser.email}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-1">
                  Full Name
                </label>
                <Input
                  value={editForm.fullName || ''}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, fullName: e.target.value }))
                  }
                  placeholder="Full Name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-1">
                  Role
                </label>
                <select
                  value={editForm.role || selectedUser.role}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, role: e.target.value }))
                  }
                  className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white"
                >
                  {allRoles.map((role) => (
                    <option key={role} value={role}>
                      {roleLabels[role]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-1">
                  Status
                </label>
                <select
                  value={editForm.isActive === undefined ? selectedUser.isActive.toString() : editForm.isActive.toString()}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, isActive: e.target.value === 'true' }))
                  }
                  className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white"
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedUser(null);
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleSaveEdit} disabled={actionLoading}>
                {actionLoading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {showCreateUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => {
              setShowCreateUser(false);
              setCreateForm({ email: '', username: '', password: '', fullName: '', role: 'VIEWER', tenantId: 0 });
            }}
          />
          <div className="relative bg-factory-dark border border-factory-border rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-white mb-4">
              Create New User
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-1">
                  Factory *
                </label>
                <select
                  value={createForm.tenantId || 0}
                  onChange={(e) =>
                    setCreateForm((prev) => ({ ...prev, tenantId: parseInt(e.target.value) }))
                  }
                  className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white"
                >
                  <option value={0}>Select a factory...</option>
                  {tenants.map((tenant) => (
                    <option key={tenant.id} value={tenant.id}>
                      {tenant.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-1">
                  Full Name *
                </label>
                <Input
                  value={createForm.fullName}
                  onChange={(e) =>
                    setCreateForm((prev) => ({ ...prev, fullName: e.target.value }))
                  }
                  placeholder="Full Name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-1">
                  Email *
                </label>
                <Input
                  type="email"
                  value={createForm.email}
                  onChange={(e) =>
                    setCreateForm((prev) => ({ ...prev, email: e.target.value }))
                  }
                  placeholder="email@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-1">
                  Username *
                </label>
                <Input
                  value={createForm.username}
                  onChange={(e) =>
                    setCreateForm((prev) => ({ ...prev, username: e.target.value }))
                  }
                  placeholder="username"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-1">
                  Password * (min 8 characters)
                </label>
                <Input
                  type="password"
                  value={createForm.password}
                  onChange={(e) =>
                    setCreateForm((prev) => ({ ...prev, password: e.target.value }))
                  }
                  placeholder="********"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-1">
                  Role *
                </label>
                <select
                  value={createForm.role}
                  onChange={(e) =>
                    setCreateForm((prev) => ({ ...prev, role: e.target.value as UserRole }))
                  }
                  className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white"
                >
                  {allRoles.map((role) => (
                    <option key={role} value={role}>
                      {roleLabels[role]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowCreateUser(false);
                  setCreateForm({ email: '', username: '', password: '', fullName: '', role: 'VIEWER', tenantId: 0 });
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleCreateUser} disabled={actionLoading}>
                {actionLoading ? 'Creating...' : 'Create User'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
