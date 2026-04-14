'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/atoms/Button';
import { useToast } from '@/contexts/ToastContext';
import { needleAllocationsApi } from '@/lib/api/needles';
import {
  NeedleMachineAllocation,
  NeedleDamage,
  damageTypeLabels,
  damageTypeColors,
} from '@/lib/types/needle';

interface MachineData {
  id: number;
  machineNumber: string;
  name: string;
  machineType: string;
  needleGauge: number | null;
  totalNeedleSlots: number | null;
  cylinderNeedles: number | null;
  dialNeedles: number | null;
}

export default function MachineNeedleDetailPage() {
  const router = useRouter();
  const params = useParams();
  const machineId = Number(params.machineId);
  const { showToast } = useToast();

  const [machine, setMachine] = useState<MachineData | null>(null);
  const [allocations, setAllocations] = useState<NeedleMachineAllocation[]>([]);
  const [recentDamages, setRecentDamages] = useState<NeedleDamage[]>([]);
  const [summary, setSummary] = useState<{
    totalInstalled: number;
    totalSlots: number;
    utilizationPercent: number | null;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [machineId]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const data = await needleAllocationsApi.getMachineNeedles(machineId);
      setMachine(data.machine);
      setAllocations(data.allocations);
      setRecentDamages(data.recentDamages);
      setSummary(data.summary);
    } catch (error: any) {
      showToast('error', error.response?.data?.error || 'Failed to load machine data');
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

  if (!machine) {
    return (
      <div className="text-center py-12">
        <p className="text-error">Machine not found</p>
        <Button className="mt-4" onClick={() => router.push('/needles/machines')}>
          Back to Machines
        </Button>
      </div>
    );
  }

  const utilizationColor =
    (summary?.utilizationPercent || 0) >= 90
      ? 'text-success'
      : (summary?.utilizationPercent || 0) >= 70
      ? 'text-warning'
      : 'text-error';

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
            <Link href="/needles/machines" className="text-neutral-400 hover:text-white">
              Machines
            </Link>
            <span className="text-neutral-600">/</span>
            <span className="text-white">{machine.machineNumber}</span>
          </div>
          <h1 className="text-2xl font-semibold text-white mt-2">
            {machine.machineNumber} - {machine.name}
          </h1>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => router.back()}>
            Back
          </Button>
          <Link href={`/needles/machines/${machineId}/install`}>
            <Button>Install Needles</Button>
          </Link>
        </div>
      </div>

      {/* Machine Info */}
      <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-neutral-400">Machine Type</p>
            <p className="text-white mt-1">{machine.machineType}</p>
          </div>
          <div>
            <p className="text-sm text-neutral-400">Default Gauge</p>
            <p className="text-white mt-1">{machine.needleGauge ? `${machine.needleGauge}G` : '-'}</p>
          </div>
          <div>
            <p className="text-sm text-neutral-400">Total Capacity</p>
            <p className="text-white mt-1">
              {machine.totalNeedleSlots?.toLocaleString() || '-'}
            </p>
          </div>
          <div>
            <p className="text-sm text-neutral-400">Configuration</p>
            <p className="text-white mt-1">
              {machine.cylinderNeedles ? `Cyl: ${machine.cylinderNeedles}` : ''}
              {machine.cylinderNeedles && machine.dialNeedles ? ' / ' : ''}
              {machine.dialNeedles ? `Dial: ${machine.dialNeedles}` : ''}
              {!machine.cylinderNeedles && !machine.dialNeedles ? '-' : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-4">
          <p className="text-sm text-neutral-400">Total Installed</p>
          <p className="text-2xl font-semibold text-white mt-1">
            {summary?.totalInstalled.toLocaleString() || 0}
          </p>
        </div>
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-4">
          <p className="text-sm text-neutral-400">Total Capacity</p>
          <p className="text-2xl font-semibold text-white mt-1">
            {summary?.totalSlots?.toLocaleString() || '-'}
          </p>
        </div>
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-4">
          <p className="text-sm text-neutral-400">Utilization</p>
          <p className={`text-2xl font-semibold mt-1 ${utilizationColor}`}>
            {summary?.utilizationPercent || 0}%
          </p>
        </div>
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-4">
          <p className="text-sm text-neutral-400">Active Allocations</p>
          <p className="text-2xl font-semibold text-white mt-1">{allocations.length}</p>
        </div>
      </div>

      {/* Utilization Bar */}
      {summary?.totalSlots && (
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-neutral-400">Needle Utilization</span>
            <span className={utilizationColor}>{summary.utilizationPercent || 0}%</span>
          </div>
          <div className="w-full h-4 bg-factory-gray rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                (summary.utilizationPercent || 0) >= 90
                  ? 'bg-success'
                  : (summary.utilizationPercent || 0) >= 70
                  ? 'bg-warning'
                  : 'bg-error'
              }`}
              style={{ width: `${Math.min(summary.utilizationPercent || 0, 100)}%` }}
            />
          </div>
          <p className="text-sm text-neutral-400 mt-2">
            {summary.totalInstalled.toLocaleString()} / {summary.totalSlots.toLocaleString()} needles
          </p>
        </div>
      )}

      {/* Current Allocations */}
      <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Current Allocations</h2>
          <Link href={`/needles/machines/${machineId}/install`}>
            <Button size="sm">Add Needles</Button>
          </Link>
        </div>

        {allocations.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-neutral-400">No needles installed on this machine</p>
            <Link href={`/needles/machines/${machineId}/install`}>
              <Button className="mt-4">Install Needles</Button>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-factory-border">
                  <th className="text-left text-sm font-medium text-neutral-400 pb-3">Needle Type</th>
                  <th className="text-right text-sm font-medium text-neutral-400 pb-3">Quantity</th>
                  <th className="text-left text-sm font-medium text-neutral-400 pb-3">Position</th>
                  <th className="text-left text-sm font-medium text-neutral-400 pb-3">Batch</th>
                  <th className="text-left text-sm font-medium text-neutral-400 pb-3">Installed By</th>
                  <th className="text-left text-sm font-medium text-neutral-400 pb-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {allocations.map((alloc) => (
                  <tr key={alloc.id} className="border-b border-factory-border last:border-0">
                    <td className="py-3">
                      <Link
                        href={`/needles/types/${alloc.needleTypeId}`}
                        className="text-white hover:text-primary-400"
                      >
                        {alloc.needleType?.name}
                      </Link>
                      <p className="text-xs text-neutral-400">{alloc.needleType?.gauge}G</p>
                    </td>
                    <td className="py-3 text-right text-white font-medium">
                      {alloc.installedQuantity.toLocaleString()}
                    </td>
                    <td className="py-3 text-neutral-300">{alloc.position || '-'}</td>
                    <td className="py-3 text-neutral-400">{alloc.batch?.batchNumber || '-'}</td>
                    <td className="py-3 text-neutral-300">{alloc.installerName}</td>
                    <td className="py-3 text-neutral-400">
                      {new Date(alloc.installedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Damages */}
      {recentDamages.length > 0 && (
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Recent Damage Reports</h2>
            <Link href="/needles/damages">
              <Button variant="ghost" size="sm">
                View All
              </Button>
            </Link>
          </div>

          <div className="space-y-3">
            {recentDamages.slice(0, 5).map((damage) => (
              <div
                key={damage.id}
                className="flex items-center justify-between py-3 border-b border-factory-border last:border-0"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium ${
                      damageTypeColors[damage.damageType]?.bg || 'bg-neutral-500/20'
                    } ${damageTypeColors[damage.damageType]?.text || 'text-neutral-400'}`}
                  >
                    {damageTypeLabels[damage.damageType]}
                  </span>
                  <div>
                    <p className="text-white">{damage.needleType?.name}</p>
                    <p className="text-xs text-neutral-400">
                      {damage.damagedQuantity} needles - {new Date(damage.damageDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <Link href={`/needles/damages/${damage.id}`}>
                  <Button variant="ghost" size="sm">
                    View
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
