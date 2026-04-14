'use client';

import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { StatsCard } from '@/components/molecules/StatsCard';
import { useToast } from '@/contexts/ToastContext';
import {
  PayOrder,
  PayOrderItem,
  PayOrderVerification,
  PayOrderShortage,
  PayOrderStatus,
  PAY_ORDER_STATUSES,
  SHORTAGE_TYPES,
  SHORTAGE_RESOLUTIONS,
  ShortageType,
  ShortageResolution,
  PricingType,
  PRICING_TYPES,
  calculateItemAmount,
} from '@/lib/types/pay-order';
import { formatPKR, VendorLedgerEntry } from '@/lib/types/vendor';

// Tab types
type TabId = 'details' | 'approval' | 'verification' | 'shortages';

// Mock pay order data
const mockPayOrder: PayOrder = {
  id: '2',
  orderNumber: 'PO-2024-0002',
  vendorId: '2',
  vendorName: 'Yarn Masters',
  vendorCode: 'VND-002',
  orderDate: '2024-01-18',
  expectedDeliveryDate: '2024-01-25',
  receivedDate: '2024-01-24',
  items: [
    {
      id: '2-1',
      payOrderId: '2',
      yarnTypeId: '3',
      yarnTypeName: 'Polyester 150D',
      yarnTypeCode: 'POL-150D',
      orderedQuantity: 1000,
      unit: 'kg',
      receivedQuantity: 950,
      shortageQuantity: 50,
    },
  ],
  totalQuantity: 1000,
  status: 'PENDING_FINANCE', // Changed to show approval workflow
  terms: 'Delivery at factory gate',
  notes: 'Urgent requirement for production',
  createdBy: 'Store Manager',
  createdAt: '2024-01-18',
  updatedAt: '2024-01-24',
};

// Mock verification data
const mockVerification: PayOrderVerification | null = null;

// Mock shortages
const mockShortages: PayOrderShortage[] = [];

