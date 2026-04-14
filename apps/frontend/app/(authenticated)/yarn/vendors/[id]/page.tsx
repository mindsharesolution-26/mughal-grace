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
  VendorPaymentFormData,
  formatPKR,
  formatDate,
  VENDOR_LEDGER_ENTRY_TYPES,
  QUALITY_STATUSES,
  REPLACEMENT_STATUSES,
  ISSUE_TYPES,
  PAYMENT_METHODS,
  PaymentMethod,
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
  address: '123 Industrial Area, Ghulam Muhammad Abad',
  city: 'Faisalabad',
  country: 'Pakistan',
  creditLimit: 500000,
  paymentTerms: 30,
  currentBalance: 125000,
  rating: 4,
  isActive: true,
  notes: 'Preferred vendor for cotton yarn. Good quality and timely delivery.',
  createdAt: '2024-01-01',
  updatedAt: '2024-01-15',
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
    entryDate: '2024-01-05',
    entryType: 'PURCHASE',
    debit: 75000,
    credit: 0,
    balance: 125000,
    referenceType: 'YARN_BOX',
    referenceNumber: 'GRN-2024-0012',
    description: 'Cotton 40s - 150kg @ Rs. 500/kg',
    createdAt: '2024-01-05',
  },
  {
    id: '3',
    vendorId: '1',
    entryDate: '2024-01-10',
    entryType: 'PAYMENT',
    debit: 0,
    credit: 50000,
    balance: 75000,
    referenceType: 'PAYMENT',
    referenceNumber: 'PAY-2024-0005',
    description: 'Bank transfer - HBL',
    createdAt: '2024-01-10',
  },
  {
    id: '4',
    vendorId: '1',
    entryDate: '2024-01-15',
    entryType: 'PURCHASE',
    debit: 60000,
    credit: 0,
    balance: 135000,
    referenceType: 'YARN_BOX',
    referenceNumber: 'GRN-2024-0018',
    description: 'Polyester 150D - 100kg @ Rs. 600/kg',
    createdAt: '2024-01-15',
  },
  {
    id: '5',
    vendorId: '1',
    entryDate: '2024-01-18',
    entryType: 'RETURN',
    debit: 0,
    credit: 10000,
    balance: 125000,
    referenceType: 'REPLACEMENT',
    referenceNumber: 'RTN-2024-0002',
    description: 'Defective yarn returned - 20kg',
    createdAt: '2024-01-18',
  },
];

// Mock yarn receipts
const mockYarnReceipts: VendorYarnReceipt[] = [
  {
    id: '1',
    vendorId: '1',
    receiptDate: '2024-01-05',
    receiptNumber: 'GRN-2024-0012',
    yarnTypeId: '1',
    yarnTypeName: 'Cotton 40s',
    yarnTypeCode: 'COT-40S',
    quantityReceived: 150,
    ratePerKg: 500,
    totalAmount: 75000,
    qualityStatus: 'APPROVED',
    hasIssue: false,
    createdAt: '2024-01-05',
  },
  {
    id: '2',
    vendorId: '1',
    receiptDate: '2024-01-15',
    receiptNumber: 'GRN-2024-0018',
    yarnTypeId: '3',
    yarnTypeName: 'Polyester 150D',
    yarnTypeCode: 'POL-150D',
    quantityReceived: 100,
    ratePerKg: 600,
    totalAmount: 60000,
    qualityStatus: 'PARTIAL',
    qualityNotes: '20kg found defective',
    approvedQuantity: 80,
    hasIssue: true,
    issueType: 'QUALITY_DEFECT',
    issueDescription: '20kg yarn has quality issues - uneven thickness',
    replacementStatus: 'RETURNED',
    createdAt: '2024-01-15',
  },
  {
    id: '3',
    vendorId: '1',
    receiptDate: '2024-01-20',
    receiptNumber: 'GRN-2024-0025',
    yarnTypeId: '1',
    yarnTypeName: 'Cotton 40s',
    yarnTypeCode: 'COT-40S',
    quantityReceived: 200,
    ratePerKg: 510,
    totalAmount: 102000,
    qualityStatus: 'PENDING',
    hasIssue: false,
    createdAt: '2024-01-20',
  },
];

