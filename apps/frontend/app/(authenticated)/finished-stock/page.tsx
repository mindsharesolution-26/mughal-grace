'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { StatsCard } from '@/components/molecules/StatsCard';
import { useToast } from '@/contexts/ToastContext';
import { rollsApi } from '@/lib/api/rolls';
import { Roll, FinishedStockSummary } from '@/lib/types/roll';
import {
  Package,
  Scale,
  Layers,
  Search,
  ShoppingCart,
  ArrowLeft,
  CheckCircle,
  Palette,
  Factory,
} from 'lucide-react';

export default function FinishedStockPage() {
  const { showToast } = useToast();

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [summary, setSummary] = useState<FinishedStockSummary | null>(null);
  const [rolls, setRolls] = useState<Roll[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRolls, setSelectedRolls] = useState<number[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 20;

  useEffect(() => {
    fetchData();
  }, [page, searchQuery]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [summaryData, rollsData] = await Promise.all([
        rollsApi.getFinishedStockSummary(),
        rollsApi.getAll({
          status: 'FINISHED_STOCK',
          search: searchQuery || undefined,
          page,
          limit,
        }),
      ]);
      setSummary(summaryData);
      setRolls(rollsData.rolls);
      setTotalPages(rollsData.pagination.totalPages);
    } catch (error: any) {
      showToast('error', error.response?.data?.error || 'Failed to load finished stock');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleRollSelection = (rollId: number) => {
    setSelectedRolls((prev) =>
      prev.includes(rollId) ? prev.filter((id) => id !== rollId) : [...prev, rollId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedRolls.length === rolls.length) {
      setSelectedRolls([]);
    } else {
      setSelectedRolls(rolls.map((r) => r.id));
    }
  };

  const handleStockOut = async (rollId: number) => {
    setIsProcessing(true);
    try {
      await rollsApi.stockOut(rollId, { destinationType: 'SALE' });
      showToast('success', 'Roll marked as sold');
      fetchData();
      setSelectedRolls((prev) => prev.filter((id) => id !== rollId));
    } catch (error: any) {
      showToast('error', error.response?.data?.error || 'Failed to stock out roll');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkStockOut = async () => {
    if (selectedRolls.length === 0) return;

    setIsProcessing(true);
    try {
      let successCount = 0;
      for (const rollId of selectedRolls) {
        try {
          await rollsApi.stockOut(rollId, { destinationType: 'SALE' });
          successCount++;
        } catch (e) {
          // Continue with others
        }
      }
      showToast('success', `${successCount} roll(s) marked as sold`);
      fetchData();
      setSelectedRolls([]);
    } catch (error: any) {
      showToast('error', 'Failed to process bulk stock out');
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading && !summary) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
        <span className="ml-3 text-neutral-400">Loading finished stock...</span>
      </div>
    );
  }

  const totalRolls = summary?.totalRolls || 0;
  const totalWeight = Number(summary?.totalWeight || 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm mb-2">
            <Link href="/fabric-stock" className="text-neutral-400 hover:text-white">
              Fabric Stock
            </Link>
            <span className="text-neutral-600">/</span>
            <span className="text-white">Finished Stock</span>
          </div>
          <h1 className="text-2xl font-semibold text-white">Finished Stock</h1>
          <p className="text-neutral-400 mt-1">
            Dyed fabric ready for sale or dispatch
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/fabric-stock">
            <Button variant="ghost">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Finished Rolls"
          value={totalRolls}
          icon="📦"
        />
        <StatsCard
          title="Total Weight"
          value={`${totalWeight.toFixed(2)} kg`}
          icon="⚖️"
        />
        <StatsCard
          title="Selected"
          value={selectedRolls.length}
          subtitle="for stock out"
          icon="✓"
        />
        <StatsCard
          title="Sold Today"
          value={summary?.byStatus?.SOLD?.count || 0}
          icon="🛒"
        />
      </div>

      {/* Bulk Actions */}
      {selectedRolls.length > 0 && (
        <div className="bg-primary-500/10 border border-primary-500/30 rounded-xl p-4 flex items-center justify-between">
          <span className="text-primary-400">
            {selectedRolls.length} roll(s) selected
          </span>
          <Button
            onClick={handleBulkStockOut}
            disabled={isProcessing}
          >
            <ShoppingCart className="w-4 h-4 mr-2" />
            {isProcessing ? 'Processing...' : 'Mark as Sold'}
          </Button>
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-factory-dark rounded-2xl border border-factory-border p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
            <Input
              placeholder="Search by roll number or fabric type..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      {/* Rolls Table */}
      <div className="bg-factory-dark rounded-2xl border border-factory-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-factory-border">
                <th className="text-left px-6 py-4">
                  <button
                    onClick={toggleSelectAll}
                    className={`w-5 h-5 rounded border flex items-center justify-center ${
                      selectedRolls.length === rolls.length && rolls.length > 0
                        ? 'bg-primary-500 border-primary-500'
                        : 'border-factory-border'
                    }`}
                  >
                    {selectedRolls.length === rolls.length && rolls.length > 0 && (
                      <CheckCircle className="w-3 h-3 text-white" />
                    )}
                  </button>
                </th>
                <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">
                  Roll Number
                </th>
                <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">
                  Fabric Type
                </th>
                <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">
                  Color
                </th>
                <th className="text-right px-6 py-4 text-sm font-medium text-neutral-400">
                  Grey Weight
                </th>
                <th className="text-right px-6 py-4 text-sm font-medium text-neutral-400">
                  Finished Weight
                </th>
                <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">
                  Grade
                </th>
                <th className="text-right px-6 py-4 text-sm font-medium text-neutral-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-factory-border">
              {rolls.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <Package className="w-12 h-12 text-neutral-500 mx-auto mb-4" />
                    <p className="text-neutral-400">No finished stock found</p>
                    <p className="text-neutral-500 text-sm mt-1">
                      Move dyed fabric to finished stock from the Dyed Stock page
                    </p>
                    <Link href="/dyeing/stock" className="mt-4 inline-block">
                      <Button variant="secondary" size="sm">
                        Go to Dyed Stock
                      </Button>
                    </Link>
                  </td>
                </tr>
              ) : (
                rolls.map((roll) => (
                  <tr
                    key={roll.id}
                    className={`hover:bg-factory-gray transition-colors ${
                      selectedRolls.includes(roll.id) ? 'bg-primary-500/5' : ''
                    }`}
                  >
                    <td className="px-6 py-4">
                      <button
                        onClick={() => toggleRollSelection(roll.id)}
                        className={`w-5 h-5 rounded border flex items-center justify-center ${
                          selectedRolls.includes(roll.id)
                            ? 'bg-primary-500 border-primary-500'
                            : 'border-factory-border'
                        }`}
                      >
                        {selectedRolls.includes(roll.id) && (
                          <CheckCircle className="w-3 h-3 text-white" />
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-primary-400">{roll.rollNumber}</span>
                      {roll.qrCode && (
                        <p className="text-xs text-neutral-500 mt-1">{roll.qrCode}</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Factory className="w-4 h-4 text-neutral-500" />
                        <span className="text-white">{roll.fabricType}</span>
                      </div>
                      {roll.fabric && (
                        <p className="text-xs text-neutral-500 mt-1">{roll.fabric.name}</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Palette className="w-4 h-4 text-neutral-500" />
                        <span className="text-white">-</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-neutral-400">{Number(roll.greyWeight).toFixed(2)} kg</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-white font-medium">
                        {roll.finishedWeight ? Number(roll.finishedWeight).toFixed(2) : '-'} kg
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        roll.grade === 'A' ? 'bg-success/20 text-success' :
                        roll.grade === 'B' ? 'bg-warning/20 text-warning' :
                        'bg-error/20 text-error'
                      }`}>
                        Grade {roll.grade || 'A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleStockOut(roll.id)}
                        disabled={isProcessing}
                      >
                        <ShoppingCart className="w-4 h-4 mr-1" />
                        Sell
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-factory-border flex items-center justify-between">
            <p className="text-sm text-neutral-400">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Recent Finished Rolls */}
      {summary?.recentRolls && summary.recentRolls.length > 0 && (
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Recently Finished</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {summary.recentRolls.slice(0, 6).map((roll) => (
              <div
                key={roll.id}
                className="bg-factory-gray rounded-xl p-4 flex items-center justify-between"
              >
                <div>
                  <p className="font-mono text-primary-400 text-sm">{roll.rollNumber}</p>
                  <p className="text-xs text-neutral-500">{roll.fabricType}</p>
                </div>
                <div className="text-right">
                  <p className="text-white font-medium">{Number(roll.greyWeight).toFixed(2)} kg</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
