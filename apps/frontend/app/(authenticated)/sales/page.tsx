'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { StatsCard } from '@/components/molecules/StatsCard';

// Mock sales data
const mockOrders = [
  {
    id: 1,
    orderNumber: 'SO-2024-001',
    customer: 'ABC Textiles',
    items: 3,
    totalAmount: 285000,
    paidAmount: 285000,
    status: 'COMPLETED',
    orderDate: '2024-01-15',
  },
  {
    id: 2,
    orderNumber: 'SO-2024-002',
    customer: 'XYZ Garments',
    items: 5,
    totalAmount: 425000,
    paidAmount: 200000,
    status: 'DISPATCHED',
    orderDate: '2024-01-14',
  },
  {
    id: 3,
    orderNumber: 'SO-2024-003',
    customer: 'Fashion Hub',
    items: 2,
    totalAmount: 180000,
    paidAmount: 0,
    status: 'CONFIRMED',
    orderDate: '2024-01-15',
  },
  {
    id: 4,
    orderNumber: 'SO-2024-004',
    customer: 'Textile World',
    items: 4,
    totalAmount: 340000,
    paidAmount: 100000,
    status: 'PENDING',
    orderDate: '2024-01-16',
  },
];

const mockCustomers = [
  {
    id: 1,
    name: 'ABC Textiles',
    code: 'ABC-001',
    outstanding: 125000,
    creditLimit: 500000,
    lastOrder: '2024-01-15',
  },
  {
    id: 2,
    name: 'XYZ Garments',
    code: 'XYZ-001',
    outstanding: 350000,
    creditLimit: 400000,
    lastOrder: '2024-01-14',
  },
  {
    id: 3,
    name: 'Fashion Hub',
    code: 'FH-001',
    outstanding: 180000,
    creditLimit: 300000,
    lastOrder: '2024-01-15',
  },
];

const statusConfig = {
  PENDING: { label: 'Pending', color: 'bg-neutral-500/20 text-neutral-300' },
  CONFIRMED: { label: 'Confirmed', color: 'bg-primary-500/20 text-primary-400' },
  DISPATCHED: { label: 'Dispatched', color: 'bg-warning/20 text-warning' },
  COMPLETED: { label: 'Completed', color: 'bg-success/20 text-success' },
  CANCELLED: { label: 'Cancelled', color: 'bg-error/20 text-error' },
};

