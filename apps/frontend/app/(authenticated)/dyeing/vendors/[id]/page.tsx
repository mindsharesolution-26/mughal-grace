'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/atoms/Button';
import { useToast } from '@/contexts/ToastContext';
import { dyeingVendorsApi, dyeingOrdersApi } from '@/lib/api/dyeing';
import { DyeingVendor, DyeingOrder, dyeingStatusLabels, dyeingStatusColors } from '@/lib/types/dyeing';

export default function DyeingVendorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const [vendor, setVendor] = useState<DyeingVendor | null>(null);
  const [orders, setOrders] = useState<DyeingOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const vendorId = Number(params.id);

  useEffect(() => {
    fetchData();
  }, [vendorId]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [vendorData, ordersData] = await Promise.all([
        dyeingVendorsApi.getById(vendorId),
        dyeingOrdersApi.getAll({ vendorId, limit: 100 }),
      ]);
      setVendor(vendorData);
      setOrders(ordersData.orders);
    } catch (error: any) {
      showToast('error', error.response?.data?.error || 'Failed to load vendor');
      router.push('/dyeing');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || !vendor) {
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
          <div className="flex items-center gap-2 text-sm">
            <Link href="/dyeing" className="text-neutral-400 hover:text-white">
              Dyeing
            </Link>
            <span className="text-neutral-600">/</span>
            <span className="text-white">{vendor.name}</span>
          </div>
          <h1 className="text-2xl font-semibold text-white mt-2">{vendor.name}</h1>
          <p className="text-neutral-400 mt-1">Vendor Code: {vendor.code}</p>
        </div>
        <div className="flex gap-3">
          <Link href={`/dyeing/vendors/${vendor.id}/edit`}>
            <Button variant="secondary">Edit Vendor</Button>
          </Link>
          <Link href="/dyeing/send">
            <Button>Send for Dyeing</Button>
          </Link>
        </div>
      </div>

      {/* Vendor Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
          <h3 className="text-sm text-neutral-400 mb-2">Contact Information</h3>
          <div className="space-y-2">
            {vendor.contactPerson && (
              <p className="text-white">{vendor.contactPerson}</p>
            )}
            {vendor.phone && (
              <p className="text-neutral-300">{vendor.phone}</p>
            )}
            {vendor.email && (
              <p className="text-neutral-300">{vendor.email}</p>
            )}
            {!vendor.contactPerson && !vendor.phone && !vendor.email && (
              <p className="text-neutral-500">No contact info</p>
            )}
          </div>
        </div>

        <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
          <h3 className="text-sm text-neutral-400 mb-2">Address</h3>
          <div className="space-y-1">
            {vendor.address && <p className="text-white">{vendor.address}</p>}
            {vendor.city && <p className="text-neutral-300">{vendor.city}</p>}
            {!vendor.address && !vendor.city && (
              <p className="text-neutral-500">No address</p>
            )}
          </div>
        </div>

        <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
          <h3 className="text-sm text-neutral-400 mb-2">Financial Terms</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-neutral-400">Payment Terms</span>
              <span className="text-white">{vendor.paymentTerms || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">Rate/KG</span>
              <span className="text-white">
                {vendor.defaultRatePerKg
                  ? `PKR ${Number(vendor.defaultRatePerKg).toLocaleString()}`
                  : '-'}
              </span>
            </div>
            {vendor.qualityRating && (
              <div className="flex justify-between items-center">
                <span className="text-neutral-400">Rating</span>
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span
                      key={i}
                      className={`text-sm ${
                        i < Math.floor(Number(vendor.qualityRating))
                          ? 'text-yellow-400'
                          : 'text-neutral-600'
                      }`}
                    >
                      ★
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Orders */}
      <div className="bg-factory-dark rounded-2xl border border-factory-border overflow-hidden">
        <div className="px-6 py-4 border-b border-factory-border">
          <h2 className="text-lg font-semibold text-white">
            Dyeing Orders ({orders.length})
          </h2>
        </div>

        {orders.length === 0 ? (
          <div className="p-12 text-center">
            <span className="text-4xl">📋</span>
            <p className="text-neutral-400 mt-4">No orders with this vendor yet</p>
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
                    Color
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
                  <tr key={order.id} className="hover:bg-factory-gray transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-mono text-sm text-primary-400">
                        {order.orderNumber}
                      </span>
                      <p className="text-xs text-neutral-500 mt-0.5">
                        {new Date(order.sentAt).toLocaleDateString()}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-neutral-300">{order.colorName || '-'}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-white">{Number(order.sentWeight).toFixed(1)} kg</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {order.receivedWeight ? (
                        <span className="text-white">
                          {Number(order.receivedWeight).toFixed(1)} kg
                        </span>
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
                      <Link href={`/dyeing/orders/${order.id}`}>
                        <Button variant="ghost" size="sm">
                          View
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
