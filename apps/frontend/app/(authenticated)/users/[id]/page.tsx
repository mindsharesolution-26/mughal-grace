'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { useToast } from '@/contexts/ToastContext';
import { usersApi } from '@/lib/api/users';
import { User, roleLabels, roleColors, roleDescriptions } from '@/lib/types/user';

export default function UserDetailPage() {
  const router = useRouter();
  const params = useParams();
  const userId = Number(params.id);
  const { showToast } = useToast();

  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Reset password modal state
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchUser();
  }, [userId]);

  const fetchUser = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await usersApi.getById(userId);
      setUser(data);
    } catch (err: any) {
      const message = err.response?.data?.error || 'Failed to load user';
      setError(message);
      showToast('error', message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!user) return;
    try {
      setActionLoading(true);
      const result = await usersApi.toggleStatus(user.id);
      showToast('success', `User ${result.isActive ? 'activated' : 'deactivated'} successfully`);
      fetchUser();
    } catch (err: any) {
      showToast('error', err.response?.data?.error || 'Failed to update user status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!user || !newPassword || newPassword.length < 8) {
      showToast('error', 'Password must be at least 8 characters');
      return;
    }

    try {
      setActionLoading(true);
      await usersApi.resetPassword(user.id, newPassword);
      showToast('success', 'Password reset successfully');
      setShowResetPassword(false);
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
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
        <span className="ml-3 text-neutral-400">Loading user...</span>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="space-y-6">
        <div className="bg-error/10 border border-error/20 rounded-xl p-6 text-center">
          <span className="text-error text-4xl block mb-3">!</span>
          <p className="text-error mb-4">{error || 'User not found'}</p>
          <Button variant="secondary" onClick={() => router.push('/users')}>
            Back to Users
          </Button>
        </div>
      </div>
    );
  }

  const colors = roleColors[user.role];
  const isFactoryOwner = user.role === 'FACTORY_OWNER';

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm">
            <Link href="/users" className="text-neutral-400 hover:text-white">
              Users
            </Link>
            <span className="text-neutral-600">/</span>
            <span className="text-white">{user.fullName}</span>
          </div>
          <h1 className="text-2xl font-semibold text-white mt-2">User Details</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => router.back()}>
            Back
          </Button>
          <Link href={`/users/${user.id}/edit`}>
            <Button variant="secondary">Edit User</Button>
          </Link>
        </div>
      </div>

      {/* User Profile Card */}
      <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
        <div className="flex items-start gap-6">
          {/* Avatar */}
          <div className="w-20 h-20 rounded-full bg-primary-500/20 flex items-center justify-center flex-shrink-0">
            <span className="text-primary-400 text-3xl font-medium">
              {user.fullName.charAt(0).toUpperCase()}
            </span>
          </div>

          {/* Info */}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-xl font-semibold text-white">{user.fullName}</h2>
              <span
                className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                  user.isActive
                    ? 'bg-success/20 text-success'
                    : 'bg-neutral-500/20 text-neutral-400'
                }`}
              >
                {user.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <p className="text-neutral-400">{user.email}</p>
            <div className="mt-3">
              <span className={`px-3 py-1.5 rounded-lg text-sm font-medium ${colors.bg} ${colors.text}`}>
                {roleLabels[user.role]}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Account Information */}
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Account Information</h3>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-neutral-400">Email</p>
              <p className="text-white">{user.email}</p>
            </div>
            <div>
              <p className="text-sm text-neutral-400">Username</p>
              <p className="text-white">{user.username}</p>
            </div>
            <div>
              <p className="text-sm text-neutral-400">Verified</p>
              <p className="text-white">{user.isVerified ? 'Yes' : 'No'}</p>
            </div>
          </div>
        </div>

        {/* Personal Information */}
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Personal Information</h3>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-neutral-400">Full Name</p>
              <p className="text-white">{user.fullName}</p>
            </div>
            <div>
              <p className="text-sm text-neutral-400">Phone</p>
              <p className="text-white">{user.phone || 'Not provided'}</p>
            </div>
          </div>
        </div>

        {/* Role & Permissions */}
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Role & Permissions</h3>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-neutral-400">Role</p>
              <p className="text-white">{roleLabels[user.role]}</p>
              <p className="text-sm text-neutral-500 mt-1">{roleDescriptions[user.role]}</p>
            </div>
            <div>
              <p className="text-sm text-neutral-400 mb-2">Permissions</p>
              <div className="flex flex-wrap gap-2">
                {user.permissions.length > 0 ? (
                  user.permissions.map((perm) => (
                    <span
                      key={perm}
                      className="px-2 py-1 rounded-md bg-factory-gray text-neutral-300 text-xs"
                    >
                      {perm}
                    </span>
                  ))
                ) : (
                  <span className="text-neutral-500 text-sm">No specific permissions</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Activity */}
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Activity</h3>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-neutral-400">Last Login</p>
              <p className="text-white">{formatDate(user.lastLogin)}</p>
            </div>
            <div>
              <p className="text-sm text-neutral-400">Created At</p>
              <p className="text-white">{formatDate(user.createdAt)}</p>
            </div>
            <div>
              <p className="text-sm text-neutral-400">Last Updated</p>
              <p className="text-white">{formatDate(user.updatedAt)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      {!isFactoryOwner && (
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Actions</h3>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="secondary"
              onClick={() => setShowResetPassword(true)}
              disabled={actionLoading}
            >
              Reset Password
            </Button>
            <Button
              variant={user.isActive ? 'ghost' : 'secondary'}
              onClick={handleToggleStatus}
              disabled={actionLoading}
            >
              {actionLoading
                ? 'Processing...'
                : user.isActive
                ? 'Deactivate User'
                : 'Activate User'}
            </Button>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => {
              setShowResetPassword(false);
              setNewPassword('');
            }}
          />
          <div className="relative bg-factory-dark border border-factory-border rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-white mb-4">
              Reset Password for {user.fullName}
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
