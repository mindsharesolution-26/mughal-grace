'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/atoms/Button';
import { useToast } from '@/contexts/ToastContext';
import { rollsApi } from '@/lib/api/rolls';
import { machinesApi } from '@/lib/api/machines';
import {
  Factory,
  TrendingUp,
  Clock,
  ScrollText,
  Loader2,
  RefreshCw,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface ProductionLog {
  id: number;
  rollNumber: string | null;
  weight: number;
  machine: string | null;
  machineName: string | null;
  product: {
    id: number | null;
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

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const shiftDate = (iso: string, days: number) => {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function ProductionPage() {
  const { showToast } = useToast();

  const [logs, setLogs] = useState<ProductionLog[]>([]);
  const [summary, setSummary] = useState<ProductionSummary | null>(null);
  const [isLoadingLogs, setIsLoadingLogs] = useState(true);

  // Date filter state — single day; defaults to today
  const [filterDate, setFilterDate] = useState<string>(todayISO());

  const [stats, setStats] = useState({ running: 0, idle: 0, maintenance: 0, down: 0 });

  useEffect(() => {
    let cancelled = false;
    machinesApi
      .getStats()
      .then((data) => {
        if (cancelled) return;
        setStats({
          running: data.byStatus?.operational ?? 0,
          idle: data.byStatus?.idle ?? 0,
          maintenance: data.byStatus?.maintenance ?? 0,
          down: data.byStatus?.breakdown ?? 0,
        });
      })
      .catch((error) => {
        console.error('Failed to load machine stats:', error);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const totalProduction = summary?.totalWeight || 0;
  const totalRolls = summary?.totalRolls || 0;

  const loadProductionLogs = async (date: string) => {
    setIsLoadingLogs(true);
    try {
      const data = await rollsApi.getProductionLogs({ date });
      setLogs(data.logs);
      setSummary(data.summary);
    } catch (error: any) {
      console.error('Failed to load production logs:', error);
      showToast('error', error?.response?.data?.error || 'Failed to load production logs');
      setLogs([]);
      setSummary(null);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  useEffect(() => {
    loadProductionLogs(filterDate);
  }, [filterDate]);

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  const isToday = filterDate === todayISO();
  const dateLabel = useMemo(() => {
    const d = new Date(filterDate);
    return d.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
  }, [filterDate]);

  return (
    <div className="h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-white">Production</h1>
          <p className="text-neutral-400 mt-1">Monitor machines and production</p>
        </div>
      </div>

      <div className="space-y-6 overflow-y-auto pr-2">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 rounded-2xl border border-emerald-500/20 p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <p className="text-sm text-emerald-400">{isToday ? "Today's Total" : 'Day Total'}</p>
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
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
            <div>
              <h2 className="text-lg font-semibold text-white">Daily Production</h2>
              <p className="text-sm text-neutral-400">{dateLabel}</p>
            </div>

            {/* Date filter controls */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setFilterDate(shiftDate(filterDate, -1))}
                className="p-2 rounded-lg bg-factory-gray border border-factory-border text-neutral-400 hover:text-white"
                title="Previous day"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 pointer-events-none" />
                <input
                  type="date"
                  value={filterDate}
                  max={todayISO()}
                  onChange={(e) => setFilterDate(e.target.value || todayISO())}
                  className="pl-9 pr-3 py-2 rounded-lg bg-factory-gray border border-factory-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <button
                onClick={() => setFilterDate(shiftDate(filterDate, 1))}
                disabled={isToday}
                className="p-2 rounded-lg bg-factory-gray border border-factory-border text-neutral-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-neutral-400"
                title="Next day"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              {!isToday && (
                <Button variant="ghost" size="sm" onClick={() => setFilterDate(todayISO())}>
                  Today
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => loadProductionLogs(filterDate)} disabled={isLoadingLogs}>
                <RefreshCw className={`w-4 h-4 mr-1 ${isLoadingLogs ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>

          {isLoadingLogs ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12">
              <ScrollText className="w-12 h-12 mx-auto mb-3 text-neutral-600" />
              <p className="text-neutral-400">No production recorded for {dateLabel}</p>
              {isToday && <p className="text-sm text-neutral-500">Log a roll on Daily Production to see it here</p>}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm text-neutral-400 border-b border-factory-border">
                    <th className="pb-3 font-medium">Time</th>
                    <th className="pb-3 font-medium">Roll #</th>
                    <th className="pb-3 font-medium">Product</th>
                    <th className="pb-3 font-medium">Machine</th>
                    <th className="pb-3 font-medium text-right">Weight</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b border-factory-border/50 hover:bg-factory-gray/50">
                      <td className="py-3 text-neutral-400 whitespace-nowrap">{formatTime(log.createdAt)}</td>
                      <td className="py-3 font-mono text-primary-400 whitespace-nowrap">
                        {log.rollNumber || '—'}
                      </td>
                      <td className="py-3">
                        <div>
                          <p className="text-white">{log.product.name}</p>
                          <p className="text-xs text-neutral-500 font-mono">{log.product.articleNumber || '—'}</p>
                        </div>
                      </td>
                      <td className="py-3 text-neutral-300">
                        {log.machine ? `#${log.machine}` : '—'}
                        {log.machineName && (
                          <span className="text-xs text-neutral-500 ml-1">({log.machineName})</span>
                        )}
                      </td>
                      <td className="py-3 text-right whitespace-nowrap">
                        <span className="text-white font-semibold">{log.weight.toFixed(2)}</span>
                        <span className="text-neutral-400 ml-1">kg</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Per-product breakdown */}
          {summary && summary.byProduct.length > 0 && (
            <div className="mt-6 pt-4 border-t border-factory-border">
              <h3 className="text-sm font-medium text-neutral-300 mb-3">By Product</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {summary.byProduct.map((p) => (
                  <div key={p.id || p.name} className="bg-factory-gray rounded-xl p-3">
                    <p className="text-white font-medium truncate">{p.name}</p>
                    <p className="text-xs text-neutral-500 font-mono">{p.articleNumber || '—'}</p>
                    <div className="flex items-baseline gap-3 mt-2">
                      <span className="text-lg font-semibold text-emerald-400">{p.weight.toFixed(2)} kg</span>
                      <span className="text-xs text-neutral-400">· {p.rolls} {p.rolls === 1 ? 'roll' : 'rolls'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
