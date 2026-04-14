'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/atoms/Button';
import { useToast } from '@/contexts/ToastContext';
import { needleDamageApi } from '@/lib/api/needles';
import {
  NeedleDamage,
  damageTypeLabels,
  damageTypeColors,
  damageCauseLabels,
  resolutionStatusLabels,
  resolutionStatusColors,
} from '@/lib/types/needle';

export default function DamageReportsPage() {
  const { showToast } = useToast();
  const [damages, setDamages] = useState<NeedleDamage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'PENDING' | 'REPLACED' | 'WRITTEN_OFF'>('all');

  useEffect(() => {
    fetchDamages();
  }, [filter]);

  const fetchDamages = async () => {
    try {
      setIsLoading(true);
      const data = await needleDamageApi.getAll({
        resolutionStatus: filter === 'all' ? undefined : filter,
      });
      setDamages(data);
    } catch (error: any) {
      showToast('error', error.response?.data?.error || 'Failed to load damage reports');
    } finally {
      setIsLoading(false);
    }
  };

  const pendingCount = damages.filter((d) => d.resolutionStatus === 'PENDING').length;
  const totalDamaged = damages.reduce((sum, d) => sum + d.damagedQuantity, 0);

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
            <span className="text-white">Damage Reports</span>
          </div>
          <h1 className="text-2xl font-semibold text-white mt-2">Damage Reports</h1>
        </div>
        <Link href="/needles/damages/report">
          <Button>Report Damage</Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-4">
          <p className="text-sm text-neutral-400">Total Reports</p>
          <p className="text-2xl font-semibold text-white mt-1">{damages.length}</p>
        </div>
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-4">
          <p className="text-sm text-neutral-400">Total Damaged</p>
          <p className="text-2xl font-semibold text-error mt-1">
            {totalDamaged.toLocaleString()}
          </p>
        </div>
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-4">
          <p className="text-sm text-neutral-400">Pending Resolution</p>
          <p className={`text-2xl font-semibold mt-1 ${pendingCount > 0 ? 'text-warning' : 'text-success'}`}>
            {pendingCount}
          </p>
        </div>
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-4">
          <p className="text-sm text-neutral-400">This Month</p>
          <p className="text-2xl font-semibold text-white mt-1">
            {damages.filter((d) => {
              const date = new Date(d.damageDate);
              const now = new Date();
              return (
                date.getMonth() === now.getMonth() &&
                date.getFullYear() === now.getFullYear()
              );
            }).length}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {(['all', 'PENDING', 'REPLACED', 'WRITTEN_OFF'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-primary-500/20 text-primary-400'
                : 'text-neutral-400 hover:bg-factory-gray hover:text-white'
            }`}
          >
            {f === 'all' ? 'All' : resolutionStatusLabels[f]}
          </button>
        ))}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
          <span className="ml-3 text-neutral-400">Loading...</span>
        </div>
      ) : damages.length === 0 ? (
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-12 text-center">
          <span className="text-4xl">⚠️</span>
          <p className="text-neutral-400 mt-4">No damage reports found</p>
          <Link href="/needles/damages/report">
            <Button className="mt-4">Report First Damage</Button>
          </Link>
        </div>
      ) : (
        <div className="bg-factory-dark rounded-2xl border border-factory-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-factory-border">
                  <th className="text-left text-sm font-medium text-neutral-400 px-6 py-4">Date</th>
                  <th className="text-left text-sm font-medium text-neutral-400 px-6 py-4">Needle Type</th>
                  <th className="text-left text-sm font-medium text-neutral-400 px-6 py-4">Damage Type</th>
                  <th className="text-right text-sm font-medium text-neutral-400 px-6 py-4">Qty</th>
                  <th className="text-left text-sm font-medium text-neutral-400 px-6 py-4">Cause</th>
                  <th className="text-left text-sm font-medium text-neutral-400 px-6 py-4">Reporter</th>
                  <th className="text-left text-sm font-medium text-neutral-400 px-6 py-4">Status</th>
                  <th className="text-right text-sm font-medium text-neutral-400 px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {damages.map((damage) => (
                  <tr
                    key={damage.id}
                    className="border-b border-factory-border last:border-0 hover:bg-factory-gray/50 transition-colors"
                  >
                    <td className="px-6 py-4 text-neutral-300">
                      {new Date(damage.damageDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-white">{damage.needleType?.name || '-'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${
                          damageTypeColors[damage.damageType]?.bg || 'bg-neutral-500/20'
                        } ${damageTypeColors[damage.damageType]?.text || 'text-neutral-400'}`}
                      >
                        {damageTypeLabels[damage.damageType] || damage.damageType}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-error font-medium">
                        {damage.damagedQuantity.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-neutral-300">
                      {damage.cause ? damageCauseLabels[damage.cause] : '-'}
                    </td>
                    <td className="px-6 py-4 text-neutral-300">{damage.reporterName}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                          resolutionStatusColors[damage.resolutionStatus]?.bg || 'bg-neutral-500/20'
                        } ${resolutionStatusColors[damage.resolutionStatus]?.text || 'text-neutral-400'}`}
                      >
                        {resolutionStatusLabels[damage.resolutionStatus] || damage.resolutionStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link href={`/needles/damages/${damage.id}`}>
                        <Button variant="ghost" size="sm">
                          View
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
