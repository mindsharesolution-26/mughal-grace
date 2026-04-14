'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/atoms/Button';
import { StatsCard } from '@/components/molecules/StatsCard';
import { ChequeStatusBadge } from '@/components/atoms/StatusBadge';
import { formatPKR, VENDOR_TYPES, VendorTypeEnum } from '@/lib/types/supplier';

// Mock data for dashboard
const mockSummary = {
  totalPayables: 1250000,
  overdueAmount: 350000,
  dueThisWeek: 125000,
  dueThisMonth: 450000,
  pendingCheques: 5,
  pendingChequeAmount: 200000,
  byVendorType: {
    YARN: { count: 12, balance: 750000 },
    DYEING: { count: 8, balance: 350000 },
    GENERAL: { count: 15, balance: 150000 },
  } as Record<VendorTypeEnum, { count: number; balance: number }>,
};

const mockRecentTransactions = [
  { id: '1', vendor: 'Textile Hub', type: 'YARN' as VendorTypeEnum, amount: 75000, date: '2024-01-22', entryType: 'PURCHASE' },
  { id: '2', vendor: 'Color Masters', type: 'DYEING' as VendorTypeEnum, amount: 45000, date: '2024-01-21', entryType: 'PAYMENT_MADE' },
  { id: '3', vendor: 'Needle Works', type: 'GENERAL' as VendorTypeEnum, amount: 15000, date: '2024-01-20', entryType: 'PURCHASE' },
  { id: '4', vendor: 'Yarn Masters', type: 'YARN' as VendorTypeEnum, amount: 100000, date: '2024-01-19', entryType: 'PAYMENT_MADE' },
  { id: '5', vendor: 'Dye House Ltd', type: 'DYEING' as VendorTypeEnum, amount: 60000, date: '2024-01-18', entryType: 'PURCHASE' },
];

const mockPendingCheques = [
  { id: '1', chequeNumber: '001234', vendor: 'Textile Hub', amount: 50000, chequeDate: '2024-01-25', status: 'PENDING' as const },
  { id: '2', chequeNumber: '001235', vendor: 'Color Masters', amount: 75000, chequeDate: '2024-01-28', status: 'PENDING' as const },
  { id: '3', chequeNumber: '001236', vendor: 'Yarn Masters', amount: 45000, chequeDate: '2024-02-01', status: 'PENDING' as const },
];

const mockAgingSnapshot = {
  current: 500000,
  days1To30: 350000,
  days31To60: 200000,
  days61To90: 125000,
  daysOver90: 75000,
};

export default function PayablesPage() {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-PK', {
      month: 'short',
      day: 'numeric',
    });
  };

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
          <Link href="/payables/suppliers/new">
            <Button>+ Add Supplier</Button>
          </Link>
        </div>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Payables"
          value={formatPKR(mockSummary.totalPayables)}
          icon="💰"
        />
        <StatsCard
          title="Overdue Amount"
          value={formatPKR(mockSummary.overdueAmount)}
          change="Needs attention"
          changeType="negative"
          icon="⚠️"
        />
        <StatsCard
          title="Due This Week"
          value={formatPKR(mockSummary.dueThisWeek)}
          icon="📅"
        />
        <StatsCard
          title="Pending Cheques"
          value={mockSummary.pendingCheques}
          change={formatPKR(mockSummary.pendingChequeAmount)}
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
                  {mockSummary.byVendorType.YARN?.count || 0} vendors • {formatPKR(mockSummary.byVendorType.YARN?.balance || 0)}
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
                  {mockSummary.byVendorType.DYEING?.count || 0} vendors • {formatPKR(mockSummary.byVendorType.DYEING?.balance || 0)}
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
                  {mockSummary.byVendorType.GENERAL?.count || 0} suppliers • {formatPKR(mockSummary.byVendorType.GENERAL?.balance || 0)}
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
              <span className="text-white font-medium">{formatPKR(mockAgingSnapshot.current)}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-factory-gray rounded-xl">
              <span className="text-sm text-warning">1-30 Days</span>
              <span className="text-warning font-medium">{formatPKR(mockAgingSnapshot.days1To30)}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-factory-gray rounded-xl">
              <span className="text-sm text-warning">31-60 Days</span>
              <span className="text-warning font-medium">{formatPKR(mockAgingSnapshot.days31To60)}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-factory-gray rounded-xl">
              <span className="text-sm text-error">61-90 Days</span>
              <span className="text-error font-medium">{formatPKR(mockAgingSnapshot.days61To90)}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-factory-gray rounded-xl">
              <span className="text-sm text-error">90+ Days</span>
              <span className="text-error font-medium">{formatPKR(mockAgingSnapshot.daysOver90)}</span>
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
          {mockPendingCheques.length === 0 ? (
            <p className="text-neutral-400 text-center py-8">No pending cheques</p>
          ) : (
            <div className="space-y-3">
              {mockPendingCheques.map((cheque) => (
                <div key={cheque.id} className="flex items-center justify-between p-3 bg-factory-gray rounded-xl">
                  <div>
                    <p className="text-white text-sm">#{cheque.chequeNumber}</p>
                    <p className="text-xs text-neutral-400">{cheque.vendor}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-medium">{formatPKR(cheque.amount)}</p>
                    <p className="text-xs text-neutral-400">Due: {formatDate(cheque.chequeDate)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Recent Transactions</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-factory-border">
                <th className="text-left px-4 py-3 text-sm font-medium text-neutral-400">Date</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-neutral-400">Vendor</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-neutral-400">Type</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-neutral-400">Transaction</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-neutral-400">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-factory-border">
              {mockRecentTransactions.map((txn) => (
                <tr key={txn.id} className="hover:bg-factory-gray/50 transition-colors">
                  <td className="px-4 py-3 text-sm text-neutral-300">
                    {formatDate(txn.date)}
                  </td>
                  <td className="px-4 py-3 text-sm text-white">{txn.vendor}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 text-xs rounded-md bg-factory-gray text-neutral-300">
                      {VENDOR_TYPES[txn.type]?.label || txn.type}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs rounded-md ${
                      txn.entryType === 'PAYMENT_MADE'
                        ? 'bg-success/20 text-success'
                        : 'bg-error/20 text-error'
                    }`}>
                      {txn.entryType === 'PAYMENT_MADE' ? 'Payment' : 'Purchase'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={txn.entryType === 'PAYMENT_MADE' ? 'text-success' : 'text-error'}>
                      {txn.entryType === 'PAYMENT_MADE' ? '-' : '+'}
                      {formatPKR(txn.amount)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
