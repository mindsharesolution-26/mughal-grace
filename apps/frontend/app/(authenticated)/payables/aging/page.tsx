'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/atoms/Button';
import { StatsCard } from '@/components/molecules/StatsCard';
import { formatPKR } from '@/lib/types/supplier';

// Mock aging data
interface AgingEntry {
  id: string;
  code: string;
  name: string;
  vendorType: 'YARN' | 'DYEING' | 'GENERAL';
  current: number;
  days1To30: number;
  days31To60: number;
  days61To90: number;
  daysOver90: number;
  totalOutstanding: number;
  creditLimit: number;
}

const mockAgingData: AgingEntry[] = [
  {
    id: '1',
    code: 'YV-001',
    name: 'Textile Hub',
    vendorType: 'YARN',
    current: 150000,
    days1To30: 75000,
    days31To60: 50000,
    days61To90: 25000,
    daysOver90: 0,
    totalOutstanding: 300000,
    creditLimit: 500000,
  },
  {
    id: '2',
    code: 'DV-001',
    name: 'Color Masters',
    vendorType: 'DYEING',
    current: 80000,
    days1To30: 45000,
    days31To60: 30000,
    days61To90: 0,
    daysOver90: 0,
    totalOutstanding: 155000,
    creditLimit: 300000,
  },
  {
    id: '3',
    code: 'SUP-001',
    name: 'Needle Works',
    vendorType: 'GENERAL',
    current: 25000,
    days1To30: 0,
    days31To60: 0,
    days61To90: 0,
    daysOver90: 0,
    totalOutstanding: 25000,
    creditLimit: 100000,
  },
  {
    id: '4',
    code: 'YV-002',
    name: 'Yarn Distributors',
    vendorType: 'YARN',
    current: 200000,
    days1To30: 150000,
    days31To60: 100000,
    days61To90: 75000,
    daysOver90: 50000,
    totalOutstanding: 575000,
    creditLimit: 600000,
  },
  {
    id: '5',
    code: 'DV-002',
    name: 'Fabric Dyers',
    vendorType: 'DYEING',
    current: 45000,
    days1To30: 30000,
    days31To60: 0,
    days61To90: 0,
    daysOver90: 0,
    totalOutstanding: 75000,
    creditLimit: 200000,
  },
];

const VENDOR_TYPE_LABELS = {
  YARN: { label: 'Yarn Vendor', color: 'bg-blue-500/20 text-blue-400' },
  DYEING: { label: 'Dyeing Vendor', color: 'bg-purple-500/20 text-purple-400' },
  GENERAL: { label: 'Supplier', color: 'bg-green-500/20 text-green-400' },
};

export default function PayablesAgingPage() {
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
    const vendorCount = mockAgingData.length;
    const criticalCount = mockAgingData.filter((e) => e.daysOver90 > 0).length;

    return {
      ...totals,
      totalOverdue,
      vendorCount,
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

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2 text-sm">
            <Link href="/payables" className="text-neutral-400 hover:text-white">
              Payables
            </Link>
            <span className="text-neutral-600">/</span>
            <span className="text-white">Aging Report</span>
          </div>
          <h1 className="text-2xl font-semibold text-white mt-2">Payables Aging Report</h1>
          <p className="text-neutral-400 mt-1">
            Analysis of outstanding payables by age bucket
          </p>
        </div>
        <Button variant="secondary" onClick={handlePrint}>
          Print Report
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Payables"
          value={formatPKR(summary.totalOutstanding)}
          icon="💰"
        />
        <StatsCard
          title="Total Overdue"
          value={formatPKR(summary.totalOverdue)}
          change={summary.totalOverdue > 0 ? 'Needs attention' : 'All current'}
          changeType={summary.totalOverdue > 0 ? 'negative' : 'positive'}
          icon="⚠️"
        />
        <StatsCard
          title="Vendors"
          value={summary.vendorCount}
          icon="🏭"
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
          <h2 className="text-lg font-semibold text-white">Vendor-wise Aging</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-factory-border bg-factory-gray">
                <th className="text-left px-6 py-3 text-xs font-medium text-neutral-400 uppercase">Vendor</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-neutral-400 uppercase">Type</th>
                <th className="text-right px-6 py-3 text-xs font-medium text-success uppercase">Current</th>
                <th className="text-right px-6 py-3 text-xs font-medium text-yellow-500 uppercase">1-30 Days</th>
                <th className="text-right px-6 py-3 text-xs font-medium text-orange-500 uppercase">31-60 Days</th>
                <th className="text-right px-6 py-3 text-xs font-medium text-red-400 uppercase">61-90 Days</th>
                <th className="text-right px-6 py-3 text-xs font-medium text-red-600 uppercase">90+ Days</th>
                <th className="text-right px-6 py-3 text-xs font-medium text-white uppercase">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-factory-border">
              {mockAgingData.map((entry) => (
                <tr key={entry.id} className="hover:bg-factory-gray/50 transition-colors">
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-white font-medium">{entry.name}</p>
                      <p className="text-xs text-neutral-500 font-mono">{entry.code}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded-md ${VENDOR_TYPE_LABELS[entry.vendorType].color}`}>
                      {VENDOR_TYPE_LABELS[entry.vendorType].label}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className={entry.current > 0 ? 'text-success' : 'text-neutral-500'}>
                      {entry.current > 0 ? formatPKR(entry.current) : '-'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className={entry.days1To30 > 0 ? 'text-yellow-500' : 'text-neutral-500'}>
                      {entry.days1To30 > 0 ? formatPKR(entry.days1To30) : '-'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className={entry.days31To60 > 0 ? 'text-orange-500' : 'text-neutral-500'}>
                      {entry.days31To60 > 0 ? formatPKR(entry.days31To60) : '-'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className={entry.days61To90 > 0 ? 'text-red-400' : 'text-neutral-500'}>
                      {entry.days61To90 > 0 ? formatPKR(entry.days61To90) : '-'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className={entry.daysOver90 > 0 ? 'text-red-600 font-semibold' : 'text-neutral-500'}>
                      {entry.daysOver90 > 0 ? formatPKR(entry.daysOver90) : '-'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-white font-semibold">{formatPKR(entry.totalOutstanding)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-factory-gray border-t border-factory-border font-semibold">
                <td colSpan={2} className="px-6 py-4 text-white">Total</td>
                <td className="px-6 py-4 text-right text-success">{formatPKR(summary.current)}</td>
                <td className="px-6 py-4 text-right text-yellow-500">{formatPKR(summary.days1To30)}</td>
                <td className="px-6 py-4 text-right text-orange-500">{formatPKR(summary.days31To60)}</td>
                <td className="px-6 py-4 text-right text-red-400">{formatPKR(summary.days61To90)}</td>
                <td className="px-6 py-4 text-right text-red-600">{formatPKR(summary.daysOver90)}</td>
                <td className="px-6 py-4 text-right text-white">{formatPKR(summary.totalOutstanding)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Print Note */}
      <div className="text-center text-xs text-neutral-500 print:block hidden">
        <p>Generated on: {new Date().toLocaleString('en-PK')}</p>
        <p>Mughal Grace - Payables Aging Report</p>
      </div>
    </div>
  );
}
