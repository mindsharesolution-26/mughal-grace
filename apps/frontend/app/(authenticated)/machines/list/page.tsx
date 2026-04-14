'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { useToast } from '@/contexts/ToastContext';
import { machinesApi } from '@/lib/api/machines';
import {
  Machine,
  MachineStatus,
  MachineType,
  machineStatusLabels,
  machineStatusColors,
  machineTypeLabels,
} from '@/lib/types/machine';

export default function MachinesListPage() {
  const searchParams = useSearchParams();
  const { showToast } = useToast();

  const [machines, setMachines] = useState<Machine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<MachineStatus | 'all'>(
    (searchParams.get('status') as MachineStatus) || 'all'
  );
  const [typeFilter, setTypeFilter] = useState<MachineType | 'all'>('all');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  useEffect(() => {
    fetchMachines();
  }, [statusFilter, typeFilter, pagination.page]);

  const fetchMachines = async () => {
    try {
      setIsLoading(true);
      const data = await machinesApi.getAll({
        status: statusFilter === 'all' ? undefined : statusFilter,
        machineType: typeFilter === 'all' ? undefined : typeFilter,
        search: search || undefined,
        page: pagination.page,
        limit: pagination.limit,
      });
      setMachines(data.machines);
      setPagination(data.pagination);
    } catch (error: any) {
      showToast('error', error.response?.data?.error || 'Failed to load machines');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination(p => ({ ...p, page: 1 }));
    fetchMachines();
  };

  const statuses: (MachineStatus | 'all')[] = ['all', 'OPERATIONAL', 'MAINTENANCE', 'BREAKDOWN', 'IDLE', 'DECOMMISSIONED'];
  const types: (MachineType | 'all')[] = ['all', 'CIRCULAR_KNITTING', 'FLAT_KNITTING', 'WARP_KNITTING', 'JACQUARD'];

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
            <span className="text-white">All Machines</span>
          </div>
          <h1 className="text-2xl font-semibold text-white mt-2">All Machines</h1>
        </div>
        <Link href="/machines/new">
          <Button>Add Machine</Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-factory-dark rounded-2xl border border-factory-border p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <form onSubmit={handleSearch} className="flex-1">
            <Input
              placeholder="Search machines..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </form>
          <div className="flex gap-2 flex-wrap">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as MachineStatus | 'all');
                setPagination(p => ({ ...p, page: 1 }));
              }}
              className="px-4 py-2 rounded-xl bg-factory-gray border border-factory-border text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {s === 'all' ? 'All Status' : machineStatusLabels[s]}
                </option>
              ))}
            </select>
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value as MachineType | 'all');
                setPagination(p => ({ ...p, page: 1 }));
              }}
              className="px-4 py-2 rounded-xl bg-factory-gray border border-factory-border text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {types.map((t) => (
                <option key={t} value={t}>
                  {t === 'all' ? 'All Types' : machineTypeLabels[t]}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
          <span className="ml-3 text-neutral-400">Loading...</span>
        </div>
      ) : machines.length === 0 ? (
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-12 text-center">
          <span className="text-4xl">🔧</span>
          <p className="text-neutral-400 mt-4">No machines found</p>
          <Link href="/machines/new">
            <Button className="mt-4">Add First Machine</Button>
          </Link>
        </div>
      ) : (
        <div className="bg-factory-dark rounded-2xl border border-factory-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-factory-border">
                  <th className="text-left text-sm font-medium text-neutral-400 px-6 py-4">Machine</th>
                  <th className="text-left text-sm font-medium text-neutral-400 px-6 py-4">Type</th>
                  <th className="text-left text-sm font-medium text-neutral-400 px-6 py-4">Specs</th>
                  <th className="text-left text-sm font-medium text-neutral-400 px-6 py-4">Location</th>
                  <th className="text-left text-sm font-medium text-neutral-400 px-6 py-4">Status</th>
                  <th className="text-left text-sm font-medium text-neutral-400 px-6 py-4">Needles</th>
                  <th className="text-right text-sm font-medium text-neutral-400 px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {machines.map((machine) => (
                  <tr
                    key={machine.id}
                    className="border-b border-factory-border last:border-0 hover:bg-factory-gray/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <Link href={`/machines/${machine.id}`} className="text-white hover:text-primary-400 font-medium">
                        {machine.machineNumber}
                      </Link>
                      <p className="text-sm text-neutral-400">{machine.name}</p>
                      {machine.brand && (
                        <p className="text-xs text-neutral-500">{machine.brand} {machine.model}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-neutral-300">
                      {machineTypeLabels[machine.machineType]}
                    </td>
                    <td className="px-6 py-4 text-neutral-300">
                      <div className="space-y-1">
                        {machine.gauge && <p className="text-sm">Gauge: {machine.gauge}G</p>}
                        {machine.diameter && <p className="text-sm">Dia: {machine.diameter}"</p>}
                        {machine.feeders && <p className="text-sm">Feeders: {machine.feeders}</p>}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-neutral-300">
                      {machine.location || '-'}
                      {machine.position && <p className="text-sm text-neutral-500">{machine.position}</p>}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${
                          machineStatusColors[machine.status].bg
                        } ${machineStatusColors[machine.status].text}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${machineStatusColors[machine.status].dot}`}></span>
                        {machineStatusLabels[machine.status]}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-neutral-300">
                      {machine._count?.needleAllocations || 0} active
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Link href={`/machines/${machine.id}`}>
                          <Button variant="ghost" size="sm">View</Button>
                        </Link>
                        <Link href={`/machines/${machine.id}/edit`}>
                          <Button variant="secondary" size="sm">Edit</Button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-factory-border">
              <p className="text-sm text-neutral-400">
                Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={pagination.page === 1}
                  onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                >
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={pagination.page === pagination.totalPages}
                  onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
