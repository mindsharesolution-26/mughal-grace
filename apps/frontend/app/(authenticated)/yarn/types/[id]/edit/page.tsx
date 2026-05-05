'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { useToast } from '@/contexts/ToastContext';
import {
  YarnCountSystem,
  YARN_COUNT_SYSTEMS,
  FIBER_TYPES,
  FiberType,
  CURRENCIES,
  CurrencyCode,
  WEIGHT_UNITS,
  WeightUnit,
  YarnTypeFormData,
} from '@/lib/types/yarn';
import {
  getAllCountEquivalents,
  formatYarnCount,
} from '@/lib/utils/yarn-conversions';
import { yarnTypesApi } from '@/lib/api/yarn-types';

// Form validation schema
const yarnTypeSchema = z.object({
  code: z.string().min(1, 'Code is required'),
  name: z.string().min(2, 'Name is required'),
  description: z.string().optional(),
  brandName: z.string().min(1, 'Brand name is required'),
  color: z.string().min(1, 'Color is required'),
  grade: z.string().min(1, 'Grade is required'),
  composition: z
    .array(
      z.object({
        fiberType: z.string().min(1, 'Fiber type required'),
        percentage: z.coerce.number().min(1).max(100),
      })
    )
    .optional(),
  countValue: z.coerce.number().positive('Count must be positive').optional().or(z.literal('')),
  countSystem: z.string().optional(),
  defaultPrice: z.object({
    currency: z.string(),
    pricePerUnit: z.coerce.number().min(0),
    unit: z.string(),
  }).optional(),
  category: z.string().optional(),
  certifications: z.array(z.string()).optional(),
  isActive: z.boolean(),
});

type YarnTypeForm = z.infer<typeof yarnTypeSchema>;

const COMMON_GRADES = ['A', 'B', 'C', 'Premium', 'Standard', 'Economy'];

const COMMON_CERTIFICATIONS = [
  'OEKO-TEX Standard 100',
  'GOTS (Global Organic Textile)',
  'BCI (Better Cotton)',
  'Fairtrade',
  'GRS (Global Recycled Standard)',
  'FSC',
  'ISO 9001',
];

