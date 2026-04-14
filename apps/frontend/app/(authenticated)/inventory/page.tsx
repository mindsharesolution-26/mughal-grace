'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/atoms/Button';
import { StatsCard } from '@/components/molecules/StatsCard';
import { useToast } from '@/contexts/ToastContext';
import { stockLevelsApi, stockAlertsApi, stockTransactionsApi } from '@/lib/api/inventory';
import {
  StockLevelSummary,
  StockAlert,
  StockTransaction,
  alertTypeOptions,
  formatQuantity,
  formatCurrency,
  getTransactionDirection,
} from '@/lib/types/inventory';

export default function InventoryDashboardPage() {
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [stockSummary, setStockSummary] = useState<StockLevelSummary[]>([]);
  const [activeAlerts, setActiveAlerts] = useState<StockAlert[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<StockTransaction[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [summaryData, alertsData, transactionsData] = await Promise.all([
          stockLevelsApi.getSummary(),
          stockAlertsApi.getAll({ status: 'ACTIVE' }),
          stockTransactionsApi.getAll({ limit: 10 }),
        ]);
        setStockSummary(summaryData);
        setActiveAlerts(alertsData);
        setRecentTransactions(transactionsData.data);
      } catch (error: any) {
        showToast('error', 'Failed to load inventory data');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [showToast]);

  // Calculate totals across all warehouses
  const totals = stockSummary.reduce(
    (acc, s) => ({
      totalItems: acc.totalItems + s.itemCount,
      totalOnHand: acc.totalOnHand + parseFloat(s.totalOnHand || '0'),
      totalValue: acc.totalValue + parseFloat(s.totalValue || '0'),
    }),
    { totalItems: 0, totalOnHand: 0, totalValue: 0 }
  );

  // Group alerts by type
  const alertsByType = activeAlerts.reduce((acc, alert) => {
    acc[alert.alertType] = (acc[alert.alertType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Inventory</h1>
          <p className="text-neutral-400 mt-1">
            Stock management, warehouses, and transactions
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/inventory/transactions?action=receipt">
            <Button>+ Stock Receipt</Button>
          </Link>
          <Link href="/inventory/transactions?action=issue">
            <Button variant="secondary">Stock Issue</Button>
          </Link>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatsCard
          title="Total Items"
          value={totals.totalItems}
          icon="📦"
        />
        <StatsCard
          title="Warehouses"
          value={stockSummary.length}
          icon="🏭"
        />
        <StatsCard
          title="Total Stock"
          value={formatQuantity(totals.totalOnHand, 0)}
          icon="📊"
        />
        <StatsCard
          title="Stock Value"
          value={formatCurrency(totals.totalValue)}
          icon="💰"
        />
        <StatsCard
          title="Active Alerts"
          value={activeAlerts.length}
          changeType={activeAlerts.length > 0 ? 'negative' : 'positive'}
          change={activeAlerts.length > 0 ? 'Needs attention' : 'All clear'}
          icon="⚠️"
        />
      </div>

      {/* Alerts Section */}
      {activeAlerts.length > 0 && (
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Stock Alerts</h2>
            <Link href="/inventory/alerts">
              <Button variant="ghost" size="sm">View All</Button>
            </Link>
          </div>

          {/* Alert Type Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            {alertTypeOptions.slice(0, 4).map((alertType) => (
              <div
                key={alertType.value}
                className={`rounded-xl p-3 border ${
                  alertsByType[alertType.value]
                    ? `bg-${alertType.color}-500/10 border-${alertType.color}-500/30`
                    : 'bg-factory-gray border-factory-border'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">
                    {alertType.value === 'OUT_OF_STOCK' && '🚫'}
                    {alertType.value === 'LOW_STOCK' && '⚠️'}
                    {alertType.value === 'REORDER_POINT' && '🛒'}
                    {alertType.value === 'EXPIRY_WARNING' && '⏰'}
                  </span>
                  <div>
                    <p className="text-sm text-neutral-400">{alertType.label}</p>
                    <p className="text-white font-semibold">{alertsByType[alertType.value] || 0}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Recent Alerts List */}
          <div className="space-y-2">
            {activeAlerts.slice(0, 5).map((alert) => (
              <div
                key={alert.id}
                className="flex items-center justify-between bg-factory-gray rounded-xl px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className={`w-2 h-2 rounded-full ${
                    alert.alertType === 'OUT_OF_STOCK' ? 'bg-error' :
                    alert.alertType === 'LOW_STOCK' ? 'bg-warning' : 'bg-primary-500'
                  }`} />
                  <div>
                    <p className="text-white font-medium">{alert.item?.name || 'Unknown Item'}</p>
                    <p className="text-sm text-neutral-400">
                      {alertTypeOptions.find(a => a.value === alert.alertType)?.label} •
                      Current: {formatQuantity(alert.currentLevel)} /
                      Threshold: {formatQuantity(alert.thresholdLevel)}
                    </p>
                  </div>
                </div>
                <Link href={`/inventory/items/${alert.itemId}`}>
                  <Button variant="ghost" size="sm">View</Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stock by Warehouse */}
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Stock by Warehouse</h2>
            <Link href="/inventory/warehouses">
              <Button variant="ghost" size="sm">Manage</Button>
            </Link>
          </div>
          {stockSummary.length > 0 ? (
            <div className="space-y-3">
              {stockSummary.map((summary, index) => (
                <div
                  key={summary.warehouse?.id || index}
                  className="flex items-center justify-between bg-factory-gray rounded-xl px-4 py-3"
                >
                  <div>
                    <p className="text-white font-medium">{summary.warehouse?.name || 'Unknown'}</p>
                    <p className="text-sm text-neutral-400">{summary.itemCount} items</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-medium">{formatQuantity(summary.totalOnHand, 0)}</p>
                    <p className="text-sm text-neutral-400">{formatCurrency(summary.totalValue)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-neutral-400">
              <p>No warehouses configured</p>
              <Link href="/inventory/warehouses" className="mt-2 inline-block">
                <Button size="sm">Add Warehouse</Button>
              </Link>
            </div>
          )}
        </div>

        {/* Recent Transactions */}
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Recent Transactions</h2>
            <Link href="/inventory/transactions">
              <Button variant="ghost" size="sm">View All</Button>
            </Link>
          </div>
          {recentTransactions.length > 0 ? (
            <div className="space-y-3">
              {recentTransactions.map((txn) => {
                const direction = getTransactionDirection(txn.transactionType);
                return (
                  <div
                    key={txn.id}
                    className="flex items-center justify-between bg-factory-gray rounded-xl px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                        direction === 'IN'
                          ? 'bg-success/20 text-success'
                          : 'bg-warning/20 text-warning'
                      }`}>
                        {direction === 'IN' ? '↓' : '↑'}
                      </span>
                      <div>
                        <p className="text-white font-medium">{txn.item?.name || 'Unknown'}</p>
                        <p className="text-sm text-neutral-400">
                          {txn.transactionNumber} • {new Date(txn.transactionDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-medium ${direction === 'IN' ? 'text-success' : 'text-warning'}`}>
                        {direction === 'IN' ? '+' : '-'}{formatQuantity(txn.quantity)}
                      </p>
                      <p className="text-sm text-neutral-400">{txn.unit?.code}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-neutral-400">
              <p>No transactions yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          href="/inventory/items"
          className="bg-factory-dark rounded-xl border border-factory-border p-4 hover:bg-factory-gray transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">📦</span>
            <div>
              <p className="text-white font-medium">Stock Items</p>
              <p className="text-sm text-neutral-400">Manage inventory items</p>
            </div>
          </div>
        </Link>
        <Link
          href="/inventory/warehouses"
          className="bg-factory-dark rounded-xl border border-factory-border p-4 hover:bg-factory-gray transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏭</span>
            <div>
              <p className="text-white font-medium">Warehouses</p>
              <p className="text-sm text-neutral-400">Locations & storage</p>
            </div>
          </div>
        </Link>
        <Link
          href="/inventory/categories"
          className="bg-factory-dark rounded-xl border border-factory-border p-4 hover:bg-factory-gray transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">📁</span>
            <div>
              <p className="text-white font-medium">Categories</p>
              <p className="text-sm text-neutral-400">Organize stock items</p>
            </div>
          </div>
        </Link>
        <Link
          href="/inventory/transactions"
          className="bg-factory-dark rounded-xl border border-factory-border p-4 hover:bg-factory-gray transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">📋</span>
            <div>
              <p className="text-white font-medium">Transactions</p>
              <p className="text-sm text-neutral-400">Stock movements</p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
