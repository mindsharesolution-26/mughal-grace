'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { useToast } from '@/contexts/ToastContext';
import {
  stockItemsApi,
  stockCategoriesApi,
  unitsApi,
  stockTransactionsApi,
} from '@/lib/api/inventory';
import {
  StockItem,
  StockItemFormData,
  StockCategoryLookup,
  Unit,
  StockTransaction,
  stockItemTypeOptions,
  valuationMethodOptions,
  formatQuantity,
  formatCurrency,
  getTransactionDirection,
  transactionTypeOptions,
} from '@/lib/types/inventory';

export default function StockItemDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const itemId = Number(params.id);

  const [item, setItem] = useState<StockItem | null>(null);
  const [categories, setCategories] = useState<StockCategoryLookup[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<StockTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<StockItemFormData>>({});

  useEffect(() => {
    fetchData();
  }, [itemId]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [itemData, categoriesData, unitsData, txnData] = await Promise.all([
        stockItemsApi.getById(itemId),
        stockCategoriesApi.getLookup(),
        unitsApi.getLookup(),
        stockTransactionsApi.getAll({ itemId, limit: 20 }),
      ]);
      setItem(itemData);
      setCategories(categoriesData);
      setUnits(unitsData);
      setRecentTransactions(txnData.data);

      // Initialize form data
      setFormData({
        code: itemData.code,
        name: itemData.name,
        description: itemData.description || '',
        itemType: itemData.itemType,
        categoryId: itemData.categoryId || undefined,
        primaryUnitId: itemData.primaryUnitId,
        secondaryUnitId: itemData.secondaryUnitId || undefined,
        conversionFactor: itemData.conversionFactor ? parseFloat(itemData.conversionFactor) : undefined,
        trackBatches: itemData.trackBatches,
        trackSerials: itemData.trackSerials,
        trackExpiry: itemData.trackExpiry,
        minStockLevel: itemData.minStockLevel ? parseFloat(itemData.minStockLevel) : undefined,
        reorderPoint: itemData.reorderPoint ? parseFloat(itemData.reorderPoint) : undefined,
        reorderQuantity: itemData.reorderQuantity ? parseFloat(itemData.reorderQuantity) : undefined,
        maxStockLevel: itemData.maxStockLevel ? parseFloat(itemData.maxStockLevel) : undefined,
        valuationMethod: itemData.valuationMethod,
        standardCost: itemData.standardCost ? parseFloat(itemData.standardCost) : undefined,
        currency: itemData.currency,
        isActive: itemData.isActive,
      });
    } catch (error: any) {
      showToast('error', 'Failed to load item');
      router.push('/inventory/items');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await stockItemsApi.update(itemId, formData);
      showToast('success', 'Item updated');
      setIsEditing(false);
      fetchData();
    } catch (error: any) {
      showToast('error', error.response?.data?.error || 'Failed to update item');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to deactivate this item?')) return;

    try {
      await stockItemsApi.delete(itemId);
      showToast('success', 'Item deactivated');
      router.push('/inventory/items');
    } catch (error: any) {
      showToast('error', error.response?.data?.error || 'Failed to deactivate item');
    }
  };

  // Calculate total stock
  const totalStock = item?.stockLevels?.reduce(
    (sum, sl) => sum + parseFloat(sl.quantityOnHand || '0'),
    0
  ) || 0;

  const totalValue = item?.stockLevels?.reduce(
    (sum, sl) => sum + parseFloat(sl.totalValue || '0'),
    0
  ) || 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="text-center py-12">
        <p className="text-neutral-400">Item not found</p>
        <Link href="/inventory/items" className="mt-4 inline-block">
          <Button>Back to Items</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link href="/inventory/items" className="text-neutral-400 hover:text-white">
              &larr; Items
            </Link>
          </div>
          <h1 className="text-2xl font-semibold text-white">{item.name}</h1>
          <p className="text-primary-400 font-mono">{item.code}</p>
        </div>
        <div className="flex gap-3">
          {!isEditing ? (
            <>
              <Link href={`/inventory/transactions?action=receipt&itemId=${item.id}`}>
                <Button>+ Stock In</Button>
              </Link>
              <Button variant="secondary" onClick={() => setIsEditing(true)}>
                Edit
              </Button>
              {item.isActive && (
                <Button variant="ghost" onClick={handleDelete}>
                  Deactivate
                </Button>
              )}
            </>
          ) : (
            <>
              <Button variant="secondary" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} isLoading={isSaving}>
                Save Changes
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-4">
          <p className="text-neutral-400 text-sm">Total Stock</p>
          <p className="text-2xl font-semibold text-white">
            {formatQuantity(totalStock)} <span className="text-sm text-neutral-400">{item.primaryUnit?.code}</span>
          </p>
        </div>
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-4">
          <p className="text-neutral-400 text-sm">Total Value</p>
          <p className="text-2xl font-semibold text-white">{formatCurrency(totalValue, item.currency)}</p>
        </div>
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-4">
          <p className="text-neutral-400 text-sm">Average Cost</p>
          <p className="text-2xl font-semibold text-white">
            {item.averageCost ? formatCurrency(item.averageCost, item.currency) : '-'}
          </p>
        </div>
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-4">
          <p className="text-neutral-400 text-sm">Active Alerts</p>
          <p className="text-2xl font-semibold text-white">
            {item.alerts?.filter((a) => a.status === 'ACTIVE').length || 0}
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Basic Information</h2>
            {isEditing ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-2">Code</label>
                    <Input value={formData.code} disabled />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-2">Type</label>
                    <select
                      value={formData.itemType}
                      onChange={(e) => setFormData({ ...formData, itemType: e.target.value as any })}
                      className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      {stockItemTypeOptions.map((type) => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">Name</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={2}
                    className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">Category</label>
                  <select
                    value={formData.categoryId || ''}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value ? Number(e.target.value) : undefined })}
                    className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">None</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-factory-border">
                  <span className="text-neutral-400">Type</span>
                  <span className="text-white">
                    {stockItemTypeOptions.find((t) => t.value === item.itemType)?.label}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-factory-border">
                  <span className="text-neutral-400">Category</span>
                  <span className="text-white">{item.category?.name || '-'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-factory-border">
                  <span className="text-neutral-400">Primary Unit</span>
                  <span className="text-white">{item.primaryUnit?.name}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-factory-border">
                  <span className="text-neutral-400">Valuation Method</span>
                  <span className="text-white">
                    {valuationMethodOptions.find((v) => v.value === item.valuationMethod)?.label}
                  </span>
                </div>
                {item.description && (
                  <div className="py-2">
                    <span className="text-neutral-400 block mb-1">Description</span>
                    <span className="text-white">{item.description}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Stock Levels by Warehouse */}
          <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Stock Levels by Warehouse</h2>
            {item.stockLevels && item.stockLevels.length > 0 ? (
              <div className="space-y-3">
                {item.stockLevels.map((sl) => (
                  <div
                    key={sl.id}
                    className="flex items-center justify-between bg-factory-gray rounded-xl px-4 py-3"
                  >
                    <div>
                      <p className="text-white font-medium">{sl.warehouse?.name}</p>
                      <p className="text-sm text-neutral-400">
                        Available: {formatQuantity(sl.quantityAvailable)} |
                        Reserved: {formatQuantity(sl.quantityReserved)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-medium">
                        {formatQuantity(sl.quantityOnHand)} {item.primaryUnit?.code}
                      </p>
                      <p className="text-sm text-neutral-400">{formatCurrency(sl.totalValue)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-neutral-400">No stock in any warehouse</p>
            )}
          </div>

          {/* Recent Transactions */}
          <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Recent Transactions</h2>
              <Link href={`/inventory/transactions?itemId=${item.id}`}>
                <Button variant="ghost" size="sm">View All</Button>
              </Link>
            </div>
            {recentTransactions.length > 0 ? (
              <div className="space-y-2">
                {recentTransactions.map((txn) => {
                  const direction = getTransactionDirection(txn.transactionType);
                  return (
                    <div
                      key={txn.id}
                      className="flex items-center justify-between bg-factory-gray rounded-xl px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                          direction === 'IN' ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'
                        }`}>
                          {direction === 'IN' ? '↓' : '↑'}
                        </span>
                        <div>
                          <p className="text-white font-medium">
                            {transactionTypeOptions.find((t) => t.value === txn.transactionType)?.label}
                          </p>
                          <p className="text-sm text-neutral-400">
                            {txn.transactionNumber} • {new Date(txn.transactionDate).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <span className={`font-medium ${direction === 'IN' ? 'text-success' : 'text-warning'}`}>
                        {direction === 'IN' ? '+' : '-'}{formatQuantity(txn.quantity)}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-neutral-400">No transactions yet</p>
            )}
          </div>
        </div>

        {/* Right Column - Settings & Batches */}
        <div className="space-y-6">
          {/* Stock Settings */}
          <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Stock Settings</h2>
            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">Min Stock Level</label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.minStockLevel || ''}
                    onChange={(e) => setFormData({ ...formData, minStockLevel: parseFloat(e.target.value) || undefined })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">Reorder Point</label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.reorderPoint || ''}
                    onChange={(e) => setFormData({ ...formData, reorderPoint: parseFloat(e.target.value) || undefined })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">Reorder Quantity</label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.reorderQuantity || ''}
                    onChange={(e) => setFormData({ ...formData, reorderQuantity: parseFloat(e.target.value) || undefined })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.trackBatches}
                      onChange={(e) => setFormData({ ...formData, trackBatches: e.target.checked })}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm text-neutral-300">Track Batches</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.trackExpiry}
                      onChange={(e) => setFormData({ ...formData, trackExpiry: e.target.checked })}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm text-neutral-300">Track Expiry</span>
                  </label>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-factory-border">
                  <span className="text-neutral-400">Min Stock</span>
                  <span className="text-white">{item.minStockLevel ? formatQuantity(item.minStockLevel) : '-'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-factory-border">
                  <span className="text-neutral-400">Reorder Point</span>
                  <span className="text-white">{item.reorderPoint ? formatQuantity(item.reorderPoint) : '-'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-factory-border">
                  <span className="text-neutral-400">Reorder Qty</span>
                  <span className="text-white">{item.reorderQuantity ? formatQuantity(item.reorderQuantity) : '-'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-factory-border">
                  <span className="text-neutral-400">Track Batches</span>
                  <span className={item.trackBatches ? 'text-success' : 'text-neutral-500'}>
                    {item.trackBatches ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-neutral-400">Track Expiry</span>
                  <span className={item.trackExpiry ? 'text-success' : 'text-neutral-500'}>
                    {item.trackExpiry ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Active Batches */}
          {item.trackBatches && (
            <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Active Batches</h2>
              {item.batches && item.batches.length > 0 ? (
                <div className="space-y-3">
                  {item.batches.map((batch) => (
                    <div
                      key={batch.id}
                      className="bg-factory-gray rounded-xl px-4 py-3"
                    >
                      <div className="flex justify-between mb-1">
                        <span className="text-white font-medium">{batch.batchNumber}</span>
                        <span className="text-white">{formatQuantity(batch.currentQuantity)}</span>
                      </div>
                      {batch.expiryDate && (
                        <p className="text-sm text-neutral-400">
                          Expires: {new Date(batch.expiryDate).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-neutral-400">No active batches</p>
              )}
            </div>
          )}

          {/* Alerts */}
          {item.alerts && item.alerts.length > 0 && (
            <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Active Alerts</h2>
              <div className="space-y-2">
                {item.alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="flex items-center gap-3 bg-error/10 border border-error/30 rounded-xl px-4 py-3"
                  >
                    <span>⚠️</span>
                    <div>
                      <p className="text-error font-medium">{alert.alertType.replace('_', ' ')}</p>
                      <p className="text-sm text-neutral-400">
                        Current: {formatQuantity(alert.currentLevel)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
