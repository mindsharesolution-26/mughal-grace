'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { useToast } from '@/contexts/ToastContext';
import { yarnBoxesApi } from '@/lib/api/yarn-boxes';
import { yarnVendorsApi, VendorLookup } from '@/lib/api/yarn-vendors';
import { yarnTypesApi, YarnTypeLookup } from '@/lib/api/yarn-types';
import { purchaseOrdersApi } from '@/lib/api/yarn-purchase-orders';
import { PaymentStatus, PurchaseOrder } from '@/lib/types/yarn';
import { ArrowDownToLine, Plus, Trash2 } from 'lucide-react';

const coneSchema = z.object({
  coneNumber: z.string().min(1, 'Cone number required'),
  weight: z.coerce.number().positive('Weight must be positive'),
});

const inwardSchema = z.object({
  vendorId: z.coerce.number().positive('Vendor is required'),
  yarnTypeId: z.coerce.number().positive('Yarn type is required'),
  payOrderId: z.coerce.number().optional(),
  lotNumber: z.string().optional(),
  boxNumber: z.string().optional(),
  grossWeight: z.coerce.number().positive('Gross weight required'),
  tareWeight: z.coerce.number().min(0, 'Tare weight cannot be negative').default(0),
  pricePerKg: z.coerce.number().positive('Price per kg required'),
  receivedAt: z.string().min(1, 'Date is required'),
  invoiceNumber: z.string().optional(),
  gatePassNumber: z.string().optional(),
  paymentStatus: z.enum(['UNPAID', 'PARTIAL', 'PAID', 'OVERDUE']).optional(),
  notes: z.string().optional(),
  cones: z.array(coneSchema).optional(),
});

type InwardForm = z.infer<typeof inwardSchema>;

const PAYMENT_STATUSES: { value: PaymentStatus; label: string }[] = [
  { value: 'UNPAID', label: 'Unpaid' },
  { value: 'PARTIAL', label: 'Partial' },
  { value: 'PAID', label: 'Paid' },
  { value: 'OVERDUE', label: 'Overdue' },
];

