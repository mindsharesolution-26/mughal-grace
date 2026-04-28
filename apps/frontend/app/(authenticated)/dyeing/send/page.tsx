'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/atoms/Button';
import { useToast } from '@/contexts/ToastContext';
import { dyeingVendorsApi, dyeingOrdersApi } from '@/lib/api/dyeing';
import { fabricsApi } from '@/lib/api/settings';
import {
  DyeingVendorLookup,
  FabricEntry,
  ScannedRoll,
  DyeingPrintCopyType,
} from '@/lib/types/dyeing';
import { Fabric, Color } from '@/lib/types/settings';
import {
  RollQRScanner,
  ColorSelector,
  AddColorModal,
  FabricEntryCard,
  DyeingPreviewModal,
  PrintOptionsModal,
} from '@/components/molecules';
import { dyeingPrinter } from '@/lib/services/dyeingPrinter';
import {
  Truck,
  Layers,
  Plus,
  Check,
  ChevronRight,
  X,
  Printer,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

// Generate a unique ID for fabric entries
function generateEntryId(): string {
  return `entry-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export default function SendForDyeingPage() {
  const router = useRouter();
  const { showToast } = useToast();

  // Step management
  const [currentStep, setCurrentStep] = useState<'vendor' | 'entries' | 'confirm'>('vendor');

  // Vendor selection
  const [vendors, setVendors] = useState<DyeingVendorLookup[]>([]);
  const [selectedVendor, setSelectedVendor] = useState<DyeingVendorLookup | null>(null);

  // Fabric entries
  const [fabricEntries, setFabricEntries] = useState<FabricEntry[]>([]);
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null);

  // Active entry form state
  const [fabrics, setFabrics] = useState<Fabric[]>([]);
  const [selectedFabricId, setSelectedFabricId] = useState<number | null>(null);
  const [scannedRolls, setScannedRolls] = useState<ScannedRoll[]>([]);
  const [selectedColor, setSelectedColor] = useState<Color | null>(null);
  const [entryNotes, setEntryNotes] = useState('');

  // Order notes
  const [orderNotes, setOrderNotes] = useState('');

  // Modals
  const [showAddColorModal, setShowAddColorModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  // Created order for printing
  const [createdOrderId, setCreatedOrderId] = useState<number | null>(null);
  const [createdOrderNumber, setCreatedOrderNumber] = useState<string>('');

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const [vendorsData, fabricsData] = await Promise.all([
          dyeingVendorsApi.getLookup(),
          fabricsApi.getAll(),
        ]);
        setVendors(vendorsData);
        setFabrics(fabricsData.filter((f) => f.isActive));
      } catch (error: any) {
        showToast('error', error.response?.data?.error || 'Failed to load data');
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [showToast]);

  // Get current active entry
  const activeEntry = fabricEntries.find((e) => e.id === activeEntryId);

  // Get selected fabric details
  const selectedFabric = fabrics.find((f) => f.id === selectedFabricId);

  // Handle roll scanned
  const handleRollScanned = useCallback((roll: ScannedRoll) => {
    setScannedRolls((prev) => {
      // Avoid duplicates
      if (prev.some((r) => r.id === roll.id)) {
        return prev;
      }
      return [...prev, roll];
    });
  }, []);

  // Handle roll removal
  const handleRemoveRoll = useCallback((rollId: number) => {
    setScannedRolls((prev) => prev.filter((r) => r.id !== rollId));
  }, []);

  // Handle color selection
  const handleColorSelect = useCallback((color: Color | null) => {
    setSelectedColor(color);
  }, []);

  // Handle new color created
  const handleColorCreated = useCallback((color: Color) => {
    setSelectedColor(color);
    setShowAddColorModal(false);
  }, []);

  // Save current entry
  const saveCurrentEntry = useCallback(() => {
    if (!selectedFabricId || scannedRolls.length === 0) return;

    const fabric = fabrics.find((f) => f.id === selectedFabricId);
    if (!fabric) return;

    const newEntry: FabricEntry = {
      id: activeEntryId || generateEntryId(),
      fabricId: selectedFabricId,
      fabricCode: fabric.code,
      fabricName: fabric.name,
      colorId: selectedColor?.id,
      colorCode: selectedColor?.code,
      colorName: selectedColor?.name,
      hexCode: selectedColor?.hexCode || undefined,
      rolls: [...scannedRolls],
      notes: entryNotes || undefined,
    };

    setFabricEntries((prev) => {
      const existingIndex = prev.findIndex((e) => e.id === activeEntryId);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = newEntry;
        return updated;
      }
      return [...prev, newEntry];
    });

    // Reset form
    setActiveEntryId(null);
    setSelectedFabricId(null);
    setScannedRolls([]);
    setSelectedColor(null);
    setEntryNotes('');
  }, [activeEntryId, selectedFabricId, scannedRolls, selectedColor, entryNotes, fabrics]);

  // Start new entry
  const startNewEntry = useCallback(() => {
    setActiveEntryId(generateEntryId());
    setSelectedFabricId(null);
    setScannedRolls([]);
    setSelectedColor(null);
    setEntryNotes('');
  }, []);

  // Save and add another entry
  const saveAndAddAnother = useCallback(() => {
    if (!selectedFabricId || scannedRolls.length === 0) return;

    const fabric = fabrics.find((f) => f.id === selectedFabricId);
    if (!fabric) return;

    const newEntry: FabricEntry = {
      id: activeEntryId || generateEntryId(),
      fabricId: selectedFabricId,
      fabricCode: fabric.code,
      fabricName: fabric.name,
      colorId: selectedColor?.id,
      colorCode: selectedColor?.code,
      colorName: selectedColor?.name,
      hexCode: selectedColor?.hexCode || undefined,
      rolls: [...scannedRolls],
      notes: entryNotes || undefined,
    };

    setFabricEntries((prev) => {
      const existingIndex = prev.findIndex((e) => e.id === activeEntryId);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = newEntry;
        return updated;
      }
      return [...prev, newEntry];
    });

    // Start a new entry immediately
    setActiveEntryId(generateEntryId());
    setSelectedFabricId(null);
    setScannedRolls([]);
    setSelectedColor(null);
    setEntryNotes('');
  }, [activeEntryId, selectedFabricId, scannedRolls, selectedColor, entryNotes, fabrics]);

  // Auto-start entry when arriving at step 2 with no entries
  useEffect(() => {
    if (currentStep === 'entries' && fabricEntries.length === 0 && !activeEntryId) {
      startNewEntry();
    }
  }, [currentStep, fabricEntries.length, activeEntryId, startNewEntry]);

  // Edit entry
  const editEntry = useCallback((entry: FabricEntry) => {
    setActiveEntryId(entry.id);
    setSelectedFabricId(entry.fabricId || null);
    setScannedRolls([...entry.rolls]);
    setSelectedColor(
      entry.colorId
        ? { id: entry.colorId, code: entry.colorCode || '', name: entry.colorName || '', hexCode: entry.hexCode || null } as Color
        : null
    );
    setEntryNotes(entry.notes || '');
  }, []);

  // Remove entry
  const removeEntry = useCallback((entryId: string) => {
    setFabricEntries((prev) => prev.filter((e) => e.id !== entryId));
    if (activeEntryId === entryId) {
      setActiveEntryId(null);
      setSelectedFabricId(null);
      setScannedRolls([]);
      setSelectedColor(null);
      setEntryNotes('');
    }
  }, [activeEntryId]);

  // Calculate totals
  const totalRolls = fabricEntries.reduce((sum, e) => sum + e.rolls.length, 0);
  const totalWeight = fabricEntries.reduce(
    (sum, e) => sum + e.rolls.reduce((s, r) => s + Number(r.greyWeight), 0),
    0
  );

  // Handle submit
  const handleSubmit = async () => {
    if (!selectedVendor) {
      showToast('error', 'Please select a vendor');
      return;
    }

    if (fabricEntries.length === 0) {
      showToast('error', 'Please add at least one fabric entry');
      return;
    }

    setIsSubmitting(true);
    try {
      // Collect all roll IDs - filter out manual entries (negative IDs)
      const allRollIds = fabricEntries
        .flatMap((e) => e.rolls.map((r) => r.id))
        .filter((id) => id > 0);

      if (allRollIds.length === 0) {
        showToast('error', 'No valid rolls to send. Manual entries cannot be sent for dyeing.');
        setIsSubmitting(false);
        return;
      }

      // Create order - filter out manual entries from fabric groups
      const order = await dyeingOrdersApi.create({
        vendorId: selectedVendor.id,
        notes: orderNotes || undefined,
        rollIds: allRollIds,
        fabricGroups: fabricEntries
          .map((e) => ({
            fabricId: e.fabricId,
            colorId: e.colorId,
            colorCode: e.colorCode,
            colorName: e.colorName,
            rollIds: e.rolls.filter((r) => r.id > 0).map((r) => r.id),
            notes: e.notes,
          }))
          .filter((g) => g.rollIds.length > 0), // Only include groups with valid rolls
      });

      setCreatedOrderId(order.id);
      setCreatedOrderNumber(order.orderNumber);
      showToast('success', `Dyeing order ${order.orderNumber} created successfully`);
      setShowPreviewModal(false);
      setShowPrintModal(true);
    } catch (error: any) {
      showToast('error', error.response?.data?.error || 'Failed to create order');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle print
  const handlePrint = async (copies: DyeingPrintCopyType[], method: 'pdf' | 'thermal') => {
    if (!createdOrderId) return;

    setIsPrinting(true);
    try {
      const printData = await dyeingOrdersApi.getPrintData(createdOrderId);

      if (method === 'pdf') {
        await dyeingPrinter.printViaBrowser(printData, copies);
      } else {
        await dyeingPrinter.printViaThermal(printData, copies);
      }

      showToast('success', 'Print job sent successfully');
      setShowPrintModal(false);
      router.push('/dyeing');
    } catch (error: any) {
      showToast('error', 'Failed to print: ' + (error.message || 'Unknown error'));
    } finally {
      setIsPrinting(false);
    }
  };

  // Skip printing
  const handleSkipPrint = () => {
    setShowPrintModal(false);
    router.push('/dyeing');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
        <span className="ml-3 text-neutral-400">Loading...</span>
      </div>
    );
  }

  // Can proceed to entries
  const canProceedToEntries = selectedVendor !== null;

  // Can proceed to confirm
  const canProceedToConfirm = fabricEntries.length > 0;

  // Is editing an entry
  const isEditing = activeEntryId !== null;

  // Current entry is valid
  const currentEntryValid = selectedFabricId !== null && scannedRolls.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm">
            <Link href="/dyeing" className="text-neutral-400 hover:text-white">
              Dyeing
            </Link>
            <span className="text-neutral-600">/</span>
            <span className="text-white">Send for Dyeing</span>
          </div>
          <h1 className="text-2xl font-semibold text-white mt-2">Send Rolls for Dyeing</h1>
          <p className="text-neutral-400 text-sm mt-1">
            Scan QR codes to add rolls, assign colors, and create dyeing order
          </p>
        </div>
        <Link href="/dyeing">
          <Button variant="ghost">Cancel</Button>
        </Link>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-4 p-4 bg-factory-dark rounded-xl border border-factory-border">
        <button
          onClick={() => setCurrentStep('vendor')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg transition-colors',
            currentStep === 'vendor'
              ? 'bg-primary-500/20 text-primary-400'
              : selectedVendor
                ? 'text-green-400'
                : 'text-neutral-400'
          )}
        >
          {selectedVendor ? (
            <Check className="w-5 h-5" />
          ) : (
            <span className="w-5 h-5 flex items-center justify-center text-xs font-bold">1</span>
          )}
          <span className="font-medium">Vendor</span>
          {selectedVendor && (
            <span className="text-xs text-neutral-400">({selectedVendor.name})</span>
          )}
        </button>

        <ChevronRight className="w-4 h-4 text-neutral-600" />

        <button
          onClick={() => canProceedToEntries && setCurrentStep('entries')}
          disabled={!canProceedToEntries}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg transition-colors',
            currentStep === 'entries'
              ? 'bg-primary-500/20 text-primary-400'
              : fabricEntries.length > 0
                ? 'text-green-400'
                : canProceedToEntries
                  ? 'text-neutral-400 hover:text-white'
                  : 'text-neutral-600 cursor-not-allowed'
          )}
        >
          {fabricEntries.length > 0 ? (
            <Check className="w-5 h-5" />
          ) : (
            <span className="w-5 h-5 flex items-center justify-center text-xs font-bold">2</span>
          )}
          <span className="font-medium">Fabric Entries</span>
          {fabricEntries.length > 0 && (
            <span className="text-xs text-neutral-400">({fabricEntries.length})</span>
          )}
        </button>

        <ChevronRight className="w-4 h-4 text-neutral-600" />

        <button
          onClick={() => canProceedToConfirm && setCurrentStep('confirm')}
          disabled={!canProceedToConfirm}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg transition-colors',
            currentStep === 'confirm'
              ? 'bg-primary-500/20 text-primary-400'
              : canProceedToConfirm
                ? 'text-neutral-400 hover:text-white'
                : 'text-neutral-600 cursor-not-allowed'
          )}
        >
          <span className="w-5 h-5 flex items-center justify-center text-xs font-bold">3</span>
          <span className="font-medium">Confirm</span>
        </button>
      </div>

      {/* Step 1: Vendor Selection */}
      {currentStep === 'vendor' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-primary-500/20 rounded-lg flex items-center justify-center">
                  <Truck className="w-5 h-5 text-primary-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Select Dyeing Vendor</h3>
                  <p className="text-sm text-neutral-400">Choose vendor to send rolls for dyeing</p>
                </div>
              </div>

              {vendors.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-neutral-400 mb-4">No dyeing vendors available</p>
                  <Link href="/dyeing/vendors/new">
                    <Button variant="secondary">Add Vendor</Button>
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {vendors.map((vendor) => (
                    <button
                      key={vendor.id}
                      type="button"
                      onClick={() => setSelectedVendor(vendor)}
                      className={cn(
                        'p-4 rounded-xl border text-left transition-all',
                        selectedVendor?.id === vendor.id
                          ? 'bg-primary-500/10 border-primary-500'
                          : 'bg-factory-gray/30 border-factory-border hover:border-neutral-600'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-white">{vendor.name}</p>
                          <p className="text-sm text-neutral-500">{vendor.code}</p>
                        </div>
                        {selectedVendor?.id === vendor.id && (
                          <div className="w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center">
                            <Check className="w-4 h-4 text-white" />
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            {/* Quick Summary */}
            <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Order Summary</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-neutral-400">Vendor</span>
                  <span className="text-white">{selectedVendor?.name || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Fabric Entries</span>
                  <span className="text-white">{fabricEntries.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Total Rolls</span>
                  <span className="text-white">{totalRolls}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Total Weight</span>
                  <span className="text-primary-400 font-medium">{totalWeight.toFixed(2)} kg</span>
                </div>
              </div>
            </div>

            {/* Next Step Button */}
            <Button
              className="w-full"
              disabled={!canProceedToEntries}
              onClick={() => setCurrentStep('entries')}
            >
              Continue to Fabric Entries
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Fabric Entries */}
      {currentStep === 'entries' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Entry List */}
          <div className="space-y-4">
            <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Fabric Entries</h3>
                <span className="text-sm text-neutral-400">{fabricEntries.length} entries</span>
              </div>

              {fabricEntries.length === 0 && !isEditing ? (
                <div className="text-center py-8">
                  <Layers className="w-12 h-12 text-neutral-600 mx-auto mb-3" />
                  <p className="text-neutral-400 text-sm">No entries yet</p>
                  <p className="text-neutral-500 text-xs mt-1">Add your first fabric entry</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {fabricEntries.map((entry) => (
                    <FabricEntryCard
                      key={entry.id}
                      entry={entry}
                      isSelected={activeEntryId === entry.id}
                      onClick={() => editEntry(entry)}
                      onRemove={() => removeEntry(entry.id)}
                      compact
                    />
                  ))}
                </div>
              )}

              {!isEditing && (
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full mt-4"
                  onClick={startNewEntry}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Entry
                </Button>
              )}
            </div>

            {/* Summary */}
            <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
              <h3 className="text-sm font-medium text-neutral-400 mb-3">Order Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-neutral-400">Vendor</span>
                  <span className="text-white">{selectedVendor?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Entries</span>
                  <span className="text-white">{fabricEntries.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Total Rolls</span>
                  <span className="text-white">{totalRolls}</span>
                </div>
                <div className="border-t border-factory-border pt-2 flex justify-between">
                  <span className="text-neutral-300 font-medium">Total Weight</span>
                  <span className="text-primary-400 font-semibold">{totalWeight.toFixed(2)} kg</span>
                </div>
              </div>

              <Button
                className="w-full mt-4"
                disabled={!canProceedToConfirm}
                onClick={() => setShowPreviewModal(true)}
              >
                Preview & Confirm
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>

          {/* Right: Entry Form */}
          <div className="lg:col-span-2">
            {isEditing ? (
              <div className="bg-factory-dark rounded-2xl border border-factory-border p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">
                    {fabricEntries.some((e) => e.id === activeEntryId) ? 'Edit Entry' : 'New Entry'}
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveEntryId(null);
                      setSelectedFabricId(null);
                      setScannedRolls([]);
                      setSelectedColor(null);
                      setEntryNotes('');
                    }}
                    className="p-2 text-neutral-400 hover:text-white hover:bg-factory-gray rounded-lg"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Fabric Selection */}
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">
                    Fabric Template *
                  </label>
                  <select
                    value={selectedFabricId || ''}
                    onChange={(e) => setSelectedFabricId(e.target.value ? parseInt(e.target.value) : null)}
                    className="w-full px-4 py-3 rounded-xl bg-factory-gray border border-factory-border text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Select fabric...</option>
                    {fabrics.map((fabric) => (
                      <option key={fabric.id} value={fabric.id}>
                        {fabric.name} ({fabric.code})
                      </option>
                    ))}
                  </select>
                </div>

                {/* QR Scanner */}
                <RollQRScanner
                  onRollScanned={handleRollScanned}
                  scannedRolls={scannedRolls}
                  onRemoveRoll={handleRemoveRoll}
                  label="Scan Rolls *"
                  fabricName={selectedFabric?.name || 'Unknown'}
                  fabricId={selectedFabricId}
                />

                {/* Color Selector */}
                <ColorSelector
                  selectedColorId={selectedColor?.id}
                  onColorSelect={handleColorSelect}
                  onAddNewColor={() => setShowAddColorModal(true)}
                  label="Color (Optional)"
                  allowClear
                />

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={entryNotes}
                    onChange={(e) => setEntryNotes(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-factory-gray border border-factory-border text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                    rows={2}
                    placeholder="Any special instructions for this fabric..."
                  />
                </div>

                {/* Actions */}
                <div className="flex justify-between items-center pt-4 border-t border-factory-border">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setActiveEntryId(null);
                      setSelectedFabricId(null);
                      setScannedRolls([]);
                      setSelectedColor(null);
                      setEntryNotes('');
                    }}
                  >
                    Cancel
                  </Button>
                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={!currentEntryValid}
                      onClick={saveAndAddAnother}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Save & Add Another
                    </Button>
                    <Button
                      type="button"
                      variant="primary"
                      disabled={!currentEntryValid}
                      onClick={saveCurrentEntry}
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Save Entry
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-factory-dark rounded-2xl border border-factory-border p-12 text-center">
                <Layers className="w-16 h-16 text-neutral-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">No Entry Selected</h3>
                <p className="text-neutral-400 mb-6">
                  Click &quot;Add Entry&quot; to create a new fabric entry, or click an existing entry to edit it.
                </p>
                <Button onClick={startNewEntry}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add New Entry
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 3: Confirm */}
      {currentStep === 'confirm' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-factory-dark rounded-2xl border border-factory-border p-6 space-y-6">
              <h3 className="text-lg font-semibold text-white">Review Order</h3>

              {/* Vendor */}
              <div className="p-4 bg-factory-gray/30 rounded-xl">
                <div className="flex items-center gap-3">
                  <Truck className="w-5 h-5 text-primary-400" />
                  <div>
                    <p className="text-sm text-neutral-400">Dyeing Vendor</p>
                    <p className="text-white font-medium">{selectedVendor?.name}</p>
                  </div>
                </div>
              </div>

              {/* Entries */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-neutral-300">
                  Fabric Entries ({fabricEntries.length})
                </h4>
                {fabricEntries.map((entry) => (
                  <FabricEntryCard key={entry.id} entry={entry} showRemove={false} />
                ))}
              </div>

              {/* Order Notes */}
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Order Notes (Optional)
                </label>
                <textarea
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-factory-gray border border-factory-border text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                  rows={2}
                  placeholder="General notes for this order..."
                />
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Order Summary</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-neutral-400">Vendor</span>
                  <span className="text-white">{selectedVendor?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Fabric Entries</span>
                  <span className="text-white">{fabricEntries.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Total Rolls</span>
                  <span className="text-white">{totalRolls}</span>
                </div>
                <div className="border-t border-factory-border pt-3 flex justify-between">
                  <span className="text-neutral-300 font-medium">Total Weight</span>
                  <span className="text-primary-400 font-semibold text-lg">{totalWeight.toFixed(2)} kg</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <Button
                className="w-full"
                onClick={() => setShowPreviewModal(true)}
                disabled={isSubmitting}
              >
                <Check className="w-4 h-4 mr-2" />
                Confirm & Create Order
              </Button>
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => setCurrentStep('entries')}
              >
                Back to Entries
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <AddColorModal
        isOpen={showAddColorModal}
        onClose={() => setShowAddColorModal(false)}
        onColorCreated={handleColorCreated}
      />

      <DyeingPreviewModal
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        onConfirm={handleSubmit}
        vendor={selectedVendor}
        fabricEntries={fabricEntries}
        notes={orderNotes}
        isLoading={isSubmitting}
      />

      <PrintOptionsModal
        isOpen={showPrintModal}
        onClose={handleSkipPrint}
        onPrint={handlePrint}
        orderNumber={createdOrderNumber}
        isLoading={isPrinting}
      />
    </div>
  );
}
