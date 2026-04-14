'use client';

import Link from 'next/link';
import { Button } from '@/components/atoms/Button';
import { StatsCard } from '@/components/molecules/StatsCard';
import { ChequeStatusBadge } from '@/components/atoms/StatusBadge';
import { formatPKR } from '@/lib/types/receivables';

// Mock data for dashboard
const mockSummary = {
  totalReceivables: 2850000,
  overdueAmount: 650000,
  dueThisWeek: 320000,
  dueThisMonth: 890000,
  pendingCheques: 8,
  pendingChequeAmount: 450000,
  customerCount: 45,
  activeCustomers: 38,
};

const mockRecentTransactions = [
  { id: '1', customer: 'Fashion Hub', amount: 150000, date: '2024-01-22', entryType: 'SALE' },
  { id: '2', customer: 'Textile World', amount: 75000, date: '2024-01-21', entryType: 'PAYMENT_RECEIVED' },
  { id: '3', customer: 'Garment King', amount: 200000, date: '2024-01-20', entryType: 'SALE' },
  { id: '4', customer: 'Style Factory', amount: 125000, date: '2024-01-19', entryType: 'PAYMENT_RECEIVED' },
  { id: '5', customer: 'Cloth House', amount: 95000, date: '2024-01-18', entryType: 'SALE' },
];

const mockPendingCheques = [
  { id: '1', chequeNumber: '005678', customer: 'Fashion Hub', amount: 75000, chequeDate: '2024-01-25', status: 'DEPOSITED' as const },
  { id: '2', chequeNumber: '005679', customer: 'Textile World', amount: 100000, chequeDate: '2024-01-28', status: 'PENDING' as const },
  { id: '3', chequeNumber: '005680', customer: 'Garment King', amount: 150000, chequeDate: '2024-02-01', status: 'PENDING' as const },
];

const mockAgingSnapshot = {
  current: 1200000,
  days1To30: 750000,
  days31To60: 450000,
  days61To90: 300000,
  daysOver90: 150000,
};

const mockTopCustomers = [
  { id: '1', name: 'Fashion Hub', balance: 450000, creditLimit: 1000000 },
  { id: '2', name: 'Textile World', balance: 380000, creditLimit: 800000 },
  { id: '3', name: 'Garment King', balance: 320000, creditLimit: 750000 },
  { id: '4', name: 'Style Factory', balance: 275000, creditLimit: 500000 },
  { id: '5', name: 'Cloth House', balance: 220000, creditLimit: 400000 },
];

export default function ReceivablesPage() {
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
          <h1 className="text-2xl font-semibold text-white">Receivables</h1>
          <p className="text-neutral-400 mt-1">
            Track customer payments and outstanding balances
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/sales/customers/new">
            <Button variant="secondary">+ Add Customer</Button>
          </Link>
        </div>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Receivables"
          value={formatPKR(mockSummary.totalReceivables)}
          icon="💰"
        />
        <StatsCard
          title="Overdue Amount"
          value={formatPKR(mockSummary.overdueAmount)}
          change="Needs follow-up"
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link href="/receivables/customers" className="block">
          <div className="bg-factory-dark rounded-2xl border border-factory-border p-5 hover:border-primary-500/50 transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary-500/20 flex items-center justify-center text-2xl">
                👥
              </div>
              <div>
                <p className="text-white font-medium">Customers</p>
                <p className="text-sm text-neutral-400">
                  {mockSummary.activeCustomers} active of {mockSummary.customerCount} total
                </p>
              </div>
            </div>
          </div>
        </Link>
        <Link href="/receivables/aging" className="block">
          <div className="bg-factory-dark rounded-2xl border border-factory-border p-5 hover:border-primary-500/50 transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-warning/20 flex items-center justify-center text-2xl">
                📊
              </div>
              <div>
                <p className="text-white font-medium">Aging Report</p>
                <p className="text-sm text-neutral-400">
                  View detailed aging analysis
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
            <Link href="/cheques?type=RECEIVED&status=PENDING">
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
                    <div className="flex items-center gap-2">
                      <p className="text-white text-sm">#{cheque.chequeNumber}</p>
                      <ChequeStatusBadge status={cheque.status} />
                    </div>
                    <p className="text-xs text-neutral-400">{cheque.customer}</p>
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

      {/* Top Customers by Outstanding */}
      <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Top Customers by Outstanding</h2>
          <Link href="/receivables/customers">
            <Button variant="ghost" size="sm">View All</Button>
          </Link>
        </div>
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
              {mockTopCustomers.map((customer) => {
                const utilization = (customer.balance / customer.creditLimit) * 100;
                return (
                  <tr key={customer.id} className="hover:bg-factory-gray/50 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/receivables/customers/${customer.id}`} className="text-white hover:text-primary-400">
                        {customer.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right text-white font-medium">
                      {formatPKR(customer.balance)}
                    </td>
                    <td className="px-4 py-3 text-right text-neutral-400">
                      {formatPKR(customer.creditLimit)}
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
                <th className="text-left px-4 py-3 text-sm font-medium text-neutral-400">Customer</th>
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
                  <td className="px-4 py-3 text-sm text-white">{txn.customer}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs rounded-md ${
                      txn.entryType === 'PAYMENT_RECEIVED'
                        ? 'bg-success/20 text-success'
                        : 'bg-primary-500/20 text-primary-400'
                    }`}>
                      {txn.entryType === 'PAYMENT_RECEIVED' ? 'Payment' : 'Sale'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={txn.entryType === 'PAYMENT_RECEIVED' ? 'text-success' : 'text-primary-400'}>
                      {txn.entryType === 'PAYMENT_RECEIVED' ? '+' : ''}
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
