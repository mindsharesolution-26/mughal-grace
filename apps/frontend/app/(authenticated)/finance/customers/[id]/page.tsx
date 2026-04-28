'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { customersApi, customerLedgerApi, customerPaymentsApi } from '@/lib/api/customers';
import {
  Customer,
  CustomerLedgerEntry,
  CustomerLedgerResponse,
  CustomerPaymentFormData,
  LedgerEntryType,
  ledgerEntryTypeLabels,
  ledgerEntryTypeColors,
  customerTypeLabels,
  customerTypeColors,
  paymentMethodLabels,
  PaymentMethod,
  formatPKR,
} from '@/lib/types/customer';
import {
  Loader2,
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Building2,
  CreditCard,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
} from 'lucide-react';

export default function CustomerDetailPage() {
  const params = useParams();
  const customerId = Number(params.id);

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [ledgerData, setLedgerData] = useState<CustomerLedgerResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Ledger pagination
  const [ledgerPage, setLedgerPage] = useState(1);
  const ledgerLimit = 20;

  // Modal states
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showLedgerEntryModal, setShowLedgerEntryModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Payment form
  const [paymentForm, setPaymentForm] = useState<Partial<CustomerPaymentFormData>>({
    paymentDate: new Date().toISOString().split('T')[0],
    amount: 0,
    paymentMethod: 'CASH',
    notes: '',
  });

  // Ledger entry form (for opening balance/adjustment)
  const [ledgerEntryForm, setLedgerEntryForm] = useState({
    entryDate: new Date().toISOString().split('T')[0],
    entryType: 'OPENING_BALANCE' as LedgerEntryType,
    debit: 0,
    credit: 0,
    description: '',
  });

  useEffect(() => {
    loadData();
  }, [customerId]);

  useEffect(() => {
    loadLedger();
  }, [customerId, ledgerPage]);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const customerData = await customersApi.getById(customerId);
      setCustomer(customerData);
    } catch (err: any) {
      setError(err.message || 'Failed to load customer');
    } finally {
      setIsLoading(false);
    }
  };

  const loadLedger = async () => {
    try {
      const data = await customerLedgerApi.getEntries(customerId, {
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
      await customerPaymentsApi.create({
        customerId,
        paymentDate: paymentForm.paymentDate!,
        amount: paymentForm.amount!,
        paymentMethod: paymentForm.paymentMethod!,
        bankName: paymentForm.bankName,
        chequeNumber: paymentForm.chequeNumber,
        transactionRef: paymentForm.transactionRef,
        notes: paymentForm.notes,
      });
      setShowPaymentModal(false);
      setPaymentForm({
        paymentDate: new Date().toISOString().split('T')[0],
        amount: 0,
        paymentMethod: 'CASH',
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
      await customerLedgerApi.addEntry(customerId, {
        entryDate: ledgerEntryForm.entryDate,
        entryType: ledgerEntryForm.entryType,
        debit: ledgerEntryForm.debit,
        credit: ledgerEntryForm.credit,
        description: ledgerEntryForm.description,
      });
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="text-center py-12">
        <p className="text-error mb-4">{error || 'Customer not found'}</p>
        <Link href="/finance/customers">
          <Button>Back to Customers</Button>
        </Link>
      </div>
    );
  }

  const typeStyle = customerTypeColors[customer.customerType];
  const creditLimit = customer.creditLimit ? parseFloat(customer.creditLimit) : 0;
  const isOverLimit = customer.currentBalance && creditLimit > 0 && customer.currentBalance > creditLimit;

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
            <Link href="/finance/customers" className="text-neutral-400 hover:text-white">
              Customers
            </Link>
            <span className="text-neutral-600">/</span>
            <span className="text-white">{customer.code}</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/finance/customers">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-semibold text-white">{customer.name}</h1>
                <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${typeStyle.bg} ${typeStyle.text}`}>
                  {customerTypeLabels[customer.customerType]}
                </span>
                <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${customer.isActive ? 'bg-success/20 text-success' : 'bg-neutral-500/20 text-neutral-400'}`}>
                  {customer.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <p className="text-neutral-400 font-mono">{customer.code}</p>
              {customer.businessName && (
                <p className="text-neutral-500 text-sm">{customer.businessName}</p>
              )}
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
          <Link href={`/finance/customers/${customer.id}/edit`}>
            <Button variant="secondary">Edit</Button>
          </Link>
        </div>
      </div>

      {/* Customer Info Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contact Info */}
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Contact Information</h3>
          <div className="space-y-4">
            {customer.contactPerson && (
              <div className="flex items-center gap-3">
                <Building2 className="w-4 h-4 text-neutral-500" />
                <span className="text-neutral-300">{customer.contactPerson}</span>
              </div>
            )}
            {customer.phone && (
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-neutral-500" />
                <a href={`tel:${customer.phone}`} className="text-primary-400 hover:underline">
                  {customer.phone}
                </a>
              </div>
            )}
            {customer.email && (
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-neutral-500" />
                <a href={`mailto:${customer.email}`} className="text-primary-400 hover:underline">
                  {customer.email}
                </a>
              </div>
            )}
            {(customer.address || customer.city) && (
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-neutral-500 mt-1" />
                <span className="text-neutral-300">
                  {[customer.address, customer.city].filter(Boolean).join(', ')}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Financial Info */}
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Financial Details</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-neutral-400">Current Balance</span>
              <span className={`font-semibold ${isOverLimit ? 'text-error' : customer.currentBalance && customer.currentBalance > 0 ? 'text-warning' : 'text-success'}`}>
                {formatPKR(customer.currentBalance || 0)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-neutral-400">Credit Limit</span>
              <span className="text-white">{creditLimit > 0 ? formatPKR(creditLimit) : 'Unlimited'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-neutral-400">Payment Terms</span>
              <span className="text-white">{customer.paymentTerms} days</span>
            </div>
            {isOverLimit && (
              <div className="mt-2 p-3 bg-error/10 border border-error/20 rounded-xl">
                <p className="text-error text-sm font-medium">Over credit limit!</p>
              </div>
            )}
          </div>
        </div>

        {/* Tax Info */}
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Tax Information</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-neutral-400">NTN</span>
              <span className="text-white font-mono">{customer.ntn || '-'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-neutral-400">STRN</span>
              <span className="text-white font-mono">{customer.strn || '-'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-neutral-400">Total Orders</span>
              <span className="text-white">{customer._count?.salesOrders || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-neutral-400">Payments Made</span>
              <span className="text-white">{customer._count?.payments || 0}</span>
            </div>
          </div>
        </div>
      </div>

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
          <h3 className="text-lg font-semibold text-white">Account Ledger</h3>
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
              {ledgerData?.entries.map((entry) => {
                const typeStyle = ledgerEntryTypeColors[entry.entryType];
                return (
                  <tr key={entry.id} className="hover:bg-factory-gray transition-colors">
                    <td className="px-6 py-4 text-neutral-300">
                      {formatDate(entry.entryDate)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${typeStyle.bg} ${typeStyle.text}`}>
                        {ledgerEntryTypeLabels[entry.entryType]}
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
                );
              })}
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
              Showing {(ledgerPage - 1) * ledgerLimit + 1} to {Math.min(ledgerPage * ledgerLimit, ledgerData.pagination.total)} of {ledgerData.pagination.total} entries
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
              <span className="flex items-center px-3 text-sm text-neutral-400">
                Page {ledgerPage} of {ledgerData.pagination.totalPages}
              </span>
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
                  onChange={(e) => setPaymentForm(p => ({ ...p, paymentMethod: e.target.value as PaymentMethod }))}
                  className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {Object.entries(paymentMethodLabels).map(([value, label]) => (
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
                  <label className="block text-sm font-medium text-neutral-400 mb-2">Transaction Reference</label>
                  <Input
                    value={paymentForm.transactionRef || ''}
                    onChange={(e) => setPaymentForm(p => ({ ...p, transactionRef: e.target.value }))}
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
                    onChange={(e) => setLedgerEntryForm(p => ({ ...p, entryType: e.target.value as LedgerEntryType }))}
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
                  <p className="text-xs text-neutral-500 mt-1">Increases balance (customer owes)</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-2">Credit (PKR)</label>
                  <Input
                    type="number"
                    value={ledgerEntryForm.credit}
                    onChange={(e) => setLedgerEntryForm(p => ({ ...p, credit: parseFloat(e.target.value) || 0 }))}
                    min={0}
                  />
                  <p className="text-xs text-neutral-500 mt-1">Decreases balance (we owe)</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-2">Description</label>
                <textarea
                  value={ledgerEntryForm.description}
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
