'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/atoms/Button';
import { StatsCard } from '@/components/molecules/StatsCard';
import { useToast } from '@/contexts/ToastContext';
import { stockAlertsApi } from '@/lib/api/inventory';
import {
  StockAlert,
  AlertStatus,
  StockAlertType,
  alertTypeOptions,
  alertStatusOptions,
  formatQuantity,
} from '@/lib/types/inventory';

export default function StockAlertsPage() {
  const { showToast } = useToast();
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<AlertStatus | 'ALL'>('ALL');
  const [typeFilter, setTypeFilter] = useState<StockAlertType | 'ALL'>('ALL');

  useEffect(() => {
    fetchAlerts();
  }, [statusFilter, typeFilter]);

  const fetchAlerts = async () => {
    try {
      setIsLoading(true);
      const data = await stockAlertsApi.getAll({
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        alertType: typeFilter !== 'ALL' ? typeFilter : undefined,
      });
      setAlerts(data);
    } catch (error: any) {
      showToast('error', 'Failed to load alerts');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcknowledge = async (alert: StockAlert) => {
    try {
      await stockAlertsApi.acknowledge(alert.id);
      showToast('success', 'Alert acknowledged');
      fetchAlerts();
    } catch (error: any) {
      showToast('error', 'Failed to acknowledge alert');
    }
  };

  const handleResolve = async (alert: StockAlert) => {
    try {
      await stockAlertsApi.resolve(alert.id);
      showToast('success', 'Alert resolved');
      fetchAlerts();
    } catch (error: any) {
      showToast('error', 'Failed to resolve alert');
    }
  };

  const handleIgnore = async (alert: StockAlert) => {
    if (!confirm('Are you sure you want to ignore this alert?')) return;
    try {
      await stockAlertsApi.ignore(alert.id);
      showToast('success', 'Alert ignored');
      fetchAlerts();
    } catch (error: any) {
      showToast('error', 'Failed to ignore alert');
    }
  };

  // Calculate stats
  const stats = useMemo(() => {
    const active = alerts.filter((a) => a.status === 'ACTIVE').length;
    const acknowledged = alerts.filter((a) => a.status === 'ACKNOWLEDGED').length;
    const outOfStock = alerts.filter((a) => a.alertType === 'OUT_OF_STOCK' && a.status === 'ACTIVE').length;
    const lowStock = alerts.filter((a) => a.alertType === 'LOW_STOCK' && a.status === 'ACTIVE').length;
    const expiring = alerts.filter((a) => a.alertType === 'EXPIRY_WARNING' && a.status === 'ACTIVE').length;
    return { active, acknowledged, outOfStock, lowStock, expiring };
  }, [alerts]);

  const getAlertIcon = (type: StockAlertType) => {
    switch (type) {
      case 'OUT_OF_STOCK':
        return '🚫';
      case 'LOW_STOCK':
        return '⚠️';
      case 'REORDER_POINT':
        return '🛒';
      case 'OVERSTOCK':
        return '📦';
      case 'EXPIRY_WARNING':
        return '⏰';
      default:
        return '⚠️';
    }
  };

  const getAlertColor = (type: StockAlertType) => {
    switch (type) {
      case 'OUT_OF_STOCK':
        return 'text-error bg-error/20 border-error/30';
      case 'LOW_STOCK':
        return 'text-warning bg-warning/20 border-warning/30';
      case 'REORDER_POINT':
        return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
      case 'OVERSTOCK':
        return 'text-blue-400 bg-blue-500/20 border-blue-500/30';
      case 'EXPIRY_WARNING':
        return 'text-purple-400 bg-purple-500/20 border-purple-500/30';
      default:
        return 'text-neutral-400 bg-factory-gray border-factory-border';
    }
  };

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
          <h1 className="text-2xl font-semibold text-white">Stock Alerts</h1>
          <p className="text-neutral-400 mt-1">
            Monitor low stock, out of stock, and expiry warnings
          </p>
        </div>
        <Link href="/inventory/transactions?action=receipt">
          <Button>+ Stock Receipt</Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatsCard
          title="Active Alerts"
          value={stats.active}
          changeType={stats.active > 0 ? 'negative' : 'positive'}
          icon="🔔"
        />
        <StatsCard
          title="Acknowledged"
          value={stats.acknowledged}
          icon="👁️"
        />
        <StatsCard
          title="Out of Stock"
          value={stats.outOfStock}
          changeType={stats.outOfStock > 0 ? 'negative' : 'positive'}
          icon="🚫"
        />
        <StatsCard
          title="Low Stock"
          value={stats.lowStock}
          changeType={stats.lowStock > 0 ? 'negative' : 'positive'}
          icon="⚠️"
        />
        <StatsCard
          title="Expiring"
          value={stats.expiring}
          changeType={stats.expiring > 0 ? 'negative' : 'positive'}
          icon="⏰"
        />
      </div>

      {/* Filters */}
      <div className="bg-factory-dark rounded-2xl border border-factory-border p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as AlertStatus | 'ALL')}
              className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="ALL">All Statuses</option>
              {alertStatusOptions.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as StockAlertType | 'ALL')}
              className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="ALL">All Alert Types</option>
              {alertTypeOptions.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Alerts List */}
      <div className="space-y-3">
        {alerts.map((alert) => {
          const typeOption = alertTypeOptions.find((t) => t.value === alert.alertType);
          const statusOption = alertStatusOptions.find((s) => s.value === alert.status);
          const colorClass = getAlertColor(alert.alertType);

          return (
            <div
              key={alert.id}
              className={`bg-factory-dark rounded-2xl border p-4 ${
                alert.status === 'ACTIVE'
                  ? colorClass
                  : 'border-factory-border'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <span className="text-2xl">{getAlertIcon(alert.alertType)}</span>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-white font-semibold">{alert.item?.name || 'Unknown Item'}</h3>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          alert.status === 'ACTIVE'
                            ? 'bg-error/20 text-error'
                            : alert.status === 'ACKNOWLEDGED'
                            ? 'bg-warning/20 text-warning'
                            : 'bg-factory-gray text-neutral-400'
                        }`}
                      >
                        {statusOption?.label}
                      </span>
                    </div>
                    <p className="text-sm text-neutral-400 mb-2">
                      {typeOption?.label} • Code: {alert.item?.code}
                    </p>
                    <div className="flex items-center gap-6 text-sm">
                      <div>
                        <span className="text-neutral-500">Current Level:</span>{' '}
                        <span className={alert.status === 'ACTIVE' ? 'text-error font-medium' : 'text-white'}>
                          {formatQuantity(alert.currentLevel)} {alert.item?.primaryUnit?.code}
                        </span>
                      </div>
                      <div>
                        <span className="text-neutral-500">Threshold:</span>{' '}
                        <span className="text-white">
                          {formatQuantity(alert.thresholdLevel)} {alert.item?.primaryUnit?.code}
                        </span>
                      </div>
                      {alert.item?.minStockLevel && (
                        <div>
                          <span className="text-neutral-500">Min Stock:</span>{' '}
                          <span className="text-white">{formatQuantity(alert.item.minStockLevel)}</span>
                        </div>
                      )}
                    </div>
                    {alert.acknowledgedAt && (
                      <p className="text-xs text-neutral-500 mt-2">
                        Acknowledged: {new Date(alert.acknowledgedAt).toLocaleString()}
                      </p>
                    )}
                    {alert.resolvedAt && (
                      <p className="text-xs text-neutral-500 mt-1">
                        Resolved: {new Date(alert.resolvedAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Link href={`/inventory/items/${alert.itemId}`}>
                    <Button variant="ghost" size="sm">View Item</Button>
                  </Link>
                  {alert.status === 'ACTIVE' && (
                    <>
                      <Button variant="secondary" size="sm" onClick={() => handleAcknowledge(alert)}>
                        Acknowledge
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleIgnore(alert)}>
                        Ignore
                      </Button>
                    </>
                  )}
                  {alert.status === 'ACKNOWLEDGED' && (
                    <Button variant="secondary" size="sm" onClick={() => handleResolve(alert)}>
                      Mark Resolved
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {alerts.length === 0 && (
        <div className="text-center py-12 bg-factory-dark rounded-2xl border border-factory-border">
          <span className="text-4xl mb-4 block">✅</span>
          <p className="text-neutral-400">
            {statusFilter === 'ALL' && typeFilter === 'ALL'
              ? 'No alerts at this time'
              : 'No alerts match your filters'}
          </p>
        </div>
      )}
    </div>
  );
}
