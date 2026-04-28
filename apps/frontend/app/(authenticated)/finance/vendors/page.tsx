'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { StatsCard } from '@/components/molecules/StatsCard';
import { yarnVendorsApi, YarnVendor } from '@/lib/api/yarn-vendors';
import { formatPKR } from '@/lib/types/vendor';
import { Loader2, Search } from 'lucide-react';

export default function VendorsPage() {
  const [vendors, setVendors] = useState<YarnVendor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  useEffect(() => {
    loadVendors();
  }, []);

  const loadVendors = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await yarnVendorsApi.getAll();
      setVendors(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load vendors');
    } finally {
      setIsLoading(false);
    }
  };

  // Filter vendors
  const filteredVendors = useMemo(() => {
    return vendors.filter((vendor) => {
      const matchesSearch =
        searchQuery === '' ||
        vendor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        vendor.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (vendor.contactPerson?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (vendor.city?.toLowerCase() || '').includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && vendor.isActive) ||
        (statusFilter === 'inactive' && !vendor.isActive);

      return matchesSearch && matchesStatus;
    });
  }, [vendors, searchQuery, statusFilter]);

  // Calculate stats
  const stats = useMemo(() => {
    const totalVendors = vendors.length;
    const activeVendors = vendors.filter((v) => v.isActive).length;
    // For now, currentBalance would come from ledger aggregation
    // We'll show credit limit stats instead
    const totalCreditLimit = vendors.reduce((sum, v) => {
      return sum + (v.creditLimit ? parseFloat(v.creditLimit) : 0);
    }, 0);
    const avgRating = vendors.filter(v => v.rating).length > 0
      ? vendors.filter(v => v.rating).reduce((sum, v) => sum + (v.rating || 0), 0) / vendors.filter(v => v.rating).length
      : 0;

    return {
      totalVendors,
      activeVendors,
      totalCreditLimit,
      avgRating,
    };
  }, [vendors]);

  // Render rating stars
  const renderRating = (rating: number | null) => {
    if (!rating) return <span className="text-neutral-500">-</span>;
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={star <= rating ? 'text-warning' : 'text-neutral-600'}
          >
            ★
          </span>
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm">
            <Link href="/finance" className="text-neutral-400 hover:text-white">
              Finance
            </Link>
            <span className="text-neutral-600">/</span>
            <span className="text-white">Vendors</span>
          </div>
          <h1 className="text-2xl font-semibold text-white mt-2">Vendors</h1>
          <p className="text-neutral-400 mt-1">
            Manage yarn vendor information, balances, and ledgers
          </p>
        </div>
        <Link href="/finance/vendors/new">
          <Button>+ Add Vendor</Button>
        </Link>
      </div>

      {error && (
        <div className="bg-error/10 border border-error/20 rounded-xl p-4 text-error">
          {error}
          <Button variant="ghost" size="sm" onClick={loadVendors} className="ml-4">
            Retry
          </Button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Vendors"
          value={stats.totalVendors}
          icon="🏪"
        />
        <StatsCard
          title="Active Vendors"
          value={stats.activeVendors}
          change={`${stats.totalVendors - stats.activeVendors} inactive`}
          changeType="neutral"
          icon="✓"
        />
        <StatsCard
          title="Total Credit Limit"
          value={formatPKR(stats.totalCreditLimit)}
          icon="💳"
        />
        <StatsCard
          title="Avg Rating"
          value={stats.avgRating.toFixed(1)}
          change={stats.avgRating >= 4 ? 'Excellent' : stats.avgRating >= 3 ? 'Good' : 'Needs improvement'}
          changeType={stats.avgRating >= 4 ? 'positive' : stats.avgRating >= 3 ? 'neutral' : 'negative'}
          icon="⭐"
        />
      </div>

      {/* Search and Filters */}
      <div className="bg-factory-dark rounded-2xl border border-factory-border p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
            <Input
              placeholder="Search by name, code, contact, or city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
              className="px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Vendors Table */}
      <div className="bg-factory-dark rounded-2xl border border-factory-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-factory-border">
                <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">
                  Vendor
                </th>
                <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">
                  Contact
                </th>
                <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">
                  City
                </th>
                <th className="text-right px-6 py-4 text-sm font-medium text-neutral-400">
                  Credit Limit
                </th>
                <th className="text-center px-6 py-4 text-sm font-medium text-neutral-400">
                  Payment Terms
                </th>
                <th className="text-center px-6 py-4 text-sm font-medium text-neutral-400">
                  Rating
                </th>
                <th className="text-center px-6 py-4 text-sm font-medium text-neutral-400">
                  Status
                </th>
                <th className="text-right px-6 py-4 text-sm font-medium text-neutral-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-factory-border">
              {filteredVendors.map((vendor) => {
                const creditLimit = vendor.creditLimit ? parseFloat(vendor.creditLimit) : 0;

                return (
                  <tr key={vendor.id} className="hover:bg-factory-gray transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <Link
                          href={`/finance/vendors/${vendor.id}`}
                          className="text-white font-medium hover:text-primary-400"
                        >
                          {vendor.name}
                        </Link>
                        <p className="text-sm text-neutral-400 font-mono">{vendor.code}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        {vendor.contactPerson && (
                          <p className="text-white">{vendor.contactPerson}</p>
                        )}
                        <p className="text-sm text-neutral-400">{vendor.phone || '-'}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-neutral-300">
                      {vendor.city || '-'}
                    </td>
                    <td className="px-6 py-4 text-right text-neutral-300">
                      {creditLimit > 0 ? formatPKR(creditLimit) : '-'}
                    </td>
                    <td className="px-6 py-4 text-center text-neutral-300">
                      {vendor.paymentTerms} days
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center">
                        {renderRating(vendor.rating)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center">
                        <span
                          className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                            vendor.isActive
                              ? 'bg-success/20 text-success'
                              : 'bg-neutral-500/20 text-neutral-400'
                          }`}
                        >
                          {vendor.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <Link href={`/finance/vendors/${vendor.id}`}>
                          <Button variant="ghost" size="sm">
                            View
                          </Button>
                        </Link>
                        <Link href={`/finance/vendors/${vendor.id}/edit`}>
                          <Button variant="secondary" size="sm">
                            Edit
                          </Button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredVendors.length === 0 && !isLoading && (
            <div className="text-center py-12">
              <p className="text-neutral-400">No vendors found.</p>
              <Link href="/finance/vendors/new">
                <Button className="mt-4">Add Your First Vendor</Button>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Quick Tips */}
      <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
        <h3 className="text-lg font-semibold text-white mb-3">Vendor Management Tips</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="flex items-start gap-3">
            <span className="text-lg">💡</span>
            <p className="text-neutral-400">
              Click on a vendor name to view their complete ledger, payment history, and yarn purchases.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-lg">⚠️</span>
            <p className="text-neutral-400">
              Set credit limits to prevent exceeding payment capacity with any vendor.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-lg">📊</span>
            <p className="text-neutral-400">
              Use ratings to track vendor reliability and quality performance.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
