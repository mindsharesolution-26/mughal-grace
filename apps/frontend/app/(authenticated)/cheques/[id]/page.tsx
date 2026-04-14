'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/atoms/Button';
import { ChequeStatusBadge } from '@/components/atoms/StatusBadge';
import { useToast } from '@/contexts/ToastContext';
import {
  Cheque,
  ChequeStatusHistory,
  CHEQUE_TYPES,
  CHEQUE_STATUSES,
  formatChequeAmount,
  formatDate,
  getDaysUntilMaturity,
  getChequePartyName,
  canDeposit,
  canClear,
  canBounce,
  canReplace,
  canCancel,
} from '@/lib/types/cheque';

// Mock cheque data
const mockCheque: Cheque = {
  id: '1',
  chequeNumber: '005678',
  chequeType: 'RECEIVED',
  customerId: '1',
  customerName: 'Fashion Hub',
  bankName: 'MCB',
  branchName: 'Gulberg Branch',
  accountNumber: '1234567890',
  amount: 100000,
  chequeDate: '2024-01-25',
  receivedDate: '2024-01-18',
  depositDate: '2024-01-22',
  status: 'DEPOSITED',
  bounceCount: 0,
  createdBy: 'admin',
  createdAt: '2024-01-18',
  updatedAt: '2024-01-22',
  statusHistory: [
    {
      id: '1',
      chequeId: '1',
      toStatus: 'PENDING',
      changedByName: 'Admin User',
      reason: 'Cheque received from customer',
      changedAt: '2024-01-18T10:30:00',
    },
    {
      id: '2',
      chequeId: '1',
      fromStatus: 'PENDING',
      toStatus: 'DEPOSITED',
      changedByName: 'Admin User',
      reason: 'Deposited to HBL account',
      changedAt: '2024-01-22T14:15:00',
    },
  ],
};

// Action Modal Component
interface ActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  onSubmit: () => void;
  isLoading: boolean;
  submitLabel: string;
  submitVariant?: 'primary' | 'secondary' | 'ghost';
}

