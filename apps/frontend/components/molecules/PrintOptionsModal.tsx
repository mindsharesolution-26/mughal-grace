'use client';

import { useState } from 'react';
import { Button } from '@/components/atoms/Button';
import { DyeingPrintCopyType, dyeingPrintCopyLabels } from '@/lib/types/dyeing';
import { X, Printer, FileText, Check } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

type PrintMethod = 'pdf' | 'thermal';

interface PrintOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPrint: (copies: DyeingPrintCopyType[], method: PrintMethod) => Promise<void>;
  orderNumber: string;
  isLoading?: boolean;
}

export function PrintOptionsModal({
  isOpen,
  onClose,
  onPrint,
  orderNumber,
  isLoading = false,
}: PrintOptionsModalProps) {
  const [selectedCopies, setSelectedCopies] = useState<DyeingPrintCopyType[]>([
    'FINANCE',
    'GATE_PASS',
    'DYEING',
  ]);
  const [printMethod, setPrintMethod] = useState<PrintMethod>('pdf');

  const toggleCopy = (copy: DyeingPrintCopyType) => {
    setSelectedCopies((prev) =>
      prev.includes(copy) ? prev.filter((c) => c !== copy) : [...prev, copy]
    );
  };

  const handlePrint = async () => {
    if (selectedCopies.length === 0) return;
    await onPrint(selectedCopies, printMethod);
  };

  if (!isOpen) return null;

  const copyOptions: { type: DyeingPrintCopyType; description: string }[] = [
    { type: 'FINANCE', description: 'For accounts department' },
    { type: 'GATE_PASS', description: 'For security gate' },
    { type: 'DYEING', description: 'Goes with the fabric' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 bg-factory-dark border border-factory-border rounded-2xl shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-factory-border">
          <div>
            <h2 className="text-lg font-semibold text-white">Print Challans</h2>
            <p className="text-sm text-neutral-400">{orderNumber}</p>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-2 text-neutral-400 hover:text-white hover:bg-factory-gray rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Copies Selection */}
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-3">
              Select Copies to Print
            </label>
            <div className="space-y-2">
              {copyOptions.map(({ type, description }) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => toggleCopy(type)}
                  className={cn(
                    'w-full flex items-center justify-between p-3 rounded-xl border transition-all',
                    selectedCopies.includes(type)
                      ? 'bg-primary-500/10 border-primary-500'
                      : 'bg-factory-gray/30 border-factory-border hover:border-neutral-600'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'w-5 h-5 rounded border-2 flex items-center justify-center transition-colors',
                        selectedCopies.includes(type)
                          ? 'bg-primary-500 border-primary-500'
                          : 'border-neutral-500'
                      )}
                    >
                      {selectedCopies.includes(type) && (
                        <Check className="w-3 h-3 text-white" />
                      )}
                    </div>
                    <div className="text-left">
                      <p className="text-white font-medium">
                        {dyeingPrintCopyLabels[type]}
                      </p>
                      <p className="text-xs text-neutral-500">{description}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Print Method */}
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-3">
              Print Method
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPrintMethod('pdf')}
                className={cn(
                  'flex flex-col items-center gap-2 p-4 rounded-xl border transition-all',
                  printMethod === 'pdf'
                    ? 'bg-primary-500/10 border-primary-500'
                    : 'bg-factory-gray/30 border-factory-border hover:border-neutral-600'
                )}
              >
                <FileText
                  className={cn(
                    'w-8 h-8',
                    printMethod === 'pdf' ? 'text-primary-400' : 'text-neutral-400'
                  )}
                />
                <span
                  className={cn(
                    'font-medium',
                    printMethod === 'pdf' ? 'text-white' : 'text-neutral-400'
                  )}
                >
                  PDF (A4)
                </span>
                <span className="text-xs text-neutral-500">Download & Print</span>
              </button>

              <button
                type="button"
                onClick={() => setPrintMethod('thermal')}
                className={cn(
                  'flex flex-col items-center gap-2 p-4 rounded-xl border transition-all',
                  printMethod === 'thermal'
                    ? 'bg-primary-500/10 border-primary-500'
                    : 'bg-factory-gray/30 border-factory-border hover:border-neutral-600'
                )}
              >
                <Printer
                  className={cn(
                    'w-8 h-8',
                    printMethod === 'thermal' ? 'text-primary-400' : 'text-neutral-400'
                  )}
                />
                <span
                  className={cn(
                    'font-medium',
                    printMethod === 'thermal' ? 'text-white' : 'text-neutral-400'
                  )}
                >
                  Thermal
                </span>
                <span className="text-xs text-neutral-500">Label Printer</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-factory-border flex justify-end gap-3">
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
            onClick={handlePrint}
            isLoading={isLoading}
            disabled={selectedCopies.length === 0}
          >
            <Printer className="w-4 h-4 mr-2" />
            Print {selectedCopies.length > 0 && `(${selectedCopies.length})`}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default PrintOptionsModal;
