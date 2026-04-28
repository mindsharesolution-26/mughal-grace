'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/atoms/Button';
import { useToast } from '@/contexts/ToastContext';
import { machinesApi } from '@/lib/api/machines';
import {
  MachineWithDetails,
  MachineStatus,
  machineStatusLabels,
  machineStatusColors,
  machineTypeLabels,
} from '@/lib/types/machine';

export default function MachineDetailPage() {
  const router = useRouter();
  const params = useParams();
  const machineId = Number(params.id);
  const { showToast } = useToast();

  const [machine, setMachine] = useState<MachineWithDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState<MachineStatus>('OPERATIONAL');
  const [statusNotes, setStatusNotes] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    fetchMachine();
  }, [machineId]);

  const fetchMachine = async () => {
    try {
      setIsLoading(true);
      const data = await machinesApi.getById(machineId);
      setMachine(data);
    } catch (error: any) {
      showToast('error', error.response?.data?.error || 'Failed to load machine');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async () => {
    if (!machine) return;
    setIsUpdating(true);
    try {
      await machinesApi.updateStatus(machineId, newStatus, statusNotes);
      showToast('success', 'Status updated successfully');
      setShowStatusModal(false);
      fetchMachine();
    } catch (error: any) {
      showToast('error', error.response?.data?.error || 'Failed to update status');
    } finally {
      setIsUpdating(false);
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
        <Button className="mt-4" onClick={() => router.push('/machines')}>
          Back to Machines
        </Button>
      </div>
    );
  }

  const utilizationColor =
    (machine.summary?.utilizationPercent || 0) >= 90
      ? 'text-success'
      : (machine.summary?.utilizationPercent || 0) >= 70
      ? 'text-warning'
      : 'text-error';

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
            <span className="text-white">{machine.machineNumber}</span>
          </div>
          <div className="flex items-center gap-3 mt-2">
            <h1 className="text-2xl font-semibold text-white">{machine.machineNumber}</h1>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${
                machineStatusColors[machine.status].bg
              } ${machineStatusColors[machine.status].text}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${machineStatusColors[machine.status].dot}`}></span>
              {machineStatusLabels[machine.status]}
            </span>
          </div>
          <p className="text-neutral-400 mt-1">{machine.name}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => router.back()}>
            Back
          </Button>
          <Button variant="secondary" onClick={() => setShowStatusModal(true)}>
            Change Status
          </Button>
          <Link href={`/machines/${machineId}/edit`}>
            <Button>Edit Machine</Button>
          </Link>
        </div>
      </div>

      {/* Machine Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Basic Info */}
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Machine Details</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-neutral-400">Type</span>
              <span className="text-white">{machineTypeLabels[machine.machineType]}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">Brand</span>
              <span className="text-white">{machine.brand || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">Model</span>
              <span className="text-white">{machine.model || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">Serial Number</span>
              <span className="text-white">{machine.serialNumber || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">Installation Date</span>
              <span className="text-white">
                {machine.installationDate
                  ? new Date(machine.installationDate).toLocaleDateString()
                  : '-'}
              </span>
            </div>
          </div>
        </div>

        {/* Technical Specs */}
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Technical Specifications</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-neutral-400">Gauge</span>
              <span className="text-white">{machine.gauge ? `${machine.gauge}G` : '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">Diameter</span>
              <span className="text-white">{machine.diameter ? `${machine.diameter}"` : '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">Feeders</span>
              <span className="text-white">{machine.feeders || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">Location</span>
              <span className="text-white">{machine.location || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">Position</span>
              <span className="text-white">{machine.position || '-'}</span>
            </div>
          </div>
        </div>

        {/* Maintenance */}
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Maintenance</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-neutral-400">Last Maintenance</span>
              <span className="text-white">
                {machine.lastMaintenanceAt
                  ? new Date(machine.lastMaintenanceAt).toLocaleDateString()
                  : 'Never'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">Next Maintenance</span>
              <span className={machine.nextMaintenanceAt && new Date(machine.nextMaintenanceAt) < new Date() ? 'text-error' : 'text-white'}>
                {machine.nextMaintenanceAt
                  ? new Date(machine.nextMaintenanceAt).toLocaleDateString()
                  : 'Not scheduled'}
              </span>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-factory-border">
            <Link href={`/machines/${machineId}/edit`}>
              <Button variant="secondary" size="sm" className="w-full">
                Schedule Maintenance
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Needle Configuration */}
      {(machine.needleGauge || machine.totalNeedleSlots) && (
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Needle Configuration</h3>
            <Link href={`/needles/machines/${machineId}/install`}>
              <Button size="sm">Install Needles</Button>
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-factory-gray rounded-xl">
              <p className="text-sm text-neutral-400">Needle Gauge</p>
              <p className="text-xl font-semibold text-white mt-1">
                {machine.needleGauge ? `${machine.needleGauge}G` : '-'}
              </p>
            </div>
            <div className="p-4 bg-factory-gray rounded-xl">
              <p className="text-sm text-neutral-400">Total Capacity</p>
              <p className="text-xl font-semibold text-white mt-1">
                {machine.totalNeedleSlots?.toLocaleString() || '-'}
              </p>
            </div>
            <div className="p-4 bg-factory-gray rounded-xl">
              <p className="text-sm text-neutral-400">Installed</p>
              <p className="text-xl font-semibold text-success mt-1">
                {machine.summary?.totalNeedlesInstalled?.toLocaleString() || 0}
              </p>
            </div>
            <div className="p-4 bg-factory-gray rounded-xl">
              <p className="text-sm text-neutral-400">Utilization</p>
              <p className={`text-xl font-semibold mt-1 ${utilizationColor}`}>
                {machine.summary?.utilizationPercent || 0}%
              </p>
            </div>
          </div>
          {machine.cylinderNeedles || machine.dialNeedles ? (
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div className="p-3 bg-factory-gray rounded-xl">
                <span className="text-neutral-400">Cylinder:</span>
                <span className="text-white ml-2">{machine.cylinderNeedles?.toLocaleString() || '-'}</span>
              </div>
              <div className="p-3 bg-factory-gray rounded-xl">
                <span className="text-neutral-400">Dial:</span>
                <span className="text-white ml-2">{machine.dialNeedles?.toLocaleString() || '-'}</span>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* Configured Needles (Manual Configuration) */}
      {machine.needleConfigs && machine.needleConfigs.length > 0 && (
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-white">Configured Needles</h3>
              <p className="text-sm text-neutral-400">Manual configuration from machine setup</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-neutral-400">Total Needles</p>
              <p className="text-xl font-semibold text-primary-400">
                {machine.needleConfigs.reduce((sum, n) => sum + n.quantity, 0).toLocaleString()}
              </p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-factory-border">
                  <th className="text-left text-sm font-medium text-neutral-400 pb-3 w-12">#</th>
                  <th className="text-left text-sm font-medium text-neutral-400 pb-3">Needle Name</th>
                  <th className="text-left text-sm font-medium text-neutral-400 pb-3">Position</th>
                  <th className="text-right text-sm font-medium text-neutral-400 pb-3">Quantity</th>
                </tr>
              </thead>
              <tbody>
                {machine.needleConfigs.map((needle, index) => (
                  <tr key={index} className="border-b border-factory-border last:border-0 hover:bg-factory-gray/50">
                    <td className="py-3">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-primary-500/20 text-primary-400 text-sm font-medium">
                        {index + 1}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className="text-white font-medium">{needle.name}</span>
                    </td>
                    <td className="py-3 text-neutral-300">{needle.position || '-'}</td>
                    <td className="py-3 text-right text-white font-medium">
                      {needle.quantity.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Current Needle Allocations */}
      {machine.needleAllocations && machine.needleAllocations.length > 0 && (
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Current Needle Allocations</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-factory-border">
                  <th className="text-left text-sm font-medium text-neutral-400 pb-3">Needle Type</th>
                  <th className="text-right text-sm font-medium text-neutral-400 pb-3">Quantity</th>
                  <th className="text-left text-sm font-medium text-neutral-400 pb-3">Position</th>
                  <th className="text-left text-sm font-medium text-neutral-400 pb-3">Batch</th>
                  <th className="text-left text-sm font-medium text-neutral-400 pb-3">Installed</th>
                </tr>
              </thead>
              <tbody>
                {machine.needleAllocations.map((alloc) => (
                  <tr key={alloc.id} className="border-b border-factory-border last:border-0">
                    <td className="py-3">
                      <span className="text-white">{alloc.needleType.name}</span>
                      <p className="text-xs text-neutral-400">{alloc.needleType.code}</p>
                    </td>
                    <td className="py-3 text-right text-white font-medium">
                      {alloc.installedQuantity.toLocaleString()}
                    </td>
                    <td className="py-3 text-neutral-300">{alloc.position || '-'}</td>
                    <td className="py-3 text-neutral-400">{alloc.batch?.batchNumber || '-'}</td>
                    <td className="py-3 text-neutral-400">
                      {new Date(alloc.installedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent Production & Downtime */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Production */}
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Recent Production</h3>
          {machine.productionLogs && machine.productionLogs.length > 0 ? (
            <div className="space-y-3">
              {machine.productionLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between py-2 px-3 rounded-xl bg-factory-gray">
                  <div>
                    <p className="text-white">{log.rollsProduced || 0} rolls</p>
                    <p className="text-sm text-neutral-400">
                      {new Date(log.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <p className="text-neutral-300">
                    {log.totalWeight ? `${Number(log.totalWeight).toFixed(1)} kg` : '-'}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-neutral-400 text-center py-4">No production logs</p>
          )}
        </div>

        {/* Recent Downtime */}
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Recent Downtime</h3>
          {machine.downtimeLogs && machine.downtimeLogs.length > 0 ? (
            <div className="space-y-3">
              {machine.downtimeLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between py-2 px-3 rounded-xl bg-factory-gray">
                  <div>
                    <p className="text-white">{log.reason}</p>
                    <p className="text-sm text-neutral-400">
                      {new Date(log.startTime).toLocaleDateString()}
                    </p>
                  </div>
                  <p className="text-neutral-300">
                    {log.duration ? `${Math.round(log.duration / 60)} hrs` : 'Ongoing'}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-neutral-400 text-center py-4">No downtime logs</p>
          )}
        </div>
      </div>

      {/* Status Change Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-factory-dark rounded-2xl border border-factory-border p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-white mb-4">Change Machine Status</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">New Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as MachineStatus)}
                  className="w-full px-4 py-3 rounded-xl bg-factory-gray border border-factory-border text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {(['OPERATIONAL', 'MAINTENANCE', 'BREAKDOWN', 'IDLE'] as MachineStatus[]).map((s) => (
                    <option key={s} value={s}>
                      {machineStatusLabels[s]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">Notes (optional)</label>
                <textarea
                  value={statusNotes}
                  onChange={(e) => setStatusNotes(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-factory-gray border border-factory-border text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                  rows={3}
                  placeholder="Reason for status change..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="secondary" onClick={() => setShowStatusModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleStatusChange} disabled={isUpdating}>
                {isUpdating ? 'Updating...' : 'Update Status'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
