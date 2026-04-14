'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/atoms/Button';
import { StatsCard } from '@/components/molecules/StatsCard';
import { formatPKR } from '@/lib/types/receivables';

// Mock aging data
interface AgingEntry {
  id: string;
  code: string;
  name: string;
  contactPerson: string;
  city: string;
  current: number;
  days1To30: number;
  days31To60: number;
  days61To90: number;
  daysOver90: number;
  totalOutstanding: number;
  creditLimit: number;
  rating: number;
}

const mockAgingData: AgingEntry[] = [
  {
    id: '1',
    code: 'CUST-001',
    name: 'Fashion Hub',
    contactPerson: 'Imran Ali',
    city: 'Lahore',
    current: 200000,
    days1To30: 150000,
    days31To60: 75000,
    days61To90: 25000,
    daysOver90: 0,
    totalOutstanding: 450000,
    creditLimit: 1000000,
    rating: 5,
  },
  {
    id: '2',
    code: 'CUST-002',
    name: 'Textile World',
    contactPerson: 'Ahmed Hassan',
    city: 'Faisalabad',
    current: 180000,
    days1To30: 120000,
    days31To60: 80000,
    days61To90: 0,
    daysOver90: 0,
    totalOutstanding: 380000,
    creditLimit: 800000,
    rating: 4,
  },
  {
    id: '3',
    code: 'CUST-003',
    name: 'Garment King',
    contactPerson: 'Bilal Shah',
    city: 'Karachi',
    current: 120000,
    days1To30: 100000,
    days31To60: 60000,
    days61To90: 40000,
    daysOver90: 0,
    totalOutstanding: 320000,
    creditLimit: 750000,
    rating: 4,
  },
  {
    id: '4',
    code: 'CUST-004',
    name: 'Style Factory',
    contactPerson: 'Usman Raza',
    city: 'Lahore',
    current: 100000,
    days1To30: 75000,
    days31To60: 50000,
    days61To90: 30000,
    daysOver90: 20000,
    totalOutstanding: 275000,
    creditLimit: 500000,
    rating: 3,
  },
  {
    id: '5',
    code: 'CUST-005',
    name: 'Cloth House',
    contactPerson: 'Tariq Mehmood',
    city: 'Multan',
    current: 80000,
    days1To30: 60000,
    days31To60: 40000,
    days61To90: 25000,
    daysOver90: 15000,
    totalOutstanding: 220000,
    creditLimit: 400000,
    rating: 4,
  },
];

