'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/atoms/Button';
import { StatsCard } from '@/components/molecules/StatsCard';
import { ChequeStatusBadge } from '@/components/atoms/StatusBadge';
import {
  receivablesApi,
  customerPaymentsApi,
  ReceivablesSummary,
  AgingData,
  CustomerPayment
} from '@/lib/api/receivables';
import { chequesApi, Cheque } from '@/lib/api/cheques';
import { Loader2, RefreshCw } from 'lucide-react';

// Format currency
const formatPKR = (amount: number) => {
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export default function ReceivablesPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [summary, setSummary] = useState<ReceivablesSummary | null>(null);
  const [agingData, setAgingData] = useState<AgingData[]>([]);
  const [pendingCheques, setPendingCheques] = useState<Cheque[]>([]);
  const [recentPayments, setRecentPayments] = useState<CustomerPayment[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [summaryData, aging, cheques, payments] = await Promise.all([
        receivablesApi.getSummary().catch(() => null),
        receivablesApi.getAgingReport().catch(() => []),
        chequesApi.getAll({ type: 'RECEIVED', status: 'PENDING', limit: 5 }).catch(() => ({ data: [] })),
        customerPaymentsApi.getAll({ limit: 5 }).catch(() => ({ data: [] })),
      ]);

      setSummary(summaryData);
      setAgingData(aging || []);
      setPendingCheques(cheques.data || []);
      setRecentPayments(payments.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-PK', {
      month: 'short',
      day: 'numeric',
    });
  };

  // Calculate aging buckets from data
  const agingBuckets = {
    current: agingData.filter(a => !a.isOverdue).reduce((sum, a) => sum + Number(a.currentBalance), 0),
    overdue: agingData.filter(a => a.isOverdue && a.overdueDays <= 30).reduce((sum, a) => sum + Number(a.overdueAmount), 0),
    overdue30: agingData.filter(a => a.overdueDays > 30 && a.overdueDays <= 60).reduce((sum, a) => sum + Number(a.overdueAmount), 0),
    overdue60: agingData.filter(a => a.overdueDays > 60 && a.overdueDays <= 90).reduce((sum, a) => sum + Number(a.overdueAmount), 0),
    overdue90: agingData.filter(a => a.overdueDays > 90).reduce((sum, a) => sum + Number(a.overdueAmount), 0),
  };

  // Top customers by balance
  const topCustomers = agingData
    .sort((a, b) => Number(b.currentBalance) - Number(a.currentBalance))
    .slice(0, 5);

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
          <h1 className="text-2xl font-semibold text-white">Receivables</h1>
          <p className="text-neutral-400 mt-1">
            Track customer payments and outstanding balances
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="ghost" onClick={loadData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Link href="/receivables/customers/new">
            <Button variant="secondary">+ Add Customer</Button>
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

      {/* Main Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Receivables"
          value={formatPKR(Number(summary?.totalReceivables) || 0)}
          icon="💰"
        />
        <StatsCard
          title="Overdue Amount"
          value={formatPKR(Number(summary?.totalOverdue) || 0)}
          change="Needs follow-up"
          changeType={Number(summary?.totalOverdue) > 0 ? 'negative' : 'positive'}
          icon="⚠️"
        />
        <StatsCard
          title="Pending Cheques"
          value={formatPKR(Number(summary?.pendingCheques) || 0)}
          change={`${pendingCheques.length} cheques`}
          changeType="neutral"
          icon="📝"
        />
        <StatsCard
          title="Customers"
          value={summary?.customerCount || 0}
          change="With balance"
          changeType="neutral"
          icon="👥"
        />
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/receivables/customers" className="block">
          <div className="bg-factory-dark rounded-2xl border border-factory-border p-5 hover:border-primary-500/50 transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary-500/20 flex items-center justify-center text-2xl">
                👥
              </div>
              <div>
                <p className="text-white font-medium">Customers</p>
                <p className="text-sm text-neutral-400">
                  Manage customer accounts
                </p>
              </div>
            </div>
          </div>
        </Link>
        <Link href="/receivables/aging" className="block">
          <div className="bg-factory-dark rounded-2xl border border-factory-border p-5 hover:border-warning/50 transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-warning/20 flex items-center justify-center text-2xl">
                📊
              </div>
              <div>
                <p className="text-white font-medium">Aging Report</p>
                <p className="text-sm text-neutral-400">
                  Detailed aging analysis
                </p>
              </div>
            </div>
          </div>
        </Link>
        <Link href="/cheques?type=RECEIVED" className="block">
          <div className="bg-factory-dark rounded-2xl border border-factory-border p-5 hover:border-success/50 transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-success/20 flex items-center justify-center text-2xl">
                📝
              </div>
              <div>
                <p className="text-white font-medium">Received Cheques</p>
                <p className="text-sm text-neutral-400">
                  Track cheque status
                </p>
              </div>
            </div>
          </div>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Aging Summary */}
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Aging Summary</h2>
            <Link href="/receivables/aging">
              <Button variant="ghost" size="sm">View Report</Button>
            </Link>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-factory-gray rounded-xl">
              <span className="text-sm text-neutral-300">Current (Not Due)</span>
              <span className="text-white font-medium">{formatPKR(agingBuckets.current)}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-factory-gray rounded-xl">
              <span className="text-sm text-warning">1-30 Days Overdue</span>
              <span className="text-warning font-medium">{formatPKR(agingBuckets.overdue)}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-factory-gray rounded-xl">
              <span className="text-sm text-warning">31-60 Days</span>
              <span className="text-warning font-medium">{formatPKR(agingBuckets.overdue30)}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-factory-gray rounded-xl">
              <span className="text-sm text-error">61-90 Days</span>
              <span className="text-error font-medium">{formatPKR(agingBuckets.overdue60)}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-factory-gray rounded-xl">
              <span className="text-sm text-error">90+ Days</span>
              <span className="text-error font-medium">{formatPKR(agingBuckets.overdue90)}</span>
            </div>
          </div>
        </div>

        {/* Pending Cheques */}
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Pending Cheques</h2>
            <Link href="/cheques?type=RECEIVED&status=PENDING">
              <Button variant="ghost" size="sm">View All</Button>
            </Link>
          </div>
          {pendingCheques.length === 0 ? (
            <p className="text-neutral-400 text-center py-8">No pending cheques</p>
          ) : (
            <div className="space-y-3">
              {pendingCheques.map((cheque) => (
                <Link
                  key={cheque.id}
                  href={`/cheques/${cheque.id}`}
                  className="flex items-center justify-between p-3 bg-factory-gray rounded-xl hover:bg-factory-border transition-colors"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-white text-sm">#{cheque.chequeNumber}</p>
                      <ChequeStatusBadge status={cheque.status} />
                    </div>
                    <p className="text-xs text-neutral-400">
                      {cheque.customer?.name || 'Unknown'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-medium">{formatPKR(Number(cheque.amount))}</p>
                    <p className="text-xs text-neutral-400">Due: {formatDate(cheque.chequeDate)}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Top Customers by Outstanding */}
      <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Top Customers by Outstanding</h2>
          <Link href="/receivables/customers">
            <Button variant="ghost" size="sm">View All</Button>
          </Link>
        </div>
        {topCustomers.length === 0 ? (
          <p className="text-neutral-400 text-center py-8">No outstanding balances</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-factory-border">
                  <th className="text-left px-4 py-3 text-sm font-medium text-neutral-400">Customer</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-neutral-400">Outstanding</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-neutral-400">Credit Limit</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-neutral-400">Utilization</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-factory-border">
                {topCustomers.map((customer) => {
                  const balance = Number(customer.currentBalance);
                  const limit = Number(customer.creditLimit) || 1;
                  const utilization = (balance / limit) * 100;
                  return (
                    <tr key={customer.customerId} className="hover:bg-factory-gray/50 transition-colors">
                      <td className="px-4 py-3">
                        <Link
                          href={`/receivables/customers/${customer.customerId}`}
                          className="text-white hover:text-primary-400"
                        >
                          {customer.customer?.name || `Customer #${customer.customerId}`}
                        </Link>
                        {customer.isOverdue && (
                          <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-error/20 text-error">
                            {customer.overdueDays}d overdue
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-white font-medium">
                        {formatPKR(balance)}
                      </td>
                      <td className="px-4 py-3 text-right text-neutral-400">
                        {formatPKR(Number(customer.creditLimit) || 0)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-20 h-2 bg-factory-gray rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                utilization > 80 ? 'bg-error' : utilization > 50 ? 'bg-warning' : 'bg-success'
                              }`}
                              style={{ width: `${Math.min(100, utilization)}%` }}
                            />
                          </div>
                          <span className={`text-sm ${
                            utilization > 80 ? 'text-error' : utilization > 50 ? 'text-warning' : 'text-success'
                          }`}>
                            {utilization.toFixed(0)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Payments */}
      <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Recent Payments</h2>
        </div>
        {recentPayments.length === 0 ? (
          <p className="text-neutral-400 text-center py-8">No recent payments</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-factory-border">
                  <th className="text-left px-4 py-3 text-sm font-medium text-neutral-400">Date</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-neutral-400">Customer</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-neutral-400">Method</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-neutral-400">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-factory-border">
                {recentPayments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-factory-gray/50 transition-colors">
                    <td className="px-4 py-3 text-sm text-neutral-300">
                      {formatDate(payment.paymentDate)}
                    </td>
                    <td className="px-4 py-3 text-sm text-white">
                      {(payment as any).customer?.name || '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs rounded-md ${
                        payment.paymentMethod === 'CASH'
                          ? 'bg-success/20 text-success'
                          : payment.paymentMethod === 'CHEQUE'
                          ? 'bg-warning/20 text-warning'
                          : 'bg-blue-500/20 text-blue-400'
                      }`}>
                        {payment.paymentMethod}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-success font-medium">
                        +{formatPKR(Number(payment.amount))}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
