'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { StatsCard } from '@/components/molecules/StatsCard';
import { ChequeStatusBadge } from '@/components/atoms/StatusBadge';
import {
  Cheque,
  ChequeType,
  ChequeStatus,
  CHEQUE_TYPES,
  CHEQUE_STATUSES,
  formatChequeAmount,
  formatDate,
  getChequePartyName,
  getDaysUntilMaturity,
} from '@/lib/types/cheque';

// Mock data
const mockCheques: Cheque[] = [
  {
    id: '1',
    chequeNumber: '001234',
    chequeType: 'ISSUED',
    vendorType: 'YARN',
    vendorName: 'Textile Hub',
    bankName: 'HBL',
    branchName: 'Faisalabad Main',
    amount: 75000,
    chequeDate: '2024-01-28',
    status: 'PENDING',
    bounceCount: 0,
    createdAt: '2024-01-20',
    updatedAt: '2024-01-20',
  },
  {
    id: '2',
    chequeNumber: '005678',
    chequeType: 'RECEIVED',
    customerId: '1',
    customerName: 'Fashion Hub',
    bankName: 'MCB',
    amount: 100000,
    chequeDate: '2024-01-25',
    receivedDate: '2024-01-18',
    depositDate: '2024-01-22',
    status: 'DEPOSITED',
    bounceCount: 0,
    createdAt: '2024-01-18',
    updatedAt: '2024-01-22',
  },
  {
    id: '3',
    chequeNumber: '005679',
    chequeType: 'RECEIVED',
    customerId: '2',
    customerName: 'Textile World',
    bankName: 'UBL',
    amount: 150000,
    chequeDate: '2024-01-30',
    receivedDate: '2024-01-15',
    status: 'PENDING',
    bounceCount: 0,
    createdAt: '2024-01-15',
    updatedAt: '2024-01-15',
  },
  {
    id: '4',
    chequeNumber: '001233',
    chequeType: 'ISSUED',
    vendorType: 'DYEING',
    vendorName: 'Color Masters',
    bankName: 'HBL',
    amount: 50000,
    chequeDate: '2024-01-20',
    clearanceDate: '2024-01-23',
    status: 'CLEARED',
    bounceCount: 0,
    createdAt: '2024-01-15',
    updatedAt: '2024-01-23',
  },
  {
    id: '5',
    chequeNumber: '005677',
    chequeType: 'RECEIVED',
    customerId: '3',
    customerName: 'Garment King',
    bankName: 'ABL',
    amount: 80000,
    chequeDate: '2024-01-15',
    receivedDate: '2024-01-10',
    depositDate: '2024-01-12',
    bouncedDate: '2024-01-18',
    status: 'BOUNCED',
    bounceReason: 'Insufficient funds',
    bounceCharges: 1500,
    bounceCount: 1,
    createdAt: '2024-01-10',
    updatedAt: '2024-01-18',
  },
  {
    id: '6',
    chequeNumber: '001235',
    chequeType: 'ISSUED',
    vendorType: 'GENERAL',
    vendorName: 'Needle Works',
    bankName: 'HBL',
    amount: 25000,
    chequeDate: '2024-02-05',
    status: 'PENDING',
    bounceCount: 0,
    createdAt: '2024-01-22',
    updatedAt: '2024-01-22',
  },
];