export default function ReceivablesAgingPage() {
  // Calculate summary stats
  const summary = useMemo(() => {
    const totals = mockAgingData.reduce(
      (acc, entry) => ({
        current: acc.current + entry.current,
        days1To30: acc.days1To30 + entry.days1To30,
        days31To60: acc.days31To60 + entry.days31To60,
        days61To90: acc.days61To90 + entry.days61To90,
        daysOver90: acc.daysOver90 + entry.daysOver90,
        totalOutstanding: acc.totalOutstanding + entry.totalOutstanding,
      }),
      { current: 0, days1To30: 0, days31To60: 0, days61To90: 0, daysOver90: 0, totalOutstanding: 0 }
    );

    const totalOverdue = totals.days1To30 + totals.days31To60 + totals.days61To90 + totals.daysOver90;
    const customerCount = mockAgingData.length;
    const criticalCount = mockAgingData.filter((e) => e.daysOver90 > 0).length;

    return {
      ...totals,
      totalOverdue,
      customerCount,
      criticalCount,
    };
  }, []);

  // Calculate bucket percentages for chart
  const bucketPercentages = useMemo(() => {
    const total = summary.totalOutstanding;
    if (total === 0) return { current: 0, days1To30: 0, days31To60: 0, days61To90: 0, daysOver90: 0 };
    return {
      current: (summary.current / total) * 100,
      days1To30: (summary.days1To30 / total) * 100,
      days31To60: (summary.days31To60 / total) * 100,
      days61To90: (summary.days61To90 / total) * 100,
      daysOver90: (summary.daysOver90 / total) * 100,
    };
  }, [summary]);

  const renderRating = (rating: number) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          className={`text-sm ${star <= rating ? 'text-yellow-400' : 'text-neutral-600'}`}
        >
          ★
        </span>
      ))}
    </div>
  );

  const handlePrint = () => {
    window.print();
  };

  const getUtilizationColor = (outstanding: number, limit: number) => {
    const utilization = (outstanding / limit) * 100;
    if (utilization > 80) return 'text-error';
    if (utilization > 50) return 'text-warning';
    return 'text-success';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2 text-sm">
            <Link href="/receivables" className="text-neutral-400 hover:text-white">
              Receivables
            </Link>
            <span className="text-neutral-600">/</span>
            <span className="text-white">Aging Report</span>
          </div>
          <h1 className="text-2xl font-semibold text-white mt-2">Receivables Aging Report</h1>
          <p className="text-neutral-400 mt-1">
            Analysis of outstanding receivables by age bucket
          </p>
        </div>
        <Button variant="secondary" onClick={handlePrint}>
          Print Report
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Receivables"
          value={formatPKR(summary.totalOutstanding)}
          icon="💰"
        />
        <StatsCard
          title="Total Overdue"
          value={formatPKR(summary.totalOverdue)}
          change={summary.totalOverdue > 0 ? 'Needs follow-up' : 'All current'}
          changeType={summary.totalOverdue > 0 ? 'negative' : 'positive'}
          icon="⚠️"
        />
        <StatsCard
          title="Customers"
          value={summary.customerCount}
          icon="👥"
        />
        <StatsCard
          title="Critical (90+ days)"
          value={summary.criticalCount}
          change={summary.criticalCount > 0 ? `${formatPKR(summary.daysOver90)}` : 'None'}
          changeType={summary.criticalCount > 0 ? 'negative' : 'positive'}
          icon="🔴"
        />
      </div>

      {/* Aging Buckets Visualization */}
      <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Aging Distribution</h2>

        {/* Stacked Bar */}
        <div className="h-8 rounded-full overflow-hidden flex mb-4">
          <div
            className="bg-success transition-all"
            style={{ width: `${bucketPercentages.current}%` }}
            title={`Current: ${formatPKR(summary.current)}`}
          />
          <div
            className="bg-yellow-500 transition-all"
            style={{ width: `${bucketPercentages.days1To30}%` }}
            title={`1-30 Days: ${formatPKR(summary.days1To30)}`}
          />
          <div
            className="bg-orange-500 transition-all"
            style={{ width: `${bucketPercentages.days31To60}%` }}
            title={`31-60 Days: ${formatPKR(summary.days31To60)}`}
          />
          <div
            className="bg-red-400 transition-all"
            style={{ width: `${bucketPercentages.days61To90}%` }}
            title={`61-90 Days: ${formatPKR(summary.days61To90)}`}
          />
          <div
            className="bg-red-600 transition-all"
            style={{ width: `${bucketPercentages.daysOver90}%` }}
            title={`90+ Days: ${formatPKR(summary.daysOver90)}`}
          />
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-success" />
            <span className="text-sm text-neutral-300">Current ({bucketPercentages.current.toFixed(1)}%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <span className="text-sm text-neutral-300">1-30 Days ({bucketPercentages.days1To30.toFixed(1)}%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-500" />
            <span className="text-sm text-neutral-300">31-60 Days ({bucketPercentages.days31To60.toFixed(1)}%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <span className="text-sm text-neutral-300">61-90 Days ({bucketPercentages.days61To90.toFixed(1)}%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-600" />
            <span className="text-sm text-neutral-300">90+ Days ({bucketPercentages.daysOver90.toFixed(1)}%)</span>
          </div>
        </div>
      </div>

      {/* Bucket Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="bg-factory-dark rounded-xl border border-factory-border p-4 text-center">
          <div className="w-3 h-3 rounded-full bg-success mx-auto mb-2" />
          <p className="text-xs text-neutral-400 uppercase tracking-wider">Current</p>
          <p className="text-xl font-semibold text-success">{formatPKR(summary.current)}</p>
        </div>
        <div className="bg-factory-dark rounded-xl border border-factory-border p-4 text-center">
          <div className="w-3 h-3 rounded-full bg-yellow-500 mx-auto mb-2" />
          <p className="text-xs text-neutral-400 uppercase tracking-wider">1-30 Days</p>
          <p className="text-xl font-semibold text-yellow-500">{formatPKR(summary.days1To30)}</p>
        </div>
        <div className="bg-factory-dark rounded-xl border border-factory-border p-4 text-center">
          <div className="w-3 h-3 rounded-full bg-orange-500 mx-auto mb-2" />
          <p className="text-xs text-neutral-400 uppercase tracking-wider">31-60 Days</p>
          <p className="text-xl font-semibold text-orange-500">{formatPKR(summary.days31To60)}</p>
        </div>
        <div className="bg-factory-dark rounded-xl border border-factory-border p-4 text-center">
          <div className="w-3 h-3 rounded-full bg-red-400 mx-auto mb-2" />
          <p className="text-xs text-neutral-400 uppercase tracking-wider">61-90 Days</p>
          <p className="text-xl font-semibold text-red-400">{formatPKR(summary.days61To90)}</p>
        </div>
        <div className="bg-factory-dark rounded-xl border border-factory-border p-4 text-center">
          <div className="w-3 h-3 rounded-full bg-red-600 mx-auto mb-2" />
          <p className="text-xs text-neutral-400 uppercase tracking-wider">90+ Days</p>
          <p className="text-xl font-semibold text-red-600">{formatPKR(summary.daysOver90)}</p>
        </div>
      </div>

      {/* Detailed Table */}
      <div className="bg-factory-dark rounded-2xl border border-factory-border overflow-hidden">
        <div className="px-6 py-4 border-b border-factory-border">
          <h2 className="text-lg font-semibold text-white">Customer-wise Aging</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-factory-border bg-factory-gray">
                <th className="text-left px-6 py-3 text-xs font-medium text-neutral-400 uppercase">Customer</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-neutral-400 uppercase">Rating</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-success uppercase">Current</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-yellow-500 uppercase">1-30</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-orange-500 uppercase">31-60</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-red-400 uppercase">61-90</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-red-600 uppercase">90+</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-white uppercase">Total</th>
                <th className="text-right px-6 py-3 text-xs font-medium text-neutral-400 uppercase">Limit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-factory-border">
              {mockAgingData.map((entry) => (
                <tr key={entry.id} className="hover:bg-factory-gray/50 transition-colors">
                  <td className="px-6 py-4">
                    <div>
                      <Link
                        href={`/receivables/customers/${entry.id}`}
                        className="text-white font-medium hover:text-primary-400"
                      >
                        {entry.name}
                      </Link>
                      <p className="text-xs text-neutral-500">{entry.city} • {entry.contactPerson}</p>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex justify-center">
                      {renderRating(entry.rating)}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span className={entry.current > 0 ? 'text-success' : 'text-neutral-500'}>
                      {entry.current > 0 ? formatPKR(entry.current) : '-'}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span className={entry.days1To30 > 0 ? 'text-yellow-500' : 'text-neutral-500'}>
                      {entry.days1To30 > 0 ? formatPKR(entry.days1To30) : '-'}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span className={entry.days31To60 > 0 ? 'text-orange-500' : 'text-neutral-500'}>
                      {entry.days31To60 > 0 ? formatPKR(entry.days31To60) : '-'}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span className={entry.days61To90 > 0 ? 'text-red-400' : 'text-neutral-500'}>
                      {entry.days61To90 > 0 ? formatPKR(entry.days61To90) : '-'}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span className={entry.daysOver90 > 0 ? 'text-red-600 font-semibold' : 'text-neutral-500'}>
                      {entry.daysOver90 > 0 ? formatPKR(entry.daysOver90) : '-'}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span className="text-white font-semibold">{formatPKR(entry.totalOutstanding)}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className={getUtilizationColor(entry.totalOutstanding, entry.creditLimit)}>
                      {formatPKR(entry.creditLimit)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-factory-gray border-t border-factory-border font-semibold">
                <td colSpan={2} className="px-6 py-4 text-white">Total</td>
                <td className="px-4 py-4 text-right text-success">{formatPKR(summary.current)}</td>
                <td className="px-4 py-4 text-right text-yellow-500">{formatPKR(summary.days1To30)}</td>
                <td className="px-4 py-4 text-right text-orange-500">{formatPKR(summary.days31To60)}</td>
                <td className="px-4 py-4 text-right text-red-400">{formatPKR(summary.days61To90)}</td>
                <td className="px-4 py-4 text-right text-red-600">{formatPKR(summary.daysOver90)}</td>
                <td className="px-4 py-4 text-right text-white">{formatPKR(summary.totalOutstanding)}</td>
                <td className="px-6 py-4"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Action Items */}
      {summary.criticalCount > 0 && (
        <div className="bg-error/10 rounded-2xl border border-error/30 p-6">
          <h3 className="text-lg font-semibold text-error mb-4">Action Required</h3>
          <div className="space-y-3">
            {mockAgingData
              .filter((e) => e.daysOver90 > 0)
              .map((entry) => (
                <div key={entry.id} className="flex items-center justify-between p-3 bg-factory-dark rounded-xl">
                  <div>
                    <p className="text-white font-medium">{entry.name}</p>
                    <p className="text-xs text-neutral-400">
                      {formatPKR(entry.daysOver90)} overdue by 90+ days
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/receivables/customers/${entry.id}`}>
                      <Button variant="ghost" size="sm">View</Button>
                    </Link>
                    <Button variant="secondary" size="sm">Contact</Button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Print Note */}
      <div className="text-center text-xs text-neutral-500 print:block hidden">
        <p>Generated on: {new Date().toLocaleString('en-PK')}</p>
        <p>Mughal Grace - Receivables Aging Report</p>
      </div>
    </div>
  );
}