// Mock replacements
const mockReplacements: VendorReplacement[] = [
  {
    id: '1',
    vendorId: '1',
    originalReceiptId: '2',
    originalReceiptNumber: 'GRN-2024-0018',
    originalYarnType: 'Polyester 150D',
    originalQuantity: 100,
    issueDate: '2024-01-16',
    issueType: 'QUALITY_DEFECT',
    issueDescription: '20kg yarn has quality issues - uneven thickness',
    affectedQuantity: 20,
    returnedQuantity: 20,
    returnedDate: '2024-01-18',
    returnChallanNumber: 'RTN-2024-0002',
    status: 'RETURNED',
    notes: 'Vendor acknowledged the issue and accepted return',
    createdAt: '2024-01-16',
    updatedAt: '2024-01-18',
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

  // In real app, fetch vendor data based on vendorId
  const vendor = mockVendor;

  // Calculate summary stats
  const summary = useMemo(() => {
    const totalPurchases = mockLedgerEntries
      .filter((e) => e.entryType === 'PURCHASE')
      .reduce((sum, e) => sum + e.debit, 0);
    const totalPayments = mockLedgerEntries
      .filter((e) => e.entryType === 'PAYMENT')
      .reduce((sum, e) => sum + e.credit, 0);
    const totalYarnReceived = mockYarnReceipts.reduce(
      (sum, r) => sum + r.quantityReceived,
      0
    );
    const pendingReplacements = mockReplacements.filter(
      (r) => REPLACEMENT_STATUSES[r.status].isOpen
    ).length;

    return {
      totalPurchases,
      totalPayments,
      totalYarnReceived,
      pendingReplacements,
    };
  }, []);

  // Render star rating
  const renderRating = (rating: number) => {
    return (
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
  };

  // Tab content components
  const OverviewTab = () => (
    <div className="space-y-6">
      {/* Vendor Details Card */}
      <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Vendor Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <p className="text-sm text-neutral-400">Contact Person</p>
              <p className="text-white">{vendor.contactPerson}</p>
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
              <p className="text-sm text-neutral-400">Rating</p>
              {renderRating(vendor.rating)}
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-neutral-400">Address</p>
              <p className="text-white">{vendor.address || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-neutral-400">City</p>
              <p className="text-white">{vendor.city}, {vendor.country}</p>
            </div>
            <div>
              <p className="text-sm text-neutral-400">Credit Limit</p>
              <p className="text-white">{formatPKR(vendor.creditLimit)}</p>
            </div>
            <div>
              <p className="text-sm text-neutral-400">Payment Terms</p>
              <p className="text-white">{vendor.paymentTerms} days</p>
            </div>
          </div>
        </div>
        {vendor.notes && (
          <div className="mt-6 pt-4 border-t border-factory-border">
            <p className="text-sm text-neutral-400">Notes</p>
            <p className="text-white mt-1">{vendor.notes}</p>
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
          {mockLedgerEntries.slice(0, 5).map((entry) => (
            <div
              key={entry.id}
              className="flex items-center justify-between p-3 bg-factory-gray rounded-xl"
            >
              <div>
                <p className="text-white text-sm">{entry.description}</p>
                <p className="text-xs text-neutral-400">
                  {formatDate(entry.entryDate)} • {VENDOR_LEDGER_ENTRY_TYPES[entry.entryType].label}
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
          ))}
        </div>
      </div>

      {/* Pending Issues Alert */}
      {summary.pendingReplacements > 0 && (
        <div className="bg-warning/10 border border-warning/30 rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <span className="text-2xl">⚠️</span>
            <div>
              <h3 className="text-lg font-semibold text-warning">
                {summary.pendingReplacements} Pending Issue{summary.pendingReplacements > 1 ? 's' : ''}
              </h3>
              <p className="text-neutral-300 mt-1">
                There are unresolved replacement/return issues with this vendor.
              </p>
              <Button
                variant="secondary"
                size="sm"
                className="mt-3"
                onClick={() => setActiveTab('replacements')}
              >
                View Issues
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const FinancialLedgerTab = () => (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-factory-dark rounded-2xl border border-factory-border p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <Input type="date" label="From Date" />
          <Input type="date" label="To Date" />
          <div className="flex items-end">
            <Button variant="secondary">Filter</Button>
          </div>
          <div className="flex items-end ml-auto">
            <Button variant="ghost">Export</Button>
          </div>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-factory-dark rounded-2xl border border-factory-border overflow-hidden">
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
              {mockLedgerEntries.map((entry) => (
                <tr key={entry.id} className="hover:bg-factory-gray transition-colors">
                  <td className="px-6 py-4 text-white">{formatDate(entry.entryDate)}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      entry.debit > 0 ? 'bg-error/20 text-error' : 'bg-success/20 text-success'
                    }`}>
                      {VENDOR_LEDGER_ENTRY_TYPES[entry.entryType].label}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-white">{entry.description}</td>
                  <td className="px-6 py-4 text-neutral-400 font-mono text-sm">
                    {entry.referenceNumber || '-'}
                  </td>
                  <td className="px-6 py-4 text-right text-error font-medium">
                    {entry.debit > 0 ? formatPKR(entry.debit) : '-'}
                  </td>
                  <td className="px-6 py-4 text-right text-success font-medium">
                    {entry.credit > 0 ? formatPKR(entry.credit) : '-'}
                  </td>
                  <td className="px-6 py-4 text-right text-white font-medium">
                    {formatPKR(entry.balance)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-factory-border bg-factory-gray">
                <td colSpan={4} className="px-6 py-4 text-white font-semibold">
                  Current Balance
                </td>
                <td className="px-6 py-4 text-right text-error font-semibold">
                  {formatPKR(mockLedgerEntries.reduce((sum, e) => sum + e.debit, 0))}
                </td>
                <td className="px-6 py-4 text-right text-success font-semibold">
                  {formatPKR(mockLedgerEntries.reduce((sum, e) => sum + e.credit, 0))}
                </td>
                <td className="px-6 py-4 text-right text-warning font-semibold">
                  {formatPKR(vendor.currentBalance)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );

  const YarnLedgerTab = () => (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-factory-dark rounded-xl border border-factory-border p-4">
          <p className="text-sm text-neutral-400">Total Receipts</p>
          <p className="text-2xl font-semibold text-white">{mockYarnReceipts.length}</p>
        </div>
        <div className="bg-factory-dark rounded-xl border border-factory-border p-4">
          <p className="text-sm text-neutral-400">Total Yarn Received</p>
          <p className="text-2xl font-semibold text-white">{summary.totalYarnReceived} kg</p>
        </div>
        <div className="bg-factory-dark rounded-xl border border-factory-border p-4">
          <p className="text-sm text-neutral-400">Total Value</p>
          <p className="text-2xl font-semibold text-white">{formatPKR(summary.totalPurchases)}</p>
        </div>
      </div>

      {/* Yarn Receipts Table */}
      <div className="bg-factory-dark rounded-2xl border border-factory-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-factory-border">
                <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">Date</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">Receipt #</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">Yarn Type</th>
                <th className="text-right px-6 py-4 text-sm font-medium text-neutral-400">Qty (kg)</th>
                <th className="text-right px-6 py-4 text-sm font-medium text-neutral-400">Rate/kg</th>
                <th className="text-right px-6 py-4 text-sm font-medium text-neutral-400">Amount</th>
                <th className="text-center px-6 py-4 text-sm font-medium text-neutral-400">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-factory-border">
              {mockYarnReceipts.map((receipt) => (
                <tr key={receipt.id} className="hover:bg-factory-gray transition-colors">
                  <td className="px-6 py-4 text-white">{formatDate(receipt.receiptDate)}</td>
                  <td className="px-6 py-4 font-mono text-sm text-primary-400">
                    {receipt.receiptNumber}
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-white">{receipt.yarnTypeName}</p>
                      <p className="text-xs text-neutral-400">{receipt.yarnTypeCode}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right text-white">{receipt.quantityReceived}</td>
                  <td className="px-6 py-4 text-right text-neutral-300">
                    {formatPKR(receipt.ratePerKg)}
                  </td>
                  <td className="px-6 py-4 text-right text-white font-medium">
                    {formatPKR(receipt.totalAmount)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center">
                      <span
                        className={`px-2 py-1 text-xs rounded-full bg-${QUALITY_STATUSES[receipt.qualityStatus].color}/20 text-${QUALITY_STATUSES[receipt.qualityStatus].color}`}
                      >
                        {QUALITY_STATUSES[receipt.qualityStatus].label}
                      </span>
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
      </div>
    </div>
  );

  const ReplacementsTab = () => (
    <div className="space-y-4">
      {mockReplacements.length === 0 ? (
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-12 text-center">
          <p className="text-neutral-400">No replacement issues with this vendor.</p>
        </div>
      ) : (
        <div className="bg-factory-dark rounded-2xl border border-factory-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-factory-border">
                  <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">Issue Date</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">Original Receipt</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">Issue Type</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">Description</th>
                  <th className="text-right px-6 py-4 text-sm font-medium text-neutral-400">Qty</th>
                  <th className="text-center px-6 py-4 text-sm font-medium text-neutral-400">Status</th>
                  <th className="text-right px-6 py-4 text-sm font-medium text-neutral-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-factory-border">
                {mockReplacements.map((replacement) => (
                  <tr key={replacement.id} className="hover:bg-factory-gray transition-colors">
                    <td className="px-6 py-4 text-white">{formatDate(replacement.issueDate)}</td>
                    <td className="px-6 py-4">
                      <p className="font-mono text-sm text-primary-400">
                        {replacement.originalReceiptNumber}
                      </p>
                      <p className="text-xs text-neutral-400">{replacement.originalYarnType}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 text-xs rounded-full bg-error/20 text-error">
                        {ISSUE_TYPES[replacement.issueType].label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-neutral-300 max-w-xs truncate">
                      {replacement.issueDescription}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="text-white">{replacement.affectedQuantity} kg</p>
                      {replacement.returnedQuantity && (
                        <p className="text-xs text-neutral-400">
                          Returned: {replacement.returnedQuantity} kg
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center">
                        <span
                          className={`px-2 py-1 text-xs rounded-full`}
                          style={{
                            backgroundColor: `var(--${REPLACEMENT_STATUSES[replacement.status].color})`,
                            opacity: 0.2,
                          }}
                        >
                          <span className={`text-${REPLACEMENT_STATUSES[replacement.status].color}`}>
                            {REPLACEMENT_STATUSES[replacement.status].label}
                          </span>
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        {replacement.status === 'RETURNED' && (
                          <>
                            <Button variant="ghost" size="sm">
                              Mark Replaced
                            </Button>
                            <Button variant="ghost" size="sm">
                              Add Credit
                            </Button>
                          </>
                        )}
                        {replacement.status === 'REPORTED' && (
                          <Button variant="ghost" size="sm">
                            Mark Returned
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Replacement History Legend */}
      <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Replacement Flow</h3>
        <div className="flex flex-wrap gap-4">
          {Object.values(REPLACEMENT_STATUSES).map((status) => (
            <div key={status.code} className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full bg-${status.color}`}></span>
              <span className="text-sm text-neutral-300">{status.label}</span>
            </div>
          ))}
        </div>
        <p className="text-sm text-neutral-400 mt-4">
          Reported → Return Pending → Returned → (Replacement Pending → Replaced) OR (Credited) → Closed
        </p>
      </div>
    </div>
  );

  // Payment Modal
  const PaymentModal = () => {
    const [paymentData, setPaymentData] = useState<Partial<VendorPaymentFormData>>({
      vendorId: vendor.id,
      paymentDate: new Date().toISOString().split('T')[0],
      paymentMethod: 'BANK_TRANSFER',
    });

    const handleSubmitPayment = async () => {
      setIsProcessing(true);
      try {
        // TODO: API call to record payment
        showToast('success', 'Payment recorded successfully!');
        setShowPaymentModal(false);
      } catch (error) {
        showToast('error', 'Failed to record payment');
      } finally {
        setIsProcessing(false);
      }
    };

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-factory-dark rounded-2xl border border-factory-border w-full max-w-md">
          <div className="p-6 border-b border-factory-border">
            <h2 className="text-xl font-semibold text-white">Record Payment</h2>
            <p className="text-sm text-neutral-400 mt-1">
              Outstanding: {formatPKR(vendor.currentBalance)}
            </p>
          </div>

          <div className="p-6 space-y-4">
            <Input
              label="Payment Date *"
              type="date"
              value={paymentData.paymentDate}
              onChange={(e) => setPaymentData({ ...paymentData, paymentDate: e.target.value })}
            />

            <Input
              label="Amount (PKR) *"
              type="number"
              placeholder="Enter amount"
              value={paymentData.amount || ''}
              onChange={(e) => setPaymentData({ ...paymentData, amount: Number(e.target.value) })}
            />

            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                Payment Method *
              </label>
              <select
                value={paymentData.paymentMethod}
                onChange={(e) =>
                  setPaymentData({ ...paymentData, paymentMethod: e.target.value as PaymentMethod })
                }
                className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {Object.values(PAYMENT_METHODS).map((method) => (
                  <option key={method.code} value={method.code}>
                    {method.label}
                  </option>
                ))}
              </select>
            </div>

            {(paymentData.paymentMethod === 'CHEQUE' ||
              paymentData.paymentMethod === 'BANK_TRANSFER' ||
              paymentData.paymentMethod === 'ONLINE') && (
              <Input
                label="Reference Number"
                placeholder="Cheque # / Transaction ID"
                value={paymentData.referenceNumber || ''}
                onChange={(e) =>
                  setPaymentData({ ...paymentData, referenceNumber: e.target.value })
                }
              />
            )}

            {(paymentData.paymentMethod === 'CHEQUE' ||
              paymentData.paymentMethod === 'BANK_TRANSFER') && (
              <Input
                label="Bank Name"
                placeholder="Enter bank name"
                value={paymentData.bankName || ''}
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
                placeholder="Optional notes..."
                value={paymentData.notes || ''}
                onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
              />
            </div>
          </div>

          <div className="p-6 border-t border-factory-border flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setShowPaymentModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmitPayment}
              disabled={isProcessing || !paymentData.amount}
            >
              {isProcessing ? 'Recording...' : 'Record Payment'}
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const tabs: { id: TabId; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'financial', label: 'Financial Ledger' },
    { id: 'yarn', label: 'Yarn Ledger' },
    { id: 'replacements', label: 'Replacements' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm">
            <Link href="/yarn" className="text-neutral-400 hover:text-white">
              Yarn
            </Link>
            <span className="text-neutral-600">/</span>
            <Link href="/yarn/vendors" className="text-neutral-400 hover:text-white">
              Vendors
            </Link>
            <span className="text-neutral-600">/</span>
            <span className="text-white">{vendor.code}</span>
          </div>
          <div className="flex items-center gap-3 mt-2">
            <h1 className="text-2xl font-semibold text-white">{vendor.name}</h1>
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
          <p className="text-neutral-400 mt-1">{vendor.city}, {vendor.country}</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => setShowPaymentModal(true)}>
            + Add Payment
          </Button>
          <Link href={`/yarn/vendors/${vendor.id}/edit`}>
            <Button variant="ghost">Edit</Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Current Balance"
          value={formatPKR(vendor.currentBalance)}
          change={vendor.currentBalance > 0 ? 'Outstanding' : 'Cleared'}
          changeType={vendor.currentBalance > 0 ? 'negative' : 'positive'}
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
          title="Yarn Received"
          value={`${summary.totalYarnReceived} kg`}
          icon="🧶"
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
              {tab.id === 'replacements' && summary.pendingReplacements > 0 && (
                <span className="ml-2 px-1.5 py-0.5 text-xs rounded-full bg-warning/20 text-warning">
                  {summary.pendingReplacements}
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
      {showPaymentModal && <PaymentModal />}
    </div>
  );
}
