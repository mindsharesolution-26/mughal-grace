'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { useToast } from '@/contexts/ToastContext';
import { yarnTypesApi } from '@/lib/api/yarn-types';
import { yarnOutwardApi } from '@/lib/api/yarn-outward';
import { api } from '@/lib/api/client';
import { YARN_OUTWARD_PURPOSES, YarnLedgerSummary, YarnTypeLookup, YarnOutward, YARN_OUTWARD_STATUSES } from '@/lib/types/yarn';
import { ArrowUpFromLine, Play, CheckCircle, Eye, X } from 'lucide-react';

interface Machine {
  id: number;
  machineNumber: number;
  name: string;
  status: string;
}

interface Shift {
  id: number;
  name: string;
  code: string;
}

// Form validation schema
const outwardSchema = z.object({
  yarnTypeId: z.string().min(1, 'Yarn type is required'),
  quantityIssued: z.coerce.number().positive('Quantity must be positive'),
  collectedBy: z.string().min(2, 'Collector name is required'),
  issuedAt: z.string().min(1, 'Date is required'),
  machineId: z.string().min(1, 'Machine is required'),
  shiftId: z.string().optional(),
  purpose: z.enum(['PRODUCTION', 'SAMPLE', 'TESTING', 'OTHER']),
  notes: z.string().optional(),
});

type OutwardForm = z.infer<typeof outwardSchema>;

