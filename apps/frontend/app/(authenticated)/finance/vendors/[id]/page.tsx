'use client';

import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { StatsCard } from '@/components/molecules/StatsCard';
import { useToast } from '@/contexts/ToastContext';
import {
  YarnVendor,
  VendorLedgerEntry,
  VendorYarnReceipt,
  VendorReplacement,
  VendorPayment,
  VENDOR_LEDGER_ENTRY_TYPES,
  PAYMENT_METHODS,
  QUALITY_STATUSES,
  REPLACEMENT_STATUSES,
  ISSUE_TYPES,
  PaymentMethod,
  formatPKR,
  formatDate,
} from '@/lib/types/vendor';

// Tab types
type TabId = 'overview' | 'financial' | 'yarn' | 'replacements';

// Mock vendor data
const mockVendor: YarnVendor = {
  id: '1',
  code: 'VND-001',
  name: 'Textile Hub',
  contactPerson: 'Ahmad Khan',
  phone: '0300-1234567',
  email: 'ahmad@textilehub.pk',
  address: '123 Industrial Area, Block B',
  city: 'Faisalabad',
  country: 'Pakistan',
  creditLimit: 500000,
  paymentTerms: 30,
  currentBalance: 125000,
  rating: 4,
  isActive: true,
  notes: 'Reliable supplier for cotton yarns',
  createdAt: '2024-01-01',
  updatedAt: '2024-01-20',
};

// Mock ledger entries
const mockLedgerEntries: VendorLedgerEntry[] = [
  {
    id: '1',
    vendorId: '1',
    entryDate: '2024-01-01',
    entryType: 'OPENING_BALANCE',
    debit: 50000,
    credit: 0,
    balance: 50000,
    description: 'Opening balance',
    createdAt: '2024-01-01',
  },
  {
    id: '2',
    vendorId: '1',
    entryDate: '2024-01-10',
    entryType: 'PURCHASE',
    debit: 150000,
    credit: 0,
    balance: 200000,
    referenceType: 'YARN_BOX',
    referenceNumber: 'GRN-2024-0015',
    description: 'Cotton 40s - 300kg @ Rs. 500/kg',
    createdAt: '2024-01-10',
  },
  {
    id: '3',
    vendorId: '1',
    entryDate: '2024-01-15',
    entryType: 'PAYMENT',
    debit: 0,
    credit: 100000,
    balance: 100000,
    referenceType: 'PAYMENT',
    referenceNumber: 'PAY-2024-0008',
    description: 'Bank transfer payment',
    createdAt: '2024-01-15',
  },
  {
    id: '4',
    vendorId: '1',
    entryDate: '2024-01-20',
    entryType: 'PURCHASE',
    debit: 75000,
    credit: 0,
    balance: 175000,
    referenceType: 'YARN_BOX',
    referenceNumber: 'GRN-2024-0022',
    description: 'Cotton 30s - 150kg @ Rs. 500/kg',
    createdAt: '2024-01-20',
  },
  {
    id: '5',
    vendorId: '1',
    entryDate: '2024-01-22',
    entryType: 'RETURN',
    debit: 0,
    credit: 25000,
    balance: 150000,
    referenceType: 'REPLACEMENT',
    referenceNumber: 'RTN-2024-0003',
    description: 'Defective yarn returned - 50kg',
    createdAt: '2024-01-22',
  },
  {
    id: '6',
    vendorId: '1',
    entryDate: '2024-01-25',
    entryType: 'PAYMENT',
    debit: 0,
    credit: 25000,
    balance: 125000,
    referenceType: 'PAYMENT',
    referenceNumber: 'PAY-2024-0012',
    description: 'Cheque payment',
    createdAt: '2024-01-25',
  },
];

