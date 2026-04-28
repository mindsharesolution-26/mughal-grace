'use client';

import { FabricEntry } from '@/lib/types/dyeing';
import { DyeingVendorLookup } from '@/lib/types/dyeing';
import { Button } from '@/components/atoms/Button';
import { X, Truck, ScrollText, Layers, Palette } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface DyeingPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  vendor: DyeingVendorLookup | null;
  fabricEntries: FabricEntry[];
  notes?: string;
  isLoading?: boolean;
}

export function DyeingPreviewModal({
  isOpen,
  onClose,
  onConfirm,
  vendor,
  fabricEntries,
  notes,
  isLoading = false,
}: DyeingPreviewModalProps) {
  if (!isOpen) return null;

  // Calculate totals
  const totalRolls = fabricEntries.reduce((sum, e) => sum + e.rolls.length, 0);
  const totalWeight = fabricEntries.reduce(
    (sum, e) => sum + e.rolls.reduce((s, r) => s + Number(r.greyWeight), 0),
    0
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl mx-4 bg-factory-dark border border-factory-border rounded-2xl shadow-xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-factory-border">
          <h2 className="text-lg font-semibold text-white">Confirm Dyeing Order</h2>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-2 text-neutral-400 hover:text-white hover:bg-factory-gray rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Vendor Info */}
          <div className="p-4 bg-factory-gray/50 rounded-xl border border-factory-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-500/20 rounded-lg flex items-center justify-center">
                <Truck className="w-5 h-5 text-primary-400" />
              </div>
              <div>
                <p className="text-sm text-neutral-400">Dyeing Vendor</p>
                <p className="text-white font-medium">{vendor?.name || 'Not selected'}</p>
                {vendor?.code && (
                  <p className="text-xs text-neutral-500">{vendor.code}</p>
                )}
              </div>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-factory-gray/30 rounded-xl border border-factory-border">
              <div className="flex items-center gap-2 text-neutral-400 mb-1">
                <ScrollText className="w-4 h-4" />
                <span className="text-sm">Total Rolls</span>
              </div>
              <p className="text-2xl font-bold text-white">{totalRolls}</p>
            </div>
            <div className="p-4 bg-factory-gray/30 rounded-xl border border-factory-border">
              <div className="flex items-center gap-2 text-neutral-400 mb-1">
                <Layers className="w-4 h-4" />
                <span className="text-sm">Total Weight</span>
              </div>
              <p className="text-2xl font-bold text-primary-400">{totalWeight.toFixed(2)} kg</p>
            </div>
          </div>

          {/* Fabric Entries */}
          <div>
            <h3 className="text-sm font-medium text-neutral-300 mb-3">
              Fabric Entries ({fabricEntries.length})
            </h3>
            <div className="space-y-3">
              {fabricEntries.map((entry) => {
                const entryWeight = entry.rolls.reduce((s, r) => s + Number(r.greyWeight), 0);
                return (
                  <div
                    key={entry.id}
                    className="p-4 bg-factory-gray/30 rounded-xl border border-factory-border"
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        {/* Fabric */}
                        <div className="flex items-center gap-2">
                          <Layers className="w-4 h-4 text-primary-400" />
                          <span className="font-medium text-white">
                            {entry.fabricName || entry.fabricCode}
                          </span>
                          {entry.fabricCode && entry.fabricName && (
                            <span className="text-neutral-500 text-sm">({entry.fabricCode})</span>
                          )}
                        </div>

                        {/* Color */}
                        {entry.colorName ? (
                          <div className="flex items-center gap-2">
                            <div
                              className="w-4 h-4 rounded-full border border-factory-border"
                              style={{ backgroundColor: entry.hexCode || '#6B7280' }}
                            />
                            <span className="text-sm text-neutral-300">{entry.colorName}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-neutral-500">
                            <Palette className="w-4 h-4" />
                            <span className="text-sm italic">No color assigned</span>
                          </div>
                        )}
                      </div>

                      <div className="text-right">
                        <p className="text-white font-medium">{entry.rolls.length} rolls</p>
                        <p className="text-primary-400 text-sm">{entryWeight.toFixed(2)} kg</p>
                      </div>
                    </div>

                    {/* Roll Numbers */}
                    <div className="mt-3 pt-3 border-t border-factory-border">
                      <p className="text-xs text-neutral-500 mb-1">Rolls:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {entry.rolls.map((roll) => (
                          <span
                            key={roll.id}
                            className="px-2 py-0.5 bg-factory-gray rounded text-xs text-neutral-300 font-mono"
                          >
                            {roll.rollNumber}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          {notes && (
            <div className="p-4 bg-factory-gray/30 rounded-xl border border-factory-border">
              <p className="text-sm text-neutral-400 mb-1">Notes</p>
              <p className="text-white text-sm">{notes}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-factory-border bg-factory-dark">
          <div className="flex items-center justify-between">
            <p className="text-sm text-neutral-400">
              Review the details above before confirming
            </p>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={onClose}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={onConfirm}
                isLoading={isLoading}
              >
                Confirm & Create Order
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DyeingPreviewModal;
