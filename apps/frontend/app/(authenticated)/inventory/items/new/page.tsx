'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { useToast } from '@/contexts/ToastContext';
import { stockItemsApi, stockCategoriesApi, unitsApi } from '@/lib/api/inventory';
import {
  StockItemFormData,
  StockCategoryLookup,
  Unit,
  stockItemTypeOptions,
  valuationMethodOptions,
  StockItemType,
  ValuationMethod,
} from '@/lib/types/inventory';

export default function NewStockItemPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [categories, setCategories] = useState<StockCategoryLookup[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState<StockItemFormData>({
    code: '',
    name: '',
    description: '',
    itemType: 'GENERAL',
    primaryUnitId: 0,
    valuationMethod: 'WEIGHTED_AVERAGE',
    currency: 'PKR',
    trackBatches: false,
    trackSerials: false,
    trackExpiry: false,
    isActive: true,
  });

  useEffect(() => {
    fetchLookupData();
  }, []);

  const fetchLookupData = async () => {
    try {
      setIsLoading(true);
      const [categoriesData, unitsData] = await Promise.all([
        stockCategoriesApi.getLookup(),
        unitsApi.getLookup(),
      ]);
      setCategories(categoriesData);
      setUnits(unitsData);

      // Set default unit if available
      if (unitsData.length > 0) {
        const pcsUnit = unitsData.find((u) => u.code === 'PCS');
        setFormData((prev) => ({
          ...prev,
          primaryUnitId: pcsUnit?.id || unitsData[0].id,
        }));
      }
    } catch (error: any) {
      showToast('error', 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.code || !formData.name || !formData.primaryUnitId) {
      showToast('error', 'Please fill in all required fields');
      return;
    }

    try {
      setIsSaving(true);
      const newItem = await stockItemsApi.create(formData);
      showToast('success', 'Stock item created');
      router.push(`/inventory/items/${newItem.id}`);
    } catch (error: any) {
      showToast('error', error.response?.data?.error || 'Failed to create item');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <Link href="/inventory/items" className="text-neutral-400 hover:text-white">
            &larr; Items
          </Link>
        </div>
        <h1 className="text-2xl font-semibold text-white">Add Stock Item</h1>
        <p className="text-neutral-400 mt-1">Create a new inventory item</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Basic Information</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Code *
                </label>
                <Input
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="ITEM-001"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Item Type
                </label>
                <select
                  value={formData.itemType}
                  onChange={(e) => setFormData({ ...formData, itemType: e.target.value as StockItemType })}
                  className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {stockItemTypeOptions.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                Name *
              </label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Item name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Description..."
                rows={3}
                className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                Category
              </label>
              <select
                value={formData.categoryId || ''}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value ? Number(e.target.value) : undefined })}
                className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">None</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Units & Measurement */}
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Units & Measurement</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Primary Unit *
                </label>
                <select
                  value={formData.primaryUnitId}
                  onChange={(e) => setFormData({ ...formData, primaryUnitId: Number(e.target.value) })}
                  className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Select unit...</option>
                  {units.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.name} ({unit.code})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Secondary Unit
                </label>
                <select
                  value={formData.secondaryUnitId || ''}
                  onChange={(e) => setFormData({ ...formData, secondaryUnitId: e.target.value ? Number(e.target.value) : undefined })}
                  className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">None</option>
                  {units.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.name} ({unit.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {formData.secondaryUnitId && (
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Conversion Factor
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.0001"
                  value={formData.conversionFactor || ''}
                  onChange={(e) => setFormData({ ...formData, conversionFactor: parseFloat(e.target.value) || undefined })}
                  placeholder="e.g., 12 (1 dozen = 12 pieces)"
                />
                <p className="text-xs text-neutral-500 mt-1">
                  How many primary units in one secondary unit
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Stock Settings */}
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Stock Settings</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Min Stock Level
                </label>
                <Input
                  type="number"
                  min="0"
                  value={formData.minStockLevel || ''}
                  onChange={(e) => setFormData({ ...formData, minStockLevel: parseFloat(e.target.value) || undefined })}
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Max Stock Level
                </label>
                <Input
                  type="number"
                  min="0"
                  value={formData.maxStockLevel || ''}
                  onChange={(e) => setFormData({ ...formData, maxStockLevel: parseFloat(e.target.value) || undefined })}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Reorder Point
                </label>
                <Input
                  type="number"
                  min="0"
                  value={formData.reorderPoint || ''}
                  onChange={(e) => setFormData({ ...formData, reorderPoint: parseFloat(e.target.value) || undefined })}
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Reorder Quantity
                </label>
                <Input
                  type="number"
                  min="0"
                  value={formData.reorderQuantity || ''}
                  onChange={(e) => setFormData({ ...formData, reorderQuantity: parseFloat(e.target.value) || undefined })}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-6 pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.trackBatches}
                  onChange={(e) => setFormData({ ...formData, trackBatches: e.target.checked })}
                  className="w-4 h-4 rounded bg-factory-gray border-factory-border text-primary-500 focus:ring-primary-500"
                />
                <span className="text-sm text-neutral-300">Track Batches/Lots</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.trackSerials}
                  onChange={(e) => setFormData({ ...formData, trackSerials: e.target.checked })}
                  className="w-4 h-4 rounded bg-factory-gray border-factory-border text-primary-500 focus:ring-primary-500"
                />
                <span className="text-sm text-neutral-300">Track Serial Numbers</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.trackExpiry}
                  onChange={(e) => setFormData({ ...formData, trackExpiry: e.target.checked })}
                  className="w-4 h-4 rounded bg-factory-gray border-factory-border text-primary-500 focus:ring-primary-500"
                />
                <span className="text-sm text-neutral-300">Track Expiry Dates</span>
              </label>
            </div>
          </div>
        </div>

        {/* Costing */}
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Costing</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Valuation Method
                </label>
                <select
                  value={formData.valuationMethod}
                  onChange={(e) => setFormData({ ...formData, valuationMethod: e.target.value as ValuationMethod })}
                  className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {valuationMethodOptions.map((method) => (
                    <option key={method.value} value={method.value}>
                      {method.label} - {method.description}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Currency
                </label>
                <select
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="PKR">PKR - Pakistani Rupee</option>
                  <option value="USD">USD - US Dollar</option>
                  <option value="EUR">EUR - Euro</option>
                </select>
              </div>
            </div>

            {formData.valuationMethod === 'STANDARD_COST' && (
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Standard Cost
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.standardCost || ''}
                  onChange={(e) => setFormData({ ...formData, standardCost: parseFloat(e.target.value) || undefined })}
                  placeholder="0.00"
                />
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Link href="/inventory/items">
            <Button variant="secondary">Cancel</Button>
          </Link>
          <Button type="submit" isLoading={isSaving}>
            Create Item
          </Button>
        </div>
      </form>
    </div>
  );
}
