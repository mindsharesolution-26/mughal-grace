'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { StatsCard } from '@/components/molecules/StatsCard';

// Mock data - will be replaced with API calls
const mockStockMovements = [
  {
    id: 1,
    type: 'IN',
    reference: 'STK-IN-001',
    yarnType: 'Cotton 40s',
    quantity: 500,
    unit: 'kg',
    date: '2024-01-15',
    source: 'Vendor: Textile Hub',
  },
  {
    id: 2,
    type: 'OUT',
    reference: 'STK-OUT-001',
    yarnType: 'Polyester 150D',
    quantity: 200,
    unit: 'kg',
    date: '2024-01-14',
    source: 'Production: Machine #5',
  },
  {
    id: 3,
    type: 'IN',
    reference: 'STK-IN-002',
    yarnType: 'Viscose 30s',
    quantity: 750,
    unit: 'kg',
    date: '2024-01-13',
    source: 'Vendor: Yarn Masters',
  },
  {
    id: 4,
    type: 'OUT',
    reference: 'STK-OUT-002',
    yarnType: 'Cotton 30s',
    quantity: 150,
    unit: 'kg',
    date: '2024-01-12',
    source: 'Production: Machine #3',
  },
];

export default function StockPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'IN' | 'OUT'>('ALL');

  const filteredMovements = mockStockMovements.filter((movement) => {
    const matchesSearch =
      movement.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
      movement.yarnType.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'ALL' || movement.type === filterType;
    return matchesSearch && matchesType;
  });

  const totalIn = mockStockMovements
    .filter((m) => m.type === 'IN')
    .reduce((sum, m) => sum + m.quantity, 0);
  const totalOut = mockStockMovements
    .filter((m) => m.type === 'OUT')
    .reduce((sum, m) => sum + m.quantity, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Stock Management</h1>
          <p className="text-neutral-400 mt-1">
            Track stock movements - incoming and outgoing
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/stock/in">
            <Button>+ Stock In</Button>
          </Link>
          <Link href="/stock/out">
            <Button variant="secondary">- Stock Out</Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Stock In"
          value={`${totalIn.toLocaleString()} kg`}
          icon="📥"
          changeType="positive"
        />
        <StatsCard
          title="Total Stock Out"
          value={`${totalOut.toLocaleString()} kg`}
          icon="📤"
          changeType="negative"
        />
        <StatsCard
          title="Net Stock"
          value={`${(totalIn - totalOut).toLocaleString()} kg`}
          icon="📊"
        />
        <StatsCard
          title="Movements Today"
          value={mockStockMovements.length}
          icon="🔄"
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href="/stock/in"
          className="bg-success/10 border border-success/30 rounded-xl p-6 hover:bg-success/20 transition-colors"
        >
          <div className="flex items-center gap-4">
            <span className="text-4xl">📥</span>
            <div>
              <p className="text-success font-semibold text-lg">Stock In</p>
              <p className="text-neutral-400">
                Record incoming stock from vendors or returns
              </p>
            </div>
          </div>
        </Link>
        <Link
          href="/stock/out"
          className="bg-warning/10 border border-warning/30 rounded-xl p-6 hover:bg-warning/20 transition-colors"
        >
          <div className="flex items-center gap-4">
            <span className="text-4xl">📤</span>
            <div>
              <p className="text-warning font-semibold text-lg">Stock Out</p>
              <p className="text-neutral-400">
                Issue stock to production or record wastage
              </p>
            </div>
          </div>
        </Link>
      </div>

      {/* Search and Filters */}
      <div className="bg-factory-dark rounded-2xl border border-factory-border p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="Search by reference or yarn type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={filterType === 'ALL' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setFilterType('ALL')}
            >
              All
            </Button>
            <Button
              variant={filterType === 'IN' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setFilterType('IN')}
            >
              Stock In
            </Button>
            <Button
              variant={filterType === 'OUT' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setFilterType('OUT')}
            >
              Stock Out
            </Button>
          </div>
        </div>
      </div>

      {/* Movements Table */}
      <div className="bg-factory-dark rounded-2xl border border-factory-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-factory-border">
                <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">
                  Type
                </th>
                <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">
                  Reference
                </th>
                <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">
                  Yarn Type
                </th>
                <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">
                  Quantity
                </th>
                <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">
                  Date
                </th>
                <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">
                  Source/Destination
                </th>
                <th className="text-right px-6 py-4 text-sm font-medium text-neutral-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-factory-border">
              {filteredMovements.map((movement) => (
                <tr
                  key={movement.id}
                  className="hover:bg-factory-gray transition-colors"
                >
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                        movement.type === 'IN'
                          ? 'bg-success/20 text-success'
                          : 'bg-warning/20 text-warning'
                      }`}
                    >
                      {movement.type === 'IN' ? '📥' : '📤'} {movement.type}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-mono text-sm text-primary-400">
                      {movement.reference}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-white">{movement.yarnType}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`font-medium ${
                        movement.type === 'IN' ? 'text-success' : 'text-warning'
                      }`}
                    >
                      {movement.type === 'IN' ? '+' : '-'}
                      {movement.quantity.toLocaleString()} {movement.unit}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-neutral-400">{movement.date}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-neutral-300">{movement.source}</span>
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
        {filteredMovements.length === 0 && (
          <div className="text-center py-12 text-neutral-400">
            No stock movements found
          </div>
        )}
      </div>
    </div>
  );
}
