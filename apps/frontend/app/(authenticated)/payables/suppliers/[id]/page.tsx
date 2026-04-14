'use client';

import { useState, useMemo, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/atoms/Button';
import { StatsCard } from '@/components/molecules/StatsCard';
import { LedgerTable, LedgerEntry, LedgerSummary } from '@/components/molecules/LedgerTable';
import { PaymentModal, PaymentFormData } from '@/components/molecules/PaymentModal';
import { StatusBadge, ReplacementStatusBadge, QualityStatusBadge } from '@/components/atoms/StatusBadge';
import { useToast } from '@/contexts/ToastContext';
import {
  suppliersApi,
  GeneralSupplier,
  vendorLedgerApi,
  VendorLedgerEntry,
  vendorPaymentsApi,
} from '@/lib/api/suppliers';
import {
  MaterialReceipt,
  MaterialReturn,
  SUPPLIER_TYPES,
  VENDOR_LEDGER_TYPES,
  VendorLedgerType,
  MATERIAL_RECEIPT_TYPES,
  MATERIAL_ISSUE_TYPES,
  formatPKR,
  formatDate,
} from '@/lib/types/supplier';

// Tab types
type TabId = 'overview' | 'financial' | 'materials' | 'returns';

export default function SupplierDetailPage() {
  const params = useParams();
  const { showToast } = useToast();
  const supplierId = params.id as string;

  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Data state
  const [supplier, setSupplier] = useState<GeneralSupplier | null>(null);
  const [ledgerEntries, setLedgerEntries] = useState<VendorLedgerEntry[]>([]);
  const [materialReceipts, setMaterialReceipts] = useState<MaterialReceipt[]>([]);
  const [materialReturns, setMaterialReturns] = useState<MaterialReturn[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch supplier data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch supplier details
        const supplierData = await suppliersApi.getById(parseInt(supplierId));
        setSupplier(supplierData);

        // Fetch ledger entries
        try {
          const ledgerData = await vendorLedgerApi.getEntries('GENERAL', parseInt(supplierId));
          setLedgerEntries(ledgerData.data);
        } catch (err) {
          console.error('Failed to fetch ledger entries:', err);
          setLedgerEntries([]);
        }

        // Material receipts and returns would be fetched here when API is ready
        setMaterialReceipts([]);
        setMaterialReturns([]);
      } catch (err: any) {
        console.error('Failed to fetch supplier:', err);
        setError(err.response?.data?.message || 'Failed to load supplier');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [supplierId]);

  // Transform ledger entries for LedgerTable
  const ledgerTableEntries: LedgerEntry[] = ledgerEntries.map((entry) => ({
    id: String(entry.id),
    entryDate: entry.entryDate,
    entryType: entry.entryType,
    description: entry.description,
    referenceNumber: entry.referenceNumber,
    debit: entry.debit,
    credit: entry.credit,
    balance: entry.balance,
  }));

  // Calculate summary stats
  const summary = useMemo(() => {
    const totalPurchases = ledgerEntries
      .filter((e) => e.entryType === 'PURCHASE')
      .reduce((sum, e) => sum + e.debit, 0);
    const totalPayments = ledgerEntries
      .filter((e) => e.entryType === 'PAYMENT_MADE')
      .reduce((sum, e) => sum + e.credit, 0);
    const totalReceipts = materialReceipts.length;
    const pendingReturns = materialReturns.filter(
      (r) => !['REPLACED', 'CREDITED', 'CLOSED'].includes(r.replacementStatus)
    ).length;

    return {
      totalPurchases,
      totalPayments,
      totalReceipts,
      pendingReturns,
    };
  }, [ledgerEntries, materialReceipts, materialReturns]);

  // Payment handler
  const handlePayment = async (data: PaymentFormData) => {
    setIsProcessing(true);
    try {
      await vendorPaymentsApi.create({
        vendorType: 'GENERAL',
        vendorId: parseInt(supplierId),
        paymentDate: data.paymentDate,
        amount: data.amount,
        paymentMethod: data.paymentMethod as 'CASH' | 'CHEQUE' | 'BANK_TRANSFER' | 'ONLINE',
        voucherNumber: data.voucherNumber,
        chequeNumber: data.chequeNumber,
        bankName: data.bankName,
        transactionRef: data.transactionRef,
        notes: data.notes,
      });
      showToast('success', 'Payment recorded successfully!');
      setShowPaymentModal(false);

      // Refresh ledger entries
      const ledgerData = await vendorLedgerApi.getEntries('GENERAL', parseInt(supplierId));
      setLedgerEntries(ledgerData.data);

      // Refresh supplier data to update balance
      const supplierData = await suppliersApi.getById(parseInt(supplierId));
      setSupplier(supplierData);
    } catch (error: any) {
      console.error('Failed to record payment:', error);
      showToast('error', error.response?.data?.message || 'Failed to record payment');
    } finally {
      setIsProcessing(false);
    }
  };

  // Render star rating
  const renderRating = (rating: number) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          className={`text-xl ${star <= rating ? 'text-yellow-400' : 'text-neutral-600'}`}
        >
          ★
        </span>
      ))}
    </div>
  );

  // Get current balance from supplier data
  const currentBalance = supplier?.balance?.currentBalance || 0;
  const creditLimit = supplier?.creditLimit ? (typeof supplier.creditLimit === 'string' ? parseFloat(supplier.creditLimit) : supplier.creditLimit) : 0;

  // Tab content components
  const OverviewTab = () => (
    <div className="space-y-6">
      {/* Supplier Details Card */}
      <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Supplier Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <p className="text-sm text-neutral-400">Contact Person</p>
              <p className="text-white">{supplier?.contactPerson || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-neutral-400">Phone</p>
              <p className="text-white">{supplier?.phone || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-neutral-400">Email</p>
              <p className="text-white">{supplier?.email || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-neutral-400">Rating</p>
              {renderRating(supplier?.rating || 0)}
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-neutral-400">Address</p>
              <p className="text-white">{supplier?.address || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-neutral-400">City</p>
              <p className="text-white">{supplier?.city || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-neutral-400">Credit Limit</p>
              <p className="text-white">{formatPKR(creditLimit)}</p>
            </div>
            <div>
              <p className="text-sm text-neutral-400">Payment Terms</p>
              <p className="text-white">{supplier?.paymentTerms || 0} days</p>
            </div>
          </div>
        </div>

        {/* Bank Details */}
        {supplier?.bankDetails && (
          <div className="mt-6 pt-4 border-t border-factory-border">
            <h4 className="text-sm font-medium text-white mb-3">Bank Details</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-neutral-400">Bank</p>
                <p className="text-sm text-white">{supplier.bankDetails.bankName || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-400">Account Title</p>
                <p className="text-sm text-white">{supplier.bankDetails.accountTitle || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-400">Account Number</p>
                <p className="text-sm text-white font-mono">{supplier.bankDetails.accountNumber || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-400">Branch Code</p>
                <p className="text-sm text-white">{supplier.bankDetails.branchCode || '-'}</p>
              </div>
            </div>
          </div>
        )}

        {/* Tax Info */}
        {(supplier?.ntn || supplier?.strn) && (
          <div className="mt-6 pt-4 border-t border-factory-border">
            <h4 className="text-sm font-medium text-white mb-3">Tax Information</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-neutral-400">NTN</p>
                <p className="text-sm text-white font-mono">{supplier?.ntn || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-400">STRN</p>
                <p className="text-sm text-white font-mono">{supplier?.strn || '-'}</p>
              </div>
            </div>
          </div>
        )}

        {supplier?.notes && (
          <div className="mt-6 pt-4 border-t border-factory-border">
            <p className="text-sm text-neutral-400">Notes</p>
            <p className="text-white mt-1">{supplier.notes}</p>
          </div>
        )}
      </div>

      {/* Recent Transactions */}
      <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Recent Transactions</h3>
          <Button variant="ghost" size="sm" onClick={() => setActiveTab('financial')}>
            View All
          </Button>
        </div>
        <div className="space-y-3">
          {ledgerEntries.length === 0 ? (
            <p className="text-neutral-400 text-center py-4">No transactions yet</p>
          ) : (
            ledgerEntries.slice(0, 5).map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between p-3 bg-factory-gray rounded-xl"
              >
                <div>
                  <p className="text-white text-sm">{entry.description || '-'}</p>
                  <p className="text-xs text-neutral-400">
                    {formatDate(entry.entryDate)} • {VENDOR_LEDGER_TYPES[entry.entryType as VendorLedgerType]?.label || entry.entryType}
                  </p>
                </div>
                <div className="text-right">
                  {entry.debit > 0 && (
                    <p className="text-error font-medium">+{formatPKR(entry.debit)}</p>
                  )}
                  {entry.credit > 0 && (
                    <p className="text-success font-medium">-{formatPKR(entry.credit)}</p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );

  const FinancialLedgerTab = () => {
    const totalDebit = ledgerEntries.reduce((sum, e) => sum + e.debit, 0);
    const totalCredit = ledgerEntries.reduce((sum, e) => sum + e.credit, 0);

    return (
      <div className="space-y-4">
        {ledgerTableEntries.length === 0 ? (
          <div className="bg-factory-dark rounded-2xl border border-factory-border p-12 text-center">
            <p className="text-neutral-400">No ledger entries yet</p>
          </div>
        ) : (
          <>
            <LedgerTable
              entries={ledgerTableEntries}
              entryTypeLabels={Object.fromEntries(
                Object.entries(VENDOR_LEDGER_TYPES).map(([key, value]) => [key, value.label])
              )}
            />
            <LedgerSummary
              totalDebit={totalDebit}
              totalCredit={totalCredit}
              closingBalance={currentBalance}
            />
          </>
        )}
      </div>
    );
  };

  const MaterialsTab = () => (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-factory-dark rounded-xl border border-factory-border p-4">
          <p className="text-sm text-neutral-400">Total Receipts</p>
          <p className="text-2xl font-semibold text-white">{materialReceipts.length}</p>
        </div>
        <div className="bg-factory-dark rounded-xl border border-factory-border p-4">
          <p className="text-sm text-neutral-400">Total Value</p>
          <p className="text-2xl font-semibold text-white">
            {formatPKR(materialReceipts.reduce((sum, r) => sum + r.netAmount, 0))}
          </p>
        </div>
        <div className="bg-factory-dark rounded-xl border border-factory-border p-4">
          <p className="text-sm text-neutral-400">Issues</p>
          <p className="text-2xl font-semibold text-warning">
            {materialReceipts.filter((r) => r.hasIssue).length}
          </p>
        </div>
      </div>

      {/* Receipts Table */}
      <div className="bg-factory-dark rounded-2xl border border-factory-border overflow-hidden">
        {materialReceipts.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-neutral-400">No material receipts yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-factory-border">
                  <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">Date</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">Receipt #</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">Invoice #</th>
                  <th className="text-right px-6 py-4 text-sm font-medium text-neutral-400">Qty</th>
                  <th className="text-right px-6 py-4 text-sm font-medium text-neutral-400">Amount</th>
                  <th className="text-center px-6 py-4 text-sm font-medium text-neutral-400">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-factory-border">
                {materialReceipts.map((receipt) => (
                  <tr key={receipt.id} className="hover:bg-factory-gray transition-colors">
                    <td className="px-6 py-4 text-white">{formatDate(receipt.receiptDate)}</td>
                    <td className="px-6 py-4 font-mono text-sm text-primary-400">
                      {receipt.receiptNumber}
                    </td>
                    <td className="px-6 py-4 text-neutral-300">
                      {receipt.invoiceNumber || '-'}
                    </td>
                    <td className="px-6 py-4 text-right text-white">
                      {receipt.receivedQty} {receipt.unit}
                    </td>
                    <td className="px-6 py-4 text-right text-white font-medium">
                      {formatPKR(receipt.netAmount)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center">
                        <QualityStatusBadge status={receipt.qualityStatus} />
                      </div>
                      {receipt.hasIssue && (
                        <p className="text-xs text-warning text-center mt-1">Has Issue</p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );

  const ReturnsTab = () => (
    <div className="space-y-4">
      {materialReturns.length === 0 ? (
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-12 text-center">
          <p className="text-neutral-400">No return issues with this supplier.</p>
        </div>
      ) : (
        <div className="bg-factory-dark rounded-2xl border border-factory-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-factory-border">
                  <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">Date</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">Return #</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">Issue Type</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">Description</th>
                  <th className="text-right px-6 py-4 text-sm font-medium text-neutral-400">Value</th>
                  <th className="text-center px-6 py-4 text-sm font-medium text-neutral-400">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-factory-border">
                {materialReturns.map((ret) => (
                  <tr key={ret.id} className="hover:bg-factory-gray transition-colors">
                    <td className="px-6 py-4 text-white">{formatDate(ret.returnDate)}</td>
                    <td className="px-6 py-4 font-mono text-sm text-primary-400">
                      {ret.returnNumber}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 text-xs rounded-md bg-error/20 text-error">
                        {MATERIAL_ISSUE_TYPES[ret.issueType]?.label || ret.issueType}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-neutral-300 max-w-xs truncate">
                      {ret.issueDescription}
                    </td>
                    <td className="px-6 py-4 text-right text-white font-medium">
                      {formatPKR(ret.returnValue)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center">
                        <ReplacementStatusBadge status={ret.replacementStatus} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );

  const tabs: { id: TabId; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'financial', label: 'Financial Ledger' },
    { id: 'materials', label: 'Material Ledger' },
    { id: 'returns', label: 'Returns' },
  ];

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-factory-gray rounded w-1/3 mb-4" />
          <div className="h-4 bg-factory-gray rounded w-1/2 mb-8" />
          <div className="grid grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map((i) => (
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

  // Error state
  if (error || !supplier) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-error mb-4">{error || 'Supplier not found'}</p>
          <Link href="/payables/suppliers">
            <Button>Back to Suppliers</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm">
            <Link href="/payables" className="text-neutral-400 hover:text-white">
              Payables
            </Link>
            <span className="text-neutral-600">/</span>
            <Link href="/payables/suppliers" className="text-neutral-400 hover:text-white">
              Suppliers
            </Link>
            <span className="text-neutral-600">/</span>
            <span className="text-white">{supplier.code}</span>
          </div>
          <div className="flex items-center gap-3 mt-2">
            <h1 className="text-2xl font-semibold text-white">{supplier.name}</h1>
            <span
              className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                supplier.isActive
                  ? 'bg-success/20 text-success'
                  : 'bg-neutral-500/20 text-neutral-400'
              }`}
            >
              {supplier.isActive ? 'Active' : 'Inactive'}
            </span>
            <span className="px-2 py-1 text-xs rounded-md bg-factory-gray text-neutral-300">
              {supplier.supplierType ? (SUPPLIER_TYPES[supplier.supplierType as keyof typeof SUPPLIER_TYPES]?.label || supplier.supplierType) : '-'}
            </span>
          </div>
          <p className="text-neutral-400 mt-1">{supplier.city || '-'}</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => setShowPaymentModal(true)}>
            + Add Payment
          </Button>
          <Link href={`/payables/suppliers/${supplier.id}/edit`}>
            <Button variant="ghost">Edit</Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Current Balance"
          value={formatPKR(currentBalance)}
          change={currentBalance > 0 ? 'Outstanding' : 'Cleared'}
          changeType={currentBalance > 0 ? 'negative' : 'positive'}
          icon="💰"
        />
        <StatsCard
          title="Total Purchases"
          value={formatPKR(summary.totalPurchases)}
          icon="📦"
        />
        <StatsCard
          title="Total Payments"
          value={formatPKR(summary.totalPayments)}
          icon="💳"
        />
        <StatsCard
          title="Credit Available"
          value={formatPKR(Math.max(0, creditLimit - currentBalance))}
          icon="💵"
        />
      </div>

      {/* Tabs */}
      <div className="border-b border-factory-border">
        <div className="flex gap-1 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors relative ${
                activeTab === tab.id
                  ? 'text-primary-400'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              {tab.label}
              {tab.id === 'returns' && summary.pendingReturns > 0 && (
                <span className="ml-2 px-1.5 py-0.5 text-xs rounded-full bg-warning/20 text-warning">
                  {summary.pendingReturns}
                </span>
              )}
              {activeTab === tab.id && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'financial' && <FinancialLedgerTab />}
        {activeTab === 'materials' && <MaterialsTab />}
        {activeTab === 'returns' && <ReturnsTab />}
      </div>

      {/* Payment Modal */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onSubmit={handlePayment}
        partyName={supplier.name}
        partyType="vendor"
        currentBalance={currentBalance}
        isLoading={isProcessing}
      />
    </div>
  );
}
