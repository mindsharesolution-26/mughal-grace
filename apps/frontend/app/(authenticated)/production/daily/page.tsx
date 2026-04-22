'use client';

import { useState } from 'react';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { useToast } from '@/contexts/ToastContext';
import { productsApi } from '@/lib/api/products';
import { ProductFinder } from '@/components/organisms/ProductFinder';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  X,
  Scale,
  CheckCircle,
  Wifi,
  WifiOff,
  Package,
  FileSpreadsheet,
} from 'lucide-react';

// Mock machine data for the dropdown
const mockMachines = Array.from({ length: 50 }, (_, i) => ({
  id: i + 1,
  number: i + 1,
  status: i < 38 ? 'RUNNING' : 'IDLE',
  currentProduct: i < 38 ? `Product ${100 + (i % 20)}` : null,
}));

// Destination options for Fabric Out
const DESTINATIONS = [
  { value: 'DYEING', label: 'Dyeing' },
  { value: 'SALE', label: 'Sale' },
  { value: 'TRANSFER', label: 'Transfer' },
  { value: 'OTHER', label: 'Other' },
];

type ActivePanel = 'none' | 'fabric-in' | 'fabric-out';

export default function DailyProductionPage() {
  const { showToast } = useToast();
  const [activePanel, setActivePanel] = useState<ActivePanel>('none');

  // Shared state
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [weight, setWeight] = useState('');
  const [isWeighingConnected, setIsWeighingConnected] = useState(true);

  // Fabric In specific state
  const [machineId, setMachineId] = useState('');
  const [rollNumber, setRollNumber] = useState('');

  // Fabric Out specific state
  const [destination, setDestination] = useState('');
  const [notes, setNotes] = useState('');

  // Simulate weight detection
  const simulateWeightDetection = () => {
    const detectedWeight = (15 + Math.random() * 10).toFixed(2);
    setWeight(detectedWeight);
    showToast('success', `Weight detected: ${detectedWeight} kg`);
  };

  // Reset form
  const resetForm = () => {
    setSelectedProduct(null);
    setWeight('');
    setMachineId('');
    setRollNumber('');
    setDestination('');
    setNotes('');
  };

  // Close panel
  const closePanel = () => {
    setActivePanel('none');
    resetForm();
  };

  // Handle Fabric In submission
  const handleFabricIn = async () => {
    if (!selectedProduct) {
      showToast('error', 'Please select a product');
      return;
    }
    if (!weight || Number(weight) <= 0) {
      showToast('error', 'Please enter or detect weight');
      return;
    }
    if (!machineId) {
      showToast('error', 'Please select a machine');
      return;
    }

    setIsSubmitting(true);
    try {
      await productsApi.recordStockMovement({
        productId: selectedProduct.id,
        type: 'IN',
        quantity: Number(weight),
        referenceNumber: rollNumber || `ROLL-${Date.now()}`,
        sourceType: 'PRODUCTION',
        notes: `Machine #${machineId}`,
      });

      showToast('success', `Fabric In: ${weight} kg of ${selectedProduct.name} recorded`);
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
            <p className="text-xs text-neutral-400">Record production from machines</p>
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

        {/* Machine Selection */}
        <div>
          <label className="block text-sm font-medium text-neutral-300 mb-1.5">Machine *</label>
          <select
            value={machineId}
            onChange={(e) => setMachineId(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-factory-gray border border-factory-border text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Select Machine</option>
            {mockMachines.filter(m => m.status === 'RUNNING').map((machine) => (
              <option key={machine.id} value={machine.id}>
                #{machine.number} - {machine.currentProduct}
              </option>
            ))}
          </select>
        </div>

        {/* Product Finder */}
        <ProductFinder
          onProductSelect={setSelectedProduct}
          selectedProduct={selectedProduct}
          onClear={() => setSelectedProduct(null)}
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
          onClick={handleFabricIn}
          disabled={isSubmitting || !selectedProduct || !weight || !machineId}
        >
          {isSubmitting ? (
            'Recording...'
          ) : (
            <span className="flex items-center justify-center gap-2">
              <CheckCircle className="w-5 h-5" />
              Record Fabric In ({weight || '0'} kg)
            </span>
          )}
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
            <p className="text-neutral-400">
              Record fabric coming from machines into stock. Uses weighing scale and machine selection.
            </p>
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
    </div>
  );
}
