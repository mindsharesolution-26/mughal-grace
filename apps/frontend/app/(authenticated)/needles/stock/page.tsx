'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/atoms/Button';
import { useToast } from '@/contexts/ToastContext';
import { needleStockApi } from '@/lib/api/needles';
import {
  NeedleStockSummary,
  stockStatusColors,
  stockStatusLabels,
} from '@/lib/types/needle';

export default function NeedleStockPage() {
  const { showToast } = useToast();
  const [summary, setSummary] = useState<NeedleStockSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState<'summary' | 'batches'>('summary');

  useEffect(() => {
    fetchSummary();
  }, []);

  const fetchSummary = async () => {
    try {
      setIsLoading(true);
      const data = await needleStockApi.getSummary();
      setSummary(data);
    } catch (error: any) {
      showToast('error', error.response?.data?.error || 'Failed to load stock summary');
    } finally {
      setIsLoading(false);
    }
  };

  const totalStock = summary.reduce((sum, s) => sum + s.currentStock, 0);
  const totalAllocated = summary.reduce((sum, s) => sum + s.allocated, 0);
  const lowStockCount = summary.filter((s) => s.status === 'LOW').length;
  const reorderCount = summary.filter((s) => s.status === 'REORDER').length;

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
            <span className="text-white">Stock</span>
          </div>
          <h1 className="text-2xl font-semibold text-white mt-2">Stock Management</h1>
        </div>
        <Link href="/needles/stock/receive">
          <Button>Receive Stock</Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-4">
          <p className="text-sm text-neutral-400">Total Stock</p>
          <p className="text-2xl font-semibold text-white mt-1">
            {totalStock.toLocaleString()}
          </p>
        </div>
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-4">
          <p className="text-sm text-neutral-400">Allocated</p>
          <p className="text-2xl font-semibold text-blue-400 mt-1">
            {totalAllocated.toLocaleString()}
          </p>
        </div>
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-4">
          <p className="text-sm text-neutral-400">Low Stock</p>
          <p className={`text-2xl font-semibold mt-1 ${lowStockCount > 0 ? 'text-error' : 'text-success'}`}>
            {lowStockCount}
          </p>
        </div>
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-4">
          <p className="text-sm text-neutral-400">Reorder Soon</p>
          <p className={`text-2xl font-semibold mt-1 ${reorderCount > 0 ? 'text-warning' : 'text-success'}`}>
            {reorderCount}
          </p>
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setView('summary')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            view === 'summary'
              ? 'bg-primary-500/20 text-primary-400'
              : 'text-neutral-400 hover:bg-factory-gray hover:text-white'
          }`}
        >
          Summary by Type
        </button>
        <button
          onClick={() => setView('batches')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            view === 'batches'
              ? 'bg-primary-500/20 text-primary-400'
              : 'text-neutral-400 hover:bg-factory-gray hover:text-white'
          }`}
        >
          All Batches
        </button>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
          <span className="ml-3 text-neutral-400">Loading...</span>
        </div>
      ) : summary.length === 0 ? (
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-12 text-center">
          <span className="text-4xl">📦</span>
          <p className="text-neutral-400 mt-4">No stock data available</p>
          <Link href="/needles/stock/receive">
            <Button className="mt-4">Receive First Stock</Button>
          </Link>
        </div>
      ) : (
        <div className="bg-factory-dark rounded-2xl border border-factory-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-factory-border">
                  <th className="text-left text-sm font-medium text-neutral-400 px-6 py-4">Code</th>
                  <th className="text-left text-sm font-medium text-neutral-400 px-6 py-4">Needle Type</th>
                  <th className="text-left text-sm font-medium text-neutral-400 px-6 py-4">Gauge</th>
                  <th className="text-right text-sm font-medium text-neutral-400 px-6 py-4">Received</th>
                  <th className="text-right text-sm font-medium text-neutral-400 px-6 py-4">Current</th>
                  <th className="text-right text-sm font-medium text-neutral-400 px-6 py-4">Allocated</th>
                  <th className="text-right text-sm font-medium text-neutral-400 px-6 py-4">Damaged</th>
                  <th className="text-left text-sm font-medium text-neutral-400 px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {summary.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-factory-border last:border-0 hover:bg-factory-gray/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <span className="text-primary-400 font-mono text-sm">{item.code}</span>
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        href={`/needles/types/${item.id}`}
                        className="text-white hover:text-primary-400"
                      >
                        {item.name}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-neutral-300">{item.gauge}G</td>
                    <td className="px-6 py-4 text-right text-neutral-300">
                      {item.totalReceived.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-white font-medium">
                        {item.currentStock.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-blue-400">
                      {item.allocated.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right text-error">
                      {item.damaged.toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium ${stockStatusColors[item.status].bg} ${stockStatusColors[item.status].text}`}
                      >
                        {stockStatusLabels[item.status]}
                      </span>
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
