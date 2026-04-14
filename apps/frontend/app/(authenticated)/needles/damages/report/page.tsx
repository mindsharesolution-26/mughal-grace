'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { useToast } from '@/contexts/ToastContext';
import { needleTypesApi, needleDamageApi, needleReportsApi } from '@/lib/api/needles';
import {
  NeedleTypeLookup,
  MachineNeedleStatus,
  DamageType,
  DamageCause,
  damageTypeLabels,
  damageCauseLabels,
} from '@/lib/types/needle';

const schema = z.object({
  needleTypeId: z.number({ required_error: 'Needle type is required' }).int().positive(),
  machineId: z.number().int().positive().optional().nullable(),
  damageDate: z.string().optional(),
  damageType: z.enum(['BROKEN', 'BENT', 'WORN', 'HOOK_DAMAGE', 'LATCH_DAMAGE'] as const),
  damagedQuantity: z.number({ required_error: 'Quantity is required' }).int().positive('Must be positive'),
  cause: z.enum(['YARN_KNOT', 'METAL_FATIGUE', 'OPERATOR_ERROR', 'UNKNOWN'] as const).optional(),
  description: z.string().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function ReportDamagePage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [needleTypes, setNeedleTypes] = useState<NeedleTypeLookup[]>([]);
  const [machines, setMachines] = useState<MachineNeedleStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      damageDate: new Date().toISOString().split('T')[0],
      damageType: 'BROKEN',
      cause: 'UNKNOWN',
    },
  });

  const selectedTypeId = watch('needleTypeId');
  const selectedDamageType = watch('damageType');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [typesData, machinesData] = await Promise.all([
        needleTypesApi.getLookup(),
        needleReportsApi.getMachineStatus(),
      ]);
      setNeedleTypes(typesData);
      setMachines(machinesData);
    } catch (error: any) {
      showToast('error', 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      await needleDamageApi.report({
        ...data,
        machineId: data.machineId || undefined,
      });
      showToast('success', 'Damage reported successfully');
      router.push('/needles/damages');
    } catch (error: any) {
      showToast('error', error.response?.data?.error || 'Failed to report damage');
    } finally {
      setIsSubmitting(false);
    }
  };

  const damageTypes: DamageType[] = ['BROKEN', 'BENT', 'WORN', 'HOOK_DAMAGE', 'LATCH_DAMAGE'];
  const damageCauses: DamageCause[] = ['YARN_KNOT', 'METAL_FATIGUE', 'OPERATOR_ERROR', 'UNKNOWN'];

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm">
            <Link href="/needles" className="text-neutral-400 hover:text-white">
              Needles
            </Link>
            <span className="text-neutral-600">/</span>
            <Link href="/needles/damages" className="text-neutral-400 hover:text-white">
              Damages
            </Link>
            <span className="text-neutral-600">/</span>
            <span className="text-white">Report</span>
          </div>
          <h1 className="text-2xl font-semibold text-white mt-2">Report Damage</h1>
        </div>
        <Button variant="ghost" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
          <span className="ml-3 text-neutral-400">Loading...</span>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Needle Type */}
          <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Needle Type *</h2>
            <div className="grid grid-cols-1 gap-3 max-h-64 overflow-y-auto">
              {needleTypes.map((type) => (
                <label
                  key={type.id}
                  className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-colors ${
                    selectedTypeId === type.id
                      ? 'border-primary-500 bg-primary-500/10'
                      : 'border-factory-border bg-factory-gray hover:border-neutral-500'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      value={type.id}
                      {...register('needleTypeId', { valueAsNumber: true })}
                      className="sr-only"
                    />
                    <div>
                      <p className="text-white font-medium">{type.name}</p>
                      <p className="text-sm text-neutral-400">
                        {type.code} | {type.gauge}G | {type.material}
                      </p>
                    </div>
                  </div>
                </label>
              ))}
            </div>
            {errors.needleTypeId && (
              <p className="text-sm text-error mt-2">{errors.needleTypeId.message}</p>
            )}
          </div>

          {/* Machine (Optional) */}
          <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
            <h2 className="text-lg font-semibold text-white mb-4">
              Machine <span className="text-sm font-normal text-neutral-400">(Optional)</span>
            </h2>
            <p className="text-sm text-neutral-400 mb-3">
              Select if damage occurred on a specific machine
            </p>
            <select
              className="w-full px-4 py-3 rounded-xl bg-factory-gray border border-factory-border text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              {...register('machineId', { valueAsNumber: true })}
            >
              <option value="">No specific machine</option>
              {machines.map((m) => (
                <option key={m.machine.id} value={m.machine.id}>
                  {m.machine.machineNumber} - {m.machine.name}
                </option>
              ))}
            </select>
          </div>

          {/* Damage Details */}
          <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Damage Details</h2>

            <div className="space-y-4">
              {/* Damage Type */}
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-3">
                  Damage Type *
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {damageTypes.map((type) => (
                    <label
                      key={type}
                      className={`flex items-center justify-center p-3 rounded-xl border cursor-pointer transition-colors ${
                        selectedDamageType === type
                          ? 'border-primary-500 bg-primary-500/10'
                          : 'border-factory-border bg-factory-gray hover:border-neutral-500'
                      }`}
                    >
                      <input
                        type="radio"
                        value={type}
                        {...register('damageType')}
                        className="sr-only"
                      />
                      <span className="text-white text-sm">{damageTypeLabels[type]}</span>
                    </label>
                  ))}
                </div>
                {errors.damageType && (
                  <p className="text-sm text-error mt-2">{errors.damageType.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Quantity Damaged *"
                  type="number"
                  placeholder="10"
                  error={errors.damagedQuantity?.message}
                  {...register('damagedQuantity', { valueAsNumber: true })}
                />
                <Input
                  label="Damage Date"
                  type="date"
                  error={errors.damageDate?.message}
                  {...register('damageDate')}
                />
              </div>

              {/* Cause */}
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-3">
                  Cause
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {damageCauses.map((cause) => (
                    <label
                      key={cause}
                      className="flex items-center gap-3 p-3 rounded-xl border border-factory-border bg-factory-gray hover:border-neutral-500 cursor-pointer"
                    >
                      <input
                        type="radio"
                        value={cause}
                        {...register('cause')}
                      />
                      <span className="text-white text-sm">{damageCauseLabels[cause]}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Description
                </label>
                <textarea
                  className="w-full px-4 py-3 rounded-xl bg-factory-gray border border-factory-border text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                  rows={3}
                  placeholder="Describe what happened..."
                  {...register('description')}
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Additional Notes</h2>
            <textarea
              className="w-full px-4 py-3 rounded-xl bg-factory-gray border border-factory-border text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              rows={2}
              placeholder="Any additional notes..."
              {...register('notes')}
            />
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !selectedTypeId}>
              {isSubmitting ? 'Reporting...' : 'Report Damage'}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
