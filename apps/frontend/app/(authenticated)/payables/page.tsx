'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/atoms/Button';
import { StatsCard } from '@/components/molecules/StatsCard';
import { formatPKR, VENDOR_TYPES, VendorTypeEnum } from '@/lib/types/supplier';
import {
  payablesApi,
  PayablesSummary,
  PayablesAgingEntry,
  vendorPaymentsApi,
  VendorPayment,
} from '@/lib/api/suppliers';
import { chequesApi, Cheque } from '@/lib/api/cheques';
import { Loader2, RefreshCw } from 'lucide-react';

export default function PayablesPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<PayablesSummary | null>(null);
  const [agingData, setAgingData] = useState<PayablesAgingEntry[]>([]);
  const [pendingCheques, setPendingCheques] = useState<Cheque[]>([]);
  const [recentPayments, setRecentPayments] = useState<VendorPayment[]>([]);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [summaryData, aging, cheques, payments] = await Promise.all([
        payablesApi.getSummary().catch(() => null),
        payablesApi.getAgingReport().catch(() => []),
        chequesApi.getAll({ type: 'ISSUED', status: 'PENDING', limit: 5 }).catch(() => ({ data: [] })),
        vendorPaymentsApi.getAll({ limit: 5 }).catch(() => ({ data: [] })),
      ]);

      setSummary(summaryData);
      setAgingData(aging);
      setPendingCheques(cheques.data);
      setRecentPayments(payments.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load payables data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-PK', {
      month: 'short',
      day: 'numeric',
    });
  };

  // Calculate totals from summary
  const totals = useMemo(() => {
    if (!summary?.balancesByType) {
      return {
        totalPayables: 0,
        overdueAmount: 0,
        yarnVendors: { count: 0, balance: 0 },
        dyeingVendors: { count: 0, balance: 0 },
        generalSuppliers: { count: 0, balance: 0 },
      };
    }

    let totalPayables = 0;
    let overdueAmount = 0;
    const yarnVendors = { count: 0, balance: 0 };
    const dyeingVendors = { count: 0, balance: 0 };
    const generalSuppliers = { count: 0, balance: 0 };

    for (const balance of summary.balancesByType) {
      const currentBalance = Number(balance._sum?.currentBalance) || 0;
      const overdue = Number(balance._sum?.overdueAmount) || 0;
      totalPayables += currentBalance;
      overdueAmount += overdue;

      if (balance.entityType === 'yarn_vendor') {
        yarnVendors.count = balance._count || 0;
        yarnVendors.balance = currentBalance;
      } else if (balance.entityType === 'dyeing_vendor') {
        dyeingVendors.count = balance._count || 0;
        dyeingVendors.balance = currentBalance;
      } else if (balance.entityType === 'general_supplier') {
        generalSuppliers.count = balance._count || 0;
        generalSuppliers.balance = currentBalance;
      }
    }

    return { totalPayables, overdueAmount, yarnVendors, dyeingVendors, generalSuppliers };
  }, [summary]);

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

  // Get vendor name from payment
  const getPaymentVendorName = (payment: any) => {
    if (payment.yarnVendor?.name) return payment.yarnVendor.name;
    if (payment.dyeingVendor?.name) return payment.dyeingVendor.name;
    if (payment.generalSupplier?.name) return payment.generalSupplier.name;
    return 'Unknown Vendor';
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
          <h1 className="text-2xl font-semibold text-white">Payables</h1>
          <p className="text-neutral-400 mt-1">
            Manage vendor payments and track outstanding balances
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="ghost" size="sm" onClick={loadData} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Link href="/payables/suppliers/new">
            <Button>+ Add Supplier</Button>
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
          title="Total Payables"
          value={formatPKR(totals.totalPayables)}
          icon="💰"
        />
        <StatsCard
          title="Overdue Amount"
          value={formatPKR(totals.overdueAmount)}
          change={totals.overdueAmount > 0 ? 'Needs attention' : 'All current'}
          changeType={totals.overdueAmount > 0 ? 'negative' : 'positive'}
          icon="⚠️"
        />
        <StatsCard
          title="Pending Returns"
          value={summary?.pendingReturns || 0}
          change={summary?.pendingReturns ? 'Awaiting action' : 'None pending'}
          changeType={summary?.pendingReturns ? 'neutral' : 'positive'}
          icon="↩️"
        />
        <StatsCard
          title="Pending Cheques"
          value={pendingCheques.length}
          change={formatPKR(pendingCheques.reduce((sum, c) => sum + Number(c.amount), 0))}
          changeType="neutral"
          icon="📝"
        />
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/yarn/vendors" className="block">
          <div className="bg-factory-dark rounded-2xl border border-factory-border p-5 hover:border-primary-500/50 transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary-500/20 flex items-center justify-center text-2xl">
                🧶
              </div>
              <div>
                <p className="text-white font-medium">Yarn Vendors</p>
                <p className="text-sm text-neutral-400">
                  {totals.yarnVendors.count} vendors • {formatPKR(totals.yarnVendors.balance)}
                </p>
              </div>
            </div>
          </div>
        </Link>
        <Link href="/dyeing/vendors" className="block">
          <div className="bg-factory-dark rounded-2xl border border-factory-border p-5 hover:border-primary-500/50 transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center text-2xl">
                🎨
              </div>
              <div>
                <p className="text-white font-medium">Dyeing Vendors</p>
                <p className="text-sm text-neutral-400">
                  {totals.dyeingVendors.count} vendors • {formatPKR(totals.dyeingVendors.balance)}
                </p>
              </div>
            </div>
          </div>
        </Link>
        <Link href="/payables/suppliers" className="block">
          <div className="bg-factory-dark rounded-2xl border border-factory-border p-5 hover:border-primary-500/50 transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center text-2xl">
                🏭
              </div>
              <div>
                <p className="text-white font-medium">General Suppliers</p>
                <p className="text-sm text-neutral-400">
                  {totals.generalSuppliers.count} suppliers • {formatPKR(totals.generalSuppliers.balance)}
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
            <Link href="/payables/aging">
              <Button variant="ghost" size="sm">View Report</Button>
            </Link>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-factory-gray rounded-xl">
              <span className="text-sm text-neutral-300">Current (Not Due)</span>
              <span className="text-white font-medium">{formatPKR(agingBuckets.current)}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-factory-gray rounded-xl">
              <span className="text-sm text-warning">1-30 Days</span>
              <span className="text-warning font-medium">{formatPKR(agingBuckets.days1To30)}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-factory-gray rounded-xl">
              <span className="text-sm text-warning">31-60 Days</span>
              <span className="text-warning font-medium">{formatPKR(agingBuckets.days31To60)}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-factory-gray rounded-xl">
              <span className="text-sm text-error">61-90 Days</span>
              <span className="text-error font-medium">{formatPKR(agingBuckets.days61To90)}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-factory-gray rounded-xl">
              <span className="text-sm text-error">90+ Days</span>
              <span className="text-error font-medium">{formatPKR(agingBuckets.daysOver90)}</span>
            </div>
          </div>
        </div>

        {/* Pending Cheques */}
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Pending Cheques</h2>
            <Link href="/cheques?type=ISSUED&status=PENDING">
              <Button variant="ghost" size="sm">View All</Button>
            </Link>
          </div>
          {pendingCheques.length === 0 ? (
            <p className="text-neutral-400 text-center py-8">No pending cheques</p>
          ) : (
            <div className="space-y-3">
              {pendingCheques.map((cheque) => (
                <div key={cheque.id} className="flex items-center justify-between p-3 bg-factory-gray rounded-xl">
                  <div>
                    <p className="text-white text-sm">#{cheque.chequeNumber}</p>
                    <p className="text-xs text-neutral-400">
                      {cheque.yarnVendor?.name || cheque.dyeingVendor?.name || cheque.generalSupplier?.name || 'Unknown'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-medium">{formatPKR(Number(cheque.amount))}</p>
                    <p className="text-xs text-neutral-400">Due: {formatDate(cheque.chequeDate)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
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
                  <th className="text-left px-4 py-3 text-sm font-medium text-neutral-400">Vendor</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-neutral-400">Type</th>
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
                      {getPaymentVendorName(payment)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 text-xs rounded-md bg-factory-gray text-neutral-300">
                        {VENDOR_TYPES[payment.vendorType as VendorTypeEnum]?.label || payment.vendorType}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 text-xs rounded-md bg-success/20 text-success">
                        {payment.paymentMethod}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-success font-medium">
                        -{formatPKR(Number(payment.amount))}
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
