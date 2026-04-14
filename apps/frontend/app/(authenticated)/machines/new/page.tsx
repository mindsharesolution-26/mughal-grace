'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { useToast } from '@/contexts/ToastContext';
import { machinesApi } from '@/lib/api/machines';
import { MachineFormData, machineTypeLabels, MachineType } from '@/lib/types/machine';

const schema = z.object({
  machineNumber: z.string().min(1, 'Machine number is required').max(50),
  name: z.string().min(1, 'Name is required').max(255),
  brand: z.string().max(100).optional(),
  model: z.string().max(100).optional(),
  serialNumber: z.string().max(100).optional(),
  machineType: z.enum(['CIRCULAR_KNITTING', 'FLAT_KNITTING', 'WARP_KNITTING', 'JACQUARD']),
  gauge: z.number().int().positive().optional().nullable(),
  diameter: z.number().int().positive().optional().nullable(),
  feeders: z.number().int().positive().optional().nullable(),
  location: z.string().max(100).optional(),
  position: z.string().max(50).optional(),
  installationDate: z.string().optional(),
  needleGauge: z.number().int().positive().optional().nullable(),
  totalNeedleSlots: z.number().int().positive().optional().nullable(),
  cylinderNeedles: z.number().int().positive().optional().nullable(),
  dialNeedles: z.number().int().positive().optional().nullable(),
});

type FormData = z.infer<typeof schema>;

export default function NewMachinePage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      machineType: 'CIRCULAR_KNITTING',
    },
  });

  const selectedType = watch('machineType');

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      const cleanData = {
        ...data,
        gauge: data.gauge || undefined,
        diameter: data.diameter || undefined,
        feeders: data.feeders || undefined,
        needleGauge: data.needleGauge || undefined,
        totalNeedleSlots: data.totalNeedleSlots || undefined,
        cylinderNeedles: data.cylinderNeedles || undefined,
        dialNeedles: data.dialNeedles || undefined,
      };
      const machine = await machinesApi.create(cleanData as MachineFormData);
      showToast('success', 'Machine created successfully');
      router.push(`/machines/${machine.id}`);
    } catch (error: any) {
      showToast('error', error.response?.data?.error || 'Failed to create machine');
    } finally {
      setIsSubmitting(false);
    }
  };

  const machineTypes: MachineType[] = ['CIRCULAR_KNITTING', 'FLAT_KNITTING', 'WARP_KNITTING', 'JACQUARD'];

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm">
            <Link href="/machines" className="text-neutral-400 hover:text-white">
              Machines
            </Link>
            <span className="text-neutral-600">/</span>
            <span className="text-white">Add Machine</span>
          </div>
          <h1 className="text-2xl font-semibold text-white mt-2">Add New Machine</h1>
        </div>
        <Button variant="ghost" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Info */}
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Machine Number *"
              placeholder="M-001"
              error={errors.machineNumber?.message}
              {...register('machineNumber')}
            />
            <Input
              label="Name *"
              placeholder="Circular Knitting Machine 1"
              error={errors.name?.message}
              {...register('name')}
            />
            <Input
              label="Brand"
              placeholder="Mayer & Cie"
              error={errors.brand?.message}
              {...register('brand')}
            />
            <Input
              label="Model"
              placeholder="OVJA 1.6 E"
              error={errors.model?.message}
              {...register('model')}
            />
            <Input
              label="Serial Number"
              placeholder="MC-2024-0001"
              error={errors.serialNumber?.message}
              {...register('serialNumber')}
            />
            <Input
              label="Installation Date"
              type="date"
              error={errors.installationDate?.message}
              {...register('installationDate')}
            />
          </div>
        </div>

        {/* Machine Type */}
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Machine Type *</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {machineTypes.map((type) => (
              <label
                key={type}
                className={`flex items-center justify-center p-4 rounded-xl border cursor-pointer transition-colors ${
                  selectedType === type
                    ? 'border-primary-500 bg-primary-500/10'
                    : 'border-factory-border bg-factory-gray hover:border-neutral-500'
                }`}
              >
                <input
                  type="radio"
                  value={type}
                  {...register('machineType')}
                  className="sr-only"
                />
                <span className="text-white text-sm text-center">{machineTypeLabels[type]}</span>
              </label>
            ))}
          </div>
          {errors.machineType && (
            <p className="text-sm text-error mt-2">{errors.machineType.message}</p>
          )}
        </div>

        {/* Technical Specifications */}
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Technical Specifications</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Gauge"
              type="number"
              placeholder="18"
              error={errors.gauge?.message}
              {...register('gauge', { valueAsNumber: true })}
            />
            <Input
              label="Diameter (inches)"
              type="number"
              placeholder="30"
              error={errors.diameter?.message}
              {...register('diameter', { valueAsNumber: true })}
            />
            <Input
              label="Feeders"
              type="number"
              placeholder="96"
              error={errors.feeders?.message}
              {...register('feeders', { valueAsNumber: true })}
            />
          </div>
        </div>

        {/* Needle Configuration */}
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Needle Configuration</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Needle Gauge"
              type="number"
              placeholder="18"
              error={errors.needleGauge?.message}
              {...register('needleGauge', { valueAsNumber: true })}
            />
            <Input
              label="Total Needle Slots"
              type="number"
              placeholder="2640"
              error={errors.totalNeedleSlots?.message}
              {...register('totalNeedleSlots', { valueAsNumber: true })}
            />
            <Input
              label="Cylinder Needles"
              type="number"
              placeholder="1320"
              error={errors.cylinderNeedles?.message}
              {...register('cylinderNeedles', { valueAsNumber: true })}
            />
            <Input
              label="Dial Needles"
              type="number"
              placeholder="1320"
              error={errors.dialNeedles?.message}
              {...register('dialNeedles', { valueAsNumber: true })}
            />
          </div>
        </div>

        {/* Location */}
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Location</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Location"
              placeholder="Hall A"
              error={errors.location?.message}
              {...register('location')}
            />
            <Input
              label="Position"
              placeholder="Row 1, Bay 3"
              error={errors.position?.message}
              {...register('position')}
            />
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create Machine'}
          </Button>
        </div>
      </form>
    </div>
  );
}
