'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { StatsCard } from '@/components/molecules/StatsCard';

// Mock data - will be replaced with API calls
const mockYarnStock = [
  {
    id: 1,
    code: 'COT-40S',
    name: 'Cotton 40s',
    stock: 1250,
    unit: 'kg',
    vendor: 'Textile Hub',
    lastReceived: '2024-01-15',
  },
  {
    id: 2,
    code: 'COT-30S',
    name: 'Cotton 30s',
    stock: 850,
    unit: 'kg',
    vendor: 'Yarn Masters',
    lastReceived: '2024-01-14',
  },
  {
    id: 3,
    code: 'POL-150D',
    name: 'Polyester 150D',
    stock: 2100,
    unit: 'kg',
    vendor: 'Fiber Co',
    lastReceived: '2024-01-12',
  },
  {
    id: 4,
    code: 'VIS-30S',
    name: 'Viscose 30s',
    stock: 320,
    unit: 'kg',
    vendor: 'Textile Hub',
    lastReceived: '2024-01-10',
  },
];

export default function YarnPage() {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredStock = mockYarnStock.filter(
    (yarn) =>
      yarn.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      yarn.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalStock = mockYarnStock.reduce((sum, yarn) => sum + yarn.stock, 0);
  const lowStockCount = mockYarnStock.filter((yarn) => yarn.stock < 500).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Yarn Inventory</h1>
          <p className="text-neutral-400 mt-1">
            Manage yarn stock, vendors, and inward entries
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/yarn/pay-orders/new">
            <Button>+ Pay Order</Button>
          </Link>
          <Link href="/yarn/inward">
            <Button variant="secondary">+ Yarn Inward</Button>
          </Link>
          <Link href="/yarn/outward">
            <Button variant="ghost">↗ Outward</Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Yarn Stock"
          value={`${totalStock.toLocaleString()} kg`}
          icon="🧶"
        />
        <StatsCard
          title="Yarn Types"
          value={mockYarnStock.length}
          icon="📊"
        />
        <StatsCard
          title="Low Stock Alerts"
          value={lowStockCount}
          change={lowStockCount > 0 ? 'Needs attention' : 'All good'}
          changeType={lowStockCount > 0 ? 'negative' : 'positive'}
          icon="⚠️"
        />
        <StatsCard
          title="Active Vendors"
          value="5"
          icon="🏪"
        />
      </div>

      {/* Search and Filters */}
      <div className="bg-factory-dark rounded-2xl border border-factory-border p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="Search by name or code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button variant="secondary">Filter</Button>
            <Button variant="ghost">Export</Button>
          </div>
        </div>
      </div>

      {/* Stock Table */}
      <div className="bg-factory-dark rounded-2xl border border-factory-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-factory-border">
                <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">
                  Code
                </th>
                <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">
                  Name
                </th>
                <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">
                  Stock
                </th>
                <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">
                  Vendor
                </th>
                <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">
                  Last Received
                </th>
                <th className="text-right px-6 py-4 text-sm font-medium text-neutral-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-factory-border">
              {filteredStock.map((yarn) => (
                <tr key={yarn.id} className="hover:bg-factory-gray transition-colors">
                  <td className="px-6 py-4">
                    <span className="font-mono text-sm text-primary-400">
                      {yarn.code}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-white">{yarn.name}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`font-medium ${
                        yarn.stock < 500 ? 'text-warning' : 'text-white'
                      }`}
                    >
                      {yarn.stock.toLocaleString()} {yarn.unit}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-neutral-300">{yarn.vendor}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-neutral-400">{yarn.lastReceived}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button variant="ghost" size="sm">
                      View
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Link
          href="/yarn/pay-orders"
          className="bg-primary-500/10 border border-primary-500/30 rounded-xl p-4 hover:bg-primary-500/20 transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">📋</span>
            <div>
              <p className="text-primary-400 font-medium">Pay Orders</p>
              <p className="text-sm text-neutral-400">Create & verify orders</p>
            </div>
          </div>
        </Link>
        <Link
          href="/yarn/inward"
          className="bg-factory-dark rounded-xl border border-factory-border p-4 hover:bg-factory-gray transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">📦</span>
            <div>
              <p className="text-white font-medium">Yarn Inward</p>
              <p className="text-sm text-neutral-400">Record yarn receipt</p>
            </div>
          </div>
        </Link>
        <Link
          href="/yarn/outward"
          className="bg-factory-dark rounded-xl border border-factory-border p-4 hover:bg-factory-gray transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">↗️</span>
            <div>
              <p className="text-white font-medium">Yarn Outward</p>
              <p className="text-sm text-neutral-400">Issue to production</p>
            </div>
          </div>
        </Link>
        <Link
          href="/finance/vendors"
          className="bg-factory-dark rounded-xl border border-factory-border p-4 hover:bg-factory-gray transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏪</span>
            <div>
              <p className="text-white font-medium">Vendors</p>
              <p className="text-sm text-neutral-400">Manage vendors</p>
            </div>
          </div>
        </Link>
        <Link
          href="/yarn/types"
          className="bg-factory-dark rounded-xl border border-factory-border p-4 hover:bg-factory-gray transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">🧵</span>
            <div>
              <p className="text-white font-medium">Yarn Types</p>
              <p className="text-sm text-neutral-400">Configure types</p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
