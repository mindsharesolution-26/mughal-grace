'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/atoms/Button';
import { StatsCard } from '@/components/molecules/StatsCard';
import { useToast } from '@/contexts/ToastContext';
import { rollsApi } from '@/lib/api/rolls';
import { dyedFabricStockApi } from '@/lib/api/dyeing';
import { GreyStockSummary, RollStatsOverview } from '@/lib/types/roll';
import { DyedFabricStockStats, DyedFabricStockSummary } from '@/lib/types/dyeing';
import { Package, Palette, ArrowRight, Scale, Layers, Droplets, Factory } from 'lucide-react';

export default function FabricStockOverviewPage() {
  const { showToast } = useToast();

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [greyStock, setGreyStock] = useState<GreyStockSummary | null>(null);
  const [rollStats, setRollStats] = useState<RollStatsOverview | null>(null);
  const [dyedStats, setDyedStats] = useState<DyedFabricStockStats | null>(null);
  const [dyedSummary, setDyedSummary] = useState<DyedFabricStockSummary[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [greyData, statsData, dyedStatsData, dyedSummaryData] = await Promise.all([
        rollsApi.getGreyStockSummary(),
        rollsApi.getStatsOverview(),
        dyedFabricStockApi.getStats(),
        dyedFabricStockApi.getSummary(),
      ]);
      setGreyStock(greyData);
      setRollStats(statsData);
      setDyedStats(dyedStatsData);
      setDyedSummary(dyedSummaryData);
    } catch (error: any) {
      showToast('error', error.response?.data?.error || 'Failed to load stock data');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
        <span className="ml-3 text-neutral-400">Loading stock data...</span>
      </div>
    );
  }

  const totalRawWeight = Number(greyStock?.totalWeight || 0);
  const totalDyedWeight = Number(dyedStats?.totalWeight || 0);
  const totalRawRolls = greyStock?.totalRolls || 0;
  const totalDyedRolls = dyedStats?.totalRolls || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Fabric Stock Overview</h1>
          <p className="text-neutral-400 mt-1">
            View raw fabric and dyed fabric inventory at a glance
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/production/daily">
            <Button variant="secondary">
              <Factory className="w-4 h-4 mr-2" />
              Production
            </Button>
          </Link>
          <Link href="/dyeing">
            <Button>
              <Droplets className="w-4 h-4 mr-2" />
              Dyeing
            </Button>
          </Link>
        </div>
      </div>

      {/* Total Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Raw Fabric"
          value={`${totalRawRolls} rolls`}
          change={`${totalRawWeight.toFixed(2)} kg`}
          changeType="neutral"
          icon="🧵"
        />
        <StatsCard
          title="Total Dyed Fabric"
          value={`${totalDyedRolls} rolls`}
          change={`${totalDyedWeight.toFixed(2)} kg`}
          changeType="neutral"
          icon="🎨"
        />
        <StatsCard
          title="Total Inventory"
          value={`${totalRawRolls + totalDyedRolls} rolls`}
          change={`${(totalRawWeight + totalDyedWeight).toFixed(2)} kg`}
          changeType="neutral"
          icon="📦"
        />
        <StatsCard
          title="Today's Production"
          value={`${rollStats?.today.rollsProduced || 0} rolls`}
          change={`${Number(rollStats?.today.weightProduced || 0).toFixed(2)} kg`}
          changeType="neutral"
          icon="🏭"
        />
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Raw Fabric Section */}
        <div className="bg-factory-dark rounded-2xl border border-factory-border overflow-hidden">
          <div className="p-6 border-b border-factory-border bg-amber-500/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center">
                  <Package className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Raw Fabric (Grey Stock)</h2>
                  <p className="text-sm text-neutral-400">Unprocessed fabric from production</p>
                </div>
              </div>
              <Link href="/production/daily">
                <Button variant="ghost" size="sm">
                  View All <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Raw Stock Stats */}
          <div className="p-6 grid grid-cols-2 gap-4 border-b border-factory-border">
            <div className="bg-factory-gray rounded-xl p-4 text-center">
              <Scale className="w-5 h-5 text-amber-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">{totalRawWeight.toFixed(2)}</p>
              <p className="text-sm text-neutral-400">Total Weight (kg)</p>
            </div>
            <div className="bg-factory-gray rounded-xl p-4 text-center">
              <Layers className="w-5 h-5 text-amber-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">{totalRawRolls}</p>
              <p className="text-sm text-neutral-400">Total Rolls</p>
            </div>
          </div>

          {/* Raw Stock by Machine */}
          <div className="p-6">
            <h3 className="text-sm font-medium text-neutral-400 mb-4">By Machine</h3>
            {greyStock?.byMachine && greyStock.byMachine.length > 0 ? (
              <div className="space-y-3">
                {greyStock.byMachine.slice(0, 5).map((item: any) => (
                  <div
                    key={item.machineId}
                    className="flex items-center justify-between p-3 bg-factory-gray rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-amber-500/10 rounded-lg flex items-center justify-center">
                        <Factory className="w-4 h-4 text-amber-400" />
                      </div>
                      <span className="text-white">Machine #{item.machineId}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-medium">{item._count?.id || 0} rolls</p>
                      <p className="text-xs text-neutral-500">{Number(item._sum?.greyWeight || 0).toFixed(2)} kg</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-neutral-500">
                <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No raw fabric in stock</p>
              </div>
            )}

            {/* Recent Raw Rolls */}
            {greyStock?.recentRolls && greyStock.recentRolls.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-medium text-neutral-400 mb-4">Recent Rolls</h3>
                <div className="space-y-2">
                  {greyStock.recentRolls.slice(0, 3).map((roll) => (
                    <div
                      key={roll.id}
                      className="flex items-center justify-between p-3 bg-factory-gray rounded-lg"
                    >
                      <div>
                        <p className="font-mono text-primary-400 text-sm">{roll.rollNumber}</p>
                        <p className="text-xs text-neutral-500">{roll.fabricType}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-white font-medium">{Number(roll.greyWeight).toFixed(2)} kg</p>
                        <p className="text-xs text-neutral-500">{roll.machine?.machineNumber}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Dyed Fabric Section */}
        <div className="bg-factory-dark rounded-2xl border border-factory-border overflow-hidden">
          <div className="p-6 border-b border-factory-border bg-primary-500/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-500/20 rounded-xl flex items-center justify-center">
                  <Palette className="w-5 h-5 text-primary-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Dyed Fabric</h2>
                  <p className="text-sm text-neutral-400">Fabric received from dyeing vendors</p>
                </div>
              </div>
              <Link href="/dyeing/stock">
                <Button variant="ghost" size="sm">
                  View All <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Dyed Stock Stats */}
          <div className="p-6 grid grid-cols-2 gap-4 border-b border-factory-border">
            <div className="bg-factory-gray rounded-xl p-4 text-center">
              <Scale className="w-5 h-5 text-primary-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">{totalDyedWeight.toFixed(2)}</p>
              <p className="text-sm text-neutral-400">Total Weight (kg)</p>
            </div>
            <div className="bg-factory-gray rounded-xl p-4 text-center">
              <Palette className="w-5 h-5 text-primary-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">{dyedStats?.byColor?.length || 0}</p>
              <p className="text-sm text-neutral-400">Unique Colors</p>
            </div>
          </div>

          {/* Dyed Stock by Fabric/Color */}
          <div className="p-6">
            <h3 className="text-sm font-medium text-neutral-400 mb-4">By Fabric & Color</h3>
            {dyedSummary && dyedSummary.length > 0 ? (
              <div className="space-y-3">
                {dyedSummary.slice(0, 5).map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-factory-gray rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-lg border border-factory-border"
                        style={{ backgroundColor: item.colors?.[0]?.hexCode || '#6366f1' }}
                      />
                      <div>
                        <p className="text-white">{item.fabricType}</p>
                        <p className="text-xs text-neutral-500">{item.colors?.length || 0} colors</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-medium">{item.totalRolls} rolls</p>
                      <p className="text-xs text-neutral-500">{Number(item.totalWeight).toFixed(2)} kg</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-neutral-500">
                <Palette className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No dyed fabric in stock</p>
              </div>
            )}

            {/* Quick Links */}
            <div className="mt-6 grid grid-cols-2 gap-3">
              <Link href="/dyeing/send">
                <div className="p-4 bg-factory-gray rounded-xl hover:bg-factory-gray/80 transition-colors cursor-pointer">
                  <Droplets className="w-5 h-5 text-primary-400 mb-2" />
                  <p className="text-sm text-white font-medium">Send for Dyeing</p>
                  <p className="text-xs text-neutral-500">Send raw fabric to vendor</p>
                </div>
              </Link>
              <Link href="/dyeing/receive">
                <div className="p-4 bg-factory-gray rounded-xl hover:bg-factory-gray/80 transition-colors cursor-pointer">
                  <Package className="w-5 h-5 text-success mb-2" />
                  <p className="text-sm text-white font-medium">Receive from Dyeing</p>
                  <p className="text-xs text-neutral-500">Receive dyed fabric back</p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Stock Flow Visualization */}
      <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Stock Flow</h2>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <div className="flex items-center gap-3 bg-factory-gray rounded-xl p-4">
            <div className="w-10 h-10 bg-amber-500/20 rounded-full flex items-center justify-center">
              <Factory className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-white font-medium">Production</p>
              <p className="text-xs text-neutral-500">Creates rolls</p>
            </div>
          </div>
          <ArrowRight className="w-6 h-6 text-neutral-500 hidden sm:block" />
          <div className="flex items-center gap-3 bg-factory-gray rounded-xl p-4">
            <div className="w-10 h-10 bg-amber-500/20 rounded-full flex items-center justify-center">
              <Package className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-white font-medium">Grey Stock</p>
              <p className="text-xs text-neutral-500">{totalRawRolls} rolls</p>
            </div>
          </div>
          <ArrowRight className="w-6 h-6 text-neutral-500 hidden sm:block" />
          <div className="flex items-center gap-3 bg-factory-gray rounded-xl p-4">
            <div className="w-10 h-10 bg-primary-500/20 rounded-full flex items-center justify-center">
              <Droplets className="w-5 h-5 text-primary-400" />
            </div>
            <div>
              <p className="text-white font-medium">Dyeing</p>
              <p className="text-xs text-neutral-500">Processing</p>
            </div>
          </div>
          <ArrowRight className="w-6 h-6 text-neutral-500 hidden sm:block" />
          <div className="flex items-center gap-3 bg-factory-gray rounded-xl p-4">
            <div className="w-10 h-10 bg-primary-500/20 rounded-full flex items-center justify-center">
              <Palette className="w-5 h-5 text-primary-400" />
            </div>
            <div>
              <p className="text-white font-medium">Dyed Stock</p>
              <p className="text-xs text-neutral-500">{totalDyedRolls} rolls</p>
            </div>
          </div>
          <ArrowRight className="w-6 h-6 text-neutral-500 hidden sm:block" />
          <Link href="/finished-stock" className="flex items-center gap-3 bg-factory-gray rounded-xl p-4 hover:bg-factory-gray/80 transition-colors">
            <div className="w-10 h-10 bg-success/20 rounded-full flex items-center justify-center">
              <Package className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-white font-medium">Finished</p>
              <p className="text-xs text-neutral-500">{rollStats?.finishedStockCount || 0} rolls</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Quick Access Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link href="/dyeing/stock" className="bg-factory-dark rounded-2xl border border-factory-border p-6 hover:border-primary-500/50 transition-colors">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary-500/20 rounded-xl flex items-center justify-center">
              <Palette className="w-6 h-6 text-primary-400" />
            </div>
            <div>
              <p className="text-white font-semibold">Dyed Stock</p>
              <p className="text-sm text-neutral-400">{totalDyedRolls} rolls awaiting</p>
            </div>
          </div>
        </Link>
        <Link href="/finished-stock" className="bg-factory-dark rounded-2xl border border-factory-border p-6 hover:border-success/50 transition-colors">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-success/20 rounded-xl flex items-center justify-center">
              <Package className="w-6 h-6 text-success" />
            </div>
            <div>
              <p className="text-white font-semibold">Finished Stock</p>
              <p className="text-sm text-neutral-400">{rollStats?.finishedStockCount || 0} rolls ready</p>
            </div>
          </div>
        </Link>
        <Link href="/production/daily" className="bg-factory-dark rounded-2xl border border-factory-border p-6 hover:border-amber-500/50 transition-colors">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center">
              <Factory className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <p className="text-white font-semibold">Add Production</p>
              <p className="text-sm text-neutral-400">Record new rolls</p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
