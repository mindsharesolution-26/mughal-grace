'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/atoms/Button';
import { useToast } from '@/contexts/ToastContext';
import { needleReportsApi } from '@/lib/api/needles';
import { MachineNeedleStatus } from '@/lib/types/needle';

export default function MachineNeedlesPage() {
  const { showToast } = useToast();
  const [machines, setMachines] = useState<MachineNeedleStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'attention'>('all');

  useEffect(() => {
    fetchMachines();
  }, []);

  const fetchMachines = async () => {
    try {
      setIsLoading(true);
      const data = await needleReportsApi.getMachineStatus();
      setMachines(data);
    } catch (error: any) {
      showToast('error', error.response?.data?.error || 'Failed to load machine status');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredMachines = filter === 'attention'
    ? machines.filter((m) => m.needsAttention)
    : machines;

  const machinesNeedingAttention = machines.filter((m) => m.needsAttention).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm">
            <Link href="/needles" className="text-neutral-400 hover:text-white">
              Needles
            </Link>
            <span className="text-neutral-600">/</span>
            <span className="text-white">Machine Needles</span>
          </div>
          <h1 className="text-2xl font-semibold text-white mt-2">Machine Needles</h1>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-4">
          <p className="text-sm text-neutral-400">Total Machines</p>
          <p className="text-2xl font-semibold text-white mt-1">{machines.length}</p>
        </div>
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-4">
          <p className="text-sm text-neutral-400">Total Installed</p>
          <p className="text-2xl font-semibold text-blue-400 mt-1">
            {machines.reduce((sum, m) => sum + m.totalInstalled, 0).toLocaleString()}
          </p>
        </div>
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-4">
          <p className="text-sm text-neutral-400">Avg Utilization</p>
          <p className="text-2xl font-semibold text-success mt-1">
            {machines.length > 0
              ? Math.round(
                  machines.reduce((sum, m) => sum + (m.utilizationPercent || 0), 0) / machines.length
                )
              : 0}
            %
          </p>
        </div>
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-4">
          <p className="text-sm text-neutral-400">Need Attention</p>
          <p className={`text-2xl font-semibold mt-1 ${machinesNeedingAttention > 0 ? 'text-warning' : 'text-success'}`}>
            {machinesNeedingAttention}
          </p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'all'
              ? 'bg-primary-500/20 text-primary-400'
              : 'text-neutral-400 hover:bg-factory-gray hover:text-white'
          }`}
        >
          All Machines
        </button>
        <button
          onClick={() => setFilter('attention')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'attention'
              ? 'bg-primary-500/20 text-primary-400'
              : 'text-neutral-400 hover:bg-factory-gray hover:text-white'
          }`}
        >
          Need Attention ({machinesNeedingAttention})
        </button>
      </div>

      {/* Machine Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
          <span className="ml-3 text-neutral-400">Loading machines...</span>
        </div>
      ) : filteredMachines.length === 0 ? (
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-12 text-center">
          <span className="text-4xl">🏭</span>
          <p className="text-neutral-400 mt-4">
            {filter === 'attention'
              ? 'All machines are properly equipped'
              : 'No circular knitting machines found'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMachines.map((machineStatus) => {
            const { machine, allocations, totalInstalled, utilizationPercent, needsAttention } =
              machineStatus;

            return (
              <div
                key={machine.id}
                className={`bg-factory-dark rounded-2xl border p-6 transition-colors ${
                  needsAttention
                    ? 'border-warning/50 hover:border-warning'
                    : 'border-factory-border hover:border-primary-500'
                }`}
              >
                {/* Machine Header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      {machine.machineNumber}
                    </h3>
                    <p className="text-sm text-neutral-400">{machine.name}</p>
                  </div>
                  <span
                    className={`px-2 py-1 rounded-lg text-xs font-medium ${
                      machine.status === 'OPERATIONAL'
                        ? 'bg-success/20 text-success'
                        : machine.status === 'MAINTENANCE'
                        ? 'bg-warning/20 text-warning'
                        : 'bg-neutral-500/20 text-neutral-400'
                    }`}
                  >
                    {machine.status}
                  </span>
                </div>

                {/* Needle Info */}
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-400">Default Gauge</span>
                    <span className="text-white">
                      {machine.needleGauge ? `${machine.needleGauge}G` : '-'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-400">Installed / Capacity</span>
                    <span className="text-white">
                      {totalInstalled.toLocaleString()} /{' '}
                      {machine.totalNeedleSlots?.toLocaleString() || '-'}
                    </span>
                  </div>

                  {/* Utilization Bar */}
                  {machine.totalNeedleSlots && (
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-neutral-400">Utilization</span>
                        <span
                          className={
                            (utilizationPercent || 0) >= 90
                              ? 'text-success'
                              : (utilizationPercent || 0) >= 70
                              ? 'text-warning'
                              : 'text-error'
                          }
                        >
                          {utilizationPercent || 0}%
                        </span>
                      </div>
                      <div className="w-full h-2 bg-factory-gray rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            (utilizationPercent || 0) >= 90
                              ? 'bg-success'
                              : (utilizationPercent || 0) >= 70
                              ? 'bg-warning'
                              : 'bg-error'
                          }`}
                          style={{ width: `${Math.min(utilizationPercent || 0, 100)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Current Allocations */}
                  {allocations.length > 0 && (
                    <div className="pt-3 border-t border-factory-border">
                      <p className="text-xs text-neutral-400 mb-2">Current Needles</p>
                      <div className="space-y-1">
                        {allocations.slice(0, 3).map((alloc) => (
                          <div key={alloc.id} className="flex justify-between text-xs">
                            <span className="text-neutral-300 truncate">
                              {alloc.needleType?.name}
                            </span>
                            <span className="text-white ml-2">
                              {alloc.installedQuantity.toLocaleString()}
                            </span>
                          </div>
                        ))}
                        {allocations.length > 3 && (
                          <p className="text-xs text-neutral-500">
                            +{allocations.length - 3} more
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-4 pt-4 border-t border-factory-border">
                  <Link href={`/needles/machines/${machine.id}`} className="flex-1">
                    <Button variant="secondary" size="sm" className="w-full">
                      View Details
                    </Button>
                  </Link>
                  <Link href={`/needles/machines/${machine.id}/install`} className="flex-1">
                    <Button size="sm" className="w-full">
                      Install
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
