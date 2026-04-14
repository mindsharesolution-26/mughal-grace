'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { useToast } from '@/contexts/ToastContext';
import { yarnTypesApi, YarnTypeLookup } from '@/lib/api/yarn-types';
import { yarnVendorsApi, VendorLookup } from '@/lib/api/yarn-vendors';

const unitOptions = [
  { value: 'KG', label: 'Kilograms (kg)' },
  { value: 'cones', label: 'Cones' },
  { value: 'bags', label: 'Bags' },
  { value: 'boxes', label: 'Boxes' },
];

const sourceOptions = [
  { value: 'VENDOR', label: 'Vendor Purchase' },
  { value: 'RETURN', label: 'Production Return' },
  { value: 'TRANSFER', label: 'Inter-warehouse Transfer' },
  { value: 'ADJUSTMENT', label: 'Stock Adjustment' },
];

// Form validation schema
const stockInSchema = z.object({
  sourceType: z.string().min(1, 'Source type is required'),
  vendorId: z.string().optional(),
  receiptDate: z.string().min(1, 'Receipt date is required'),
  referenceNumber: z.string().optional(),
  items: z
    .array(
      z.object({
        yarnTypeId: z.string().min(1, 'Yarn type is required'),
        quantity: z.coerce.number().positive('Quantity must be positive'),
        unit: z.string().min(1, 'Unit is required'),
        batchNumber: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .min(1, 'At least one item is required'),
  notes: z.string().optional(),
});

type StockInForm = z.infer<typeof stockInSchema>;

export default function StockInPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [vendors, setVendors] = useState<VendorLookup[]>([]);
  const [yarnTypes, setYarnTypes] = useState<YarnTypeLookup[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Fetch vendors and yarn types on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [vendorsData, yarnTypesData] = await Promise.all([
          yarnVendorsApi.getLookup(),
          yarnTypesApi.getLookup(),
        ]);
        setVendors(vendorsData);
        setYarnTypes(yarnTypesData);
      } catch (error: any) {
        showToast('error', 'Failed to load form data');
      } finally {
        setIsLoadingData(false);
      }
    };
    fetchData();
  }, [showToast]);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<StockInForm>({
    resolver: zodResolver(stockInSchema),
    defaultValues: {
      sourceType: 'VENDOR',
      receiptDate: new Date().toISOString().split('T')[0],
      items: [{ yarnTypeId: '', quantity: 0, unit: 'KG', batchNumber: '', notes: '' }],
    },
  });

  const {
    fields: itemFields,
    append: appendItem,
    remove: removeItem,
  } = useFieldArray({
    control,
    name: 'items',
  });

  const watchedSourceType = watch('sourceType');
  const watchedItems = watch('items');

  // Handle yarn type selection
  const handleYarnTypeChange = (_index: number, _yarnTypeId: string) => {
    // YarnTypeLookup doesn't include priceUnit, so we just track selection
  };

  // Calculate totals
  const totalQuantity = watchedItems?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;

  const onSubmit = async (data: StockInForm) => {
    setIsLoading(true);
    try {
      // TODO: Replace with actual API call
      showToast('success', 'Stock received successfully!');
      router.push('/stock');
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to record stock in';
      showToast('error', message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoadingData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm">
            <Link href="/stock" className="text-neutral-400 hover:text-white">
              Stock
            </Link>
            <span className="text-neutral-600">/</span>
            <span className="text-white">Stock In</span>
          </div>
          <h1 className="text-2xl font-semibold text-white mt-2">Stock In</h1>
          <p className="text-neutral-400 mt-1">Record incoming stock</p>
        </div>
        <Button variant="ghost" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>

      {/* Stock In Banner */}
      <div className="bg-success/10 border border-success/30 rounded-2xl p-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">📥</span>
          <div>
            <p className="text-sm text-neutral-400">Recording</p>
            <p className="text-xl font-semibold text-success">Incoming Stock</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Source Details */}
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Source Details</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Source Type */}
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                Source Type *
              </label>
              <select
                {...register('sourceType')}
                className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {sourceOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {errors.sourceType && (
                <p className="mt-1 text-sm text-error">{errors.sourceType.message}</p>
              )}
            </div>

            {/* Vendor (only if source is VENDOR) */}
            {watchedSourceType === 'VENDOR' && (
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                  Vendor
                </label>
                <select
                  {...register('vendorId')}
                  className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Select Vendor</option>
                  {vendors.map((vendor) => (
                    <option key={vendor.id} value={vendor.id}>
                      {vendor.code} - {vendor.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Receipt Date */}
            <Input
              label="Receipt Date *"
              type="date"
              error={errors.receiptDate?.message}
              {...register('receiptDate')}
            />

            {/* Reference Number */}
            <Input
              label="Reference Number"
              placeholder="e.g., Invoice #, GRN #"
              {...register('referenceNumber')}
            />
          </div>
        </div>

        {/* Stock Items */}
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Stock Items</h2>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() =>
                appendItem({ yarnTypeId: '', quantity: 0, unit: 'KG', batchNumber: '', notes: '' })
              }
            >
              + Add Item
            </Button>
          </div>

          <div className="space-y-4">
            {itemFields.map((field, index) => (
              <div
                key={field.id}
                className="p-4 bg-factory-gray rounded-xl border border-factory-border"
              >
                <div className="flex items-start justify-between mb-3">
                  <span className="text-sm font-medium text-neutral-400">
                    Item {index + 1}
                  </span>
                  {itemFields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(index)}
                    >
                      Remove
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* Yarn Type */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                      Yarn Type *
                    </label>
                    <select
                      {...register(`items.${index}.yarnTypeId`)}
                      onChange={(e) => {
                        register(`items.${index}.yarnTypeId`).onChange(e);
                        handleYarnTypeChange(index, e.target.value);
                      }}
                      className="w-full px-4 py-2.5 rounded-xl bg-factory-dark border border-factory-border text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">Select Yarn Type</option>
                      {yarnTypes.map((yarn) => (
                        <option key={yarn.id} value={yarn.id}>
                          {yarn.code} - {yarn.name}
                        </option>
                      ))}
                    </select>
                    {errors.items?.[index]?.yarnTypeId && (
                      <p className="mt-1 text-sm text-error">
                        {errors.items[index]?.yarnTypeId?.message}
                      </p>
                    )}
                  </div>

                  {/* Quantity */}
                  <div>
                    <Input
                      label="Quantity *"
                      type="number"
                      step="0.001"
                      placeholder="0"
                      error={errors.items?.[index]?.quantity?.message}
                      {...register(`items.${index}.quantity`)}
                    />
                  </div>

                  {/* Unit */}
                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                      Unit *
                    </label>
                    <select
                      {...register(`items.${index}.unit`)}
                      className="w-full px-4 py-2.5 rounded-xl bg-factory-dark border border-factory-border text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      {unitOptions.map((unit) => (
                        <option key={unit.value} value={unit.value}>
                          {unit.label}
                        </option>
                      ))}
                    </select>
                    {errors.items?.[index]?.unit && (
                      <p className="mt-1 text-sm text-error">
                        {errors.items[index]?.unit?.message}
                      </p>
                    )}
                  </div>
                </div>

                {/* Batch Number and Notes */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                  <Input
                    label="Batch Number (optional)"
                    placeholder="e.g., BATCH-2024-001"
                    {...register(`items.${index}.batchNumber`)}
                  />
                  <Input
                    label="Item Notes (optional)"
                    placeholder="Any specific notes..."
                    {...register(`items.${index}.notes`)}
                  />
                </div>
              </div>
            ))}
          </div>

          {errors.items && typeof errors.items.message === 'string' && (
            <p className="mt-2 text-sm text-error">{errors.items.message}</p>
          )}
        </div>

        {/* Summary */}
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Summary</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-success/10 border border-success/30 rounded-xl">
              <p className="text-sm text-neutral-400">Total Quantity</p>
              <p className="text-2xl font-semibold text-success">
                +{totalQuantity.toLocaleString()} kg
              </p>
              <p className="text-xs text-neutral-500 mt-1">
                {watchedItems?.length || 0} item(s)
              </p>
            </div>
            <div className="p-4 bg-factory-gray rounded-xl">
              <p className="text-sm text-neutral-400">Source</p>
              <p className="text-lg font-medium text-white">
                {sourceOptions.find((s) => s.value === watchedSourceType)?.label}
              </p>
            </div>
          </div>
        </div>

        {/* Additional Notes */}
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Additional Notes</h2>
          <textarea
            {...register('notes')}
            rows={3}
            className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="Any additional notes about this stock receipt..."
          />
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Recording...' : 'Record Stock In'}
          </Button>
        </div>
      </form>
    </div>
  );
}