export default function ChequesPage() {
  const searchParams = useSearchParams();
  const initialType = searchParams.get('type') as ChequeType | null;
  const initialStatus = searchParams.get('status') as ChequeStatus | null;

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<ChequeType | 'all'>(initialType || 'all');
  const [statusFilter, setStatusFilter] = useState<ChequeStatus | 'all'>(initialStatus || 'all');
  const [activeTab, setActiveTab] = useState<'all' | 'issued' | 'received'>(
    initialType === 'ISSUED' ? 'issued' : initialType === 'RECEIVED' ? 'received' : 'all'
  );

  // Filter cheques
  const filteredCheques = useMemo(() => {
    return mockCheques.filter((cheque) => {
      const matchesSearch =
        searchQuery === '' ||
        cheque.chequeNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (cheque.customerName?.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (cheque.vendorName?.toLowerCase().includes(searchQuery.toLowerCase())) ||
        cheque.bankName.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesTab =
        activeTab === 'all' ||
        (activeTab === 'issued' && cheque.chequeType === 'ISSUED') ||
        (activeTab === 'received' && cheque.chequeType === 'RECEIVED');

      const matchesStatus =
        statusFilter === 'all' || cheque.status === statusFilter;

      return matchesSearch && matchesTab && matchesStatus;
    });
  }, [searchQuery, activeTab, statusFilter]);

  // Calculate stats
  const stats = useMemo(() => {
    const issued = mockCheques.filter((c) => c.chequeType === 'ISSUED');
    const received = mockCheques.filter((c) => c.chequeType === 'RECEIVED');
    const pending = mockCheques.filter((c) => c.status === 'PENDING' || c.status === 'DEPOSITED');
    const bounced = mockCheques.filter((c) => c.status === 'BOUNCED');

    return {
      issuedCount: issued.length,
      issuedAmount: issued.reduce((sum, c) => sum + c.amount, 0),
      receivedCount: received.length,
      receivedAmount: received.reduce((sum, c) => sum + c.amount, 0),
      pendingCount: pending.length,
      pendingAmount: pending.reduce((sum, c) => sum + c.amount, 0),
      bouncedCount: bounced.length,
      bouncedAmount: bounced.reduce((sum, c) => sum + c.amount, 0),
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Cheques</h1>
          <p className="text-neutral-400 mt-1">
            Manage issued and received cheques
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Issued Cheques"
          value={stats.issuedCount}
          change={formatChequeAmount(stats.issuedAmount)}
          changeType="neutral"
          icon="📤"
        />
        <StatsCard
          title="Received Cheques"
          value={stats.receivedCount}
          change={formatChequeAmount(stats.receivedAmount)}
          changeType="neutral"
          icon="📥"
        />
        <StatsCard
          title="Pending Clearance"
          value={stats.pendingCount}
          change={formatChequeAmount(stats.pendingAmount)}
          changeType="neutral"
          icon="⏳"
        />
        <StatsCard
          title="Bounced"
          value={stats.bouncedCount}
          change={stats.bouncedCount > 0 ? 'Needs attention' : 'None'}
          changeType={stats.bouncedCount > 0 ? 'negative' : 'positive'}
          icon="⚠️"
        />
      </div>

      {/* Tabs */}
      <div className="border-b border-factory-border">
        <div className="flex gap-1">
          {[
            { id: 'all' as const, label: 'All Cheques' },
            { id: 'received' as const, label: 'Received' },
            { id: 'issued' as const, label: 'Issued' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors relative ${
                activeTab === tab.id
                  ? 'text-primary-400'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-factory-dark rounded-2xl border border-factory-border p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="Search by cheque number, party name, or bank..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              className="px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Status</option>
              {Object.values(CHEQUE_STATUSES).map((status) => (
                <option key={status.code} value={status.code}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Cheques Table */}
      <div className="bg-factory-dark rounded-2xl border border-factory-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-factory-border">
                <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">Cheque #</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">Type</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">Party</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">Bank</th>
                <th className="text-right px-6 py-4 text-sm font-medium text-neutral-400">Amount</th>
                <th className="text-center px-6 py-4 text-sm font-medium text-neutral-400">Date</th>
                <th className="text-center px-6 py-4 text-sm font-medium text-neutral-400">Status</th>
                <th className="text-right px-6 py-4 text-sm font-medium text-neutral-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-factory-border">
              {filteredCheques.map((cheque) => {
                const daysUntil = getDaysUntilMaturity(cheque.chequeDate);
                const partyName = getChequePartyName(cheque);

                return (
                  <tr key={cheque.id} className="hover:bg-factory-gray transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-mono text-sm text-primary-400">
                        #{cheque.chequeNumber}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs rounded-md ${
                        cheque.chequeType === 'ISSUED'
                          ? 'bg-error/20 text-error'
                          : 'bg-success/20 text-success'
                      }`}>
                        {CHEQUE_TYPES[cheque.chequeType].label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-white">{partyName}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-neutral-300">{cheque.bankName}</p>
                      {cheque.branchName && (
                        <p className="text-xs text-neutral-500">{cheque.branchName}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-white font-medium">
                        {formatChequeAmount(cheque.amount)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <p className="text-white">{formatDate(cheque.chequeDate)}</p>
                      {cheque.status === 'PENDING' && (
                        <p className={`text-xs ${
                          daysUntil < 0 ? 'text-error' : daysUntil <= 3 ? 'text-warning' : 'text-neutral-400'
                        }`}>
                          {daysUntil < 0
                            ? `${Math.abs(daysUntil)} days overdue`
                            : daysUntil === 0
                              ? 'Due today'
                              : `${daysUntil} days`
                          }
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center">
                        <ChequeStatusBadge status={cheque.status} />
                      </div>
                      {cheque.bounceCount > 0 && (
                        <p className="text-xs text-error text-center mt-1">
                          Bounced {cheque.bounceCount}x
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <Link href={`/cheques/${cheque.id}`}>
                          <Button variant="ghost" size="sm">View</Button>
                        </Link>
                        {cheque.status === 'PENDING' && cheque.chequeType === 'RECEIVED' && (
                          <Button variant="ghost" size="sm">Deposit</Button>
                        )}
                        {cheque.status === 'DEPOSITED' && (
                          <Button variant="ghost" size="sm">Clear</Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredCheques.length === 0 && (
            <div className="text-center py-12">
              <p className="text-neutral-400">No cheques found matching your search.</p>
            </div>
          )}
        </div>
      </div>

      {/* Summary Footer */}
      <div className="bg-factory-dark rounded-2xl border border-factory-border p-4">
        <div className="flex flex-wrap gap-6 text-sm">
          <div>
            <span className="text-neutral-400">Showing:</span>{' '}
            <span className="text-white font-medium">{filteredCheques.length}</span>{' '}
            <span className="text-neutral-400">of {mockCheques.length} cheques</span>
          </div>
          <div>
            <span className="text-neutral-400">Total Amount:</span>{' '}
            <span className="text-white font-medium">
              {formatChequeAmount(filteredCheques.reduce((sum, c) => sum + c.amount, 0))}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
