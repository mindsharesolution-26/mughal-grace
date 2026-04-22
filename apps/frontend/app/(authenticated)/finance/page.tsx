'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/atoms/Button';
import { StatsCard } from '@/components/molecules/StatsCard';
import { receivablesApi, ReceivablesSummary } from '@/lib/api/receivables';
import { chequesApi, ChequeSummary, getChequeEntityName } from '@/lib/api/cheques';
import { vendorPaymentsApi, VendorPayment } from '@/lib/api/suppliers';
import { Loader2 } from 'lucide-react';

// Format currency
const formatPKR = (amount: number) => {
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export default function FinancePage() {
  const [isLoading, setIsLoading] = useState(true);
  const [receivablesSummary, setReceivablesSummary] = useState<ReceivablesSummary | null>(null);
  const [chequeSummary, setChequeSummary] = useState<ChequeSummary | null>(null);
  const [recentPayments, setRecentPayments] = useState<VendorPayment[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [receivables, cheques, payments] = await Promise.all([
        receivablesApi.getSummary().catch(() => null),
        chequesApi.getSummary().catch(() => null),
        vendorPaymentsApi.getAll({ limit: 5 }).catch(() => ({ data: [] })),
      ]);

      setReceivablesSummary(receivables);
      setChequeSummary(cheques);
      setRecentPayments(payments.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load finance data');
    } finally {
      setIsLoading(false);
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-PK', {
      month: 'short',
      day: 'numeric',
    });
  };

  // Calculate totals from cheque summary
  const pendingChequeAmount = chequeSummary?.pendingClearance?.amount || 0;
  const pendingChequeCount = chequeSummary?.pendingClearance?.count || 0;
  const bouncedCount = chequeSummary?.bouncedCount || 0;

  // Get status counts
  const getStatusCount = (status: string) => {
    const found = chequeSummary?.byStatus?.find(s => s.status === status);
    return found?._count || 0;
  };

  const getStatusAmount = (status: string) => {
    const found = chequeSummary?.byStatus?.find(s => s.status === status);
    return found?._sum?.amount || 0;
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
          <h1 className="text-2xl font-semibold text-white">Finance</h1>
          <p className="text-neutral-400 mt-1">
            Manage receivables, payables, and cheques
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/receivables">
            <Button variant="secondary">Receivables</Button>
          </Link>
          <Link href="/payables">
            <Button variant="secondary">Payables</Button>
          </Link>
          <Link href="/cheques">
            <Button>Cheques</Button>
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
          value={formatPKR(Number(receivablesSummary?.totalReceivables) || 0)}
          change={`${receivablesSummary?.customerCount || 0} customers`}
          changeType="neutral"
          icon="💰"
        />
        <StatsCard
          title="Overdue Amount"
          value={formatPKR(Number(receivablesSummary?.totalOverdue) || 0)}
          change="Needs follow-up"
          changeType={Number(receivablesSummary?.totalOverdue) > 0 ? 'negative' : 'positive'}
          icon="⚠️"
        />
        <StatsCard
          title="Pending Cheques"
          value={pendingChequeCount}
          change={formatPKR(Number(pendingChequeAmount))}
          changeType="neutral"
          icon="📝"
        />
        <StatsCard
          title="Bounced Cheques"
          value={bouncedCount}
          change={bouncedCount > 0 ? 'Needs attention' : 'None'}
          changeType={bouncedCount > 0 ? 'negative' : 'positive'}
          icon="🔴"
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          href="/receivables"
          className="bg-primary-500/10 border border-primary-500/30 rounded-xl p-4 hover:bg-primary-500/20 transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">💵</span>
            <div>
              <p className="text-primary-400 font-medium">Receivables</p>
              <p className="text-sm text-neutral-400">Customer balances</p>
            </div>
          </div>
        </Link>
        <Link
          href="/payables"
          className="bg-factory-dark rounded-xl border border-factory-border p-4 hover:bg-factory-gray transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">💳</span>
            <div>
              <p className="text-white font-medium">Payables</p>
              <p className="text-sm text-neutral-400">Vendor balances</p>
            </div>
          </div>
        </Link>
        <Link
          href="/cheques"
          className="bg-factory-dark rounded-xl border border-factory-border p-4 hover:bg-factory-gray transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">📝</span>
            <div>
              <p className="text-white font-medium">Cheques</p>
              <p className="text-sm text-neutral-400">Track & manage</p>
            </div>
          </div>
        </Link>
        <Link
          href="/sales"
          className="bg-factory-dark rounded-xl border border-factory-border p-4 hover:bg-factory-gray transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">🛒</span>
            <div>
              <p className="text-white font-medium">Sales</p>
              <p className="text-sm text-neutral-400">Orders & dispatch</p>
            </div>
          </div>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cheque Status Overview */}
        <div className="bg-factory-dark rounded-2xl border border-factory-border overflow-hidden">
          <div className="p-6 border-b border-factory-border flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Cheque Status</h3>
            <Link href="/cheques">
              <Button variant="ghost" size="sm">View All</Button>
            </Link>
          </div>
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between p-3 bg-warning/10 border border-warning/20 rounded-xl">
              <div>
                <p className="text-warning font-medium">Pending</p>
                <p className="text-xs text-neutral-400">{getStatusCount('PENDING')} cheques</p>
              </div>
              <span className="text-warning font-semibold">{formatPKR(getStatusAmount('PENDING'))}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
              <div>
                <p className="text-blue-400 font-medium">Deposited</p>
                <p className="text-xs text-neutral-400">{getStatusCount('DEPOSITED')} cheques</p>
              </div>
              <span className="text-blue-400 font-semibold">{formatPKR(getStatusAmount('DEPOSITED'))}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-success/10 border border-success/20 rounded-xl">
              <div>
                <p className="text-success font-medium">Cleared</p>
                <p className="text-xs text-neutral-400">{getStatusCount('CLEARED')} cheques</p>
              </div>
              <span className="text-success font-semibold">{formatPKR(getStatusAmount('CLEARED'))}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-error/10 border border-error/20 rounded-xl">
              <div>
                <p className="text-error font-medium">Bounced</p>
                <p className="text-xs text-neutral-400">{bouncedCount} cheques</p>
              </div>
              <span className="text-error font-semibold">{formatPKR(getStatusAmount('BOUNCED'))}</span>
            </div>
          </div>
        </div>

        {/* Top Debtors */}
        <div className="bg-factory-dark rounded-2xl border border-factory-border overflow-hidden">
          <div className="p-6 border-b border-factory-border flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Top Debtors</h3>
            <Link href="/receivables">
              <Button variant="ghost" size="sm">View All</Button>
            </Link>
          </div>
          {!receivablesSummary?.topDebtors?.length ? (
            <div className="p-12 text-center">
              <p className="text-neutral-400">No outstanding balances</p>
            </div>
          ) : (
            <div className="divide-y divide-factory-border">
              {receivablesSummary.topDebtors.slice(0, 5).map((debtor, index) => (
                <div key={debtor.entityId} className="p-4 hover:bg-factory-gray transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-factory-gray flex items-center justify-center text-xs text-neutral-400">
                        {index + 1}
                      </span>
                      <div>
                        <p className="text-white font-medium">
                          {(debtor as any).customer?.name || `Customer #${debtor.entityId}`}
                        </p>
                        <p className="text-neutral-400 text-sm">
                          Credit Limit: {formatPKR(Number(debtor.creditLimit) || 0)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-error font-medium">{formatPKR(Number(debtor.currentBalance))}</p>
                      <p className="text-neutral-500 text-xs">Outstanding</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Bounced Cheques */}
      {chequeSummary?.recentBounced && chequeSummary.recentBounced.length > 0 && (
        <div className="bg-factory-dark rounded-2xl border border-error/30 overflow-hidden">
          <div className="p-6 border-b border-factory-border flex items-center justify-between bg-error/5">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚠️</span>
              <h3 className="text-lg font-semibold text-error">Recently Bounced Cheques</h3>
            </div>
            <Link href="/cheques?status=BOUNCED">
              <Button variant="ghost" size="sm">View All</Button>
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-factory-border">
                  <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">Cheque #</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">Party</th>
                  <th className="text-right px-6 py-4 text-sm font-medium text-neutral-400">Amount</th>
                  <th className="text-right px-6 py-4 text-sm font-medium text-neutral-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-factory-border">
                {chequeSummary.recentBounced.map((cheque) => (
                  <tr key={cheque.id} className="hover:bg-factory-gray transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-mono text-sm text-primary-400">#{cheque.chequeNumber}</span>
                    </td>
                    <td className="px-6 py-4 text-white">{getChequeEntityName(cheque)}</td>
                    <td className="px-6 py-4 text-right text-error font-medium">
                      {formatPKR(Number(cheque.amount))}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link href={`/cheques/${cheque.id}`}>
                        <Button variant="secondary" size="sm">Handle</Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent Payments */}
      <div className="bg-factory-dark rounded-2xl border border-factory-border overflow-hidden">
        <div className="p-6 border-b border-factory-border flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Recent Payments (Received)</h3>
        </div>
        {!receivablesSummary?.recentPayments?.length ? (
          <div className="p-12 text-center">
            <p className="text-neutral-400">No recent payments</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-factory-border">
                  <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">Date</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">Customer</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">Method</th>
                  <th className="text-right px-6 py-4 text-sm font-medium text-neutral-400">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-factory-border">
                {receivablesSummary.recentPayments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-factory-gray transition-colors">
                    <td className="px-6 py-4 text-neutral-300">{formatDate(payment.paymentDate)}</td>
                    <td className="px-6 py-4 text-white">{(payment as any).customer?.name || '-'}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 text-xs rounded-full bg-success/20 text-success">
                        {payment.paymentMethod}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-success font-medium">
                      +{formatPKR(Number(payment.amount))}
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
