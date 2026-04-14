'use client';

import { useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/atoms/Button';
import {
  Customer,
  CustomerLedgerEntry,
  CUSTOMER_LEDGER_TYPES,
  formatPKR,
} from '@/lib/types/receivables';

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
];

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-PK', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatDateRange(from: string, to: string): string {
  const fromDate = new Date(from).toLocaleDateString('en-PK', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const toDate = new Date(to).toLocaleDateString('en-PK', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  return `${fromDate} to ${toDate}`;
}

export default function CustomerStatementPage() {
  const params = useParams();
  const customerId = params.id as string;

  const [dateFrom, setDateFrom] = useState('2024-01-01');
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);

  const customer = mockCustomer;
  const entries = mockLedgerEntries;

  // Filter entries by date range
  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      const entryDate = new Date(entry.entryDate);
      const from = new Date(dateFrom);
      const to = new Date(dateTo);
      return entryDate >= from && entryDate <= to;
    });
  }, [entries, dateFrom, dateTo]);

  // Calculate totals
  const totals = useMemo(() => {
    const totalDebit = filteredEntries.reduce((sum, e) => sum + e.debit, 0);
    const totalCredit = filteredEntries.reduce((sum, e) => sum + e.credit, 0);
    const openingBalance = filteredEntries.length > 0 ? filteredEntries[0].balance - filteredEntries[0].debit + filteredEntries[0].credit : 0;
    const closingBalance = filteredEntries.length > 0 ? filteredEntries[filteredEntries.length - 1].balance : 0;

    return {
      totalDebit,
      totalCredit,
      openingBalance,
      closingBalance,
    };
  }, [filteredEntries]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Screen-only controls */}
      <div className="print:hidden space-y-6 mb-6">
        {/* Header */}
        <div className="flex items-center justify-between">
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
              <Link href={`/receivables/customers/${customerId}`} className="text-neutral-400 hover:text-white">
                {customer.code}
              </Link>
              <span className="text-neutral-600">/</span>
              <span className="text-white">Statement</span>
            </div>
            <h1 className="text-2xl font-semibold text-white mt-2">Account Statement</h1>
          </div>
          <Button onClick={handlePrint}>
            Print Statement
          </Button>
        </div>

        {/* Date Filter */}
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-sm text-neutral-400 mb-1">From Date</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="px-4 py-2 rounded-xl bg-factory-gray border border-factory-border text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm text-neutral-400 mb-1">To Date</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="px-4 py-2 rounded-xl bg-factory-gray border border-factory-border text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Printable Statement */}
      <div className="bg-white text-black p-8 rounded-lg print:rounded-none print:p-4">
        {/* Company Header */}
        <div className="text-center border-b-2 border-black pb-4 mb-6">
          <h1 className="text-2xl font-bold">MUGHAL GRACE</h1>
          <p className="text-sm text-gray-600">Textile Manufacturing & Trading</p>
          <p className="text-xs text-gray-500 mt-1">
            Factory Address: Industrial Area, Faisalabad | Phone: 041-1234567
          </p>
        </div>

        {/* Statement Title */}
        <div className="text-center mb-6">
          <h2 className="text-xl font-semibold">ACCOUNT STATEMENT</h2>
          <p className="text-sm text-gray-600">{formatDateRange(dateFrom, dateTo)}</p>
        </div>

        {/* Customer Details */}
        <div className="grid grid-cols-2 gap-6 mb-6 text-sm">
          <div className="border border-gray-300 p-4">
            <h3 className="font-semibold border-b border-gray-300 pb-2 mb-2">Customer Details</h3>
            <table className="w-full">
              <tbody>
                <tr>
                  <td className="text-gray-600 py-1">Name:</td>
                  <td className="font-medium">{customer.name}</td>
                </tr>
                <tr>
                  <td className="text-gray-600 py-1">Code:</td>
                  <td className="font-mono">{customer.code}</td>
                </tr>
                <tr>
                  <td className="text-gray-600 py-1">Contact:</td>
                  <td>{customer.contactPerson}</td>
                </tr>
                <tr>
                  <td className="text-gray-600 py-1">Phone:</td>
                  <td>{customer.phone}</td>
                </tr>
                <tr>
                  <td className="text-gray-600 py-1">City:</td>
                  <td>{customer.city}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="border border-gray-300 p-4">
            <h3 className="font-semibold border-b border-gray-300 pb-2 mb-2">Account Summary</h3>
            <table className="w-full">
              <tbody>
                <tr>
                  <td className="text-gray-600 py-1">Credit Limit:</td>
                  <td className="font-medium text-right">{formatPKR(customer.creditLimit)}</td>
                </tr>
                <tr>
                  <td className="text-gray-600 py-1">Payment Terms:</td>
                  <td className="text-right">{customer.paymentTerms} days</td>
                </tr>
                <tr>
                  <td className="text-gray-600 py-1">Opening Balance:</td>
                  <td className="text-right">{formatPKR(totals.openingBalance)}</td>
                </tr>
                <tr className="border-t border-gray-300">
                  <td className="text-gray-900 font-semibold py-2">Closing Balance:</td>
                  <td className="font-bold text-right text-lg">{formatPKR(totals.closingBalance)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Ledger Table */}
        <table className="w-full border-collapse border border-gray-300 text-sm mb-6">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 px-3 py-2 text-left">Date</th>
              <th className="border border-gray-300 px-3 py-2 text-left">Type</th>
              <th className="border border-gray-300 px-3 py-2 text-left">Description</th>
              <th className="border border-gray-300 px-3 py-2 text-left">Reference</th>
              <th className="border border-gray-300 px-3 py-2 text-right">Debit</th>
              <th className="border border-gray-300 px-3 py-2 text-right">Credit</th>
              <th className="border border-gray-300 px-3 py-2 text-right">Balance</th>
            </tr>
          </thead>
          <tbody>
            {filteredEntries.map((entry) => (
              <tr key={entry.id}>
                <td className="border border-gray-300 px-3 py-2">{formatDate(entry.entryDate)}</td>
                <td className="border border-gray-300 px-3 py-2">
                  {CUSTOMER_LEDGER_TYPES[entry.entryType]?.label || entry.entryType}
                </td>
                <td className="border border-gray-300 px-3 py-2">{entry.description}</td>
                <td className="border border-gray-300 px-3 py-2 font-mono text-xs">
                  {entry.referenceNumber || '-'}
                </td>
                <td className="border border-gray-300 px-3 py-2 text-right">
                  {entry.debit > 0 ? formatPKR(entry.debit) : '-'}
                </td>
                <td className="border border-gray-300 px-3 py-2 text-right">
                  {entry.credit > 0 ? formatPKR(entry.credit) : '-'}
                </td>
                <td className="border border-gray-300 px-3 py-2 text-right font-medium">
                  {formatPKR(entry.balance)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-100 font-semibold">
              <td colSpan={4} className="border border-gray-300 px-3 py-2 text-right">
                Totals:
              </td>
              <td className="border border-gray-300 px-3 py-2 text-right">
                {formatPKR(totals.totalDebit)}
              </td>
              <td className="border border-gray-300 px-3 py-2 text-right">
                {formatPKR(totals.totalCredit)}
              </td>
              <td className="border border-gray-300 px-3 py-2 text-right">
                {formatPKR(totals.closingBalance)}
              </td>
            </tr>
          </tfoot>
        </table>

        {/* Summary Box */}
        <div className="border-2 border-gray-400 p-4 inline-block float-right">
          <table className="text-sm">
            <tbody>
              <tr>
                <td className="pr-8 py-1">Total Sales:</td>
                <td className="font-medium text-right">{formatPKR(totals.totalDebit)}</td>
              </tr>
              <tr>
                <td className="pr-8 py-1">Total Payments:</td>
                <td className="font-medium text-right">{formatPKR(totals.totalCredit)}</td>
              </tr>
              <tr className="border-t border-gray-400">
                <td className="pr-8 py-2 font-bold">Balance Due:</td>
                <td className="font-bold text-right text-lg">{formatPKR(totals.closingBalance)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="clear-both" />

        {/* Footer */}
        <div className="mt-12 pt-4 border-t border-gray-300 text-xs text-gray-500">
          <div className="flex justify-between">
            <div>
              <p>Generated on: {new Date().toLocaleDateString('en-PK', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}</p>
            </div>
            <div className="text-right">
              <p>This is a computer-generated statement.</p>
              <p>For any queries, contact: accounts@mughalgrace.pk</p>
            </div>
          </div>
        </div>

        {/* Payment Terms Note */}
        <div className="mt-6 p-4 bg-gray-50 border border-gray-200 text-xs">
          <p className="font-semibold mb-1">Payment Terms & Conditions:</p>
          <ul className="list-disc list-inside text-gray-600 space-y-1">
            <li>Payment is due within {customer.paymentTerms} days from invoice date.</li>
            <li>Please include invoice/reference number with your payment.</li>
            <li>For cheque payments, ensure cheque is crossed and in favor of "Mughal Grace".</li>
            <li>Bank Details: HBL Account# 1234567890123, Branch Code: 0045</li>
          </ul>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .max-w-4xl,
          .max-w-4xl * {
            visibility: visible;
          }
          .max-w-4xl {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
