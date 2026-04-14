'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { StatsCard } from '@/components/molecules/StatsCard';
import {
  Customer,
  formatPKR,
} from '@/lib/types/receivables';

// Mock data
const mockCustomers: Customer[] = [
  {
    id: '1',
    code: 'CUST-001',
    name: 'Fashion Hub',
    contactPerson: 'Imran Ali',
    phone: '0300-1234567',
    email: 'imran@fashionhub.pk',
    address: '123 Main Boulevard',
    city: 'Lahore',
    ntn: '1234567-8',
    creditLimit: 1000000,
    paymentTerms: 30,
    currentBalance: 450000,
    rating: 5,
    isActive: true,
    createdAt: '2024-01-01',
    updatedAt: '2024-01-20',
  },
  {
    id: '2',
    code: 'CUST-002',
    name: 'Textile World',
    contactPerson: 'Ahmed Hassan',
    phone: '0321-9876543',
    email: 'ahmed@textileworld.com',
    address: '456 Industrial Area',
    city: 'Faisalabad',
    creditLimit: 800000,
    paymentTerms: 45,
    currentBalance: 380000,
    rating: 4,
    isActive: true,
    createdAt: '2024-01-05',
    updatedAt: '2024-01-18',
  },
  {
    id: '3',
    code: 'CUST-003',
    name: 'Garment King',
    contactPerson: 'Bilal Shah',
    phone: '0333-5551234',
    city: 'Karachi',
    creditLimit: 750000,
    paymentTerms: 30,
    currentBalance: 320000,
    rating: 4,
    isActive: true,
    createdAt: '2024-01-10',
    updatedAt: '2024-01-22',
  },
  {
    id: '4',
    code: 'CUST-004',
    name: 'Style Factory',
    contactPerson: 'Usman Raza',
    phone: '0345-7778899',
    city: 'Lahore',
    creditLimit: 500000,
    paymentTerms: 30,
    currentBalance: 275000,
    rating: 3,
    isActive: true,
    notes: 'Prefers Monday deliveries',
    createdAt: '2024-01-08',
    updatedAt: '2024-01-19',
  },
  {
    id: '5',
    code: 'CUST-005',
    name: 'Cloth House',
    contactPerson: 'Tariq Mehmood',
    phone: '0312-4445566',
    email: 'tariq@clothhouse.pk',
    city: 'Multan',
    creditLimit: 400000,
    paymentTerms: 60,
    currentBalance: 220000,
    rating: 4,
    isActive: true,
    createdAt: '2024-01-03',
    updatedAt: '2024-01-21',
  },
  {
    id: '6',
    code: 'CUST-006',
    name: 'Premium Garments',
    contactPerson: 'Faisal Khan',
    phone: '0300-9998877',
    city: 'Islamabad',
    creditLimit: 600000,
    paymentTerms: 30,
    currentBalance: 0,
    rating: 5,
    isActive: false,
    notes: 'Inactive - relocated',
    createdAt: '2023-11-15',
    updatedAt: '2024-01-05',
  },
];

