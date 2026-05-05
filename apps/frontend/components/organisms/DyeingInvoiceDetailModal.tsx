'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { useToast } from '@/contexts/ToastContext';
import { dyeingInvoicesApi } from '@/lib/api/dyeing-invoices';
import {
  DyeingInvoiceWithRelations,
  DyeingPricingType,
  UpdatePricingData,
} from '@/lib/types/dyeing-invoice';
import {
  X,
  FileText,
  Building2,
  Calendar,
  Scale,
  DollarSign,
  CheckCircle,
  AlertCircle,
  Clock,
  Printer,
} from 'lucide-react';

interface DyeingInvoiceDetailModalProps {
  invoiceId: number | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export function DyeingInvoiceDetailModal({
  invoiceId,
  isOpen,
  onClose,
  onUpdate,
}: DyeingInvoiceDetailModalProps) {
  const { showToast } = useToast();
  const [invoice, setInvoice] = useState<DyeingInvoiceWithRelations | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Pricing form state
  const [pricingType, setPricingType] = useState<DyeingPricingType>('RATE_PER_KG');
  const [ratePerKg, setRatePerKg] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (isOpen && invoiceId) {
      fetchInvoice();
    }
  }, [isOpen, invoiceId]);

  const fetchInvoice = async () => {
    if (!invoiceId) return;
    try {
      setIsLoading(true);
      const data = await dyeingInvoicesApi.getById(invoiceId);
      setInvoice(data);

      // Initialize form with existing values
      if (data.pricingType) {
        setPricingType(data.pricingType);
      }
      if (data.ratePerKg) {
        setRatePerKg(data.ratePerKg);
      }
      if (data.totalAmount) {
        setTotalAmount(data.totalAmount);
      }
      setNotes(data.notes || '');
    } catch (error: any) {
      showToast('error', error.response?.data?.error || 'Failed to load invoice');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateTotal = () => {
    if (pricingType === 'RATE_PER_KG' && ratePerKg) {
      const weight = Number(invoice?.totalReceivedWeight || invoice?.totalGreyWeight || 0);
      return (Number(ratePerKg) * weight).toFixed(2);
    }
    return totalAmount;
  };

  const handleSavePricing = async () => {
    if (!invoice) return;

    if (pricingType === 'RATE_PER_KG' && !ratePerKg) {
      showToast('error', 'Please enter rate per kg');
      return;
    }
    if (pricingType === 'TOTAL_AMOUNT' && !totalAmount) {
      showToast('error', 'Please enter total amount');
      return;
    }

    try {
      setIsSaving(true);
      const data: UpdatePricingData = {
        pricingType,
        ...(pricingType === 'RATE_PER_KG' && { ratePerKg: Number(ratePerKg) }),
        ...(pricingType === 'TOTAL_AMOUNT' && { totalAmount: Number(totalAmount) }),
        notes,
      };

      await dyeingInvoicesApi.updatePricing(invoice.id, data);
      showToast('success', 'Pricing updated successfully');
      onUpdate();
      fetchInvoice();
    } catch (error: any) {
      showToast('error', error.response?.data?.error || 'Failed to update pricing');
    } finally {
      setIsSaving(false);
    }
  };

  const handleApprove = async () => {
    if (!invoice) return;

    try {
      setIsSaving(true);
      await dyeingInvoicesApi.approve(invoice.id);
      showToast('success', 'Invoice approved successfully');
      onUpdate();
      fetchInvoice();
    } catch (error: any) {
      showToast('error', error.response?.data?.error || 'Failed to approve invoice');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      PENDING: 'bg-yellow-500/20 text-yellow-400',
      READY: 'bg-blue-500/20 text-blue-400',
      APPROVED: 'bg-green-500/20 text-green-400',
      PAID: 'bg-emerald-500/20 text-emerald-400',
      CANCELLED: 'bg-red-500/20 text-red-400',
    };
    return styles[status] || 'bg-neutral-500/20 text-neutral-400';
  };

  const formatDate = (date: string | undefined) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-factory-dark border border-factory-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-factory-border">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-primary-400" />
            <h2 className="text-lg font-semibold text-white">
              {invoice?.invoiceNumber || 'Invoice Details'}
            </h2>
            {invoice && (
              <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadge(invoice.status)}`}>
                {invoice.status}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white hover:bg-factory-gray rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
            </div>
          ) : invoice ? (
            <div className="space-y-6">
              {/* Order Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-factory-gray rounded-xl p-4">
                  <div className="flex items-center gap-2 text-neutral-400 text-sm mb-1">
                    <Building2 className="w-4 h-4" />
                    Vendor
                  </div>
                  <p className="text-white font-medium">{invoice.vendor?.name}</p>
                  <p className="text-neutral-500 text-sm">{invoice.vendor?.code}</p>
                </div>
                <div className="bg-factory-gray rounded-xl p-4">
                  <div className="flex items-center gap-2 text-neutral-400 text-sm mb-1">
                    <FileText className="w-4 h-4" />
                    Order
                  </div>
                  <p className="text-white font-medium">{invoice.dyeingOrder?.orderNumber}</p>
                  <p className="text-neutral-500 text-sm">{invoice.dyeingOrder?.status}</p>
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-factory-gray rounded-xl p-4">
                  <div className="flex items-center gap-2 text-neutral-400 text-sm mb-1">
                    <Calendar className="w-4 h-4" />
                    Sent Date
                  </div>
                  <p className="text-white">{formatDate(invoice.dyeingOrder?.sentAt)}</p>
                </div>
                <div className="bg-factory-gray rounded-xl p-4">
                  <div className="flex items-center gap-2 text-neutral-400 text-sm mb-1">
                    <Calendar className="w-4 h-4" />
                    Received Date
                  </div>
                  <p className="text-white">{formatDate(invoice.dyeingOrder?.receivedAt ?? undefined)}</p>
                </div>
              </div>

              {/* Weights */}
              <div className="bg-factory-gray rounded-xl p-4">
                <div className="flex items-center gap-2 text-neutral-400 text-sm mb-3">
                  <Scale className="w-4 h-4" />
                  Weight Details
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-neutral-500 text-sm">Grey Weight</p>
                    <p className="text-white font-medium">{Number(invoice.totalGreyWeight).toFixed(2)} kg</p>
                  </div>
                  <div>
                    <p className="text-neutral-500 text-sm">Received Weight</p>
                    <p className="text-white font-medium">
                      {invoice.totalReceivedWeight ? `${Number(invoice.totalReceivedWeight).toFixed(2)} kg` : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-neutral-500 text-sm">Shrinkage</p>
                    {invoice.totalReceivedWeight ? (
                      <p className="text-warning font-medium">
                        {(Number(invoice.totalGreyWeight) - Number(invoice.totalReceivedWeight)).toFixed(2)} kg
                        ({((1 - Number(invoice.totalReceivedWeight) / Number(invoice.totalGreyWeight)) * 100).toFixed(1)}%)
                      </p>
                    ) : (
                      <p className="text-neutral-500">-</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Pricing Section (only for READY status) */}
              {invoice.status === 'READY' && (
                <div className="bg-primary-500/10 border border-primary-500/30 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-primary-400 text-sm mb-4">
                    <DollarSign className="w-4 h-4" />
                    Enter Pricing
                  </div>

                  {/* Pricing Type Selection */}
                  <div className="flex gap-4 mb-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="pricingType"
                        checked={pricingType === 'RATE_PER_KG'}
                        onChange={() => setPricingType('RATE_PER_KG')}
                        className="w-4 h-4 text-primary-500"
                      />
                      <span className="text-white">Rate per KG</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="pricingType"
                        checked={pricingType === 'TOTAL_AMOUNT'}
                        onChange={() => setPricingType('TOTAL_AMOUNT')}
                        className="w-4 h-4 text-primary-500"
                      />
                      <span className="text-white">Total Amount</span>
                    </label>
                  </div>

                  {/* Pricing Input */}
                  {pricingType === 'RATE_PER_KG' ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-neutral-400 mb-1">Rate per KG (Rs)</label>
                        <Input
                          type="number"
                          value={ratePerKg}
                          onChange={(e) => setRatePerKg(e.target.value)}
                          placeholder="e.g., 100"
                          step="0.01"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-neutral-400 mb-1">Calculated Total</label>
                        <div className="bg-factory-gray rounded-xl px-4 py-2.5 text-white font-medium">
                          Rs {calculateTotal() || '-'}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm text-neutral-400 mb-1">Total Amount (Rs)</label>
                      <Input
                        type="number"
                        value={totalAmount}
                        onChange={(e) => setTotalAmount(e.target.value)}
                        placeholder="e.g., 5000"
                        step="0.01"
                      />
                    </div>
                  )}

                  <div className="mt-4">
                    <label className="block text-sm text-neutral-400 mb-1">Notes (optional)</label>
                    <Input
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Any pricing notes..."
                    />
                  </div>

                  <div className="flex gap-3 mt-4">
                    <Button
                      variant="secondary"
                      onClick={handleSavePricing}
                      disabled={isSaving}
                    >
                      Save Pricing
                    </Button>
                    <Button
                      onClick={async () => {
                        await handleSavePricing();
                        await handleApprove();
                      }}
                      disabled={isSaving || (!ratePerKg && !totalAmount)}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Save & Approve
                    </Button>
                  </div>
                </div>
              )}

              {/* Show Pricing Summary for APPROVED/PAID */}
              {(invoice.status === 'APPROVED' || invoice.status === 'PAID') && invoice.totalAmount && (
                <div className="bg-factory-gray rounded-xl p-4">
                  <div className="flex items-center gap-2 text-neutral-400 text-sm mb-3">
                    <DollarSign className="w-4 h-4" />
                    Pricing Details
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-neutral-500 text-sm">Pricing Type</p>
                      <p className="text-white font-medium">
                        {invoice.pricingType === 'RATE_PER_KG' ? 'Rate per KG' : 'Total Amount'}
                      </p>
                    </div>
                    {invoice.ratePerKg && (
                      <div>
                        <p className="text-neutral-500 text-sm">Rate per KG</p>
                        <p className="text-white font-medium">Rs {Number(invoice.ratePerKg).toFixed(2)}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-neutral-500 text-sm">Total Amount</p>
                      <p className="text-success font-medium text-lg">Rs {Number(invoice.totalAmount).toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-neutral-500 text-sm">Payment Status</p>
                      <p className={`font-medium ${
                        invoice.paymentStatus === 'PAID' ? 'text-success' :
                        invoice.paymentStatus === 'PARTIAL' ? 'text-warning' :
                        'text-error'
                      }`}>
                        {invoice.paymentStatus}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Status Message */}
              {invoice.status === 'PENDING' && (
                <div className="flex items-center gap-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
                  <Clock className="w-5 h-5 text-yellow-400" />
                  <div>
                    <p className="text-yellow-400 font-medium">Awaiting Fabric Receipt</p>
                    <p className="text-neutral-400 text-sm">
                      Pricing can be entered once the fabric is received from dyeing.
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-neutral-400">
              Invoice not found
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-factory-border">
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          {invoice && invoice.status !== 'PENDING' && (
            <Button variant="secondary">
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
