'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { StatsCard } from '@/components/molecules/StatsCard';
import {
  receivablesApi,
  ReceivablesSummary,
  AgingData,
} from '@/lib/api/receivables';
import { Loader2, RefreshCw, AlertCircle } from 'lucide-react';

// Format currency
const formatPKR = (amount: number) => {
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const statusConfig = {
  PENDING: { label: 'Pending', color: 'bg-neutral-500/20 text-neutral-300' },
  CONFIRMED: { label: 'Confirmed', color: 'bg-primary-500/20 text-primary-400' },
  DISPATCHED: { label: 'Dispatched', color: 'bg-warning/20 text-warning' },
  COMPLETED: { label: 'Completed', color: 'bg-success/20 text-success' },
  CANCELLED: { label: 'Cancelled', color: 'bg-error/20 text-error' },
};

export default function SalesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'orders' | 'customers' | 'outstanding'>('orders');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<ReceivablesSummary | null>(null);
  const [agingData, setAgingData] = useState<AgingData[]>([]);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [summaryData, aging] = await Promise.all([
        receivablesApi.getSummary().catch(() => null),
        receivablesApi.getAgingReport().catch(() => []),
      ]);

      setSummary(summaryData);
      setAgingData(aging);
    } catch (err: any) {
      setError(err.message || 'Failed to load sales data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Calculate aging buckets
  const agingBuckets = useMemo(() => {
    const buckets = {
      current: 0,
      days1To30: 0,
      days31To60: 0,
      days61To90: 0,
      daysOver90: 0,
    };

    for (const entry of agingData) {
      const balance = Number(entry.currentBalance) || 0;
      const overdueDays = entry.overdueDays || 0;

      if (overdueDays <= 0) {
        buckets.current += balance;
      } else if (overdueDays <= 30) {
        buckets.days1To30 += balance;
      } else if (overdueDays <= 60) {
        buckets.days31To60 += balance;
      } else if (overdueDays <= 90) {
        buckets.days61To90 += balance;
      } else {
        buckets.daysOver90 += balance;
      }
    }

    return buckets;
  }, [agingData]);

  // Filter customers for search
  const filteredCustomers = useMemo(() => {
    if (!searchQuery) return agingData;
    const query = searchQuery.toLowerCase();
    return agingData.filter((entry) =>
      entry.customer?.name?.toLowerCase().includes(query) ||
      entry.customer?.businessName?.toLowerCase().includes(query)
    );
  }, [agingData, searchQuery]);

  const totalOutstanding = Number(summary?.totalReceivables) || 0;
  const totalOverdue = Number(summary?.totalOverdue) || 0;
  const customerCount = summary?.customerCount || 0;

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
          <h1 className="text-2xl font-semibold text-white">Sales</h1>
          <p className="text-neutral-400 mt-1">
            Manage orders, customers, and receivables
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="ghost" size="sm" onClick={loadData} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Link href="/receivables">
            <Button variant="secondary">View Receivables</Button>
          </Link>
        </div>
      </div>

      {error && (
        <div className="bg-error/10 border border-error/20 rounded-xl p-4 text-error">
          {error}
          <Button variant="ghost" size="sm" onClick={loadData} className="ml-4">
            Retry
          </Button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Receivables"
          value={formatPKR(totalOutstanding)}
          change={`${customerCount} customers`}
          changeType="neutral"
          icon="💰"
        />
        <StatsCard
          title="Overdue Amount"
          value={formatPKR(totalOverdue)}
          change={totalOverdue > 0 ? 'Needs follow-up' : 'All current'}
          changeType={totalOverdue > 0 ? 'negative' : 'positive'}
          icon="⚠️"
        />
        <StatsCard
          title="Pending Cheques"
          value={formatPKR(summary?.pendingCheques || 0)}
          change="Awaiting clearance"
          changeType="neutral"
          icon="📝"
        />
        <StatsCard
          title="Recent Payments"
          value={summary?.recentPayments?.length || 0}
          change="This week"
          changeType="positive"
          icon="✅"
        />
      </div>

      {/* Tabs */}
      <div className="border-b border-factory-border">
        <div className="flex gap-4">
          {[
            { key: 'orders', label: 'Sales Orders' },
            { key: 'customers', label: 'Customers' },
            { key: 'outstanding', label: 'Outstanding' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as typeof activeTab)}
              className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === key
                  ? 'border-primary-500 text-primary-400'
                  : 'border-transparent text-neutral-400 hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'orders' && (
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary-500/20 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-primary-400" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Sales Orders Coming Soon</h3>
          <p className="text-neutral-400 max-w-md mx-auto mb-4">
            The sales orders module is under development. In the meantime, you can track customer receivables and outstanding balances.
          </p>
          <div className="flex gap-3 justify-center">
            <Link href="/receivables">
              <Button>View Receivables</Button>
            </Link>
            <Link href="/cheques?type=RECEIVED">
              <Button variant="secondary">View Received Cheques</Button>
            </Link>
          </div>
        </div>
      )}

      {activeTab === 'customers' && (
        <>
          {/* Search */}
          <div className="bg-factory-dark rounded-2xl border border-factory-border p-4">
            <Input
              placeholder="Search by customer name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCustomers.map((entry) => (
              <div
                key={entry.customerId}
                className="bg-factory-dark rounded-2xl border border-factory-border p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      {entry.customer?.name || `Customer #${entry.customerId}`}
                    </h3>
                    {entry.customer?.businessName && (
                      <p className="text-sm text-neutral-400">{entry.customer.businessName}</p>
                    )}
                  </div>
                  {entry.creditLimit > 0 && (
                    <span
                      className={`px-2 py-1 text-xs rounded ${
                        entry.currentBalance / entry.creditLimit > 0.8
                          ? 'bg-error/20 text-error'
                          : entry.currentBalance / entry.creditLimit > 0.5
                          ? 'bg-warning/20 text-warning'
                          : 'bg-success/20 text-success'
                      }`}
                    >
                      {Math.round((entry.currentBalance / entry.creditLimit) * 100)}% used
                    </span>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-neutral-400">Outstanding</span>
                    <span className={`font-medium ${entry.currentBalance > 0 ? 'text-error' : 'text-success'}`}>
                      {formatPKR(Number(entry.currentBalance))}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-neutral-400">Credit Limit</span>
                    <span className="text-neutral-300">
                      {formatPKR(Number(entry.creditLimit))}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-neutral-400">Available Credit</span>
                    <span className="text-success">
                      {formatPKR(Number(entry.availableCredit))}
                    </span>
                  </div>
                  {entry.isOverdue && (
                    <div className="flex justify-between">
                      <span className="text-sm text-error">Overdue</span>
                      <span className="text-error font-medium">
                        {formatPKR(Number(entry.overdueAmount))} ({entry.overdueDays} days)
                      </span>
                    </div>
                  )}
                  {entry.pendingChequeCount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-sm text-neutral-400">Pending Cheques</span>
                      <span className="text-warning">
                        {entry.pendingChequeCount} ({formatPKR(Number(entry.pendingChequeAmount))})
                      </span>
                    </div>
                  )}
                </div>

                {/* Credit usage bar */}
                {entry.creditLimit > 0 && (
                  <div className="mt-4 pt-4 border-t border-factory-border">
                    <div className="h-2 bg-factory-gray rounded-full overflow-hidden">
                      <div
                        className={`h-full ${
                          entry.currentBalance / entry.creditLimit > 0.8
                            ? 'bg-error'
                            : entry.currentBalance / entry.creditLimit > 0.5
                            ? 'bg-warning'
                            : 'bg-success'
                        }`}
                        style={{
                          width: `${Math.min(
                            (entry.currentBalance / entry.creditLimit) * 100,
                            100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                )}

                <div className="flex gap-2 mt-4">
                  <Link href={`/receivables/customers/${entry.customerId}`} className="flex-1">
                    <Button variant="secondary" size="sm" className="w-full">
                      View Ledger
                    </Button>
                  </Link>
                </div>
              </div>
            ))}

            {filteredCustomers.length === 0 && (
              <div className="col-span-full text-center py-8 text-neutral-400">
                No customers found
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'outstanding' && (
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
          <h2 className="text-lg font-semibold text-white mb-4">
            Outstanding Summary
          </h2>

          {/* Aging Buckets */}
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 mb-6">
            {[
              { label: 'Current', amount: agingBuckets.current, color: 'text-neutral-300' },
              { label: '1-30 Days', amount: agingBuckets.days1To30, color: 'text-success' },
              { label: '31-60 Days', amount: agingBuckets.days31To60, color: 'text-warning' },
              { label: '61-90 Days', amount: agingBuckets.days61To90, color: 'text-orange-500' },
              { label: '90+ Days', amount: agingBuckets.daysOver90, color: 'text-error' },
            ].map((bucket) => (
              <div
                key={bucket.label}
                className="bg-factory-gray rounded-xl p-4 text-center"
              >
                <p className="text-sm text-neutral-400">{bucket.label}</p>
                <p className={`text-xl font-bold mt-1 ${bucket.color}`}>
                  {formatPKR(bucket.amount)}
                </p>
              </div>
            ))}
          </div>

          {/* Outstanding by Customer */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-factory-border">
                  <th className="text-left px-4 py-3 text-sm font-medium text-neutral-400">
                    Customer
                  </th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-neutral-400">
                    Balance
                  </th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-neutral-400">
                    Credit Limit
                  </th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-neutral-400">
                    Overdue
                  </th>
                  <th className="text-center px-4 py-3 text-sm font-medium text-neutral-400">
                    Days
                  </th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-neutral-400">
                    Pending Cheques
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-factory-border">
                {agingData
                  .filter(entry => Number(entry.currentBalance) > 0)
                  .sort((a, b) => Number(b.currentBalance) - Number(a.currentBalance))
                  .map((entry) => (
                    <tr
                      key={entry.customerId}
                      className="hover:bg-factory-gray transition-colors"
                    >
                      <td className="px-4 py-3">
                        <Link href={`/receivables/customers/${entry.customerId}`}>
                          <span className="text-white hover:text-primary-400">
                            {entry.customer?.name || `Customer #${entry.customerId}`}
                          </span>
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-right text-white font-medium">
                        {formatPKR(Number(entry.currentBalance))}
                      </td>
                      <td className="px-4 py-3 text-right text-neutral-400">
                        {formatPKR(Number(entry.creditLimit))}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={entry.overdueAmount > 0 ? 'text-error' : 'text-neutral-400'}>
                          {formatPKR(Number(entry.overdueAmount))}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 text-xs rounded ${
                          entry.overdueDays > 90
                            ? 'bg-error/20 text-error'
                            : entry.overdueDays > 30
                            ? 'bg-warning/20 text-warning'
                            : entry.overdueDays > 0
                            ? 'bg-success/20 text-success'
                            : 'bg-neutral-500/20 text-neutral-400'
                        }`}>
                          {entry.overdueDays > 0 ? `${entry.overdueDays}d` : 'Current'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-warning">
                        {entry.pendingChequeCount > 0
                          ? `${entry.pendingChequeCount} (${formatPKR(Number(entry.pendingChequeAmount))})`
                          : '-'
                        }
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>

            {agingData.filter(entry => Number(entry.currentBalance) > 0).length === 0 && (
              <div className="text-center py-8 text-neutral-400">
                No outstanding balances
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