export default function EditYarnTypePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { showToast } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [countEquivalents, setCountEquivalents] = useState<Record<string, number>>({});

  const [showComposition, setShowComposition] = useState(false);
  const [showYarnCount, setShowYarnCount] = useState(false);
  const [showPricing, setShowPricing] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<YarnTypeForm>({
    resolver: zodResolver(yarnTypeSchema),
    defaultValues: {
      code: '',
      name: '',
      brandName: '',
      color: '',
      grade: '',
      composition: [],
      countSystem: 'NE',
      countValue: undefined,
      defaultPrice: {
        currency: 'PKR',
        pricePerUnit: 0,
        unit: 'KG',
      },
      isActive: true,
      certifications: [],
    },
  });

  const {
    fields: compositionFields,
    append: appendFiber,
    remove: removeFiber,
    replace: replaceComposition,
  } = useFieldArray({
    control,
    name: 'composition',
  });

  // Watch for changes to update equivalents
  const countValue = watch('countValue');
  const countSystem = watch('countSystem') as YarnCountSystem;
  const composition = watch('composition');

  // Fetch yarn type data
  useEffect(() => {
    const fetchYarnType = async () => {
      try {
        setIsFetching(true);
        const yarnType = await yarnTypesApi.getById(parseInt(id));

        // Set form values
        reset({
          code: yarnType.code,
          name: yarnType.name,
          description: yarnType.description || '',
          brandName: yarnType.brandName || '',
          color: yarnType.color || '',
          grade: yarnType.grade || '',
          composition: yarnType.composition || [],
          countValue: yarnType.countValue ?? undefined,
          countSystem: yarnType.countSystem || 'NE',
          defaultPrice: yarnType.defaultPricePerKg ? {
            currency: yarnType.currency || 'PKR',
            pricePerUnit: yarnType.defaultPricePerKg,
            unit: yarnType.priceUnit || 'KG',
          } : {
            currency: 'PKR',
            pricePerUnit: 0,
            unit: 'KG',
          },
          category: yarnType.category || '',
          certifications: yarnType.certifications || [],
          isActive: yarnType.isActive,
        });

        // Set toggle states based on data
        setShowComposition(Boolean(yarnType.composition && yarnType.composition.length > 0));
        setShowYarnCount(Boolean(yarnType.countValue));
        setShowPricing(Boolean(yarnType.defaultPricePerKg));

      } catch (error: any) {
        const message = error.response?.data?.error || 'Failed to load yarn type';
        showToast('error', message);
        router.push('/yarn/types');
      } finally {
        setIsFetching(false);
      }
    };

    if (id) {
      fetchYarnType();
    }
  }, [id, reset, showToast, router]);

  // Update count equivalents when count changes
  useEffect(() => {
    if (countValue && countSystem) {
      const equivalents = getAllCountEquivalents(Number(countValue), countSystem);
      setCountEquivalents(equivalents);
    }
  }, [countValue, countSystem]);

  // Calculate total composition percentage
  const totalPercentage = composition?.reduce(
    (sum, c) => sum + (Number(c.percentage) || 0),
    0
  ) || 0;
  const isCompositionValid = !showComposition || composition?.length === 0 || Math.abs(totalPercentage - 100) < 0.01;

  const onSubmit = async (data: YarnTypeForm) => {
    // Validate composition only if it's being used
    if (showComposition && data.composition && data.composition.length > 0) {
      const total = data.composition.reduce((sum, c) => sum + (Number(c.percentage) || 0), 0);
      if (Math.abs(total - 100) >= 0.01) {
        showToast('error', 'Composition must total 100%');
        return;
      }
    }

    setIsLoading(true);
    try {
      // Transform form data to API format
      const formData: YarnTypeFormData = {
        code: data.code,
        name: data.name,
        description: data.description,
        brandName: data.brandName,
        color: data.color,
        grade: data.grade,
        composition: showComposition && data.composition?.length ? data.composition.map(c => ({
          fiberType: c.fiberType as FiberType,
          percentage: c.percentage,
        })) : undefined,
        countValue: showYarnCount && data.countValue ? Number(data.countValue) : undefined,
        countSystem: showYarnCount && data.countSystem ? data.countSystem as YarnCountSystem : undefined,
        defaultPricePerKg: showPricing && data.defaultPrice?.pricePerUnit ? Number(data.defaultPrice.pricePerUnit) : undefined,
        currency: showPricing && data.defaultPrice?.currency ? data.defaultPrice.currency : undefined,
        priceUnit: showPricing && data.defaultPrice?.unit ? data.defaultPrice.unit : undefined,
        category: data.category,
        certifications: data.certifications?.filter(Boolean),
        isActive: data.isActive,
      };

      await yarnTypesApi.update(parseInt(id), formData);
      showToast('success', 'Yarn type updated successfully!');
      router.push('/yarn/types');
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to update yarn type';
      showToast('error', message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
        <span className="ml-3 text-neutral-400">Loading yarn type...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm">
            <Link href="/yarn" className="text-neutral-400 hover:text-white">
              Yarn
            </Link>
            <span className="text-neutral-600">/</span>
            <Link href="/yarn/types" className="text-neutral-400 hover:text-white">
              Types
            </Link>
            <span className="text-neutral-600">/</span>
            <span className="text-white">Edit</span>
          </div>
          <h1 className="text-2xl font-semibold text-white mt-2">
            Edit Yarn Type
          </h1>
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
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                Yarn Code
              </label>
              <div className="px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-neutral-400">
                {watch('code')}
              </div>
              <p className="text-xs text-neutral-500 mt-1">
                Code cannot be changed
              </p>
            </div>

            <Input
              label="Name *"
              placeholder="Cotton 40s"
              error={errors.name?.message}
              {...register('name')}
            />

            <Input
              label="Brand Name *"
              placeholder="Enter brand/manufacturer name"
              error={errors.brandName?.message}
              {...register('brandName')}
            />

            <Input
              label="Color *"
              placeholder="Enter yarn color"
              error={errors.color?.message}
              {...register('color')}
            />

            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                Grade *
              </label>
              <select
                {...register('grade')}
                className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Select Grade</option>
                {COMMON_GRADES.map((grade) => (
                  <option key={grade} value={grade}>
                    {grade}
                  </option>
                ))}
              </select>
              {errors.grade && (
                <p className="text-sm text-error mt-1">{errors.grade.message}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                Description (Optional)
              </label>
              <textarea
                {...register('description')}
                rows={2}
                className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Brief description of this yarn type..."
              />
            </div>
          </div>
        </div>

        {/* Fiber Composition (Optional) */}
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={showComposition}
                  onChange={(e) => {
                    setShowComposition(e.target.checked);
                    if (!e.target.checked) {
                      replaceComposition([]);
                    } else if (compositionFields.length === 0) {
                      appendFiber({ fiberType: 'COTTON', percentage: 100 });
                    }
                  }}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-factory-gray rounded-full peer peer-checked:bg-primary-500 peer-focus:ring-2 peer-focus:ring-primary-500/50 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
              </label>
              <div>
                <h2 className="text-lg font-semibold text-white">
                  Fiber Composition
                </h2>
                <p className="text-sm text-neutral-400">
                  Optional - Total must equal 100%
                </p>
              </div>
            </div>
            {showComposition && (
              <div
                className={`px-3 py-1 rounded-lg text-sm font-medium ${
                  isCompositionValid
                    ? 'bg-success/20 text-success'
                    : 'bg-error/20 text-error'
                }`}
              >
                {totalPercentage}%
              </div>
            )}
          </div>

          {showComposition && (
            <div className="space-y-3">
              {compositionFields.map((field, index) => (
                <div key={field.id} className="flex gap-3 items-end">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                      Fiber Type
                    </label>
                    <select
                      {...register(`composition.${index}.fiberType`)}
                      className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <optgroup label="Natural Fibers">
                        {Object.values(FIBER_TYPES)
                          .filter((f) => f.isNatural)
                          .map((fiber) => (
                            <option key={fiber.code} value={fiber.code}>
                              {fiber.name}
                            </option>
                          ))}
                      </optgroup>
                      <optgroup label="Synthetic Fibers">
                        {Object.values(FIBER_TYPES)
                          .filter((f) => !f.isNatural)
                          .map((fiber) => (
                            <option key={fiber.code} value={fiber.code}>
                              {fiber.name}
                            </option>
                          ))}
                      </optgroup>
                    </select>
                  </div>

                  <div className="w-32">
                    <Input
                      label="Percentage"
                      type="number"
                      min="1"
                      max="100"
                      {...register(`composition.${index}.percentage`)}
                    />
                  </div>

                  {compositionFields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFiber(index)}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              ))}

              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => appendFiber({ fiberType: 'POLYESTER', percentage: 0 })}
              >
                + Add Fiber
              </Button>
            </div>
          )}
        </div>

        {/* Yarn Count (Optional) */}
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
          <div className="flex items-center gap-3 mb-4">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={showYarnCount}
                onChange={(e) => {
                  setShowYarnCount(e.target.checked);
                  if (!e.target.checked) {
                    setValue('countValue', undefined);
                    setValue('countSystem', undefined);
                  }
                }}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-factory-gray rounded-full peer peer-checked:bg-primary-500 peer-focus:ring-2 peer-focus:ring-primary-500/50 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
            </label>
            <div>
              <h2 className="text-lg font-semibold text-white">
                Yarn Count / Fineness
              </h2>
              <p className="text-sm text-neutral-400">
                Optional - Specify yarn count/fineness
              </p>
            </div>
          </div>

          {showYarnCount && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                    Count System
                  </label>
                  <select
                    {...register('countSystem')}
                    className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    {Object.values(YARN_COUNT_SYSTEMS).map((system) => (
                      <option key={system.code} value={system.code}>
                        {system.name} - {system.fullName}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-neutral-500 mt-1">
                    {countSystem && YARN_COUNT_SYSTEMS[countSystem]?.description}
                  </p>
                </div>

                <Input
                  label="Count Value"
                  type="number"
                  step="0.1"
                  error={errors.countValue?.message}
                  {...register('countValue')}
                />
              </div>

              {/* Count Equivalents Display */}
              {Object.keys(countEquivalents).length > 0 && (
                <div className="bg-factory-gray rounded-xl p-4">
                  <p className="text-sm text-neutral-400 mb-3">
                    Equivalent in other systems:
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    {Object.entries(countEquivalents).map(([system, value]) => (
                      <div
                        key={system}
                        className={`text-center p-3 rounded-lg ${
                          system === countSystem
                            ? 'bg-primary-500/20 border border-primary-500/30'
                            : 'bg-factory-dark'
                        }`}
                      >
                        <p className="text-xs text-neutral-400">
                          {YARN_COUNT_SYSTEMS[system as YarnCountSystem].name}
                        </p>
                        <p
                          className={`font-mono font-medium ${
                            system === countSystem ? 'text-primary-400' : 'text-white'
                          }`}
                        >
                          {formatYarnCount(value, system as YarnCountSystem)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Pricing (Optional) */}
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
          <div className="flex items-center gap-3 mb-4">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={showPricing}
                onChange={(e) => {
                  setShowPricing(e.target.checked);
                  if (!e.target.checked) {
                    setValue('defaultPrice', undefined);
                  }
                }}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-factory-gray rounded-full peer peer-checked:bg-primary-500 peer-focus:ring-2 peer-focus:ring-primary-500/50 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
            </label>
            <div>
              <h2 className="text-lg font-semibold text-white">Default Pricing</h2>
              <p className="text-sm text-neutral-400">
                Optional - Set default price for this yarn type
              </p>
            </div>
          </div>

          {showPricing && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                  Currency
                </label>
                <select
                  {...register('defaultPrice.currency')}
                  className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {Object.values(CURRENCIES).map((currency) => (
                    <option key={currency.code} value={currency.code}>
                      {currency.symbol} {currency.code} - {currency.name}
                    </option>
                  ))}
                </select>
              </div>

              <Input
                label="Price per Unit"
                type="number"
                step="0.01"
                error={errors.defaultPrice?.pricePerUnit?.message}
                {...register('defaultPrice.pricePerUnit')}
              />

              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                  Unit
                </label>
                <select
                  {...register('defaultPrice.unit')}
                  className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {Object.values(WEIGHT_UNITS).map((unit) => (
                    <option key={unit.code} value={unit.code}>
                      {unit.name} ({unit.symbol})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Certifications */}
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
          <h2 className="text-lg font-semibold text-white mb-4">
            Certifications (Optional)
          </h2>
          <p className="text-sm text-neutral-400 mb-4">
            Select applicable quality and sustainability certifications
          </p>

          <div className="flex flex-wrap gap-2">
            {COMMON_CERTIFICATIONS.map((cert) => (
              <label
                key={cert}
                className="inline-flex items-center gap-2 px-3 py-2 bg-factory-gray rounded-lg cursor-pointer hover:bg-factory-light transition-colors"
              >
                <input
                  type="checkbox"
                  value={cert}
                  {...register('certifications')}
                  className="rounded border-factory-border bg-factory-dark"
                />
                <span className="text-sm text-white">{cert}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Status */}
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Status</h2>
              <p className="text-sm text-neutral-400">
                Active yarn types appear in dropdowns
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                {...register('isActive')}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-factory-gray rounded-full peer peer-checked:bg-primary-500 peer-focus:ring-2 peer-focus:ring-primary-500/50 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
            </label>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  );
}