export default function YarnInwardPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  // Data from API
  const [vendors, setVendors] = useState<VendorLookup[]>([]);
  const [yarnTypes, setYarnTypes] = useState<YarnTypeLookup[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<InwardForm>({
    resolver: zodResolver(inwardSchema),
    defaultValues: {
      receivedAt: new Date().toISOString().split('T')[0],
      grossWeight: 0,
      tareWeight: 0,
      pricePerKg: 0,
      paymentStatus: 'UNPAID',
      cones: [],
    },
  });

  const {
    fields: coneFields,
    append: appendCone,
    remove: removeCone,
  } = useFieldArray({
    control,
    name: 'cones',
  });

  // Fetch vendors, yarn types, and purchase orders on mount
  useEffect(() => {
    const fetchData = async () => {
      setLoadingData(true);
      try {
        const [vendorsData, yarnTypesData, posData] = await Promise.all([
          yarnVendorsApi.getLookup(),
          yarnTypesApi.getLookup(),
          purchaseOrdersApi.getAll().then(orders =>
            orders.filter(o => o.status === 'SENT' || o.status === 'PARTIALLY_RECEIVED')
          ),
        ]);
        setVendors(vendorsData);
        setYarnTypes(yarnTypesData);
        setPurchaseOrders(posData);
      } catch (error) {
        console.error('Failed to load data:', error);
        showToast('error', 'Failed to load form data');
      } finally {
        setLoadingData(false);
      }
    };
    fetchData();
  }, [showToast]);

  // Auto-fill price when yarn type is selected
  const selectedYarnTypeId = watch('yarnTypeId');
  useEffect(() => {
    if (selectedYarnTypeId) {
      const selectedType = yarnTypes.find(t => t.id === Number(selectedYarnTypeId));
      if (selectedType?.defaultPricePerKg) {
        setValue('pricePerKg', Number(selectedType.defaultPricePerKg));
      }
    }
  }, [selectedYarnTypeId, yarnTypes, setValue]);

  const onSubmit = async (data: InwardForm) => {
    setIsLoading(true);
    try {
      const result = await yarnBoxesApi.create({
        vendorId: data.vendorId,
        yarnTypeId: data.yarnTypeId,
        payOrderId: data.payOrderId || undefined,
        lotNumber: data.lotNumber || undefined,
        grossWeight: data.grossWeight,
        tareWeight: data.tareWeight || 0,
        pricePerKg: data.pricePerKg,
        receivedAt: data.receivedAt,
        invoiceNumber: data.invoiceNumber || undefined,
        gatePassNumber: data.gatePassNumber || undefined,
        paymentStatus: data.paymentStatus as PaymentStatus | undefined,
        notes: data.notes || undefined,
        cones: data.cones?.length ? data.cones : undefined,
      });

      showToast(
        'success',
        `Yarn inward recorded! Box: ${result.box.boxNumber}, Ledger entry created.`
      );
      router.push('/yarn/ledger');
    } catch (error: any) {
      console.error('Failed to create yarn inward:', error);
      showToast('error', error.response?.data?.error || 'Failed to record yarn inward');
    } finally {
      setIsLoading(false);
    }
  };

  const grossWeight = watch('grossWeight') || 0;
  const tareWeight = watch('tareWeight') || 0;
  const netWeight = grossWeight - tareWeight;
  const pricePerKg = watch('pricePerKg') || 0;
  const totalValue = netWeight * pricePerKg;

  // Get selected yarn type for display
  const selectedYarnType = yarnTypes.find(t => t.id === Number(selectedYarnTypeId));

  if (loadingData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-neutral-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-500/20 flex items-center justify-center">
            <ArrowDownToLine className="w-5 h-5 text-primary-400" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-white">New Yarn Inward</h1>
            <p className="text-neutral-400 mt-1">
              Record a new yarn receipt from vendor
            </p>
          </div>
        </div>
        <Button variant="ghost" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Vendor & Yarn Type */}
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
          <h2 className="text-lg font-semibold text-white mb-4">
            Vendor & Yarn Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <p className="mt-1 text-sm text-error">
                  {errors.vendorId.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                Yarn Type *
              </label>
              <select
                {...register('yarnTypeId')}
                className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Select Yarn Type</option>
                {yarnTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.code} - {type.name} ({type.brandName})
                  </option>
                ))}
              </select>
              {errors.yarnTypeId && (
                <p className="mt-1 text-sm text-error">
                  {errors.yarnTypeId.message}
                </p>
              )}
              {selectedYarnType && (
                <p className="mt-1 text-xs text-neutral-400">
                  Color: {selectedYarnType.color}
                  {selectedYarnType.defaultPricePerKg && ` | Default Price: Rs. ${selectedYarnType.defaultPricePerKg}/kg`}
                </p>
              )}
            </div>
          </div>

          {/* Purchase Order Link */}
          {purchaseOrders.length > 0 && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                Link to Purchase Order (Optional)
              </label>
              <select
                {...register('payOrderId')}
                className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">No Purchase Order</option>
                {purchaseOrders.map((po) => (
                  <option key={po.id} value={po.id}>
                    {po.orderNumber} - {po.vendor?.name} ({po.status === 'SENT' ? 'Sent' : 'Partial'})
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-neutral-400">
                Link this receipt to a purchase order to track deliveries
              </p>
            </div>
          )}
        </div>

        {/* Receipt Details */}
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
          <h2 className="text-lg font-semibold text-white mb-4">
            Receipt Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Input
              label="Lot Number"
              placeholder="LOT-2024-001"
              error={errors.lotNumber?.message}
              {...register('lotNumber')}
            />

            <Input
              label="Invoice Number"
              placeholder="INV-12345"
              error={errors.invoiceNumber?.message}
              {...register('invoiceNumber')}
            />

            <Input
              label="Gate Pass Number"
              placeholder="GP-001"
              error={errors.gatePassNumber?.message}
              {...register('gatePassNumber')}
            />

            <Input
              label="Received Date *"
              type="date"
              error={errors.receivedAt?.message}
              {...register('receivedAt')}
            />
          </div>
        </div>

        {/* Weight & Pricing */}
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
          <h2 className="text-lg font-semibold text-white mb-4">
            Weight & Pricing
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Input
              label="Gross Weight (kg) *"
              type="number"
              step="0.001"
              placeholder="25.500"
              error={errors.grossWeight?.message}
              {...register('grossWeight')}
            />

            <Input
              label="Tare Weight (kg)"
              type="number"
              step="0.001"
              placeholder="0.500"
              error={errors.tareWeight?.message}
              {...register('tareWeight')}
            />

            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                Net Weight (kg)
              </label>
              <div className="px-4 py-2.5 rounded-xl bg-factory-gray/50 border border-factory-border text-primary-400 font-medium">
                {netWeight.toFixed(3)} kg
              </div>
            </div>

            <Input
              label="Price per Kg (Rs.) *"
              type="number"
              step="0.01"
              placeholder="850.00"
              error={errors.pricePerKg?.message}
              {...register('pricePerKg')}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                Payment Status
              </label>
              <select
                {...register('paymentStatus')}
                className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {PAYMENT_STATUSES.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                Total Value
              </label>
              <div className="px-4 py-2.5 rounded-xl bg-primary-500/10 border border-primary-500/20 text-primary-400 font-semibold text-lg">
                Rs. {totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        </div>

        {/* Cones (Optional) */}
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-white">
                Cones (Optional)
              </h2>
              <p className="text-sm text-neutral-400 mt-1">
                Add individual cones if you want to track them separately
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => appendCone({ coneNumber: '', weight: 0 })}
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Cone
            </Button>
          </div>

          {coneFields.length > 0 ? (
            <div className="space-y-3">
              {coneFields.map((cone, index) => (
                <div
                  key={cone.id}
                  className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end p-3 bg-factory-gray/30 rounded-xl"
                >
                  <Input
                    label={index === 0 ? 'Cone Number' : undefined}
                    placeholder={`CONE-${String(index + 1).padStart(3, '0')}`}
                    error={errors.cones?.[index]?.coneNumber?.message}
                    {...register(`cones.${index}.coneNumber`)}
                  />
                  <Input
                    label={index === 0 ? 'Weight (kg)' : undefined}
                    type="number"
                    step="0.001"
                    placeholder="2.500"
                    error={errors.cones?.[index]?.weight?.message}
                    {...register(`cones.${index}.weight`)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeCone(index)}
                    className="text-error hover:bg-error/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}

              {/* Cones weight summary */}
              <div className="flex justify-between items-center pt-3 border-t border-factory-border">
                <span className="text-sm text-neutral-400">Total Cones Weight:</span>
                <span className="text-sm font-medium text-white">
                  {coneFields.reduce((sum, _, idx) => {
                    const weight = watch(`cones.${idx}.weight`) || 0;
                    return sum + Number(weight);
                  }, 0).toFixed(3)} kg
                </span>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-neutral-500 border border-dashed border-factory-border rounded-xl">
              No cones added. Click "Add Cone" to track individual cones.
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
          <label className="block text-sm font-medium text-neutral-300 mb-1.5">
            Notes (Optional)
          </label>
          <textarea
            {...register('notes')}
            rows={3}
            className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="Any additional notes about this receipt..."
          />
        </div>

        {/* Summary */}
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Summary</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-neutral-400">Yarn Type</p>
              <p className="text-lg font-semibold text-white">
                {selectedYarnType?.name || '-'}
              </p>
            </div>
            <div>
              <p className="text-sm text-neutral-400">Net Weight</p>
              <p className="text-lg font-semibold text-white">
                {netWeight.toFixed(3)} kg
              </p>
            </div>
            <div>
              <p className="text-sm text-neutral-400">Price/Kg</p>
              <p className="text-lg font-semibold text-white">
                Rs. {pricePerKg.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-neutral-400">Total Value</p>
              <p className="text-xl font-semibold text-primary-400">
                Rs. {totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Button variant="secondary" type="button" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save Inward Entry'}
          </Button>
        </div>
      </form>
    </div>
  );
}
