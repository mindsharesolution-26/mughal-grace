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

// Pakistani cities for dropdown
const PAKISTAN_CITIES = [
  'Faisalabad',
  'Karachi',
  'Lahore',
  'Multan',
  'Rawalpindi',
  'Islamabad',
  'Gujranwala',
  'Sialkot',
  'Peshawar',
  'Quetta',
  'Other',
];

// Payment terms options
const PAYMENT_TERMS_OPTIONS = [
  { value: 7, label: '7 Days' },
  { value: 15, label: '15 Days' },
  { value: 30, label: '30 Days' },
  { value: 45, label: '45 Days' },
  { value: 60, label: '60 Days' },
  { value: 90, label: '90 Days' },
];

// Form validation schema
const vendorSchema = z.object({
  code: z.string().min(3, 'Code must be at least 3 characters'),
  name: z.string().min(2, 'Vendor name is required'),
  contactPerson: z.string().min(2, 'Contact person name is required'),
  phone: z.string().min(10, 'Valid phone number is required'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  creditLimit: z.coerce.number().min(0, 'Credit limit must be 0 or more'),
  paymentTerms: z.coerce.number().min(1, 'Payment terms required'),
  rating: z.coerce.number().min(1).max(5),
  isActive: z.boolean(),
  notes: z.string().optional(),
});

type VendorForm = z.infer<typeof vendorSchema>;

// Mock vendor data - will come from API
const mockVendor: YarnVendor = {
  id: '1',
  code: 'VND-001',
  name: 'Textile Hub',
  contactPerson: 'Ahmad Khan',
  phone: '0300-1234567',
  email: 'ahmad@textilehub.pk',
  address: '123 Industrial Area, Ghulam Muhammad Abad',
  city: 'Faisalabad',
  country: 'Pakistan',
  creditLimit: 500000,
  paymentTerms: 30,
  currentBalance: 125000,
  rating: 4,
  isActive: true,
  notes: 'Preferred vendor for cotton yarn. Good quality and timely delivery.',
  createdAt: '2024-01-01',
  updatedAt: '2024-01-15',
};

export default function EditVendorPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const vendorId = params.id as string;

  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

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
      country: 'Pakistan',
      creditLimit: 100000,
      paymentTerms: 30,
      rating: 3,
      isActive: true,
    },
  });

  const watchedRating = watch('rating');

  // Load vendor data
  useEffect(() => {
    // In real app, fetch vendor from API
    setTimeout(() => {
      reset({
        code: mockVendor.code,
        name: mockVendor.name,
        contactPerson: mockVendor.contactPerson,
        phone: mockVendor.phone,
        email: mockVendor.email || '',
        address: mockVendor.address || '',
        city: mockVendor.city || '',
        country: mockVendor.country || 'Pakistan',
        creditLimit: mockVendor.creditLimit,
        paymentTerms: mockVendor.paymentTerms,
        rating: mockVendor.rating,
        isActive: mockVendor.isActive,
        notes: mockVendor.notes || '',
      });
      setIsFetching(false);
    }, 500);
  }, [vendorId, reset]);

  const onSubmit = async (data: VendorForm) => {
    setIsLoading(true);
    try {
      // TODO: API call will go here

      showToast('success', `Vendor "${data.name}" updated successfully!`);
      router.push(`/yarn/vendors/${vendorId}`);
    } catch (error) {
      showToast('error', 'Failed to update vendor');
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-neutral-400">Loading vendor...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm">
            <Link href="/yarn" className="text-neutral-400 hover:text-white">
              Yarn
            </Link>
            <span className="text-neutral-600">/</span>
            <Link href="/yarn/vendors" className="text-neutral-400 hover:text-white">
              Vendors
            </Link>
            <span className="text-neutral-600">/</span>
            <Link
              href={`/yarn/vendors/${vendorId}`}
              className="text-neutral-400 hover:text-white"
            >
              {mockVendor.code}
            </Link>
            <span className="text-neutral-600">/</span>
            <span className="text-white">Edit</span>
          </div>
          <h1 className="text-2xl font-semibold text-white mt-2">Edit Vendor</h1>
          <p className="text-neutral-400 mt-1">
            Update vendor information for {mockVendor.name}
          </p>
        </div>
        <Button variant="ghost" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Information */}
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
          <h2 className="text-lg font-semibold text-white mb-4">
            Basic Information
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Vendor Code - Read Only */}
            <div>
              <Input
                label="Vendor Code"
                placeholder="VND-001"
                error={errors.code?.message}
                disabled
                {...register('code')}
              />
              <p className="text-xs text-neutral-500 mt-1">
                Vendor code cannot be changed
              </p>
            </div>

            {/* Vendor Name */}
            <Input
              label="Vendor Name *"
              placeholder="Enter vendor/company name"
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
              placeholder="0300-1234567"
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
          <h2 className="text-lg font-semibold text-white mb-4">
            Address
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Address Line */}
            <div className="md:col-span-2">
              <Input
                label="Address"
                placeholder="Street address, building, area"
                error={errors.address?.message}
                {...register('address')}
              />
            </div>

            {/* City */}
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                City
              </label>
              <select
                {...register('city')}
                className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Select City</option>
                {PAKISTAN_CITIES.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>

            {/* Country */}
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                Country
              </label>
              <select
                {...register('country')}
                className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="Pakistan">Pakistan</option>
                <option value="China">China</option>
                <option value="India">India</option>
                <option value="Bangladesh">Bangladesh</option>
                <option value="Turkey">Turkey</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
        </div>

        {/* Financial Terms */}
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
          <h2 className="text-lg font-semibold text-white mb-4">
            Financial Terms
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Credit Limit */}
            <div>
              <Input
                label="Credit Limit (PKR) *"
                type="number"
                placeholder="100000"
                error={errors.creditLimit?.message}
                {...register('creditLimit')}
              />
              <p className="text-xs text-neutral-500 mt-1">
                Maximum outstanding balance allowed
              </p>
            </div>

            {/* Payment Terms */}
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                Payment Terms *
              </label>
              <select
                {...register('paymentTerms')}
                className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {PAYMENT_TERMS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-neutral-500 mt-1">
                Days to pay after purchase
              </p>
            </div>
          </div>

          {/* Current Balance Info */}
          <div className="mt-4 p-4 bg-factory-gray rounded-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-400">Current Balance</p>
                <p className="text-xl font-semibold text-warning">
                  Rs. {mockVendor.currentBalance.toLocaleString()}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-neutral-400">Credit Utilization</p>
                <p className="text-lg font-medium text-white">
                  {((mockVendor.currentBalance / mockVendor.creditLimit) * 100).toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Rating & Status */}
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
          <h2 className="text-lg font-semibold text-white mb-4">
            Rating & Status
          </h2>

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
                      star <= watchedRating
                        ? 'text-yellow-400 hover:text-yellow-300'
                        : 'text-neutral-600 hover:text-neutral-500'
                    }`}
                  >
                    ★
                  </button>
                ))}
              </div>
              <p className="text-xs text-neutral-500 mt-2">
                Rate vendor quality and reliability
              </p>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-3">
                Status
              </label>
              <div className="flex items-center justify-between p-4 bg-factory-gray rounded-xl">
                <div>
                  <p className="text-white font-medium">Active Vendor</p>
                  <p className="text-sm text-neutral-400">
                    Active vendors appear in dropdowns
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    {...register('isActive')}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-factory-border rounded-full peer peer-checked:bg-primary-500 peer-focus:ring-2 peer-focus:ring-primary-500/50 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
                </label>
              </div>
            </div>
          </div>
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
            placeholder="Any additional notes about this vendor..."
          />
        </div>

        {/* Metadata */}
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Information</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-neutral-400">Created</p>
              <p className="text-white">
                {new Date(mockVendor.createdAt).toLocaleDateString('en-PK', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
            <div>
              <p className="text-neutral-400">Last Updated</p>
              <p className="text-white">
                {new Date(mockVendor.updatedAt).toLocaleDateString('en-PK', {
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
          <div>
            {isDirty && (
              <p className="text-sm text-warning">You have unsaved changes</p>
            )}
          </div>
          <div className="flex gap-3">
            <Button type="button" variant="secondary" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !isDirty}>
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
