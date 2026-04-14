'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { StatsCard } from '@/components/molecules/StatsCard';
import { suppliersApi, GeneralSupplier } from '@/lib/api/suppliers';
import {
  SupplierType,
  SUPPLIER_TYPES,
  formatPKR,
} from '@/lib/types/supplier';

export default function SuppliersListPage() {
  const [suppliers, setSuppliers] = useState<GeneralSupplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [typeFilter, setTypeFilter] = useState<SupplierType | 'all'>('all');

  // Fetch suppliers from API
  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await suppliersApi.getAll();
        setSuppliers(data);
      } catch (err: any) {
        console.error('Failed to fetch suppliers:', err);
        setError(err.response?.data?.message || 'Failed to load suppliers');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSuppliers();
  }, []);

  // Filter suppliers
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((supplier) => {
      const matchesSearch =
        searchQuery === '' ||
        supplier.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        supplier.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        supplier.contactPerson?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        supplier.city?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && supplier.isActive) ||
        (statusFilter === 'inactive' && !supplier.isActive);

      const matchesType =
        typeFilter === 'all' || supplier.supplierType === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [suppliers, searchQuery, statusFilter, typeFilter]);

  // Calculate stats
  const stats = useMemo(() => {
    const totalSuppliers = suppliers.length;
    const activeSuppliers = suppliers.filter((s) => s.isActive).length;
    const totalOutstanding = suppliers.reduce((sum, s) => {
      const balance = typeof s.creditLimit === 'string'
        ? parseFloat(s.creditLimit) || 0
        : s.balance?.currentBalance || 0;
      return sum + balance;
    }, 0);

    return {
      totalSuppliers,
      activeSuppliers,
      totalOutstanding,
    };
  }, [suppliers]);

  // Render star rating
  const renderRating = (rating: number | null) => {
    const ratingValue = rating || 0;
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={star <= ratingValue ? 'text-yellow-400' : 'text-neutral-600'}
          >
            ★
          </span>
        ))}
      </div>
    );
  };

  // Get balance for a supplier
  const getBalance = (supplier: GeneralSupplier): number => {
    return supplier.balance?.currentBalance || 0;
  };

  // Get credit limit
  const getCreditLimit = (supplier: GeneralSupplier): number => {
    if (!supplier.creditLimit) return 0;
    return typeof supplier.creditLimit === 'string'
      ? parseFloat(supplier.creditLimit) || 0
      : supplier.creditLimit;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-factory-gray rounded w-1/3 mb-4" />
          <div className="h-4 bg-factory-gray rounded w-1/2 mb-8" />
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-factory-gray rounded-2xl" />
            ))}
          </div>
          <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 bg-factory-gray rounded mb-2" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-error mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm">
            <Link href="/payables" className="text-neutral-400 hover:text-white">
              Payables
            </Link>
            <span className="text-neutral-600">/</span>
            <span className="text-white">General Suppliers</span>
          </div>
          <h1 className="text-2xl font-semibold text-white mt-2">General Suppliers</h1>
          <p className="text-neutral-400 mt-1">
            Manage suppliers for materials, parts, services, and transport
          </p>
        </div>
        <Link href="/payables/suppliers/new">
          <Button>+ Add Supplier</Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatsCard
          title="Total Suppliers"
          value={stats.totalSuppliers}
          icon="🏭"
        />
        <StatsCard
          title="Active Suppliers"
          value={stats.activeSuppliers}
          change={`${stats.totalSuppliers - stats.activeSuppliers} inactive`}
          changeType="neutral"
          icon="✓"
        />
        <StatsCard
          title="Total Outstanding"
          value={formatPKR(stats.totalOutstanding)}
          icon="💰"
        />
      </div>

      {/* Search and Filters */}
      <div className="bg-factory-dark rounded-2xl border border-factory-border p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="Search by name, code, contact, or city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
              className="px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Types</option>
              {Object.values(SUPPLIER_TYPES).map((type) => (
                <option key={type.code} value={type.code}>
                  {type.label}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              className="px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Suppliers Table */}
      <div className="bg-factory-dark rounded-2xl border border-factory-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-factory-border">
                <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">Code</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">Supplier</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">Type</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">Contact</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">City</th>
                <th className="text-right px-6 py-4 text-sm font-medium text-neutral-400">Balance</th>
                <th className="text-center px-6 py-4 text-sm font-medium text-neutral-400">Rating</th>
                <th className="text-center px-6 py-4 text-sm font-medium text-neutral-400">Status</th>
                <th className="text-right px-6 py-4 text-sm font-medium text-neutral-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-factory-border">
              {filteredSuppliers.map((supplier) => {
                const balance = getBalance(supplier);
                const creditLimit = getCreditLimit(supplier);
                return (
                  <tr key={supplier.id} className="hover:bg-factory-gray transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-mono text-sm text-primary-400">
                        {supplier.code}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        href={`/payables/suppliers/${supplier.id}`}
                        className="text-white font-medium hover:text-primary-400 transition-colors"
                      >
                        {supplier.name}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 text-xs rounded-md bg-factory-gray text-neutral-300">
                        {supplier.supplierType ? (SUPPLIER_TYPES[supplier.supplierType as SupplierType]?.label || supplier.supplierType) : '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-white">{supplier.contactPerson || '-'}</p>
                        <p className="text-sm text-neutral-400">{supplier.phone || '-'}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-neutral-300">{supplier.city || '-'}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span
                        className={`font-medium ${
                          balance > 0 ? 'text-warning' : 'text-success'
                        }`}
                      >
                        {formatPKR(balance)}
                      </span>
                      {creditLimit > 0 && balance > creditLimit * 0.8 && (
                        <p className="text-xs text-error">Near limit</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center">
                        {renderRating(supplier.rating)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center">
                        <span
                          className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                            supplier.isActive
                              ? 'bg-success/20 text-success'
                              : 'bg-neutral-500/20 text-neutral-400'
                          }`}
                        >
                          {supplier.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <Link href={`/payables/suppliers/${supplier.id}`}>
                          <Button variant="ghost" size="sm">View</Button>
                        </Link>
                        <Link href={`/payables/suppliers/${supplier.id}/edit`}>
                          <Button variant="ghost" size="sm">Edit</Button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredSuppliers.length === 0 && (
            <div className="text-center py-12">
              <p className="text-neutral-400">
                {suppliers.length === 0
                  ? 'No suppliers found. Add your first supplier to get started.'
                  : 'No suppliers found matching your search.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Summary Footer */}
      <div className="bg-factory-dark rounded-2xl border border-factory-border p-4">
        <div className="flex flex-wrap gap-6 text-sm">
          <div>
            <span className="text-neutral-400">Showing:</span>{' '}
            <span className="text-white font-medium">{filteredSuppliers.length}</span>{' '}
            <span className="text-neutral-400">of {suppliers.length} suppliers</span>
          </div>
          <div>
            <span className="text-neutral-400">Total Outstanding:</span>{' '}
            <span className="text-warning font-medium">
              {formatPKR(filteredSuppliers.reduce((sum, s) => sum + getBalance(s), 0))}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