// Mock yarn receipts
const mockYarnReceipts: VendorYarnReceipt[] = [
  {
    id: '1',
    vendorId: '1',
    receiptDate: '2024-01-10',
    receiptNumber: 'GRN-2024-0015',
    yarnTypeId: '1',
    yarnTypeName: 'Cotton 40s',
    yarnTypeCode: 'COT-40S',
    quantityReceived: 300,
    ratePerKg: 500,
    totalAmount: 150000,
    qualityStatus: 'APPROVED',
    hasIssue: false,
    createdAt: '2024-01-10',
  },
  {
    id: '2',
    vendorId: '1',
    receiptDate: '2024-01-20',
    receiptNumber: 'GRN-2024-0022',
    yarnTypeId: '2',
    yarnTypeName: 'Cotton 30s',
    yarnTypeCode: 'COT-30S',
    quantityReceived: 150,
    ratePerKg: 500,
    totalAmount: 75000,
    qualityStatus: 'PARTIAL',
    approvedQuantity: 100,
    hasIssue: true,
    issueType: 'QUALITY_DEFECT',
    issueDescription: '50kg had quality issues',
    replacementStatus: 'RETURNED',
    createdAt: '2024-01-20',
  },
  {
    id: '3',
    vendorId: '1',
    receiptDate: '2024-01-05',
    receiptNumber: 'GRN-2024-0008',
    yarnTypeId: '1',
    yarnTypeName: 'Cotton 40s',
    yarnTypeCode: 'COT-40S',
    quantityReceived: 200,
    ratePerKg: 480,
    totalAmount: 96000,
    qualityStatus: 'APPROVED',
    hasIssue: false,
    createdAt: '2024-01-05',
  },
];

// Mock replacements
const mockReplacements: VendorReplacement[] = [
  {
    id: '1',
    vendorId: '1',
    originalReceiptId: '2',
    originalReceiptNumber: 'GRN-2024-0022',
    originalYarnType: 'Cotton 30s',
    originalQuantity: 150,
    issueDate: '2024-01-20',
    issueType: 'QUALITY_DEFECT',
    issueDescription: 'Yarn had uneven thickness and some discoloration',
    affectedQuantity: 50,
    returnedQuantity: 50,
    returnedDate: '2024-01-22',
    returnChallanNumber: 'RTN-2024-0003',
    status: 'REPLACEMENT_PENDING',
    notes: 'Vendor agreed to send replacement',
    createdAt: '2024-01-20',
    updatedAt: '2024-01-22',
  },
];

