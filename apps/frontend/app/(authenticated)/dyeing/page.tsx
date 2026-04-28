'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { StatsCard } from '@/components/molecules/StatsCard';
import { useToast } from '@/contexts/ToastContext';
import { dyeingOrdersApi, dyeingVendorsApi } from '@/lib/api/dyeing';
import {
  DyeingOrder,
  DyeingVendorWithStats,
  DyeingStats,
  DyeingStatus,
  dyeingStatusLabels,
  dyeingStatusColors,
} from '@/lib/types/dyeing';

export default function DyeingPage() {
  const { showToast } = useToast();
  const [orders, setOrders] = useState<DyeingOrder[]>([]);
  const [vendors, setVendors] = useState<DyeingVendorWithStats[]>([]);
  const [stats, setStats] = useState<DyeingStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<DyeingStatus | ''>('');
  const [activeTab, setActiveTab] = useState<'orders' | 'vendors'>('orders');
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (activeTab === 'orders') {
      fetchOrders();
    }
  }, [searchQuery, statusFilter, pagination.page]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [statsData, vendorsData] = await Promise.all([
        dyeingOrdersApi.getStats(),
        dyeingVendorsApi.getAll(),
      ]);
      setStats(statsData);
      setVendors(vendorsData);
      await fetchOrders();
    } catch (error: any) {
      showToast('error', error.response?.data?.error || 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchOrders = async () => {
    try {
      const response = await dyeingOrdersApi.getAll({
        page: pagination.page,
        limit: 20,
        search: searchQuery || undefined,
        status: statusFilter || undefined,
      });
      setOrders(response.orders);
      setPagination({
        page: response.pagination.page,
        totalPages: response.pagination.totalPages,
        total: response.pagination.total,
      });
    } catch (error: any) {
      console.error('Failed to load orders:', error);
    }
  };

  const getColorPreview = (colorName: string | null) => {
    if (!colorName) return '#6b7280';
    const colorMap: Record<string, string> = {
      'Navy Blue': '#1e3a5f',
      'Black': '#000000',
      'Red': '#dc2626',
      'White': '#ffffff',
      'Grey': '#6b7280',
      'Green': '#16a34a',
      'Blue': '#2563eb',
      'Yellow': '#eab308',
      'Orange': '#ea580c',
      'Pink': '#ec4899',
      'Purple': '#9333ea',
      'Brown': '#78350f',
      'Maroon': '#7f1d1d',
      'Beige': '#d6cfc7',
    };
    return colorMap[colorName] || '#6b7280';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
        <span className="ml-3 text-neutral-400">Loading...</span>
      </div>
    );
  }

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
          <Link href="/dyeing/stock">
            <Button variant="secondary">Dyed Stock</Button>
          </Link>
          <Link href="/dyeing/receive">
            <Button variant="secondary">Receive</Button>
          </Link>
          <Link href="/dyeing/send">
            <Button>+ Send for Dyeing</Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      {stats && (
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
            value={stats.inProgress + stats.ready}
            change={`${stats.ready} ready to receive`}
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
            value={`${stats.avgWeightLoss.toFixed(1)}%`}
            change={stats.avgWeightLoss < 2 ? 'Normal' : 'High'}
            changeType={stats.avgWeightLoss < 2 ? 'positive' : 'negative'}
            icon="📉"
          />
        </div>
      )}

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
            Dyeing Orders ({pagination.total})
          </button>
          <button
            onClick={() => setActiveTab('vendors')}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'vendors'
                ? 'border-primary-500 text-primary-400'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            Vendors ({vendors.length})
          </button>
        </div>
      </div>

      {activeTab === 'orders' ? (
        <>
          {/* Search & Filters */}
          <div className="bg-factory-dark rounded-2xl border border-factory-border p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Search by order number, color, or vendor..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as DyeingStatus | '')}
                className="px-4 py-2 rounded-xl bg-factory-gray border border-factory-border text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">All Statuses</option>
                <option value="SENT">Sent</option>
                <option value="IN_PROCESS">Processing</option>
                <option value="READY">Ready</option>
                <option value="PARTIALLY_RECEIVED">Partial</option>
                <option value="COMPLETED">Completed</option>
              </select>
            </div>
          </div>

          {/* Orders Table */}
          {orders.length === 0 ? (
            <div className="bg-factory-dark rounded-2xl border border-factory-border p-12 text-center">
              <span className="text-4xl">📋</span>
              <p className="text-neutral-400 mt-4">No dyeing orders found</p>
              <Link href="/dyeing/send">
                <Button className="mt-4">Send First Order</Button>
              </Link>
            </div>
          ) : (
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
                      <th className="text-right px-6 py-4 text-sm font-medium text-neutral-400">
                        Rolls
                      </th>
                      <th className="text-right px-6 py-4 text-sm font-medium text-neutral-400">
                        Sent Weight
                      </th>
                      <th className="text-right px-6 py-4 text-sm font-medium text-neutral-400">
                        Received
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
                    {orders.map((order) => (
                      <tr
                        key={order.id}
                        className="hover:bg-factory-gray transition-colors"
                      >
                        <td className="px-6 py-4">
                          <span className="font-mono text-sm text-primary-400">
                            {order.orderNumber}
                          </span>
                          <p className="text-xs text-neutral-500 mt-0.5">
                            {new Date(order.sentAt).toLocaleDateString()}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-white">{order.vendor.name}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-4 h-4 rounded-full border border-factory-border"
                              style={{ backgroundColor: getColorPreview(order.colorName) }}
                            />
                            <span className="text-neutral-300">
                              {order.colorName || '-'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-white">{order._count?.items || 0}</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-white">{Number(order.sentWeight).toFixed(1)} kg</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {order.receivedWeight ? (
                            <div>
                              <span className="text-white">
                                {Number(order.receivedWeight).toFixed(1)} kg
                              </span>
                              {order.weightVariance && (
                                <span
                                  className={`text-xs ml-1 ${
                                    Number(order.weightVariance) < 0
                                      ? 'text-error'
                                      : 'text-success'
                                  }`}
                                >
                                  ({Number(order.weightVariance) > 0 ? '+' : ''}
                                  {Number(order.weightVariance).toFixed(1)}%)
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-neutral-500">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                              dyeingStatusColors[order.status].bg
                            } ${dyeingStatusColors[order.status].text}`}
                          >
                            {dyeingStatusLabels[order.status]}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            {(order.status === 'IN_PROCESS' || order.status === 'READY') && (
                              <Link href={`/dyeing/orders/${order.id}/receive`}>
                                <Button variant="ghost" size="sm">
                                  Receive
                                </Button>
                              </Link>
                            )}
                            <Link href={`/dyeing/orders/${order.id}`}>
                              <Button variant="ghost" size="sm">
                                View
                              </Button>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-factory-border">
                  <p className="text-sm text-neutral-400">
                    Showing {orders.length} of {pagination.total} orders
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={pagination.page === 1}
                      onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={pagination.page === pagination.totalPages}
                      onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        /* Vendors Tab */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vendors.map((vendor) => (
            <div
              key={vendor.id}
              className="bg-factory-dark rounded-2xl border border-factory-border p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    {vendor.name}
                  </h3>
                  <p className="text-sm text-neutral-400">{vendor.code}</p>
                  {vendor.qualityRating && (
                    <div className="flex items-center gap-1 mt-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <svg
                          key={i}
                          className={`w-4 h-4 ${
                            i < Math.floor(Number(vendor.qualityRating))
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
                        {Number(vendor.qualityRating).toFixed(1)}
                      </span>
                    </div>
                  )}
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
                    {vendor.avgTurnaround > 0 ? `${vendor.avgTurnaround} days` : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-neutral-400">Completed</p>
                  <p className="text-white font-medium">{vendor.completedOrders}</p>
                </div>
                <div>
                  <p className="text-sm text-neutral-400">Avg Weight Variance</p>
                  <p className={`font-medium ${
                    vendor.avgWeightVariance < 0 ? 'text-error' : 'text-success'
                  }`}>
                    {vendor.avgWeightVariance !== 0
                      ? `${vendor.avgWeightVariance > 0 ? '+' : ''}${vendor.avgWeightVariance.toFixed(1)}%`
                      : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-neutral-400">Default Rate</p>
                  <p className="text-white font-medium">
                    {vendor.defaultRatePerKg
                      ? `PKR ${Number(vendor.defaultRatePerKg).toLocaleString()}`
                      : '-'}
                  </p>
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <Link href={`/dyeing/vendors/${vendor.id}`} className="flex-1">
                  <Button variant="secondary" size="sm" className="w-full">
                    View Orders
                  </Button>
                </Link>
                <Link href={`/dyeing/vendors/${vendor.id}/edit`}>
                  <Button variant="ghost" size="sm">
                    Edit
                  </Button>
                </Link>
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
