'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { useToast } from '@/contexts/ToastContext';
import { productsApi } from '@/lib/api/products';
import { ProductFinder } from '@/components/organisms/ProductFinder';
import {
  Factory,
  Play,
  Pause,
  Wrench,
  AlertTriangle,
  X,
  Scale,
  CheckCircle,
  Wifi,
  WifiOff,
  TrendingUp,
  Clock,
  Package,
  ChevronRight,
} from 'lucide-react';

// Mock machine data - deterministic values
const mockMachines = Array.from({ length: 50 }, (_, i) => ({
  id: i + 1,
  number: i + 1,
  name: `Machine ${i + 1}`,
  status: i < 38 ? 'RUNNING' : i < 42 ? 'IDLE' : i < 47 ? 'MAINTENANCE' : 'DOWN',
  currentOperator: i < 38 ? `Operator ${(i % 10) + 1}` : null,
  fabricType: i < 38 ? ['Single Jersey', 'Rib', 'Interlock'][i % 3] : null,
  materialName: i < 38 ? ['Cotton 100%', 'Polyester Blend', 'Cotton/Lycra'][i % 3] : null,
  colorName: i < 38 ? ['White', 'Black', 'Grey', 'Navy', 'Red'][i % 5] : null,
  shiftProduction: i < 38 ? 30 + ((i * 7) % 50) : 0,
  efficiency: i < 38 ? 75 + ((i * 3) % 20) : 0,
  rollsProduced: i < 38 ? 5 + (i % 8) : 0,
  currentProduct: i < 38 ? `Product ${100 + (i % 20)}` : null,
  articleNumber: i < 38 ? `ART-${1000 + (i % 50)}` : null,
  startTime: i < 38 ? '06:00 AM' : null,
  lastRollTime: i < 38 ? `${8 + (i % 4)}:${(i * 5) % 60 < 10 ? '0' : ''}${(i * 5) % 60} AM` : null,
}));

const statusConfig = {
  RUNNING: {
    color: 'bg-success/20 text-success border-success/30',
    bg: 'bg-success',
    icon: Play,
    label: 'Running',
  },
  IDLE: {
    color: 'bg-warning/20 text-warning border-warning/30',
    bg: 'bg-warning',
    icon: Pause,
    label: 'Idle',
  },
  MAINTENANCE: {
    color: 'bg-primary-500/20 text-primary-400 border-primary-500/30',
    bg: 'bg-primary-500',
    icon: Wrench,
    label: 'Maintenance',
  },
  DOWN: {
    color: 'bg-error/20 text-error border-error/30',
    bg: 'bg-error',
    icon: AlertTriangle,
    label: 'Down',
  },
};

