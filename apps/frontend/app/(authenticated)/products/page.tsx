'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { useToast } from '@/contexts/ToastContext';
import { productsApi } from '@/lib/api/products';
import { fabricsApi, Fabric } from '@/lib/api/fabrics';
import { Product } from '@/lib/types/product';
import { api } from '@/lib/api/client';
import { cn } from '@/lib/utils/cn';

type ViewType = 'goods' | 'fabric';

export default function ProductsPage() {
  const { showToast } = useToast();
  const searchParams = useSearchParams();

  // Get view from URL param
  const viewParam = searchParams.get('view') as ViewType | null;
  const selectedView: ViewType = viewParam === 'fabric' ? 'fabric' : 'goods';

  const [products, setProducts] = useState<Product[]>([]);
  const [fabrics, setFabrics] = useState<Fabric[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const isFabricView = selectedView === 'fabric';

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        if (isFabricView) {
          // Fetch Fabric Templates from General > Fabrics
          const data = await fabricsApi.getAll();
          setFabrics(data);
        } else {
          // Fetch Products (GOODS type only)
          const data = await productsApi.getByType('GOODS');
          setProducts(data);
        }
      } catch (error: any) {
        showToast('error', `Failed to load ${isFabricView ? 'fabrics' : 'products'}`);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [showToast, isFabricView]);

  // Filter products
  const filteredProducts = useMemo(() => {
    if (!searchQuery) return products;
    const query = searchQuery.toLowerCase();
    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(query) ||
        (product.articleNumber && product.articleNumber.toLowerCase().includes(query)) ||
        (product.qrCode && product.qrCode.toLowerCase().includes(query))
    );
  }, [products, searchQuery]);

  // Filter fabrics
  const filteredFabrics = useMemo(() => {
    if (!searchQuery) return fabrics;
    const query = searchQuery.toLowerCase();
    return fabrics.filter(
      (fabric) =>
        fabric.name.toLowerCase().includes(query) ||
        fabric.code.toLowerCase().includes(query)
    );
  }, [fabrics, searchQuery]);

  const stats = useMemo(() => {
    if (isFabricView) {
      const totalFabricStock = fabrics.reduce(
        (sum, f) => sum + parseFloat(f.currentStock || '0'),
        0
      );
      return {
        totalItems: fabrics.length,
        totalStock: totalFabricStock,
      };
    }
    const totalProducts = products.length;
    const totalStock = products.reduce(
      (sum, p) => sum + parseFloat(p.currentStock || '0'),
      0
    );
    return { totalItems: totalProducts, totalStock };
  }, [products, fabrics, isFabricView]);

  const seedDummyData = async () => {
    setIsSeeding(true);
    try {
      await api.post('/products/seed-dummy');
      const data = await productsApi.getByType('GOODS');
      setProducts(data);
      showToast('success', 'Demo products created successfully!');
    } catch (error: any) {
      showToast('error', error.response?.data?.error || 'Failed to seed data');
    } finally {
      setIsSeeding(false);
    }
  };

  const itemLabel = isFabricView ? 'Fabric' : 'Product';
  const itemLabelPlural = isFabricView ? 'Fabrics' : 'Products';
  const currentItems = isFabricView ? filteredFabrics : filteredProducts;
  const allItems = isFabricView ? fabrics : products;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">
            {isFabricView ? 'Fabric' : 'Goods Product'}
          </h1>
        </div>
        <div className="flex gap-3">
          {products.length === 0 && !isFabricView && (
            <Button variant="secondary" onClick={seedDummyData} disabled={isSeeding}>
              {isSeeding ? 'Creating...' : 'Add Demo Data'}
            </Button>
          )}
          {/* Only show Add button for Goods view - Fabrics come from General > Fabrics */}
          {!isFabricView && (
            <Link href="/products/new">
              <Button>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Product
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
        {/* Total Items */}
        <div className={cn(
          'rounded-2xl border p-6',
          isFabricView
            ? 'bg-gradient-to-br from-violet-500/10 to-violet-600/5 border-violet-500/20'
            : 'bg-gradient-to-br from-primary-500/10 to-primary-600/5 border-primary-500/20'
        )}>
          <div className="flex items-center justify-between">
            <div>
              <p className={cn('text-sm font-medium', isFabricView ? 'text-violet-400' : 'text-primary-400')}>
                Total {itemLabelPlural}
              </p>
              <p className="text-3xl font-bold text-white mt-1">{stats.totalItems}</p>
            </div>
            <div className={cn(
              'w-12 h-12 rounded-xl flex items-center justify-center',
              isFabricView ? 'bg-violet-500/20' : 'bg-primary-500/20'
            )}>
              {isFabricView ? (
                <svg className="w-6 h-6 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              )}
            </div>
          </div>
        </div>

        {/* Total Stock */}
        <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 rounded-2xl border border-emerald-500/20 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-emerald-400">Total Stock</p>
              <p className="text-3xl font-bold text-white mt-1">
                {stats.totalStock.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <svg className="w-5 h-5 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <Input
          placeholder={isFabricView ? 'Search by name or article code...' : 'Search by name, article number, or QR code...'}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-12"
        />
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
        </div>
      ) : (
        /* List */
        <div className="bg-factory-dark rounded-2xl border border-factory-border overflow-hidden">
          {/* Table Header - Same structure for both views */}
          <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-factory-gray/50 border-b border-factory-border">
            <div className="col-span-3 text-xs font-semibold text-neutral-400 uppercase tracking-wider">
              {isFabricView ? 'Article Code' : 'Article Number'}
            </div>
            <div className="col-span-3 text-xs font-semibold text-neutral-400 uppercase tracking-wider">
              QR Code
            </div>
            <div className="col-span-3 text-xs font-semibold text-neutral-400 uppercase tracking-wider text-right">
              Quantity
            </div>
            <div className="col-span-3 text-xs font-semibold text-neutral-400 uppercase tracking-wider text-center">
              Action
            </div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-factory-border">
            {isFabricView ? (
              // Fabric View - Show Fabric Templates
              filteredFabrics.map((fabric) => (
                <div
                  key={fabric.id}
                  className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-factory-gray/30 transition-colors items-center"
                >
                  {/* Article Code */}
                  <div className="col-span-3">
                    <span className="font-mono text-sm font-medium text-violet-400">
                      {fabric.code}
                    </span>
                    <p className="text-xs text-neutral-500 mt-0.5 truncate">{fabric.name}</p>
                  </div>

                  {/* QR Code */}
                  <div className="col-span-3">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-factory-gray text-sm font-mono text-neutral-300">
                      {fabric.qrPayload || '-'}
                    </span>
                  </div>

                  {/* Quantity */}
                  <div className="col-span-3 text-right">
                    <span className="text-lg font-semibold text-white">
                      {parseFloat(fabric.currentStock || '0').toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </span>
                  </div>

                  {/* View Details */}
                  <div className="col-span-3 text-center">
                    <Link href={`/products/fabric/${fabric.id}`}>
                      <Button variant="ghost" size="sm">
                        <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        View
                      </Button>
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              // Goods Product View - Show Products (GOODS)
              filteredProducts.map((product) => (
                <div
                  key={product.id}
                  className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-factory-gray/30 transition-colors items-center"
                >
                  {/* Article Number */}
                  <div className="col-span-3">
                    <span className="font-mono text-sm font-medium text-primary-400">
                      {product.articleNumber || '-'}
                    </span>
                    <p className="text-xs text-neutral-500 mt-0.5 truncate">{product.name}</p>
                  </div>

                  {/* QR Code */}
                  <div className="col-span-3">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-factory-gray text-sm font-mono text-neutral-300">
                      {product.qrCode}
                    </span>
                  </div>

                  {/* Quantity */}
                  <div className="col-span-3 text-right">
                    <span className="text-lg font-semibold text-white">
                      {parseFloat(product.currentStock || '0').toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </span>
                  </div>

                  {/* View Details */}
                  <div className="col-span-3 text-center">
                    <Link href={`/products/${product.id}`}>
                      <Button variant="ghost" size="sm">
                        <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        View
                      </Button>
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Empty State */}
          {currentItems.length === 0 && (
            <div className="text-center py-16">
              <div className={cn(
                'w-16 h-16 rounded-full mx-auto flex items-center justify-center mb-4',
                isFabricView ? 'bg-violet-500/10' : 'bg-factory-gray'
              )}>
                {isFabricView ? (
                  <svg className="w-8 h-8 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                ) : (
                  <svg className="w-8 h-8 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                )}
              </div>
              <p className="text-neutral-400 mb-4">
                {allItems.length === 0
                  ? isFabricView
                    ? 'No fabrics yet. Add fabrics from General > Fabrics.'
                    : 'No products yet. Add your first product!'
                  : `No ${itemLabelPlural.toLowerCase()} match your search`}
              </p>
              {/* Only show Add button for Products - Fabrics come from General > Fabrics */}
              {allItems.length === 0 && !isFabricView && (
                <Link href="/products/new">
                  <Button>Add Product</Button>
                </Link>
              )}
              {allItems.length === 0 && isFabricView && (
                <Link href="/settings/fabrics">
                  <Button variant="secondary">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    Go to Fabrics
                  </Button>
                </Link>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