export default function SalesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'orders' | 'customers' | 'outstanding'>(
    'orders'
  );

  const totalSales = mockOrders.reduce((sum, o) => sum + o.totalAmount, 0);
  const totalReceived = mockOrders.reduce((sum, o) => sum + o.paidAmount, 0);
  const totalOutstanding = totalSales - totalReceived;
  const pendingOrders = mockOrders.filter(
    (o) => o.status === 'PENDING' || o.status === 'CONFIRMED'
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Sales</h1>
          <p className="text-neutral-400 mt-1">
            Manage orders, customers, and receivables
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/sales/orders/new">
            <Button>+ New Order</Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="This Month Sales"
          value={`Rs. ${(totalSales / 1000).toFixed(0)}K`}
          change="+15% vs last month"
          changeType="positive"
          icon="💰"
        />
        <StatsCard
          title="Received"
          value={`Rs. ${(totalReceived / 1000).toFixed(0)}K`}
          change={`${Math.round((totalReceived / totalSales) * 100)}% collected`}
          changeType="positive"
          icon="✅"
        />
        <StatsCard
          title="Outstanding"
          value={`Rs. ${(totalOutstanding / 1000).toFixed(0)}K`}
          change="From 8 customers"
          changeType={totalOutstanding > 500000 ? 'negative' : 'neutral'}
          icon="📊"
        />
        <StatsCard
          title="Pending Orders"
          value={pendingOrders}
          change="Awaiting dispatch"
          changeType="neutral"
          icon="📦"
        />
      </div>

      {/* Tabs */}
      <div className="border-b border-factory-border">
        <div className="flex gap-4">
          {[
            { key: 'orders', label: 'Sales Orders' },
            { key: 'customers', label: 'Customers' },
            { key: 'outstanding', label: 'Outstanding' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as typeof activeTab)}
              className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === key
                  ? 'border-primary-500 text-primary-400'
                  : 'border-transparent text-neutral-400 hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'orders' && (
        <>
          {/* Search */}
          <div className="bg-factory-dark rounded-2xl border border-factory-border p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Search by order number or customer..."
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
                      Customer
                    </th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">
                      Items
                    </th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">
                      Amount
                    </th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">
                      Paid
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
                  {mockOrders.map((order) => (
                    <tr
                      key={order.id}
                      className="hover:bg-factory-gray transition-colors"
                    >
                      <td className="px-6 py-4">
                        <Link
                          href={`/sales/orders/${order.id}`}
                          className="font-mono text-sm text-primary-400 hover:text-primary-300"
                        >
                          {order.orderNumber}
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-white">{order.customer}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-neutral-300">
                          {order.items} rolls
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-white font-medium">
                          Rs. {order.totalAmount.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`font-medium ${
                            order.paidAmount === order.totalAmount
                              ? 'text-success'
                              : order.paidAmount > 0
                              ? 'text-warning'
                              : 'text-neutral-400'
                          }`}
                        >
                          Rs. {order.paidAmount.toLocaleString()}
                        </span>
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
      )}

      {activeTab === 'customers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {mockCustomers.map((customer) => (
            <div
              key={customer.id}
              className="bg-factory-dark rounded-2xl border border-factory-border p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    {customer.name}
                  </h3>
                  <p className="text-sm text-neutral-400">{customer.code}</p>
                </div>
                <span
                  className={`px-2 py-1 text-xs rounded ${
                    customer.outstanding / customer.creditLimit > 0.8
                      ? 'bg-error/20 text-error'
                      : customer.outstanding / customer.creditLimit > 0.5
                      ? 'bg-warning/20 text-warning'
                      : 'bg-success/20 text-success'
                  }`}
                >
                  {Math.round((customer.outstanding / customer.creditLimit) * 100)}%
                  used
                </span>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-neutral-400">Outstanding</span>
                  <span className="text-white font-medium">
                    Rs. {customer.outstanding.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-neutral-400">Credit Limit</span>
                  <span className="text-neutral-300">
                    Rs. {customer.creditLimit.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-neutral-400">Last Order</span>
                  <span className="text-neutral-300">{customer.lastOrder}</span>
                </div>
              </div>

              {/* Credit usage bar */}
              <div className="mt-4 pt-4 border-t border-factory-border">
                <div className="h-2 bg-factory-gray rounded-full overflow-hidden">
                  <div
                    className={`h-full ${
                      customer.outstanding / customer.creditLimit > 0.8
                        ? 'bg-error'
                        : customer.outstanding / customer.creditLimit > 0.5
                        ? 'bg-warning'
                        : 'bg-success'
                    }`}
                    style={{
                      width: `${Math.min(
                        (customer.outstanding / customer.creditLimit) * 100,
                        100
                      )}%`,
                    }}
                  />
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <Button variant="secondary" size="sm" className="flex-1">
                  View Ledger
                </Button>
                <Button variant="ghost" size="sm">
                  Edit
                </Button>
              </div>
            </div>
          ))}

          {/* Add Customer Card */}
          <Link
            href="/sales/customers/new"
            className="bg-factory-dark rounded-2xl border border-dashed border-factory-border p-6 flex flex-col items-center justify-center text-neutral-400 hover:text-white hover:border-primary-500/50 transition-colors min-h-[250px]"
          >
            <span className="text-3xl mb-2">+</span>
            <span>Add New Customer</span>
          </Link>
        </div>
      )}

      {activeTab === 'outstanding' && (
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
          <h2 className="text-lg font-semibold text-white mb-4">
            Outstanding Summary
          </h2>

          {/* Aging Buckets */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
            {[
              { label: '0-30 Days', amount: 325000, color: 'text-success' },
              { label: '30-60 Days', amount: 180000, color: 'text-warning' },
              { label: '60-90 Days', amount: 95000, color: 'text-orange-500' },
              { label: '90+ Days', amount: 55000, color: 'text-error' },
            ].map((bucket) => (
              <div
                key={bucket.label}
                className="bg-factory-gray rounded-xl p-4 text-center"
              >
                <p className="text-sm text-neutral-400">{bucket.label}</p>
                <p className={`text-xl font-bold mt-1 ${bucket.color}`}>
                  Rs. {(bucket.amount / 1000).toFixed(0)}K
                </p>
              </div>
            ))}
          </div>

          {/* Outstanding by Customer */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-factory-border">
                  <th className="text-left px-4 py-3 text-sm font-medium text-neutral-400">
                    Customer
                  </th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-neutral-400">
                    0-30 Days
                  </th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-neutral-400">
                    30-60 Days
                  </th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-neutral-400">
                    60-90 Days
                  </th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-neutral-400">
                    90+ Days
                  </th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-neutral-400">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-factory-border">
                {mockCustomers.map((customer) => (
                  <tr
                    key={customer.id}
                    className="hover:bg-factory-gray transition-colors"
                  >
                    <td className="px-4 py-3">
                      <span className="text-white">{customer.name}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-success">
                      Rs. {Math.floor(customer.outstanding * 0.5).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right text-warning">
                      Rs. {Math.floor(customer.outstanding * 0.3).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right text-orange-500">
                      Rs. {Math.floor(customer.outstanding * 0.15).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right text-error">
                      Rs. {Math.floor(customer.outstanding * 0.05).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right text-white font-medium">
                      Rs. {customer.outstanding.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