export default function PayOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const payOrderId = params.id as string;

  const [activeTab, setActiveTab] = useState<TabId>('details');
  const [isVerifying, setIsVerifying] = useState(false);
  const [showVerificationForm, setShowVerificationForm] = useState(false);
  const [showShortageForm, setShowShortageForm] = useState(false);

  // Verification form state
  const [verificationData, setVerificationData] = useState({
    receivedChallanNumber: '',
    verifiedDate: new Date().toISOString().split('T')[0],
    notes: '',
    items: mockPayOrder.items.map((item) => ({
      payOrderItemId: item.id,
      receivedQuantity: item.receivedQuantity || item.orderedQuantity,
      qualityStatus: 'APPROVED' as const,
      acceptedQuantity: item.receivedQuantity || item.orderedQuantity,
      qualityNotes: '',
    })),
  });

  // Shortage form state
  const [shortageData, setShortageData] = useState({
    payOrderItemId: '',
    shortageType: 'QUANTITY_SHORT' as ShortageType,
    description: '',
    expectedQuantity: 0,
    actualQuantity: 0,
    shortageAmount: 0,
  });

  const [shortages, setShortages] = useState<PayOrderShortage[]>(mockShortages);

  // In real app, fetch data based on payOrderId
  const payOrder = mockPayOrder;

  // Calculate variance for each item
  const calculateItemVariance = (item: PayOrderItem) => {
    const received = verificationData.items.find(
      (v) => v.payOrderItemId === item.id
    )?.receivedQuantity || 0;
    const variance = received - item.orderedQuantity;
    const variancePercent = ((variance / item.orderedQuantity) * 100).toFixed(1);

    return { variance, variancePercent };
  };

  // Handle Finance approval
  const handleFinanceApproval = (approved: boolean, reason?: string) => {
    if (approved) {
      showToast('success', 'Pay Order approved by Finance. Sent to Admin for approval.');
      // Update status to PENDING_ADMIN
    } else {
      showToast('error', 'Pay Order rejected by Finance.');
      // Update status to REJECTED
    }
  };

  // Handle Admin approval
  const handleAdminApproval = (approved: boolean, reason?: string) => {
    if (approved) {
      showToast('success', 'Pay Order approved! Ready to send to vendor.');
      // Update status to APPROVED
    } else {
      showToast('error', 'Pay Order rejected by Admin.');
      // Update status to REJECTED
    }
  };

  // Handle send to vendor
  const handleSendToVendor = () => {
    showToast('success', 'Pay Order sent to vendor.');
    // Update status to SENT
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-PK', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Get status badge
  const getStatusBadge = (status: PayOrderStatus) => {
    const statusInfo = PAY_ORDER_STATUSES[status];
    const colorClasses: Record<string, string> = {
      neutral: 'bg-neutral-500/20 text-neutral-400',
      info: 'bg-blue-500/20 text-blue-400',
      warning: 'bg-warning/20 text-warning',
      success: 'bg-success/20 text-success',
      error: 'bg-error/20 text-error',
    };

    return (
      <span className={`px-3 py-1.5 text-sm font-medium rounded-full ${colorClasses[statusInfo.color]}`}>
        {statusInfo.label}
      </span>
    );
  };

  // Handle mark as received
  const handleMarkReceived = () => {
    showToast('success', 'Pay order marked as received');
    // Update status to RECEIVED
  };

  // Handle verification submit
  const handleVerificationSubmit = () => {
    setIsVerifying(true);

    // Calculate total received
    const totalReceived = verificationData.items.reduce(
      (sum, item) => sum + item.receivedQuantity,
      0
    );

    // Check for shortages
    const totalOrdered = payOrder.items.reduce(
      (sum, item) => sum + item.orderedQuantity,
      0
    );

    if (totalReceived < totalOrdered) {
      // Auto-add shortage if not already added
      const diff = totalOrdered - totalReceived;
      if (shortages.length === 0) {
        setShortages([
          {
            id: '1',
            verificationId: '1',
            shortageType: 'QUANTITY_SHORT',
            description: `Short by ${diff} kg`,
            expectedQuantity: totalOrdered,
            actualQuantity: totalReceived,
            shortageQuantity: diff,
            resolution: 'PENDING',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ]);
      }
    }

    setTimeout(() => {
      setIsVerifying(false);
      showToast('success', 'Verification completed successfully');
      setShowVerificationForm(false);
    }, 1000);
  };

  // Handle add shortage
  const handleAddShortage = () => {
    const newShortage: PayOrderShortage = {
      id: String(shortages.length + 1),
      verificationId: '1',
      payOrderItemId: shortageData.payOrderItemId,
      shortageType: shortageData.shortageType,
      description: shortageData.description,
      expectedQuantity: shortageData.expectedQuantity,
      actualQuantity: shortageData.actualQuantity,
      shortageQuantity: shortageData.expectedQuantity - shortageData.actualQuantity,
      shortageAmount: shortageData.shortageAmount,
      resolution: 'PENDING',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setShortages([...shortages, newShortage]);
    setShowShortageForm(false);
    setShortageData({
      payOrderItemId: '',
      shortageType: 'QUANTITY_SHORT',
      description: '',
      expectedQuantity: 0,
      actualQuantity: 0,
      shortageAmount: 0,
    });
    showToast('success', 'Shortage recorded');
  };

  // Handle resolve shortage
  const handleResolveShortage = (shortageId: string, resolution: ShortageResolution) => {
    setShortages(
      shortages.map((s) =>
        s.id === shortageId
          ? { ...s, resolution, resolutionDate: new Date().toISOString() }
          : s
      )
    );
    showToast('success', `Shortage marked as ${SHORTAGE_RESOLUTIONS[resolution].label}`);
  };

  // Check if can proceed to inward
  const canProceedToInward = useMemo(() => {
    const pendingShortages = shortages.filter((s) => s.resolution === 'PENDING');
    return pendingShortages.length === 0;
  }, [shortages]);

  // Tab content
  const DetailsTab = () => (
    <div className="space-y-6">
      {/* Order Info */}
      <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Order Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <p className="text-sm text-neutral-400">Vendor</p>
              <p className="text-white font-medium">{payOrder.vendorName}</p>
              <p className="text-sm text-neutral-400">{payOrder.vendorCode}</p>
            </div>
            <div>
              <p className="text-sm text-neutral-400">Order Date</p>
              <p className="text-white">{formatDate(payOrder.orderDate)}</p>
            </div>
            <div>
              <p className="text-sm text-neutral-400">Expected Delivery</p>
              <p className="text-white">
                {payOrder.expectedDeliveryDate
                  ? formatDate(payOrder.expectedDeliveryDate)
                  : 'Not specified'}
              </p>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-neutral-400">Total Quantity</p>
              <p className="text-white font-medium">
                {payOrder.totalQuantity.toLocaleString()} kg
              </p>
            </div>
            <div>
              <p className="text-sm text-neutral-400">Created By</p>
              <p className="text-white">{payOrder.createdBy || 'System'}</p>
            </div>
            {payOrder.receivedDate && (
              <div>
                <p className="text-sm text-neutral-400">Received Date</p>
                <p className="text-white">{formatDate(payOrder.receivedDate)}</p>
              </div>
            )}
          </div>
        </div>
        {payOrder.terms && (
          <div className="mt-4 pt-4 border-t border-factory-border">
            <p className="text-sm text-neutral-400">Delivery Terms</p>
            <p className="text-white mt-1">{payOrder.terms}</p>
          </div>
        )}
        {payOrder.notes && (
          <div className="mt-4">
            <p className="text-sm text-neutral-400">Notes</p>
            <p className="text-white mt-1">{payOrder.notes}</p>
          </div>
        )}
      </div>

      {/* Order Items */}
      <div className="bg-factory-dark rounded-2xl border border-factory-border overflow-hidden">
        <div className="p-6 border-b border-factory-border">
          <h3 className="text-lg font-semibold text-white">Order Items</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-factory-border">
                <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">
                  Yarn Type
                </th>
                <th className="text-right px-6 py-4 text-sm font-medium text-neutral-400">
                  Ordered Qty
                </th>
                <th className="text-right px-6 py-4 text-sm font-medium text-neutral-400">
                  Unit
                </th>
                <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">
                  Notes
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-factory-border">
              {payOrder.items.map((item) => (
                <tr key={item.id}>
                  <td className="px-6 py-4">
                    <p className="text-white font-medium">{item.yarnTypeName}</p>
                    <p className="text-sm text-neutral-400">{item.yarnTypeCode}</p>
                  </td>
                  <td className="px-6 py-4 text-right text-white font-medium">
                    {item.orderedQuantity.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-right text-neutral-300">
                    {item.unit || 'kg'}
                  </td>
                  <td className="px-6 py-4 text-neutral-400">
                    {item.notes || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-factory-border bg-factory-gray">
                <td className="px-6 py-4 text-white font-semibold">Total</td>
                <td className="px-6 py-4 text-right text-primary-400 font-semibold">
                  {payOrder.totalQuantity.toLocaleString()}
                </td>
                <td className="px-6 py-4 text-right text-neutral-300">kg</td>
                <td className="px-6 py-4"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );

  // Approval Tab
  const ApprovalTab = () => {
    const [rejectionReason, setRejectionReason] = useState('');
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectType, setRejectType] = useState<'finance' | 'admin'>('finance');

    // Flexible pricing state for Finance approval
    interface ItemPricingState {
      pricingType: PricingType;
      ratePerUnit: number;      // For PER_KG
      ratePerBox: number;       // For PER_BOX
      kgPerBox: number;         // For PER_BOX
      numberOfBoxes: number;    // For PER_BOX
      fixedAmount: number;      // For FIXED
    }

    const [itemPricing, setItemPricing] = useState<Record<string, ItemPricingState>>(
      () => {
        const initial: Record<string, ItemPricingState> = {};
        payOrder.items.forEach((item) => {
          initial[item.id] = {
            pricingType: item.pricingType || 'PER_KG',
            ratePerUnit: item.ratePerUnit || 0,
            ratePerBox: item.ratePerBox || 0,
            kgPerBox: item.kgPerBox || 0,
            numberOfBoxes: item.numberOfBoxes || 0,
            fixedAmount: item.totalAmount || 0,
          };
        });
        return initial;
      }
    );

    const isFinancePending = payOrder.status === 'PENDING_FINANCE';
    const isAdminPending = payOrder.status === 'PENDING_ADMIN';
    const isApproved = payOrder.status === 'APPROVED';
    const isRejected = payOrder.status === 'REJECTED';
    const isSent = ['SENT', 'PARTIALLY_RECEIVED', 'RECEIVED', 'VERIFIED', 'COMPLETED'].includes(payOrder.status);

    // Calculate item total based on pricing type
    const calculateItemTotal = (itemId: string, orderedQuantity: number): number => {
      const pricing = itemPricing[itemId];
      if (!pricing) return 0;

      switch (pricing.pricingType) {
        case 'PER_KG':
          return orderedQuantity * (pricing.ratePerUnit || 0);
        case 'PER_BOX':
          return (pricing.numberOfBoxes || 0) * (pricing.ratePerBox || 0);
        case 'FIXED':
          return pricing.fixedAmount || 0;
        default:
          return 0;
      }
    };

    // Calculate grand total from all items
    const calculateGrandTotal = (): number => {
      return payOrder.items.reduce((total, item) => {
        return total + calculateItemTotal(item.id, item.orderedQuantity);
      }, 0);
    };

    // Validate if pricing is complete for an item
    const isItemPricingValid = (itemId: string): boolean => {
      const pricing = itemPricing[itemId];
      if (!pricing) return false;

      switch (pricing.pricingType) {
        case 'PER_KG':
          return pricing.ratePerUnit > 0;
        case 'PER_BOX':
          return pricing.numberOfBoxes > 0 && pricing.ratePerBox > 0;
        case 'FIXED':
          return pricing.fixedAmount > 0;
        default:
          return false;
      }
    };

    const grandTotal = calculateGrandTotal();
    const allPricesEntered = payOrder.items.every((item) => isItemPricingValid(item.id));

    // Update pricing type for an item
    const updatePricingType = (itemId: string, pricingType: PricingType) => {
      setItemPricing({
        ...itemPricing,
        [itemId]: {
          ...itemPricing[itemId],
          pricingType,
        },
      });
    };

    // Update pricing field for an item
    const updatePricingField = (itemId: string, field: keyof ItemPricingState, value: number) => {
      setItemPricing({
        ...itemPricing,
        [itemId]: {
          ...itemPricing[itemId],
          [field]: value,
        },
      });
    };

    // Handle Finance approval with flexible pricing
    const handleFinanceApproveWithPricing = () => {
      if (!allPricesEntered) {
        showToast('error', 'Please complete pricing for all items');
        return;
      }

      // Prepare items with pricing data
      const pricedItems = payOrder.items.map((item) => {
        const pricing = itemPricing[item.id];
        return {
          ...item,
          pricingType: pricing.pricingType,
          ratePerUnit: pricing.pricingType === 'PER_KG' ? pricing.ratePerUnit : undefined,
          ratePerBox: pricing.pricingType === 'PER_BOX' ? pricing.ratePerBox : undefined,
          kgPerBox: pricing.pricingType === 'PER_BOX' ? pricing.kgPerBox : undefined,
          numberOfBoxes: pricing.pricingType === 'PER_BOX' ? pricing.numberOfBoxes : undefined,
          totalAmount: calculateItemTotal(item.id, item.orderedQuantity),
        };
      });

      // TODO: API call to save pricing

      showToast('success', `Pay Order approved by Finance with total ${formatPKR(grandTotal)}. Sent to Admin for approval.`);
      // Update status to PENDING_ADMIN and save pricing
    };

    // Handle Admin approval with ledger entry
    const handleAdminApproveWithLedger = () => {
      // Create ledger entry for vendor
      const ledgerEntry: Omit<VendorLedgerEntry, 'balance'> = {
        id: `ledger-${Date.now()}`,
        vendorId: payOrder.vendorId,
        entryDate: new Date().toISOString().split('T')[0],
        entryType: 'PURCHASE',
        debit: payOrder.totalAmount || grandTotal,
        credit: 0,
        referenceType: 'PAY_ORDER',
        referenceId: payOrder.id,
        referenceNumber: payOrder.orderNumber,
        description: `Pay Order ${payOrder.orderNumber} - ${payOrder.items.map(i => `${i.yarnTypeName} ${i.orderedQuantity}kg`).join(', ')}`,
        createdAt: new Date().toISOString(),
      };

      // TODO: API call to save ledger entry

      showToast('success', `Pay Order approved! Transaction of ${formatPKR(payOrder.totalAmount || grandTotal)} recorded in ${payOrder.vendorName}'s ledger.`);
      // Update status to APPROVED
    };

    return (
      <div className="space-y-6">
        {/* Approval Status Timeline */}
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
          <h3 className="text-lg font-semibold text-white mb-6">Approval Workflow</h3>

          <div className="relative">
            {/* Timeline */}
            <div className="flex items-center justify-between">
              {/* Step 1: Submitted */}
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-success flex items-center justify-center">
                  <span className="text-white text-lg">✓</span>
                </div>
                <p className="mt-2 text-sm text-white font-medium">Submitted</p>
                <p className="text-xs text-neutral-400">{formatDate(payOrder.createdAt)}</p>
              </div>

              {/* Line */}
              <div className={`flex-1 h-0.5 mx-2 ${isFinancePending ? 'bg-factory-border' : (isRejected && !payOrder.financeApprovedAt ? 'bg-error' : 'bg-success')}`} />

              {/* Step 2: Finance */}
              <div className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  isFinancePending ? 'bg-warning' :
                  (isRejected && !payOrder.financeApprovedAt ? 'bg-error' : 'bg-success')
                }`}>
                  {isFinancePending ? (
                    <span className="text-factory-dark text-lg">⏳</span>
                  ) : (isRejected && !payOrder.financeApprovedAt) ? (
                    <span className="text-white text-lg">✗</span>
                  ) : (
                    <span className="text-white text-lg">✓</span>
                  )}
                </div>
                <p className="mt-2 text-sm text-white font-medium">Finance</p>
                <p className="text-xs text-neutral-400">
                  {isFinancePending ? 'Pending' :
                   (payOrder.financeApprovedAt ? formatDate(payOrder.financeApprovedAt) : 'Rejected')}
                </p>
              </div>

              {/* Line */}
              <div className={`flex-1 h-0.5 mx-2 ${
                isFinancePending ? 'bg-factory-border' :
                isAdminPending ? 'bg-factory-border' :
                (isRejected && payOrder.financeApprovedAt ? 'bg-error' :
                 (isApproved || isSent) ? 'bg-success' : 'bg-factory-border')
              }`} />

              {/* Step 3: Admin */}
              <div className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  isAdminPending ? 'bg-warning' :
                  (isRejected && payOrder.financeApprovedAt ? 'bg-error' :
                   (isApproved || isSent) ? 'bg-success' : 'bg-factory-border')
                }`}>
                  {isAdminPending ? (
                    <span className="text-factory-dark text-lg">⏳</span>
                  ) : (isRejected && payOrder.financeApprovedAt) ? (
                    <span className="text-white text-lg">✗</span>
                  ) : (isApproved || isSent) ? (
                    <span className="text-white text-lg">✓</span>
                  ) : (
                    <span className="text-neutral-500">3</span>
                  )}
                </div>
                <p className="mt-2 text-sm text-white font-medium">Admin</p>
                <p className="text-xs text-neutral-400">
                  {isAdminPending ? 'Pending' :
                   (payOrder.adminApprovedAt ? formatDate(payOrder.adminApprovedAt) :
                    (isRejected && payOrder.financeApprovedAt ? 'Rejected' : 'Waiting'))}
                </p>
              </div>

              {/* Line */}
              <div className={`flex-1 h-0.5 mx-2 ${(isApproved || isSent) ? 'bg-success' : 'bg-factory-border'}`} />

              {/* Step 4: Ready/Sent */}
              <div className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  (isApproved || isSent) ? 'bg-success' : 'bg-factory-border'
                }`}>
                  {(isApproved || isSent) ? (
                    <span className="text-white text-lg">✓</span>
                  ) : (
                    <span className="text-neutral-500">4</span>
                  )}
                </div>
                <p className="mt-2 text-sm text-white font-medium">
                  {isSent ? 'Sent' : 'Ready'}
                </p>
                <p className="text-xs text-neutral-400">
                  {isSent ? 'To Vendor' : (isApproved ? 'To Send' : 'Waiting')}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Rejection Reason */}
        {isRejected && (payOrder.financeRejectionReason || payOrder.adminRejectionReason) && (
          <div className="bg-error/10 border border-error/30 rounded-2xl p-6">
            <h4 className="text-error font-medium mb-2">Rejection Reason</h4>
            <p className="text-neutral-300">
              {payOrder.adminRejectionReason || payOrder.financeRejectionReason}
            </p>
          </div>
        )}

        {/* Finance Approval Actions - Enter Flexible Pricing */}
        {isFinancePending && (
          <div className="bg-warning/10 border border-warning/30 rounded-2xl p-6">
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-warning">Finance Review - Enter Pricing</h4>
              <p className="text-neutral-300 mt-1">
                Select pricing type and enter values for each item before approving.
              </p>
            </div>

            {/* Flexible Pricing Cards */}
            <div className="space-y-4 mb-6">
              {payOrder.items.map((item) => {
                const pricing = itemPricing[item.id] || { pricingType: 'PER_KG', ratePerUnit: 0, ratePerBox: 0, kgPerBox: 0, numberOfBoxes: 0, fixedAmount: 0 };
                const itemTotal = calculateItemTotal(item.id, item.orderedQuantity);
                const isValid = isItemPricingValid(item.id);

                return (
                  <div key={item.id} className="bg-factory-dark rounded-xl border border-factory-border p-4">
                    {/* Item Header */}
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="text-white font-medium">{item.yarnTypeName}</p>
                        <p className="text-sm text-neutral-400">{item.yarnTypeCode}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-neutral-400">Ordered Quantity</p>
                        <p className="text-white font-medium">{item.orderedQuantity.toLocaleString()} {item.unit || 'kg'}</p>
                      </div>
                    </div>

                    {/* Pricing Type Selector */}
                    <div className="mb-4">
                      <p className="text-sm text-neutral-400 mb-2">Pricing Type</p>
                      <div className="flex gap-2">
                        {(['PER_KG', 'PER_BOX', 'FIXED'] as PricingType[]).map((type) => (
                          <button
                            key={type}
                            onClick={() => updatePricingType(item.id, type)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                              pricing.pricingType === type
                                ? 'bg-primary-500 text-white'
                                : 'bg-factory-gray border border-factory-border text-neutral-300 hover:text-white hover:border-primary-500/50'
                            }`}
                          >
                            {PRICING_TYPES[type].label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Dynamic Input Fields Based on Pricing Type */}
                    <div className="mb-4">
                      {pricing.pricingType === 'PER_KG' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm text-neutral-400 mb-1">Rate per KG (PKR)</label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="0"
                              value={pricing.ratePerUnit || ''}
                              onChange={(e) => updatePricingField(item.id, 'ratePerUnit', Number(e.target.value))}
                              className="w-full px-3 py-2 rounded-lg bg-factory-gray border border-factory-border text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                          </div>
                          <div className="flex items-end">
                            <p className="text-neutral-400 text-sm">
                              {pricing.ratePerUnit > 0 && (
                                <>Calculation: {item.orderedQuantity.toLocaleString()} kg × {formatPKR(pricing.ratePerUnit)}</>
                              )}
                            </p>
                          </div>
                        </div>
                      )}

                      {pricing.pricingType === 'PER_BOX' && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm text-neutral-400 mb-1">Number of Boxes</label>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              placeholder="0"
                              value={pricing.numberOfBoxes || ''}
                              onChange={(e) => updatePricingField(item.id, 'numberOfBoxes', Number(e.target.value))}
                              className="w-full px-3 py-2 rounded-lg bg-factory-gray border border-factory-border text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm text-neutral-400 mb-1">KG per Box</label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="0"
                              value={pricing.kgPerBox || ''}
                              onChange={(e) => updatePricingField(item.id, 'kgPerBox', Number(e.target.value))}
                              className="w-full px-3 py-2 rounded-lg bg-factory-gray border border-factory-border text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm text-neutral-400 mb-1">Rate per Box (PKR)</label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="0"
                              value={pricing.ratePerBox || ''}
                              onChange={(e) => updatePricingField(item.id, 'ratePerBox', Number(e.target.value))}
                              className="w-full px-3 py-2 rounded-lg bg-factory-gray border border-factory-border text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                          </div>
                        </div>
                      )}

                      {pricing.pricingType === 'FIXED' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm text-neutral-400 mb-1">Fixed Total Amount (PKR)</label>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              placeholder="0"
                              value={pricing.fixedAmount || ''}
                              onChange={(e) => updatePricingField(item.id, 'fixedAmount', Number(e.target.value))}
                              className="w-full px-3 py-2 rounded-lg bg-factory-gray border border-factory-border text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                          </div>
                          <div className="flex items-end">
                            <p className="text-neutral-400 text-sm">
                              Enter the total amount directly without calculation
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Item Total */}
                    <div className="flex justify-between items-center pt-4 border-t border-factory-border">
                      <span className="text-neutral-400">Item Total</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-lg font-bold ${isValid ? 'text-primary-400' : 'text-neutral-500'}`}>
                          {isValid ? formatPKR(itemTotal) : 'Enter pricing'}
                        </span>
                        {isValid && <span className="text-success">✓</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Grand Total */}
            <div className="bg-factory-dark rounded-xl border border-factory-border p-4 mb-6">
              <div className="flex justify-between items-center">
                <span className="text-white font-semibold text-lg">Grand Total</span>
                <span className={`text-2xl font-bold ${allPricesEntered ? 'text-primary-400' : 'text-neutral-500'}`}>
                  {allPricesEntered ? formatPKR(grandTotal) : 'Complete all pricing'}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3">
              <Button
                variant="ghost"
                onClick={() => {
                  setRejectType('finance');
                  setShowRejectModal(true);
                }}
              >
                Reject
              </Button>
              <Button
                onClick={handleFinanceApproveWithPricing}
                disabled={!allPricesEntered}
              >
                Approve with Pricing
              </Button>
            </div>
          </div>
        )}

        {/* Admin Approval Actions - Review Pricing */}
        {isAdminPending && (
          <div className="bg-warning/10 border border-warning/30 rounded-2xl p-6">
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-warning">Admin Approval Required</h4>
              <p className="text-neutral-300 mt-1">
                Finance has approved the pricing. Review and give final approval to record in vendor ledger.
              </p>
            </div>

            {/* Pricing Summary (Read-only) */}
            <div className="space-y-3 mb-6">
              {payOrder.items.map((item) => {
                const pricingType = item.pricingType || 'PER_KG';
                const amount = item.totalAmount || calculateItemTotal(item.id, item.orderedQuantity);

                return (
                  <div key={item.id} className="bg-factory-dark rounded-xl border border-factory-border p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="text-white font-medium">{item.yarnTypeName}</p>
                        <p className="text-sm text-neutral-400">{item.yarnTypeCode}</p>
                      </div>
                      <span className="px-2 py-1 text-xs rounded-full bg-primary-500/20 text-primary-400">
                        {PRICING_TYPES[pricingType].label}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-neutral-400">
                        {pricingType === 'PER_KG' && `${item.orderedQuantity.toLocaleString()} kg × ${formatPKR(item.ratePerUnit || 0)}`}
                        {pricingType === 'PER_BOX' && `${item.numberOfBoxes || 0} boxes × ${formatPKR(item.ratePerBox || 0)}`}
                        {pricingType === 'FIXED' && 'Fixed Amount'}
                      </span>
                      <span className="text-primary-400 font-medium">
                        {formatPKR(amount)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Grand Total */}
            <div className="bg-factory-dark rounded-xl border border-factory-border p-4 mb-6">
              <div className="flex justify-between items-center">
                <span className="text-white font-semibold text-lg">Total Amount</span>
                <span className="text-2xl font-bold text-primary-400">
                  {formatPKR(payOrder.totalAmount || grandTotal)}
                </span>
              </div>
            </div>

            {/* Ledger Info */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mb-6">
              <p className="text-blue-400 text-sm">
                <strong>Note:</strong> Upon approval, a PURCHASE entry of {formatPKR(payOrder.totalAmount || grandTotal)} will be automatically recorded in {payOrder.vendorName}&apos;s financial ledger.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3">
              <Button
                variant="ghost"
                onClick={() => {
                  setRejectType('admin');
                  setShowRejectModal(true);
                }}
              >
                Reject
              </Button>
              <Button onClick={handleAdminApproveWithLedger}>
                Approve & Record in Ledger
              </Button>
            </div>
          </div>
        )}

        {/* Send to Vendor */}
        {isApproved && (
          <div className="bg-success/10 border border-success/30 rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-lg font-semibold text-success">Approved - Ready to Send</h4>
                <p className="text-neutral-300 mt-1">
                  This pay order has been approved. You can now send it to the vendor.
                </p>
              </div>
              <Button onClick={handleSendToVendor}>
                Send to Vendor
              </Button>
            </div>
          </div>
        )}

        {/* Rejection Modal */}
        {showRejectModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-factory-dark rounded-2xl border border-factory-border p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-white mb-4">
                Reject Pay Order
              </h3>
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                  Reason for Rejection *
                </label>
                <textarea
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Enter reason for rejection..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <Button variant="secondary" onClick={() => setShowRejectModal(false)}>
                  Cancel
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    if (rejectType === 'finance') {
                      handleFinanceApproval(false, rejectionReason);
                    } else {
                      handleAdminApproval(false, rejectionReason);
                    }
                    setShowRejectModal(false);
                    setRejectionReason('');
                  }}
                  disabled={!rejectionReason.trim()}
                >
                  Reject
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const VerificationTab = () => (
    <div className="space-y-6">
      {payOrder.status === 'SENT' && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-blue-400">
                Awaiting Delivery
              </h3>
              <p className="text-neutral-300 mt-1">
                Material has not been received yet. Mark as received when material arrives.
              </p>
            </div>
            <Button onClick={handleMarkReceived}>Mark as Received</Button>
          </div>
        </div>
      )}

      {payOrder.status === 'RECEIVED' && !showVerificationForm && (
        <div className="bg-warning/10 border border-warning/30 rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-warning">
                Pending Verification
              </h3>
              <p className="text-neutral-300 mt-1">
                Material received on {formatDate(payOrder.receivedDate!)}. Please verify
                the quantity and quality.
              </p>
            </div>
            <Button onClick={() => setShowVerificationForm(true)}>
              Start Verification
            </Button>
          </div>
        </div>
      )}

      {showVerificationForm && (
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            Verify Received Material
          </h3>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Vendor Challan/Invoice Number"
                placeholder="Enter challan number"
                value={verificationData.receivedChallanNumber}
                onChange={(e) =>
                  setVerificationData({
                    ...verificationData,
                    receivedChallanNumber: e.target.value,
                  })
                }
              />
              <Input
                label="Verification Date"
                type="date"
                value={verificationData.verifiedDate}
                onChange={(e) =>
                  setVerificationData({
                    ...verificationData,
                    verifiedDate: e.target.value,
                  })
                }
              />
            </div>

            {/* Items Verification */}
            <div className="mt-6">
              <h4 className="text-sm font-medium text-neutral-300 mb-3">
                Verify Each Item
              </h4>

              {payOrder.items.map((item, index) => {
                const { variance, variancePercent } =
                  calculateItemVariance(item);

                return (
                  <div
                    key={item.id}
                    className="p-4 bg-factory-gray rounded-xl border border-factory-border mb-4"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <p className="text-white font-medium">{item.yarnTypeName}</p>
                        <p className="text-sm text-neutral-400">{item.yarnTypeCode}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-neutral-400">Ordered</p>
                        <p className="text-white font-medium">
                          {item.orderedQuantity} kg
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Input
                        label="Received Quantity (kg)"
                        type="number"
                        step="0.001"
                        value={verificationData.items[index]?.receivedQuantity || 0}
                        onChange={(e) => {
                          const newItems = [...verificationData.items];
                          newItems[index] = {
                            ...newItems[index],
                            receivedQuantity: Number(e.target.value),
                            acceptedQuantity: Number(e.target.value),
                          };
                          setVerificationData({
                            ...verificationData,
                            items: newItems,
                          });
                        }}
                      />

                      <div>
                        <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                          Quality Status
                        </label>
                        <select
                          value={verificationData.items[index]?.qualityStatus}
                          onChange={(e) => {
                            const newItems = [...verificationData.items];
                            newItems[index] = {
                              ...newItems[index],
                              qualityStatus: e.target.value as any,
                            };
                            setVerificationData({
                              ...verificationData,
                              items: newItems,
                            });
                          }}
                          className="w-full px-4 py-2.5 rounded-xl bg-factory-dark border border-factory-border text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                          <option value="APPROVED">Approved</option>
                          <option value="PARTIAL">Partial Accept</option>
                          <option value="REJECTED">Rejected</option>
                        </select>
                      </div>

                      <Input
                        label="Accepted Quantity (kg)"
                        type="number"
                        step="0.001"
                        value={verificationData.items[index]?.acceptedQuantity || 0}
                        onChange={(e) => {
                          const newItems = [...verificationData.items];
                          newItems[index] = {
                            ...newItems[index],
                            acceptedQuantity: Number(e.target.value),
                          };
                          setVerificationData({
                            ...verificationData,
                            items: newItems,
                          });
                        }}
                      />
                    </div>

                    {/* Variance Display */}
                    {variance !== 0 && (
                      <div
                        className={`mt-3 p-3 rounded-lg ${
                          variance < 0
                            ? 'bg-error/10 border border-error/30'
                            : 'bg-success/10 border border-success/30'
                        }`}
                      >
                        <span
                          className={variance < 0 ? 'text-error' : 'text-success'}
                        >
                          {variance < 0 ? 'Short' : 'Excess'}: {Math.abs(variance)} kg (
                          {variancePercent}%)
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                Verification Notes
              </label>
              <textarea
                rows={2}
                className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Any observations during verification..."
                value={verificationData.notes}
                onChange={(e) =>
                  setVerificationData({
                    ...verificationData,
                    notes: e.target.value,
                  })
                }
              />
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button
                variant="secondary"
                onClick={() => setShowVerificationForm(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleVerificationSubmit} disabled={isVerifying}>
                {isVerifying ? 'Verifying...' : 'Complete Verification'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {(payOrder.status === 'VERIFIED' || payOrder.status === 'COMPLETED') && (
        <div className="bg-success/10 border border-success/30 rounded-2xl p-6">
          <div className="flex items-center gap-3">
            <span className="text-2xl">✓</span>
            <div>
              <h3 className="text-lg font-semibold text-success">
                Verification Complete
              </h3>
              <p className="text-neutral-300 mt-1">
                {payOrder.verifiedDate &&
                  `Verified on ${formatDate(payOrder.verifiedDate)}`}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const ShortagesTab = () => (
    <div className="space-y-6">
      {/* Add Shortage Button */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-white">Shortages & Discrepancies</h3>
        <Button onClick={() => setShowShortageForm(true)}>+ Record Shortage</Button>
      </div>

      {/* Shortage Form */}
      {showShortageForm && (
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
          <h4 className="text-md font-semibold text-white mb-4">
            Record Shortage/Discrepancy
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                Issue Type
              </label>
              <select
                value={shortageData.shortageType}
                onChange={(e) =>
                  setShortageData({
                    ...shortageData,
                    shortageType: e.target.value as ShortageType,
                  })
                }
                className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {Object.values(SHORTAGE_TYPES).map((type) => (
                  <option key={type.code} value={type.code}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                Affected Item
              </label>
              <select
                value={shortageData.payOrderItemId}
                onChange={(e) =>
                  setShortageData({
                    ...shortageData,
                    payOrderItemId: e.target.value,
                  })
                }
                className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">All Items / General</option>
                {payOrder.items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.yarnTypeName} ({item.yarnTypeCode})
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                Description
              </label>
              <textarea
                rows={2}
                className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Describe the issue in detail..."
                value={shortageData.description}
                onChange={(e) =>
                  setShortageData({
                    ...shortageData,
                    description: e.target.value,
                  })
                }
              />
            </div>

            <Input
              label="Expected Quantity (kg)"
              type="number"
              value={shortageData.expectedQuantity}
              onChange={(e) =>
                setShortageData({
                  ...shortageData,
                  expectedQuantity: Number(e.target.value),
                })
              }
            />

            <Input
              label="Actual Quantity (kg)"
              type="number"
              value={shortageData.actualQuantity}
              onChange={(e) =>
                setShortageData({
                  ...shortageData,
                  actualQuantity: Number(e.target.value),
                })
              }
            />

            <Input
              label="Financial Impact (PKR)"
              type="number"
              value={shortageData.shortageAmount}
              onChange={(e) =>
                setShortageData({
                  ...shortageData,
                  shortageAmount: Number(e.target.value),
                })
              }
            />
          </div>

          <div className="flex justify-end gap-3 mt-4">
            <Button variant="secondary" onClick={() => setShowShortageForm(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddShortage}>Record Shortage</Button>
          </div>
        </div>
      )}

      {/* Shortages List */}
      {shortages.length === 0 ? (
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-12 text-center">
          <p className="text-neutral-400">No shortages or discrepancies recorded.</p>
        </div>
      ) : (
        <div className="bg-factory-dark rounded-2xl border border-factory-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-factory-border">
                  <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">
                    Type
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">
                    Description
                  </th>
                  <th className="text-right px-6 py-4 text-sm font-medium text-neutral-400">
                    Shortage
                  </th>
                  <th className="text-right px-6 py-4 text-sm font-medium text-neutral-400">
                    Amount
                  </th>
                  <th className="text-center px-6 py-4 text-sm font-medium text-neutral-400">
                    Resolution
                  </th>
                  <th className="text-right px-6 py-4 text-sm font-medium text-neutral-400">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-factory-border">
                {shortages.map((shortage) => (
                  <tr key={shortage.id}>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 text-xs rounded-full bg-error/20 text-error">
                        {SHORTAGE_TYPES[shortage.shortageType].label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-white max-w-xs">
                      {shortage.description}
                    </td>
                    <td className="px-6 py-4 text-right text-error">
                      {shortage.shortageQuantity} kg
                    </td>
                    <td className="px-6 py-4 text-right text-error font-medium">
                      {shortage.shortageAmount
                        ? formatPKR(shortage.shortageAmount)
                        : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center">
                        <span
                          className={`px-2 py-1 text-xs rounded-full bg-${SHORTAGE_RESOLUTIONS[shortage.resolution].color}/20 text-${SHORTAGE_RESOLUTIONS[shortage.resolution].color}`}
                        >
                          {SHORTAGE_RESOLUTIONS[shortage.resolution].label}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {shortage.resolution === 'PENDING' && (
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleResolveShortage(shortage.id, 'CREDIT_NOTE')
                            }
                          >
                            Credit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleResolveShortage(shortage.id, 'ACCEPTED')
                            }
                          >
                            Accept
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pending Shortages Warning */}
      {shortages.filter((s) => s.resolution === 'PENDING').length > 0 && (
        <div className="bg-warning/10 border border-warning/30 rounded-2xl p-4">
          <p className="text-warning text-sm">
            ⚠️ There are pending shortages. Resolve all shortages before proceeding to
            Yarn Inward.
          </p>
        </div>
      )}
    </div>
  );

  // Check if approval is needed
  const needsApproval = ['DRAFT', 'PENDING_FINANCE', 'PENDING_ADMIN', 'APPROVED', 'REJECTED'].includes(payOrder.status);
  const approvalBadge = payOrder.status === 'PENDING_FINANCE' || payOrder.status === 'PENDING_ADMIN' ? 1 : 0;

  const tabs: { id: TabId; label: string; badge?: number }[] = [
    { id: 'details', label: 'Order Details' },
    { id: 'approval', label: 'Approval', badge: approvalBadge },
    { id: 'verification', label: 'Verification' },
    {
      id: 'shortages',
      label: 'Shortages',
      badge: shortages.filter((s) => s.resolution === 'PENDING').length,
    },
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
            <Link href="/yarn/pay-orders" className="text-neutral-400 hover:text-white">
              Pay Orders
            </Link>
            <span className="text-neutral-600">/</span>
            <span className="text-white">{payOrder.orderNumber}</span>
          </div>
          <div className="flex items-center gap-3 mt-2">
            <h1 className="text-2xl font-semibold text-white">
              {payOrder.orderNumber}
            </h1>
            {getStatusBadge(payOrder.status)}
          </div>
          <p className="text-neutral-400 mt-1">{payOrder.vendorName}</p>
        </div>
        <div className="flex gap-3">
          {payOrder.status === 'VERIFIED' && canProceedToInward && (
            <Link href={`/yarn/inward?payOrder=${payOrder.id}`}>
              <Button>Create Yarn Inward</Button>
            </Link>
          )}
          <Button variant="ghost" onClick={() => router.back()}>
            Back
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Quantity"
          value={`${payOrder.totalQuantity.toLocaleString()} kg`}
          icon="📦"
        />
        <StatsCard
          title="Total Amount"
          value={payOrder.totalAmount ? formatPKR(payOrder.totalAmount) : 'Pending'}
          change={payOrder.totalAmount ? 'Finance approved' : 'Awaiting pricing'}
          changeType={payOrder.totalAmount ? 'positive' : 'neutral'}
          icon="💰"
        />
        <StatsCard
          title="Approval Status"
          value={PAY_ORDER_STATUSES[payOrder.status].label}
          change={PAY_ORDER_STATUSES[payOrder.status].description}
          changeType={
            ['PENDING_FINANCE', 'PENDING_ADMIN'].includes(payOrder.status)
              ? 'neutral'
              : payOrder.status === 'REJECTED'
              ? 'negative'
              : 'positive'
          }
          icon="✓"
        />
        <StatsCard
          title="Shortages"
          value={shortages.length}
          change={
            shortages.filter((s) => s.resolution === 'PENDING').length > 0
              ? 'Pending'
              : 'Resolved'
          }
          changeType={
            shortages.filter((s) => s.resolution === 'PENDING').length > 0
              ? 'negative'
              : 'positive'
          }
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
        {activeTab === 'details' && <DetailsTab />}
        {activeTab === 'approval' && <ApprovalTab />}
        {activeTab === 'verification' && <VerificationTab />}
        {activeTab === 'shortages' && <ShortagesTab />}
      </div>
    </div>
  );
}
