'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/atoms/Button';
import { useToast } from '@/contexts/ToastContext';
import { needleTypesApi } from '@/lib/api/needles';
import {
  NeedleType,
  needleKindLabels,
  stockStatusColors,
  stockStatusLabels,
  StockStatus,
} from '@/lib/types/needle';
import { Image as ImageIcon, QrCode } from 'lucide-react';

export default function NeedleTypesPage() {
  const { showToast } = useToast();
  const [types, setTypes] = useState<(NeedleType & { currentStock: number })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('active');

  useEffect(() => {
    fetchTypes();
  }, [filter]);

  const fetchTypes = async () => {
    try {
      setIsLoading(true);
      const data = await needleTypesApi.getAll({
        isActive: filter === 'all' ? undefined : filter === 'active',
      });
      setTypes(data as (NeedleType & { currentStock: number })[]);
    } catch (error: any) {
      showToast('error', error.response?.data?.error || 'Failed to load needle types');
    } finally {
      setIsLoading(false);
    }
  };

  const getStockStatus = (type: NeedleType & { currentStock: number }): StockStatus => {
    if (type.currentStock <= type.minStockLevel) return 'LOW';
    if (type.currentStock <= type.reorderPoint) return 'REORDER';
    return 'OK';
  };

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
            <span className="text-white">Types</span>
          </div>
          <h1 className="text-2xl font-semibold text-white mt-2">Needle Types</h1>
          <p className="text-neutral-400 text-sm mt-1">
            Manage your needle inventory with photos and barcodes for easy identification
          </p>
        </div>
        <Link href="/needles/types/new">
          <Button>Add Needle Type</Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {(['active', 'inactive', 'all'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-primary-500/20 text-primary-400'
                : 'text-neutral-400 hover:bg-factory-gray hover:text-white'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
          <span className="ml-3 text-neutral-400">Loading...</span>
        </div>
      ) : types.length === 0 ? (
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-12 text-center">
          <span className="text-4xl">📋</span>
          <p className="text-neutral-400 mt-4">No needle types found</p>
          <Link href="/needles/types/new">
            <Button className="mt-4">Add First Type</Button>
          </Link>
        </div>
      ) : (
        <div className="bg-factory-dark rounded-2xl border border-factory-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-factory-border">
                  <th className="text-left text-sm font-medium text-neutral-400 px-6 py-4">Photo</th>
                  <th className="text-left text-sm font-medium text-neutral-400 px-6 py-4">Code</th>
                  <th className="text-left text-sm font-medium text-neutral-400 px-6 py-4">Name</th>
                  <th className="text-left text-sm font-medium text-neutral-400 px-6 py-4">Type</th>
                  <th className="text-left text-sm font-medium text-neutral-400 px-6 py-4">Gauge</th>
                  <th className="text-right text-sm font-medium text-neutral-400 px-6 py-4">Stock</th>
                  <th className="text-left text-sm font-medium text-neutral-400 px-6 py-4">Status</th>
                  <th className="text-right text-sm font-medium text-neutral-400 px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {types.map((type) => {
                  const stockStatus = getStockStatus(type);
                  return (
                    <tr
                      key={type.id}
                      className="border-b border-factory-border last:border-0 hover:bg-factory-gray/50 transition-colors"
                    >
                      {/* Photo */}
                      <td className="px-6 py-3">
                        <div className="w-12 h-12 rounded-lg border border-factory-border bg-factory-gray flex items-center justify-center overflow-hidden">
                          {type.imageUrl ? (
                            <Image
                              src={type.imageUrl}
                              alt={type.name}
                              width={48}
                              height={48}
                              className="object-cover w-full h-full"
                            />
                          ) : (
                            <ImageIcon className="w-5 h-5 text-neutral-500" />
                          )}
                        </div>
                      </td>
                      {/* Code with barcode indicator */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-primary-400 font-mono text-sm">{type.code}</span>
                          {type.barcode && (
                            <span title={type.barcode}>
                              <QrCode className="w-4 h-4 text-neutral-500" />
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Link
                          href={`/needles/types/${type.id}`}
                          className="text-white hover:text-primary-400"
                        >
                          {type.name}
                        </Link>
                        {type.brand && (
                          <p className="text-xs text-neutral-500">{type.brand}</p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-neutral-300">
                        {needleKindLabels[type.needleKind]}
                      </td>
                      <td className="px-6 py-4 text-neutral-300">{type.gauge}G</td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-white font-medium">
                          {type.currentStock.toLocaleString()}
                        </span>
                        <span className="text-neutral-500 text-sm ml-1">
                          / {type.minStockLevel.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium ${stockStatusColors[stockStatus].bg} ${stockStatusColors[stockStatus].text}`}
                        >
                          {stockStatusLabels[stockStatus]}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Link href={`/needles/types/${type.id}`}>
                            <Button variant="ghost" size="sm">
                              View
                            </Button>
                          </Link>
                          <Link href={`/needles/types/${type.id}/edit`}>
                            <Button variant="secondary" size="sm">
                              Edit
                            </Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
