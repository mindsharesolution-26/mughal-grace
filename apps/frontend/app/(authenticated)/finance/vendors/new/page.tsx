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

// Mock existing codes
const mockExistingCodes = ['VND-001', 'VND-002', 'VND-003', 'VND-004', 'VND-005'];

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
  openingBalance: z.coerce.number().optional(),
  rating: z.coerce.number().min(1).max(5),
  isActive: z.boolean(),
  notes: z.string().optional(),
});

type VendorForm = z.infer<typeof vendorSchema>;

export default function NewVendorPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

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
      contactPerson: '',
      phone: '',
      email: '',
      address: '',
      city: '',
      country: 'Pakistan',
      creditLimit: 100000,
      paymentTerms: 30,
      openingBalance: 0,
      rating: 3,
      isActive: true,
      notes: '',
    },
  });

  const watchedName = watch('name');
  const watchedRating = watch('rating');

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
      // TODO: API call will go here

      showToast('success', `Vendor "${data.name}" created successfully!`);
      router.push('/finance/vendors');
    } catch (error) {
      showToast('error', 'Failed to create vendor');
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
                    onClick={() => setValue('rating', star)}
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
