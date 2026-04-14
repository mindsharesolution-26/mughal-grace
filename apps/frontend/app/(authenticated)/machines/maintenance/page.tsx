'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/atoms/Button';
import { useToast } from '@/contexts/ToastContext';
import { machinesApi } from '@/lib/api/machines';
import {
  MaintenanceScheduleItem,
  MachineStats,
  machineStatusLabels,
  machineStatusColors,
  machineTypeLabels,
} from '@/lib/types/machine';

export default function MaintenanceSchedulePage() {
  const { showToast } = useToast();
  const [schedule, setSchedule] = useState<MaintenanceScheduleItem[]>([]);
  const [stats, setStats] = useState<MachineStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'overdue' | 'upcoming'>('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [scheduleData, statsData] = await Promise.all([
        machinesApi.getMaintenanceSchedule(),
        machinesApi.getStats(),
      ]);
      setSchedule(scheduleData);
      setStats(statsData);
    } catch (error: any) {
      showToast('error', error.response?.data?.error || 'Failed to load maintenance data');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredSchedule = schedule.filter((item) => {
    if (filter === 'overdue') return item.isOverdue;
    if (filter === 'upcoming') return !item.isOverdue && (item.daysUntilMaintenance ?? 0) <= 7;
    return true;
  });

  const overdueCount = schedule.filter((s) => s.isOverdue).length;
  const upcomingCount = schedule.filter((s) => !s.isOverdue && (s.daysUntilMaintenance ?? 0) <= 7).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm">
            <Link href="/machines" className="text-neutral-400 hover:text-white">
              Machines
            </Link>
            <span className="text-neutral-600">/</span>
            <span className="text-white">Maintenance Schedule</span>
          </div>
          <h1 className="text-2xl font-semibold text-white mt-2">Maintenance Schedule</h1>
        </div>
        <Link href="/machines/list?status=MAINTENANCE">
          <Button variant="secondary">View In Maintenance</Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-4">
          <p className="text-sm text-neutral-400">In Maintenance</p>
          <p className="text-2xl font-semibold text-warning mt-1">
            {stats?.byStatus.maintenance || 0}
          </p>
        </div>
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-4">
          <p className="text-sm text-neutral-400">Overdue</p>
          <p className="text-2xl font-semibold text-error mt-1">{overdueCount}</p>
        </div>
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-4">
          <p className="text-sm text-neutral-400">Due This Week</p>
          <p className="text-2xl font-semibold text-warning mt-1">{upcomingCount}</p>
        </div>
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-4">
          <p className="text-sm text-neutral-400">Total Scheduled</p>
          <p className="text-2xl font-semibold text-white mt-1">{schedule.length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {(['all', 'overdue', 'upcoming'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-primary-500/20 text-primary-400'
                : 'text-neutral-400 hover:bg-factory-gray hover:text-white'
            }`}
          >
            {f === 'all' ? 'All' : f === 'overdue' ? `Overdue (${overdueCount})` : `This Week (${upcomingCount})`}
          </button>
        ))}
      </div>

      {/* Schedule List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
          <span className="ml-3 text-neutral-400">Loading...</span>
        </div>
      ) : filteredSchedule.length === 0 ? (
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-12 text-center">
          <span className="text-4xl">🛠️</span>
          <p className="text-neutral-400 mt-4">
            {filter === 'all'
              ? 'No maintenance scheduled'
              : filter === 'overdue'
              ? 'No overdue maintenance'
              : 'No maintenance due this week'}
          </p>
        </div>
      ) : (
        <div className="bg-factory-dark rounded-2xl border border-factory-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-factory-border">
                  <th className="text-left text-sm font-medium text-neutral-400 px-6 py-4">Machine</th>
                  <th className="text-left text-sm font-medium text-neutral-400 px-6 py-4">Type</th>
                  <th className="text-left text-sm font-medium text-neutral-400 px-6 py-4">Status</th>
                  <th className="text-left text-sm font-medium text-neutral-400 px-6 py-4">Last Maintenance</th>
                  <th className="text-left text-sm font-medium text-neutral-400 px-6 py-4">Next Due</th>
                  <th className="text-right text-sm font-medium text-neutral-400 px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSchedule.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-factory-border last:border-0 hover:bg-factory-gray/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <Link href={`/machines/${item.id}`} className="text-white hover:text-primary-400 font-medium">
                        {item.machineNumber}
                      </Link>
                      <p className="text-sm text-neutral-400">{item.name}</p>
                    </td>
                    <td className="px-6 py-4 text-neutral-300">
                      {machineTypeLabels[item.machineType]}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${
                          machineStatusColors[item.status].bg
                        } ${machineStatusColors[item.status].text}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${machineStatusColors[item.status].dot}`}></span>
                        {machineStatusLabels[item.status]}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-neutral-300">
                      {item.lastMaintenanceAt
                        ? new Date(item.lastMaintenanceAt).toLocaleDateString()
                        : 'Never'}
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-medium ${
                            item.isOverdue
                              ? 'bg-error/20 text-error'
                              : (item.daysUntilMaintenance ?? 0) <= 3
                              ? 'bg-warning/20 text-warning'
                              : 'bg-success/20 text-success'
                          }`}
                        >
                          {item.isOverdue
                            ? 'Overdue'
                            : item.daysUntilMaintenance === 0
                            ? 'Today'
                            : `${item.daysUntilMaintenance} days`}
                        </span>
                        <p className="text-sm text-neutral-400 mt-1">
                          {item.nextMaintenanceAt
                            ? new Date(item.nextMaintenanceAt).toLocaleDateString()
                            : '-'}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Link href={`/machines/${item.id}`}>
                          <Button variant="ghost" size="sm">View</Button>
                        </Link>
                        {item.status !== 'MAINTENANCE' && (
                          <Link href={`/machines/${item.id}`}>
                            <Button variant="secondary" size="sm">Start</Button>
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Maintenance Tips */}
      <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Maintenance Guidelines</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-factory-gray rounded-xl">
            <span className="text-2xl">🔧</span>
            <h3 className="text-white font-medium mt-2">Regular Inspection</h3>
            <p className="text-sm text-neutral-400 mt-1">
              Check needle beds, cylinder, and dial for wear and damage
            </p>
          </div>
          <div className="p-4 bg-factory-gray rounded-xl">
            <span className="text-2xl">🛢️</span>
            <h3 className="text-white font-medium mt-2">Lubrication</h3>
            <p className="text-sm text-neutral-400 mt-1">
              Apply proper lubricant to moving parts as per schedule
            </p>
          </div>
          <div className="p-4 bg-factory-gray rounded-xl">
            <span className="text-2xl">🪡</span>
            <h3 className="text-white font-medium mt-2">Needle Check</h3>
            <p className="text-sm text-neutral-400 mt-1">
              Inspect and replace worn or damaged needles promptly
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
