'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { StatsCard } from '@/components/molecules/StatsCard';
import {
  yarnVendorsApi,
  vendorLedgerApi,
  YarnVendor,
  VendorLedgerEntry,
  VendorLedgerResponse,
  VendorPaymentFormData,
  VendorLedgerEntryFormData,
  VendorLedgerEntryType,
  VendorPaymentMethod,
  vendorLedgerEntryTypeLabels,
  vendorPaymentMethodLabels,
} from '@/lib/api/yarn-vendors';
import { formatPKR } from '@/lib/types/vendor';
import {
  Loader2,
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Building2,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
} from 'lucide-react';

type TabId = 'overview' | 'ledger';

export default function VendorDetailPage() {
  const params = useParams();
  const vendorId = Number(params.id);

  const [vendor, setVendor] = useState<YarnVendor | null>(null);
  const [ledgerData, setLedgerData] = useState<VendorLedgerResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  // Ledger pagination
  const [ledgerPage, setLedgerPage] = useState(1);
  const ledgerLimit = 20;

  // Modal states
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showLedgerEntryModal, setShowLedgerEntryModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Payment form
  const [paymentForm, setPaymentForm] = useState<VendorPaymentFormData>({
    paymentDate: new Date().toISOString().split('T')[0],
    amount: 0,
    paymentMethod: 'BANK_TRANSFER',
    notes: '',
  });

  // Ledger entry form
  const [ledgerEntryForm, setLedgerEntryForm] = useState<VendorLedgerEntryFormData>({
    entryDate: new Date().toISOString().split('T')[0],
    entryType: 'OPENING_BALANCE',
    debit: 0,
    credit: 0,
    description: '',
  });

  useEffect(() => {
    loadData();
  }, [vendorId]);

  useEffect(() => {
    loadLedger();
  }, [vendorId, ledgerPage]);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const vendorData = await yarnVendorsApi.getById(vendorId);
      setVendor(vendorData);
    } catch (err: any) {
      setError(err.message || 'Failed to load vendor');
    } finally {
      setIsLoading(false);
    }
  };

  const loadLedger = async () => {
    try {
      const data = await vendorLedgerApi.getEntries(vendorId, {
        page: ledgerPage,
        limit: ledgerLimit,
      });
      setLedgerData(data);
    } catch (err: any) {
      console.error('Failed to load ledger:', err);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await vendorLedgerApi.recordPayment(vendorId, paymentForm);
      setShowPaymentModal(false);
      setPaymentForm({
        paymentDate: new Date().toISOString().split('T')[0],
        amount: 0,
        paymentMethod: 'BANK_TRANSFER',
        notes: '',
      });
      loadData();
      loadLedger();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to record payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddLedgerEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await vendorLedgerApi.addEntry(vendorId, ledgerEntryForm);
      setShowLedgerEntryModal(false);
      setLedgerEntryForm({
        entryDate: new Date().toISOString().split('T')[0],
        entryType: 'OPENING_BALANCE',
        debit: 0,
        credit: 0,
        description: '',
      });
      loadData();
      loadLedger();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to add ledger entry');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-PK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const renderRating = (rating: number | null) => {
    if (!rating) return <span className="text-neutral-500">-</span>;
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={`text-lg ${star <= rating ? 'text-warning' : 'text-neutral-600'}`}
          >
            ★
          </span>
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
      </div>
    );
  }

  if (error || !vendor) {
    return (
      <div className="text-center py-12">
        <p className="text-error mb-4">{error || 'Vendor not found'}</p>
        <Link href="/finance/vendors">
          <Button>Back to Vendors</Button>
        </Link>
      </div>
    );
  }

  const creditLimit = vendor.creditLimit ? parseFloat(vendor.creditLimit) : 0;
  const currentBalance = ledgerData?.summary.currentBalance || 0;
  const isOverLimit = creditLimit > 0 && currentBalance > creditLimit;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm mb-4">
            <Link href="/finance" className="text-neutral-400 hover:text-white">
              Finance
            </Link>
            <span className="text-neutral-600">/</span>
            <Link href="/finance/vendors" className="text-neutral-400 hover:text-white">
              Vendors
            </Link>
            <span className="text-neutral-600">/</span>
            <span className="text-white">{vendor.code}</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/finance/vendors">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-semibold text-white">{vendor.name}</h1>
                <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${vendor.isActive ? 'bg-success/20 text-success' : 'bg-neutral-500/20 text-neutral-400'}`}>
                  {vendor.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <p className="text-neutral-400 font-mono">{vendor.code}</p>
              {vendor.city && <p className="text-neutral-500 text-sm">{vendor.city}</p>}
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => setShowLedgerEntryModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Entry
          </Button>
          <Button onClick={() => setShowPaymentModal(true)}>
            <CreditCard className="w-4 h-4 mr-2" />
            Record Payment
          </Button>
          <Link href={`/finance/vendors/${vendor.id}/edit`}>
            <Button variant="secondary">Edit</Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Current Balance"
          value={formatPKR(currentBalance)}
          change={isOverLimit ? 'Over limit!' : creditLimit > 0 ? 'Within limit' : '-'}
          changeType={isOverLimit ? 'negative' : 'positive'}
          icon="💳"
        />
        <StatsCard
          title="Credit Limit"
          value={creditLimit > 0 ? formatPKR(creditLimit) : 'Unlimited'}
          icon="💰"
        />
        <StatsCard
          title="Payment Terms"
          value={`${vendor.paymentTerms} days`}
          icon="📅"
        />
        <StatsCard
          title="Rating"
          value={vendor.rating?.toFixed(1) || '-'}
          change={vendor.rating && vendor.rating >= 4 ? 'Excellent' : vendor.rating && vendor.rating >= 3 ? 'Good' : 'Needs improvement'}
          changeType={vendor.rating && vendor.rating >= 4 ? 'positive' : vendor.rating && vendor.rating >= 3 ? 'neutral' : 'negative'}
          icon="⭐"
        />
      </div>

      {/* Tabs */}
      <div className="border-b border-factory-border">
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-3 text-sm font-medium transition-colors relative ${
              activeTab === 'overview' ? 'text-primary-400' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Overview
            {activeTab === 'overview' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('ledger')}
            className={`px-4 py-3 text-sm font-medium transition-colors relative ${
              activeTab === 'ledger' ? 'text-primary-400' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Financial Ledger
            {activeTab === 'ledger' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500" />
            )}
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Contact Info */}
          <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Contact Information</h3>
            <div className="space-y-4">
              {vendor.contactPerson && (
                <div className="flex items-center gap-3">
                  <Building2 className="w-4 h-4 text-neutral-500" />
                  <span className="text-neutral-300">{vendor.contactPerson}</span>
                </div>
              )}
              {vendor.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-neutral-500" />
                  <a href={`tel:${vendor.phone}`} className="text-primary-400 hover:underline">
                    {vendor.phone}
                  </a>
                </div>
              )}
              {vendor.email && (
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-neutral-500" />
                  <a href={`mailto:${vendor.email}`} className="text-primary-400 hover:underline">
                    {vendor.email}
                  </a>
                </div>
              )}
              {vendor.address && (
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-neutral-500 mt-1" />
                  <span className="text-neutral-300">{vendor.address}</span>
                </div>
              )}
            </div>
          </div>

          {/* Financial Summary */}
          <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Financial Summary</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-neutral-400">Total Debit (Purchases)</span>
                <span className="text-error font-medium">{formatPKR(ledgerData?.summary.totalDebit || 0)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-neutral-400">Total Credit (Payments)</span>
                <span className="text-success font-medium">{formatPKR(ledgerData?.summary.totalCredit || 0)}</span>
              </div>
              <div className="h-px bg-factory-border" />
              <div className="flex justify-between items-center">
                <span className="text-neutral-400">Current Balance</span>
                <span className={`font-semibold ${currentBalance > 0 ? 'text-warning' : 'text-success'}`}>
                  {formatPKR(currentBalance)}
                </span>
              </div>
              {isOverLimit && (
                <div className="p-3 bg-error/10 border border-error/20 rounded-xl">
                  <p className="text-error text-sm font-medium">Over credit limit!</p>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          {vendor.notes && (
            <div className="bg-factory-dark rounded-2xl border border-factory-border p-6 lg:col-span-2">
              <h3 className="text-lg font-semibold text-white mb-4">Notes</h3>
              <p className="text-neutral-300">{vendor.notes}</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'ledger' && (
        <div className="space-y-6">
          {/* Ledger Summary */}
          {ledgerData && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-factory-dark rounded-xl border border-factory-border p-4">
                <p className="text-sm text-neutral-400">Total Debit</p>
                <p className="text-xl font-semibold text-error">{formatPKR(ledgerData.summary.totalDebit)}</p>
              </div>
              <div className="bg-factory-dark rounded-xl border border-factory-border p-4">
                <p className="text-sm text-neutral-400">Total Credit</p>
                <p className="text-xl font-semibold text-success">{formatPKR(ledgerData.summary.totalCredit)}</p>
              </div>
              <div className="bg-factory-dark rounded-xl border border-factory-border p-4">
                <p className="text-sm text-neutral-400">Current Balance</p>
                <p className={`text-xl font-semibold ${ledgerData.summary.currentBalance > 0 ? 'text-warning' : 'text-success'}`}>
                  {formatPKR(ledgerData.summary.currentBalance)}
                </p>
              </div>
            </div>
          )}

          {/* Ledger Table */}
          <div className="bg-factory-dark rounded-2xl border border-factory-border overflow-hidden">
            <div className="p-6 border-b border-factory-border">
              <h3 className="text-lg font-semibold text-white">Financial Ledger</h3>
              <p className="text-sm text-neutral-400">Transaction history with running balance</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-factory-border">
                    <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">Date</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">Type</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">Reference</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">Description</th>
                    <th className="text-right px-6 py-4 text-sm font-medium text-neutral-400">Debit</th>
                    <th className="text-right px-6 py-4 text-sm font-medium text-neutral-400">Credit</th>
                    <th className="text-right px-6 py-4 text-sm font-medium text-neutral-400">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-factory-border">
                  {ledgerData?.entries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-factory-gray transition-colors">
                      <td className="px-6 py-4 text-neutral-300">
                        {formatDate(entry.entryDate)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                          parseFloat(entry.debit) > 0
                            ? 'bg-error/20 text-error'
                            : 'bg-success/20 text-success'
                        }`}>
                          {vendorLedgerEntryTypeLabels[entry.entryType]}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-neutral-300 font-mono text-sm">
                        {entry.referenceNumber || '-'}
                      </td>
                      <td className="px-6 py-4 text-neutral-400 max-w-xs truncate">
                        {entry.description || '-'}
                      </td>
                      <td className="px-6 py-4 text-right text-error font-medium">
                        {parseFloat(entry.debit) > 0 ? formatPKR(parseFloat(entry.debit)) : '-'}
                      </td>
                      <td className="px-6 py-4 text-right text-success font-medium">
                        {parseFloat(entry.credit) > 0 ? formatPKR(parseFloat(entry.credit)) : '-'}
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-white">
                        {formatPKR(parseFloat(entry.balance))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {(!ledgerData?.entries || ledgerData.entries.length === 0) && (
                <div className="text-center py-12">
                  <p className="text-neutral-400">No ledger entries yet.</p>
                  <Button className="mt-4" onClick={() => setShowLedgerEntryModal(true)}>
                    Add Opening Balance
                  </Button>
                </div>
              )}
            </div>

            {/* Pagination */}
            {ledgerData && ledgerData.pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-factory-border">
                <p className="text-sm text-neutral-400">
                  Page {ledgerPage} of {ledgerData.pagination.totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setLedgerPage(p => Math.max(1, p - 1))}
                    disabled={ledgerPage === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setLedgerPage(p => Math.min(ledgerData.pagination.totalPages, p + 1))}
                    disabled={ledgerPage === ledgerData.pagination.totalPages}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-factory-dark rounded-2xl border border-factory-border w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b border-factory-border">
              <h3 className="text-lg font-semibold text-white">Record Payment</h3>
              <button onClick={() => setShowPaymentModal(false)} className="text-neutral-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleRecordPayment} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-2">Payment Date</label>
                  <Input
                    type="date"
                    value={paymentForm.paymentDate}
                    onChange={(e) => setPaymentForm(p => ({ ...p, paymentDate: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-2">Amount (PKR)</label>
                  <Input
                    type="number"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm(p => ({ ...p, amount: parseFloat(e.target.value) }))}
                    min={1}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-2">Payment Method</label>
                <select
                  value={paymentForm.paymentMethod}
                  onChange={(e) => setPaymentForm(p => ({ ...p, paymentMethod: e.target.value as VendorPaymentMethod }))}
                  className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {Object.entries(vendorPaymentMethodLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              {paymentForm.paymentMethod === 'CHEQUE' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-400 mb-2">Bank Name</label>
                    <Input
                      value={paymentForm.bankName || ''}
                      onChange={(e) => setPaymentForm(p => ({ ...p, bankName: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-400 mb-2">Cheque Number</label>
                    <Input
                      value={paymentForm.chequeNumber || ''}
                      onChange={(e) => setPaymentForm(p => ({ ...p, chequeNumber: e.target.value }))}
                    />
                  </div>
                </div>
              )}
              {paymentForm.paymentMethod === 'BANK_TRANSFER' && (
                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-2">Reference Number</label>
                  <Input
                    value={paymentForm.referenceNumber || ''}
                    onChange={(e) => setPaymentForm(p => ({ ...p, referenceNumber: e.target.value }))}
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-2">Notes</label>
                <textarea
                  value={paymentForm.notes || ''}
                  onChange={(e) => setPaymentForm(p => ({ ...p, notes: e.target.value }))}
                  rows={2}
                  className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="secondary" onClick={() => setShowPaymentModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Record Payment
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ledger Entry Modal */}
      {showLedgerEntryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-factory-dark rounded-2xl border border-factory-border w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b border-factory-border">
              <h3 className="text-lg font-semibold text-white">Add Ledger Entry</h3>
              <button onClick={() => setShowLedgerEntryModal(false)} className="text-neutral-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddLedgerEntry} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-2">Entry Date</label>
                  <Input
                    type="date"
                    value={ledgerEntryForm.entryDate}
                    onChange={(e) => setLedgerEntryForm(p => ({ ...p, entryDate: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-2">Entry Type</label>
                  <select
                    value={ledgerEntryForm.entryType}
                    onChange={(e) => setLedgerEntryForm(p => ({ ...p, entryType: e.target.value as VendorLedgerEntryType }))}
                    className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="OPENING_BALANCE">Opening Balance</option>
                    <option value="ADJUSTMENT">Adjustment</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-2">Debit (PKR)</label>
                  <Input
                    type="number"
                    value={ledgerEntryForm.debit}
                    onChange={(e) => setLedgerEntryForm(p => ({ ...p, debit: parseFloat(e.target.value) || 0 }))}
                    min={0}
                  />
                  <p className="text-xs text-neutral-500 mt-1">Increases balance (we owe)</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-2">Credit (PKR)</label>
                  <Input
                    type="number"
                    value={ledgerEntryForm.credit}
                    onChange={(e) => setLedgerEntryForm(p => ({ ...p, credit: parseFloat(e.target.value) || 0 }))}
                    min={0}
                  />
                  <p className="text-xs text-neutral-500 mt-1">Decreases balance (they owe us)</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-2">Description</label>
                <textarea
                  value={ledgerEntryForm.description || ''}
                  onChange={(e) => setLedgerEntryForm(p => ({ ...p, description: e.target.value }))}
                  rows={2}
                  placeholder="e.g., Opening balance as of Jan 1, 2024"
                  className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="secondary" onClick={() => setShowLedgerEntryModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Add Entry
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
