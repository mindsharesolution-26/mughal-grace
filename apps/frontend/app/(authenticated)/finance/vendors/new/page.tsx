'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { useToast } from '@/contexts/ToastContext';
import { suggestVendorCode } from '@/lib/types/vendor';
import { yarnVendorsApi } from '@/lib/api/yarn-vendors';
import { dyeingVendorsApi } from '@/lib/api/dyeing';
import { suppliersApi, SUPPLIER_TYPES } from '@/lib/api/suppliers';

// Vendor types
const VENDOR_TYPES = [
  { value: 'YARN', label: 'Yarn Vendor', description: 'Suppliers of yarn and raw materials' },
  { value: 'DYEING', label: 'Dyeing Vendor', description: 'Dyeing and finishing service providers' },
  { value: 'GENERAL', label: 'General Supplier', description: 'Other suppliers (needles, spare parts, chemicals, etc.)' },
] as const;

type VendorType = typeof VENDOR_TYPES[number]['value'];

// Mock existing codes
const mockExistingCodes = ['VND-001', 'VND-002', 'VND-003', 'VND-004', 'VND-005'];

// Form validation schema
const vendorSchema = z.object({
  code: z.string().min(3, 'Code must be at least 3 characters'),
  name: z.string().min(2, 'Name is required'),
  supplierType: z.string().optional(),
  contactPerson: z.string().min(2, 'Contact person is required'),
  phone: z.string().min(10, 'Valid phone number required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  creditLimit: z.coerce.number().min(0, 'Credit limit must be positive'),
  paymentTerms: z.coerce.number().min(1, 'Payment terms required'),
  openingBalance: z.coerce.number().optional(),
  isActive: z.boolean(),
  notes: z.string().optional(),
});

type VendorForm = z.infer<typeof vendorSchema>;

export default function NewVendorPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [vendorType, setVendorType] = useState<VendorType>('YARN');

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<VendorForm>({
    resolver: zodResolver(vendorSchema),
    defaultValues: {
      code: '',
      name: '',
      supplierType: '',
      contactPerson: '',
      phone: '',
      email: '',
      address: '',
      city: '',
      country: 'Pakistan',
      creditLimit: 100000,
      paymentTerms: 30,
      openingBalance: 0,
      isActive: true,
      notes: '',
    },
  });

  const watchedName = watch('name');

  // Suggest code when name changes
  const suggestedCode = useMemo(() => {
    if (watchedName && watchedName.length >= 2) {
      return suggestVendorCode(watchedName, mockExistingCodes);
    }
    return '';
  }, [watchedName]);

  const onSubmit = async (data: VendorForm) => {
    setIsLoading(true);
    try {
      if (vendorType === 'YARN') {
        await yarnVendorsApi.create({
          code: data.code,
          name: data.name,
          contactPerson: data.contactPerson || undefined,
          phone: data.phone || undefined,
          email: data.email || undefined,
          address: data.address || undefined,
          city: data.city || undefined,
          creditLimit: data.creditLimit || undefined,
          paymentTerms: data.paymentTerms || undefined,
          notes: data.notes || undefined,
          isActive: data.isActive,
        });
      } else if (vendorType === 'DYEING') {
        await dyeingVendorsApi.create({
          code: data.code,
          name: data.name,
          contactPerson: data.contactPerson || undefined,
          phone: data.phone || undefined,
          email: data.email || undefined,
          address: data.address || undefined,
          city: data.city || undefined,
          paymentTerms: data.paymentTerms ? `${data.paymentTerms} Days` : undefined,
        });
      } else {
        // General supplier
        await suppliersApi.create({
          name: data.name,
          supplierType: data.supplierType || undefined,
          contactPerson: data.contactPerson || undefined,
          phone: data.phone || undefined,
          email: data.email || undefined,
          address: data.address || undefined,
          city: data.city || undefined,
          creditLimit: data.creditLimit || undefined,
          paymentTerms: data.paymentTerms || undefined,
          notes: data.notes || undefined,
          isActive: data.isActive,
        });
      }

      const typeLabel = vendorType === 'YARN' ? 'Yarn vendor' : vendorType === 'DYEING' ? 'Dyeing vendor' : 'General supplier';
      showToast('success', `${typeLabel} "${data.name}" created successfully!`);
      router.push('/finance/vendors');
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to create vendor';
      showToast('error', message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm">
            <Link href="/finance" className="text-neutral-400 hover:text-white">
              Finance
            </Link>
            <span className="text-neutral-600">/</span>
            <Link href="/finance/vendors" className="text-neutral-400 hover:text-white">
              Vendors
            </Link>
            <span className="text-neutral-600">/</span>
            <span className="text-white">New</span>
          </div>
          <h1 className="text-2xl font-semibold text-white mt-2">Add New Vendor</h1>
          <p className="text-neutral-400 mt-1">
            Create a new vendor record with contact and financial details
          </p>
        </div>
        <Button variant="ghost" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Vendor Type Selection */}
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Vendor Type</h2>
          <p className="text-sm text-neutral-400 mb-4">
            Select the type of vendor you want to create
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {VENDOR_TYPES.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => setVendorType(type.value)}
                className={`p-4 rounded-xl border text-left transition-all ${
                  vendorType === type.value
                    ? 'bg-primary-500/10 border-primary-500'
                    : 'bg-factory-gray/30 border-factory-border hover:border-neutral-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-white">{type.label}</p>
                    <p className="text-sm text-neutral-400 mt-1">{type.description}</p>
                  </div>
                  {vendorType === type.value && (
                    <div className="w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center flex-shrink-0 ml-2">
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Supplier Type dropdown for GENERAL vendors */}
          {vendorType === 'GENERAL' && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                Supplier Category
              </label>
              <select
                {...register('supplierType')}
                className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Select category...</option>
                {SUPPLIER_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              <p className="text-sm text-neutral-500 mt-1">
                Categorize this supplier for better organization and reporting
              </p>
            </div>
          )}
        </div>

        {/* Basic Information */}
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Basic Information</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Vendor Code */}
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                Vendor Code *
              </label>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g., VND-001"
                  error={errors.code?.message}
                  className="flex-1"
                  {...register('code')}
                />
                {suggestedCode && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setValue('code', suggestedCode)}
                  >
                    Use: {suggestedCode}
                  </Button>
                )}
              </div>
            </div>

            {/* Vendor Name */}
            <Input
              label="Vendor Name *"
              placeholder="Enter vendor name"
              error={errors.name?.message}
              {...register('name')}
            />

            {/* Contact Person */}
            <Input
              label="Contact Person *"
              placeholder="Primary contact name"
              error={errors.contactPerson?.message}
              {...register('contactPerson')}
            />

            {/* Phone */}
            <Input
              label="Phone Number *"
              placeholder="e.g., 0300-1234567"
              error={errors.phone?.message}
              {...register('phone')}
            />

            {/* Email */}
            <Input
              label="Email"
              type="email"
              placeholder="email@example.com"
              error={errors.email?.message}
              {...register('email')}
            />
          </div>
        </div>

        {/* Address */}
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Address</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-3">
              <Input
                label="Address"
                placeholder="Street address"
                {...register('address')}
              />
            </div>

            <Input
              label="City"
              placeholder="City"
              {...register('city')}
            />

            <Input
              label="Country"
              placeholder="Country"
              {...register('country')}
            />
          </div>
        </div>

        {/* Financial Terms */}
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Financial Terms</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Credit Limit (PKR) *"
              type="number"
              placeholder="0"
              error={errors.creditLimit?.message}
              {...register('creditLimit')}
            />

            <Input
              label="Payment Terms (Days) *"
              type="number"
              placeholder="30"
              error={errors.paymentTerms?.message}
              {...register('paymentTerms')}
            />

            <Input
              label="Opening Balance (PKR)"
              type="number"
              placeholder="0"
              error={errors.openingBalance?.message}
              {...register('openingBalance')}
            />
          </div>

          <div className="mt-4 p-4 bg-factory-gray rounded-xl">
            <p className="text-sm text-neutral-400">
              <span className="text-white font-medium">Note:</span> Opening balance is the amount you currently owe to this vendor. It will be recorded as the starting balance in their ledger.
            </p>
          </div>
        </div>

        {/* Status & Notes */}
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Status & Notes</h2>

          {/* Active Status */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-neutral-300 mb-3">
              Status
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="w-5 h-5 rounded border-factory-border bg-factory-gray text-primary-500 focus:ring-primary-500"
                {...register('isActive')}
              />
              <span className="text-white">Vendor is Active</span>
            </label>
            <p className="text-sm text-neutral-500 mt-2">
              Inactive vendors won&apos;t appear in selection lists
            </p>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1.5">
              Notes
            </label>
            <textarea
              {...register('notes')}
              rows={3}
              className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Any additional notes about this vendor..."
            />
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Creating...' : 'Create Vendor'}
          </Button>
        </div>
      </form>
    </div>
  );
}
