'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { StatsCard } from '@/components/molecules/StatsCard';

// Mock roll data
const mockRolls = [
  {
    id: 1,
    rollNumber: 'R-2024-001',
    fabricType: 'Single Jersey',
    machine: 'Machine #5',
    greyWeight: 45.5,
    status: 'GREY_STOCK',
    producedAt: '2024-01-15',
  },
  {
    id: 2,
    rollNumber: 'R-2024-002',
    fabricType: 'Rib',
    machine: 'Machine #12',
    greyWeight: 38.2,
    status: 'SENT_FOR_DYEING',
    producedAt: '2024-01-14',
  },
  {
    id: 3,
    rollNumber: 'R-2024-003',
    fabricType: 'Interlock',
    machine: 'Machine #8',
    greyWeight: 52.0,
    finishedWeight: 50.8,
    status: 'FINISHED_STOCK',
    color: 'Navy Blue',
    producedAt: '2024-01-13',
  },
  {
    id: 4,
    rollNumber: 'R-2024-004',
    fabricType: 'Single Jersey',
    machine: 'Machine #22',
    greyWeight: 41.0,
    finishedWeight: 40.2,
    status: 'DISPATCHED',
    color: 'Black',
    producedAt: '2024-01-12',
  },
  {
    id: 5,
    rollNumber: 'R-2024-005',
    fabricType: 'Rib',
    machine: 'Machine #3',
    greyWeight: 35.8,
    status: 'GREY_STOCK',
    producedAt: '2024-01-15',
  },
];

const statusConfig = {
  GREY_STOCK: { label: 'Grey Stock', color: 'bg-neutral-500/20 text-neutral-300' },
  SENT_FOR_DYEING: { label: 'Dyeing', color: 'bg-primary-500/20 text-primary-400' },
  RECEIVED_FROM_DYEING: { label: 'Dyed', color: 'bg-success/20 text-success' },
  FINISHED_STOCK: { label: 'Finished', color: 'bg-success/20 text-success' },
  DISPATCHED: { label: 'Dispatched', color: 'bg-warning/20 text-warning' },
};

export default function RollsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const stats = {
    greyStock: mockRolls.filter((r) => r.status === 'GREY_STOCK').length,
    inDyeing: mockRolls.filter((r) => r.status === 'SENT_FOR_DYEING').length,
    finished: mockRolls.filter((r) => r.status === 'FINISHED_STOCK').length,
    total: mockRolls.length,
  };

  const totalGreyWeight = mockRolls
    .filter((r) => r.status === 'GREY_STOCK')
    .reduce((sum, r) => sum + r.greyWeight, 0);

  const filteredRolls = mockRolls.filter((roll) => {
    const matchesSearch =
      roll.rollNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      roll.fabricType.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === 'all' || roll.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Rolls</h1>
          <p className="text-neutral-400 mt-1">
            Track roll lifecycle from production to dispatch
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/rolls/new">
            <Button>+ Create Roll</Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Grey Stock"
          value={`${stats.greyStock} rolls`}
          change={`${totalGreyWeight.toFixed(1)} kg`}
          changeType="neutral"
          icon="📦"
        />
        <StatsCard
          title="In Dyeing"
          value={`${stats.inDyeing} rolls`}
          change="Processing"
          changeType="neutral"
          icon="🎨"
        />
        <StatsCard
          title="Finished Stock"
          value={`${stats.finished} rolls`}
          change="Ready for sale"
          changeType="positive"
          icon="✅"
        />
        <StatsCard
          title="Total Rolls"
          value={stats.total}
          change="All time"
          changeType="neutral"
          icon="🧵"
        />
      </div>

      {/* Roll Lifecycle Flow */}
      <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Roll Lifecycle</h2>
        <div className="flex items-center justify-between overflow-x-auto pb-2">
          {[
            { status: 'GREY_STOCK', label: 'Grey Stock', icon: '📦', count: stats.greyStock },
            { status: 'SENT_FOR_DYEING', label: 'Dyeing', icon: '🎨', count: stats.inDyeing },
            { status: 'FINISHED_STOCK', label: 'Finished', icon: '✅', count: stats.finished },
            { status: 'DISPATCHED', label: 'Dispatched', icon: '🚚', count: 1 },
          ].map((step, index) => (
            <div key={step.status} className="flex items-center">
              <button
                onClick={() =>
                  setStatusFilter(statusFilter === step.status ? 'all' : step.status)
                }
                className={`flex flex-col items-center px-6 py-4 rounded-xl transition-colors ${
                  statusFilter === step.status
                    ? 'bg-primary-500/20 border border-primary-500/30'
                    : 'hover:bg-factory-gray'
                }`}
              >
                <span className="text-2xl mb-2">{step.icon}</span>
                <span className="text-sm text-white font-medium">{step.label}</span>
                <span className="text-lg font-bold text-primary-400 mt-1">
                  {step.count}
                </span>
              </button>
              {index < 3 && (
                <div className="w-12 h-0.5 bg-factory-border mx-2" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-factory-dark rounded-2xl border border-factory-border p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="Search by roll number or fabric type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Status</option>
              <option value="GREY_STOCK">Grey Stock</option>
              <option value="SENT_FOR_DYEING">In Dyeing</option>
              <option value="FINISHED_STOCK">Finished</option>
              <option value="DISPATCHED">Dispatched</option>
            </select>
            <Button variant="ghost">Export</Button>
          </div>
        </div>
      </div>

      {/* Rolls Table */}
      <div className="bg-factory-dark rounded-2xl border border-factory-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-factory-border">
                <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">
                  Roll Number
                </th>
                <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">
                  Fabric Type
                </th>
                <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">
                  Machine
                </th>
                <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">
                  Grey Weight
                </th>
                <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">
                  Finished Weight
                </th>
                <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">
                  Status
                </th>
                <th className="text-right px-6 py-4 text-sm font-medium text-neutral-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-factory-border">
              {filteredRolls.map((roll) => (
                <tr key={roll.id} className="hover:bg-factory-gray transition-colors">
                  <td className="px-6 py-4">
                    <Link
                      href={`/rolls/${roll.id}`}
                      className="font-mono text-sm text-primary-400 hover:text-primary-300"
                    >
                      {roll.rollNumber}
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-white">{roll.fabricType}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-neutral-300">{roll.machine}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-white">{roll.greyWeight} kg</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-white">
                      {roll.finishedWeight ? `${roll.finishedWeight} kg` : '-'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                        statusConfig[roll.status as keyof typeof statusConfig].color
                      }`}
                    >
                      {statusConfig[roll.status as keyof typeof statusConfig].label}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      {roll.status === 'GREY_STOCK' && (
                        <Button variant="ghost" size="sm">
                          Send to Dyeing
                        </Button>
                      )}
                      <Button variant="ghost" size="sm">
                        View
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
