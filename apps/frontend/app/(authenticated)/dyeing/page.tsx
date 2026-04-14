'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { StatsCard } from '@/components/molecules/StatsCard';

// Mock dyeing orders
const mockDyeingOrders = [
  {
    id: 1,
    orderNumber: 'DYE-2024-001',
    vendor: 'Color Masters',
    rolls: 5,
    sentWeight: 225.5,
    receivedWeight: null,
    color: 'Navy Blue',
    process: 'Reactive',
    status: 'PENDING',
    sentAt: '2024-01-15',
    expectedAt: '2024-01-20',
  },
  {
    id: 2,
    orderNumber: 'DYE-2024-002',
    vendor: 'Textile Dyers',
    rolls: 3,
    sentWeight: 142.0,
    receivedWeight: 140.2,
    color: 'Black',
    process: 'Disperse',
    status: 'RECEIVED',
    sentAt: '2024-01-10',
    receivedAt: '2024-01-14',
    weightLoss: 1.3,
  },
  {
    id: 3,
    orderNumber: 'DYE-2024-003',
    vendor: 'Color Masters',
    rolls: 8,
    sentWeight: 380.0,
    receivedWeight: null,
    color: 'Red',
    process: 'Reactive',
    status: 'IN_PROGRESS',
    sentAt: '2024-01-12',
    expectedAt: '2024-01-18',
  },
];

const mockVendors = [
  { id: 1, name: 'Color Masters', avgTurnaround: 5, qualityRating: 4.5, activeOrders: 2 },
  { id: 2, name: 'Textile Dyers', avgTurnaround: 4, qualityRating: 4.8, activeOrders: 0 },
  { id: 3, name: 'Dye Works', avgTurnaround: 6, qualityRating: 4.2, activeOrders: 1 },
];

const statusConfig = {
  PENDING: { label: 'Pending', color: 'bg-warning/20 text-warning' },
  IN_PROGRESS: { label: 'Processing', color: 'bg-primary-500/20 text-primary-400' },
  RECEIVED: { label: 'Received', color: 'bg-success/20 text-success' },
  REJECTED: { label: 'Rejected', color: 'bg-error/20 text-error' },
};

export default function DyeingPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'orders' | 'vendors'>('orders');

  const stats = {
    pending: mockDyeingOrders.filter((o) => o.status === 'PENDING').length,
    inProgress: mockDyeingOrders.filter((o) => o.status === 'IN_PROGRESS').length,
    pendingWeight: mockDyeingOrders
      .filter((o) => o.status !== 'RECEIVED')
      .reduce((sum, o) => sum + o.sentWeight, 0),
    avgLoss: 1.5,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Dyeing</h1>
          <p className="text-neutral-400 mt-1">
            Manage dyeing orders and track vendor performance
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/dyeing/send">
            <Button>+ Send for Dyeing</Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Pending Orders"
          value={stats.pending}
          change="Awaiting dispatch"
          changeType="neutral"
          icon="📦"
        />
        <StatsCard
          title="In Progress"
          value={stats.inProgress}
          change="At dyer"
          changeType="neutral"
          icon="🎨"
        />
        <StatsCard
          title="Pending Weight"
          value={`${stats.pendingWeight.toFixed(1)} kg`}
          change="Total with dyers"
          changeType="neutral"
          icon="⚖️"
        />
        <StatsCard
          title="Avg Weight Loss"
          value={`${stats.avgLoss}%`}
          change={stats.avgLoss < 2 ? 'Normal' : 'High'}
          changeType={stats.avgLoss < 2 ? 'positive' : 'negative'}
          icon="📉"
        />
      </div>

      {/* Tabs */}
      <div className="border-b border-factory-border">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('orders')}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'orders'
                ? 'border-primary-500 text-primary-400'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            Dyeing Orders
          </button>
          <button
            onClick={() => setActiveTab('vendors')}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'vendors'
                ? 'border-primary-500 text-primary-400'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            Vendors
          </button>
        </div>
      </div>

      {activeTab === 'orders' ? (
        <>
          {/* Search */}
          <div className="bg-factory-dark rounded-2xl border border-factory-border p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Search by order number or vendor..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button variant="secondary">Filter</Button>
              </div>
            </div>
          </div>

          {/* Orders Table */}
          <div className="bg-factory-dark rounded-2xl border border-factory-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-factory-border">
                    <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">
                      Order #
                    </th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">
                      Vendor
                    </th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">
                      Color
                    </th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">
                      Rolls
                    </th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">
                      Sent Weight
                    </th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">
                      Received Weight
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
                  {mockDyeingOrders.map((order) => (
                    <tr
                      key={order.id}
                      className="hover:bg-factory-gray transition-colors"
                    >
                      <td className="px-6 py-4">
                        <span className="font-mono text-sm text-primary-400">
                          {order.orderNumber}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-white">{order.vendor}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-4 h-4 rounded-full border border-factory-border"
                            style={{
                              backgroundColor:
                                order.color === 'Navy Blue'
                                  ? '#1e3a5f'
                                  : order.color === 'Black'
                                  ? '#000'
                                  : '#dc2626',
                            }}
                          />
                          <span className="text-neutral-300">{order.color}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-white">{order.rolls}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-white">{order.sentWeight} kg</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-white">
                          {order.receivedWeight
                            ? `${order.receivedWeight} kg`
                            : '-'}
                        </span>
                        {order.weightLoss && (
                          <span className="text-error text-xs ml-1">
                            (-{order.weightLoss}%)
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                            statusConfig[order.status as keyof typeof statusConfig]
                              .color
                          }`}
                        >
                          {
                            statusConfig[order.status as keyof typeof statusConfig]
                              .label
                          }
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          {order.status === 'IN_PROGRESS' && (
                            <Button variant="ghost" size="sm">
                              Receive
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
        </>
      ) : (
        /* Vendors Tab */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {mockVendors.map((vendor) => (
            <div
              key={vendor.id}
              className="bg-factory-dark rounded-2xl border border-factory-border p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    {vendor.name}
                  </h3>
                  <div className="flex items-center gap-1 mt-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <svg
                        key={i}
                        className={`w-4 h-4 ${
                          i < Math.floor(vendor.qualityRating)
                            ? 'text-warning'
                            : 'text-factory-border'
                        }`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                    <span className="text-sm text-neutral-400 ml-1">
                      {vendor.qualityRating}
                    </span>
                  </div>
                </div>
                {vendor.activeOrders > 0 && (
                  <span className="px-2 py-1 bg-primary-500/20 text-primary-400 text-xs rounded">
                    {vendor.activeOrders} active
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-factory-border">
                <div>
                  <p className="text-sm text-neutral-400">Avg Turnaround</p>
                  <p className="text-white font-medium">
                    {vendor.avgTurnaround} days
                  </p>
                </div>
                <div>
                  <p className="text-sm text-neutral-400">Active Orders</p>
                  <p className="text-white font-medium">{vendor.activeOrders}</p>
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <Button variant="secondary" size="sm" className="flex-1">
                  View Orders
                </Button>
                <Button variant="ghost" size="sm">
                  Edit
                </Button>
              </div>
            </div>
          ))}

          {/* Add Vendor Card */}
          <Link
            href="/dyeing/vendors/new"
            className="bg-factory-dark rounded-2xl border border-dashed border-factory-border p-6 flex flex-col items-center justify-center text-neutral-400 hover:text-white hover:border-primary-500/50 transition-colors min-h-[200px]"
          >
            <span className="text-3xl mb-2">+</span>
            <span>Add New Vendor</span>
          </Link>
        </div>
      )}
    </div>
  );
}
