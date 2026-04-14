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
import { needleTypesApi, needleStockApi } from '@/lib/api/needles';
import { NeedleTypeLookup } from '@/lib/types/needle';

const schema = z.object({
  needleTypeId: z.number({ required_error: 'Needle type is required' }).int().positive(),
  receivedQuantity: z.number({ required_error: 'Quantity is required' }).int().positive('Quantity must be positive'),
  receivedDate: z.string().optional(),
  invoiceNumber: z.string().max(50).optional(),
  invoiceDate: z.string().optional(),
  unitCost: z.number().positive().optional().nullable(),
  supplierName: z.string().max(200).optional(),
  collectorName: z.string().max(100).optional(),
  collectionDate: z.string().optional(),
  lotNumber: z.string().max(50).optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function ReceiveStockPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [needleTypes, setNeedleTypes] = useState<NeedleTypeLookup[]>([]);
  const [isLoadingTypes, setIsLoadingTypes] = useState(true);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      receivedDate: new Date().toISOString().split('T')[0],
    },
  });

  const selectedTypeId = watch('needleTypeId');
  const quantity = watch('receivedQuantity');
  const unitCost = watch('unitCost');

  useEffect(() => {
    fetchNeedleTypes();
  }, []);

  const fetchNeedleTypes = async () => {
    try {
      setIsLoadingTypes(true);
      const data = await needleTypesApi.getLookup();
      setNeedleTypes(data);
    } catch (error: any) {
      showToast('error', 'Failed to load needle types');
    } finally {
      setIsLoadingTypes(false);
    }
  };

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      await needleStockApi.receive({
        ...data,
        unitCost: data.unitCost || undefined,
      });
      showToast('success', 'Stock received successfully');
      router.push('/needles/stock');
    } catch (error: any) {
      showToast('error', error.response?.data?.error || 'Failed to receive stock');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedType = needleTypes.find((t) => t.id === selectedTypeId);
  const totalCost = quantity && unitCost ? quantity * unitCost : null;

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
            <Link href="/needles/stock" className="text-neutral-400 hover:text-white">
              Stock
            </Link>
            <span className="text-neutral-600">/</span>
            <span className="text-white">Receive</span>
          </div>
          <h1 className="text-2xl font-semibold text-white mt-2">Receive Stock</h1>
        </div>
        <Button variant="ghost" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Needle Selection */}
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Needle Type</h2>

          {isLoadingTypes ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500"></div>
              <span className="ml-2 text-neutral-400">Loading types...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
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
                  <span className="text-sm text-neutral-500">{type.needleKind}</span>
                </label>
              ))}
            </div>
          )}
          {errors.needleTypeId && (
            <p className="text-sm text-error mt-2">{errors.needleTypeId.message}</p>
          )}
        </div>

        {/* Quantity & Pricing */}
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Quantity & Pricing</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Quantity *"
              type="number"
              placeholder="1000"
              error={errors.receivedQuantity?.message}
              {...register('receivedQuantity', { valueAsNumber: true })}
            />
            <Input
              label="Unit Cost (per needle)"
              type="number"
              step="0.01"
              placeholder="25.00"
              error={errors.unitCost?.message}
              {...register('unitCost', { valueAsNumber: true })}
            />
          </div>
          {totalCost && (
            <div className="mt-4 p-3 bg-factory-gray rounded-lg">
              <p className="text-sm text-neutral-400">Total Cost</p>
              <p className="text-lg font-semibold text-white">
                PKR {totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>
          )}
        </div>

        {/* Receipt Info */}
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Receipt Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Received Date"
              type="date"
              error={errors.receivedDate?.message}
              {...register('receivedDate')}
            />
            <Input
              label="Invoice Number"
              placeholder="INV-2024-001"
              error={errors.invoiceNumber?.message}
              {...register('invoiceNumber')}
            />
            <Input
              label="Invoice Date"
              type="date"
              error={errors.invoiceDate?.message}
              {...register('invoiceDate')}
            />
            <Input
              label="Lot Number"
              placeholder="LOT-001"
              error={errors.lotNumber?.message}
              {...register('lotNumber')}
            />
            <Input
              label="Supplier Name"
              placeholder="ABC Needle Suppliers"
              error={errors.supplierName?.message}
              {...register('supplierName')}
            />
          </div>
        </div>

        {/* Collection Info */}
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Collection Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Collected By"
              placeholder="Name of person who collected"
              error={errors.collectorName?.message}
              {...register('collectorName')}
            />
            <Input
              label="Collection Date"
              type="date"
              error={errors.collectionDate?.message}
              {...register('collectionDate')}
            />
          </div>
        </div>

        {/* Notes */}
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Notes</h2>
          <textarea
            className="w-full px-4 py-3 rounded-xl bg-factory-gray border border-factory-border text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            rows={3}
            placeholder="Additional notes about this stock receipt..."
            {...register('notes')}
          />
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting || !selectedTypeId}>
            {isSubmitting ? 'Receiving...' : 'Receive Stock'}
          </Button>
        </div>
      </form>
    </div>
  );
}
