'use client';

import { cn } from '@/lib/utils/cn';

export interface LedgerEntry {
  id: string;
  entryDate: string;
  entryType: string;
  description?: string;
  referenceNumber?: string;
  debit: number;
  credit: number;
  balance: number;
}

export interface LedgerTableProps {
  entries: LedgerEntry[];
  isLoading?: boolean;
  emptyMessage?: string;
  showEntryType?: boolean;
  entryTypeLabels?: Record<string, string>;
  className?: string;
  onRowClick?: (entry: LedgerEntry) => void;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-PK', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-PK', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function LedgerTable({
  entries,
  isLoading = false,
  emptyMessage = 'No ledger entries found',
  showEntryType = true,
  entryTypeLabels = {},
  className,
  onRowClick,
}: LedgerTableProps) {
  if (isLoading) {
    return (
      <div className={cn('rounded-xl border border-factory-border overflow-hidden', className)}>
        <div className="animate-pulse">
          <div className="bg-factory-gray h-12" />
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="border-t border-factory-border bg-factory-dark h-14" />
          ))}
        </div>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className={cn('rounded-xl border border-factory-border bg-factory-dark p-8 text-center', className)}>
        <p className="text-neutral-400">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={cn('rounded-xl border border-factory-border overflow-hidden', className)}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-factory-gray">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider">
                Date
              </th>
              {showEntryType && (
                <th className="px-4 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider">
                  Type
                </th>
              )}
              <th className="px-4 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider">
                Description
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider">
                Reference
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-neutral-400 uppercase tracking-wider">
                Debit
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-neutral-400 uppercase tracking-wider">
                Credit
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-neutral-400 uppercase tracking-wider">
                Balance
              </th>
            </tr>
          </thead>
          <tbody className="bg-factory-dark divide-y divide-factory-border">
            {entries.map((entry) => (
              <tr
                key={entry.id}
                className={cn(
                  'hover:bg-factory-gray/50 transition-colors',
                  onRowClick && 'cursor-pointer'
                )}
                onClick={() => onRowClick?.(entry)}
              >
                <td className="px-4 py-3 text-sm text-neutral-300 whitespace-nowrap">
                  {formatDate(entry.entryDate)}
                </td>
                {showEntryType && (
                  <td className="px-4 py-3 text-sm text-neutral-300 whitespace-nowrap">
                    <span className="px-2 py-1 rounded-md bg-factory-gray text-xs">
                      {entryTypeLabels[entry.entryType] || entry.entryType.replace(/_/g, ' ')}
                    </span>
                  </td>
                )}
                <td className="px-4 py-3 text-sm text-white max-w-xs truncate">
                  {entry.description || '-'}
                </td>
                <td className="px-4 py-3 text-sm text-neutral-400 whitespace-nowrap">
                  {entry.referenceNumber || '-'}
                </td>
                <td className="px-4 py-3 text-sm text-right whitespace-nowrap">
                  {entry.debit > 0 ? (
                    <span className="text-red-400">{formatCurrency(entry.debit)}</span>
                  ) : (
                    <span className="text-neutral-500">-</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-right whitespace-nowrap">
                  {entry.credit > 0 ? (
                    <span className="text-green-400">{formatCurrency(entry.credit)}</span>
                  ) : (
                    <span className="text-neutral-500">-</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-right whitespace-nowrap font-medium">
                  <span className={entry.balance >= 0 ? 'text-white' : 'text-red-400'}>
                    {formatCurrency(Math.abs(entry.balance))}
                    {entry.balance < 0 && ' CR'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Summary row component for totals
export interface LedgerSummaryProps {
  totalDebit: number;
  totalCredit: number;
  closingBalance: number;
  className?: string;
}

export function LedgerSummary({
  totalDebit,
  totalCredit,
  closingBalance,
  className,
}: LedgerSummaryProps) {
  return (
    <div className={cn('rounded-xl border border-factory-border bg-factory-gray p-4', className)}>
      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-xs text-neutral-400 uppercase tracking-wider mb-1">Total Debit</p>
          <p className="text-lg font-semibold text-red-400">{formatCurrency(totalDebit)}</p>
        </div>
        <div>
          <p className="text-xs text-neutral-400 uppercase tracking-wider mb-1">Total Credit</p>
          <p className="text-lg font-semibold text-green-400">{formatCurrency(totalCredit)}</p>
        </div>
        <div>
          <p className="text-xs text-neutral-400 uppercase tracking-wider mb-1">Closing Balance</p>
          <p className={cn('text-lg font-semibold', closingBalance >= 0 ? 'text-white' : 'text-red-400')}>
            {formatCurrency(Math.abs(closingBalance))}
            {closingBalance < 0 && ' CR'}
          </p>
        </div>
      </div>
    </div>
  );
}
