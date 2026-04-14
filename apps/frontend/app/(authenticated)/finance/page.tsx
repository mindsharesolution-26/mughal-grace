'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/atoms/Button';
import { StatsCard } from '@/components/molecules/StatsCard';
import { formatPKR } from '@/lib/types/vendor';

// Mock data for finance overview
const mockFinanceStats = {
  totalPayables: 1250000,
  totalReceivables: 850000,
  pendingPayments: 5,
  pendingApprovals: 3,
  monthlyPurchases: 2500000,
  monthlyPayments: 1800000,
  vendorCount: 12,
  activeVendors: 8,
};

const mockRecentTransactions = [
  {
    id: '1',
    date: '2024-01-25',
    type: 'PAYMENT',
    vendorName: 'Textile Hub',
    amount: 150000,
    status: 'completed',
  },
  {
    id: '2',
    date: '2024-01-24',
    type: 'PURCHASE',
    vendorName: 'Yarn Masters',
    amount: 280000,
    status: 'completed',
  },
  {
    id: '3',
    date: '2024-01-24',
    type: 'PAYMENT',
    vendorName: 'Fiber Co',
    amount: 95000,
    status: 'pending',
  },
  {
    id: '4',
    date: '2024-01-23',
    type: 'PURCHASE',
    vendorName: 'Cotton World',
    amount: 420000,
    status: 'completed',
  },
  {
    id: '5',
    date: '2024-01-22',
    type: 'PAYMENT',
    vendorName: 'Premium Yarns',
    amount: 200000,
    status: 'completed',
  },
];

const mockPendingApprovals = [
  {
    id: '1',
    type: 'Pay Order',
    number: 'PO-2024-0008',
    vendorName: 'Textile Hub',
    amount: 350000,
    status: 'PENDING_FINANCE',
  },
  {
    id: '2',
    type: 'Pay Order',
    number: 'PO-2024-0009',
    vendorName: 'Yarn Masters',
    amount: 180000,
    status: 'PENDING_FINANCE',
  },
  {
    id: '3',
    type: 'Payment',
    number: 'PAY-2024-0025',
    vendorName: 'Fiber Co',
    amount: 75000,
    status: 'PENDING_APPROVAL',
  },
];

const mockTopVendors = [
  { name: 'Textile Hub', balance: 450000, purchases: 1200000 },
  { name: 'Yarn Masters', balance: 320000, purchases: 980000 },
  { name: 'Fiber Co', balance: 180000, purchases: 650000 },
  { name: 'Cotton World', balance: 150000, purchases: 520000 },
];

