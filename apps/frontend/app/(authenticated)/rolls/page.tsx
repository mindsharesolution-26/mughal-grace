'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { StatsCard } from '@/components/molecules/StatsCard';
import { rollsApi } from '@/lib/api/rolls';
import type { Roll, RollStatsOverview, RollStatus } from '@/lib/types/roll';

const statusConfig: Record<RollStatus, { label: string; color: string }> = {
  GREY_STOCK: { label: 'Grey Stock', color: 'bg-neutral-500/20 text-neutral-300' },
  SENT_FOR_DYEING: { label: 'Dyeing', color: 'bg-primary-500/20 text-primary-400' },
  AT_DYEING: { label: 'At Dyeing', color: 'bg-primary-500/20 text-primary-400' },
  DYEING_COMPLETE: { label: 'Dyed', color: 'bg-success/20 text-success' },
  FINISHED_STOCK: { label: 'Finished', color: 'bg-success/20 text-success' },
  SOLD: { label: 'Dispatched', color: 'bg-warning/20 text-warning' },
  REJECTED: { label: 'Rejected', color: 'bg-danger/20 text-danger' },
};

const PAGE_SIZE = 50;

export default function RollsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | RollStatus>('all');

  const [rolls, setRolls] = useState<Roll[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [stats, setStats] = useState<RollStatsOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Stats cover the whole roll population, so they only need fetching once —
  // the search box and status filter narrow the table, not the totals.
  useEffect(() => {
    let cancelled = false;
    rollsApi
      .getStatsOverview()
      .then((data) => {
        if (!cancelled) setStats(data);
      })
      .catch(() => {
        if (!cancelled) setStats(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const loadRolls = useCallback(async (search: string, status: 'all' | RollStatus) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await rollsApi.getAll({
        limit: PAGE_SIZE,
        sortBy: 'producedAt',
        sortOrder: 'desc',
        ...(search ? { search } : {}),
        ...(status !== 'all' ? { status } : {}),
      });
      setRolls(response.rolls);
      setTotalCount(response.pagination.total);
    } catch {
      setError('Could not load rolls. Check that the API is running.');
      setRolls([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Debounce the search box so typing doesn't fire a request per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => {
      loadRolls(searchQuery.trim(), statusFilter);
    }, searchQuery ? 300 : 0);
    return () => clearTimeout(timer);
  }, [searchQuery, statusFilter, loadRolls]);

  const countFor = useCallback(
    (status: RollStatus) => stats?.byStatus?.[status]?.count ?? 0,
    [stats]
  );

  const greyStockWeight = stats?.byStatus?.GREY_STOCK?.weight ?? 0;
  const inDyeingCount = countFor('SENT_FOR_DYEING') + countFor('AT_DYEING');

  const lifecycleSteps = useMemo(
    () => [
      { status: 'GREY_STOCK' as const, label: 'Grey Stock', icon: '📦', count: countFor('GREY_STOCK') },
      { status: 'AT_DYEING' as const, label: 'Dyeing', icon: '🎨', count: inDyeingCount },
      { status: 'FINISHED_STOCK' as const, label: 'Finished', icon: '✅', count: countFor('FINISHED_STOCK') },
      { status: 'SOLD' as const, label: 'Dispatched', icon: '🚚', count: countFor('SOLD') },
    ],
    [countFor, inDyeingCount]
  );

  const totalRolls = stats
    ? Object.values(stats.byStatus).reduce((sum, s) => sum + s.count, 0)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Rolls</h1>
          <p className="text-neutral-400 mt-1">
            Track roll lifecycle from production to dispatch
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/rolls/new">
            <Button>+ Create Roll</Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Grey Stock"
          value={`${countFor('GREY_STOCK').toLocaleString()} rolls`}
          change={`${greyStockWeight.toLocaleString(undefined, { maximumFractionDigits: 1 })} kg`}
          changeType="neutral"
          icon="📦"
        />
        <StatsCard
          title="In Dyeing"
          value={`${inDyeingCount.toLocaleString()} rolls`}
          change="Processing"
          changeType="neutral"
          icon="🎨"
        />
        <StatsCard
          title="Finished Stock"
          value={`${countFor('FINISHED_STOCK').toLocaleString()} rolls`}
          change="Ready for sale"
          changeType="positive"
          icon="✅"
        />
        <StatsCard
          title="Total Rolls"
          value={totalRolls.toLocaleString()}
          change="All time"
          changeType="neutral"
          icon="🧵"
        />
      </div>

      {/* Roll Lifecycle Flow */}
      <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Roll Lifecycle</h2>
        <div className="flex items-center justify-between overflow-x-auto pb-2">
          {lifecycleSteps.map((step, index) => (
            <div key={step.status} className="flex items-center">
              <button
                onClick={() =>
                  setStatusFilter(statusFilter === step.status ? 'all' : step.status)
                }
                className={`flex flex-col items-center px-6 py-4 rounded-xl transition-colors ${
                  statusFilter === step.status
                    ? 'bg-primary-500/20 border border-primary-500/30'
                    : 'hover:bg-factory-gray'
                }`}
              >
                <span className="text-2xl mb-2">{step.icon}</span>
                <span className="text-sm text-white font-medium">{step.label}</span>
                <span className="text-lg font-bold text-primary-400 mt-1">
                  {step.count.toLocaleString()}
                </span>
              </button>
              {index < lifecycleSteps.length - 1 && (
                <div className="w-12 h-0.5 bg-factory-border mx-2" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-factory-dark rounded-2xl border border-factory-border p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="Search by roll number or fabric type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | RollStatus)}
              className="px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Status</option>
              <option value="GREY_STOCK">Grey Stock</option>
              <option value="SENT_FOR_DYEING">Sent for Dyeing</option>
              <option value="AT_DYEING">At Dyeing</option>
              <option value="DYEING_COMPLETE">Dyed</option>
              <option value="FINISHED_STOCK">Finished</option>
              <option value="SOLD">Dispatched</option>
              <option value="REJECTED">Rejected</option>
            </select>
            <Button variant="ghost">Export</Button>
          </div>
        </div>
      </div>

      {/* Rolls Table */}
      <div className="bg-factory-dark rounded-2xl border border-factory-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-factory-border">
                <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">
                  Roll Number
                </th>
                <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">
                  Fabric Type
                </th>
                <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">
                  Machine
                </th>
                <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">
                  Grey Weight
                </th>
                <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">
                  Finished Weight
                </th>
                <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">
                  Status
                </th>
                <th className="text-right px-6 py-4 text-sm font-medium text-neutral-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-factory-border">
              {isLoading && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-neutral-400">
                    Loading rolls…
                  </td>
                </tr>
              )}

              {!isLoading && error && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-danger">
                    {error}
                  </td>
                </tr>
              )}

              {!isLoading && !error && rolls.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-neutral-400">
                    No rolls match this filter.
                  </td>
                </tr>
              )}

              {!isLoading &&
                !error &&
                rolls.map((roll) => {
                  const badge = statusConfig[roll.status] ?? {
                    label: roll.status,
                    color: 'bg-neutral-500/20 text-neutral-300',
                  };
                  return (
                    <tr key={roll.id} className="hover:bg-factory-gray transition-colors">
                      <td className="px-6 py-4">
                        <Link
                          href={`/rolls/${roll.id}`}
                          className="font-mono text-sm text-primary-400 hover:text-primary-300"
                        >
                          {roll.rollNumber}
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-white">{roll.fabricType}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-neutral-300">
                          {roll.machine
                            ? `${roll.machine.machineNumber} · ${roll.machine.name}`
                            : '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-white">{Number(roll.greyWeight).toFixed(1)} kg</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-white">
                          {roll.finishedWeight ? `${Number(roll.finishedWeight).toFixed(1)} kg` : '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${badge.color}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          {roll.status === 'GREY_STOCK' && (
                            <Button variant="ghost" size="sm">
                              Send to Dyeing
                            </Button>
                          )}
                          <Link href={`/rolls/${roll.id}`}>
                            <Button variant="ghost" size="sm">
                              View
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

        {!isLoading && !error && rolls.length > 0 && (
          <div className="px-6 py-3 border-t border-factory-border text-sm text-neutral-400">
            Showing {rolls.length.toLocaleString()} of {totalCount.toLocaleString()} rolls
          </div>
        )}
      </div>
    </div>
  );
}
