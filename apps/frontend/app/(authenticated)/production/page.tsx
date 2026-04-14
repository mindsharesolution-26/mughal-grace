'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { useToast } from '@/contexts/ToastContext';
import { productsApi } from '@/lib/api/products';
import { ProductLookup } from '@/lib/types/product';

type TabId = 'overview' | 'add-logs';

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

const statusColors = {
  RUNNING: 'bg-success/20 text-success border-success/30',
  IDLE: 'bg-warning/20 text-warning border-warning/30',
  MAINTENANCE: 'bg-primary-500/20 text-primary-400 border-primary-500/30',
  DOWN: 'bg-error/20 text-error border-error/30',
};

const statusBgColors = {
  RUNNING: 'bg-success',
  IDLE: 'bg-warning',
  MAINTENANCE: 'bg-primary-500',
  DOWN: 'bg-error',
};

export default function ProductionPage() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  // Machine popup state
  const [selectedMachine, setSelectedMachine] = useState<typeof mockMachines[0] | null>(null);

  // Production log state
  const [products, setProducts] = useState<ProductLookup[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [qrInput, setQrInput] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [weight, setWeight] = useState('');
  const [logMachineId, setLogMachineId] = useState('');
  const [rollNumber, setRollNumber] = useState('');

  // Simulate weighing machine connection
  const [isWeighingConnected, setIsWeighingConnected] = useState(true);

  // Load products
  useEffect(() => {
    const loadProducts = async () => {
      try {
        const data = await productsApi.getLookup();
        setProducts(data);
      } catch (error) {
        console.error('Failed to load products:', error);
      }
    };
    loadProducts();
  }, []);

  // Simulate weight detection from weighing machine
  const simulateWeightDetection = () => {
    // In real implementation, this would come from the weighing machine API
    const detectedWeight = (15 + Math.random() * 10).toFixed(2);
    setWeight(detectedWeight);
    showToast('success', `Weight detected: ${detectedWeight} kg`);
  };

  const stats = {
    running: mockMachines.filter((m) => m.status === 'RUNNING').length,
    idle: mockMachines.filter((m) => m.status === 'IDLE').length,
    maintenance: mockMachines.filter((m) => m.status === 'MAINTENANCE').length,
    down: mockMachines.filter((m) => m.status === 'DOWN').length,
  };

  const totalProduction = mockMachines.reduce((sum, m) => sum + m.shiftProduction, 0);

  // Filter products
  const filteredProducts = products.filter((p) => {
    const query = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(query) ||
      (p.articleNumber && p.articleNumber.toLowerCase().includes(query))
    );
  });

  // Handle product selection
  const handleSelectProduct = async (product: ProductLookup) => {
    setSearchQuery(product.name);
    setShowDropdown(false);
    try {
      const fullProduct = await productsApi.getById(product.id);
      setSelectedProduct(fullProduct);
    } catch (error) {
      setSelectedProduct(product);
    }
  };

  // Handle QR search
  const handleQrSearch = async () => {
    if (!qrInput.trim()) return;
    setIsSearching(true);
    try {
      const product = await productsApi.searchByQR(qrInput.trim());
      setSelectedProduct(product);
      setSearchQuery(product.name);
      setQrInput('');
      showToast('success', `Product found: ${product.name}`);
    } catch (error: any) {
      showToast('error', error.response?.data?.error || 'Product not found');
    } finally {
      setIsSearching(false);
    }
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
      setSearchQuery('');
      setWeight('');
      setRollNumber('');
      // Keep machine selected for continuous production
    } catch (error: any) {
      showToast('error', error.response?.data?.error || 'Failed to log production');
    } finally {
      setIsSubmitting(false);
    }
  };

  const tabs: { id: TabId; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'add-logs', label: 'Add Production Logs' },
  ];

  // Machine Details Popup
  const MachinePopup = () => {
    if (!selectedMachine) return null;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedMachine(null)}>
        <div className="bg-factory-dark rounded-2xl border border-factory-border w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="p-6 border-b border-factory-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${statusBgColors[selectedMachine.status as keyof typeof statusBgColors]}`} />
              <h2 className="text-xl font-semibold text-white">Machine #{selectedMachine.number}</h2>
            </div>
            <button onClick={() => setSelectedMachine(null)} className="text-neutral-400 hover:text-white">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Status Badge */}
            <div className="flex items-center justify-between">
              <span className="text-neutral-400">Status</span>
              <span className={`px-3 py-1 rounded-lg text-sm font-medium ${statusColors[selectedMachine.status as keyof typeof statusColors]}`}>
                {selectedMachine.status}
              </span>
            </div>

            {selectedMachine.status === 'RUNNING' ? (
              <>
                {/* Production Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-factory-gray rounded-xl p-4">
                    <p className="text-sm text-neutral-400">Today's Production</p>
                    <p className="text-2xl font-bold text-emerald-400">{selectedMachine.shiftProduction} kg</p>
                  </div>
                  <div className="bg-factory-gray rounded-xl p-4">
                    <p className="text-sm text-neutral-400">Rolls Produced</p>
                    <p className="text-2xl font-bold text-white">{selectedMachine.rollsProduced}</p>
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-3">
                  <div className="flex justify-between py-2 border-b border-factory-border">
                    <span className="text-neutral-400">Operator</span>
                    <span className="text-white">{selectedMachine.currentOperator}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-factory-border">
                    <span className="text-neutral-400">Current Product</span>
                    <span className="text-white">{selectedMachine.currentProduct}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-factory-border">
                    <span className="text-neutral-400">Article Number</span>
                    <span className="text-primary-400 font-mono">{selectedMachine.articleNumber}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-factory-border">
                    <span className="text-neutral-400">Fabric Type</span>
                    <span className="text-white">{selectedMachine.fabricType}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-factory-border">
                    <span className="text-neutral-400">Material</span>
                    <span className="text-white">{selectedMachine.materialName}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-factory-border">
                    <span className="text-neutral-400">Color</span>
                    <span className="text-white">{selectedMachine.colorName}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-factory-border">
                    <span className="text-neutral-400">Efficiency</span>
                    <span className={`font-medium ${selectedMachine.efficiency >= 85 ? 'text-success' : selectedMachine.efficiency >= 70 ? 'text-warning' : 'text-error'}`}>
                      {selectedMachine.efficiency}%
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-factory-border">
                    <span className="text-neutral-400">Shift Start</span>
                    <span className="text-white">{selectedMachine.startTime}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-neutral-400">Last Roll</span>
                    <span className="text-white">{selectedMachine.lastRollTime}</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-neutral-400">
                  {selectedMachine.status === 'IDLE' && 'Machine is idle - no active production'}
                  {selectedMachine.status === 'MAINTENANCE' && 'Machine is under maintenance'}
                  {selectedMachine.status === 'DOWN' && 'Machine is down - requires attention'}
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-factory-border">
            <Button className="w-full" onClick={() => setSelectedMachine(null)}>Close</Button>
          </div>
        </div>
      </div>
    );
  };

  // Overview Tab
  const OverviewTab = () => (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 rounded-2xl border border-emerald-500/20 p-4">
          <p className="text-sm text-emerald-400">Today's Total</p>
          <p className="text-3xl font-bold text-white">{totalProduction} kg</p>
        </div>
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-4">
          <p className="text-sm text-neutral-400">Running</p>
          <p className="text-3xl font-bold text-success">{stats.running}</p>
        </div>
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-4">
          <p className="text-sm text-neutral-400">Idle</p>
          <p className="text-3xl font-bold text-warning">{stats.idle}</p>
        </div>
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-4">
          <p className="text-sm text-neutral-400">Down/Maintenance</p>
          <p className="text-3xl font-bold text-error">{stats.down + stats.maintenance}</p>
        </div>
      </div>

      {/* Machine Grid */}
      <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Machines</h2>
        <p className="text-sm text-neutral-400 mb-4">Click on any machine to view details</p>

        <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
          {mockMachines.map((machine) => (
            <button
              key={machine.id}
              onClick={() => setSelectedMachine(machine)}
              className={`aspect-square rounded-lg flex flex-col items-center justify-center text-xs font-medium border transition-all hover:scale-105 cursor-pointer ${
                statusColors[machine.status as keyof typeof statusColors]
              }`}
            >
              <span className="font-bold">{machine.number}</span>
              {machine.status === 'RUNNING' && (
                <span className="text-[10px] opacity-80">{machine.shiftProduction}kg</span>
              )}
            </button>
          ))}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mt-6 pt-4 border-t border-factory-border text-sm text-neutral-400">
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-success" />
            Running ({stats.running})
          </span>
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-warning" />
            Idle ({stats.idle})
          </span>
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-primary-500" />
            Maintenance ({stats.maintenance})
          </span>
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-error" />
            Down ({stats.down})
          </span>
        </div>
      </div>
    </div>
  );

  // Add Production Logs Tab - Simple Design for Weighing Machine
  const AddLogsTab = () => (
    <div className="max-w-xl mx-auto space-y-6">
      {/* Weighing Machine Status */}
      <div className={`rounded-2xl border p-4 flex items-center justify-between ${
        isWeighingConnected
          ? 'bg-emerald-500/10 border-emerald-500/20'
          : 'bg-red-500/10 border-red-500/20'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${isWeighingConnected ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
          <span className={isWeighingConnected ? 'text-emerald-400' : 'text-red-400'}>
            {isWeighingConnected ? 'Weighing Machine Connected' : 'Weighing Machine Disconnected'}
          </span>
        </div>
        <Button size="sm" variant="ghost" onClick={simulateWeightDetection}>
          Test Weight
        </Button>
      </div>

      {/* Weight Display */}
      <div className="bg-factory-dark rounded-2xl border border-factory-border p-8 text-center">
        <p className="text-sm text-neutral-400 mb-2">Detected Weight</p>
        <div className="text-6xl font-bold text-white font-mono">
          {weight || '0.00'} <span className="text-2xl text-neutral-400">kg</span>
        </div>
        {!weight && (
          <p className="text-sm text-neutral-500 mt-4">Place roll on weighing machine</p>
        )}
      </div>

      {/* Production Form */}
      <div className="bg-factory-dark rounded-2xl border border-factory-border p-6 space-y-4">
        {/* Machine Selection */}
        <div>
          <label className="block text-sm font-medium text-neutral-300 mb-1.5">Machine *</label>
          <select
            value={logMachineId}
            onChange={(e) => setLogMachineId(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-factory-gray border border-factory-border text-white text-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Select Machine</option>
            {mockMachines.filter(m => m.status === 'RUNNING').map((machine) => (
              <option key={machine.id} value={machine.id}>
                Machine #{machine.number} - {machine.currentProduct}
              </option>
            ))}
          </select>
        </div>

        {/* Product Selection */}
        <div>
          <label className="block text-sm font-medium text-neutral-300 mb-1.5">Product *</label>
          <div className="relative">
            <Input
              placeholder="Search or scan QR code..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              className="text-lg"
            />
            {showDropdown && searchQuery && filteredProducts.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-factory-gray border border-factory-border rounded-xl shadow-lg max-h-48 overflow-auto">
                {filteredProducts.slice(0, 8).map((product) => (
                  <button
                    key={product.id}
                    onClick={() => handleSelectProduct(product)}
                    className="w-full px-4 py-3 text-left hover:bg-factory-border/50 transition-colors border-b border-factory-border/50 last:border-0"
                  >
                    <p className="text-white">{product.name}</p>
                    <p className="text-xs text-neutral-400">{product.articleNumber}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* QR Code Input */}
        <div className="flex gap-2">
          <Input
            placeholder="Scan QR code..."
            value={qrInput}
            onChange={(e) => setQrInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleQrSearch()}
            className="flex-1"
          />
          <Button onClick={handleQrSearch} disabled={isSearching || !qrInput.trim()} variant="secondary">
            Find
          </Button>
        </div>

        {/* Selected Product */}
        {selectedProduct && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-emerald-400 text-sm">Selected</p>
              <p className="text-white font-medium">{selectedProduct.name}</p>
            </div>
            <button onClick={() => { setSelectedProduct(null); setSearchQuery(''); }} className="text-neutral-400 hover:text-white">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Roll Number (Optional) */}
        <Input
          label="Roll Number (Optional)"
          placeholder="Auto-generated if empty"
          value={rollNumber}
          onChange={(e) => setRollNumber(e.target.value)}
        />
      </div>

      {/* Submit Button */}
      <Button
        className="w-full py-4 text-lg"
        onClick={handleSubmitLog}
        disabled={isSubmitting || !selectedProduct || !weight || !logMachineId}
      >
        {isSubmitting ? 'Logging...' : `Log Roll (${weight || '0'} kg)`}
      </Button>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Production</h1>
          <p className="text-neutral-400 mt-1">Monitor machines and log production</p>
        </div>
        <Button onClick={() => setActiveTab('add-logs')}>+ Log Roll</Button>
      </div>

      {/* Tabs */}
      <div className="border-b border-factory-border">
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-sm font-medium transition-colors relative ${
                activeTab === tab.id ? 'text-primary-400' : 'text-neutral-400 hover:text-white'
              }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && <OverviewTab />}
      {activeTab === 'add-logs' && <AddLogsTab />}

      {/* Machine Popup */}
      {selectedMachine && <MachinePopup />}
    </div>
  );
}
