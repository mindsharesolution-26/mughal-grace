'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { useToast } from '@/contexts/ToastContext';
import { productsApi } from '@/lib/api/products';
import { Product } from '@/lib/types/product';
import { api } from '@/lib/api/client';

export default function ProductsPage() {
  const { showToast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setIsLoading(true);
        const data = await productsApi.getAll();
        setProducts(data);
      } catch (error: any) {
        showToast('error', 'Failed to load products');
      } finally {
        setIsLoading(false);
      }
    };
    fetchProducts();
  }, [showToast]);

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

  const stats = useMemo(() => {
    const totalProducts = products.length;
    const totalStock = products.reduce(
      (sum, p) => sum + parseFloat(p.currentStock || '0'),
      0
    );
    return { totalProducts, totalStock };
  }, [products]);

  const seedDummyData = async () => {
    setIsSeeding(true);
    try {
      await api.post('/products/seed-dummy');
      const data = await productsApi.getAll();
      setProducts(data);
      showToast('success', 'Demo products created successfully!');
    } catch (error: any) {
      showToast('error', error.response?.data?.error || 'Failed to seed data');
    } finally {
      setIsSeeding(false);
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Products</h1>
          <p className="text-neutral-400 mt-1">Manage your product inventory</p>
        </div>
        <div className="flex gap-3">
          {products.length === 0 && (
            <Button variant="secondary" onClick={seedDummyData} disabled={isSeeding}>
              {isSeeding ? 'Creating...' : 'Add Demo Data'}
            </Button>
          )}
          <Link href="/products/new">
            <Button>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Product
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Total Products */}
        <div className="bg-gradient-to-br from-primary-500/10 to-primary-600/5 rounded-2xl border border-primary-500/20 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-primary-400">Total Products</p>
              <p className="text-3xl font-bold text-white mt-1">{stats.totalProducts}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-primary-500/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
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
          placeholder="Search by name, article number, or QR code..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-12"
        />
      </div>

      {/* Products List */}
      <div className="bg-factory-dark rounded-2xl border border-factory-border overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-factory-gray/50 border-b border-factory-border">
          <div className="col-span-3 text-xs font-semibold text-neutral-400 uppercase tracking-wider">
            Article Number
          </div>
          <div className="col-span-3 text-xs font-semibold text-neutral-400 uppercase tracking-wider">
            QR Code
          </div>
          <div className="col-span-3 text-xs font-semibold text-neutral-400 uppercase tracking-wider text-right">
            Quantity
          </div>
          <div className="col-span-3 text-xs font-semibold text-neutral-400 uppercase tracking-wider text-center">
            Ledger
          </div>
        </div>

        {/* Table Body */}
        <div className="divide-y divide-factory-border">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-factory-gray/30 transition-colors items-center"
            >
              {/* Article Number */}
              <div className="col-span-3">
                <span className="font-mono text-sm text-primary-400 font-medium">
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

              {/* Ledger */}
              <div className="col-span-3 text-center">
                <Link href={`/products/${product.id}`}>
                  <Button variant="ghost" size="sm">
                    <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    View Ledger
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredProducts.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-factory-gray mx-auto flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <p className="text-neutral-400 mb-4">
              {products.length === 0
                ? 'No products yet. Add your first product!'
                : 'No products match your search'}
            </p>
            {products.length === 0 && (
              <Link href="/products/new">
                <Button>Add Product</Button>
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
