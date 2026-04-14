'use client';

import { useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/atoms/Button';
import { StatsCard } from '@/components/molecules/StatsCard';
import { LedgerTable, LedgerEntry, LedgerSummary } from '@/components/molecules/LedgerTable';
import { PaymentModal, PaymentFormData } from '@/components/molecules/PaymentModal';
import { ChequeStatusBadge } from '@/components/atoms/StatusBadge';
import { useToast } from '@/contexts/ToastContext';
import {
  Customer,
  CustomerLedgerEntry,
  MaterialTransaction,
  CUSTOMER_LEDGER_TYPES,
  MATERIAL_TRANSACTION_TYPES,
  formatPKR,
} from '@/lib/types/receivables';
import { Cheque, formatChequeAmount, formatDate, getDaysUntilMaturity } from '@/lib/types/cheque';

// Tab types
type TabId = 'overview' | 'financial' | 'materials' | 'payments';

// Mock customer data
const mockCustomer: Customer = {
  id: '1',
  code: 'CUST-001',
  name: 'Fashion Hub',
  contactPerson: 'Imran Ali',
  phone: '0300-1234567',
  email: 'imran@fashionhub.pk',
  address: '123 Main Boulevard, Block A',
  city: 'Lahore',
  ntn: '1234567-8',
  strn: 'STR-9876543',
  creditLimit: 1000000,
  paymentTerms: 30,
  currentBalance: 450000,
  rating: 5,
  isActive: true,
  notes: 'Premium customer - handles bulk orders for wedding seasons.',
  createdAt: '2024-01-01',
  updatedAt: '2024-01-20',
};

// Mock ledger entries
const mockLedgerEntries: CustomerLedgerEntry[] = [
  {
    id: '1',
    customerId: '1',
    entryDate: '2024-01-01',
    entryType: 'OPENING_BALANCE',
    debit: 200000,
    credit: 0,
    balance: 200000,
    description: 'Opening balance',
    createdAt: '2024-01-01',
  },
  {
    id: '2',
    customerId: '1',
    entryDate: '2024-01-05',
    entryType: 'SALE',
    debit: 150000,
    credit: 0,
    balance: 350000,
    referenceNumber: 'INV-2024-0012',
    description: 'Fabric sale - 500 meters',
    createdAt: '2024-01-05',
  },
  {
    id: '3',
    customerId: '1',
    entryDate: '2024-01-10',
    entryType: 'PAYMENT_RECEIVED',
    debit: 0,
    credit: 100000,
    balance: 250000,
    referenceNumber: 'RCP-2024-0008',
    description: 'Cash payment received',
    createdAt: '2024-01-10',
  },
  {
    id: '4',
    customerId: '1',
    entryDate: '2024-01-15',
    entryType: 'SALE',
    debit: 200000,
    credit: 0,
    balance: 450000,
    referenceNumber: 'INV-2024-0025',
    description: 'Premium fabric - Wedding collection',
    createdAt: '2024-01-15',
  },
  {
    id: '5',
    customerId: '1',
    entryDate: '2024-01-18',
    entryType: 'CHEQUE_RECEIVED',
    debit: 0,
    credit: 0,
    balance: 450000,
    referenceNumber: 'CHQ-005678',
    description: 'Post-dated cheque received (Jan 25)',
    createdAt: '2024-01-18',
  },
];

// Mock material transactions
const mockMaterialTransactions: MaterialTransaction[] = [
  {
    id: '1',
    transactionNumber: 'TXN-2024-0015',
    customerId: '1',
    transactionDate: '2024-01-05',
    transactionType: 'SALE',
    referenceNumber: 'INV-2024-0012',
    subtotal: 150000,
    discount: 0,
    taxAmount: 0,
    totalAmount: 150000,
    createdAt: '2024-01-05',
    updatedAt: '2024-01-05',
    items: [
      {
        id: '1',
        materialTransactionId: '1',
        productName: 'Premium Cotton Fabric',
        productCode: 'PCF-001',
        description: 'Premium Cotton Fabric',
        quantity: 500,
        unit: 'meters',
        ratePerUnit: 300,
        amount: 150000,
      },
    ],
  },
  {
    id: '2',
    transactionNumber: 'TXN-2024-0028',
    customerId: '1',
    transactionDate: '2024-01-15',
    transactionType: 'SALE',
    referenceNumber: 'INV-2024-0025',
    subtotal: 200000,
    discount: 0,
    taxAmount: 0,
    totalAmount: 200000,
    createdAt: '2024-01-15',
    updatedAt: '2024-01-15',
    items: [
      {
        id: '2',
        materialTransactionId: '2',
        productName: 'Silk Blend - Wedding Collection',
        productCode: 'SBW-001',
        description: 'Silk Blend - Wedding Collection',
        quantity: 200,
        unit: 'meters',
        ratePerUnit: 1000,
        amount: 200000,
      },
    ],
  },
];

// Mock pending cheques
const mockPendingCheques: Cheque[] = [
  {
    id: '1',
    chequeNumber: '005678',
    chequeType: 'RECEIVED',
    customerId: '1',
    customerName: 'Fashion Hub',
    bankName: 'MCB',
    amount: 100000,
    chequeDate: '2024-01-25',
    receivedDate: '2024-01-18',
    depositDate: '2024-01-22',
    status: 'DEPOSITED',
    bounceCount: 0,
    createdAt: '2024-01-18',
    updatedAt: '2024-01-22',
  },
  {
    id: '2',
    chequeNumber: '005690',
    chequeType: 'RECEIVED',
    customerId: '1',
    customerName: 'Fashion Hub',
    bankName: 'HBL',
    amount: 75000,
    chequeDate: '2024-02-01',
    receivedDate: '2024-01-20',
    status: 'PENDING',
    bounceCount: 0,
    createdAt: '2024-01-20',
    updatedAt: '2024-01-20',
  },
];

export default function CustomerDetailPage() {
  const params = useParams();
  const { showToast } = useToast();
  const customerId = params.id as string;

  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const customer = mockCustomer;

  // Transform ledger entries for LedgerTable
  const ledgerTableEntries: LedgerEntry[] = mockLedgerEntries.map((entry) => ({
    id: entry.id,
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
    const totalSales = mockLedgerEntries
      .filter((e) => e.entryType === 'SALE')
      .reduce((sum, e) => sum + e.debit, 0);
    const totalPayments = mockLedgerEntries
      .filter((e) => e.entryType === 'PAYMENT_RECEIVED' || e.entryType === 'CHEQUE_CLEARED')
      .reduce((sum, e) => sum + e.credit, 0);
    const pendingChequeAmount = mockPendingCheques.reduce((sum, c) => sum + c.amount, 0);
    const creditUtilization = (customer.currentBalance / customer.creditLimit) * 100;

    return {
      totalSales,
      totalPayments,
      pendingChequeAmount,
      creditUtilization,
    };
  }, [customer.currentBalance, customer.creditLimit]);

  // Payment handler
  const handlePayment = async (data: PaymentFormData) => {
    setIsProcessing(true);
    try {
      // TODO: API call to record payment
      await new Promise((resolve) => setTimeout(resolve, 1000));
      showToast('success', 'Payment recorded successfully!');
      setShowPaymentModal(false);
    } catch (error) {
      showToast('error', 'Failed to record payment');
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

  // Tab content components
  const OverviewTab = () => (
    <div className="space-y-6">
      {/* Customer Details Card */}
      <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Customer Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <p className="text-sm text-neutral-400">Contact Person</p>
              <p className="text-white">{customer.contactPerson || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-neutral-400">Phone</p>
              <p className="text-white">{customer.phone}</p>
            </div>
            <div>
              <p className="text-sm text-neutral-400">Email</p>
              <p className="text-white">{customer.email || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-neutral-400">Rating</p>
              {renderRating(customer.rating)}
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-neutral-400">Address</p>
              <p className="text-white">{customer.address || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-neutral-400">City</p>
              <p className="text-white">{customer.city || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-neutral-400">Credit Limit</p>
              <p className="text-white">{formatPKR(customer.creditLimit)}</p>
            </div>
            <div>
              <p className="text-sm text-neutral-400">Payment Terms</p>
              <p className="text-white">{customer.paymentTerms} days</p>
            </div>
          </div>
        </div>

        {/* Tax Info */}
        {(customer.ntn || customer.strn) && (
          <div className="mt-6 pt-4 border-t border-factory-border">
            <h4 className="text-sm font-medium text-white mb-3">Tax Information</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-neutral-400">NTN</p>
                <p className="text-sm text-white font-mono">{customer.ntn || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-400">STRN</p>
                <p className="text-sm text-white font-mono">{customer.strn || '-'}</p>
              </div>
            </div>
          </div>
        )}

        {customer.notes && (
          <div className="mt-6 pt-4 border-t border-factory-border">
            <p className="text-sm text-neutral-400">Notes</p>
            <p className="text-white mt-1">{customer.notes}</p>
          </div>
        )}
      </div>

      {/* Pending Cheques */}
      {mockPendingCheques.length > 0 && (
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Pending Cheques</h3>
            <Link href={`/cheques?customerId=${customer.id}`}>
              <Button variant="ghost" size="sm">View All</Button>
            </Link>
          </div>
          <div className="space-y-3">
            {mockPendingCheques.map((cheque) => {
              const daysUntil = getDaysUntilMaturity(cheque.chequeDate);
              return (
                <div
                  key={cheque.id}
                  className="flex items-center justify-between p-3 bg-factory-gray rounded-xl"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-white text-sm font-mono">#{cheque.chequeNumber}</p>
                      <ChequeStatusBadge status={cheque.status} />
                    </div>
                    <p className="text-xs text-neutral-400">{cheque.bankName}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-medium">{formatChequeAmount(cheque.amount)}</p>
                    <p className={`text-xs ${
                      daysUntil < 0 ? 'text-error' : daysUntil <= 3 ? 'text-warning' : 'text-neutral-400'
                    }`}>
                      {formatDate(cheque.chequeDate)}
                      {cheque.status === 'PENDING' && (
                        daysUntil < 0
                          ? ` (${Math.abs(daysUntil)} days overdue)`
                          : daysUntil === 0
                            ? ' (Due today)'
                            : ` (${daysUntil} days)`
                      )}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

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
                  {formatDate(entry.entryDate)} • {CUSTOMER_LEDGER_TYPES[entry.entryType]?.label || entry.entryType}
                </p>
              </div>
              <div className="text-right">
                {entry.debit > 0 && (
                  <p className="text-primary-400 font-medium">+{formatPKR(entry.debit)}</p>
                )}
                {entry.credit > 0 && (
                  <p className="text-success font-medium">-{formatPKR(entry.credit)}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const FinancialLedgerTab = () => {
    const totalDebit = mockLedgerEntries.reduce((sum, e) => sum + e.debit, 0);
    const totalCredit = mockLedgerEntries.reduce((sum, e) => sum + e.credit, 0);

    return (
      <div className="space-y-4">
        <div className="flex justify-end">
          <Link href={`/receivables/customers/${customer.id}/statement`}>
            <Button variant="secondary" size="sm">
              Print Statement
            </Button>
          </Link>
        </div>
        <LedgerTable
          entries={ledgerTableEntries}
          entryTypeLabels={Object.fromEntries(
            Object.entries(CUSTOMER_LEDGER_TYPES).map(([key, value]) => [key, value.label])
          )}
        />
        <LedgerSummary
          totalDebit={totalDebit}
          totalCredit={totalCredit}
          closingBalance={customer.currentBalance}
        />
      </div>
    );
  };

  const MaterialsTab = () => (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-factory-dark rounded-xl border border-factory-border p-4">
          <p className="text-sm text-neutral-400">Total Transactions</p>
          <p className="text-2xl font-semibold text-white">{mockMaterialTransactions.length}</p>
        </div>
        <div className="bg-factory-dark rounded-xl border border-factory-border p-4">
          <p className="text-sm text-neutral-400">Total Sales Value</p>
          <p className="text-2xl font-semibold text-white">
            {formatPKR(mockMaterialTransactions.reduce((sum, t) => sum + t.totalAmount, 0))}
          </p>
        </div>
        <div className="bg-factory-dark rounded-xl border border-factory-border p-4">
          <p className="text-sm text-neutral-400">Returns</p>
          <p className="text-2xl font-semibold text-neutral-400">
            {mockMaterialTransactions.filter((t) => t.transactionType === 'RETURN').length}
          </p>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-factory-dark rounded-2xl border border-factory-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-factory-border">
                <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">Date</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">Transaction #</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">Type</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">Items</th>
                <th className="text-right px-6 py-4 text-sm font-medium text-neutral-400">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-factory-border">
              {mockMaterialTransactions.map((txn) => (
                <tr key={txn.id} className="hover:bg-factory-gray transition-colors">
                  <td className="px-6 py-4 text-white">{formatDate(txn.transactionDate)}</td>
                  <td className="px-6 py-4 font-mono text-sm text-primary-400">
                    {txn.transactionNumber}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded-md ${
                      txn.transactionType === 'SALE'
                        ? 'bg-success/20 text-success'
                        : txn.transactionType === 'RETURN'
                          ? 'bg-error/20 text-error'
                          : 'bg-neutral-500/20 text-neutral-300'
                    }`}>
                      {MATERIAL_TRANSACTION_TYPES[txn.transactionType]?.label || txn.transactionType}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      {txn.items?.slice(0, 2).map((item) => (
                        <p key={item.id} className="text-sm text-neutral-300">
                          {item.productName} ({item.quantity} {item.unit})
                        </p>
                      ))}
                      {txn.items && txn.items.length > 2 && (
                        <p className="text-xs text-neutral-500">+{txn.items.length - 2} more items</p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right text-white font-medium">
                    {formatPKR(txn.totalAmount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const PaymentsTab = () => (
    <div className="space-y-4">
      {/* Payment Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-factory-dark rounded-xl border border-factory-border p-4">
          <p className="text-sm text-neutral-400">Total Received</p>
          <p className="text-2xl font-semibold text-success">{formatPKR(summary.totalPayments)}</p>
        </div>
        <div className="bg-factory-dark rounded-xl border border-factory-border p-4">
          <p className="text-sm text-neutral-400">Pending Cheques</p>
          <p className="text-2xl font-semibold text-warning">{formatPKR(summary.pendingChequeAmount)}</p>
        </div>
        <div className="bg-factory-dark rounded-xl border border-factory-border p-4">
          <p className="text-sm text-neutral-400">Outstanding</p>
          <p className="text-2xl font-semibold text-primary-400">{formatPKR(customer.currentBalance)}</p>
        </div>
      </div>

      {/* Payment History */}
      <div className="bg-factory-dark rounded-2xl border border-factory-border overflow-hidden">
        <div className="px-6 py-4 border-b border-factory-border">
          <h3 className="text-lg font-semibold text-white">Payment History</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-factory-border">
                <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">Date</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">Reference</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">Type</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">Description</th>
                <th className="text-right px-6 py-4 text-sm font-medium text-neutral-400">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-factory-border">
              {mockLedgerEntries
                .filter((e) => ['PAYMENT_RECEIVED', 'CHEQUE_RECEIVED', 'CHEQUE_CLEARED', 'CHEQUE_BOUNCED'].includes(e.entryType))
                .map((entry) => (
                  <tr key={entry.id} className="hover:bg-factory-gray transition-colors">
                    <td className="px-6 py-4 text-white">{formatDate(entry.entryDate)}</td>
                    <td className="px-6 py-4 font-mono text-sm text-neutral-300">
                      {entry.referenceNumber || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs rounded-md ${
                        entry.entryType === 'CHEQUE_BOUNCED'
                          ? 'bg-error/20 text-error'
                          : 'bg-success/20 text-success'
                      }`}>
                        {CUSTOMER_LEDGER_TYPES[entry.entryType]?.label || entry.entryType}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-neutral-300">{entry.description}</td>
                    <td className="px-6 py-4 text-right">
                      <span className={entry.credit > 0 ? 'text-success font-medium' : 'text-error font-medium'}>
                        {entry.credit > 0 ? formatPKR(entry.credit) : `-${formatPKR(entry.debit)}`}
                      </span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>

          {mockLedgerEntries.filter((e) =>
            ['PAYMENT_RECEIVED', 'CHEQUE_RECEIVED', 'CHEQUE_CLEARED', 'CHEQUE_BOUNCED'].includes(e.entryType)
          ).length === 0 && (
            <div className="text-center py-12">
              <p className="text-neutral-400">No payment records found.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const tabs: { id: TabId; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'financial', label: 'Financial Ledger' },
    { id: 'materials', label: 'Material Ledger' },
    { id: 'payments', label: 'Payments' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm">
            <Link href="/receivables" className="text-neutral-400 hover:text-white">
              Receivables
            </Link>
            <span className="text-neutral-600">/</span>
            <Link href="/receivables/customers" className="text-neutral-400 hover:text-white">
              Customers
            </Link>
            <span className="text-neutral-600">/</span>
            <span className="text-white">{customer.code}</span>
          </div>
          <div className="flex items-center gap-3 mt-2">
            <h1 className="text-2xl font-semibold text-white">{customer.name}</h1>
            <span
              className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                customer.isActive
                  ? 'bg-success/20 text-success'
                  : 'bg-neutral-500/20 text-neutral-400'
              }`}
            >
              {customer.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
          <p className="text-neutral-400 mt-1">{customer.city}</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => setShowPaymentModal(true)}>
            + Record Payment
          </Button>
          <Link href={`/receivables/customers/${customer.id}/edit`}>
            <Button variant="ghost">Edit</Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Current Balance"
          value={formatPKR(customer.currentBalance)}
          change={customer.currentBalance > 0 ? 'Outstanding' : 'Cleared'}
          changeType={customer.currentBalance > 0 ? 'negative' : 'positive'}
          icon="💰"
        />
        <StatsCard
          title="Total Sales"
          value={formatPKR(summary.totalSales)}
          icon="📦"
        />
        <StatsCard
          title="Total Payments"
          value={formatPKR(summary.totalPayments)}
          icon="💳"
        />
        <StatsCard
          title="Credit Available"
          value={formatPKR(Math.max(0, customer.creditLimit - customer.currentBalance))}
          change={`${summary.creditUtilization.toFixed(0)}% used`}
          changeType={summary.creditUtilization > 80 ? 'negative' : summary.creditUtilization > 50 ? 'neutral' : 'positive'}
          icon="💵"
        />
      </div>

      {/* Credit Utilization Bar */}
      <div className="bg-factory-dark rounded-2xl border border-factory-border p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-neutral-400">Credit Utilization</span>
          <span className={`text-sm font-medium ${
            summary.creditUtilization > 80 ? 'text-error' : summary.creditUtilization > 50 ? 'text-warning' : 'text-success'
          }`}>
            {summary.creditUtilization.toFixed(1)}%
          </span>
        </div>
        <div className="h-3 bg-factory-gray rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              summary.creditUtilization > 80 ? 'bg-error' : summary.creditUtilization > 50 ? 'bg-warning' : 'bg-success'
            }`}
            style={{ width: `${Math.min(100, summary.creditUtilization)}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-neutral-500">
          <span>Balance: {formatPKR(customer.currentBalance)}</span>
          <span>Limit: {formatPKR(customer.creditLimit)}</span>
        </div>
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
              {tab.id === 'payments' && mockPendingCheques.length > 0 && (
                <span className="ml-2 px-1.5 py-0.5 text-xs rounded-full bg-warning/20 text-warning">
                  {mockPendingCheques.length}
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
        {activeTab === 'payments' && <PaymentsTab />}
      </div>

      {/* Payment Modal */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onSubmit={handlePayment}
        partyName={customer.name}
        partyType="customer"
        currentBalance={customer.currentBalance}
        isLoading={isProcessing}
      />
    </div>
  );
}
