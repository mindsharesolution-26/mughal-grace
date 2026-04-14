'use client';

import Link from 'next/link';
import { Button } from '@/components/atoms/Button';

const reports = [
  {
    category: 'Production',
    items: [
      {
        title: 'Daily Production Report',
        description: 'Machine-wise production summary for today',
        href: '/reports/production/daily',
        icon: '📊',
      },
      {
        title: 'Weekly Production Report',
        description: 'Weekly production trends and efficiency',
        href: '/reports/production/weekly',
        icon: '📈',
      },
      {
        title: 'Machine Efficiency Report',
        description: 'Individual machine performance analysis',
        href: '/reports/production/efficiency',
        icon: '⚙️',
      },
      {
        title: 'Downtime Analysis',
        description: 'Machine downtime causes and duration',
        href: '/reports/production/downtime',
        icon: '🔧',
      },
    ],
  },
  {
    category: 'Inventory',
    items: [
      {
        title: 'Yarn Stock Report',
        description: 'Current yarn inventory by type and vendor',
        href: '/reports/inventory/yarn',
        icon: '🧶',
      },
      {
        title: 'Grey Stock Report',
        description: 'Grey fabric stock by fabric type',
        href: '/reports/inventory/grey-stock',
        icon: '📦',
      },
      {
        title: 'Finished Stock Report',
        description: 'Dyed fabric ready for dispatch',
        href: '/reports/inventory/finished-stock',
        icon: '✅',
      },
      {
        title: 'Stock Aging Report',
        description: 'Inventory aging analysis',
        href: '/reports/inventory/aging',
        icon: '📅',
      },
    ],
  },
  {
    category: 'Sales & Finance',
    items: [
      {
        title: 'Sales Summary',
        description: 'Monthly sales overview and trends',
        href: '/reports/sales/summary',
        icon: '💰',
      },
      {
        title: 'Customer Ledger',
        description: 'Individual customer transaction history',
        href: '/reports/sales/customer-ledger',
        icon: '📒',
      },
      {
        title: 'Outstanding Aging',
        description: 'Receivables aging by customer',
        href: '/reports/sales/outstanding',
        icon: '⏰',
      },
      {
        title: 'Profit & Loss',
        description: 'Monthly profit and loss statement',
        href: '/reports/finance/pnl',
        icon: '📊',
      },
    ],
  },
  {
    category: 'Dyeing',
    items: [
      {
        title: 'Dyeing Order Report',
        description: 'Orders sent and received from dyers',
        href: '/reports/dyeing/orders',
        icon: '🎨',
      },
      {
        title: 'Weight Loss Analysis',
        description: 'Dyeing weight variance by vendor',
        href: '/reports/dyeing/weight-loss',
        icon: '📉',
      },
      {
        title: 'Vendor Performance',
        description: 'Dyer quality and turnaround metrics',
        href: '/reports/dyeing/vendors',
        icon: '⭐',
      },
    ],
  },
];

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Reports</h1>
          <p className="text-neutral-400 mt-1">
            Generate and export business reports
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary">Schedule Reports</Button>
        </div>
      </div>

      {/* Quick Access */}
      <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Quick Access</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Today's Production", icon: '📊', href: '/reports/production/daily' },
            { label: 'Outstanding', icon: '💳', href: '/reports/sales/outstanding' },
            { label: 'Stock Summary', icon: '📦', href: '/reports/inventory/yarn' },
            { label: 'Weekly Report', icon: '📈', href: '/reports/production/weekly' },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 p-4 rounded-xl bg-factory-gray hover:bg-factory-light transition-colors border border-factory-border"
            >
              <span className="text-2xl">{item.icon}</span>
              <span className="text-sm text-white font-medium">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Report Categories */}
      {reports.map((category) => (
        <div key={category.category} className="space-y-4">
          <h2 className="text-lg font-semibold text-white">{category.category}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {category.items.map((report) => (
              <Link
                key={report.href}
                href={report.href}
                className="bg-factory-dark rounded-xl border border-factory-border p-5 hover:bg-factory-gray transition-colors group"
              >
                <div className="flex items-start gap-4">
                  <span className="text-2xl">{report.icon}</span>
                  <div className="flex-1">
                    <h3 className="text-white font-medium group-hover:text-primary-400 transition-colors">
                      {report.title}
                    </h3>
                    <p className="text-sm text-neutral-400 mt-1">
                      {report.description}
                    </p>
                  </div>
                  <svg
                    className="w-5 h-5 text-neutral-500 group-hover:text-primary-400 transition-colors"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ))}

      {/* Export Options */}
      <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Export Options</h2>
        <p className="text-neutral-400 mb-4">
          All reports can be exported in the following formats:
        </p>
        <div className="flex flex-wrap gap-3">
          <span className="px-4 py-2 bg-factory-gray rounded-lg text-sm text-white flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full" />
            Excel (.xlsx)
          </span>
          <span className="px-4 py-2 bg-factory-gray rounded-lg text-sm text-white flex items-center gap-2">
            <span className="w-2 h-2 bg-red-500 rounded-full" />
            PDF
          </span>
          <span className="px-4 py-2 bg-factory-gray rounded-lg text-sm text-white flex items-center gap-2">
            <span className="w-2 h-2 bg-blue-500 rounded-full" />
            CSV
          </span>
        </div>
      </div>
    </div>
  );
}
