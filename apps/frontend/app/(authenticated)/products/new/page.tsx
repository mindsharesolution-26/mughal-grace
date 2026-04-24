'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { useToast } from '@/contexts/ToastContext';
import { productsApi } from '@/lib/api/products';
import { fabricsApi, FabricProductionLookup } from '@/lib/api/fabrics';
import { FabricFinder } from '@/components/organisms/FabricFinder';
import { ProductType } from '@/lib/types/product';
import {
  departmentsApi,
  groupsApi,
  materialsApi,
  brandsApi,
  colorsApi,
  fabricSizesApi,
  gradesApi,
  fabricTypesApi,
  fabricCompositionsApi,
} from '@/lib/api/settings';
import { machinesApi } from '@/lib/api/machines';
import type {
  Department,
  Group,
  Material,
  Brand,
  Color,
  FabricSize,
  Grade,
  FabricType,
  FabricCompositionType,
} from '@/lib/types/settings';
import type { MachineLookup } from '@/lib/types/machine';
import type { FabricLookup } from '@/lib/types/product';
import { cn } from '@/lib/utils/cn';

// Form validation schema
const productSchema = z.object({
  name: z.string().min(2, 'Product name is required'),
  type: z.enum(['FABRIC', 'GOODS']),
  departmentId: z.coerce.number().optional().nullable(),
  groupId: z.coerce.number().optional().nullable(),
  materialId: z.coerce.number().optional().nullable(),
  brandId: z.coerce.number().optional().nullable(),
  colorId: z.coerce.number().optional().nullable(),
  fabricSizeId: z.coerce.number().optional().nullable(),
  // Fabric Master Data Reference (required for FABRIC type)
  fabricId: z.coerce.number().optional().nullable(),
  articleNumber: z.string().optional(),
  description: z.string().optional(),
  isActive: z.boolean(),
  // Fabric/Production fields
  machineId: z.coerce.number().optional().nullable(),
  gradeId: z.coerce.number().optional().nullable(),
  fabricTypeId: z.coerce.number().optional().nullable(),
  fabricCompositionId: z.coerce.number().optional().nullable(),
  gsm: z.coerce.number().positive().optional().nullable(),
  width: z.coerce.number().positive().optional().nullable(),
  widthUnit: z.enum(['inch', 'cm']).optional().nullable(),
  isTube: z.boolean().optional(),
});

type ProductForm = z.infer<typeof productSchema>;

