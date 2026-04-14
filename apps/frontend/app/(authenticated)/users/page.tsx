'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { useToast } from '@/contexts/ToastContext';
import { usersApi } from '@/lib/api/users';
import {
  User,
  UserRole,
  roleLabels,
  roleColors,
  assignableRoles,
} from '@/lib/types/user';

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<UserRole | 'ALL'>('ALL');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Modal state for actions
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await usersApi.getAll();
      setUsers(data);
    } catch (err: any) {
      const message = err.response?.data?.error || 'Failed to load users';
      setError(message);
      showToast('error', message);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesSearch =
        user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.username.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesRole = filterRole === 'ALL' || user.role === filterRole;

      const matchesStatus =
        filterStatus === 'ALL' ||
        (filterStatus === 'ACTIVE' && user.isActive) ||
        (filterStatus === 'INACTIVE' && !user.isActive);

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchQuery, filterRole, filterStatus]);

  const stats = useMemo(() => ({
    total: users.length,
    active: users.filter((u) => u.isActive).length,
    inactive: users.filter((u) => !u.isActive).length,
    byRole: assignableRoles.reduce((acc, role) => {
      acc[role] = users.filter((u) => u.role === role).length;
      return acc;
    }, {} as Record<string, number>),
  }), [users]);

  const handleToggleStatus = async (user: User) => {
    try {
      setActionLoading(true);
      const result = await usersApi.toggleStatus(user.id);
      showToast('success', `User ${result.isActive ? 'activated' : 'deactivated'} successfully`);
      fetchUsers();
    } catch (err: any) {
      showToast('error', err.response?.data?.error || 'Failed to update user status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!selectedUser || !newPassword || newPassword.length < 8) {
      showToast('error', 'Password must be at least 8 characters');
      return;
    }

    try {
      setActionLoading(true);
      await usersApi.resetPassword(selectedUser.id, newPassword);
      showToast('success', 'Password reset successfully');
      setShowResetPassword(false);
      setSelectedUser(null);
      setNewPassword('');
    } catch (err: any) {
      showToast('error', err.response?.data?.error || 'Failed to reset password');
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Users</h1>
          <p className="text-neutral-400 mt-1">
            Manage team members and their access permissions
          </p>
        </div>
        <Link href="/users/new">
          <Button>+ Add User</Button>
        </Link>
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
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-factory-dark rounded-xl border border-factory-border p-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl">👥</span>
                <div>
                  <p className="text-2xl font-bold text-white">{stats.total}</p>
                  <p className="text-sm text-neutral-400">Total Users</p>
                </div>
              </div>
            </div>
            <div className="bg-factory-dark rounded-xl border border-factory-border p-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl">✅</span>
                <div>
                  <p className="text-2xl font-bold text-success">{stats.active}</p>
                  <p className="text-sm text-neutral-400">Active</p>
                </div>
              </div>
            </div>
            <div className="bg-factory-dark rounded-xl border border-factory-border p-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl">⏸️</span>
                <div>
                  <p className="text-2xl font-bold text-neutral-400">{stats.inactive}</p>
                  <p className="text-sm text-neutral-400">Inactive</p>
                </div>
              </div>
            </div>
            <div className="bg-factory-dark rounded-xl border border-factory-border p-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🛡️</span>
                <div>
                  <p className="text-2xl font-bold text-primary-400">
                    {users.filter((u) => u.role === 'FACTORY_OWNER' || u.role === 'MANAGER').length}
                  </p>
                  <p className="text-sm text-neutral-400">Admins</p>
                </div>
              </div>
            </div>
          </div>

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
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value as UserRole | 'ALL')}
                className="px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white"
              >
                <option value="ALL">All Roles</option>
                <option value="FACTORY_OWNER">Factory Owner</option>
                {assignableRoles.map((role) => (
                  <option key={role} value={role}>
                    {roleLabels[role]}
                  </option>
                ))}
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as 'ALL' | 'ACTIVE' | 'INACTIVE')}
                className="px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white"
              >
                <option value="ALL">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
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
                  {filteredUsers.map((user) => {
                    const colors = roleColors[user.role];
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
                                {user.fullName.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="text-white font-medium">{user.fullName}</p>
                              <p className="text-sm text-neutral-400">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-2.5 py-1 rounded-lg text-xs font-medium ${colors.bg} ${colors.text}`}
                          >
                            {roleLabels[user.role]}
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
                            <Link href={`/users/${user.id}`}>
                              <Button variant="ghost" size="sm">
                                View
                              </Button>
                            </Link>
                            <Link href={`/users/${user.id}/edit`}>
                              <Button variant="ghost" size="sm">
                                Edit
                              </Button>
                            </Link>
                            {user.role !== 'FACTORY_OWNER' && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedUser(user);
                                    setShowResetPassword(true);
                                  }}
                                >
                                  Reset Password
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleToggleStatus(user)}
                                  disabled={actionLoading}
                                >
                                  {user.isActive ? 'Deactivate' : 'Activate'}
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {filteredUsers.length === 0 && (
              <div className="text-center py-12">
                <span className="text-4xl">👥</span>
                <p className="text-neutral-400 mt-2">No users found</p>
                <Link href="/users/new" className="mt-4 inline-block">
                  <Button variant="secondary">Add First User</Button>
                </Link>
              </div>
            )}
          </div>
        </>
      )}

      {/* Reset Password Modal */}
      {showResetPassword && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => {
              setShowResetPassword(false);
              setSelectedUser(null);
              setNewPassword('');
            }}
          />
          <div className="relative bg-factory-dark border border-factory-border rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-white mb-4">
              Reset Password for {selectedUser.fullName}
            </h3>
            <Input
              label="New Password"
              type="password"
              placeholder="Enter new password (min 8 characters)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <div className="flex justify-end gap-3 mt-6">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowResetPassword(false);
                  setSelectedUser(null);
                  setNewPassword('');
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleResetPassword} disabled={actionLoading}>
                {actionLoading ? 'Resetting...' : 'Reset Password'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