export default function FinancePage() {
  // Format date
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
          <h1 className="text-2xl font-semibold text-white">Finance</h1>
          <p className="text-neutral-400 mt-1">
            Manage vendors, payments, and financial transactions
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/finance/vendors/new">
            <Button variant="secondary">+ Add Vendor</Button>
          </Link>
          <Link href="/finance/payments/new">
            <Button>+ Record Payment</Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Payables"
          value={formatPKR(mockFinanceStats.totalPayables)}
          change="Outstanding to vendors"
          changeType="neutral"
          icon="💳"
        />
        <StatsCard
          title="Pending Payments"
          value={mockFinanceStats.pendingPayments}
          change="To process"
          changeType={mockFinanceStats.pendingPayments > 0 ? 'negative' : 'positive'}
          icon="⏳"
        />
        <StatsCard
          title="Pending Approvals"
          value={mockFinanceStats.pendingApprovals}
          change="Needs review"
          changeType={mockFinanceStats.pendingApprovals > 0 ? 'negative' : 'positive'}
          icon="✓"
        />
        <StatsCard
          title="Active Vendors"
          value={`${mockFinanceStats.activeVendors}/${mockFinanceStats.vendorCount}`}
          change="Total vendors"
          changeType="positive"
          icon="🏪"
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          href="/finance/vendors"
          className="bg-primary-500/10 border border-primary-500/30 rounded-xl p-4 hover:bg-primary-500/20 transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏪</span>
            <div>
              <p className="text-primary-400 font-medium">Vendors</p>
              <p className="text-sm text-neutral-400">Manage all vendors</p>
            </div>
          </div>
        </Link>
        <Link
          href="/finance/payments"
          className="bg-factory-dark rounded-xl border border-factory-border p-4 hover:bg-factory-gray transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">💵</span>
            <div>
              <p className="text-white font-medium">Payments</p>
              <p className="text-sm text-neutral-400">Record & track payments</p>
            </div>
          </div>
        </Link>
        <Link
          href="/finance/ledger"
          className="bg-factory-dark rounded-xl border border-factory-border p-4 hover:bg-factory-gray transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">📒</span>
            <div>
              <p className="text-white font-medium">Ledger</p>
              <p className="text-sm text-neutral-400">View all transactions</p>
            </div>
          </div>
        </Link>
        <Link
          href="/yarn/pay-orders"
          className="bg-factory-dark rounded-xl border border-factory-border p-4 hover:bg-factory-gray transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">📋</span>
            <div>
              <p className="text-white font-medium">Pay Orders</p>
              <p className="text-sm text-neutral-400">Approve & manage</p>
            </div>
          </div>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Approvals */}
        <div className="bg-factory-dark rounded-2xl border border-factory-border overflow-hidden">
          <div className="p-6 border-b border-factory-border flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Pending Approvals</h3>
            <Link href="/yarn/pay-orders?status=PENDING_FINANCE">
              <Button variant="ghost" size="sm">View All</Button>
            </Link>
          </div>
          {mockPendingApprovals.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-neutral-400">No pending approvals</p>
            </div>
          ) : (
            <div className="divide-y divide-factory-border">
              {mockPendingApprovals.map((item) => (
                <div key={item.id} className="p-4 hover:bg-factory-gray transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono text-primary-400">{item.number}</span>
                        <span className="px-2 py-0.5 text-xs rounded-full bg-warning/20 text-warning">
                          {item.type}
                        </span>
                      </div>
                      <p className="text-neutral-400 text-sm mt-1">{item.vendorName}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-medium">{formatPKR(item.amount)}</p>
                      <Link href={`/yarn/pay-orders/${item.id}?tab=approval`}>
                        <Button variant="secondary" size="sm" className="mt-1">
                          Review
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Vendors by Balance */}
        <div className="bg-factory-dark rounded-2xl border border-factory-border overflow-hidden">
          <div className="p-6 border-b border-factory-border flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Top Vendors by Balance</h3>
            <Link href="/finance/vendors">
              <Button variant="ghost" size="sm">View All</Button>
            </Link>
          </div>
          <div className="divide-y divide-factory-border">
            {mockTopVendors.map((vendor, index) => (
              <div key={vendor.name} className="p-4 hover:bg-factory-gray transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-factory-gray flex items-center justify-center text-xs text-neutral-400">
                      {index + 1}
                    </span>
                    <div>
                      <p className="text-white font-medium">{vendor.name}</p>
                      <p className="text-neutral-400 text-sm">
                        Total Purchases: {formatPKR(vendor.purchases)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-error font-medium">{formatPKR(vendor.balance)}</p>
                    <p className="text-neutral-500 text-xs">Outstanding</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-factory-dark rounded-2xl border border-factory-border overflow-hidden">
        <div className="p-6 border-b border-factory-border flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Recent Transactions</h3>
          <Link href="/finance/ledger">
            <Button variant="ghost" size="sm">View All</Button>
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-factory-border">
                <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">Date</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">Type</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">Vendor</th>
                <th className="text-right px-6 py-4 text-sm font-medium text-neutral-400">Amount</th>
                <th className="text-center px-6 py-4 text-sm font-medium text-neutral-400">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-factory-border">
              {mockRecentTransactions.map((txn) => (
                <tr key={txn.id} className="hover:bg-factory-gray transition-colors">
                  <td className="px-6 py-4 text-neutral-300">{formatDate(txn.date)}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      txn.type === 'PAYMENT'
                        ? 'bg-success/20 text-success'
                        : 'bg-blue-500/20 text-blue-400'
                    }`}>
                      {txn.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-white">{txn.vendorName}</td>
                  <td className={`px-6 py-4 text-right font-medium ${
                    txn.type === 'PAYMENT' ? 'text-success' : 'text-error'
                  }`}>
                    {txn.type === 'PAYMENT' ? '-' : '+'}{formatPKR(txn.amount)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        txn.status === 'completed'
                          ? 'bg-success/20 text-success'
                          : 'bg-warning/20 text-warning'
                      }`}>
                        {txn.status === 'completed' ? 'Completed' : 'Pending'}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Monthly Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
          <h3 className="text-lg font-semibold text-white mb-4">This Month</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-neutral-400">Total Purchases</span>
              <span className="text-error font-medium">{formatPKR(mockFinanceStats.monthlyPurchases)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-neutral-400">Total Payments</span>
              <span className="text-success font-medium">{formatPKR(mockFinanceStats.monthlyPayments)}</span>
            </div>
            <div className="pt-4 border-t border-factory-border flex items-center justify-between">
              <span className="text-white font-medium">Net Change</span>
              <span className="text-error font-semibold">
                {formatPKR(mockFinanceStats.monthlyPurchases - mockFinanceStats.monthlyPayments)}
              </span>
            </div>
          </div>
        </div>
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Payment Due</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-error/10 border border-error/20 rounded-lg">
              <div>
                <p className="text-white font-medium">Overdue</p>
                <p className="text-xs text-neutral-400">Past payment terms</p>
              </div>
              <span className="text-error font-semibold">{formatPKR(280000)}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-warning/10 border border-warning/20 rounded-lg">
              <div>
                <p className="text-white font-medium">Due This Week</p>
                <p className="text-xs text-neutral-400">Next 7 days</p>
              </div>
              <span className="text-warning font-semibold">{formatPKR(450000)}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-factory-gray rounded-lg">
              <div>
                <p className="text-white font-medium">Due This Month</p>
                <p className="text-xs text-neutral-400">Next 30 days</p>
              </div>
              <span className="text-white font-semibold">{formatPKR(520000)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
