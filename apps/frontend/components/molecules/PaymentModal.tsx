'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils/cn';
import { Button } from '../atoms/Button';
import { PaymentMethod, PAYMENT_METHODS } from '@/lib/types/supplier';

export interface PaymentFormData {
  paymentDate: string;
  amount: number;
  paymentMethod: PaymentMethod;
  referenceNumber?: string;
  voucherNumber?: string;
  transactionRef?: string;
  bankName?: string;
  chequeNumber?: string;
  chequeDate?: string;
  notes?: string;
}

export interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: PaymentFormData) => Promise<void>;
  title?: string;
  partyName: string;
  partyType: 'vendor' | 'customer';
  currentBalance?: number;
  isLoading?: boolean;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function PaymentModal({
  isOpen,
  onClose,
  onSubmit,
  title,
  partyName,
  partyType,
  currentBalance = 0,
  isLoading = false,
}: PaymentModalProps) {
  const [formData, setFormData] = useState<PaymentFormData>({
    paymentDate: new Date().toISOString().split('T')[0],
    amount: 0,
    paymentMethod: 'CASH',
    referenceNumber: '',
    bankName: '',
    chequeNumber: '',
    chequeDate: '',
    notes: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      setFormData({
        paymentDate: new Date().toISOString().split('T')[0],
        amount: 0,
        paymentMethod: 'CASH',
        referenceNumber: '',
        bankName: '',
        chequeNumber: '',
        chequeDate: '',
        notes: '',
      });
      setErrors({});
    }
  }, [isOpen]);

  const selectedMethod = PAYMENT_METHODS[formData.paymentMethod];
  const isCheque = formData.paymentMethod === 'CHEQUE';

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.paymentDate) {
      newErrors.paymentDate = 'Payment date is required';
    }

    if (!formData.amount || formData.amount <= 0) {
      newErrors.amount = 'Valid amount is required';
    }

    if (selectedMethod.requiresReference && !formData.referenceNumber && !isCheque) {
      newErrors.referenceNumber = 'Reference number is required';
    }

    if (selectedMethod.requiresBank && !formData.bankName) {
      newErrors.bankName = 'Bank name is required';
    }

    if (isCheque) {
      if (!formData.chequeNumber) {
        newErrors.chequeNumber = 'Cheque number is required';
      }
      if (!formData.chequeDate) {
        newErrors.chequeDate = 'Cheque date is required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    await onSubmit(formData);
  };

  if (!isOpen) return null;

  const modalTitle = title || (partyType === 'vendor' ? 'Record Payment to Vendor' : 'Record Payment from Customer');
  const balanceLabel = partyType === 'vendor' ? 'Amount Owed' : 'Amount Due';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg mx-4 bg-factory-dark border border-factory-border rounded-2xl shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-factory-border">
          <div>
            <h2 className="text-lg font-semibold text-white">{modalTitle}</h2>
            <p className="text-sm text-neutral-400 mt-0.5">{partyName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white hover:bg-factory-gray rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Balance Info */}
        <div className="px-6 py-4 bg-factory-gray/50 border-b border-factory-border">
          <div className="flex items-center justify-between">
            <span className="text-sm text-neutral-400">{balanceLabel}</span>
            <span className={cn('text-lg font-semibold', currentBalance > 0 ? 'text-white' : 'text-green-400')}>
              {formatCurrency(Math.abs(currentBalance))}
              {currentBalance < 0 && ' CR'}
            </span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Payment Date */}
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1.5">
              Payment Date <span className="text-error">*</span>
            </label>
            <input
              type="date"
              value={formData.paymentDate}
              onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
              className={cn(
                'w-full px-4 py-2.5 bg-factory-gray border rounded-xl text-white',
                'focus:outline-none focus:ring-2 focus:ring-primary-500',
                errors.paymentDate ? 'border-error' : 'border-factory-border'
              )}
            />
            {errors.paymentDate && <p className="mt-1 text-xs text-error">{errors.paymentDate}</p>}
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1.5">
              Amount (PKR) <span className="text-error">*</span>
            </label>
            <input
              type="number"
              min="0"
              step="1"
              value={formData.amount || ''}
              onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
              placeholder="Enter amount"
              className={cn(
                'w-full px-4 py-2.5 bg-factory-gray border rounded-xl text-white',
                'focus:outline-none focus:ring-2 focus:ring-primary-500',
                errors.amount ? 'border-error' : 'border-factory-border'
              )}
            />
            {errors.amount && <p className="mt-1 text-xs text-error">{errors.amount}</p>}
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1.5">
              Payment Method <span className="text-error">*</span>
            </label>
            <select
              value={formData.paymentMethod}
              onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value as PaymentMethod })}
              className="w-full px-4 py-2.5 bg-factory-gray border border-factory-border rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {Object.values(PAYMENT_METHODS).map((method) => (
                <option key={method.code} value={method.code}>
                  {method.label}
                </option>
              ))}
            </select>
          </div>

          {/* Bank Name (if required) */}
          {selectedMethod.requiresBank && (
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                Bank Name <span className="text-error">*</span>
              </label>
              <input
                type="text"
                value={formData.bankName}
                onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                placeholder="Enter bank name"
                className={cn(
                  'w-full px-4 py-2.5 bg-factory-gray border rounded-xl text-white',
                  'focus:outline-none focus:ring-2 focus:ring-primary-500',
                  errors.bankName ? 'border-error' : 'border-factory-border'
                )}
              />
              {errors.bankName && <p className="mt-1 text-xs text-error">{errors.bankName}</p>}
            </div>
          )}

          {/* Cheque Fields */}
          {isCheque && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                    Cheque Number <span className="text-error">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.chequeNumber}
                    onChange={(e) => setFormData({ ...formData, chequeNumber: e.target.value })}
                    placeholder="e.g., 000123"
                    className={cn(
                      'w-full px-4 py-2.5 bg-factory-gray border rounded-xl text-white',
                      'focus:outline-none focus:ring-2 focus:ring-primary-500',
                      errors.chequeNumber ? 'border-error' : 'border-factory-border'
                    )}
                  />
                  {errors.chequeNumber && <p className="mt-1 text-xs text-error">{errors.chequeNumber}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                    Cheque Date <span className="text-error">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.chequeDate}
                    onChange={(e) => setFormData({ ...formData, chequeDate: e.target.value })}
                    className={cn(
                      'w-full px-4 py-2.5 bg-factory-gray border rounded-xl text-white',
                      'focus:outline-none focus:ring-2 focus:ring-primary-500',
                      errors.chequeDate ? 'border-error' : 'border-factory-border'
                    )}
                  />
                  {errors.chequeDate && <p className="mt-1 text-xs text-error">{errors.chequeDate}</p>}
                </div>
              </div>
            </>
          )}

          {/* Reference Number (for non-cheque methods) */}
          {selectedMethod.requiresReference && !isCheque && (
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                Reference/Transaction ID <span className="text-error">*</span>
              </label>
              <input
                type="text"
                value={formData.referenceNumber}
                onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                placeholder="Enter reference number"
                className={cn(
                  'w-full px-4 py-2.5 bg-factory-gray border rounded-xl text-white',
                  'focus:outline-none focus:ring-2 focus:ring-primary-500',
                  errors.referenceNumber ? 'border-error' : 'border-factory-border'
                )}
              />
              {errors.referenceNumber && <p className="mt-1 text-xs text-error">{errors.referenceNumber}</p>}
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1.5">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Optional notes..."
              rows={2}
              className="w-full px-4 py-2.5 bg-factory-gray border border-factory-border rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-factory-border">
            <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isLoading}>
              {partyType === 'vendor' ? 'Record Payment' : 'Record Receipt'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
