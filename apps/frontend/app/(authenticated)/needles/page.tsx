'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/atoms/Button';
import { useToast } from '@/contexts/ToastContext';
import { needlesApi } from '@/lib/api/needles';
import {
  NeedleDashboard,
  movementTypeLabels,
  movementTypeColors,
  damageTypeLabels,
  damageTypeColors,
  resolutionStatusLabels,
  resolutionStatusColors,
} from '@/lib/types/needle';

export default function NeedlesDashboardPage() {
  const { showToast } = useToast();
  const [dashboard, setDashboard] = useState<NeedleDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      setIsLoading(true);
      const data = await needlesApi.reports.getDashboard();
      setDashboard(data);
    } catch (error: any) {
      showToast('error', error.response?.data?.error || 'Failed to load dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
        <span className="ml-3 text-neutral-400">Loading dashboard...</span>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="text-center py-12">
        <p className="text-neutral-400">Failed to load dashboard data</p>
        <Button className="mt-4" onClick={fetchDashboard}>
          Retry
        </Button>
      </div>
    );
  }

  const { stats, recentMovements, recentDamages } = dashboard;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Needle Management</h1>
          <p className="text-neutral-400 mt-1">
            Track needle inventory, machine allocations, and damage reports
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/needles/stock/receive">
            <Button variant="secondary">Receive Stock</Button>
          </Link>
          <Link href="/needles/damages/report">
            <Button>Report Damage</Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-4">
          <p className="text-sm text-neutral-400">Needle Types</p>
          <p className="text-2xl font-semibold text-white mt-1">{stats.totalTypes}</p>
        </div>
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-4">
          <p className="text-sm text-neutral-400">Total Stock</p>
          <p className="text-2xl font-semibold text-white mt-1">
            {stats.totalStock.toLocaleString()}
          </p>
        </div>
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-4">
          <p className="text-sm text-neutral-400">Allocated</p>
          <p className="text-2xl font-semibold text-blue-400 mt-1">
            {stats.allocated.toLocaleString()}
          </p>
        </div>
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-4">
          <p className="text-sm text-neutral-400">Damaged</p>
          <p className="text-2xl font-semibold text-error mt-1">
            {stats.damaged.toLocaleString()}
          </p>
        </div>
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-4">
          <p className="text-sm text-neutral-400">Low Stock Alerts</p>
          <p className={`text-2xl font-semibold mt-1 ${stats.lowStockAlerts > 0 ? 'text-warning' : 'text-success'}`}>
            {stats.lowStockAlerts}
          </p>
        </div>
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-4">
          <p className="text-sm text-neutral-400">Pending Damages</p>
          <p className={`text-2xl font-semibold mt-1 ${stats.pendingDamages > 0 ? 'text-warning' : 'text-success'}`}>
            {stats.pendingDamages}
          </p>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link
          href="/needles/types"
          className="bg-factory-dark rounded-2xl border border-factory-border p-4 hover:border-primary-500 transition-colors"
        >
          <span className="text-2xl">📋</span>
          <p className="text-white font-medium mt-2">Needle Types</p>
          <p className="text-sm text-neutral-400">Manage master data</p>
        </Link>
        <Link
          href="/needles/stock"
          className="bg-factory-dark rounded-2xl border border-factory-border p-4 hover:border-primary-500 transition-colors"
        >
          <span className="text-2xl">📦</span>
          <p className="text-white font-medium mt-2">Stock Management</p>
          <p className="text-sm text-neutral-400">View inventory levels</p>
        </Link>
        <Link
          href="/needles/machines"
          className="bg-factory-dark rounded-2xl border border-factory-border p-4 hover:border-primary-500 transition-colors"
        >
          <span className="text-2xl">🏭</span>
          <p className="text-white font-medium mt-2">Machine Needles</p>
          <p className="text-sm text-neutral-400">Track installations</p>
        </Link>
        <Link
          href="/needles/damages"
          className="bg-factory-dark rounded-2xl border border-factory-border p-4 hover:border-primary-500 transition-colors"
        >
          <span className="text-2xl">⚠️</span>
          <p className="text-white font-medium mt-2">Damage Reports</p>
          <p className="text-sm text-neutral-400">Track breakages</p>
        </Link>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Movements */}
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Recent Stock Movements</h2>
            <Link href="/needles/stock" className="text-sm text-primary-400 hover:underline">
              View all
            </Link>
          </div>
          {recentMovements.length === 0 ? (
            <p className="text-neutral-400 text-sm">No recent movements</p>
          ) : (
            <div className="space-y-3">
              {recentMovements.slice(0, 5).map((movement) => (
                <div
                  key={movement.id}
                  className="flex items-center justify-between py-2 border-b border-factory-border last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${
                        movementTypeColors[movement.movementType]?.bg || 'bg-neutral-500/20'
                      } ${movementTypeColors[movement.movementType]?.text || 'text-neutral-400'}`}
                    >
                      {movementTypeLabels[movement.movementType] || movement.movementType}
                    </span>
                    <div>
                      <p className="text-sm text-white">
                        {movement.batch?.needleType?.name || 'Unknown'}
                      </p>
                      <p className="text-xs text-neutral-400">
                        {movement.batch?.batchNumber}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-medium ${movement.quantity > 0 ? 'text-success' : 'text-error'}`}>
                      {movement.quantity > 0 ? '+' : ''}{movement.quantity}
                    </p>
                    <p className="text-xs text-neutral-400">
                      {new Date(movement.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Damages */}
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Recent Damage Reports</h2>
            <Link href="/needles/damages" className="text-sm text-primary-400 hover:underline">
              View all
            </Link>
          </div>
          {recentDamages.length === 0 ? (
            <p className="text-neutral-400 text-sm">No recent damages</p>
          ) : (
            <div className="space-y-3">
              {recentDamages.map((damage) => (
                <div
                  key={damage.id}
                  className="flex items-center justify-between py-2 border-b border-factory-border last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${
                        damageTypeColors[damage.damageType]?.bg || 'bg-neutral-500/20'
                      } ${damageTypeColors[damage.damageType]?.text || 'text-neutral-400'}`}
                    >
                      {damageTypeLabels[damage.damageType] || damage.damageType}
                    </span>
                    <div>
                      <p className="text-sm text-white">
                        {damage.needleType?.name || 'Unknown'}
                      </p>
                      <p className="text-xs text-neutral-400">
                        {damage.damagedQuantity} needles
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${
                        resolutionStatusColors[damage.resolutionStatus]?.bg || 'bg-neutral-500/20'
                      } ${resolutionStatusColors[damage.resolutionStatus]?.text || 'text-neutral-400'}`}
                    >
                      {resolutionStatusLabels[damage.resolutionStatus] || damage.resolutionStatus}
                    </span>
                    <p className="text-xs text-neutral-400 mt-1">
                      {new Date(damage.damageDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
