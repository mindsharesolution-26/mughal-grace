'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { StatsCard } from '@/components/molecules/StatsCard';
import { ChequeStatusBadge } from '@/components/atoms/StatusBadge';
import { useToast } from '@/contexts/ToastContext';
import {
  chequesApi,
  Cheque,
  ChequeType,
  ChequeStatus,
  ChequeSummary,
  getChequeEntityName,
} from '@/lib/api/cheques';
import {
  CHEQUE_TYPES,
  CHEQUE_STATUSES,
  formatChequeAmount,
  formatDate,
  getDaysUntilMaturity,
} from '@/lib/types/cheque';
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

export default function ChequesPage() {
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const initialType = searchParams.get('type') as ChequeType | null;
  const initialStatus = searchParams.get('status') as ChequeStatus | null;

  // Data state
  const [cheques, setCheques] = useState<Cheque[]>([]);
  const [summary, setSummary] = useState<ChequeSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ChequeStatus | 'all'>(initialStatus || 'all');
  const [activeTab, setActiveTab] = useState<'all' | 'issued' | 'received'>(
    initialType === 'ISSUED' ? 'issued' : initialType === 'RECEIVED' ? 'received' : 'all'
  );

  // Pagination
  const [page, setPage] = useState(1);
  const [totalCheques, setTotalCheques] = useState(0);
  const limit = 20;

  // Load data
  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const typeFilter = activeTab === 'all' ? undefined : activeTab === 'issued' ? 'ISSUED' : 'RECEIVED';
      const statusFilterValue = statusFilter === 'all' ? undefined : statusFilter;

      const [chequesData, summaryData] = await Promise.all([
        chequesApi.getAll({
          page,
          limit,
          type: typeFilter,
          status: statusFilterValue,
        }),
        chequesApi.getSummary(),
      ]);

      setCheques(chequesData.data);
      setTotalCheques(chequesData.pagination?.total || chequesData.data.length);
      setSummary(summaryData);
    } catch (err: any) {
      setError(err.message || 'Failed to load cheques');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab, statusFilter, page]);

  // Local search filter (on loaded data)
  const filteredCheques = useMemo(() => {
    if (!searchQuery) return cheques;

    const query = searchQuery.toLowerCase();
    return cheques.filter((cheque) => {
      const partyName = getChequeEntityName(cheque).toLowerCase();
      return (
        cheque.chequeNumber.toLowerCase().includes(query) ||
        partyName.includes(query) ||
        cheque.bankName.toLowerCase().includes(query)
      );
    });
  }, [cheques, searchQuery]);

  // Calculate stats from summary
  const stats = useMemo(() => {
    if (!summary) {
      return {
        issuedCount: 0,
        issuedAmount: 0,
        receivedCount: 0,
        receivedAmount: 0,
        pendingCount: 0,
        pendingAmount: 0,
        bouncedCount: 0,
      };
    }

    const issued = summary.byType?.find(t => t.chequeType === 'ISSUED');
    const received = summary.byType?.find(t => t.chequeType === 'RECEIVED');

    return {
      issuedCount: issued?._count || 0,
      issuedAmount: issued?._sum?.amount || 0,
      receivedCount: received?._count || 0,
      receivedAmount: received?._sum?.amount || 0,
      pendingCount: summary.pendingClearance?.count || 0,
      pendingAmount: summary.pendingClearance?.amount || 0,
      bouncedCount: summary.bouncedCount || 0,
    };
  }, [summary]);

  // Action handlers
  const handleDeposit = async (chequeId: number) => {
    setActionLoading(chequeId);
    try {
      await chequesApi.deposit(chequeId, { depositDate: new Date().toISOString().split('T')[0] });
      showToast('success', 'Cheque marked as deposited');
      loadData();
    } catch (err: any) {
      showToast('error', err.response?.data?.error || 'Failed to deposit cheque');
    } finally {
      setActionLoading(null);
    }
  };

  const handleClear = async (chequeId: number) => {
    setActionLoading(chequeId);
    try {
      await chequesApi.clear(chequeId, { clearanceDate: new Date().toISOString().split('T')[0] });
      showToast('success', 'Cheque cleared successfully');
      loadData();
    } catch (err: any) {
      showToast('error', err.response?.data?.error || 'Failed to clear cheque');
    } finally {
      setActionLoading(null);
    }
  };

  if (isLoading && cheques.length === 0) {
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
          <h1 className="text-2xl font-semibold text-white">Cheques</h1>
          <p className="text-neutral-400 mt-1">
            Manage issued and received cheques
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={loadData} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
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
          title="Issued Cheques"
          value={stats.issuedCount}
          change={formatPKR(Number(stats.issuedAmount))}
          changeType="neutral"
          icon="📤"
        />
        <StatsCard
          title="Received Cheques"
          value={stats.receivedCount}
          change={formatPKR(Number(stats.receivedAmount))}
          changeType="neutral"
          icon="📥"
        />
        <StatsCard
          title="Pending Clearance"
          value={stats.pendingCount}
          change={formatPKR(Number(stats.pendingAmount))}
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
              onClick={() => {
                setActiveTab(tab.id);
                setPage(1);
              }}
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
              onChange={(e) => {
                setStatusFilter(e.target.value as typeof statusFilter);
                setPage(1);
              }}
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
                const partyName = getChequeEntityName(cheque);
                const isActionLoading = actionLoading === cheque.id;

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
                        {CHEQUE_TYPES[cheque.chequeType]?.label || cheque.chequeType}
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
                        {formatPKR(Number(cheque.amount))}
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
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeposit(cheque.id)}
                            disabled={isActionLoading}
                          >
                            {isActionLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Deposit'}
                          </Button>
                        )}
                        {cheque.status === 'DEPOSITED' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleClear(cheque.id)}
                            disabled={isActionLoading}
                          >
                            {isActionLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Clear'}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredCheques.length === 0 && !isLoading && (
            <div className="text-center py-12">
              <p className="text-neutral-400">No cheques found matching your search.</p>
            </div>
          )}
        </div>
      </div>

      {/* Pagination */}
      {totalCheques > limit && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-neutral-400">
            Showing {(page - 1) * limit + 1} - {Math.min(page * limit, totalCheques)} of {totalCheques}
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage(p => p + 1)}
              disabled={page * limit >= totalCheques}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Summary Footer */}
      <div className="bg-factory-dark rounded-2xl border border-factory-border p-4">
        <div className="flex flex-wrap gap-6 text-sm">
          <div>
            <span className="text-neutral-400">Showing:</span>{' '}
            <span className="text-white font-medium">{filteredCheques.length}</span>{' '}
            <span className="text-neutral-400">cheques</span>
          </div>
          <div>
            <span className="text-neutral-400">Total Amount:</span>{' '}
            <span className="text-white font-medium">
              {formatPKR(filteredCheques.reduce((sum, c) => sum + Number(c.amount), 0))}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
