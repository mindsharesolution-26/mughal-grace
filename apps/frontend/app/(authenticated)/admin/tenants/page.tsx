'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import { adminApi, TenantListItem, AdminStats } from '@/lib/api/admin';

export default function AdminTenantsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { showToast } = useToast();

  const [tenants, setTenants] = useState<TenantListItem[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Check if user is SUPER_ADMIN
  useEffect(() => {
    if (user && user.role !== 'SUPER_ADMIN') {
      router.push('/dashboard');
      showToast('error', 'Access denied. Super Admin only.');
    }
  }, [user, router, showToast]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [tenantsData, statsData] = await Promise.all([
        adminApi.getTenants(),
        adminApi.getStats(),
      ]);
      setTenants(tenantsData);
      setStats(statsData);
    } catch (err: any) {
      const message = err.response?.data?.error || 'Failed to load data';
      setError(message);
      showToast('error', message);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredTenants = tenants.filter((tenant) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      tenant.name.toLowerCase().includes(searchLower) ||
      tenant.ownerName.toLowerCase().includes(searchLower) ||
      tenant.ownerEmail.toLowerCase().includes(searchLower) ||
      tenant.slug.toLowerCase().includes(searchLower)
    );
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-success/20 text-success';
      case 'SUSPENDED':
        return 'bg-warning/20 text-warning';
      case 'INACTIVE':
        return 'bg-neutral-500/20 text-neutral-400';
      default:
        return 'bg-neutral-500/20 text-neutral-400';
    }
  };

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'PROFESSIONAL':
        return 'bg-primary-500/20 text-primary-400';
      case 'ENTERPRISE':
        return 'bg-purple-500/20 text-purple-400';
      case 'STARTER':
        return 'bg-blue-500/20 text-blue-400';
      default:
        return 'bg-neutral-500/20 text-neutral-400';
    }
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

  if (!user || user.role !== 'SUPER_ADMIN') {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">All Factories</h1>
          <p className="text-neutral-400 mt-1">
            Platform-level view of all registered factories
          </p>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
          <span className="ml-3 text-neutral-400">Loading factories...</span>
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div className="bg-error/10 border border-error/20 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-error text-xl">!</span>
            <span className="text-error">{error}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={fetchData}>
            Retry
          </Button>
        </div>
      )}

      {!isLoading && !error && (
        <>
          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-factory-dark rounded-xl border border-factory-border p-4">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🏭</span>
                  <div>
                    <p className="text-2xl font-bold text-white">{stats.totalTenants}</p>
                    <p className="text-sm text-neutral-400">Total Factories</p>
                  </div>
                </div>
              </div>
              <div className="bg-factory-dark rounded-xl border border-factory-border p-4">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">✅</span>
                  <div>
                    <p className="text-2xl font-bold text-success">{stats.activeTenants}</p>
                    <p className="text-sm text-neutral-400">Active</p>
                  </div>
                </div>
              </div>
              <div className="bg-factory-dark rounded-xl border border-factory-border p-4">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">👥</span>
                  <div>
                    <p className="text-2xl font-bold text-white">{stats.totalUsers}</p>
                    <p className="text-sm text-neutral-400">Total Users</p>
                  </div>
                </div>
              </div>
              <div className="bg-factory-dark rounded-xl border border-factory-border p-4">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🛡️</span>
                  <div>
                    <p className="text-2xl font-bold text-primary-400">{stats.superAdmins}</p>
                    <p className="text-sm text-neutral-400">Super Admins</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="bg-factory-dark rounded-2xl border border-factory-border p-4">
            <Input
              placeholder="Search by factory name, owner, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Tenants Table */}
          <div className="bg-factory-dark rounded-2xl border border-factory-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-factory-border">
                    <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">
                      Factory
                    </th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">
                      Owner
                    </th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">
                      Status
                    </th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">
                      Plan
                    </th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">
                      Users
                    </th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">
                      Created
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-factory-border">
                  {filteredTenants.map((tenant) => (
                    <tr
                      key={tenant.id}
                      className="hover:bg-factory-gray transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-white font-medium">{tenant.name}</p>
                          <p className="text-sm text-neutral-400">{tenant.slug}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-white">{tenant.ownerName}</p>
                          <p className="text-sm text-neutral-400">{tenant.ownerEmail}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium ${getStatusColor(
                            tenant.status
                          )}`}
                        >
                          {tenant.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium ${getPlanColor(
                            tenant.plan
                          )}`}
                        >
                          {tenant.plan}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-white font-medium">{tenant.userCount}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-neutral-400 text-sm">
                          {formatDate(tenant.createdAt)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredTenants.length === 0 && (
              <div className="text-center py-12">
                <span className="text-4xl">🏭</span>
                <p className="text-neutral-400 mt-2">No factories found</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
