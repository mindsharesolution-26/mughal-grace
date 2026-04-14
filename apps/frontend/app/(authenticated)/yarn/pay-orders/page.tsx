'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useToast } from '@/contexts/ToastContext';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { StatsCard } from '@/components/molecules/StatsCard';
import { purchaseOrdersApi } from '@/lib/api/yarn-purchase-orders';
import {
  PurchaseOrder,
  PurchaseOrderStatus,
  PURCHASE_ORDER_STATUSES,
} from '@/lib/types/yarn';
import { Plus, Eye, CheckCircle, Send, X, FileText } from 'lucide-react';

export default function PayOrdersPage() {
  const { showToast } = useToast();
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<PurchaseOrderStatus | 'all'>('all');
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const data = await purchaseOrdersApi.getAll();
      setOrders(data);
    } catch (error) {
      showToast('error', 'Failed to load purchase orders');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: number) => {
    setActionLoading(id);
    try {
      await purchaseOrdersApi.approve(id);
      showToast('success', 'Order approved');
      fetchOrders();
    } catch (error: any) {
      showToast('error', error.response?.data?.error || 'Failed to approve order');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSend = async (id: number) => {
    setActionLoading(id);
    try {
      await purchaseOrdersApi.send(id);
      showToast('success', 'Order marked as sent to vendor');
      fetchOrders();
    } catch (error: any) {
      showToast('error', error.response?.data?.error || 'Failed to send order');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async (id: number) => {
    if (!confirm('Are you sure you want to cancel this order?')) return;
    setActionLoading(id);
    try {
      await purchaseOrdersApi.cancel(id);
      showToast('success', 'Order cancelled');
      fetchOrders();
    } catch (error: any) {
      showToast('error', error.response?.data?.error || 'Failed to cancel order');
    } finally {
      setActionLoading(null);
    }
  };

  // Filter orders
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesSearch =
        searchQuery === '' ||
        order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.vendor?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.vendor?.code?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === 'all' || order.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [orders, searchQuery, statusFilter]);

  // Calculate stats
  const stats = useMemo(() => {
    const totalOrders = orders.length;
    const draft = orders.filter((o) => o.status === 'DRAFT').length;
    const pendingApproval = orders.filter((o) => o.status === 'DRAFT').length;
    const approved = orders.filter((o) => o.status === 'APPROVED').length;
    const sent = orders.filter((o) => o.status === 'SENT' || o.status === 'PARTIALLY_RECEIVED').length;
    const totalQuantity = orders.reduce((sum, o) => sum + o.totalQuantity, 0);

    return {
      totalOrders,
      draft,
      pendingApproval,
      approved,
      sent,
      totalQuantity,
    };
  }, [orders]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-PK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusBadge = (status: PurchaseOrderStatus) => {
    const statusInfo = PURCHASE_ORDER_STATUSES[status];
    const colorClasses: Record<string, string> = {
      gray: 'bg-neutral-500/20 text-neutral-400',
      blue: 'bg-blue-500/20 text-blue-400',
      purple: 'bg-purple-500/20 text-purple-400',
      yellow: 'bg-warning/20 text-warning',
      green: 'bg-success/20 text-success',
      red: 'bg-error/20 text-error',
    };

    return (
      <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${colorClasses[statusInfo.color]}`}>
        {statusInfo.label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-500/20 flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Purchase Orders</h1>
              <p className="text-sm text-neutral-400">Manage yarn purchase orders</p>
            </div>
          </div>
        </div>
        <Link href="/yarn/pay-orders/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            New Order
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatsCard
          title="Total Orders"
          value={stats.totalOrders}
          icon="📋"
        />
        <StatsCard
          title="Draft"
          value={stats.draft}
          change={stats.draft > 0 ? 'Needs approval' : 'None'}
          changeType={stats.draft > 0 ? 'neutral' : 'positive'}
          icon="📝"
        />
        <StatsCard
          title="Approved"
          value={stats.approved}
          change={stats.approved > 0 ? 'Ready to send' : 'None'}
          changeType={stats.approved > 0 ? 'positive' : 'neutral'}
          icon="✓"
        />
        <StatsCard
          title="Sent/Receiving"
          value={stats.sent}
          change={stats.sent > 0 ? 'Awaiting' : 'None'}
          changeType={stats.sent > 0 ? 'neutral' : 'positive'}
          icon="🚚"
        />
        <StatsCard
          title="Total Quantity"
          value={`${stats.totalQuantity.toLocaleString()} kg`}
          icon="📦"
        />
      </div>

      {/* Search and Filters */}
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
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as PurchaseOrderStatus | 'all')}
              className="px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Status</option>
              {Object.values(PURCHASE_ORDER_STATUSES).map((status) => (
                <option key={status.code} value={status.code}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-factory-dark rounded-2xl border border-factory-border overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-neutral-400">Loading...</div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-neutral-400">
              {searchQuery || statusFilter !== 'all'
                ? 'No orders found matching your criteria'
                : 'No purchase orders yet. Create your first order.'}
            </p>
          </div>
        ) : (
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
                    Order Date
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">
                    Expected
                  </th>
                  <th className="text-right px-6 py-4 text-sm font-medium text-neutral-400">
                    Quantity
                  </th>
                  <th className="text-right px-6 py-4 text-sm font-medium text-neutral-400">
                    Amount
                  </th>
                  <th className="text-center px-6 py-4 text-sm font-medium text-neutral-400">
                    Status
                  </th>
                  <th className="text-right px-6 py-4 text-sm font-medium text-neutral-400">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-factory-border">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-factory-gray/30 transition-colors">
                    <td className="px-6 py-4">
                      <Link
                        href={`/yarn/pay-orders/${order.id}`}
                        className="font-mono text-sm text-primary-400 hover:text-primary-300"
                      >
                        {order.orderNumber}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-white">{order.vendor?.name || '-'}</p>
                        <p className="text-xs text-neutral-400">{order.vendor?.code}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-neutral-300">
                      {formatDate(order.orderDate)}
                    </td>
                    <td className="px-6 py-4 text-neutral-300">
                      {formatDate(order.expectedDeliveryDate)}
                    </td>
                    <td className="px-6 py-4 text-right text-white font-medium">
                      {order.totalQuantity.toLocaleString()} kg
                    </td>
                    <td className="px-6 py-4 text-right text-white">
                      {order.totalAmount ? `Rs. ${order.totalAmount.toLocaleString()}` : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center">
                        {getStatusBadge(order.status)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <Link href={`/yarn/pay-orders/${order.id}`}>
                          <Button variant="ghost" size="sm" title="View">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </Link>

                        {order.status === 'DRAFT' && (
                          <>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleApprove(order.id)}
                              disabled={actionLoading === order.id}
                              title="Approve"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCancel(order.id)}
                              disabled={actionLoading === order.id}
                              title="Cancel"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </>
                        )}

                        {order.status === 'APPROVED' && (
                          <Button
                            size="sm"
                            onClick={() => handleSend(order.id)}
                            disabled={actionLoading === order.id}
                            title="Mark as Sent"
                          >
                            <Send className="w-4 h-4 mr-1" />
                            Send
                          </Button>
                        )}

                        {(order.status === 'SENT' || order.status === 'PARTIALLY_RECEIVED') && (
                          <Link href={`/yarn/inward?payOrderId=${order.id}`}>
                            <Button variant="secondary" size="sm">
                              Receive
                            </Button>
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Workflow Guide */}
      <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Order Workflow</h3>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="px-3 py-1.5 rounded-lg bg-neutral-500/20 text-neutral-400">
            1. Draft
          </span>
          <span className="text-neutral-600">→</span>
          <span className="px-3 py-1.5 rounded-lg bg-blue-500/20 text-blue-400">
            2. Approved
          </span>
          <span className="text-neutral-600">→</span>
          <span className="px-3 py-1.5 rounded-lg bg-purple-500/20 text-purple-400">
            3. Sent
          </span>
          <span className="text-neutral-600">→</span>
          <span className="px-3 py-1.5 rounded-lg bg-warning/20 text-warning">
            4. Receiving
          </span>
          <span className="text-neutral-600">→</span>
          <span className="px-3 py-1.5 rounded-lg bg-success/20 text-success">
            5. Completed
          </span>
        </div>
        <p className="mt-3 text-sm text-neutral-400">
          Create orders in Draft, approve when ready, mark as Sent to vendor, then receive boxes against the order.
        </p>
      </div>
    </div>
  );
}
