'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { useToast } from '@/contexts/ToastContext';
import { yarnTypesApi } from '@/lib/api/yarn-types';
import { yarnVendorsApi } from '@/lib/api/yarn-vendors';
import { purchaseOrdersApi } from '@/lib/api/yarn-purchase-orders';
import { YarnTypeLookup } from '@/lib/types/yarn';
import { Plus, Trash2, FileText } from 'lucide-react';

interface VendorLookup {
  id: number;
  code: string;
  name: string;
}

// Form validation schema
const payOrderSchema = z.object({
  vendorId: z.string().min(1, 'Vendor is required'),
  orderDate: z.string().min(1, 'Order date is required'),
  expectedDeliveryDate: z.string().optional(),
  items: z
    .array(
      z.object({
        yarnTypeId: z.string().min(1, 'Yarn type is required'),
        orderedQuantity: z.coerce.number().positive('Quantity must be positive'),
        pricePerKg: z.coerce.number().optional(),
        notes: z.string().optional(),
      })
    )
    .min(1, 'At least one item is required'),
  terms: z.string().optional(),
  notes: z.string().optional(),
});

type PayOrderForm = z.infer<typeof payOrderSchema>;

export default function NewPayOrderPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [vendors, setVendors] = useState<VendorLookup[]>([]);
  const [yarnTypes, setYarnTypes] = useState<YarnTypeLookup[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

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
  } = useForm<PayOrderForm>({
    resolver: zodResolver(payOrderSchema),
    defaultValues: {
      orderDate: new Date().toISOString().split('T')[0],
      items: [{ yarnTypeId: '', orderedQuantity: 0, pricePerKg: undefined, notes: '' }],
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

  const watchedItems = watch('items');
  const watchedVendorId = watch('vendorId');

  // Calculate totals
  const totals = useMemo(() => {
    const items = watchedItems || [];
    let totalQuantity = 0;
    let totalAmount = 0;

    items.forEach((item) => {
      const qty = Number(item.orderedQuantity) || 0;
      const price = Number(item.pricePerKg) || 0;
      totalQuantity += qty;
      totalAmount += qty * price;
    });

    return { totalQuantity, totalAmount };
  }, [watchedItems]);

  const selectedVendor = vendors.find((v) => String(v.id) === watchedVendorId);

  // Auto-fill price when yarn type is selected
  const handleYarnTypeChange = (index: number, yarnTypeId: string) => {
    const yarnType = yarnTypes.find((y) => String(y.id) === yarnTypeId);
    if (yarnType?.defaultPricePerKg) {
      setValue(`items.${index}.pricePerKg`, yarnType.defaultPricePerKg);
    }
  };

  const onSubmit = async (data: PayOrderForm) => {
    setIsLoading(true);
    try {
      const result = await purchaseOrdersApi.create({
        vendorId: parseInt(data.vendorId),
        orderDate: data.orderDate,
        expectedDeliveryDate: data.expectedDeliveryDate || undefined,
        items: data.items.map((item) => ({
          yarnTypeId: parseInt(item.yarnTypeId),
          orderedQuantity: item.orderedQuantity,
          pricePerKg: item.pricePerKg || undefined,
          notes: item.notes || undefined,
        })),
        terms: data.terms || undefined,
        notes: data.notes || undefined,
      });

      showToast('success', `Order ${result.orderNumber} created as draft`);
      router.push('/yarn/pay-orders');
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to create order';
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
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-500/20 flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">New Purchase Order</h1>
              <p className="text-sm text-neutral-400">Create a yarn purchase order</p>
            </div>
          </div>
        </div>
        <Button variant="ghost" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Order Details */}
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Order Details</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                Vendor *
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
              {errors.vendorId && (
                <p className="mt-1 text-sm text-error">{errors.vendorId.message}</p>
              )}
            </div>

            <Input
              label="Order Date *"
              type="date"
              error={errors.orderDate?.message}
              {...register('orderDate')}
            />

            <Input
              label="Expected Delivery"
              type="date"
              {...register('expectedDeliveryDate')}
            />
          </div>

          {selectedVendor && (
            <div className="mt-4 p-3 bg-factory-gray rounded-xl">
              <p className="text-sm text-neutral-400">Selected Vendor</p>
              <p className="text-white font-medium">{selectedVendor.name}</p>
            </div>
          )}
        </div>

        {/* Order Items */}
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Order Items</h2>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() =>
                appendItem({ yarnTypeId: '', orderedQuantity: 0, pricePerKg: undefined, notes: '' })
              }
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Item
            </Button>
          </div>

          <div className="space-y-4">
            {itemFields.map((field, index) => {
              const selectedYarn = yarnTypes.find(
                (y) => String(y.id) === watchedItems?.[index]?.yarnTypeId
              );

              return (
                <div
                  key={field.id}
                  className="p-4 bg-factory-gray rounded-xl border border-factory-border"
                >
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-sm font-medium text-neutral-400">Item {index + 1}</span>
                    {itemFields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="p-1.5 text-neutral-400 hover:text-error hover:bg-error/10 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                            {yarn.code} - {yarn.name} ({yarn.brandName}, {yarn.color})
                          </option>
                        ))}
                      </select>
                      {errors.items?.[index]?.yarnTypeId && (
                        <p className="mt-1 text-sm text-error">
                          {errors.items[index]?.yarnTypeId?.message}
                        </p>
                      )}
                      {selectedYarn && (
                        <p className="mt-1 text-xs text-neutral-500">
                          Default price: Rs. {selectedYarn.defaultPricePerKg?.toLocaleString() || '-'}/kg
                        </p>
                      )}
                    </div>

                    <div>
                      <Input
                        label="Quantity (KG) *"
                        type="number"
                        step="0.001"
                        placeholder="0"
                        error={errors.items?.[index]?.orderedQuantity?.message}
                        {...register(`items.${index}.orderedQuantity`)}
                      />
                    </div>

                    <div>
                      <Input
                        label="Price/KG (PKR)"
                        type="number"
                        step="0.01"
                        placeholder="0"
                        {...register(`items.${index}.pricePerKg`)}
                      />
                    </div>
                  </div>

                  <div className="mt-3">
                    <Input
                      label="Item Notes (optional)"
                      placeholder="Any specific notes for this item..."
                      {...register(`items.${index}.notes`)}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {errors.items && typeof errors.items.message === 'string' && (
            <p className="mt-2 text-sm text-error">{errors.items.message}</p>
          )}
        </div>

        {/* Order Summary */}
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Order Summary</h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-factory-gray rounded-xl">
              <p className="text-sm text-neutral-400">Total Quantity</p>
              <p className="text-2xl font-semibold text-white">
                {totals.totalQuantity.toLocaleString()} kg
              </p>
              <p className="text-xs text-neutral-500 mt-1">
                {watchedItems?.length || 0} item(s)
              </p>
            </div>
            <div className="p-4 bg-factory-gray rounded-xl">
              <p className="text-sm text-neutral-400">Estimated Total</p>
              <p className="text-2xl font-semibold text-white">
                Rs. {totals.totalAmount.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
            <div className="flex items-start gap-3">
              <span className="text-lg">ℹ️</span>
              <div>
                <p className="text-sm font-medium text-blue-400">Order Workflow</p>
                <p className="text-xs text-neutral-400 mt-1">
                  Order will be created as Draft. After approval, mark as Sent to vendor, then receive boxes against it.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Terms & Notes */}
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Terms & Notes</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                Delivery Terms
              </label>
              <textarea
                {...register('terms')}
                rows={2}
                className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="e.g., Delivery at factory gate, payment on delivery..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                Additional Notes
              </label>
              <textarea
                {...register('notes')}
                rows={2}
                className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Any additional notes or special instructions..."
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Creating...' : 'Create Order'}
          </Button>
        </div>
      </form>
    </div>
  );
}
