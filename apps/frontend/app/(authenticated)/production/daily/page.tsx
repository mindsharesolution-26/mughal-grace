'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { useToast } from '@/contexts/ToastContext';
import { productsApi } from '@/lib/api/products';
import { rollsApi } from '@/lib/api/rolls';
import { machinesApi } from '@/lib/api/machines';
import { labelPrinter } from '@/lib/services/labelPrinter';
import { ProductFinder } from '@/components/organisms/ProductFinder';
import { FabricFinder } from '@/components/organisms/FabricFinder';
import { FabricProductionLookup } from '@/lib/api/fabrics';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  X,
  Scale,
  CheckCircle,
  Wifi,
  WifiOff,
  Printer,
  QrCode,
  FileSpreadsheet,
} from 'lucide-react';

// Destination options for Fabric Out
const DESTINATIONS = [
  { value: 'DYEING', label: 'Dyeing' },
  { value: 'SALE', label: 'Sale' },
  { value: 'TRANSFER', label: 'Transfer' },
  { value: 'OTHER', label: 'Other' },
];

type ActivePanel = 'none' | 'fabric-in' | 'fabric-out';

interface MachineLookup {
  id: number;
  machineNumber: string;
  name: string;
  status: string;
}

export default function DailyProductionPage() {
  const { showToast } = useToast();
  const [activePanel, setActivePanel] = useState<ActivePanel>('none');

  // Machine data from API
  const [machines, setMachines] = useState<MachineLookup[]>([]);
  const [loadingMachines, setLoadingMachines] = useState(true);

  // Fabric In state
  const [selectedFabric, setSelectedFabric] = useState<FabricProductionLookup | null>(null);

  // Fabric Out state (uses Product)
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  // Shared state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [weight, setWeight] = useState('');
  const [isWeighingConnected, setIsWeighingConnected] = useState(true);

  // Fabric In specific state
  const [machineId, setMachineId] = useState('');
  const [rollNumber, setRollNumber] = useState('');

  // Fabric Out specific state
  const [destination, setDestination] = useState('');
  const [notes, setNotes] = useState('');

  // Label printing state
  const [isPrinting, setIsPrinting] = useState(false);
  const [lastCreatedRoll, setLastCreatedRoll] = useState<any>(null);

  // Preview modal state
  const [showPreview, setShowPreview] = useState(false);

  // Load machines on mount
  useEffect(() => {
    async function loadMachines() {
      try {
        const data = await machinesApi.getLookup();
        setMachines(data);
      } catch (error) {
        console.error('Failed to load machines:', error);
        showToast('error', 'Failed to load machines');
      } finally {
        setLoadingMachines(false);
      }
    }
    loadMachines();
  }, []);

  // Simulate weight detection
  const simulateWeightDetection = () => {
    const detectedWeight = (15 + Math.random() * 10).toFixed(2);
    setWeight(detectedWeight);
    showToast('success', `Weight detected: ${detectedWeight} kg`);
  };

  // Reset form
  const resetForm = () => {
    setSelectedFabric(null);
    setSelectedProduct(null);
    setWeight('');
    setMachineId('');
    setRollNumber('');
    setDestination('');
    setNotes('');
    setLastCreatedRoll(null);
  };

  // Close panel
  const closePanel = () => {
    setActivePanel('none');
    resetForm();
  };

  // Print QR label for a roll
  const printRollLabel = async (roll: any) => {
    if (!roll?.qrCode) {
      showToast('error', 'Roll does not have a QR code');
      return;
    }

    setIsPrinting(true);
    try {
      const labelData = {
        qrCode: roll.qrCode,
        rollNumber: roll.rollNumber,
        weight: Number(roll.greyWeight),
        fabricType: roll.fabricType,
        date: new Date().toLocaleDateString(),
        machineNumber: roll.machine?.machineNumber,
      };

      const result = await labelPrinter.print(labelData);

      if (result.success) {
        showToast('success', `Label printed via ${result.method}`);
      } else {
        showToast('error', 'Failed to print label');
      }
    } catch (error) {
      console.error('Print error:', error);
      showToast('error', 'Failed to print label');
    } finally {
      setIsPrinting(false);
    }
  };

  // Show preview before submitting
  const showFabricInPreview = () => {
    if (!selectedFabric) {
      showToast('error', 'Please select a fabric');
      return;
    }
    if (!weight || Number(weight) <= 0) {
      showToast('error', 'Please enter or detect weight');
      return;
    }
    if (!selectedFabric.machineId) {
      showToast('error', 'Selected fabric does not have a machine assigned');
      return;
    }
    setShowPreview(true);
  };

  // Get selected machine details from fabric
  const getSelectedMachine = () => {
    return selectedFabric?.machine || null;
  };

  // Handle Fabric In submission - CREATES ROLL WITH QR CODE
  const handleFabricIn = async () => {
    if (!selectedFabric) return;

    setIsSubmitting(true);
    try {
      // Create Roll record with QR code, linked to Fabric template
      const response = await rollsApi.create({
        fabricId: selectedFabric.id,
        greyWeight: Number(weight),
        rollNumber: rollNumber || undefined,
      });

      const roll = response.data;
      setLastCreatedRoll(roll);

      // Auto-print QR label
      await printRollLabel(roll);

      showToast('success', `Roll ${roll.rollNumber} created (${weight} kg) - Label printed`);
      setShowPreview(false);
      resetForm();
      setActivePanel('none');
    } catch (error: any) {
      showToast('error', error.response?.data?.error || 'Failed to record fabric in');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Fabric Out submission
  const handleFabricOut = async () => {
    if (!selectedProduct) {
      showToast('error', 'Please select a product');
      return;
    }
    if (!weight || Number(weight) <= 0) {
      showToast('error', 'Please enter or detect weight');
      return;
    }
    if (!destination) {
      showToast('error', 'Please select a destination');
      return;
    }

    setIsSubmitting(true);
    try {
      await productsApi.recordStockMovement({
        productId: selectedProduct.id,
        type: 'OUT',
        quantity: Number(weight),
        referenceNumber: `OUT-${Date.now()}`,
        sourceType: destination,
        notes: notes || undefined,
      });

      showToast('success', `Fabric Out: ${weight} kg of ${selectedProduct.name} to ${destination}`);
      resetForm();
      setActivePanel('none');
    } catch (error: any) {
      showToast('error', error.response?.data?.error || 'Failed to record fabric out');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Weighing Machine Status Component
  const WeighingStatus = () => (
    <div className={`rounded-xl border p-3 flex items-center gap-3 ${
      isWeighingConnected
        ? 'bg-emerald-500/5 border-emerald-500/20'
        : 'bg-red-500/5 border-red-500/20'
    }`}>
      {isWeighingConnected ? (
        <Wifi className="w-5 h-5 text-emerald-400" />
      ) : (
        <WifiOff className="w-5 h-5 text-red-400" />
      )}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${isWeighingConnected ? 'text-emerald-400' : 'text-red-400'}`}>
          {isWeighingConnected ? 'Scale Connected' : 'Scale Disconnected'}
        </p>
      </div>
      <Button size="sm" variant="ghost" onClick={simulateWeightDetection}>
        Test
      </Button>
    </div>
  );

  // Weight Display Component
  const WeightDisplay = () => (
    <div className="bg-factory-gray rounded-xl p-6 text-center">
      <div className="flex items-center justify-center gap-2 mb-1">
        <Scale className="w-5 h-5 text-neutral-400" />
        <p className="text-sm text-neutral-400">Weight</p>
      </div>
      <div className="text-5xl font-bold text-white font-mono">
        {weight || '0.00'}
      </div>
      <p className="text-lg text-neutral-400 mt-1">kg</p>
      <Input
        className="mt-4"
        placeholder="Or enter manually"
        type="number"
        step="0.01"
        value={weight}
        onChange={(e) => setWeight(e.target.value)}
      />
    </div>
  );

  // Fabric In Panel
  const FabricInPanel = () => (
    <div className="h-full flex flex-col">
      {/* Panel Header */}
      <div className="p-4 border-b border-factory-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
            <ArrowDownToLine className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Fabric In</h2>
            <p className="text-xs text-neutral-400">Record production + print QR label</p>
          </div>
        </div>
        <button
          onClick={closePanel}
          className="p-2 text-neutral-400 hover:text-white hover:bg-factory-gray rounded-lg"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <WeighingStatus />
        <WeightDisplay />

        {/* QR Code Info Banner */}
        <div className="bg-primary-500/10 border border-primary-500/20 rounded-xl p-3 flex items-center gap-3">
          <QrCode className="w-5 h-5 text-primary-400 flex-shrink-0" />
          <p className="text-sm text-primary-300">
            A QR code label will be auto-printed when you record fabric in
          </p>
        </div>

        {/* Fabric Finder */}
        <FabricFinder
          onFabricSelect={(fabric) => {
            setSelectedFabric(fabric);
            if (fabric?.machineId) {
              setMachineId(String(fabric.machineId));
            } else {
              setMachineId('');
            }
          }}
          selectedFabric={selectedFabric}
          onClear={() => {
            setSelectedFabric(null);
            setMachineId('');
          }}
        />

        {/* Roll Number */}
        <Input
          label="Roll Number (Optional)"
          placeholder="Auto-generated if empty"
          value={rollNumber}
          onChange={(e) => setRollNumber(e.target.value)}
        />
      </div>

      {/* Submit Button */}
      <div className="p-4 border-t border-factory-border bg-factory-dark">
        <Button
          className="w-full py-3"
          onClick={showFabricInPreview}
          disabled={isSubmitting || isPrinting || !selectedFabric || !weight || !selectedFabric?.machineId}
        >
          <span className="flex items-center justify-center gap-2">
            <QrCode className="w-5 h-5" />
            Record Fabric In ({weight || '0'} kg)
          </span>
        </Button>
      </div>
    </div>
  );

  // Fabric Out Panel
  const FabricOutPanel = () => (
    <div className="h-full flex flex-col">
      {/* Panel Header */}
      <div className="p-4 border-b border-factory-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
            <ArrowUpFromLine className="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Fabric Out</h2>
            <p className="text-xs text-neutral-400">Record fabric going out</p>
          </div>
        </div>
        <button
          onClick={closePanel}
          className="p-2 text-neutral-400 hover:text-white hover:bg-factory-gray rounded-lg"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <WeighingStatus />
        <WeightDisplay />

        {/* Product Finder */}
        <ProductFinder
          onProductSelect={setSelectedProduct}
          selectedProduct={selectedProduct}
          onClear={() => setSelectedProduct(null)}
        />

        {/* Destination Selection */}
        <div>
          <label className="block text-sm font-medium text-neutral-300 mb-1.5">Destination *</label>
          <select
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-factory-gray border border-factory-border text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Select Destination</option>
            {DESTINATIONS.map((dest) => (
              <option key={dest.value} value={dest.value}>
                {dest.label}
              </option>
            ))}
          </select>
        </div>

        {/* Notes */}
        <Input
          label="Notes (Optional)"
          placeholder="Additional details..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      {/* Submit Button */}
      <div className="p-4 border-t border-factory-border bg-factory-dark">
        <Button
          className="w-full py-3"
          variant="secondary"
          onClick={handleFabricOut}
          disabled={isSubmitting || !selectedProduct || !weight || !destination}
        >
          {isSubmitting ? (
            'Recording...'
          ) : (
            <span className="flex items-center justify-center gap-2">
              <CheckCircle className="w-5 h-5" />
              Record Fabric Out ({weight || '0'} kg)
            </span>
          )}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-primary-500/20 flex items-center justify-center">
            <FileSpreadsheet className="w-5 h-5 text-primary-400" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-white">Daily Production</h1>
            <p className="text-neutral-400">Record fabric movements in and out of production</p>
          </div>
        </div>
      </div>

      {/* Main Buttons */}
      {activePanel === 'none' && (
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
          {/* Fabric In Card */}
          <button
            onClick={() => setActivePanel('fabric-in')}
            className="group bg-factory-dark hover:bg-factory-gray border border-factory-border hover:border-emerald-500/50 rounded-2xl p-8 text-left transition-all"
          >
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <ArrowDownToLine className="w-8 h-8 text-emerald-400" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">Fabric In</h2>
            <p className="text-neutral-400 mb-3">
              Record fabric coming from machines into stock. Automatically generates QR code and prints label.
            </p>
            <div className="flex items-center gap-2 text-sm text-primary-400">
              <QrCode className="w-4 h-4" />
              <span>Auto-prints QR label</span>
            </div>
          </button>

          {/* Fabric Out Card */}
          <button
            onClick={() => setActivePanel('fabric-out')}
            className="group bg-factory-dark hover:bg-factory-gray border border-factory-border hover:border-orange-500/50 rounded-2xl p-8 text-left transition-all"
          >
            <div className="w-16 h-16 rounded-2xl bg-orange-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <ArrowUpFromLine className="w-8 h-8 text-orange-400" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">Fabric Out</h2>
            <p className="text-neutral-400">
              Record fabric going out for dyeing, sale, or transfer. Track destinations.
            </p>
          </button>
        </div>
      )}

      {/* Panel Overlay */}
      {activePanel !== 'none' && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60" onClick={closePanel} />
          <div className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-factory-dark border-l border-factory-border animate-in slide-in-from-right duration-300">
            {activePanel === 'fabric-in' && <FabricInPanel />}
            {activePanel === 'fabric-out' && <FabricOutPanel />}
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && selectedFabric && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => !isSubmitting && setShowPreview(false)} />
          <div className="relative bg-factory-dark border border-factory-border rounded-2xl w-full max-w-md animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-factory-border">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                  <QrCode className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Confirm Roll Details</h3>
                  <p className="text-sm text-neutral-400">Review before printing label</p>
                </div>
              </div>
            </div>

            {/* Modal Body - Roll Preview */}
            <div className="p-5 space-y-4">
              {/* QR Code Preview Placeholder */}
              <div className="bg-white rounded-xl p-4 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-24 h-24 bg-neutral-100 rounded-lg mx-auto mb-2 flex items-center justify-center border-2 border-dashed border-neutral-300">
                    <QrCode className="w-12 h-12 text-neutral-400" />
                  </div>
                  <p className="text-xs text-neutral-500">QR Code will be generated</p>
                </div>
              </div>

              {/* Roll Details */}
              <div className="bg-factory-gray rounded-xl p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-neutral-400">Fabric</span>
                  <span className="text-sm font-medium text-white">{selectedFabric.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-neutral-400">Code</span>
                  <span className="text-sm font-mono text-primary-400">{selectedFabric.code}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-neutral-400">Weight</span>
                  <span className="text-lg font-bold text-emerald-400">{weight} kg</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-neutral-400">Machine</span>
                  <span className="text-sm font-medium text-white">
                    #{getSelectedMachine()?.machineNumber} - {getSelectedMachine()?.name}
                  </span>
                </div>
                {rollNumber && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-neutral-400">Roll Number</span>
                    <span className="text-sm font-medium text-white">{rollNumber}</span>
                  </div>
                )}
                {!rollNumber && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-neutral-400">Roll Number</span>
                    <span className="text-sm text-neutral-500 italic">Auto-generated</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-sm text-neutral-400">Date</span>
                  <span className="text-sm font-medium text-white">{new Date().toLocaleDateString()}</span>
                </div>
              </div>

              {/* Info Note */}
              <div className="bg-primary-500/10 border border-primary-500/20 rounded-lg p-3 flex items-start gap-2">
                <Printer className="w-4 h-4 text-primary-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-primary-300">
                  Clicking "Print" will save the roll record and automatically print a QR code label.
                </p>
              </div>
            </div>

            {/* Modal Footer - Actions */}
            <div className="p-5 border-t border-factory-border flex gap-3">
              <Button
                variant="ghost"
                className="flex-1"
                onClick={() => setShowPreview(false)}
                disabled={isSubmitting}
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleFabricIn}
                disabled={isSubmitting || isPrinting}
              >
                {isSubmitting || isPrinting ? (
                  <span className="flex items-center justify-center gap-2">
                    {isPrinting ? <Printer className="w-4 h-4 animate-pulse" /> : null}
                    {isSubmitting ? 'Saving...' : 'Printing...'}
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <Printer className="w-4 h-4" />
                    Print
                  </span>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
