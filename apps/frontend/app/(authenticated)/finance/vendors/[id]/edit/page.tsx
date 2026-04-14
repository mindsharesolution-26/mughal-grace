'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { useToast } from '@/contexts/ToastContext';
import { YarnVendor } from '@/lib/types/vendor';

// Mock vendor data
const mockVendor: YarnVendor = {
  id: '1',
  code: 'VND-001',
  name: 'Textile Hub',
  contactPerson: 'Ahmad Khan',
  phone: '0300-1234567',
  email: 'ahmad@textilehub.pk',
  address: '123 Industrial Area, Block B',
  city: 'Faisalabad',
  country: 'Pakistan',
  creditLimit: 500000,
  paymentTerms: 30,
  currentBalance: 125000,
  rating: 4,
  isActive: true,
  notes: 'Reliable supplier for cotton yarns',
  createdAt: '2024-01-01',
  updatedAt: '2024-01-20',
};

// Form validation schema
const vendorSchema = z.object({
  code: z.string().min(3, 'Code must be at least 3 characters'),
  name: z.string().min(2, 'Name is required'),
  contactPerson: z.string().min(2, 'Contact person is required'),
  phone: z.string().min(10, 'Valid phone number required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  creditLimit: z.coerce.number().min(0, 'Credit limit must be positive'),
  paymentTerms: z.coerce.number().min(1, 'Payment terms required'),
  rating: z.coerce.number().min(1).max(5),
  isActive: z.boolean(),
  notes: z.string().optional(),
});

type VendorForm = z.infer<typeof vendorSchema>;

export default function EditVendorPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const vendorId = params.id as string;

  const [isLoading, setIsLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // In real app, fetch vendor data
  const vendor = mockVendor;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isDirty },
  } = useForm<VendorForm>({
    resolver: zodResolver(vendorSchema),
    defaultValues: {
      code: vendor.code,
      name: vendor.name,
      contactPerson: vendor.contactPerson,
      phone: vendor.phone,
      email: vendor.email || '',
      address: vendor.address || '',
      city: vendor.city || '',
      country: vendor.country || 'Pakistan',
      creditLimit: vendor.creditLimit,
      paymentTerms: vendor.paymentTerms,
      rating: vendor.rating,
      isActive: vendor.isActive,
      notes: vendor.notes || '',
    },
  });

  const watchedRating = watch('rating');

  // Track changes
  useEffect(() => {
    setHasChanges(isDirty);
  }, [isDirty]);

  const onSubmit = async (data: VendorForm) => {
    setIsLoading(true);
    try {
      // TODO: API call will go here

      showToast('success', `Vendor "${data.name}" updated successfully!`);
      router.push(`/finance/vendors/${vendorId}`);
    } catch (error) {
      showToast('error', 'Failed to update vendor');
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
            <Link href={`/finance/vendors/${vendorId}`} className="text-neutral-400 hover:text-white">
              {vendor.code}
            </Link>
            <span className="text-neutral-600">/</span>
            <span className="text-white">Edit</span>
          </div>
          <h1 className="text-2xl font-semibold text-white mt-2">Edit Vendor</h1>
          <p className="text-neutral-400 mt-1">
            Update vendor information for {vendor.name}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {hasChanges && (
            <span className="text-warning text-sm">Unsaved changes</span>
          )}
          <Button variant="ghost" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Information */}
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Basic Information</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Vendor Code */}
            <Input
              label="Vendor Code *"
              placeholder="e.g., VND-001"
              error={errors.code?.message}
              {...register('code')}
            />

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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          </div>

          <div className="mt-4 p-4 bg-factory-gray rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-neutral-400">Current Balance:</span>
              <span className="text-white font-medium">
                Rs. {vendor.currentBalance.toLocaleString()}
              </span>
            </div>
            <p className="text-sm text-neutral-500 mt-2">
              Balance cannot be edited directly. Use the ledger to record transactions.
            </p>
          </div>
        </div>

        {/* Rating & Status */}
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Rating & Status</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Rating */}
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-3">
                Vendor Rating
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setValue('rating', star, { shouldDirty: true })}
                    className={`text-3xl transition-colors ${
                      star <= watchedRating ? 'text-warning' : 'text-neutral-600 hover:text-neutral-400'
                    }`}
                  >
                    ★
                  </button>
                ))}
              </div>
              <p className="text-sm text-neutral-500 mt-2">
                {watchedRating === 1 && 'Poor'}
                {watchedRating === 2 && 'Below Average'}
                {watchedRating === 3 && 'Average'}
                {watchedRating === 4 && 'Good'}
                {watchedRating === 5 && 'Excellent'}
              </p>
            </div>

            {/* Active Status */}
            <div>
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
          </div>

          {/* Notes */}
          <div className="mt-6">
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

        {/* Audit Info */}
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Audit Information</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-neutral-400">Created</p>
              <p className="text-white">
                {new Date(vendor.createdAt).toLocaleDateString('en-PK', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
            <div>
              <p className="text-neutral-400">Last Updated</p>
              <p className="text-white">
                {new Date(vendor.updatedAt).toLocaleDateString('en-PK', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-between items-center">
          <Button
            type="button"
            variant="ghost"
            onClick={() => reset()}
            disabled={!hasChanges}
          >
            Reset Changes
          </Button>
          <div className="flex gap-3">
            <Button type="button" variant="secondary" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !hasChanges}>
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
