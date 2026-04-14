'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { StatsCard } from '@/components/molecules/StatsCard';
import { useToast } from '@/contexts/ToastContext';
import { stockItemsApi, stockCategoriesApi } from '@/lib/api/inventory';
import {
  StockItem,
  StockCategoryLookup,
  StockItemType,
  stockItemTypeOptions,
  formatQuantity,
  formatCurrency,
} from '@/lib/types/inventory';

type StockFilter = 'ALL' | 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';

export default function StockItemsPage() {
  const { showToast } = useToast();
  const [items, setItems] = useState<StockItem[]>([]);
  const [categories, setCategories] = useState<StockCategoryLookup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<number | 'ALL'>('ALL');
  const [typeFilter, setTypeFilter] = useState<StockItemType | 'ALL'>('ALL');
  const [stockFilter, setStockFilter] = useState<StockFilter>('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [itemsData, categoriesData] = await Promise.all([
          stockItemsApi.getAll({
            page,
            limit: 50,
            search: searchQuery || undefined,
            categoryId: categoryFilter !== 'ALL' ? categoryFilter : undefined,
            itemType: typeFilter !== 'ALL' ? typeFilter : undefined,
          }),
          stockCategoriesApi.getLookup(),
        ]);
        setItems(itemsData.data);
        setTotalPages(itemsData.pagination.totalPages);
        setTotal(itemsData.pagination.total);
        setCategories(categoriesData);
      } catch (error: any) {
        showToast('error', 'Failed to load stock items');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [showToast, page, searchQuery, categoryFilter, typeFilter]);

  // Calculate total stock for each item across all warehouses
  const getItemTotalStock = (item: StockItem): number => {
    if (!item.stockLevels) return 0;
    return item.stockLevels.reduce((sum, sl) => sum + parseFloat(sl.quantityOnHand || '0'), 0);
  };

  // Filter by stock status (client-side)
  const filteredItems = useMemo(() => {
    if (stockFilter === 'ALL') return items;
    return items.filter((item) => {
      const totalStock = getItemTotalStock(item);
      const minStock = item.minStockLevel ? parseFloat(item.minStockLevel) : 0;

      if (stockFilter === 'IN_STOCK') return totalStock > minStock;
      if (stockFilter === 'LOW_STOCK') return totalStock > 0 && totalStock <= minStock;
      if (stockFilter === 'OUT_OF_STOCK') return totalStock === 0;
      return true;
    });
  }, [items, stockFilter]);

  // Calculate stats
  const stats = useMemo(() => {
    const totalItems = items.length;
    const activeItems = items.filter((i) => i.isActive).length;
    const lowStockItems = items.filter((i) => {
      const stock = getItemTotalStock(i);
      const min = i.minStockLevel ? parseFloat(i.minStockLevel) : 0;
      return stock > 0 && stock <= min;
    }).length;
    const outOfStock = items.filter((i) => getItemTotalStock(i) === 0).length;
    const totalValue = items.reduce((sum, i) => {
      const stock = getItemTotalStock(i);
      const cost = i.averageCost ? parseFloat(i.averageCost) : 0;
      return sum + stock * cost;
    }, 0);

    return { totalItems, activeItems, lowStockItems, outOfStock, totalValue };
  }, [items]);

  const getStockStatus = (item: StockItem) => {
    const current = getItemTotalStock(item);
    const min = item.minStockLevel ? parseFloat(item.minStockLevel) : 0;
    if (current === 0) return { label: 'Out of Stock', color: 'text-error bg-error/20' };
    if (current <= min) return { label: 'Low Stock', color: 'text-warning bg-warning/20' };
    return { label: 'In Stock', color: 'text-success bg-success/20' };
  };

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    setPage(1); // Reset to first page on search
  };

  if (isLoading && items.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Stock Items</h1>
          <p className="text-neutral-400 mt-1">
            Manage your inventory items and stock levels
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/inventory/items/new">
            <Button>+ Add Item</Button>
          </Link>
          <Link href="/inventory/transactions?action=receipt">
            <Button variant="secondary">Stock Receipt</Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatsCard
          title="Total Items"
          value={total}
          icon="📦"
        />
        <StatsCard
          title="Active"
          value={stats.activeItems}
          icon="✅"
        />
        <StatsCard
          title="Low Stock"
          value={stats.lowStockItems}
          changeType={stats.lowStockItems > 0 ? 'negative' : 'positive'}
          icon="⚠️"
        />
        <StatsCard
          title="Out of Stock"
          value={stats.outOfStock}
          changeType={stats.outOfStock > 0 ? 'negative' : 'positive'}
          icon="🚫"
        />
        <StatsCard
          title="Total Value"
          value={formatCurrency(stats.totalValue)}
          icon="💰"
        />
      </div>

      {/* Search and Filters */}
      <div className="bg-factory-dark rounded-2xl border border-factory-border p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="Search by code or name..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {/* Category filter */}
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value));
                setPage(1);
              }}
              className="px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="ALL">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>

            {/* Type filter */}
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value as StockItemType | 'ALL');
                setPage(1);
              }}
              className="px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="ALL">All Types</option>
              {stockItemTypeOptions.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>

            {/* Stock filter */}
            <div className="flex gap-1">
              {(['ALL', 'IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK'] as const).map((filter) => (
                <Button
                  key={filter}
                  variant={stockFilter === filter ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setStockFilter(filter)}
                >
                  {filter === 'ALL' && 'All'}
                  {filter === 'IN_STOCK' && 'In Stock'}
                  {filter === 'LOW_STOCK' && 'Low'}
                  {filter === 'OUT_OF_STOCK' && 'Out'}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="bg-factory-dark rounded-2xl border border-factory-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-factory-border">
                <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">Code</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">Name</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">Category</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">Type</th>
                <th className="text-right px-6 py-4 text-sm font-medium text-neutral-400">Stock</th>
                <th className="text-right px-6 py-4 text-sm font-medium text-neutral-400">Avg Cost</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">Status</th>
                <th className="text-right px-6 py-4 text-sm font-medium text-neutral-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-factory-border">
              {filteredItems.map((item) => {
                const stockStatus = getStockStatus(item);
                const totalStock = getItemTotalStock(item);
                return (
                  <tr
                    key={item.id}
                    className="hover:bg-factory-gray transition-colors"
                  >
                    <td className="px-6 py-4">
                      <span className="font-mono text-sm text-primary-400">{item.code}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <span className="text-white font-medium">{item.name}</span>
                        {item.trackBatches && (
                          <span className="ml-2 text-xs bg-primary-500/20 text-primary-400 px-1.5 py-0.5 rounded">
                            Batch
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-neutral-300">{item.category?.name || '-'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-neutral-300">
                        {stockItemTypeOptions.find((t) => t.value === item.itemType)?.label || item.itemType}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-white font-medium">
                        {formatQuantity(totalStock)}
                      </span>
                      <span className="text-neutral-400 ml-1">{item.primaryUnit?.code}</span>
                      {item.minStockLevel && (
                        <p className="text-xs text-neutral-500">
                          Min: {formatQuantity(item.minStockLevel)}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {item.averageCost ? (
                        <span className="text-white">
                          {formatCurrency(item.averageCost, item.currency)}
                        </span>
                      ) : (
                        <span className="text-neutral-500">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${stockStatus.color}`}
                      >
                        {stockStatus.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Link href={`/inventory/items/${item.id}`}>
                          <Button variant="ghost" size="sm">View</Button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {filteredItems.length === 0 && (
          <div className="text-center py-12">
            <p className="text-neutral-400">
              {items.length === 0
                ? 'No stock items yet. Add your first item!'
                : 'No items match your filters'}
            </p>
            {items.length === 0 && (
              <Link href="/inventory/items/new" className="mt-4 inline-block">
                <Button>+ Add Item</Button>
              </Link>
            )}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-factory-border">
            <p className="text-sm text-neutral-400">
              Page {page} of {totalPages} ({total} items)
            </p>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