export default function VendorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const vendorId = params.id as string;

  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Payment form state
  const [paymentData, setPaymentData] = useState({
    paymentDate: new Date().toISOString().split('T')[0],
    amount: 0,
    paymentMethod: 'BANK_TRANSFER' as PaymentMethod,
    referenceNumber: '',
    bankName: '',
    notes: '',
  });

  // In real app, fetch data based on vendorId
  const vendor = mockVendor;
  const ledgerEntries = mockLedgerEntries;
  const yarnReceipts = mockYarnReceipts;
  const replacements = mockReplacements;

  // Calculate summary
  const summary = useMemo(() => {
    const totalPurchases = ledgerEntries
      .filter((e) => e.entryType === 'PURCHASE')
      .reduce((sum, e) => sum + e.debit, 0);
    const totalPayments = ledgerEntries
      .filter((e) => e.entryType === 'PAYMENT')
      .reduce((sum, e) => sum + e.credit, 0);
    const totalYarnReceived = yarnReceipts.reduce((sum, r) => sum + r.quantityReceived, 0);
    const pendingReplacements = replacements.filter(
      (r) => REPLACEMENT_STATUSES[r.status].isOpen
    ).length;

    return {
      totalPurchases,
      totalPayments,
      totalYarnReceived,
      pendingReplacements,
    };
  }, [ledgerEntries, yarnReceipts, replacements]);

  // Render rating stars
  const renderRating = (rating: number) => {
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

  // Handle payment submission
  const handlePaymentSubmit = () => {
    if (paymentData.amount <= 0) {
      showToast('error', 'Please enter a valid amount');
      return;
    }

    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setShowPaymentModal(false);
      showToast('success', `Payment of ${formatPKR(paymentData.amount)} recorded successfully!`);
      setPaymentData({
        paymentDate: new Date().toISOString().split('T')[0],
        amount: 0,
        paymentMethod: 'BANK_TRANSFER',
        referenceNumber: '',
        bankName: '',
        notes: '',
      });
    }, 1000);
  };

  // Tab content components
  const OverviewTab = () => (
    <div className="space-y-6">
      {/* Vendor Details */}
      <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Vendor Details</h3>
          <Link href={`/finance/vendors/${vendor.id}/edit`}>
            <Button variant="secondary" size="sm">Edit</Button>
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-neutral-400">Contact Person</p>
            <p className="text-white font-medium">{vendor.contactPerson}</p>
          </div>
          <div>
            <p className="text-sm text-neutral-400">Phone</p>
            <p className="text-white">{vendor.phone}</p>
          </div>
          <div>
            <p className="text-sm text-neutral-400">Email</p>
            <p className="text-white">{vendor.email || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-neutral-400">Address</p>
            <p className="text-white">{vendor.address || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-neutral-400">City</p>
            <p className="text-white">{vendor.city || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-neutral-400">Rating</p>
            {renderRating(vendor.rating)}
          </div>
        </div>
        {vendor.notes && (
          <div className="mt-4 pt-4 border-t border-factory-border">
            <p className="text-sm text-neutral-400">Notes</p>
            <p className="text-white mt-1">{vendor.notes}</p>
          </div>
        )}
      </div>

      {/* Financial Summary */}
      <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Financial Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-factory-gray rounded-xl">
            <p className="text-sm text-neutral-400">Credit Limit</p>
            <p className="text-xl font-semibold text-white">{formatPKR(vendor.creditLimit)}</p>
          </div>
          <div className="p-4 bg-factory-gray rounded-xl">
            <p className="text-sm text-neutral-400">Current Balance</p>
            <p className={`text-xl font-semibold ${
              vendor.currentBalance > vendor.creditLimit ? 'text-error' : 'text-white'
            }`}>
              {formatPKR(vendor.currentBalance)}
            </p>
          </div>
          <div className="p-4 bg-factory-gray rounded-xl">
            <p className="text-sm text-neutral-400">Available Credit</p>
            <p className={`text-xl font-semibold ${
              vendor.creditLimit - vendor.currentBalance < 0 ? 'text-error' : 'text-success'
            }`}>
              {formatPKR(Math.max(0, vendor.creditLimit - vendor.currentBalance))}
            </p>
          </div>
          <div className="p-4 bg-factory-gray rounded-xl">
            <p className="text-sm text-neutral-400">Payment Terms</p>
            <p className="text-xl font-semibold text-white">{vendor.paymentTerms} days</p>
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-factory-dark rounded-2xl border border-factory-border overflow-hidden">
        <div className="p-6 border-b border-factory-border flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Recent Transactions</h3>
          <Button variant="ghost" size="sm" onClick={() => setActiveTab('financial')}>
            View All
          </Button>
        </div>
        <div className="divide-y divide-factory-border">
          {ledgerEntries.slice(0, 5).map((entry) => (
            <div key={entry.id} className="p-4 hover:bg-factory-gray transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 text-xs rounded-full ${
                      entry.debit > 0 ? 'bg-error/20 text-error' : 'bg-success/20 text-success'
                    }`}>
                      {VENDOR_LEDGER_ENTRY_TYPES[entry.entryType].label}
                    </span>
                    {entry.referenceNumber && (
                      <span className="text-xs text-neutral-400 font-mono">
                        {entry.referenceNumber}
                      </span>
                    )}
                  </div>
                  <p className="text-neutral-300 text-sm mt-1">{entry.description}</p>
                </div>
                <div className="text-right">
                  <p className={`font-medium ${entry.debit > 0 ? 'text-error' : 'text-success'}`}>
                    {entry.debit > 0 ? '+' : '-'}{formatPKR(entry.debit || entry.credit)}
                  </p>
                  <p className="text-xs text-neutral-500">{formatDate(entry.entryDate)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pending Issues Alert */}
      {summary.pendingReplacements > 0 && (
        <div className="bg-warning/10 border border-warning/30 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <p className="text-warning font-medium">Pending Replacements</p>
                <p className="text-neutral-300 text-sm">
                  {summary.pendingReplacements} replacement issue(s) need attention
                </p>
              </div>
            </div>
            <Button variant="secondary" size="sm" onClick={() => setActiveTab('replacements')}>
              View Issues
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  const FinancialLedgerTab = () => (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-factory-dark rounded-xl border border-factory-border p-4">
          <p className="text-sm text-neutral-400">Total Purchases</p>
          <p className="text-2xl font-semibold text-error">{formatPKR(summary.totalPurchases)}</p>
        </div>
        <div className="bg-factory-dark rounded-xl border border-factory-border p-4">
          <p className="text-sm text-neutral-400">Total Payments</p>
          <p className="text-2xl font-semibold text-success">{formatPKR(summary.totalPayments)}</p>
        </div>
        <div className="bg-factory-dark rounded-xl border border-factory-border p-4">
          <p className="text-sm text-neutral-400">Current Balance</p>
          <p className="text-2xl font-semibold text-primary-400">{formatPKR(vendor.currentBalance)}</p>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-factory-dark rounded-2xl border border-factory-border overflow-hidden">
        <div className="p-6 border-b border-factory-border flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Financial Ledger</h3>
          <Button variant="ghost" size="sm">Export</Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-factory-border">
                <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">Date</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">Type</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">Description</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">Reference</th>
                <th className="text-right px-6 py-4 text-sm font-medium text-neutral-400">Debit</th>
                <th className="text-right px-6 py-4 text-sm font-medium text-neutral-400">Credit</th>
                <th className="text-right px-6 py-4 text-sm font-medium text-neutral-400">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-factory-border">
              {ledgerEntries.map((entry) => (
                <tr key={entry.id} className="hover:bg-factory-gray transition-colors">
                  <td className="px-6 py-4 text-neutral-300">{formatDate(entry.entryDate)}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      entry.debit > 0 ? 'bg-error/20 text-error' : 'bg-success/20 text-success'
                    }`}>
                      {VENDOR_LEDGER_ENTRY_TYPES[entry.entryType].label}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-white max-w-xs truncate">{entry.description}</td>
                  <td className="px-6 py-4 text-neutral-400 font-mono text-sm">
                    {entry.referenceNumber || '-'}
                  </td>
                  <td className="px-6 py-4 text-right text-error font-medium">
                    {entry.debit > 0 ? formatPKR(entry.debit) : '-'}
                  </td>
                  <td className="px-6 py-4 text-right text-success font-medium">
                    {entry.credit > 0 ? formatPKR(entry.credit) : '-'}
                  </td>
                  <td className="px-6 py-4 text-right text-white font-semibold">
                    {formatPKR(entry.balance)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const YarnLedgerTab = () => (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-factory-dark rounded-xl border border-factory-border p-4">
          <p className="text-sm text-neutral-400">Total Yarn Received</p>
          <p className="text-2xl font-semibold text-white">{summary.totalYarnReceived.toLocaleString()} kg</p>
        </div>
        <div className="bg-factory-dark rounded-xl border border-factory-border p-4">
          <p className="text-sm text-neutral-400">Total Receipts</p>
          <p className="text-2xl font-semibold text-white">{yarnReceipts.length}</p>
        </div>
        <div className="bg-factory-dark rounded-xl border border-factory-border p-4">
          <p className="text-sm text-neutral-400">Issues Reported</p>
          <p className="text-2xl font-semibold text-warning">
            {yarnReceipts.filter((r) => r.hasIssue).length}
          </p>
        </div>
      </div>

      {/* Receipts Table */}
      <div className="bg-factory-dark rounded-2xl border border-factory-border overflow-hidden">
        <div className="p-6 border-b border-factory-border">
          <h3 className="text-lg font-semibold text-white">Yarn Receipts</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-factory-border">
                <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">Date</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">Receipt #</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">Yarn Type</th>
                <th className="text-right px-6 py-4 text-sm font-medium text-neutral-400">Qty (kg)</th>
                <th className="text-right px-6 py-4 text-sm font-medium text-neutral-400">Rate</th>
                <th className="text-right px-6 py-4 text-sm font-medium text-neutral-400">Amount</th>
                <th className="text-center px-6 py-4 text-sm font-medium text-neutral-400">Quality</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-factory-border">
              {yarnReceipts.map((receipt) => (
                <tr key={receipt.id} className="hover:bg-factory-gray transition-colors">
                  <td className="px-6 py-4 text-neutral-300">{formatDate(receipt.receiptDate)}</td>
                  <td className="px-6 py-4 text-primary-400 font-mono">{receipt.receiptNumber}</td>
                  <td className="px-6 py-4">
                    <p className="text-white">{receipt.yarnTypeName}</p>
                    <p className="text-xs text-neutral-400">{receipt.yarnTypeCode}</p>
                  </td>
                  <td className="px-6 py-4 text-right text-white">{receipt.quantityReceived}</td>
                  <td className="px-6 py-4 text-right text-neutral-300">{formatPKR(receipt.ratePerKg)}</td>
                  <td className="px-6 py-4 text-right text-white font-medium">{formatPKR(receipt.totalAmount)}</td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center">
                      <span className={`px-2 py-1 text-xs rounded-full bg-${QUALITY_STATUSES[receipt.qualityStatus].color}/20 text-${QUALITY_STATUSES[receipt.qualityStatus].color}`}>
                        {QUALITY_STATUSES[receipt.qualityStatus].label}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const ReplacementsTab = () => (
    <div className="space-y-6">
      {replacements.length === 0 ? (
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-12 text-center">
          <p className="text-neutral-400">No replacement issues recorded for this vendor.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {replacements.map((replacement) => (
            <div key={replacement.id} className="bg-factory-dark rounded-2xl border border-factory-border p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2.5 py-1 text-sm rounded-full bg-${REPLACEMENT_STATUSES[replacement.status].color}/20 text-${REPLACEMENT_STATUSES[replacement.status].color}`}>
                      {REPLACEMENT_STATUSES[replacement.status].label}
                    </span>
                    <span className="text-neutral-400 text-sm">
                      {formatDate(replacement.issueDate)}
                    </span>
                  </div>
                  <p className="text-white font-medium mt-2">
                    {ISSUE_TYPES[replacement.issueType].label}
                  </p>
                  <p className="text-neutral-300 text-sm mt-1">{replacement.issueDescription}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-neutral-400">Original Receipt</p>
                  <p className="text-primary-400 font-mono">{replacement.originalReceiptNumber}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-factory-gray rounded-xl">
                <div>
                  <p className="text-xs text-neutral-400">Affected Qty</p>
                  <p className="text-white font-medium">{replacement.affectedQuantity} kg</p>
                </div>
                <div>
                  <p className="text-xs text-neutral-400">Returned Qty</p>
                  <p className="text-white font-medium">
                    {replacement.returnedQuantity ? `${replacement.returnedQuantity} kg` : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-neutral-400">Return Date</p>
                  <p className="text-white">
                    {replacement.returnedDate ? formatDate(replacement.returnedDate) : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-neutral-400">Return Challan</p>
                  <p className="text-white font-mono text-sm">
                    {replacement.returnChallanNumber || '-'}
                  </p>
                </div>
              </div>

              {replacement.notes && (
                <p className="text-neutral-400 text-sm mt-4">
                  <span className="text-neutral-500">Notes:</span> {replacement.notes}
                </p>
              )}

              {REPLACEMENT_STATUSES[replacement.status].isOpen && (
                <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-factory-border">
                  {replacement.status === 'REPORTED' && (
                    <Button variant="secondary" size="sm">Mark Return Pending</Button>
                  )}
                  {replacement.status === 'RETURN_PENDING' && (
                    <Button variant="secondary" size="sm">Mark Returned</Button>
                  )}
                  {replacement.status === 'RETURNED' && (
                    <>
                      <Button variant="secondary" size="sm">Add Credit</Button>
                      <Button size="sm">Mark Replaced</Button>
                    </>
                  )}
                  {replacement.status === 'REPLACEMENT_PENDING' && (
                    <Button size="sm">Mark Replaced</Button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const tabs: { id: TabId; label: string; badge?: number }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'financial', label: 'Financial Ledger' },
    { id: 'yarn', label: 'Yarn Ledger' },
    { id: 'replacements', label: 'Replacements', badge: summary.pendingReplacements },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm">
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
          <div className="flex items-center gap-3 mt-2">
            <h1 className="text-2xl font-semibold text-white">{vendor.name}</h1>
            <span className={`px-2.5 py-1 text-sm font-medium rounded-full ${
              vendor.isActive
                ? 'bg-success/20 text-success'
                : 'bg-neutral-500/20 text-neutral-400'
            }`}>
              {vendor.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
          <p className="text-neutral-400 mt-1">{vendor.city}, {vendor.country}</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => setShowPaymentModal(true)}>
            + Add Payment
          </Button>
          <Link href={`/finance/vendors/${vendor.id}/edit`}>
            <Button variant="ghost">Edit</Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Current Balance"
          value={formatPKR(vendor.currentBalance)}
          change={vendor.currentBalance > vendor.creditLimit ? 'Over limit!' : 'Within limit'}
          changeType={vendor.currentBalance > vendor.creditLimit ? 'negative' : 'positive'}
          icon="💳"
        />
        <StatsCard
          title="Total Purchases"
          value={formatPKR(summary.totalPurchases)}
          icon="📦"
        />
        <StatsCard
          title="Yarn Received"
          value={`${summary.totalYarnReceived.toLocaleString()} kg`}
          icon="🧶"
        />
        <StatsCard
          title="Pending Issues"
          value={summary.pendingReplacements}
          change={summary.pendingReplacements > 0 ? 'Needs attention' : 'All resolved'}
          changeType={summary.pendingReplacements > 0 ? 'negative' : 'positive'}
          icon="⚠️"
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
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="ml-2 px-1.5 py-0.5 text-xs rounded-full bg-warning/20 text-warning">
                  {tab.badge}
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
        {activeTab === 'yarn' && <YarnLedgerTab />}
        {activeTab === 'replacements' && <ReplacementsTab />}
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-factory-dark rounded-2xl border border-factory-border p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-white mb-4">Record Payment</h3>

            <div className="space-y-4">
              <Input
                label="Payment Date *"
                type="date"
                value={paymentData.paymentDate}
                onChange={(e) => setPaymentData({ ...paymentData, paymentDate: e.target.value })}
              />

              <Input
                label="Amount (PKR) *"
                type="number"
                placeholder="0"
                value={paymentData.amount || ''}
                onChange={(e) => setPaymentData({ ...paymentData, amount: Number(e.target.value) })}
              />

              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                  Payment Method *
                </label>
                <select
                  value={paymentData.paymentMethod}
                  onChange={(e) => setPaymentData({ ...paymentData, paymentMethod: e.target.value as PaymentMethod })}
                  className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {Object.values(PAYMENT_METHODS).map((method) => (
                    <option key={method.code} value={method.code}>
                      {method.label}
                    </option>
                  ))}
                </select>
              </div>

              {PAYMENT_METHODS[paymentData.paymentMethod].requiresReference && (
                <Input
                  label="Reference Number"
                  placeholder="Cheque # or Transaction ID"
                  value={paymentData.referenceNumber}
                  onChange={(e) => setPaymentData({ ...paymentData, referenceNumber: e.target.value })}
                />
              )}

              {PAYMENT_METHODS[paymentData.paymentMethod].requiresBank && (
                <Input
                  label="Bank Name"
                  placeholder="Bank name"
                  value={paymentData.bankName}
                  onChange={(e) => setPaymentData({ ...paymentData, bankName: e.target.value })}
                />
              )}

              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                  Notes
                </label>
                <textarea
                  rows={2}
                  className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Any notes..."
                  value={paymentData.notes}
                  onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button variant="secondary" onClick={() => setShowPaymentModal(false)}>
                Cancel
              </Button>
              <Button onClick={handlePaymentSubmit} disabled={isProcessing}>
                {isProcessing ? 'Recording...' : 'Record Payment'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
