'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { StatsCard } from '@/components/molecules/StatsCard';
import { yarnVendorsApi, YarnVendor } from '@/lib/api/yarn-vendors';
import { useToast } from '@/contexts/ToastContext';

// Format PKR currency
const formatPKR = (amount: number | string | null) => {
  const num = typeof amount === 'string' ? parseFloat(amount) : (amount ?? 0);
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
};

export default function YarnVendorsPage() {
  const { showToast } = useToast();
  const [vendors, setVendors] = useState<YarnVendor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Fetch vendors on mount
  useEffect(() => {
    const fetchVendors = async () => {
      try {
        const data = await yarnVendorsApi.getAll();
        setVendors(data);
      } catch (error: any) {
        console.error('Failed to fetch vendors:', error);
        showToast('error', 'Failed to load vendors');
      } finally {
        setIsLoading(false);
      }
    };

    fetchVendors();
  }, [showToast]);

  // Filter vendors based on search and status
  const filteredVendors = useMemo(() => {
    return vendors.filter((vendor) => {
      const matchesSearch =
        searchQuery === '' ||
        vendor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        vendor.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (vendor.contactPerson?.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (vendor.city?.toLowerCase().includes(searchQuery.toLowerCase()));

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
    // TODO: Add currentBalance tracking when ledger is implemented
    const totalOutstanding = 0;

    return {
      totalVendors,
      activeVendors,
      totalOutstanding,
    };
  }, [vendors]);

  // Render star rating
  const renderRating = (rating: number | null) => {
    const ratingValue = rating ?? 0;
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={star <= ratingValue ? 'text-yellow-400' : 'text-neutral-600'}
          >
            ★
          </span>
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-neutral-400">Loading vendors...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm">
            <Link href="/yarn" className="text-neutral-400 hover:text-white">
              Yarn
            </Link>
            <span className="text-neutral-600">/</span>
            <span className="text-white">Vendors</span>
          </div>
          <h1 className="text-2xl font-semibold text-white mt-2">Yarn Vendors</h1>
          <p className="text-neutral-400 mt-1">
            Manage yarn suppliers and track transactions
          </p>
        </div>
        <Link href="/yarn/vendors/new">
          <Button>+ Add Vendor</Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatsCard
          title="Total Vendors"
          value={stats.totalVendors}
          icon="🏭"
        />
        <StatsCard
          title="Active Vendors"
          value={stats.activeVendors}
          change={`${stats.totalVendors - stats.activeVendors} inactive`}
          changeType="neutral"
          icon="✓"
        />
        <StatsCard
          title="Total Outstanding"
          value={formatPKR(stats.totalOutstanding)}
          icon="💰"
        />
      </div>

      {/* Search and Filters */}
      <div className="bg-factory-dark rounded-2xl border border-factory-border p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="Search by name, code, contact, or city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
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
                  Code
                </th>
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
              {filteredVendors.map((vendor) => (
                <tr key={vendor.id} className="hover:bg-factory-gray transition-colors">
                  <td className="px-6 py-4">
                    <span className="font-mono text-sm text-primary-400">
                      {vendor.code}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <Link
                        href={`/yarn/vendors/${vendor.id}`}
                        className="text-white font-medium hover:text-primary-400 transition-colors"
                      >
                        {vendor.name}
                      </Link>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-white">{vendor.contactPerson || '-'}</p>
                      <p className="text-sm text-neutral-400">{vendor.phone || '-'}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-neutral-300">{vendor.city || '-'}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="font-medium text-white">
                      {formatPKR(vendor.creditLimit)}
                    </span>
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
                      <Link href={`/yarn/vendors/${vendor.id}`}>
                        <Button variant="ghost" size="sm">
                          View
                        </Button>
                      </Link>
                      <Link href={`/yarn/vendors/${vendor.id}/edit`}>
                        <Button variant="ghost" size="sm">
                          Edit
                        </Button>
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredVendors.length === 0 && (
            <div className="text-center py-12">
              <p className="text-neutral-400">
                {vendors.length === 0
                  ? 'No vendors yet. Add your first vendor to get started.'
                  : 'No vendors found matching your search.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Summary Footer */}
      <div className="bg-factory-dark rounded-2xl border border-factory-border p-4">
        <div className="flex flex-wrap gap-6 text-sm">
          <div>
            <span className="text-neutral-400">Showing:</span>{' '}
            <span className="text-white font-medium">{filteredVendors.length}</span>{' '}
            <span className="text-neutral-400">of {vendors.length} vendors</span>
          </div>
        </div>
      </div>
    </div>
  );
}
