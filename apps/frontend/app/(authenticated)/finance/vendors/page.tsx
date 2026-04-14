'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { StatsCard } from '@/components/molecules/StatsCard';
import { YarnVendor, formatPKR } from '@/lib/types/vendor';

// Mock data
const mockVendors: YarnVendor[] = [
  {
    id: '1',
    code: 'VND-001',
    name: 'Textile Hub',
    contactPerson: 'Ahmad Khan',
    phone: '0300-1234567',
    email: 'ahmad@textilehub.pk',
    address: '123 Industrial Area',
    city: 'Faisalabad',
    country: 'Pakistan',
    creditLimit: 500000,
    paymentTerms: 30,
    currentBalance: 125000,
    rating: 4,
    isActive: true,
    createdAt: '2024-01-01',
    updatedAt: '2024-01-20',
  },
  {
    id: '2',
    code: 'VND-002',
    name: 'Yarn Masters',
    contactPerson: 'Bilal Ahmed',
    phone: '0321-9876543',
    email: 'bilal@yarnmasters.com',
    address: '456 Textile Market',
    city: 'Karachi',
    country: 'Pakistan',
    creditLimit: 1000000,
    paymentTerms: 45,
    currentBalance: 280000,
    rating: 5,
    isActive: true,
    createdAt: '2024-01-05',
    updatedAt: '2024-01-22',
  },
  {
    id: '3',
    code: 'VND-003',
    name: 'Fiber Co',
    contactPerson: 'Usman Ali',
    phone: '0333-5555555',
    email: 'usman@fiberco.pk',
    address: '789 Mill Road',
    city: 'Lahore',
    country: 'Pakistan',
    creditLimit: 750000,
    paymentTerms: 30,
    currentBalance: 95000,
    rating: 4,
    isActive: true,
    createdAt: '2024-01-10',
    updatedAt: '2024-01-18',
  },
  {
    id: '4',
    code: 'VND-004',
    name: 'Cotton World',
    contactPerson: 'Rashid Malik',
    phone: '0345-1111111',
    address: '321 Cotton Plaza',
    city: 'Multan',
    country: 'Pakistan',
    creditLimit: 300000,
    paymentTerms: 15,
    currentBalance: 45000,
    rating: 3,
    isActive: true,
    createdAt: '2024-01-12',
    updatedAt: '2024-01-15',
  },
  {
    id: '5',
    code: 'VND-005',
    name: 'Premium Yarns',
    contactPerson: 'Asad Shah',
    phone: '0312-2222222',
    email: 'asad@premiumyarns.pk',
    city: 'Faisalabad',
    country: 'Pakistan',
    creditLimit: 600000,
    paymentTerms: 30,
    currentBalance: 0,
    rating: 5,
    isActive: false,
    notes: 'Temporarily inactive due to quality issues',
    createdAt: '2024-01-08',
    updatedAt: '2024-01-19',
  },
];

export default function VendorsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Filter vendors
  const filteredVendors = useMemo(() => {
    return mockVendors.filter((vendor) => {
      const matchesSearch =
        searchQuery === '' ||
        vendor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        vendor.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        vendor.contactPerson.toLowerCase().includes(searchQuery.toLowerCase()) ||
        vendor.city?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && vendor.isActive) ||
        (statusFilter === 'inactive' && !vendor.isActive);

      return matchesSearch && matchesStatus;
    });
  }, [searchQuery, statusFilter]);

  // Calculate stats
  const stats = useMemo(() => {
    const totalVendors = mockVendors.length;
    const activeVendors = mockVendors.filter((v) => v.isActive).length;
    const totalOutstanding = mockVendors.reduce((sum, v) => sum + v.currentBalance, 0);
    const overCreditLimit = mockVendors.filter(
      (v) => v.currentBalance > v.creditLimit
    ).length;

    return {
      totalVendors,
      activeVendors,
      totalOutstanding,
      overCreditLimit,
    };
  }, []);

  // Render rating stars
  const renderRating = (rating: number) => {
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
            Manage vendor information, balances, and ledgers
          </p>
        </div>
        <Link href="/finance/vendors/new">
          <Button>+ Add Vendor</Button>
        </Link>
      </div>

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
          title="Total Outstanding"
          value={formatPKR(stats.totalOutstanding)}
          icon="💳"
        />
        <StatsCard
          title="Over Credit Limit"
          value={stats.overCreditLimit}
          change={stats.overCreditLimit > 0 ? 'Needs attention' : 'All within limit'}
          changeType={stats.overCreditLimit > 0 ? 'negative' : 'positive'}
          icon="⚠️"
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
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
              className="px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <Button variant="ghost">Export</Button>
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
                  Balance
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
              {filteredVendors.map((vendor) => {
                const isOverLimit = vendor.currentBalance > vendor.creditLimit;

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
                        <p className="text-white">{vendor.contactPerson}</p>
                        <p className="text-sm text-neutral-400">{vendor.phone}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-neutral-300">
                      {vendor.city || '-'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`font-medium ${isOverLimit ? 'text-error' : 'text-white'}`}>
                        {formatPKR(vendor.currentBalance)}
                      </span>
                      {isOverLimit && (
                        <p className="text-xs text-error">Over limit!</p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right text-neutral-300">
                      {formatPKR(vendor.creditLimit)}
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

          {filteredVendors.length === 0 && (
            <div className="text-center py-12">
              <p className="text-neutral-400">No vendors found.</p>
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
              Vendors with balance over their credit limit are highlighted in red.
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
