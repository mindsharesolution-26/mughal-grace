'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { useToast } from '@/contexts/ToastContext';
import { needleTypesApi } from '@/lib/api/needles';
import { NeedleKind, needleKindLabels } from '@/lib/types/needle';
import { Upload, X, Image as ImageIcon } from 'lucide-react';

const schema = z.object({
  code: z.string().max(20).optional(),
  name: z.string().min(1, 'Name is required').max(100),
  needleKind: z.enum(['LATCH', 'COMPOUND', 'BEARDED'] as const),
  gauge: z.number({ required_error: 'Gauge is required' }).int().positive('Gauge must be positive'),
  length: z.number().positive().optional().nullable(),
  material: z.string().min(1, 'Material is required').max(50),
  brand: z.string().max(100).optional(),
  supplierCode: z.string().max(50).optional(),
  costPerNeedle: z.number().positive().optional().nullable(),
  currency: z.string().length(3).optional(),
  minStockLevel: z.number().int().min(0).optional(),
  reorderPoint: z.number().int().min(0).optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function NewNeedleTypePage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      needleKind: 'LATCH',
      currency: 'PKR',
      minStockLevel: 100,
      reorderPoint: 200,
    },
  });

  const selectedKind = watch('needleKind');

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showToast('error', 'Image must be less than 5MB');
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      // Create needle type first
      const needleType = await needleTypesApi.create({
        ...data,
        length: data.length || undefined,
        costPerNeedle: data.costPerNeedle || undefined,
      });

      // Upload image if selected
      if (imageFile) {
        try {
          await needleTypesApi.uploadImage(needleType.id, imageFile);
          showToast('success', 'Needle type created with image');
        } catch (imgError: any) {
          showToast('warning', 'Needle type created, but image upload failed. You can upload it later.');
        }
      } else {
        showToast('success', 'Needle type created successfully');
      }

      router.push(`/needles/types/${needleType.id}`);
    } catch (error: any) {
      showToast('error', error.response?.data?.error || 'Failed to create needle type');
    } finally {
      setIsSubmitting(false);
    }
  };

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
            <Link href="/needles/types" className="text-neutral-400 hover:text-white">
              Types
            </Link>
            <span className="text-neutral-600">/</span>
            <span className="text-white">New</span>
          </div>
          <h1 className="text-2xl font-semibold text-white mt-2">Add Needle Type</h1>
        </div>
        <Button variant="ghost" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Image Upload */}
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Needle Photo</h2>
          <p className="text-sm text-neutral-400 mb-4">
            Upload a clear photo of the needle for easy identification
          </p>

          <div className="flex items-start gap-6">
            {/* Preview */}
            <div className="w-40 h-40 rounded-xl border-2 border-dashed border-factory-border bg-factory-gray flex items-center justify-center overflow-hidden">
              {imagePreview ? (
                <div className="relative w-full h-full">
                  <Image
                    src={imagePreview}
                    alt="Needle preview"
                    fill
                    className="object-cover"
                  />
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute top-2 right-2 p-1 bg-error rounded-full text-white hover:bg-error/80"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <ImageIcon className="w-12 h-12 text-neutral-500" />
              )}
            </div>

            {/* Upload button */}
            <div className="flex-1">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleImageChange}
                className="hidden"
              />
              <Button
                type="button"
                variant="secondary"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-4 h-4 mr-2" />
                {imagePreview ? 'Change Image' : 'Upload Image'}
              </Button>
              <p className="text-xs text-neutral-500 mt-2">
                JPEG, PNG, WebP or GIF (max 5MB)
              </p>
            </div>
          </div>
        </div>

        {/* Basic Info */}
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Code (auto-generated if empty)"
              placeholder="NL-0001"
              error={errors.code?.message}
              {...register('code')}
            />
            <Input
              label="Name *"
              placeholder="Latch Needle 18G"
              error={errors.name?.message}
              {...register('name')}
            />
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-neutral-300 mb-3">
              Needle Type *
            </label>
            <div className="grid grid-cols-3 gap-3">
              {(['LATCH', 'COMPOUND', 'BEARDED'] as NeedleKind[]).map((kind) => (
                <label
                  key={kind}
                  className={`flex items-center justify-center gap-2 p-4 rounded-xl border cursor-pointer transition-colors ${
                    selectedKind === kind
                      ? 'border-primary-500 bg-primary-500/10'
                      : 'border-factory-border bg-factory-gray hover:border-neutral-500'
                  }`}
                >
                  <input
                    type="radio"
                    value={kind}
                    {...register('needleKind')}
                    className="sr-only"
                  />
                  <span className="text-white font-medium">{needleKindLabels[kind]}</span>
                </label>
              ))}
            </div>
            {errors.needleKind && (
              <p className="text-sm text-error mt-2">{errors.needleKind.message}</p>
            )}
          </div>
        </div>

        {/* Specifications */}
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Specifications</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Gauge (G) *"
              type="number"
              placeholder="18"
              error={errors.gauge?.message}
              {...register('gauge', { valueAsNumber: true })}
            />
            <Input
              label="Length (mm)"
              type="number"
              step="0.01"
              placeholder="38.10"
              error={errors.length?.message}
              {...register('length', { valueAsNumber: true })}
            />
            <Input
              label="Material *"
              placeholder="Steel"
              error={errors.material?.message}
              {...register('material')}
            />
            <Input
              label="Brand"
              placeholder="Groz-Beckert"
              error={errors.brand?.message}
              {...register('brand')}
            />
            <Input
              label="Supplier Code"
              placeholder="GB-18-LN"
              error={errors.supplierCode?.message}
              {...register('supplierCode')}
            />
          </div>
        </div>

        {/* Pricing */}
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Pricing</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Cost per Needle"
              type="number"
              step="0.01"
              placeholder="25.00"
              error={errors.costPerNeedle?.message}
              {...register('costPerNeedle', { valueAsNumber: true })}
            />
            <Input
              label="Currency"
              placeholder="PKR"
              error={errors.currency?.message}
              {...register('currency')}
            />
          </div>
        </div>

        {/* Inventory */}
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Inventory Settings</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Minimum Stock Level"
              type="number"
              placeholder="100"
              error={errors.minStockLevel?.message}
              {...register('minStockLevel', { valueAsNumber: true })}
            />
            <Input
              label="Reorder Point"
              type="number"
              placeholder="200"
              error={errors.reorderPoint?.message}
              {...register('reorderPoint', { valueAsNumber: true })}
            />
          </div>
          <p className="text-sm text-neutral-400 mt-2">
            You will receive alerts when stock falls below these levels
          </p>
        </div>

        {/* Notes */}
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Notes</h2>
          <textarea
            className="w-full px-4 py-3 rounded-xl bg-factory-gray border border-factory-border text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            rows={3}
            placeholder="Additional notes..."
            {...register('notes')}
          />
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create Needle Type'}
          </Button>
        </div>
      </form>
    </div>
  );
}
