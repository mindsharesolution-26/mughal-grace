'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { StatsCard } from '@/components/molecules/StatsCard';
import { customersApi } from '@/lib/api/customers';
import {
  Customer,
  CustomerStats,
  CustomerType,
  customerTypeLabels,
  customerTypeColors,
  formatPKR,
} from '@/lib/types/customer';
import { Loader2, Search, ChevronLeft, ChevronRight } from 'lucide-react';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stats, setStats] = useState<CustomerStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [typeFilter, setTypeFilter] = useState<CustomerType | 'all'>('all');

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  useEffect(() => {
    loadData();
  }, [page, statusFilter, typeFilter]);

  useEffect(() => {
    // Debounce search
    const timer = setTimeout(() => {
      setPage(1);
      loadData();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params: any = { page, limit };
      if (searchQuery) params.search = searchQuery;
      if (statusFilter !== 'all') params.isActive = statusFilter === 'active';
      if (typeFilter !== 'all') params.customerType = typeFilter;

      const [customersResponse, statsResponse] = await Promise.all([
        customersApi.getAll(params),
        customersApi.getStats().catch(() => null),
      ]);

      setCustomers(customersResponse.customers);
      setTotalPages(customersResponse.pagination.totalPages);
      setTotal(customersResponse.pagination.total);
      setStats(statsResponse);
    } catch (err: any) {
      setError(err.message || 'Failed to load customers');
    } finally {
      setIsLoading(false);
    }
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
            <span className="text-white">Customers</span>
          </div>
          <h1 className="text-2xl font-semibold text-white mt-2">Customers</h1>
          <p className="text-neutral-400 mt-1">
            Manage customer information, balances, and ledgers
          </p>
        </div>
        <Link href="/finance/customers/new">
          <Button>+ Add Customer</Button>
        </Link>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Total Customers"
            value={stats.totalCustomers}
            icon="👥"
          />
          <StatsCard
            title="Active Customers"
            value={stats.activeCustomers}
            change={`${stats.inactiveCustomers} inactive`}
            changeType="neutral"
            icon="✓"
          />
          <StatsCard
            title="Total Outstanding"
            value={formatPKR(stats.totalOutstanding)}
            icon="💰"
          />
          <StatsCard
            title="With Balance"
            value={stats.customersWithBalance}
            change={stats.customersWithBalance > 0 ? 'Receivables pending' : 'All settled'}
            changeType={stats.customersWithBalance > 0 ? 'neutral' : 'positive'}
            icon="📊"
          />
        </div>
      )}

      {error && (
        <div className="bg-error/10 border border-error/20 rounded-xl p-4 text-error">
          {error}
          <Button variant="ghost" size="sm" onClick={loadData} className="ml-4">
            Retry
          </Button>
        </div>
      )}

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
              onChange={(e) => {
                setStatusFilter(e.target.value as 'all' | 'active' | 'inactive');
                setPage(1);
              }}
              className="px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value as CustomerType | 'all');
                setPage(1);
              }}
              className="px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Types</option>
              {Object.entries(customerTypeLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-factory-dark rounded-2xl border border-factory-border overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-factory-border">
                    <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">
                      Customer
                    </th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">
                      Contact
                    </th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">
                      City
                    </th>
                    <th className="text-center px-6 py-4 text-sm font-medium text-neutral-400">
                      Type
                    </th>
                    <th className="text-right px-6 py-4 text-sm font-medium text-neutral-400">
                      Balance
                    </th>
                    <th className="text-right px-6 py-4 text-sm font-medium text-neutral-400">
                      Credit Limit
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
                  {customers.map((customer) => {
                    const creditLimit = customer.creditLimit ? parseFloat(customer.creditLimit) : 0;
                    const isOverLimit = customer.currentBalance && creditLimit > 0 && customer.currentBalance > creditLimit;
                    const typeStyle = customerTypeColors[customer.customerType];

                    return (
                      <tr key={customer.id} className="hover:bg-factory-gray transition-colors">
                        <td className="px-6 py-4">
                          <div>
                            <Link
                              href={`/finance/customers/${customer.id}`}
                              className="text-white font-medium hover:text-primary-400"
                            >
                              {customer.name}
                            </Link>
                            <p className="text-sm text-neutral-400 font-mono">{customer.code}</p>
                            {customer.businessName && (
                              <p className="text-xs text-neutral-500">{customer.businessName}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            {customer.contactPerson && (
                              <p className="text-white">{customer.contactPerson}</p>
                            )}
                            <p className="text-sm text-neutral-400">{customer.phone || '-'}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-neutral-300">
                          {customer.city || '-'}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-center">
                            <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${typeStyle.bg} ${typeStyle.text}`}>
                              {customerTypeLabels[customer.customerType]}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className={`font-medium ${isOverLimit ? 'text-error' : customer.currentBalance && customer.currentBalance > 0 ? 'text-warning' : 'text-success'}`}>
                            {formatPKR(customer.currentBalance || 0)}
                          </span>
                          {isOverLimit && (
                            <p className="text-xs text-error">Over limit!</p>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right text-neutral-300">
                          {creditLimit > 0 ? formatPKR(creditLimit) : '-'}
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
                            <Link href={`/finance/customers/${customer.id}`}>
                              <Button variant="ghost" size="sm">
                                View
                              </Button>
                            </Link>
                            <Link href={`/finance/customers/${customer.id}/edit`}>
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

              {customers.length === 0 && !isLoading && (
                <div className="text-center py-12">
                  <p className="text-neutral-400">No customers found.</p>
                  <Link href="/finance/customers/new">
                    <Button className="mt-4">Add Your First Customer</Button>
                  </Link>
                </div>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-factory-border">
                <p className="text-sm text-neutral-400">
                  Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} customers
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="flex items-center px-3 text-sm text-neutral-400">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Quick Tips */}
      <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
        <h3 className="text-lg font-semibold text-white mb-3">Customer Management Tips</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="flex items-start gap-3">
            <span className="text-lg">💡</span>
            <p className="text-neutral-400">
              Click on a customer name to view their complete ledger, payment history, and orders.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-lg">⚠️</span>
            <p className="text-neutral-400">
              Customers with balance over their credit limit are highlighted in red.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-lg">📊</span>
            <p className="text-neutral-400">
              Set opening balances for customers who already have outstanding amounts.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