export default function CustomersListPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [balanceFilter, setBalanceFilter] = useState<'all' | 'withBalance' | 'overdue'>('all');

  // Filter customers
  const filteredCustomers = useMemo(() => {
    return mockCustomers.filter((customer) => {
      const matchesSearch =
        searchQuery === '' ||
        customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.contactPerson?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.city?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && customer.isActive) ||
        (statusFilter === 'inactive' && !customer.isActive);

      const matchesBalance =
        balanceFilter === 'all' ||
        (balanceFilter === 'withBalance' && customer.currentBalance > 0) ||
        (balanceFilter === 'overdue' && customer.currentBalance > customer.creditLimit * 0.8);

      return matchesSearch && matchesStatus && matchesBalance;
    });
  }, [searchQuery, statusFilter, balanceFilter]);

  // Calculate stats
  const stats = useMemo(() => {
    const totalCustomers = mockCustomers.length;
    const activeCustomers = mockCustomers.filter((c) => c.isActive).length;
    const totalReceivables = mockCustomers.reduce((sum, c) => sum + c.currentBalance, 0);
    const overdueCount = mockCustomers.filter((c) => c.currentBalance > c.creditLimit * 0.8).length;

    return {
      totalCustomers,
      activeCustomers,
      totalReceivables,
      overdueCount,
    };
  }, []);

  // Render star rating
  const renderRating = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={star <= rating ? 'text-yellow-400' : 'text-neutral-600'}
          >
            ★
          </span>
        ))}
      </div>
    );
  };

  // Calculate credit utilization
  const getCreditUtilization = (balance: number, limit: number) => {
    if (limit === 0) return 0;
    return Math.round((balance / limit) * 100);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm">
            <Link href="/receivables" className="text-neutral-400 hover:text-white">
              Receivables
            </Link>
            <span className="text-neutral-600">/</span>
            <span className="text-white">Customers</span>
          </div>
          <h1 className="text-2xl font-semibold text-white mt-2">Customers</h1>
          <p className="text-neutral-400 mt-1">
            Manage customers and track their outstanding balances
          </p>
        </div>
        <Link href="/receivables/customers/new">
          <Button>+ Add Customer</Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Customers"
          value={stats.totalCustomers}
          icon="👥"
        />
        <StatsCard
          title="Active Customers"
          value={stats.activeCustomers}
          change={`${stats.totalCustomers - stats.activeCustomers} inactive`}
          changeType="neutral"
          icon="✓"
        />
        <StatsCard
          title="Total Receivables"
          value={formatPKR(stats.totalReceivables)}
          icon="💰"
        />
        <StatsCard
          title="Near Credit Limit"
          value={stats.overdueCount}
          change={stats.overdueCount > 0 ? 'Need attention' : 'All good'}
          changeType={stats.overdueCount > 0 ? 'negative' : 'positive'}
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
              value={balanceFilter}
              onChange={(e) => setBalanceFilter(e.target.value as typeof balanceFilter)}
              className="px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Balances</option>
              <option value="withBalance">With Balance</option>
              <option value="overdue">Near Limit</option>
            </select>
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

      {/* Customers Table */}
      <div className="bg-factory-dark rounded-2xl border border-factory-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-factory-border">
                <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">Code</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">Customer</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">Contact</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">City</th>
                <th className="text-right px-6 py-4 text-sm font-medium text-neutral-400">Balance</th>
                <th className="text-center px-6 py-4 text-sm font-medium text-neutral-400">Credit Used</th>
                <th className="text-center px-6 py-4 text-sm font-medium text-neutral-400">Rating</th>
                <th className="text-center px-6 py-4 text-sm font-medium text-neutral-400">Status</th>
                <th className="text-right px-6 py-4 text-sm font-medium text-neutral-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-factory-border">
              {filteredCustomers.map((customer) => {
                const utilization = getCreditUtilization(customer.currentBalance, customer.creditLimit);
                return (
                  <tr key={customer.id} className="hover:bg-factory-gray transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-mono text-sm text-primary-400">
                        {customer.code}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        href={`/receivables/customers/${customer.id}`}
                        className="text-white font-medium hover:text-primary-400 transition-colors"
                      >
                        {customer.name}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-white">{customer.contactPerson || '-'}</p>
                        <p className="text-sm text-neutral-400">{customer.phone}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-neutral-300">{customer.city || '-'}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span
                        className={`font-medium ${
                          customer.currentBalance > 0 ? 'text-primary-400' : 'text-success'
                        }`}
                      >
                        {formatPKR(customer.currentBalance)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-16 h-2 bg-factory-gray rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              utilization > 80 ? 'bg-error' : utilization > 50 ? 'bg-warning' : 'bg-success'
                            }`}
                            style={{ width: `${Math.min(100, utilization)}%` }}
                          />
                        </div>
                        <span className={`text-xs ${
                          utilization > 80 ? 'text-error' : utilization > 50 ? 'text-warning' : 'text-success'
                        }`}>
                          {utilization}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center">
                        {renderRating(customer.rating)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center">
                        <span
                          className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                            customer.isActive
                              ? 'bg-success/20 text-success'
                              : 'bg-neutral-500/20 text-neutral-400'
                          }`}
                        >
                          {customer.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <Link href={`/receivables/customers/${customer.id}`}>
                          <Button variant="ghost" size="sm">View</Button>
                        </Link>
                        <Link href={`/receivables/customers/${customer.id}/edit`}>
                          <Button variant="ghost" size="sm">Edit</Button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredCustomers.length === 0 && (
            <div className="text-center py-12">
              <p className="text-neutral-400">No customers found matching your search.</p>
            </div>
          )}
        </div>
      </div>

      {/* Summary Footer */}
      <div className="bg-factory-dark rounded-2xl border border-factory-border p-4">
        <div className="flex flex-wrap gap-6 text-sm">
          <div>
            <span className="text-neutral-400">Showing:</span>{' '}
            <span className="text-white font-medium">{filteredCustomers.length}</span>{' '}
            <span className="text-neutral-400">of {mockCustomers.length} customers</span>
          </div>
          <div>
            <span className="text-neutral-400">Total Outstanding:</span>{' '}
            <span className="text-primary-400 font-medium">
              {formatPKR(filteredCustomers.reduce((sum, c) => sum + c.currentBalance, 0))}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
