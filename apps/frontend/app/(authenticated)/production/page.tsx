'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/atoms/Button';
import { useToast } from '@/contexts/ToastContext';
import { productsApi } from '@/lib/api/products';
import {
  Factory,
  TrendingUp,
  Clock,
  ScrollText,
  Loader2,
  RefreshCw,
} from 'lucide-react';

interface ProductionLog {
  id: number;
  rollNumber: string | null;
  weight: number;
  machine: string | null;
  product: {
    id: number;
    name: string;
    articleNumber: string | null;
    qrCode: string;
  };
  createdAt: string;
}

interface ProductionSummary {
  totalWeight: number;
  totalRolls: number;
  byProduct: Array<{
    id: number;
    name: string;
    articleNumber: string | null;
    weight: number;
    rolls: number;
  }>;
}

export default function ProductionPage() {
  const { showToast } = useToast();

  // Production logs data
  const [logs, setLogs] = useState<ProductionLog[]>([]);
  const [summary, setSummary] = useState<ProductionSummary | null>(null);
  const [isLoadingLogs, setIsLoadingLogs] = useState(true);

  // Stats from mock data (keeping original overview stats)
  const stats = {
    running: 38,
    idle: 4,
    maintenance: 5,
    down: 3,
  };
  const totalProduction = summary?.totalWeight || 0;
  const totalRolls = summary?.totalRolls || 0;

  // Load production logs
  const loadProductionLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const data = await productsApi.getProductionLogs();
      setLogs(data.logs);
      setSummary(data.summary);
    } catch (error) {
      console.error('Failed to load production logs:', error);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  // Load logs on mount
  useEffect(() => {
    loadProductionLogs();
  }, []);

  // Format time
  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-white">Production</h1>
          <p className="text-neutral-400 mt-1">Monitor machines and production</p>
        </div>
      </div>

      {/* Main Layout */}
      <div className="space-y-6 overflow-y-auto pr-2">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 rounded-2xl border border-emerald-500/20 p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <p className="text-sm text-emerald-400">Today's Total</p>
            </div>
            <p className="text-3xl font-bold text-white">{totalProduction}</p>
            <p className="text-sm text-neutral-400">kg produced</p>
          </div>
          <div className="bg-factory-dark rounded-2xl border border-factory-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <ScrollText className="w-4 h-4 text-primary-400" />
              <p className="text-sm text-neutral-400">Rolls</p>
            </div>
            <p className="text-3xl font-bold text-white">{totalRolls}</p>
            <p className="text-sm text-neutral-400">completed</p>
          </div>
          <div className="bg-factory-dark rounded-2xl border border-factory-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <Factory className="w-4 h-4 text-success" />
              <p className="text-sm text-neutral-400">Running</p>
            </div>
            <p className="text-3xl font-bold text-success">{stats.running}</p>
            <p className="text-sm text-neutral-400">machines</p>
          </div>
          <div className="bg-factory-dark rounded-2xl border border-factory-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-warning" />
              <p className="text-sm text-neutral-400">Idle/Down</p>
            </div>
            <p className="text-3xl font-bold text-warning">{stats.idle + stats.down}</p>
            <p className="text-sm text-neutral-400">machines</p>
          </div>
        </div>

        {/* Daily Production */}
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-white">Today's Production</h2>
              <p className="text-sm text-neutral-400">Daily production log</p>
            </div>
            <Button variant="ghost" size="sm" onClick={loadProductionLogs} disabled={isLoadingLogs}>
              <RefreshCw className={`w-4 h-4 mr-1 ${isLoadingLogs ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {isLoadingLogs ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12">
              <ScrollText className="w-12 h-12 mx-auto mb-3 text-neutral-600" />
              <p className="text-neutral-400">No production recorded today</p>
              <p className="text-sm text-neutral-500">Log a roll to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm text-neutral-400 border-b border-factory-border">
                    <th className="pb-3 font-medium">Time</th>
                    <th className="pb-3 font-medium">Product</th>
                    <th className="pb-3 font-medium">Machine</th>
                    <th className="pb-3 font-medium text-right">Weight</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {logs.map((log) => (
                    <tr
                      key={log.id}
                      className="border-b border-factory-border/50 hover:bg-factory-gray/50 cursor-pointer"
                    >
                      <td className="py-3 text-neutral-400">
                        {formatTime(log.createdAt)}
                      </td>
                      <td className="py-3">
                        <div>
                          <p className="text-white">{log.product.name}</p>
                          <p className="text-xs text-neutral-500 font-mono">
                            {log.product.articleNumber || '-'}
                          </p>
                        </div>
                      </td>
                      <td className="py-3 text-neutral-300">
                        {log.machine ? `#${log.machine}` : '-'}
                      </td>
                      <td className="py-3 text-right">
                        <span className="text-white font-semibold">{log.weight}</span>
                        <span className="text-neutral-400 ml-1">kg</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
