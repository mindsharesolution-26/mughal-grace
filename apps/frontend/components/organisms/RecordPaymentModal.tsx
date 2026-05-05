'use client';

import { useState } from 'react';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { useToast } from '@/contexts/ToastContext';
import { dyeingInvoicesApi } from '@/lib/api/dyeing-invoices';
import {
  DyeingInvoiceWithRelations,
  DyeingPaymentMethod,
  RecordPaymentData,
} from '@/lib/types/dyeing-invoice';
import {
  X,
  CreditCard,
  DollarSign,
  Calendar,
  FileText,
  Banknote,
  Building,
} from 'lucide-react';

interface RecordPaymentModalProps {
  invoice: DyeingInvoiceWithRelations | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export function RecordPaymentModal({
  invoice,
  isOpen,
  onClose,
  onUpdate,
}: RecordPaymentModalProps) {
  const { showToast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  // Form state
  const [paymentMethod, setPaymentMethod] = useState<DyeingPaymentMethod>('CASH');
  const [paidAmount, setPaidAmount] = useState('');
  const [paymentDueDate, setPaymentDueDate] = useState('');
  const [chequeNumber, setChequeNumber] = useState('');
  const [chequeDate, setChequeDate] = useState('');
  const [bankName, setBankName] = useState('');
  const [notes, setNotes] = useState('');

  const resetForm = () => {
    setPaymentMethod('CASH');
    setPaidAmount('');
    setPaymentDueDate('');
    setChequeNumber('');
    setChequeDate('');
    setBankName('');
    setNotes('');
  };

  const handleSubmit = async () => {
    if (!invoice) return;

    if (!paidAmount || Number(paidAmount) <= 0) {
      showToast('error', 'Please enter a valid amount');
      return;
    }

    if (paymentMethod === 'CHEQUE') {
      if (!chequeNumber) {
        showToast('error', 'Please enter cheque number');
        return;
      }
      if (!chequeDate) {
        showToast('error', 'Please enter cheque date');
        return;
      }
    }

    try {
      setIsProcessing(true);

      const data: RecordPaymentData = {
        paymentMethod,
        paidAmount: Number(paidAmount),
        ...(paymentDueDate && { paymentDueDate: new Date(paymentDueDate).toISOString() }),
        ...(chequeNumber && { chequeNumber }),
        ...(chequeDate && { chequeDate: new Date(chequeDate).toISOString() }),
        ...(bankName && { bankName }),
        ...(notes && { notes }),
      };

      await dyeingInvoicesApi.recordPayment(invoice.id, data);
      showToast('success', 'Payment recorded successfully');
      resetForm();
      onUpdate();
      onClose();
    } catch (error: any) {
      showToast('error', error.response?.data?.error || 'Failed to record payment');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen || !invoice) return null;

  const totalAmount = Number(invoice.totalAmount || 0);
  const previousPaid = Number(invoice.paidAmount || 0);
  const remaining = totalAmount - previousPaid;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-factory-dark border border-factory-border rounded-2xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-factory-border">
          <div className="flex items-center gap-3">
            <CreditCard className="w-5 h-5 text-primary-400" />
            <h2 className="text-lg font-semibold text-white">Record Payment</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white hover:bg-factory-gray rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Invoice Info */}
          <div className="bg-factory-gray rounded-xl p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-neutral-400 text-sm">Invoice</p>
                <p className="text-white font-medium">{invoice.invoiceNumber}</p>
                <p className="text-neutral-500 text-sm mt-1">{invoice.vendor?.name}</p>
              </div>
              <div className="text-right">
                <p className="text-neutral-400 text-sm">Amount Due</p>
                <p className="text-success font-semibold text-lg">Rs {remaining.toFixed(2)}</p>
                {previousPaid > 0 && (
                  <p className="text-neutral-500 text-sm">
                    (Paid: Rs {previousPaid.toFixed(2)} of Rs {totalAmount.toFixed(2)})
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-sm text-neutral-400 mb-2">Payment Method</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'CASH', label: 'Cash', icon: Banknote },
                { value: 'CHEQUE', label: 'Cheque', icon: FileText },
                { value: 'BANK_TRANSFER', label: 'Bank Transfer', icon: Building },
              ].map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => setPaymentMethod(value as DyeingPaymentMethod)}
                  className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-colors ${
                    paymentMethod === value
                      ? 'bg-primary-500/20 border-primary-500 text-primary-400'
                      : 'bg-factory-gray border-factory-border text-neutral-400 hover:border-neutral-500'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-sm">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm text-neutral-400 mb-1">
              Amount (Rs) <span className="text-error">*</span>
            </label>
            <Input
              type="number"
              value={paidAmount}
              onChange={(e) => setPaidAmount(e.target.value)}
              placeholder={`Enter amount (max: ${remaining.toFixed(2)})`}
              step="0.01"
              max={remaining}
            />
            {paidAmount && Number(paidAmount) < remaining && (
              <p className="text-warning text-sm mt-1">
                This is a partial payment. Remaining after: Rs {(remaining - Number(paidAmount)).toFixed(2)}
              </p>
            )}
          </div>

          {/* Cheque Details (if cheque selected) */}
          {paymentMethod === 'CHEQUE' && (
            <div className="space-y-4 p-4 bg-factory-gray rounded-xl">
              <p className="text-sm text-neutral-400 font-medium">Cheque Details</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-neutral-400 mb-1">
                    Cheque Number <span className="text-error">*</span>
                  </label>
                  <Input
                    value={chequeNumber}
                    onChange={(e) => setChequeNumber(e.target.value)}
                    placeholder="e.g., 123456"
                  />
                </div>
                <div>
                  <label className="block text-sm text-neutral-400 mb-1">
                    Cheque Date <span className="text-error">*</span>
                  </label>
                  <Input
                    type="date"
                    value={chequeDate}
                    onChange={(e) => setChequeDate(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-neutral-400 mb-1">Bank Name</label>
                <Input
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="e.g., HBL, MCB"
                />
              </div>
            </div>
          )}

          {/* Due Date */}
          <div>
            <label className="block text-sm text-neutral-400 mb-1">
              <Calendar className="w-4 h-4 inline mr-1" />
              Due Date (optional)
            </label>
            <Input
              type="date"
              value={paymentDueDate}
              onChange={(e) => setPaymentDueDate(e.target.value)}
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm text-neutral-400 mb-1">Notes (optional)</label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any payment notes..."
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-factory-border">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isProcessing || !paidAmount}
            isLoading={isProcessing}
          >
            <DollarSign className="w-4 h-4 mr-2" />
            Record Payment
          </Button>
        </div>
      </div>
    </div>
  );
}
