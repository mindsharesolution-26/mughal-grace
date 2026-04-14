'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { useToast } from '@/contexts/ToastContext';
import { needleTypesApi, needleStockApi, needleAllocationsApi } from '@/lib/api/needles';
import { NeedleTypeLookup, NeedleStockBatch } from '@/lib/types/needle';

const schema = z.object({
  needleTypeId: z.number({ required_error: 'Needle type is required' }).int().positive(),
  batchId: z.number().int().positive().optional().nullable(),
  installedQuantity: z.number({ required_error: 'Quantity is required' }).int().positive('Must be positive'),
  position: z.string().max(50).optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function InstallNeedlesPage() {
  const router = useRouter();
  const params = useParams();
  const machineId = Number(params.machineId);
  const { showToast } = useToast();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [needleTypes, setNeedleTypes] = useState<NeedleTypeLookup[]>([]);
  const [batches, setBatches] = useState<NeedleStockBatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const selectedTypeId = watch('needleTypeId');
  const selectedBatchId = watch('batchId');

  useEffect(() => {
    fetchNeedleTypes();
  }, []);

  useEffect(() => {
    if (selectedTypeId) {
      fetchBatches(selectedTypeId);
    }
  }, [selectedTypeId]);

  const fetchNeedleTypes = async () => {
    try {
      setIsLoading(true);
      const data = await needleTypesApi.getLookup();
      setNeedleTypes(data);
    } catch (error: any) {
      showToast('error', 'Failed to load needle types');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBatches = async (typeId: number) => {
    try {
      const data = await needleStockApi.getAll({
        needleTypeId: typeId,
        hasStock: true,
      });
      setBatches(data);
      setValue('batchId', null);
    } catch (error: any) {
      showToast('error', 'Failed to load stock batches');
    }
  };

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      await needleAllocationsApi.install(machineId, {
        needleTypeId: data.needleTypeId,
        batchId: data.batchId || undefined,
        installedQuantity: data.installedQuantity,
        position: data.position,
        notes: data.notes,
      });
      showToast('success', 'Needles installed successfully');
      router.push(`/needles/machines/${machineId}`);
    } catch (error: any) {
      showToast('error', error.response?.data?.error || 'Failed to install needles');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedBatch = batches.find((b) => b.id === selectedBatchId);

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
            <Link href="/needles/machines" className="text-neutral-400 hover:text-white">
              Machines
            </Link>
            <span className="text-neutral-600">/</span>
            <Link href={`/needles/machines/${machineId}`} className="text-neutral-400 hover:text-white">
              Machine
            </Link>
            <span className="text-neutral-600">/</span>
            <span className="text-white">Install</span>
          </div>
          <h1 className="text-2xl font-semibold text-white mt-2">Install Needles</h1>
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
          {/* Needle Type Selection */}
          <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Select Needle Type *</h2>
            <div className="space-y-3 max-h-64 overflow-y-auto">
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

          {/* Batch Selection */}
          {selectedTypeId && (
            <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
              <h2 className="text-lg font-semibold text-white mb-4">
                Select Stock Batch <span className="text-sm font-normal text-neutral-400">(Optional)</span>
              </h2>

              {batches.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-neutral-400">No stock batches available for this type</p>
                  <Link href="/needles/stock/receive">
                    <Button variant="secondary" className="mt-2">
                      Receive Stock
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3 max-h-48 overflow-y-auto">
                  <label
                    className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-colors ${
                      !selectedBatchId
                        ? 'border-primary-500 bg-primary-500/10'
                        : 'border-factory-border bg-factory-gray hover:border-neutral-500'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        value=""
                        checked={!selectedBatchId}
                        onChange={() => setValue('batchId', null)}
                        className="sr-only"
                      />
                      <div>
                        <p className="text-white font-medium">No specific batch</p>
                        <p className="text-sm text-neutral-400">Install without tracking batch</p>
                      </div>
                    </div>
                  </label>
                  {batches.map((batch) => (
                    <label
                      key={batch.id}
                      className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-colors ${
                        selectedBatchId === batch.id
                          ? 'border-primary-500 bg-primary-500/10'
                          : 'border-factory-border bg-factory-gray hover:border-neutral-500'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          value={batch.id}
                          {...register('batchId', { valueAsNumber: true })}
                          className="sr-only"
                        />
                        <div>
                          <p className="text-white font-medium">{batch.batchNumber}</p>
                          <p className="text-sm text-neutral-400">
                            Available: {batch.currentQuantity.toLocaleString()} |
                            Received: {new Date(batch.receivedDate).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <span className="text-success font-medium">
                        {batch.currentQuantity.toLocaleString()}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Installation Details */}
          <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Installation Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Input
                  label="Quantity to Install *"
                  type="number"
                  placeholder="500"
                  error={errors.installedQuantity?.message}
                  {...register('installedQuantity', { valueAsNumber: true })}
                />
                {selectedBatch && (
                  <p className="text-sm text-neutral-400 mt-1">
                    Available in batch: {selectedBatch.currentQuantity.toLocaleString()}
                  </p>
                )}
              </div>
              <Input
                label="Position"
                placeholder="Cylinder, Dial, etc."
                error={errors.position?.message}
                {...register('position')}
              />
            </div>
          </div>

          {/* Notes */}
          <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Notes</h2>
            <textarea
              className="w-full px-4 py-3 rounded-xl bg-factory-gray border border-factory-border text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              rows={2}
              placeholder="Installation notes..."
              {...register('notes')}
            />
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !selectedTypeId}>
              {isSubmitting ? 'Installing...' : 'Install Needles'}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
