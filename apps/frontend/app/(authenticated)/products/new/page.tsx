'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { useToast } from '@/contexts/ToastContext';
import { productsApi } from '@/lib/api/products';
import {
  departmentsApi,
  groupsApi,
  materialsApi,
  brandsApi,
  colorsApi,
  fabricSizesApi,
} from '@/lib/api/settings';
import type {
  Department,
  Group,
  Material,
  Brand,
  Color,
  FabricSize,
} from '@/lib/types/settings';

// Form validation schema
const productSchema = z.object({
  name: z.string().min(2, 'Product name is required'),
  departmentId: z.coerce.number().optional().nullable(),
  groupId: z.coerce.number().optional().nullable(),
  materialId: z.coerce.number().optional().nullable(),
  brandId: z.coerce.number().optional().nullable(),
  colorId: z.coerce.number().optional().nullable(),
  fabricSizeId: z.coerce.number().optional().nullable(),
  articleNumber: z.string().optional(),
  description: z.string().optional(),
  isActive: z.boolean(),
});

type ProductForm = z.infer<typeof productSchema>;

export default function NewProductPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Lookup data
  const [departments, setDepartments] = useState<Department[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [filteredGroups, setFilteredGroups] = useState<Group[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [colors, setColors] = useState<Color[]>([]);
  const [fabricSizes, setFabricSizes] = useState<FabricSize[]>([]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ProductForm>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      isActive: true,
    },
  });

  // Watch department to filter groups
  const selectedDepartmentId = watch('departmentId');

  // Filter groups when department changes
  useEffect(() => {
    if (selectedDepartmentId) {
      const filtered = groups.filter(
        (g) => g.departmentId === Number(selectedDepartmentId) && g.isActive
      );
      setFilteredGroups(filtered);
      // Reset group selection if current group doesn't belong to selected department
      const currentGroupId = watch('groupId');
      if (currentGroupId && !filtered.some((g) => g.id === Number(currentGroupId))) {
        setValue('groupId', null);
      }
    } else {
      setFilteredGroups([]);
      setValue('groupId', null);
    }
  }, [selectedDepartmentId, groups, setValue, watch]);

  // Fetch all lookup data
  useEffect(() => {
    const fetchData = async () => {
      setIsLoadingData(true);
      try {
        const [depts, grps, mats, brnds, clrs, sizes] = await Promise.all([
          departmentsApi.getAll().catch(() => []),
          groupsApi.getAll().catch(() => []),
          materialsApi.getAll().catch(() => []),
          brandsApi.getAll().catch(() => []),
          colorsApi.getAll().catch(() => []),
          fabricSizesApi.getAll().catch(() => []),
        ]);

        setDepartments(depts.filter((d) => d.isActive));
        setGroups(grps);
        setMaterials(mats.filter((m) => m.isActive));
        setBrands(brnds.filter((b) => b.isActive));
        setColors(clrs.filter((c) => c.isActive));
        setFabricSizes(sizes.filter((s) => s.isActive));
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
    setIsLoading(true);
    try {
      await productsApi.create({
        name: data.name,
        articleNumber: data.articleNumber || undefined,
        departmentId: data.departmentId || undefined,
        groupId: data.groupId || undefined,
        materialId: data.materialId || undefined,
        brandId: data.brandId || undefined,
        colorId: data.colorId || undefined,
        fabricSizeId: data.fabricSizeId || undefined,
        description: data.description || undefined,
        isActive: data.isActive,
      });

      showToast('success', `Product "${data.name}" created successfully!`);
      router.push('/products');
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to create product';
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
            <Link href="/products" className="text-neutral-400 hover:text-white">
              Products
            </Link>
            <span className="text-neutral-600">/</span>
            <span className="text-white">New</span>
          </div>
          <h1 className="text-2xl font-semibold text-white mt-2">Add New Product</h1>
          <p className="text-neutral-400 mt-1">
            Create a new product in your inventory
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
          {/* Basic Information */}
          <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
            <h2 className="text-lg font-semibold text-white mb-4">
              Basic Information
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Product Name */}
              <Input
                label="Product Name *"
                placeholder="Enter product name"
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

          {/* Classification */}
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
                <p className="text-white font-medium">Active Product</p>
                <p className="text-sm text-neutral-400">
                  Active products appear in dropdowns and can be used in transactions
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
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create Product'}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
