'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { StatsCard } from '@/components/molecules/StatsCard';
import { salesLedgerApi } from '@/lib/api/sales-ledger';
import {
  SalesLedgerEntry,
  SalesLedgerSummary,
  SalesLedgerAlerts,
  PendingPayment,
  UpcomingCheque,
  entryTypeLabels,
  entryTypeColors,
  formatPKR,
  formatDate,
} from '@/lib/types/sales-ledger';
import {
  Loader2,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Users,
  Truck,
  ArrowDownToLine,
  ArrowUpFromLine,
  AlertCircle,
  Clock,
  FileText,
} from 'lucide-react';

type FilterType = 'all' | 'customer' | 'vendor';

export default function SalesLedgerPage() {
  const [entries, setEntries] = useState<SalesLedgerEntry[]>([]);
  const [summary, setSummary] = useState<SalesLedgerSummary | null>(null);
  const [alerts, setAlerts] = useState<SalesLedgerAlerts | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [typeFilter, setTypeFilter] = useState<FilterType>('all');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 30;

  useEffect(() => {
    loadData();
  }, [page, typeFilter]);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params: any = { page, limit, type: typeFilter };
      if (fromDate) params.fromDate = fromDate;
      if (toDate) params.toDate = toDate;

      const [ledgerResponse, alertsResponse] = await Promise.all([
        salesLedgerApi.getLedger(params),
        salesLedgerApi.getAlerts().catch(() => null),
      ]);

      setEntries(ledgerResponse.entries);
      setSummary(ledgerResponse.summary);
      setTotalPages(ledgerResponse.pagination.totalPages);
      setTotal(ledgerResponse.pagination.total);
      setAlerts(alertsResponse);
    } catch (err: any) {
      setError(err.message || 'Failed to load ledger data');
    } finally {
      setIsLoading(false);
    }
  };

  const applyDateFilter = () => {
    setPage(1);
    loadData();
  };

  const clearDateFilter = () => {
    setFromDate('');
    setToDate('');
    setPage(1);
    setTimeout(() => loadData(), 0);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm">
            <Link href="/finance" className="text-neutral-400 hover:text-white">
              Finance
            </Link>
            <span className="text-neutral-600">/</span>
            <span className="text-white">Sales Ledger</span>
          </div>
          <h1 className="text-2xl font-semibold text-white mt-2">Sales Ledger</h1>
          <p className="text-neutral-400 mt-1">
            Combined view of customer and vendor transactions
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatsCard
            title="Net Balance"
            value={formatPKR(summary.netBalance)}
            icon={summary.netBalance >= 0 ? '📈' : '📉'}
            change={summary.netBalance >= 0 ? 'Net receivable' : 'Net payable'}
            changeType={summary.netBalance >= 0 ? 'positive' : 'negative'}
          />
          <StatsCard
            title="Total Receivable"
            value={formatPKR(summary.totalReceivable)}
            icon="💰"
            change="Amount customers owe you"
            changeType="neutral"
          />
          <StatsCard
            title="Total Payable"
            value={formatPKR(summary.totalPayable)}
            icon="💸"
            change="Amount you owe vendors"
            changeType="neutral"
          />
        </div>
      )}

      {error && (
        <div className="bg-error/10 border border-error/20 rounded-xl p-4 text-error">
          {error}
          <Button variant="ghost" size="sm" onClick={loadData} className="ml-4">
            Retry
          </Button>
        </div>
      )}

      {/* Filters */}
      <div className="bg-factory-dark rounded-2xl border border-factory-border p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Type Filter */}
          <div className="flex gap-2">
            <Button
              variant={typeFilter === 'all' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => { setTypeFilter('all'); setPage(1); }}
            >
              <FileText className="w-4 h-4 mr-1" />
              All
            </Button>
            <Button
              variant={typeFilter === 'customer' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => { setTypeFilter('customer'); setPage(1); }}
            >
              <Users className="w-4 h-4 mr-1" />
              Customers
            </Button>
            <Button
              variant={typeFilter === 'vendor' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => { setTypeFilter('vendor'); setPage(1); }}
            >
              <Truck className="w-4 h-4 mr-1" />
              Vendors
            </Button>
          </div>

          {/* Date Range Filter */}
          <div className="flex flex-1 items-center gap-2">
            <Calendar className="w-4 h-4 text-neutral-500" />
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-40"
              placeholder="From Date"
            />
            <span className="text-neutral-500">to</span>
            <Input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-40"
              placeholder="To Date"
            />
            <Button variant="secondary" size="sm" onClick={applyDateFilter}>
              Apply
            </Button>
            {(fromDate || toDate) && (
              <Button variant="ghost" size="sm" onClick={clearDateFilter}>
                Clear
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-factory-dark rounded-2xl border border-factory-border overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-factory-border">
                    <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">
                      Date
                    </th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">
                      Party
                    </th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">
                      Entry Type
                    </th>
                    <th className="text-right px-6 py-4 text-sm font-medium text-neutral-400">
                      Debit
                    </th>
                    <th className="text-right px-6 py-4 text-sm font-medium text-neutral-400">
                      Credit
                    </th>
                    <th className="text-right px-6 py-4 text-sm font-medium text-neutral-400">
                      Balance
                    </th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">
                      Reference
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-factory-border">
                  {entries.map((entry) => {
                    const typeStyle = entryTypeColors[entry.entryType] || { bg: 'bg-neutral-500/20', text: 'text-neutral-400' };
                    const debit = parseFloat(entry.debit);
                    const credit = parseFloat(entry.credit);
                    const balance = parseFloat(entry.balance);

                    return (
                      <tr key={`${entry.partyType}-${entry.id}`} className="hover:bg-factory-gray transition-colors">
                        <td className="px-6 py-4 text-neutral-300">
                          {formatDate(entry.entryDate)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className={`px-1.5 py-0.5 text-xs font-medium rounded ${
                              entry.partyType === 'customer'
                                ? 'bg-primary-500/20 text-primary-400'
                                : 'bg-warning/20 text-warning'
                            }`}>
                              {entry.partyType === 'customer' ? 'C' : 'V'}
                            </span>
                            <div>
                              <Link
                                href={entry.partyType === 'customer'
                                  ? `/finance/customers/${entry.partyId}`
                                  : `/finance/vendors/${entry.partyId}`
                                }
                                className="text-white font-medium hover:text-primary-400"
                              >
                                {entry.partyName}
                              </Link>
                              <p className="text-xs text-neutral-500 font-mono">{entry.partyCode}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${typeStyle.bg} ${typeStyle.text}`}>
                            {entryTypeLabels[entry.entryType] || entry.entryType}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {debit > 0 ? (
                            <span className="text-error font-medium">{formatPKR(debit)}</span>
                          ) : (
                            <span className="text-neutral-500">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          {credit > 0 ? (
                            <span className="text-success font-medium">{formatPKR(credit)}</span>
                          ) : (
                            <span className="text-neutral-500">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className={`font-medium ${balance > 0 ? 'text-warning' : balance < 0 ? 'text-success' : 'text-neutral-300'}`}>
                            {formatPKR(balance)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {entry.referenceNumber ? (
                            <span className="text-xs text-neutral-400 font-mono">{entry.referenceNumber}</span>
                          ) : entry.description ? (
                            <span className="text-xs text-neutral-500">{entry.description}</span>
                          ) : (
                            <span className="text-neutral-600">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {entries.length === 0 && !isLoading && (
                <div className="text-center py-12">
                  <p className="text-neutral-400">No ledger entries found.</p>
                  <p className="text-sm text-neutral-500 mt-2">
                    Ledger entries will appear here when you create sales, purchases, or payments.
                  </p>
                </div>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-factory-border">
                <p className="text-sm text-neutral-400">
                  Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} entries
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="flex items-center px-3 text-sm text-neutral-400">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Alerts Section */}
      {alerts && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pending Payments */}
          <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="w-5 h-5 text-warning" />
              <h3 className="text-lg font-semibold text-white">Pending Payments</h3>
            </div>
            {alerts.pendingPayments.length > 0 ? (
              <div className="space-y-3">
                {alerts.pendingPayments.map((payment, idx) => (
                  <div
                    key={`${payment.partyType}-${payment.partyId}-${idx}`}
                    className="flex items-center justify-between p-3 bg-factory-gray rounded-xl"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`px-1.5 py-0.5 text-xs font-medium rounded ${
                        payment.partyType === 'customer'
                          ? 'bg-primary-500/20 text-primary-400'
                          : 'bg-warning/20 text-warning'
                      }`}>
                        {payment.partyType === 'customer' ? 'C' : 'V'}
                      </span>
                      <div>
                        <p className="text-white font-medium">{payment.partyName}</p>
                        <p className="text-xs text-neutral-500">
                          {payment.direction === 'receivable' ? (
                            <span className="flex items-center gap-1">
                              <ArrowDownToLine className="w-3 h-3" /> To receive
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <ArrowUpFromLine className="w-3 h-3" /> To pay
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <span className={`font-semibold ${
                      payment.direction === 'receivable' ? 'text-success' : 'text-warning'
                    }`}>
                      {formatPKR(payment.amount)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-neutral-500 text-center py-4">No pending payments</p>
            )}
          </div>

          {/* Upcoming Cheques */}
          <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-info" />
              <h3 className="text-lg font-semibold text-white">Upcoming Cheques (30 days)</h3>
            </div>
            {alerts.upcomingCheques.length > 0 ? (
              <div className="space-y-3">
                {alerts.upcomingCheques.map((cheque) => (
                  <div
                    key={cheque.id}
                    className="flex items-center justify-between p-3 bg-factory-gray rounded-xl"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`px-1.5 py-0.5 text-xs font-medium rounded ${
                        cheque.chequeType === 'RECEIVED'
                          ? 'bg-success/20 text-success'
                          : 'bg-error/20 text-error'
                      }`}>
                        {cheque.chequeType === 'RECEIVED' ? 'IN' : 'OUT'}
                      </span>
                      <div>
                        <p className="text-white font-medium">{cheque.chequeNumber}</p>
                        <p className="text-xs text-neutral-500">{cheque.partyName}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-white">{formatPKR(cheque.amount)}</p>
                      <p className={`text-xs ${
                        cheque.daysUntilDue <= 3 ? 'text-error' :
                        cheque.daysUntilDue <= 7 ? 'text-warning' :
                        'text-neutral-400'
                      }`}>
                        {cheque.daysUntilDue === 0 ? 'Due today' :
                         cheque.daysUntilDue === 1 ? 'Due tomorrow' :
                         `Due in ${cheque.daysUntilDue} days`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-neutral-500 text-center py-4">No upcoming cheques</p>
            )}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
        <h3 className="text-lg font-semibold text-white mb-3">Legend</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="flex items-start gap-3">
            <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-primary-500/20 text-primary-400">C</span>
            <p className="text-neutral-400">Customer transaction - money owed to you</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-warning/20 text-warning">V</span>
            <p className="text-neutral-400">Vendor transaction - money you owe</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-lg">💡</span>
            <p className="text-neutral-400">
              Debit increases what is owed, Credit decreases it
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