function ActionModal({
  isOpen,
  onClose,
  title,
  children,
  onSubmit,
  isLoading,
  submitLabel,
  submitVariant = 'primary',
}: ActionModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-factory-dark border border-factory-border rounded-2xl p-6 w-full max-w-md mx-4">
        <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>
        {children}
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="ghost" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={onSubmit} isLoading={isLoading}>
            {submitLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function ChequeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const chequeId = params.id as string;

  const [cheque] = useState<Cheque>(mockCheque);
  const [isProcessing, setIsProcessing] = useState(false);

  // Modal states
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);
  const [showBounceModal, setShowBounceModal] = useState(false);
  const [showReplaceModal, setShowReplaceModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  // Form states
  const [depositDate, setDepositDate] = useState(new Date().toISOString().split('T')[0]);
  const [clearanceDate, setClearanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [bounceReason, setBounceReason] = useState('');
  const [bounceCharges, setBounceCharges] = useState(0);
  const [cancelReason, setCancelReason] = useState('');

  const partyName = getChequePartyName(cheque);
  const daysUntil = getDaysUntilMaturity(cheque.chequeDate);

  // Action handlers
  const handleDeposit = async () => {
    setIsProcessing(true);
    try {
      // TODO: API call to deposit cheque
      await new Promise((resolve) => setTimeout(resolve, 1000));
      showToast('success', 'Cheque marked as deposited');
      setShowDepositModal(false);
      router.refresh();
    } catch (error) {
      showToast('error', 'Failed to deposit cheque');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClear = async () => {
    setIsProcessing(true);
    try {
      // TODO: API call to clear cheque
      await new Promise((resolve) => setTimeout(resolve, 1000));
      showToast('success', 'Cheque marked as cleared');
      setShowClearModal(false);
      router.refresh();
    } catch (error) {
      showToast('error', 'Failed to clear cheque');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBounce = async () => {
    if (!bounceReason.trim()) {
      showToast('error', 'Please provide bounce reason');
      return;
    }
    setIsProcessing(true);
    try {
      // TODO: API call to mark cheque as bounced
      await new Promise((resolve) => setTimeout(resolve, 1000));
      showToast('success', 'Cheque marked as bounced');
      setShowBounceModal(false);
      router.refresh();
    } catch (error) {
      showToast('error', 'Failed to mark cheque as bounced');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = async () => {
    if (!cancelReason.trim()) {
      showToast('error', 'Please provide cancellation reason');
      return;
    }
    setIsProcessing(true);
    try {
      // TODO: API call to cancel cheque
      await new Promise((resolve) => setTimeout(resolve, 1000));
      showToast('success', 'Cheque cancelled');
      setShowCancelModal(false);
      router.refresh();
    } catch (error) {
      showToast('error', 'Failed to cancel cheque');
    } finally {
      setIsProcessing(false);
    }
  };

  // Status Timeline Component
  const StatusTimeline = () => (
    <div className="space-y-4">
      {cheque.statusHistory?.map((history, index) => {
        const isLast = index === cheque.statusHistory!.length - 1;
        const statusInfo = CHEQUE_STATUSES[history.toStatus];
        return (
          <div key={history.id} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className={`w-3 h-3 rounded-full ${
                statusInfo.color === 'success' ? 'bg-success' :
                statusInfo.color === 'error' ? 'bg-error' :
                statusInfo.color === 'warning' ? 'bg-warning' :
                statusInfo.color === 'info' ? 'bg-info' :
                'bg-neutral-500'
              }`} />
              {!isLast && <div className="w-0.5 flex-1 bg-factory-border mt-2" />}
            </div>
            <div className="flex-1 pb-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-white">{statusInfo.label}</span>
                {history.fromStatus && (
                  <span className="text-xs text-neutral-500">
                    from {CHEQUE_STATUSES[history.fromStatus].label}
                  </span>
                )}
              </div>
              {history.reason && (
                <p className="text-sm text-neutral-300 mb-1">{history.reason}</p>
              )}
              <div className="flex items-center gap-2 text-xs text-neutral-500">
                <span>{new Date(history.changedAt).toLocaleString('en-PK')}</span>
                {history.changedByName && (
                  <>
                    <span>•</span>
                    <span>{history.changedByName}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm">
            <Link href="/cheques" className="text-neutral-400 hover:text-white">
              Cheques
            </Link>
            <span className="text-neutral-600">/</span>
            <span className="text-white">#{cheque.chequeNumber}</span>
          </div>
          <div className="flex items-center gap-3 mt-2">
            <h1 className="text-2xl font-semibold text-white font-mono">
              #{cheque.chequeNumber}
            </h1>
            <ChequeStatusBadge status={cheque.status} />
            <span className={`px-2 py-1 text-xs rounded-md ${
              cheque.chequeType === 'ISSUED'
                ? 'bg-error/20 text-error'
                : 'bg-success/20 text-success'
            }`}>
              {CHEQUE_TYPES[cheque.chequeType].label}
            </span>
          </div>
          <p className="text-neutral-400 mt-1">{partyName}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canDeposit(cheque) && (
            <Button onClick={() => setShowDepositModal(true)}>
              Deposit Cheque
            </Button>
          )}
          {canClear(cheque) && (
            <Button onClick={() => setShowClearModal(true)}>
              Mark Cleared
            </Button>
          )}
          {canBounce(cheque) && (
            <Button variant="secondary" onClick={() => setShowBounceModal(true)}>
              Mark Bounced
            </Button>
          )}
          {canReplace(cheque) && (
            <Button onClick={() => setShowReplaceModal(true)}>
              Record Replacement
            </Button>
          )}
          {canCancel(cheque) && (
            <Button variant="ghost" onClick={() => setShowCancelModal(true)}>
              Cancel
            </Button>
          )}
        </div>
      </div>

      {/* Amount Card */}
      <div className="bg-gradient-to-r from-primary-500/20 to-primary-600/10 rounded-2xl border border-primary-500/30 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-primary-300">Cheque Amount</p>
            <p className="text-3xl font-bold text-white">{formatChequeAmount(cheque.amount)}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-primary-300">Cheque Date</p>
            <p className="text-xl font-semibold text-white">{formatDate(cheque.chequeDate)}</p>
            {cheque.status === 'PENDING' && (
              <p className={`text-sm ${
                daysUntil < 0 ? 'text-error' : daysUntil <= 3 ? 'text-warning' : 'text-neutral-400'
              }`}>
                {daysUntil < 0
                  ? `${Math.abs(daysUntil)} days overdue`
                  : daysUntil === 0
                    ? 'Due today'
                    : `${daysUntil} days remaining`}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cheque Details */}
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Cheque Details</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-neutral-400">Bank Name</p>
                <p className="text-white">{cheque.bankName}</p>
              </div>
              {cheque.branchName && (
                <div>
                  <p className="text-sm text-neutral-400">Branch</p>
                  <p className="text-white">{cheque.branchName}</p>
                </div>
              )}
              {cheque.accountNumber && (
                <div>
                  <p className="text-sm text-neutral-400">Account Number</p>
                  <p className="text-white font-mono">{cheque.accountNumber}</p>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-factory-border">
              <h4 className="text-sm font-medium text-white mb-3">
                {cheque.chequeType === 'RECEIVED' ? 'Customer' : 'Vendor'}
              </h4>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary-500/20 flex items-center justify-center text-primary-400 font-medium">
                  {partyName.charAt(0)}
                </div>
                <div>
                  <p className="text-white font-medium">{partyName}</p>
                  {cheque.chequeType === 'RECEIVED' && cheque.customerId && (
                    <Link
                      href={`/receivables/customers/${cheque.customerId}`}
                      className="text-sm text-primary-400 hover:underline"
                    >
                      View Customer
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Important Dates */}
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Timeline</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-factory-gray rounded-xl">
              <span className="text-neutral-400">Cheque Date</span>
              <span className="text-white font-medium">{formatDate(cheque.chequeDate)}</span>
            </div>
            {cheque.receivedDate && (
              <div className="flex justify-between items-center p-3 bg-factory-gray rounded-xl">
                <span className="text-neutral-400">Received Date</span>
                <span className="text-white">{formatDate(cheque.receivedDate)}</span>
              </div>
            )}
            {cheque.depositDate && (
              <div className="flex justify-between items-center p-3 bg-factory-gray rounded-xl">
                <span className="text-neutral-400">Deposit Date</span>
                <span className="text-white">{formatDate(cheque.depositDate)}</span>
              </div>
            )}
            {cheque.clearanceDate && (
              <div className="flex justify-between items-center p-3 bg-factory-gray rounded-xl">
                <span className="text-neutral-400">Clearance Date</span>
                <span className="text-success">{formatDate(cheque.clearanceDate)}</span>
              </div>
            )}
            {cheque.bouncedDate && (
              <div className="flex justify-between items-center p-3 bg-factory-gray rounded-xl">
                <span className="text-neutral-400">Bounced Date</span>
                <span className="text-error">{formatDate(cheque.bouncedDate)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bounce Info (if bounced) */}
      {cheque.status === 'BOUNCED' && (
        <div className="bg-error/10 rounded-2xl border border-error/30 p-6">
          <h3 className="text-lg font-semibold text-error mb-4">Bounce Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-error/70">Bounce Reason</p>
              <p className="text-white">{cheque.bounceReason || 'Not specified'}</p>
            </div>
            <div>
              <p className="text-sm text-error/70">Bounce Charges</p>
              <p className="text-white">{cheque.bounceCharges ? formatChequeAmount(cheque.bounceCharges) : 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-error/70">Bounce Count</p>
              <p className="text-white">{cheque.bounceCount} time(s)</p>
            </div>
          </div>
          {cheque.replacedByChequeId && (
            <div className="mt-4 pt-4 border-t border-error/20">
              <p className="text-sm text-neutral-400">Replaced by:</p>
              <Link
                href={`/cheques/${cheque.replacedByChequeId}`}
                className="text-primary-400 hover:underline"
              >
                #{cheque.replacedByChequNumber || cheque.replacedByChequeId}
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Status History */}
      <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Status History</h3>
        {cheque.statusHistory && cheque.statusHistory.length > 0 ? (
          <StatusTimeline />
        ) : (
          <p className="text-neutral-400">No status history available.</p>
        )}
      </div>

      {/* Modals */}
      <ActionModal
        isOpen={showDepositModal}
        onClose={() => setShowDepositModal(false)}
        title="Deposit Cheque"
        onSubmit={handleDeposit}
        isLoading={isProcessing}
        submitLabel="Confirm Deposit"
      >
        <div className="space-y-4">
          <p className="text-neutral-300">
            Mark cheque #{cheque.chequeNumber} as deposited to bank?
          </p>
          <div>
            <label className="block text-sm text-neutral-400 mb-1">Deposit Date</label>
            <input
              type="date"
              value={depositDate}
              onChange={(e) => setDepositDate(e.target.value)}
              className="w-full px-4 py-2 rounded-xl bg-factory-gray border border-factory-border text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>
      </ActionModal>

      <ActionModal
        isOpen={showClearModal}
        onClose={() => setShowClearModal(false)}
        title="Mark Cheque as Cleared"
        onSubmit={handleClear}
        isLoading={isProcessing}
        submitLabel="Confirm Clearance"
      >
        <div className="space-y-4">
          <p className="text-neutral-300">
            Confirm that cheque #{cheque.chequeNumber} has cleared?
          </p>
          <div className="p-3 bg-success/10 rounded-xl border border-success/20">
            <p className="text-success text-sm">
              This will credit {formatChequeAmount(cheque.amount)} to the customer's account.
            </p>
          </div>
          <div>
            <label className="block text-sm text-neutral-400 mb-1">Clearance Date</label>
            <input
              type="date"
              value={clearanceDate}
              onChange={(e) => setClearanceDate(e.target.value)}
              className="w-full px-4 py-2 rounded-xl bg-factory-gray border border-factory-border text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>
      </ActionModal>

      <ActionModal
        isOpen={showBounceModal}
        onClose={() => setShowBounceModal(false)}
        title="Mark Cheque as Bounced"
        onSubmit={handleBounce}
        isLoading={isProcessing}
        submitLabel="Confirm Bounce"
      >
        <div className="space-y-4">
          <div className="p-3 bg-error/10 rounded-xl border border-error/20">
            <p className="text-error text-sm">
              This will reverse the payment and add {formatChequeAmount(cheque.amount)} back to the customer's outstanding balance.
            </p>
          </div>
          <div>
            <label className="block text-sm text-neutral-400 mb-1">Bounce Reason *</label>
            <select
              value={bounceReason}
              onChange={(e) => setBounceReason(e.target.value)}
              className="w-full px-4 py-2 rounded-xl bg-factory-gray border border-factory-border text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Select reason</option>
              <option value="Insufficient funds">Insufficient funds</option>
              <option value="Account closed">Account closed</option>
              <option value="Signature mismatch">Signature mismatch</option>
              <option value="Amount in words and figures differ">Amount mismatch</option>
              <option value="Stale cheque">Stale cheque</option>
              <option value="Payment stopped">Payment stopped</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-neutral-400 mb-1">Bounce Charges (PKR)</label>
            <input
              type="number"
              min="0"
              value={bounceCharges}
              onChange={(e) => setBounceCharges(parseInt(e.target.value) || 0)}
              className="w-full px-4 py-2 rounded-xl bg-factory-gray border border-factory-border text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="0"
            />
          </div>
        </div>
      </ActionModal>

      <ActionModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        title="Cancel Cheque"
        onSubmit={handleCancel}
        isLoading={isProcessing}
        submitLabel="Cancel Cheque"
      >
        <div className="space-y-4">
          <p className="text-neutral-300">
            Are you sure you want to cancel cheque #{cheque.chequeNumber}?
          </p>
          <div>
            <label className="block text-sm text-neutral-400 mb-1">Cancellation Reason *</label>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 rounded-xl bg-factory-gray border border-factory-border text-white focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              placeholder="Provide reason for cancellation..."
            />
          </div>
        </div>
      </ActionModal>
    </div>
  );
}
