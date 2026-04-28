'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { StatsCard } from '@/components/molecules/StatsCard';
import { useToast } from '@/contexts/ToastContext';
import { dyedFabricStockApi } from '@/lib/api/dyeing';
import {
  DyedFabricStockItem,
  DyedFabricStockStats,
  DyedFabricStockSummary,
} from '@/lib/types/dyeing';
import {
  Package,
  Scale,
  Palette,
  Layers,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  ArrowRight,
  RefreshCw,
  QrCode,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export default function DyedFabricStockPage() {
  const { showToast } = useToast();

  // Data state
  const [rolls, setRolls] = useState<DyedFabricStockItem[]>([]);
  const [stats, setStats] = useState<DyedFabricStockStats | null>(null);
  const [summary, setSummary] = useState<DyedFabricStockSummary[]>([]);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [colorFilter, setColorFilter] = useState<number | ''>('');
  const [fabricFilter, setFabricFilter] = useState('');

  // Selection state
  const [selectedRollIds, setSelectedRollIds] = useState<Set<number>>(new Set());

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [isMoving, setIsMoving] = useState(false);
  const [activeView, setActiveView] = useState<'list' | 'summary'>('list');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });

  // Fetch stats and summary
  const fetchStatsAndSummary = useCallback(async () => {
    try {
      const [statsData, summaryData] = await Promise.all([
        dyedFabricStockApi.getStats(),
        dyedFabricStockApi.getSummary(),
      ]);
      setStats(statsData);
      setSummary(summaryData);
    } catch (error: any) {
      console.error('Failed to load stats:', error);
    }
  }, []);

  // Fetch rolls
  const fetchRolls = useCallback(async () => {
    try {
      const response = await dyedFabricStockApi.getAll({
        page: pagination.page,
        limit: pagination.limit,
        search: searchQuery || undefined,
        colorId: colorFilter || undefined,
        fabricType: fabricFilter || undefined,
      });
      setRolls(response.rolls);
      setPagination((prev) => ({
        ...prev,
        total: response.pagination.total,
        totalPages: response.pagination.totalPages,
      }));
    } catch (error: any) {
      showToast('error', error.response?.data?.error || 'Failed to load rolls');
    }
  }, [pagination.page, pagination.limit, searchQuery, colorFilter, fabricFilter, showToast]);

  // Initial load
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchStatsAndSummary(), fetchRolls()]);
      setIsLoading(false);
    };
    loadData();
  }, []);

  // Refetch when filters change
  useEffect(() => {
    fetchRolls();
  }, [fetchRolls]);

  // Toggle roll selection
  const toggleRollSelection = (rollId: number) => {
    setSelectedRollIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(rollId)) {
        newSet.delete(rollId);
      } else {
        newSet.add(rollId);
      }
      return newSet;
    });
  };

  // Select all visible rolls
  const selectAllVisible = () => {
    const allIds = new Set(rolls.map((r) => r.id));
    setSelectedRollIds(allIds);
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedRollIds(new Set());
  };

  // Move single roll to finished
  const handleMoveToFinished = async (rollId: number) => {
    setIsMoving(true);
    try {
      await dyedFabricStockApi.moveToFinished(rollId);
      showToast('success', 'Roll moved to finished stock');
      await Promise.all([fetchStatsAndSummary(), fetchRolls()]);
      setSelectedRollIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(rollId);
        return newSet;
      });
    } catch (error: any) {
      showToast('error', error.response?.data?.error || 'Failed to move roll');
    } finally {
      setIsMoving(false);
    }
  };

  // Bulk move to finished
  const handleBulkMoveToFinished = async () => {
    if (selectedRollIds.size === 0) return;

    setIsMoving(true);
    try {
      const result = await dyedFabricStockApi.bulkMoveToFinished(Array.from(selectedRollIds));
      showToast('success', result.message);
      await Promise.all([fetchStatsAndSummary(), fetchRolls()]);
      setSelectedRollIds(new Set());
    } catch (error: any) {
      showToast('error', error.response?.data?.error || 'Failed to move rolls');
    } finally {
      setIsMoving(false);
    }
  };

  // Refresh data
  const handleRefresh = async () => {
    setIsLoading(true);
    await Promise.all([fetchStatsAndSummary(), fetchRolls()]);
    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
        <span className="ml-3 text-neutral-400">Loading dyed fabric stock...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm">
            <Link href="/dyeing" className="text-neutral-400 hover:text-white">
              Dyeing
            </Link>
            <span className="text-neutral-600">/</span>
            <span className="text-white">Dyed Fabric Stock</span>
          </div>
          <h1 className="text-2xl font-semibold text-white mt-2">Dyed Fabric Stock</h1>
          <p className="text-neutral-400 text-sm mt-1">
            Manage rolls that have completed dyeing and are ready for finished stock
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="ghost" onClick={handleRefresh}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Link href="/dyeing/receive">
            <Button variant="secondary">Receive from Dyeing</Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Rolls"
          value={stats?.totalRolls || 0}
          icon={<Package className="w-5 h-5" />}
          trend={stats?.recentCompletions ? `+${stats.recentCompletions} this week` : undefined}
        />
        <StatsCard
          title="Total Weight"
          value={`${(stats?.totalWeight || 0).toFixed(1)} kg`}
          icon={<Scale className="w-5 h-5" />}
        />
        <StatsCard
          title="Color Variants"
          value={stats?.byColor.length || 0}
          icon={<Palette className="w-5 h-5" />}
        />
        <StatsCard
          title="Fabric Types"
          value={stats?.byFabric.length || 0}
          icon={<Layers className="w-5 h-5" />}
        />
      </div>

      {/* View Tabs and Filters */}
      <div className="bg-factory-dark rounded-2xl border border-factory-border p-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* View Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveView('list')}
              className={cn(
                'px-4 py-2 rounded-lg font-medium transition-colors',
                activeView === 'list'
                  ? 'bg-primary-500 text-white'
                  : 'bg-factory-gray text-neutral-400 hover:text-white'
              )}
            >
              Roll List
            </button>
            <button
              onClick={() => setActiveView('summary')}
              className={cn(
                'px-4 py-2 rounded-lg font-medium transition-colors',
                activeView === 'summary'
                  ? 'bg-primary-500 text-white'
                  : 'bg-factory-gray text-neutral-400 hover:text-white'
              )}
            >
              Summary View
            </button>
          </div>

          {/* Filters */}
          {activeView === 'list' && (
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                <Input
                  type="text"
                  placeholder="Search roll number..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPagination((prev) => ({ ...prev, page: 1 }));
                  }}
                  className="pl-10 w-64"
                />
              </div>

              <select
                value={colorFilter}
                onChange={(e) => {
                  setColorFilter(e.target.value ? parseInt(e.target.value) : '');
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                className="px-4 py-2 rounded-lg bg-factory-gray border border-factory-border text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">All Colors</option>
                {stats?.byColor.map((color) => (
                  <option key={color.colorId} value={color.colorId}>
                    {color.colorName} ({color.rollCount})
                  </option>
                ))}
              </select>

              <select
                value={fabricFilter}
                onChange={(e) => {
                  setFabricFilter(e.target.value);
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                className="px-4 py-2 rounded-lg bg-factory-gray border border-factory-border text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">All Fabrics</option>
                {stats?.byFabric.map((fabric) => (
                  <option key={fabric.fabricType} value={fabric.fabricType}>
                    {fabric.fabricType} ({fabric.rollCount})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Bulk Actions */}
      {activeView === 'list' && selectedRollIds.size > 0 && (
        <div className="bg-primary-500/10 border border-primary-500/30 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-primary-400 font-medium">
              {selectedRollIds.size} roll{selectedRollIds.size > 1 ? 's' : ''} selected
            </span>
            <button onClick={clearSelection} className="text-neutral-400 hover:text-white text-sm">
              Clear selection
            </button>
          </div>
          <Button onClick={handleBulkMoveToFinished} disabled={isMoving}>
            {isMoving ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Moving...
              </>
            ) : (
              <>
                <ArrowRight className="w-4 h-4 mr-2" />
                Move to Finished Stock
              </>
            )}
          </Button>
        </div>
      )}

      {/* List View */}
      {activeView === 'list' && (
        <div className="bg-factory-dark rounded-2xl border border-factory-border overflow-hidden">
          {rolls.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-12 h-12 text-neutral-600 mx-auto mb-3" />
              <p className="text-neutral-400">No dyed fabric in stock</p>
              <p className="text-neutral-500 text-sm mt-1">
                Receive rolls from dyeing to see them here
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-factory-border bg-factory-gray/30">
                      <th className="px-4 py-3 text-left">
                        <input
                          type="checkbox"
                          checked={selectedRollIds.size === rolls.length && rolls.length > 0}
                          onChange={() => {
                            if (selectedRollIds.size === rolls.length) {
                              clearSelection();
                            } else {
                              selectAllVisible();
                            }
                          }}
                          className="rounded border-factory-border bg-factory-gray"
                        />
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider">
                        Roll Number
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider">
                        Fabric
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider">
                        Color
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider">
                        Weight
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider">
                        Grade
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider">
                        Dyeing Order
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-neutral-400 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-factory-border">
                    {rolls.map((roll) => (
                      <tr
                        key={roll.id}
                        className={cn(
                          'hover:bg-factory-gray/20 transition-colors',
                          selectedRollIds.has(roll.id) && 'bg-primary-500/5'
                        )}
                      >
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedRollIds.has(roll.id)}
                            onChange={() => toggleRollSelection(roll.id)}
                            className="rounded border-factory-border bg-factory-gray"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <QrCode className="w-4 h-4 text-neutral-500" />
                            <span className="text-white font-mono text-sm">{roll.rollNumber}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-neutral-300">{roll.fabricType}</span>
                          {roll.fabric && (
                            <span className="text-xs text-neutral-500 ml-2">({roll.fabric.code})</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {roll.color ? (
                            <div className="flex items-center gap-2">
                              <div
                                className="w-4 h-4 rounded-full border border-white/20"
                                style={{ backgroundColor: roll.color.hexCode || '#6b7280' }}
                              />
                              <span className="text-neutral-300">{roll.color.name}</span>
                            </div>
                          ) : (
                            <span className="text-neutral-500">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <span className="text-primary-400 font-medium">
                              {roll.finishedWeight?.toFixed(2) || '-'} kg
                            </span>
                            <span className="text-xs text-neutral-500 ml-1">
                              (grey: {roll.greyWeight.toFixed(2)})
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              'px-2 py-1 rounded text-xs font-medium',
                              roll.grade === 'A'
                                ? 'bg-success/20 text-success'
                                : roll.grade === 'B'
                                  ? 'bg-warning/20 text-warning'
                                  : 'bg-error/20 text-error'
                            )}
                          >
                            {roll.grade}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {roll.dyeingOrder ? (
                            <Link
                              href={`/dyeing/orders/${roll.dyeingOrder.id}`}
                              className="text-primary-400 hover:text-primary-300 text-sm"
                            >
                              {roll.dyeingOrder.orderNumber}
                            </Link>
                          ) : (
                            <span className="text-neutral-500">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMoveToFinished(roll.id)}
                            disabled={isMoving}
                          >
                            <ArrowRight className="w-4 h-4 mr-1" />
                            Move to Finished
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="px-4 py-3 border-t border-factory-border flex items-center justify-between">
                <div className="text-sm text-neutral-400">
                  Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}{' '}
                  rolls
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={pagination.page === 1}
                    onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-neutral-400 text-sm">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={pagination.page === pagination.totalPages}
                    onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Summary View */}
      {activeView === 'summary' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {summary.length === 0 ? (
            <div className="col-span-2 bg-factory-dark rounded-2xl border border-factory-border p-12 text-center">
              <Package className="w-12 h-12 text-neutral-600 mx-auto mb-3" />
              <p className="text-neutral-400">No dyed fabric in stock</p>
            </div>
          ) : (
            summary.map((fabric) => (
              <div
                key={fabric.fabricType}
                className="bg-factory-dark rounded-2xl border border-factory-border p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">{fabric.fabricType}</h3>
                  <div className="text-right">
                    <p className="text-primary-400 font-medium">{fabric.totalRolls} rolls</p>
                    <p className="text-sm text-neutral-400">{fabric.totalWeight.toFixed(1)} kg</p>
                  </div>
                </div>

                {fabric.colors.length > 0 ? (
                  <div className="space-y-2">
                    {fabric.colors.map((color) => (
                      <div
                        key={color.colorId}
                        className="flex items-center justify-between p-3 bg-factory-gray/30 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-6 h-6 rounded-full border border-white/20"
                            style={{ backgroundColor: color.hexCode || '#6b7280' }}
                          />
                          <div>
                            <p className="text-white font-medium">{color.colorName}</p>
                            <p className="text-xs text-neutral-500">{color.colorCode}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-white">{color.rollCount} rolls</p>
                          <p className="text-xs text-neutral-400">{color.totalWeight.toFixed(1)} kg</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-neutral-500 text-sm">No color information available</p>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
