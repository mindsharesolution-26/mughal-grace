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
import { dyeingVendorsApi } from '@/lib/api/dyeing';

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
  { value: '7 Days', label: '7 Days' },
  { value: '15 Days', label: '15 Days' },
  { value: '30 Days', label: '30 Days' },
  { value: '45 Days', label: '45 Days' },
  { value: '60 Days', label: '60 Days' },
  { value: '90 Days', label: '90 Days' },
];

// Form validation schema
const vendorSchema = z.object({
  code: z.string().min(1, 'Vendor code is required'),
  name: z.string().min(2, 'Vendor name is required'),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  address: z.string().optional(),
  city: z.string().optional(),
  ntn: z.string().optional(),
  strn: z.string().optional(),
  paymentTerms: z.string().optional(),
  defaultRatePerKg: z.coerce.number().min(0).optional(),
  qualityRating: z.coerce.number().min(1).max(5).optional(),
});

type VendorForm = z.infer<typeof vendorSchema>;

export default function NewDyeingVendorPage() {
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
      paymentTerms: '30 Days',
      qualityRating: 3,
    },
  });

  const watchedRating = watch('qualityRating') || 3;

  const onSubmit = async (data: VendorForm) => {
    setIsLoading(true);
    try {
      await dyeingVendorsApi.create({
        code: data.code,
        name: data.name,
        contactPerson: data.contactPerson || undefined,
        phone: data.phone || undefined,
        email: data.email || undefined,
        address: data.address || undefined,
        city: data.city || undefined,
        ntn: data.ntn || undefined,
        strn: data.strn || undefined,
        paymentTerms: data.paymentTerms || undefined,
        defaultRatePerKg: data.defaultRatePerKg || undefined,
        qualityRating: data.qualityRating || undefined,
      });
      showToast('success', `Dyeing vendor "${data.name}" created successfully!`);
      router.push('/dyeing');
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to create vendor';
      showToast('error', message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm">
            <Link href="/dyeing" className="text-neutral-400 hover:text-white">
              Dyeing
            </Link>
            <span className="text-neutral-600">/</span>
            <span className="text-white">New Vendor</span>
          </div>
          <h1 className="text-2xl font-semibold text-white mt-2">Add Dyeing Vendor</h1>
          <p className="text-neutral-400 mt-1">
            Register a new dyeing vendor/dyer
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
            {/* Vendor Code */}
            <Input
              label="Vendor Code *"
              placeholder="DV-001"
              error={errors.code?.message}
              {...register('code')}
            />

            {/* Vendor Name */}
            <Input
              label="Vendor Name *"
              placeholder="Enter vendor/company name"
              error={errors.name?.message}
              {...register('name')}
            />

            {/* Contact Person */}
            <Input
              label="Contact Person"
              placeholder="Primary contact name"
              error={errors.contactPerson?.message}
              {...register('contactPerson')}
            />

            {/* Phone */}
            <Input
              label="Phone Number"
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
          </div>
        </div>

        {/* Tax & Financial Information */}
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
          <h2 className="text-lg font-semibold text-white mb-4">
            Tax & Financial Information
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* NTN */}
            <Input
              label="NTN (National Tax Number)"
              placeholder="1234567-8"
              error={errors.ntn?.message}
              {...register('ntn')}
            />

            {/* STRN */}
            <Input
              label="STRN (Sales Tax Registration)"
              placeholder="12-34-5678-901-23"
              error={errors.strn?.message}
              {...register('strn')}
            />

            {/* Payment Terms */}
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                Payment Terms
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
            </div>

            {/* Default Rate */}
            <Input
              label="Default Rate per KG (PKR)"
              type="number"
              placeholder="150"
              error={errors.defaultRatePerKg?.message}
              {...register('defaultRatePerKg')}
            />
          </div>
        </div>

        {/* Quality Rating */}
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
          <h2 className="text-lg font-semibold text-white mb-4">
            Quality Rating
          </h2>

          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-3">
              Vendor Rating
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setValue('qualityRating', star)}
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
