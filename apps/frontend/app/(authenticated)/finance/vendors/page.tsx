'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { StatsCard } from '@/components/molecules/StatsCard';
import { yarnVendorsApi, YarnVendor } from '@/lib/api/yarn-vendors';
import { dyeingVendorsApi, DyeingVendorWithStats } from '@/lib/api/dyeing';
import { suppliersApi, GeneralSupplier } from '@/lib/api/suppliers';
import { formatPKR } from '@/lib/types/vendor';
import { Loader2, Search } from 'lucide-react';

type VendorType = 'YARN' | 'DYEING' | 'GENERAL';

export default function VendorsPage() {
  const [vendorType, setVendorType] = useState<VendorType>('YARN');
  const [yarnVendors, setYarnVendors] = useState<YarnVendor[]>([]);
  const [dyeingVendors, setDyeingVendors] = useState<DyeingVendorWithStats[]>([]);
  const [generalSuppliers, setGeneralSuppliers] = useState<GeneralSupplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  useEffect(() => {
    loadVendors();
  }, []);

  const loadVendors = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [yarnData, dyeingData, generalData] = await Promise.all([
        yarnVendorsApi.getAll(),
        dyeingVendorsApi.getAll(),
        suppliersApi.getAll(),
      ]);
      setYarnVendors(yarnData);
      setDyeingVendors(dyeingData);
      setGeneralSuppliers(generalData);
    } catch (err: any) {
      setError(err.message || 'Failed to load vendors');
    } finally {
      setIsLoading(false);
    }
  };

  // Get current vendors based on selected type
  const currentVendors = vendorType === 'YARN'
    ? yarnVendors
    : vendorType === 'DYEING'
      ? dyeingVendors
      : generalSuppliers;

  // Filter vendors
  const filteredVendors = useMemo(() => {
    return currentVendors.filter((vendor) => {
      const matchesSearch =
        searchQuery === '' ||
        vendor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        vendor.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (vendor.contactPerson?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (vendor.city?.toLowerCase() || '').includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && vendor.isActive) ||
        (statusFilter === 'inactive' && !vendor.isActive);

      return matchesSearch && matchesStatus;
    });
  }, [currentVendors, searchQuery, statusFilter]);

  // Calculate stats based on selected vendor type
  const stats = useMemo(() => {
    const vendors = currentVendors;
    const totalVendors = vendors.length;
    const activeVendors = vendors.filter((v) => v.isActive).length;

    if (vendorType === 'YARN') {
      const yarnList = vendors as YarnVendor[];
      const totalCreditLimit = yarnList.reduce((sum, v) => {
        return sum + (v.creditLimit ? parseFloat(v.creditLimit) : 0);
      }, 0);

      return {
        totalVendors,
        activeVendors,
        totalCreditLimit,
      };
    } else if (vendorType === 'DYEING') {
      const dyeingList = vendors as DyeingVendorWithStats[];
      const totalActiveOrders = dyeingList.reduce((sum, v) => sum + (v.activeOrders || 0), 0);

      return {
        totalVendors,
        activeVendors,
        totalActiveOrders,
      };
    } else {
      // GENERAL suppliers
      const generalList = vendors as GeneralSupplier[];
      const totalCreditLimit = generalList.reduce((sum, v) => {
        return sum + (v.creditLimit ? parseFloat(v.creditLimit) : 0);
      }, 0);

      return {
        totalVendors,
        activeVendors,
        totalCreditLimit,
      };
    }
  }, [currentVendors, vendorType]);

  // Get edit/view URLs based on vendor type
  const getVendorUrl = (vendorId: number) => {
    if (vendorType === 'YARN') return `/finance/vendors/${vendorId}`;
    if (vendorType === 'DYEING') return `/dyeing/vendors/${vendorId}`;
    return `/finance/suppliers/${vendorId}`;
  };

  const getEditUrl = (vendorId: number) => {
    if (vendorType === 'YARN') return `/finance/vendors/${vendorId}/edit`;
    if (vendorType === 'DYEING') return `/dyeing/vendors/${vendorId}/edit`;
    return `/finance/suppliers/${vendorId}/edit`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm">
            <Link href="/finance" className="text-neutral-400 hover:text-white">
              Finance
            </Link>
            <span className="text-neutral-600">/</span>
            <span className="text-white">Vendors</span>
          </div>
          <h1 className="text-2xl font-semibold text-white mt-2">Vendors</h1>
          <p className="text-neutral-400 mt-1">
            Manage vendor information, balances, and ledgers
          </p>
        </div>
        <Link href="/finance/vendors/new">
          <Button>+ Add Vendor</Button>
        </Link>
      </div>

      {error && (
        <div className="bg-error/10 border border-error/20 rounded-xl p-4 text-error">
          {error}
          <Button variant="ghost" size="sm" onClick={loadVendors} className="ml-4">
            Retry
          </Button>
        </div>
      )}

      {/* Vendor Type Tabs */}
      <div className="flex gap-2 border-b border-factory-border">
        <button
          onClick={() => setVendorType('YARN')}
          className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
            vendorType === 'YARN'
              ? 'border-primary-500 text-primary-400'
              : 'border-transparent text-neutral-400 hover:text-white'
          }`}
        >
          Yarn Vendors ({yarnVendors.length})
        </button>
        <button
          onClick={() => setVendorType('DYEING')}
          className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
            vendorType === 'DYEING'
              ? 'border-primary-500 text-primary-400'
              : 'border-transparent text-neutral-400 hover:text-white'
          }`}
        >
          Dyeing Vendors ({dyeingVendors.length})
        </button>
        <button
          onClick={() => setVendorType('GENERAL')}
          className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
            vendorType === 'GENERAL'
              ? 'border-primary-500 text-primary-400'
              : 'border-transparent text-neutral-400 hover:text-white'
          }`}
        >
          General Suppliers ({generalSuppliers.length})
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatsCard
          title={vendorType === 'GENERAL' ? 'Total Suppliers' : 'Total Vendors'}
          value={stats.totalVendors}
          icon={vendorType === 'YARN' ? '🧵' : vendorType === 'DYEING' ? '🎨' : '🏭'}
        />
        <StatsCard
          title={vendorType === 'GENERAL' ? 'Active Suppliers' : 'Active Vendors'}
          value={stats.activeVendors}
          change={`${stats.totalVendors - stats.activeVendors} inactive`}
          changeType="neutral"
          icon="✓"
        />
        {vendorType === 'YARN' || vendorType === 'GENERAL' ? (
          <StatsCard
            title="Total Credit Limit"
            value={formatPKR(stats.totalCreditLimit || 0)}
            icon="💳"
          />
        ) : (
          <StatsCard
            title="Active Orders"
            value={stats.totalActiveOrders || 0}
            icon="📦"
          />
        )}
      </div>

      {/* Search and Filters */}
      <div className="bg-factory-dark rounded-2xl border border-factory-border p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
            <Input
              placeholder="Search by name, code, contact, or city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
              className="px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Vendors Table */}
      <div className="bg-factory-dark rounded-2xl border border-factory-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-factory-border">
                <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">
                  Vendor
                </th>
                <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">
                  Contact
                </th>
                <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">
                  City
                </th>
                {vendorType === 'YARN' ? (
                  <>
                    <th className="text-right px-6 py-4 text-sm font-medium text-neutral-400">
                      Credit Limit
                    </th>
                    <th className="text-center px-6 py-4 text-sm font-medium text-neutral-400">
                      Payment Terms
                    </th>
                  </>
                ) : vendorType === 'DYEING' ? (
                  <>
                    <th className="text-center px-6 py-4 text-sm font-medium text-neutral-400">
                      Active Orders
                    </th>
                    <th className="text-center px-6 py-4 text-sm font-medium text-neutral-400">
                      Completed
                    </th>
                  </>
                ) : (
                  <>
                    <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">
                      Type
                    </th>
                    <th className="text-center px-6 py-4 text-sm font-medium text-neutral-400">
                      Payment Terms
                    </th>
                  </>
                )}
                <th className="text-center px-6 py-4 text-sm font-medium text-neutral-400">
                  Status
                </th>
                <th className="text-right px-6 py-4 text-sm font-medium text-neutral-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-factory-border">
              {filteredVendors.map((vendor) => {
                const isYarn = vendorType === 'YARN';
                const isDyeing = vendorType === 'DYEING';
                const isGeneral = vendorType === 'GENERAL';
                const yarnVendor = isYarn ? vendor as YarnVendor : null;
                const dyeingVendor = isDyeing ? vendor as DyeingVendorWithStats : null;
                const generalSupplier = isGeneral ? vendor as GeneralSupplier : null;

                return (
                  <tr key={vendor.id} className="hover:bg-factory-gray transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <Link
                          href={getVendorUrl(vendor.id)}
                          className="text-white font-medium hover:text-primary-400"
                        >
                          {vendor.name}
                        </Link>
                        <p className="text-sm text-neutral-400 font-mono">{vendor.code}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        {vendor.contactPerson && (
                          <p className="text-white">{vendor.contactPerson}</p>
                        )}
                        <p className="text-sm text-neutral-400">{vendor.phone || '-'}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-neutral-300">
                      {vendor.city || '-'}
                    </td>
                    {isYarn && yarnVendor ? (
                      <>
                        <td className="px-6 py-4 text-right text-neutral-300">
                          {yarnVendor.creditLimit
                            ? formatPKR(parseFloat(yarnVendor.creditLimit))
                            : '-'}
                        </td>
                        <td className="px-6 py-4 text-center text-neutral-300">
                          {yarnVendor.paymentTerms} days
                        </td>
                      </>
                    ) : isDyeing && dyeingVendor ? (
                      <>
                        <td className="px-6 py-4 text-center text-neutral-300">
                          {dyeingVendor.activeOrders || 0}
                        </td>
                        <td className="px-6 py-4 text-center text-neutral-300">
                          {dyeingVendor.completedOrders || 0}
                        </td>
                      </>
                    ) : isGeneral && generalSupplier ? (
                      <>
                        <td className="px-6 py-4 text-neutral-300">
                          {generalSupplier.supplierType || '-'}
                        </td>
                        <td className="px-6 py-4 text-center text-neutral-300">
                          {generalSupplier.paymentTerms} days
                        </td>
                      </>
                    ) : null}
                    <td className="px-6 py-4">
                      <div className="flex justify-center">
                        <span
                          className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                            vendor.isActive
                              ? 'bg-success/20 text-success'
                              : 'bg-neutral-500/20 text-neutral-400'
                          }`}
                        >
                          {vendor.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <Link href={getVendorUrl(vendor.id)}>
                          <Button variant="ghost" size="sm">
                            View
                          </Button>
                        </Link>
                        <Link href={getEditUrl(vendor.id)}>
                          <Button variant="secondary" size="sm">
                            Edit
                          </Button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredVendors.length === 0 && !isLoading && (
            <div className="text-center py-12">
              <p className="text-neutral-400">
                No {vendorType === 'GENERAL' ? 'general suppliers' : `${vendorType.toLowerCase()} vendors`} found.
              </p>
              <Link href="/finance/vendors/new">
                <Button className="mt-4">
                  Add Your First {vendorType === 'GENERAL' ? 'Supplier' : 'Vendor'}
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Quick Tips */}
      <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
        <h3 className="text-lg font-semibold text-white mb-3">
          {vendorType === 'GENERAL' ? 'Supplier' : 'Vendor'} Management Tips
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="flex items-start gap-3">
            <span className="text-lg">💡</span>
            <p className="text-neutral-400">
              Click on a {vendorType === 'GENERAL' ? 'supplier' : 'vendor'} name to view their complete details, ledger, and payment history.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-lg">⚠️</span>
            <p className="text-neutral-400">
              {vendorType === 'YARN'
                ? 'Set credit limits to prevent exceeding payment capacity with any vendor.'
                : vendorType === 'DYEING'
                  ? 'Track turnaround time and quality ratings to evaluate vendor performance.'
                  : 'Categorize suppliers by type (Needles, Spare Parts, Chemicals, etc.) for better organization.'}
            </p>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-lg">📊</span>
            <p className="text-neutral-400">
              Track payment terms and credit limits to manage {vendorType === 'GENERAL' ? 'supplier' : 'vendor'} relationships effectively.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
