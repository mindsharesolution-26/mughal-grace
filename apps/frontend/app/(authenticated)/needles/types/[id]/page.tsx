'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/atoms/Button';
import { useToast } from '@/contexts/ToastContext';
import { needleTypesApi } from '@/lib/api/needles';
import {
  NeedleTypeWithStock,
  needleKindLabels,
  stockStatusColors,
  stockStatusLabels,
  StockStatus,
} from '@/lib/types/needle';

export default function NeedleTypeDetailPage() {
  const router = useRouter();
  const params = useParams();
  const typeId = Number(params.id);
  const { showToast } = useToast();

  const [type, setType] = useState<NeedleTypeWithStock | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchType();
  }, [typeId]);

  const fetchType = async () => {
    try {
      setIsLoading(true);
      const data = await needleTypesApi.getById(typeId);
      setType(data);
    } catch (error: any) {
      showToast('error', error.response?.data?.error || 'Failed to load needle type');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
        <span className="ml-3 text-neutral-400">Loading...</span>
      </div>
    );
  }

  if (!type) {
    return (
      <div className="text-center py-12">
        <p className="text-error">Needle type not found</p>
        <Button className="mt-4" onClick={() => router.push('/needles/types')}>
          Back to Types
        </Button>
      </div>
    );
  }

  const getStockStatus = (): StockStatus => {
    const stock = type.stockSummary.currentStock;
    if (stock <= type.minStockLevel) return 'LOW';
    if (stock <= type.reorderPoint) return 'REORDER';
    return 'OK';
  };

  const stockStatus = getStockStatus();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm">
            <Link href="/needles" className="text-neutral-400 hover:text-white">
              Needles
            </Link>
            <span className="text-neutral-600">/</span>
            <Link href="/needles/types" className="text-neutral-400 hover:text-white">
              Types
            </Link>
            <span className="text-neutral-600">/</span>
            <span className="text-white">{type.name}</span>
          </div>
          <h1 className="text-2xl font-semibold text-white mt-2">{type.name}</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => router.back()}>
            Back
          </Button>
          <Link href={`/needles/types/${typeId}/edit`}>
            <Button variant="secondary">Edit</Button>
          </Link>
        </div>
      </div>

      {/* Main Info Card */}
      <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-primary-400 font-mono text-sm">{type.code}</span>
            <h2 className="text-xl font-semibold text-white mt-1">{type.name}</h2>
            <p className="text-neutral-400 mt-1">{needleKindLabels[type.needleKind]}</p>
          </div>
          <div className="flex gap-2">
            <span
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                type.isActive
                  ? 'bg-success/20 text-success'
                  : 'bg-neutral-500/20 text-neutral-400'
              }`}
            >
              {type.isActive ? 'Active' : 'Inactive'}
            </span>
            <span
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${stockStatusColors[stockStatus].bg} ${stockStatusColors[stockStatus].text}`}
            >
              {stockStatusLabels[stockStatus]}
            </span>
          </div>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Specifications */}
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Specifications</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-neutral-400">Gauge</span>
              <span className="text-white">{type.gauge}G</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">Length</span>
              <span className="text-white">{type.length ? `${type.length}mm` : '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">Material</span>
              <span className="text-white">{type.material}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">Brand</span>
              <span className="text-white">{type.brand || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">Supplier Code</span>
              <span className="text-white">{type.supplierCode || '-'}</span>
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Pricing</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-neutral-400">Cost per Needle</span>
              <span className="text-white">
                {type.costPerNeedle
                  ? `${type.currency} ${Number(type.costPerNeedle).toFixed(2)}`
                  : '-'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">Currency</span>
              <span className="text-white">{type.currency}</span>
            </div>
          </div>
        </div>

        {/* Inventory Settings */}
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Inventory Settings</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-neutral-400">Min Stock Level</span>
              <span className="text-white">{type.minStockLevel.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">Reorder Point</span>
              <span className="text-white">{type.reorderPoint.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stock Summary */}
      <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Stock Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-factory-gray rounded-xl">
            <p className="text-sm text-neutral-400">Total Received</p>
            <p className="text-xl font-semibold text-white mt-1">
              {type.stockSummary.totalReceived.toLocaleString()}
            </p>
          </div>
          <div className="p-4 bg-factory-gray rounded-xl">
            <p className="text-sm text-neutral-400">Current Stock</p>
            <p className="text-xl font-semibold text-success mt-1">
              {type.stockSummary.currentStock.toLocaleString()}
            </p>
          </div>
          <div className="p-4 bg-factory-gray rounded-xl">
            <p className="text-sm text-neutral-400">Allocated</p>
            <p className="text-xl font-semibold text-blue-400 mt-1">
              {type.stockSummary.allocated.toLocaleString()}
            </p>
          </div>
          <div className="p-4 bg-factory-gray rounded-xl">
            <p className="text-sm text-neutral-400">Damaged</p>
            <p className="text-xl font-semibold text-error mt-1">
              {type.stockSummary.damaged.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Active Allocations */}
      {type.machineAllocations && type.machineAllocations.length > 0 && (
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Active Allocations</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-factory-border">
                  <th className="text-left text-sm font-medium text-neutral-400 pb-3">Machine</th>
                  <th className="text-right text-sm font-medium text-neutral-400 pb-3">Quantity</th>
                  <th className="text-left text-sm font-medium text-neutral-400 pb-3">Position</th>
                  <th className="text-left text-sm font-medium text-neutral-400 pb-3">Installed</th>
                </tr>
              </thead>
              <tbody>
                {type.machineAllocations.map((alloc) => (
                  <tr key={alloc.id} className="border-b border-factory-border last:border-0">
                    <td className="py-3">
                      <span className="text-white">
                        {alloc.machine?.machineNumber} - {alloc.machine?.name}
                      </span>
                    </td>
                    <td className="py-3 text-right text-white">
                      {alloc.installedQuantity.toLocaleString()}
                    </td>
                    <td className="py-3 text-neutral-300">{alloc.position || '-'}</td>
                    <td className="py-3 text-neutral-400">
                      {new Date(alloc.installedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Notes */}
      {type.notes && (
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Notes</h3>
          <p className="text-neutral-300 whitespace-pre-wrap">{type.notes}</p>
        </div>
      )}
    </div>
  );
}
