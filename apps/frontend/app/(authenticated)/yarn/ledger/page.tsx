'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/contexts/ToastContext';
import { yarnLedgerApi, LedgerQueryParams } from '@/lib/api/yarn-ledger';
import { yarnTypesApi, YarnTypeLookup } from '@/lib/api/yarn-types';
import { YarnLedgerEntry, YarnLedgerSummary, YarnLedgerEntryType, PaymentStatus } from '@/lib/types/yarn';
import {
  FileSpreadsheet,
  ArrowDownToLine,
  ArrowUpFromLine,
  Package,
  DollarSign,
  Search,
  Filter,
  RefreshCw,
  Eye,
  X,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

// Entry type badge colors
const ENTRY_TYPE_COLORS: Record<YarnLedgerEntryType, string> = {
  OPENING_BALANCE: 'bg-purple-500/20 text-purple-400',
  INWARD: 'bg-green-500/20 text-green-400',
  OUTWARD: 'bg-red-500/20 text-red-400',
  ADJUSTMENT: 'bg-yellow-500/20 text-yellow-400',
  RETURN: 'bg-blue-500/20 text-blue-400',
};

// Payment status badge colors
const PAYMENT_STATUS_COLORS: Record<PaymentStatus, string> = {
  UNPAID: 'bg-red-500/20 text-red-400',
  PARTIAL: 'bg-yellow-500/20 text-yellow-400',
  PAID: 'bg-green-500/20 text-green-400',
  OVERDUE: 'bg-orange-500/20 text-orange-400',
};

export default function YarnLedgerPage() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<YarnLedgerEntry[]>([]);
  const [summary, setSummary] = useState<{
    summary: YarnLedgerSummary[];
    totals: { totalStock: number; totalIn: number; totalOut: number; totalValue: number };
  } | null>(null);
  const [yarnTypes, setYarnTypes] = useState<YarnTypeLookup[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 25,
    total: 0,
    totalPages: 0,
  });

  // Filters
  const [filters, setFilters] = useState<LedgerQueryParams>({
    page: 1,
    limit: 25,
  });
  const [showFilters, setShowFilters] = useState(false);

  // View modal
  const [viewEntry, setViewEntry] = useState<YarnLedgerEntry | null>(null);

  useEffect(() => {
    loadData();
  }, [filters]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [ledgerResponse, summaryResponse, typesResponse] = await Promise.all([
        yarnLedgerApi.getAll(filters),
        yarnLedgerApi.getSummary(),
        yarnTypesApi.getLookup(),
      ]);
      setEntries(ledgerResponse.data);
      setPagination(ledgerResponse.pagination);
      setSummary(summaryResponse.data);
      setYarnTypes(typesResponse);
    } catch (error) {
      console.error('Failed to load ledger data:', error);
      showToast('error', 'Failed to load ledger data');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: keyof LedgerQueryParams, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value || undefined,
      page: 1, // Reset to first page when filters change
    }));
  };

  const clearFilters = () => {
    setFilters({ page: 1, limit: 25 });
  };

  const handlePageChange = (newPage: number) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-PK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatNumber = (num: number, decimals = 2) => {
    return num.toLocaleString('en-PK', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  const formatCurrency = (num: number) => {
    return `Rs. ${formatNumber(num, 0)}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary-500/20 rounded-lg">
            <FileSpreadsheet className="w-6 h-6 text-primary-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Yarn Ledger</h1>
            <p className="text-neutral-400 text-sm">Track yarn inventory with running balance</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              showFilters
                ? 'bg-primary-500 text-white'
                : 'bg-factory-gray text-neutral-300 hover:bg-factory-border'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
          </button>
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-factory-gray text-neutral-300 rounded-lg hover:bg-factory-border transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-factory-dark rounded-xl p-4 border border-factory-border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Package className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-neutral-400 text-sm">Total Stock</p>
                <p className="text-xl font-bold text-white">{formatNumber(summary.totals.totalStock)} KG</p>
              </div>
            </div>
          </div>
          <div className="bg-factory-dark rounded-xl p-4 border border-factory-border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <ArrowDownToLine className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-neutral-400 text-sm">Total Inward</p>
                <p className="text-xl font-bold text-white">{formatNumber(summary.totals.totalIn)} KG</p>
              </div>
            </div>
          </div>
          <div className="bg-factory-dark rounded-xl p-4 border border-factory-border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/20 rounded-lg">
                <ArrowUpFromLine className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <p className="text-neutral-400 text-sm">Total Outward</p>
                <p className="text-xl font-bold text-white">{formatNumber(summary.totals.totalOut)} KG</p>
              </div>
            </div>
          </div>
          <div className="bg-factory-dark rounded-xl p-4 border border-factory-border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-500/20 rounded-lg">
                <DollarSign className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <p className="text-neutral-400 text-sm">Stock Value</p>
                <p className="text-xl font-bold text-white">{formatCurrency(summary.totals.totalValue)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-factory-dark rounded-xl p-4 border border-factory-border">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Yarn Type Filter */}
            <div>
              <label className="block text-sm text-neutral-400 mb-1">Yarn Type</label>
              <select
                value={filters.yarnTypeId || ''}
                onChange={(e) => handleFilterChange('yarnTypeId', e.target.value ? Number(e.target.value) : undefined)}
                className="w-full px-3 py-2 bg-factory-gray border border-factory-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">All Types</option>
                {yarnTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.code} - {type.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Entry Type Filter */}
            <div>
              <label className="block text-sm text-neutral-400 mb-1">Entry Type</label>
              <select
                value={filters.entryType || ''}
                onChange={(e) => handleFilterChange('entryType', e.target.value || undefined)}
                className="w-full px-3 py-2 bg-factory-gray border border-factory-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">All Types</option>
                <option value="OPENING_BALANCE">Opening Balance</option>
                <option value="INWARD">Inward</option>
                <option value="OUTWARD">Outward</option>
                <option value="ADJUSTMENT">Adjustment</option>
                <option value="RETURN">Return</option>
              </select>
            </div>

            {/* Payment Status Filter */}
            <div>
              <label className="block text-sm text-neutral-400 mb-1">Payment Status</label>
              <select
                value={filters.paymentStatus || ''}
                onChange={(e) => handleFilterChange('paymentStatus', e.target.value || undefined)}
                className="w-full px-3 py-2 bg-factory-gray border border-factory-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">All Status</option>
                <option value="UNPAID">Unpaid</option>
                <option value="PARTIAL">Partial</option>
                <option value="PAID">Paid</option>
                <option value="OVERDUE">Overdue</option>
              </select>
            </div>

            {/* Start Date */}
            <div>
              <label className="block text-sm text-neutral-400 mb-1">Start Date</label>
              <input
                type="date"
                value={filters.startDate || ''}
                onChange={(e) => handleFilterChange('startDate', e.target.value || undefined)}
                className="w-full px-3 py-2 bg-factory-gray border border-factory-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {/* End Date */}
            <div>
              <label className="block text-sm text-neutral-400 mb-1">End Date</label>
              <input
                type="date"
                value={filters.endDate || ''}
                onChange={(e) => handleFilterChange('endDate', e.target.value || undefined)}
                className="w-full px-3 py-2 bg-factory-gray border border-factory-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          <div className="flex justify-end mt-4">
            <button
              onClick={clearFilters}
              className="px-4 py-2 text-neutral-400 hover:text-white transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>
      )}

      {/* Ledger Table */}
      <div className="bg-factory-dark rounded-xl border border-factory-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-factory-border bg-factory-gray/50">
                <th className="text-left px-4 py-3 text-sm font-medium text-neutral-400">Date</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-neutral-400">Yarn Type</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-neutral-400">Entry Type</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-neutral-400">Vendor</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-neutral-400">Invoice</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-neutral-400">In (KG)</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-neutral-400">Out (KG)</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-neutral-400">Balance (KG)</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-neutral-400">Rate/KG</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-neutral-400">Payment</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-neutral-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center text-neutral-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Loading ledger entries...
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center text-neutral-400">
                    No ledger entries found
                  </td>
                </tr>
              ) : (
                entries.map((entry) => (
                  <tr key={entry.id} className="border-b border-factory-border hover:bg-factory-gray/30 transition-colors">
                    <td className="px-4 py-3 text-sm text-white">
                      {formatDate(entry.entryDate)}
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <span className="text-sm font-medium text-white">
                          {entry.yarnType?.code || '-'}
                        </span>
                        <p className="text-xs text-neutral-400">{entry.yarnType?.name || '-'}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${ENTRY_TYPE_COLORS[entry.entryType]}`}>
                        {entry.entryType.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-neutral-300">
                      {entry.vendor?.name || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-neutral-300">
                      {entry.invoiceNumber || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      {Number(entry.quantityIn) > 0 ? (
                        <span className="text-green-400">+{formatNumber(Number(entry.quantityIn))}</span>
                      ) : (
                        <span className="text-neutral-500">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      {Number(entry.quantityOut) > 0 ? (
                        <span className="text-red-400">-{formatNumber(Number(entry.quantityOut))}</span>
                      ) : (
                        <span className="text-neutral-500">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-white">
                      {formatNumber(Number(entry.runningBalance))}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-neutral-300">
                      {entry.pricePerKg ? formatNumber(Number(entry.pricePerKg)) : '-'}
                    </td>
                    <td className="px-4 py-3">
                      {entry.paymentStatus ? (
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${PAYMENT_STATUS_COLORS[entry.paymentStatus]}`}>
                          {entry.paymentStatus}
                        </span>
                      ) : (
                        <span className="text-neutral-500">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => setViewEntry(entry)}
                        className="p-1.5 text-neutral-400 hover:text-white hover:bg-factory-gray rounded-lg transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-factory-border">
            <p className="text-sm text-neutral-400">
              Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} entries
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="p-2 text-neutral-400 hover:text-white hover:bg-factory-gray rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-neutral-300">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
                className="p-2 text-neutral-400 hover:text-white hover:bg-factory-gray rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* View Entry Modal */}
      {viewEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-factory-dark rounded-xl border border-factory-border w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-factory-border">
              <h3 className="text-lg font-semibold text-white">Ledger Entry Details</h3>
              <button
                onClick={() => setViewEntry(null)}
                className="p-2 text-neutral-400 hover:text-white hover:bg-factory-gray rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-neutral-400">Date</label>
                  <p className="text-white">{formatDate(viewEntry.entryDate)}</p>
                </div>
                <div>
                  <label className="text-sm text-neutral-400">Entry Type</label>
                  <p>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${ENTRY_TYPE_COLORS[viewEntry.entryType]}`}>
                      {viewEntry.entryType.replace('_', ' ')}
                    </span>
                  </p>
                </div>
                <div>
                  <label className="text-sm text-neutral-400">Yarn Type</label>
                  <p className="text-white">{viewEntry.yarnType?.code} - {viewEntry.yarnType?.name}</p>
                </div>
                <div>
                  <label className="text-sm text-neutral-400">Vendor</label>
                  <p className="text-white">{viewEntry.vendor?.name || '-'}</p>
                </div>
                <div>
                  <label className="text-sm text-neutral-400">Invoice Number</label>
                  <p className="text-white">{viewEntry.invoiceNumber || '-'}</p>
                </div>
                <div>
                  <label className="text-sm text-neutral-400">Reference</label>
                  <p className="text-white">{viewEntry.referenceNumber || '-'}</p>
                </div>
                <div>
                  <label className="text-sm text-neutral-400">Quantity In</label>
                  <p className="text-green-400">{formatNumber(Number(viewEntry.quantityIn))} KG</p>
                </div>
                <div>
                  <label className="text-sm text-neutral-400">Quantity Out</label>
                  <p className="text-red-400">{formatNumber(Number(viewEntry.quantityOut))} KG</p>
                </div>
                <div>
                  <label className="text-sm text-neutral-400">Running Balance</label>
                  <p className="text-white font-bold">{formatNumber(Number(viewEntry.runningBalance))} KG</p>
                </div>
                <div>
                  <label className="text-sm text-neutral-400">Price/KG</label>
                  <p className="text-white">{viewEntry.pricePerKg ? `Rs. ${formatNumber(Number(viewEntry.pricePerKg))}` : '-'}</p>
                </div>
                <div>
                  <label className="text-sm text-neutral-400">Total Value</label>
                  <p className="text-white">{viewEntry.totalValue ? formatCurrency(Number(viewEntry.totalValue)) : '-'}</p>
                </div>
                <div>
                  <label className="text-sm text-neutral-400">Payment Status</label>
                  <p>
                    {viewEntry.paymentStatus ? (
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${PAYMENT_STATUS_COLORS[viewEntry.paymentStatus]}`}>
                        {viewEntry.paymentStatus}
                      </span>
                    ) : (
                      <span className="text-neutral-400">-</span>
                    )}
                  </p>
                </div>
              </div>
              {viewEntry.description && (
                <div>
                  <label className="text-sm text-neutral-400">Description</label>
                  <p className="text-white">{viewEntry.description}</p>
                </div>
              )}
              {viewEntry.notes && (
                <div>
                  <label className="text-sm text-neutral-400">Notes</label>
                  <p className="text-neutral-300">{viewEntry.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