export default function YarnOutwardPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const [yarnTypes, setYarnTypes] = useState<YarnTypeLookup[]>([]);
  const [ledgerSummary, setLedgerSummary] = useState<YarnLedgerSummary[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [outwards, setOutwards] = useState<YarnOutward[]>([]);

  const [selectedOutward, setSelectedOutward] = useState<YarnOutward | null>(null);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [completeData, setCompleteData] = useState({ quantityUsed: 0, quantityReturned: 0, notes: '' });
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoadingData(true);
    try {
      const [typesData, summaryRes, machinesRes, shiftsData, outwardsData] = await Promise.all([
        yarnTypesApi.getLookup(),
        api.get<{ data: YarnLedgerSummary[] }>('/yarn/ledger/summary').catch(() => ({ data: { data: [] } })),
        api.get<{ data: Machine[] }>('/machines').catch(() => ({ data: { data: [] } })),
        api.get<{ data: Shift[] }>('/shifts').then(r => r.data.data).catch(() => []),
        yarnOutwardApi.getAll({ limit: 50 }).then(r => r.data).catch(() => []),
      ]);

      // Safely extract data with fallbacks
      const summaryData = Array.isArray(summaryRes.data?.data) ? summaryRes.data.data : [];
      const machinesData = Array.isArray(machinesRes.data?.data) ? machinesRes.data.data : [];

      setYarnTypes(typesData || []);
      setLedgerSummary(summaryData);
      setMachines(machinesData);
      setShifts(shiftsData || []);
      setOutwards(outwardsData || []);
    } catch (error) {
      showToast('error', 'Failed to load data');
    } finally {
      setIsLoadingData(false);
    }
  };

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<OutwardForm>({
    resolver: zodResolver(outwardSchema),
    defaultValues: {
      issuedAt: new Date().toISOString().split('T')[0],
      purpose: 'PRODUCTION',
      quantityIssued: 0,
    },
  });

  const selectedYarnId = watch('yarnTypeId');
  const quantityIssued = watch('quantityIssued');

  // Get selected yarn stock info
  const selectedYarnStock = useMemo(() => {
    if (!selectedYarnId) return null;
    return ledgerSummary.find((s) => String(s.id) === selectedYarnId);
  }, [selectedYarnId, ledgerSummary]);

  const isOverStock = selectedYarnStock && quantityIssued > selectedYarnStock.currentBalance;

  const onSubmit = async (data: OutwardForm) => {
    if (isOverStock) {
      showToast('error', 'Quantity exceeds available stock');
      return;
    }

    setIsLoading(true);
    try {
      const result = await yarnOutwardApi.create({
        yarnTypeId: parseInt(data.yarnTypeId),
        quantityIssued: data.quantityIssued,
        machineId: parseInt(data.machineId),
        issuedAt: data.issuedAt,
        collectedBy: data.collectedBy,
        shiftId: data.shiftId ? parseInt(data.shiftId) : undefined,
        purpose: data.purpose,
        notes: data.notes || undefined,
      });

      showToast('success', `Outward ${result.outwardNumber} recorded`);
      reset();
      fetchData();
    } catch (error: any) {
      showToast('error', error.response?.data?.error || 'Failed to record outward');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStart = async (id: number) => {
    setActionLoading(id);
    try {
      await yarnOutwardApi.start(id);
      showToast('success', 'Marked as in use');
      fetchData();
    } catch (error: any) {
      showToast('error', error.response?.data?.error || 'Failed to start');
    } finally {
      setActionLoading(null);
    }
  };

  const handleComplete = async () => {
    if (!selectedOutward) return;
    setActionLoading(selectedOutward.id);
    try {
      await yarnOutwardApi.complete(selectedOutward.id, completeData);
      showToast('success', 'Outward completed');
      setShowCompleteModal(false);
      setSelectedOutward(null);
      setCompleteData({ quantityUsed: 0, quantityReturned: 0, notes: '' });
      fetchData();
    } catch (error: any) {
      showToast('error', error.response?.data?.error || 'Failed to complete');
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-PK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (isLoadingData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary-500/20 flex items-center justify-center">
          <ArrowUpFromLine className="w-5 h-5 text-primary-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Yarn Outward</h1>
          <p className="text-sm text-neutral-400">Issue yarn to machines for production</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Issue Form */}
        <div className="space-y-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Issue Yarn</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                    Yarn Type *
                  </label>
                  <select
                    {...register('yarnTypeId')}
                    className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Select Yarn Type</option>
                    {ledgerSummary.map((stock) => (
                      <option key={stock.id} value={stock.id}>
                        {stock.code} - {stock.name} ({stock.currentBalance.toFixed(1)} kg available)
                      </option>
                    ))}
                  </select>
                  {errors.yarnTypeId && (
                    <p className="mt-1 text-sm text-error">{errors.yarnTypeId.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Input
                      label="Quantity (KG) *"
                      type="number"
                      step="0.001"
                      placeholder="0"
                      error={errors.quantityIssued?.message}
                      {...register('quantityIssued')}
                    />
                    {selectedYarnStock && (
                      <p className={`mt-1 text-xs ${isOverStock ? 'text-error' : 'text-neutral-500'}`}>
                        Available: {selectedYarnStock.currentBalance.toFixed(1)} kg
                        {isOverStock && ' - Exceeds stock!'}
                      </p>
                    )}
                  </div>

                  <Input
                    label="Issue Date *"
                    type="date"
                    error={errors.issuedAt?.message}
                    {...register('issuedAt')}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                    Machine *
                  </label>
                  <select
                    {...register('machineId')}
                    className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Select Machine</option>
                    {machines.map((m) => (
                      <option key={m.id} value={m.id}>
                        Machine #{m.machineNumber} - {m.name}
                      </option>
                    ))}
                  </select>
                  {errors.machineId && (
                    <p className="mt-1 text-sm text-error">{errors.machineId.message}</p>
                  )}
                </div>

                <Input
                  label="Collected By *"
                  placeholder="Operator name"
                  error={errors.collectedBy?.message}
                  {...register('collectedBy')}
                />

                {shifts.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                      Shift (Optional)
                    </label>
                    <select
                      {...register('shiftId')}
                      className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">Select Shift</option>
                      {shifts.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.code})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                    Purpose
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.values(YARN_OUTWARD_PURPOSES).map((p) => (
                      <label key={p.code} className="relative cursor-pointer">
                        <input
                          type="radio"
                          value={p.code}
                          {...register('purpose')}
                          className="peer sr-only"
                        />
                        <div className="p-3 rounded-xl border border-factory-border bg-factory-gray peer-checked:border-primary-500 peer-checked:bg-primary-500/10 transition-colors text-center">
                          <p className="text-sm text-white">{p.label}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                    Notes (Optional)
                  </label>
                  <textarea
                    {...register('notes')}
                    rows={2}
                    className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Any notes..."
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <Button type="submit" disabled={isLoading || isOverStock}>
                  {isLoading ? 'Recording...' : 'Issue Yarn'}
                </Button>
              </div>
            </div>
          </form>
        </div>

        {/* Recent Outwards */}
        <div className="bg-factory-dark rounded-2xl border border-factory-border overflow-hidden">
          <div className="p-4 border-b border-factory-border">
            <h2 className="text-lg font-semibold text-white">Recent Outwards</h2>
          </div>

          {outwards.length === 0 ? (
            <div className="p-8 text-center text-neutral-400">No outward records yet</div>
          ) : (
            <div className="divide-y divide-factory-border max-h-[600px] overflow-y-auto">
              {outwards.map((o) => (
                <div key={o.id} className="p-4 hover:bg-factory-gray/30">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-mono text-sm text-primary-400">{o.outwardNumber}</p>
                      <p className="text-white">{o.yarnType?.name || 'Yarn'}</p>
                      <p className="text-sm text-neutral-400">
                        {o.quantityIssued} kg to Machine #{o.machine?.machineNumber}
                      </p>
                      <p className="text-xs text-neutral-500 mt-1">{formatDate(o.issuedAt)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        o.status === 'ISSUED' ? 'bg-blue-500/20 text-blue-400' :
                        o.status === 'IN_USE' ? 'bg-warning/20 text-warning' :
                        o.status === 'COMPLETED' ? 'bg-success/20 text-success' :
                        'bg-purple-500/20 text-purple-400'
                      }`}>
                        {YARN_OUTWARD_STATUSES[o.status].label}
                      </span>

                      {o.status === 'ISSUED' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleStart(o.id)}
                          disabled={actionLoading === o.id}
                          title="Start Using"
                        >
                          <Play className="w-4 h-4" />
                        </Button>
                      )}

                      {(o.status === 'ISSUED' || o.status === 'IN_USE') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedOutward(o);
                            setCompleteData({
                              quantityUsed: o.quantityIssued,
                              quantityReturned: 0,
                              notes: '',
                            });
                            setShowCompleteModal(true);
                          }}
                          title="Complete"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Complete Modal */}
      {showCompleteModal && selectedOutward && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-factory-dark rounded-2xl border border-factory-border w-full max-w-md">
            <div className="p-6 border-b border-factory-border flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Complete Outward</h2>
              <button onClick={() => setShowCompleteModal(false)} className="text-neutral-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="p-3 bg-factory-gray rounded-xl">
                <p className="text-sm text-neutral-400">Outward</p>
                <p className="text-white font-mono">{selectedOutward.outwardNumber}</p>
                <p className="text-sm text-neutral-400 mt-1">Issued: {selectedOutward.quantityIssued} kg</p>
              </div>

              <Input
                label="Quantity Used (KG)"
                type="number"
                step="0.001"
                value={completeData.quantityUsed}
                onChange={(e) => setCompleteData({ ...completeData, quantityUsed: Number(e.target.value) })}
              />

              <Input
                label="Quantity Returned (KG)"
                type="number"
                step="0.001"
                value={completeData.quantityReturned}
                onChange={(e) => setCompleteData({ ...completeData, quantityReturned: Number(e.target.value) })}
              />

              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1.5">Notes</label>
                <textarea
                  value={completeData.notes}
                  onChange={(e) => setCompleteData({ ...completeData, notes: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="secondary" onClick={() => setShowCompleteModal(false)}>
                  Cancel
                </Button>
                <Button onClick={handleComplete} disabled={actionLoading === selectedOutward.id}>
                  Complete
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