export default function ProductionPage() {
  const { showToast } = useToast();
  const [selectedMachine, setSelectedMachine] = useState<typeof mockMachines[0] | null>(null);
  const [showMobilePanel, setShowMobilePanel] = useState(false);

  // Production log state
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [weight, setWeight] = useState('');
  const [logMachineId, setLogMachineId] = useState('');
  const [rollNumber, setRollNumber] = useState('');

  // Simulate weighing machine connection
  const [isWeighingConnected, setIsWeighingConnected] = useState(true);

  // Calculate stats
  const stats = {
    running: mockMachines.filter((m) => m.status === 'RUNNING').length,
    idle: mockMachines.filter((m) => m.status === 'IDLE').length,
    maintenance: mockMachines.filter((m) => m.status === 'MAINTENANCE').length,
    down: mockMachines.filter((m) => m.status === 'DOWN').length,
  };

  const totalProduction = mockMachines.reduce((sum, m) => sum + m.shiftProduction, 0);
  const avgEfficiency = Math.round(
    mockMachines.filter((m) => m.status === 'RUNNING').reduce((sum, m) => sum + m.efficiency, 0) / stats.running
  );
  const totalRolls = mockMachines.reduce((sum, m) => sum + m.rollsProduced, 0);

  // Simulate weight detection
  const simulateWeightDetection = () => {
    const detectedWeight = (15 + Math.random() * 10).toFixed(2);
    setWeight(detectedWeight);
    showToast('success', `Weight detected: ${detectedWeight} kg`);
  };

  // Submit production log
  const handleSubmitLog = async () => {
    if (!selectedProduct) {
      showToast('error', 'Please select a product');
      return;
    }
    if (!weight || Number(weight) <= 0) {
      showToast('error', 'Waiting for weight from weighing machine');
      return;
    }
    if (!logMachineId) {
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
        notes: `Machine #${logMachineId}`,
      });

      showToast('success', `Roll logged: ${weight} kg of ${selectedProduct.name}`);

      // Reset form
      setSelectedProduct(null);
      setWeight('');
      setRollNumber('');
      // Keep machine selected for continuous production
    } catch (error: any) {
      showToast('error', error.response?.data?.error || 'Failed to log production');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Machine popup
  const MachinePopup = () => {
    if (!selectedMachine) return null;

    const config = statusConfig[selectedMachine.status as keyof typeof statusConfig];
    const StatusIcon = config.icon;

    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setSelectedMachine(null)}>
        <div className="bg-factory-dark rounded-2xl border border-factory-border w-full max-w-md animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="p-5 border-b border-factory-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${config.bg}/20 flex items-center justify-center`}>
                <StatusIcon className={`w-5 h-5 ${config.bg === 'bg-success' ? 'text-success' : config.bg === 'bg-warning' ? 'text-warning' : config.bg === 'bg-primary-500' ? 'text-primary-400' : 'text-error'}`} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Machine #{selectedMachine.number}</h2>
                <span className={`text-xs px-2 py-0.5 rounded-full ${config.color}`}>{config.label}</span>
              </div>
            </div>
            <button onClick={() => setSelectedMachine(null)} className="p-2 text-neutral-400 hover:text-white hover:bg-factory-gray rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-5">
            {selectedMachine.status === 'RUNNING' ? (
              <div className="space-y-4">
                {/* Production Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 rounded-xl p-4 border border-emerald-500/20">
                    <p className="text-xs text-emerald-400">Production</p>
                    <p className="text-2xl font-bold text-white">{selectedMachine.shiftProduction} <span className="text-sm text-neutral-400">kg</span></p>
                  </div>
                  <div className="bg-factory-gray rounded-xl p-4">
                    <p className="text-xs text-neutral-400">Rolls</p>
                    <p className="text-2xl font-bold text-white">{selectedMachine.rollsProduced}</p>
                  </div>
                </div>

                {/* Efficiency */}
                <div className="bg-factory-gray rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-neutral-400">Efficiency</p>
                    <span className={`text-sm font-semibold ${selectedMachine.efficiency >= 85 ? 'text-success' : selectedMachine.efficiency >= 70 ? 'text-warning' : 'text-error'}`}>
                      {selectedMachine.efficiency}%
                    </span>
                  </div>
                  <div className="h-2 bg-factory-border rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${selectedMachine.efficiency >= 85 ? 'bg-success' : selectedMachine.efficiency >= 70 ? 'bg-warning' : 'bg-error'}`}
                      style={{ width: `${selectedMachine.efficiency}%` }}
                    />
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-2 text-sm">
                  {[
                    { label: 'Operator', value: selectedMachine.currentOperator },
                    { label: 'Product', value: selectedMachine.currentProduct },
                    { label: 'Article', value: selectedMachine.articleNumber, mono: true },
                    { label: 'Fabric', value: selectedMachine.fabricType },
                    { label: 'Material', value: selectedMachine.materialName },
                    { label: 'Color', value: selectedMachine.colorName },
                    { label: 'Shift Start', value: selectedMachine.startTime },
                    { label: 'Last Roll', value: selectedMachine.lastRollTime },
                  ].map((item) => (
                    <div key={item.label} className="flex justify-between py-1.5 border-b border-factory-border/50 last:border-0">
                      <span className="text-neutral-400">{item.label}</span>
                      <span className={`text-white ${item.mono ? 'font-mono text-primary-400' : ''}`}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className={`w-16 h-16 rounded-2xl ${config.bg}/10 flex items-center justify-center mx-auto mb-4`}>
                  <StatusIcon className={`w-8 h-8 ${config.bg === 'bg-warning' ? 'text-warning' : config.bg === 'bg-primary-500' ? 'text-primary-400' : 'text-error'}`} />
                </div>
                <p className="text-neutral-400">
                  {selectedMachine.status === 'IDLE' && 'Machine is idle - no active production'}
                  {selectedMachine.status === 'MAINTENANCE' && 'Machine is under scheduled maintenance'}
                  {selectedMachine.status === 'DOWN' && 'Machine is down - requires immediate attention'}
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-5 border-t border-factory-border">
            <Button className="w-full" onClick={() => setSelectedMachine(null)}>Close</Button>
          </div>
        </div>
      </div>
    );
  };

  // Log Roll Panel Component
  const LogRollPanel = () => (
    <div className="h-full flex flex-col">
      {/* Panel Header */}
      <div className="p-4 border-b border-factory-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-500/20 flex items-center justify-center">
            <Package className="w-5 h-5 text-primary-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Log Roll</h2>
            <p className="text-xs text-neutral-400">Record production output</p>
          </div>
        </div>
        <button
          onClick={() => setShowMobilePanel(false)}
          className="lg:hidden p-2 text-neutral-400 hover:text-white hover:bg-factory-gray rounded-lg"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Weighing Machine Status */}
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

        {/* Weight Display */}
        <div className="bg-factory-gray rounded-xl p-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Scale className="w-5 h-5 text-neutral-400" />
            <p className="text-sm text-neutral-400">Detected Weight</p>
          </div>
          <div className="text-5xl font-bold text-white font-mono">
            {weight || '0.00'}
          </div>
          <p className="text-lg text-neutral-400 mt-1">kg</p>
          {!weight && (
            <p className="text-xs text-neutral-500 mt-3">Place roll on weighing scale</p>
          )}
        </div>

        {/* Machine Selection */}
        <div>
          <label className="block text-sm font-medium text-neutral-300 mb-1.5">Machine *</label>
          <select
            value={logMachineId}
            onChange={(e) => setLogMachineId(e.target.value)}
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

      {/* Submit Button - Fixed at bottom */}
      <div className="p-4 border-t border-factory-border bg-factory-dark">
        <Button
          className="w-full py-3"
          onClick={handleSubmitLog}
          disabled={isSubmitting || !selectedProduct || !weight || !logMachineId}
        >
          {isSubmitting ? (
            'Logging...'
          ) : (
            <span className="flex items-center justify-center gap-2">
              <CheckCircle className="w-5 h-5" />
              Log Roll ({weight || '0'} kg)
            </span>
          )}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-white">Production</h1>
          <p className="text-neutral-400 mt-1">Monitor machines and log production output</p>
        </div>
        <Button className="lg:hidden" onClick={() => setShowMobilePanel(true)}>
          <Package className="w-4 h-4 mr-2" />
          Log Roll
        </Button>
      </div>

      {/* Main Layout */}
      <div className="flex gap-6 h-[calc(100%-5rem)]">
        {/* Left Side - Overview */}
        <div className="flex-1 space-y-6 overflow-y-auto pr-2">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 rounded-2xl border border-emerald-500/20 p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <p className="text-sm text-emerald-400">Today's Output</p>
              </div>
              <p className="text-3xl font-bold text-white">{totalProduction}</p>
              <p className="text-sm text-neutral-400">kg produced</p>
            </div>

            <div className="bg-factory-dark rounded-2xl border border-factory-border p-4">
              <div className="flex items-center gap-2 mb-2">
                <Package className="w-4 h-4 text-primary-400" />
                <p className="text-sm text-neutral-400">Rolls</p>
              </div>
              <p className="text-3xl font-bold text-white">{totalRolls}</p>
              <p className="text-sm text-neutral-400">completed</p>
            </div>

            <div className="bg-factory-dark rounded-2xl border border-factory-border p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-primary-400" />
                <p className="text-sm text-neutral-400">Efficiency</p>
              </div>
              <p className={`text-3xl font-bold ${avgEfficiency >= 85 ? 'text-success' : avgEfficiency >= 70 ? 'text-warning' : 'text-error'}`}>
                {avgEfficiency}%
              </p>
              <p className="text-sm text-neutral-400">average</p>
            </div>

            <div className="bg-factory-dark rounded-2xl border border-factory-border p-4">
              <div className="flex items-center gap-2 mb-2">
                <Factory className="w-4 h-4 text-primary-400" />
                <p className="text-sm text-neutral-400">Machines</p>
              </div>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold text-success">{stats.running}</p>
                <p className="text-lg text-neutral-500">/ 50</p>
              </div>
              <p className="text-sm text-neutral-400">running</p>
            </div>
          </div>

          {/* Machine Grid */}
          <div className="bg-factory-dark rounded-2xl border border-factory-border p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-white">Machine Status</h2>
                <p className="text-sm text-neutral-400">Click any machine for details</p>
              </div>
            </div>

            <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
              {mockMachines.map((machine) => {
                const config = statusConfig[machine.status as keyof typeof statusConfig];
                return (
                  <button
                    key={machine.id}
                    onClick={() => setSelectedMachine(machine)}
                    className={`aspect-square rounded-lg flex flex-col items-center justify-center text-xs font-medium border transition-all hover:scale-105 cursor-pointer ${config.color}`}
                  >
                    <span className="font-bold">{machine.number}</span>
                    {machine.status === 'RUNNING' && (
                      <span className="text-[10px] opacity-80">{machine.shiftProduction}kg</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 mt-5 pt-4 border-t border-factory-border text-sm text-neutral-400">
              {Object.entries(statusConfig).map(([key, config]) => (
                <span key={key} className="flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-full ${config.bg}`} />
                  {config.label} ({stats[key.toLowerCase() as keyof typeof stats]})
                </span>
              ))}
            </div>
          </div>

          {/* Recent Production Logs - Placeholder */}
          <div className="bg-factory-dark rounded-2xl border border-factory-border p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Recent Production</h2>
              <Button variant="ghost" size="sm">
                View All <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
            <div className="text-center py-8 text-neutral-500">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Production logs will appear here</p>
              <p className="text-sm">Log a roll to get started</p>
            </div>
          </div>
        </div>

        {/* Right Side - Log Roll Panel (Desktop) */}
        <div className="hidden lg:block w-96 bg-factory-dark rounded-2xl border border-factory-border overflow-hidden">
          <LogRollPanel />
        </div>
      </div>

      {/* Mobile Panel Overlay */}
      {showMobilePanel && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowMobilePanel(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-factory-dark border-l border-factory-border animate-in slide-in-from-right duration-300">
            <LogRollPanel />
          </div>
        </div>
      )}

      {/* Machine Popup */}
      {selectedMachine && <MachinePopup />}
    </div>
  );
}
