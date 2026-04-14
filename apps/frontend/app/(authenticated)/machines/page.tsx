'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/atoms/Button';
import { useToast } from '@/contexts/ToastContext';
import { machinesApi } from '@/lib/api/machines';
import {
  MachineStats,
  MaintenanceScheduleItem,
  Machine,
  machineStatusLabels,
  machineStatusColors,
  machineTypeLabels,
} from '@/lib/types/machine';

export default function MachinesDashboard() {
  const { showToast } = useToast();
  const [stats, setStats] = useState<MachineStats | null>(null);
  const [maintenanceSchedule, setMaintenanceSchedule] = useState<MaintenanceScheduleItem[]>([]);
  const [recentMachines, setRecentMachines] = useState<Machine[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [statsData, scheduleData, machinesData] = await Promise.all([
        machinesApi.getStats(),
        machinesApi.getMaintenanceSchedule(),
        machinesApi.getAll({ limit: 5, sortBy: 'createdAt', sortOrder: 'desc' }),
      ]);
      setStats(statsData);
      setMaintenanceSchedule(scheduleData);
      setRecentMachines(machinesData.machines);
    } catch (error: any) {
      showToast('error', error.response?.data?.error || 'Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
        <span className="ml-3 text-neutral-400">Loading...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Machines Dashboard</h1>
          <p className="text-neutral-400 mt-1">Overview of all circular knitting machines</p>
        </div>
        <Link href="/machines/new">
          <Button>Add Machine</Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-4">
          <p className="text-sm text-neutral-400">Total Machines</p>
          <p className="text-2xl font-semibold text-white mt-1">{stats?.total || 0}</p>
        </div>
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-4">
          <p className="text-sm text-neutral-400">Operational</p>
          <p className="text-2xl font-semibold text-success mt-1">
            {stats?.byStatus.operational || 0}
          </p>
        </div>
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-4">
          <p className="text-sm text-neutral-400">In Maintenance</p>
          <p className="text-2xl font-semibold text-warning mt-1">
            {stats?.byStatus.maintenance || 0}
          </p>
        </div>
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-4">
          <p className="text-sm text-neutral-400">Breakdown</p>
          <p className="text-2xl font-semibold text-error mt-1">
            {stats?.byStatus.breakdown || 0}
          </p>
        </div>
      </div>

      {/* Operational Rate */}
      <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-neutral-400">Operational Rate</span>
          <span className={stats?.operationalRate! >= 80 ? 'text-success' : stats?.operationalRate! >= 60 ? 'text-warning' : 'text-error'}>
            {stats?.operationalRate || 0}%
          </span>
        </div>
        <div className="w-full h-4 bg-factory-gray rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              stats?.operationalRate! >= 80 ? 'bg-success' : stats?.operationalRate! >= 60 ? 'bg-warning' : 'bg-error'
            }`}
            style={{ width: `${Math.min(stats?.operationalRate || 0, 100)}%` }}
          />
        </div>
        <p className="text-sm text-neutral-400 mt-2">
          {stats?.byStatus.operational || 0} out of {stats?.total || 0} machines operational
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Machine Types */}
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
          <h2 className="text-lg font-semibold text-white mb-4">By Machine Type</h2>
          <div className="space-y-3">
            {stats?.byType && Object.entries(stats.byType).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between">
                <span className="text-neutral-300">{machineTypeLabels[type as keyof typeof machineTypeLabels]}</span>
                <span className="text-white font-medium">{count}</span>
              </div>
            ))}
            {(!stats?.byType || Object.keys(stats.byType).length === 0) && (
              <p className="text-neutral-400 text-center py-4">No machines found</p>
            )}
          </div>
        </div>

        {/* Maintenance Due */}
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Maintenance Due</h2>
            <Link href="/machines/maintenance">
              <Button variant="ghost" size="sm">View All</Button>
            </Link>
          </div>
          {maintenanceSchedule.length === 0 ? (
            <p className="text-neutral-400 text-center py-4">No maintenance scheduled</p>
          ) : (
            <div className="space-y-3">
              {maintenanceSchedule.slice(0, 5).map((item) => (
                <Link
                  key={item.id}
                  href={`/machines/${item.id}`}
                  className="flex items-center justify-between py-2 px-3 rounded-xl hover:bg-factory-gray transition-colors"
                >
                  <div>
                    <p className="text-white font-medium">{item.machineNumber}</p>
                    <p className="text-sm text-neutral-400">{item.name}</p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${
                        item.isOverdue
                          ? 'bg-error/20 text-error'
                          : item.daysUntilMaintenance! <= 3
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
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Machines */}
      <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Recently Added Machines</h2>
          <Link href="/machines/list">
            <Button variant="ghost" size="sm">View All</Button>
          </Link>
        </div>
        {recentMachines.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-neutral-400">No machines added yet</p>
            <Link href="/machines/new">
              <Button className="mt-4">Add First Machine</Button>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-factory-border">
                  <th className="text-left text-sm font-medium text-neutral-400 pb-3">Machine</th>
                  <th className="text-left text-sm font-medium text-neutral-400 pb-3">Type</th>
                  <th className="text-left text-sm font-medium text-neutral-400 pb-3">Specs</th>
                  <th className="text-left text-sm font-medium text-neutral-400 pb-3">Status</th>
                  <th className="text-right text-sm font-medium text-neutral-400 pb-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {recentMachines.map((machine) => (
                  <tr key={machine.id} className="border-b border-factory-border last:border-0">
                    <td className="py-3">
                      <Link href={`/machines/${machine.id}`} className="text-white hover:text-primary-400">
                        {machine.machineNumber}
                      </Link>
                      <p className="text-sm text-neutral-400">{machine.name}</p>
                    </td>
                    <td className="py-3 text-neutral-300">
                      {machineTypeLabels[machine.machineType]}
                    </td>
                    <td className="py-3 text-neutral-300">
                      {machine.gauge && `${machine.gauge}G`}
                      {machine.gauge && machine.diameter && ' / '}
                      {machine.diameter && `${machine.diameter}"`}
                    </td>
                    <td className="py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${
                          machineStatusColors[machine.status].bg
                        } ${machineStatusColors[machine.status].text}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${machineStatusColors[machine.status].dot}`}></span>
                        {machineStatusLabels[machine.status]}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <Link href={`/machines/${machine.id}`}>
                        <Button variant="ghost" size="sm">View</Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link href="/machines/new" className="bg-factory-dark rounded-2xl border border-factory-border p-4 hover:border-primary-500 transition-colors">
          <span className="text-2xl">➕</span>
          <p className="text-white font-medium mt-2">Add Machine</p>
          <p className="text-sm text-neutral-400">Register new machine</p>
        </Link>
        <Link href="/machines/list?status=BREAKDOWN" className="bg-factory-dark rounded-2xl border border-factory-border p-4 hover:border-error transition-colors">
          <span className="text-2xl">🔧</span>
          <p className="text-white font-medium mt-2">Breakdowns</p>
          <p className="text-sm text-neutral-400">{stats?.byStatus.breakdown || 0} machines</p>
        </Link>
        <Link href="/machines/maintenance" className="bg-factory-dark rounded-2xl border border-factory-border p-4 hover:border-warning transition-colors">
          <span className="text-2xl">🛠️</span>
          <p className="text-white font-medium mt-2">Maintenance</p>
          <p className="text-sm text-neutral-400">{stats?.maintenanceDue || 0} due soon</p>
        </Link>
        <Link href="/needles/machines" className="bg-factory-dark rounded-2xl border border-factory-border p-4 hover:border-primary-500 transition-colors">
          <span className="text-2xl">🪡</span>
          <p className="text-white font-medium mt-2">Needles</p>
          <p className="text-sm text-neutral-400">Manage allocations</p>
        </Link>
      </div>
    </div>
  );
}