export default function NewProductPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Get type from URL query param
  const urlType = searchParams.get('type') as ProductType | null;
  const initialType: ProductType = urlType === 'FABRIC' ? 'FABRIC' : 'GOODS';

  // Selected fabric for FabricFinder
  const [selectedFabric, setSelectedFabric] = useState<FabricProductionLookup | null>(null);

  // Lookup data
  const [departments, setDepartments] = useState<Department[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [filteredGroups, setFilteredGroups] = useState<Group[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [colors, setColors] = useState<Color[]>([]);
  const [fabricSizes, setFabricSizes] = useState<FabricSize[]>([]);
  // Fabric Master Data (for GOODS type dropdown)
  const [fabrics, setFabrics] = useState<FabricLookup[]>([]);
  // Fabric/Production lookup data
  const [machines, setMachines] = useState<MachineLookup[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [fabricTypes, setFabricTypes] = useState<FabricType[]>([]);
  const [fabricCompositions, setFabricCompositions] = useState<FabricCompositionType[]>([]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ProductForm>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      type: initialType,
      isActive: true,
      isTube: false,
      widthUnit: 'inch',
    },
  });

  // Watch fields
  const selectedDepartmentId = watch('departmentId');
  const productType = watch('type');
  const isFabricType = productType === 'FABRIC';

  // Filter groups when department changes
  useEffect(() => {
    if (selectedDepartmentId) {
      const filtered = groups.filter(
        (g) => g.departmentId === Number(selectedDepartmentId) && g.isActive
      );
      setFilteredGroups(filtered);
      const currentGroupId = watch('groupId');
      if (currentGroupId && !filtered.some((g) => g.id === Number(currentGroupId))) {
        setValue('groupId', null);
      }
    } else {
      setFilteredGroups([]);
      setValue('groupId', null);
    }
  }, [selectedDepartmentId, groups, setValue, watch]);

  // Handle fabric selection from FabricFinder
  const handleFabricSelect = (fabric: FabricProductionLookup) => {
    setSelectedFabric(fabric);
    setValue('fabricId', fabric.id);
    // Auto-populate fields from fabric template
    if (fabric.machine?.id) {
      setValue('machineId', fabric.machine.id);
    }
    if (fabric.fabricType?.id) {
      setValue('fabricTypeId', fabric.fabricType.id);
    }
    if (fabric.gsm) {
      setValue('gsm', parseFloat(fabric.gsm));
    }
    if (fabric.width) {
      setValue('width', parseFloat(fabric.width));
    }
    if (fabric.widthUnit) {
      setValue('widthUnit', fabric.widthUnit as 'inch' | 'cm');
    }
    // Use fabric name as product name if empty
    const currentName = watch('name');
    if (!currentName) {
      setValue('name', fabric.name);
    }
  };

  // Clear fabric selection
  const handleClearFabric = () => {
    setSelectedFabric(null);
    setValue('fabricId', null);
  };

  // Fetch all lookup data
  useEffect(() => {
    const fetchData = async () => {
      setIsLoadingData(true);
      try {
        const [depts, grps, mats, brnds, clrs, sizes, fabs, machs, grds, fabTypes, fabComps] = await Promise.all([
          departmentsApi.getAll().catch(() => []),
          groupsApi.getAll().catch(() => []),
          materialsApi.getAll().catch(() => []),
          brandsApi.getAll().catch(() => []),
          colorsApi.getAll().catch(() => []),
          fabricSizesApi.getAll().catch(() => []),
          fabricsApi.getLookup().catch(() => []),
          machinesApi.getLookup().catch(() => []),
          gradesApi.getAll().catch(() => []),
          fabricTypesApi.getAll().catch(() => []),
          fabricCompositionsApi.getAll().catch(() => []),
        ]);

        setDepartments(depts.filter((d) => d.isActive));
        setGroups(grps);
        setMaterials(mats.filter((m) => m.isActive));
        setBrands(brnds.filter((b) => b.isActive));
        setColors(clrs.filter((c) => c.isActive));
        setFabricSizes(sizes.filter((s) => s.isActive));
        setFabrics(fabs);
        setMachines(machs);
        setGrades(grds.filter((g) => g.isActive));
        setFabricTypes(fabTypes.filter((t) => t.isActive));
        setFabricCompositions(fabComps.filter((c) => c.isActive));
      } catch (error) {
        console.error('Failed to load lookup data:', error);
        showToast('error', 'Failed to load form data');
      } finally {
        setIsLoadingData(false);
      }
    };
    fetchData();
  }, [showToast]);

  const onSubmit = async (data: ProductForm) => {
    // Validate: fabricId is required for FABRIC type
    if (data.type === 'FABRIC' && !data.fabricId) {
      showToast('error', 'Fabric Template is required for Fabric Products');
      return;
    }

    setIsLoading(true);
    try {
      await productsApi.create({
        name: data.name,
        type: data.type,
        articleNumber: data.articleNumber || undefined,
        departmentId: data.departmentId || undefined,
        groupId: data.groupId || undefined,
        materialId: data.materialId || undefined,
        brandId: data.brandId || undefined,
        colorId: data.colorId || undefined,
        fabricSizeId: data.fabricSizeId || undefined,
        fabricId: data.fabricId || undefined,
        description: data.description || undefined,
        isActive: data.isActive,
        // Fabric/Production fields
        machineId: data.machineId || undefined,
        gradeId: data.gradeId || undefined,
        fabricTypeId: data.fabricTypeId || undefined,
        fabricCompositionId: data.fabricCompositionId || undefined,
        gsm: data.gsm || undefined,
        width: data.width || undefined,
        widthUnit: data.widthUnit || undefined,
        isTube: data.isTube,
      });

      const itemLabel = data.type === 'FABRIC' ? 'Fabric Product' : 'Product';
      showToast('success', `${itemLabel} "${data.name}" created successfully!`);
      router.push('/products');
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to create product';
      showToast('error', message);
    } finally {
      setIsLoading(false);
    }
  };

  const itemLabel = isFabricType ? 'Fabric' : 'Product';

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm">
            <Link href="/products" className="text-neutral-400 hover:text-white">
              Products
            </Link>
            <span className="text-neutral-600">/</span>
            <span className="text-white">New {itemLabel}</span>
          </div>
          <h1 className="text-2xl font-semibold text-white mt-2">Add New {itemLabel}</h1>
          <p className="text-neutral-400 mt-1">
            {isFabricType
              ? 'Create a new fabric product linked to a fabric template'
              : 'Create a new product in your inventory'}
          </p>
        </div>
        <Button variant="ghost" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>

      {isLoadingData ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Product Type Selection */}
          <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Product Type</h2>
            <div className="flex bg-factory-gray rounded-xl p-1">
              <button
                type="button"
                onClick={() => {
                  setValue('type', 'GOODS');
                  handleClearFabric();
                }}
                className={cn(
                  'flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all',
                  productType === 'GOODS'
                    ? 'bg-primary-500 text-white'
                    : 'text-neutral-400 hover:text-white'
                )}
              >
                Product (Goods)
              </button>
              <button
                type="button"
                onClick={() => setValue('type', 'FABRIC')}
                className={cn(
                  'flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all',
                  productType === 'FABRIC'
                    ? 'bg-violet-500 text-white'
                    : 'text-neutral-400 hover:text-white'
                )}
              >
                Fabric Product
              </button>
            </div>
            <p className="text-xs text-neutral-500 mt-2">
              {isFabricType
                ? 'Fabric products require a linked Fabric Template and are tracked separately.'
                : 'Regular products for finished goods or other inventory items.'}
            </p>
          </div>

          {/* Fabric Template Selection (Required for FABRIC type) */}
          {isFabricType && (
            <div className="bg-factory-dark rounded-2xl border border-violet-500/30 p-6">
              <FabricFinder
                onFabricSelect={handleFabricSelect}
                selectedFabric={selectedFabric}
                onClear={handleClearFabric}
              />
              {!selectedFabric && (
                <p className="text-xs text-yellow-500 mt-2">
                  A Fabric Template is required for Fabric Products
                </p>
              )}
            </div>
          )}

          {/* Basic Information */}
          <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
            <h2 className="text-lg font-semibold text-white mb-4">
              Basic Information
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Product Name */}
              <Input
                label={`${itemLabel} Name *`}
                placeholder={`Enter ${itemLabel.toLowerCase()} name`}
                error={errors.name?.message}
                {...register('name')}
              />

              {/* Article Number */}
              <Input
                label="Article Number"
                placeholder="ART-001"
                error={errors.articleNumber?.message}
                {...register('articleNumber')}
              />
            </div>
          </div>

          {/* Classification (Show for GOODS, simplified for FABRIC) */}
          {!isFabricType && (
            <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
              <h2 className="text-lg font-semibold text-white mb-4">
                Classification
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Department */}
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                    Department
                  </label>
                  <select
                    {...register('departmentId')}
                    className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Select Department</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.code} - {dept.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Group */}
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                    Group
                  </label>
                  <select
                    {...register('groupId')}
                    disabled={!selectedDepartmentId}
                    className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">
                      {!selectedDepartmentId
                        ? 'Select Department First'
                        : 'Select Group'}
                    </option>
                    {filteredGroups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.code} - {group.name}
                      </option>
                    ))}
                  </select>
                  {selectedDepartmentId && filteredGroups.length === 0 && (
                    <p className="text-xs text-yellow-500 mt-1">
                      No groups found for this department
                    </p>
                  )}
                </div>

                {/* Material */}
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                    Material
                  </label>
                  <select
                    {...register('materialId')}
                    className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Select Material</option>
                    {materials.map((mat) => (
                      <option key={mat.id} value={mat.id}>
                        {mat.code} - {mat.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Brand */}
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                    Brand
                  </label>
                  <select
                    {...register('brandId')}
                    className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Select Brand</option>
                    {brands.map((brand) => (
                      <option key={brand.id} value={brand.id}>
                        {brand.code} - {brand.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Color */}
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                    Color
                  </label>
                  <select
                    {...register('colorId')}
                    className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Select Color</option>
                    {colors.map((color) => (
                      <option key={color.id} value={color.id}>
                        {color.code} - {color.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Width (Fabric Size) */}
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                    Width
                  </label>
                  <select
                    {...register('fabricSizeId')}
                    className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Select Width</option>
                    {fabricSizes.map((size) => (
                      <option key={size.id} value={size.id}>
                        {size.displayName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Link to Fabric Master Data (only for GOODS type) */}
          {!isFabricType && (
            <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
              <h2 className="text-lg font-semibold text-white mb-4">
                Fabric Master Data (Optional)
              </h2>
              <p className="text-sm text-neutral-400 mb-4">
                Link this product to pre-defined fabric master data. This is optional and helps maintain consistency.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Fabric */}
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                    Fabric Template
                  </label>
                  <select
                    {...register('fabricId')}
                    className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">No Fabric Template</option>
                    {fabrics.map((fabric) => (
                      <option key={fabric.id} value={fabric.id}>
                        {fabric.name} {fabric.articleNumber ? `(${fabric.articleNumber})` : ''}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-neutral-500 mt-1">
                    Select a fabric template to inherit its properties
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Fabric Properties */}
          <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
            <h2 className="text-lg font-semibold text-white mb-4">
              Fabric Properties
            </h2>
            {isFabricType && selectedFabric && (
              <p className="text-sm text-emerald-400 mb-4">
                Properties auto-filled from selected Fabric Template. You can adjust if needed.
              </p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Machine */}
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                  Machine
                </label>
                <select
                  {...register('machineId')}
                  className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Select Machine</option>
                  {machines.map((machine) => (
                    <option key={machine.id} value={machine.id}>
                      {machine.machineNumber} - {machine.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Grade */}
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                  Grade
                </label>
                <select
                  {...register('gradeId')}
                  className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Select Grade</option>
                  {grades.map((grade) => (
                    <option key={grade.id} value={grade.id}>
                      {grade.code} - {grade.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Fabric Type */}
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                  Fabric Type
                </label>
                <select
                  {...register('fabricTypeId')}
                  className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Select Fabric Type</option>
                  {fabricTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.code} - {type.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Fabric Composition */}
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                  Fabric Composition
                </label>
                <select
                  {...register('fabricCompositionId')}
                  className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Select Composition</option>
                  {fabricCompositions.map((comp) => (
                    <option key={comp.id} value={comp.id}>
                      {comp.code} - {comp.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* GSM */}
              <Input
                label="GSM (Weight)"
                type="number"
                placeholder="180"
                error={errors.gsm?.message}
                {...register('gsm')}
              />

              {/* Width */}
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    label="Width"
                    type="number"
                    placeholder="72"
                    error={errors.width?.message}
                    {...register('width')}
                  />
                </div>
                <div className="w-24">
                  <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                    Unit
                  </label>
                  <select
                    {...register('widthUnit')}
                    className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="inch">Inch</option>
                    <option value="cm">CM</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Is Tube */}
            <div className="mt-4 flex items-center justify-between p-4 bg-factory-gray rounded-xl">
              <div>
                <p className="text-white font-medium">Tubular Fabric</p>
                <p className="text-sm text-neutral-400">
                  Enable if this is a tubular knit fabric
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  {...register('isTube')}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-factory-border rounded-full peer peer-checked:bg-primary-500 peer-focus:ring-2 peer-focus:ring-primary-500/50 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
              </label>
            </div>
          </div>

          {/* Additional Details */}
          <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
            <h2 className="text-lg font-semibold text-white mb-4">
              Additional Details
            </h2>

            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                Description
              </label>
              <textarea
                {...register('description')}
                rows={3}
                className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Product description..."
              />
            </div>
          </div>

          {/* Status */}
          <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Status</h2>

            <div className="flex items-center justify-between p-4 bg-factory-gray rounded-xl">
              <div>
                <p className="text-white font-medium">Active {itemLabel}</p>
                <p className="text-sm text-neutral-400">
                  Active items appear in dropdowns and can be used in transactions
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

          {/* Submit */}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || (isFabricType && !selectedFabric)}
              className={isFabricType ? 'bg-violet-500 hover:bg-violet-600' : ''}
            >
              {isLoading ? 'Creating...' : `Create ${itemLabel}`}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
