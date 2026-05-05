'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { StatsCard } from '@/components/molecules/StatsCard';
import { useToast } from '@/contexts/ToastContext';
import { dyeingInvoicesApi } from '@/lib/api/dyeing-invoices';
import { dyeingVendorsApi } from '@/lib/api/dyeing';
import {
  DyeingInvoiceListItem,
  DyeingInvoiceStats,
  DyeingInvoiceStatus,
  DyeingInvoiceWithRelations,
} from '@/lib/types/dyeing-invoice';
import { DyeingVendorLookup } from '@/lib/types/dyeing';
import { DyeingInvoiceDetailModal } from '@/components/organisms/DyeingInvoiceDetailModal';
import { RecordPaymentModal } from '@/components/organisms/RecordPaymentModal';
import {
  FileSpreadsheet,
  Search,
  Filter,
  Clock,
  CheckCircle,
  DollarSign,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Eye,
  CreditCard,
  Building2,
} from 'lucide-react';

type StatusFilter = 'ALL' | DyeingInvoiceStatus;

export default function DyeingInvoicesPage() {
  const { showToast } = useToast();

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<DyeingInvoiceStats | null>(null);
  const [invoices, setInvoices] = useState<DyeingInvoiceListItem[]>([]);
  const [vendors, setVendors] = useState<DyeingVendorLookup[]>([]);

  // Filters
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [vendorFilter, setVendorFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 20;

  // Modals
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<DyeingInvoiceWithRelations | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  useEffect(() => {
    fetchVendors();
  }, []);

  useEffect(() => {
    fetchData();
  }, [page, statusFilter, vendorFilter, searchQuery]);

  const fetchVendors = async () => {
    try {
      const data = await dyeingVendorsApi.getLookup();
      setVendors(data);
    } catch (error) {
      console.error('Failed to load vendors', error);
    }
  };

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [statsData, invoicesData] = await Promise.all([
        dyeingInvoicesApi.getStats(),
        dyeingInvoicesApi.getAll({
          page,
          limit,
          status: statusFilter !== 'ALL' ? statusFilter : undefined,
          vendorId: vendorFilter ? Number(vendorFilter) : undefined,
          search: searchQuery || undefined,
        }),
      ]);
      setStats(statsData);
      setInvoices(invoicesData.invoices);
      setTotalPages(invoicesData.pagination.totalPages);
    } catch (error: any) {
      showToast('error', error.response?.data?.error || 'Failed to load invoices');
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewInvoice = (invoiceId: number) => {
    setSelectedInvoiceId(invoiceId);
    setIsDetailModalOpen(true);
  };

  const handleRecordPayment = async (invoice: DyeingInvoiceListItem) => {
    try {
      const fullInvoice = await dyeingInvoicesApi.getById(invoice.id);
      setSelectedInvoice(fullInvoice);
      setIsPaymentModalOpen(true);
    } catch (error: any) {
      showToast('error', 'Failed to load invoice details');
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; text: string; icon: typeof Clock }> = {
      PENDING: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', icon: Clock },
      READY: { bg: 'bg-blue-500/20', text: 'text-blue-400', icon: AlertCircle },
      APPROVED: { bg: 'bg-green-500/20', text: 'text-green-400', icon: CheckCircle },
      PAID: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', icon: DollarSign },
      CANCELLED: { bg: 'bg-red-500/20', text: 'text-red-400', icon: AlertCircle },
    };
    const style = styles[status] || styles.PENDING;
    const Icon = style.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${style.bg} ${style.text}`}>
        <Icon className="w-3 h-3" />
        {status}
      </span>
    );
  };

  const getPaymentStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      UNPAID: 'bg-red-500/20 text-red-400',
      PARTIAL: 'bg-warning/20 text-warning',
      PAID: 'bg-success/20 text-success',
    };
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${styles[status] || styles.UNPAID}`}>
        {status}
      </span>
    );
  };

  const formatDate = (date: string | undefined) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount: string | number | undefined) => {
    if (!amount) return '-';
    return `Rs ${Number(amount).toLocaleString('en-PK', { minimumFractionDigits: 2 })}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm mb-2">
            <Link href="/finance" className="text-neutral-400 hover:text-white">
              Finance
            </Link>
            <span className="text-neutral-600">/</span>
            <span className="text-white">Dyeing Invoices</span>
          </div>
          <h1 className="text-2xl font-semibold text-white">Dyeing Invoices</h1>
          <p className="text-neutral-400 mt-1">
            Manage and track vendor payments for dyeing orders
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatsCard
          title="Pending"
          value={stats?.pending || 0}
          subtitle="Awaiting receipt"
          icon={<Clock className="w-5 h-5 text-yellow-400" />}
          onClick={() => {
            setStatusFilter('PENDING');
            setPage(1);
          }}
          className={statusFilter === 'PENDING' ? 'ring-2 ring-primary-500' : ''}
        />
        <StatsCard
          title="Ready for Pricing"
          value={stats?.ready || 0}
          subtitle="Enter rate/amount"
          icon={<AlertCircle className="w-5 h-5 text-blue-400" />}
          onClick={() => {
            setStatusFilter('READY');
            setPage(1);
          }}
          className={statusFilter === 'READY' ? 'ring-2 ring-primary-500' : ''}
        />
        <StatsCard
          title="Approved"
          value={stats?.approved || 0}
          subtitle="Pending payment"
          icon={<CheckCircle className="w-5 h-5 text-green-400" />}
          onClick={() => {
            setStatusFilter('APPROVED');
            setPage(1);
          }}
          className={statusFilter === 'APPROVED' ? 'ring-2 ring-primary-500' : ''}
        />
        <StatsCard
          title="Paid"
          value={stats?.paid || 0}
          subtitle="Completed"
          icon={<DollarSign className="w-5 h-5 text-emerald-400" />}
          onClick={() => {
            setStatusFilter('PAID');
            setPage(1);
          }}
          className={statusFilter === 'PAID' ? 'ring-2 ring-primary-500' : ''}
        />
        <StatsCard
          title="Unpaid Amount"
          value={formatCurrency(stats?.totalUnpaidAmount)}
          subtitle="Total outstanding"
          icon={<CreditCard className="w-5 h-5 text-error" />}
        />
      </div>

      {/* Filters */}
      <div className="bg-factory-dark rounded-2xl border border-factory-border p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Status Filter Buttons */}
          <div className="flex gap-2 flex-wrap">
            {(['ALL', 'PENDING', 'READY', 'APPROVED', 'PAID'] as StatusFilter[]).map((status) => (
              <button
                key={status}
                onClick={() => {
                  setStatusFilter(status);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === status
                    ? 'bg-primary-500 text-white'
                    : 'bg-factory-gray text-neutral-400 hover:text-white'
                }`}
              >
                {status === 'ALL' ? 'All' : status.charAt(0) + status.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          {/* Vendor Filter */}
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-neutral-500" />
            <select
              value={vendorFilter}
              onChange={(e) => {
                setVendorFilter(e.target.value);
                setPage(1);
              }}
              className="bg-factory-gray border border-factory-border rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All Vendors</option>
              {vendors.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.name}
                </option>
              ))}
            </select>
          </div>

          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
            <Input
              placeholder="Search by invoice or order number..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-factory-dark rounded-2xl border border-factory-border overflow-hidden">
        {isLoading && invoices.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
            <span className="ml-3 text-neutral-400">Loading invoices...</span>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-factory-border">
                    <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">
                      Invoice
                    </th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">
                      Vendor
                    </th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">
                      Order
                    </th>
                    <th className="text-right px-6 py-4 text-sm font-medium text-neutral-400">
                      Weight
                    </th>
                    <th className="text-right px-6 py-4 text-sm font-medium text-neutral-400">
                      Amount
                    </th>
                    <th className="text-center px-6 py-4 text-sm font-medium text-neutral-400">
                      Status
                    </th>
                    <th className="text-center px-6 py-4 text-sm font-medium text-neutral-400">
                      Payment
                    </th>
                    <th className="text-right px-6 py-4 text-sm font-medium text-neutral-400">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-factory-border">
                  {invoices.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center">
                        <FileSpreadsheet className="w-12 h-12 text-neutral-500 mx-auto mb-4" />
                        <p className="text-neutral-400">No invoices found</p>
                        <p className="text-neutral-500 text-sm mt-1">
                          {statusFilter !== 'ALL'
                            ? `No invoices with ${statusFilter} status`
                            : 'Invoices will appear when dyeing orders are created'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    invoices.map((invoice) => (
                      <tr
                        key={invoice.id}
                        className="hover:bg-factory-gray transition-colors cursor-pointer"
                        onClick={() => handleViewInvoice(invoice.id)}
                      >
                        <td className="px-6 py-4">
                          <span className="font-mono text-primary-400">
                            {invoice.invoiceNumber}
                          </span>
                          <p className="text-xs text-neutral-500 mt-1">
                            {formatDate(invoice.createdAt)}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-white">{invoice.vendor?.name}</span>
                          <p className="text-xs text-neutral-500">{invoice.vendor?.code}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-mono text-neutral-300">
                            {invoice.dyeingOrder?.orderNumber}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-white">
                            {Number(invoice.totalReceivedWeight || invoice.totalGreyWeight).toFixed(2)} kg
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-white font-medium">
                            {invoice.totalAmount ? formatCurrency(invoice.totalAmount) : '-'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          {getStatusBadge(invoice.status)}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {invoice.totalAmount && getPaymentStatusBadge(invoice.paymentStatus)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleViewInvoice(invoice.id)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            {invoice.status === 'APPROVED' && invoice.paymentStatus !== 'PAID' && (
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => handleRecordPayment(invoice)}
                              >
                                <CreditCard className="w-4 h-4 mr-1" />
                                Pay
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-factory-border flex items-center justify-between">
                <p className="text-sm text-neutral-400">
                  Page {page} of {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Previous
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    Next
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      <DyeingInvoiceDetailModal
        invoiceId={selectedInvoiceId}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedInvoiceId(null);
        }}
        onUpdate={fetchData}
      />

      <RecordPaymentModal
        invoice={selectedInvoice}
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false);
          setSelectedInvoice(null);
        }}
        onUpdate={fetchData}
      />
    </div>
  );
}
