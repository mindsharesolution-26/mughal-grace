'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { useToast } from '@/contexts/ToastContext';
import { productsApi } from '@/lib/api/products';
import { ProductFinder } from '@/components/organisms/ProductFinder';
import {
  Factory,
  Package,
  X,
  Scale,
  CheckCircle,
  Wifi,
  WifiOff,
  TrendingUp,
  Clock,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ScrollText,
  Loader2,
  Hash,
  RefreshCw,
} from 'lucide-react';

// Mock machine data for the dropdown
const mockMachines = Array.from({ length: 50 }, (_, i) => ({
  id: i + 1,
  number: i + 1,
  status: i < 38 ? 'RUNNING' : 'IDLE',
  currentProduct: i < 38 ? `Product ${100 + (i % 20)}` : null,
}));

interface ProductionLog {
  id: number;
  rollNumber: string | null;
  weight: number;
  machine: string | null;
  product: {
    id: number;
    name: string;
    articleNumber: string | null;
    qrCode: string;
  };
  createdAt: string;
}

interface ProductionSummary {
  totalWeight: number;
  totalRolls: number;
  byProduct: Array<{
    id: number;
    name: string;
    articleNumber: string | null;
    weight: number;
    rolls: number;
  }>;
}

export default function ProductionPage() {
  const { showToast } = useToast();
  const [showMobilePanel, setShowMobilePanel] = useState(false);

  // Date selection
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Production logs data
  const [logs, setLogs] = useState<ProductionLog[]>([]);
  const [summary, setSummary] = useState<ProductionSummary | null>(null);
  const [isLoadingLogs, setIsLoadingLogs] = useState(true);

  // Production log state
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [weight, setWeight] = useState('');
  const [logMachineId, setLogMachineId] = useState('');
  const [rollNumber, setRollNumber] = useState('');

  // Simulate weighing machine connection
  const [isWeighingConnected, setIsWeighingConnected] = useState(true);

  // Format date for display
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Format date for API
  const formatDateForApi = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  // Check if selected date is today
  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  // Navigate dates
  const goToPreviousDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 1);
    setSelectedDate(newDate);
  };

  const goToNextDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 1);
    if (newDate <= new Date()) {
      setSelectedDate(newDate);
    }
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  // Load production logs
  const loadProductionLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const data = await productsApi.getProductionLogs({
        date: formatDateForApi(selectedDate),
      });
      setLogs(data.logs);
      setSummary(data.summary);
    } catch (error) {
      console.error('Failed to load production logs:', error);
      showToast('error', 'Failed to load production logs');
    } finally {
      setIsLoadingLogs(false);
    }
  };

  // Load logs when date changes
  useEffect(() => {
    loadProductionLogs();
  }, [selectedDate]);

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

      // Reload logs if viewing today
      if (isToday(selectedDate)) {
        loadProductionLogs();
      }
    } catch (error: any) {
      showToast('error', error.response?.data?.error || 'Failed to log production');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Format time
  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
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
          <p className="text-neutral-400 mt-1">Daily production output and logging</p>
        </div>
        <Button className="lg:hidden" onClick={() => setShowMobilePanel(true)}>
          <Package className="w-4 h-4 mr-2" />
          Log Roll
        </Button>
      </div>

      {/* Main Layout */}
      <div className="flex gap-6 h-[calc(100%-5rem)]">
        {/* Left Side - Production Logs */}
        <div className="flex-1 space-y-6 overflow-y-auto pr-2">
          {/* Date Navigation & Summary */}
          <div className="bg-factory-dark rounded-2xl border border-factory-border p-5">
            {/* Date Selector */}
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={goToPreviousDay}
                className="p-2 text-neutral-400 hover:text-white hover:bg-factory-gray rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Calendar className="w-5 h-5 text-primary-400" />
                  <h2 className="text-lg font-semibold text-white">
                    {isToday(selectedDate) ? "Today's Production" : formatDate(selectedDate)}
                  </h2>
                </div>
                {!isToday(selectedDate) && (
                  <button
                    onClick={goToToday}
                    className="text-xs text-primary-400 hover:text-primary-300"
                  >
                    Go to today
                  </button>
                )}
              </div>

              <button
                onClick={goToNextDay}
                disabled={isToday(selectedDate)}
                className="p-2 text-neutral-400 hover:text-white hover:bg-factory-gray rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Summary Stats */}
            {summary && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 rounded-xl border border-emerald-500/20 p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    <p className="text-xs text-emerald-400">Total Output</p>
                  </div>
                  <p className="text-2xl font-bold text-white">{summary.totalWeight}</p>
                  <p className="text-xs text-neutral-400">kg produced</p>
                </div>

                <div className="bg-factory-gray rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <ScrollText className="w-4 h-4 text-primary-400" />
                    <p className="text-xs text-neutral-400">Total Rolls</p>
                  </div>
                  <p className="text-2xl font-bold text-white">{summary.totalRolls}</p>
                  <p className="text-xs text-neutral-400">completed</p>
                </div>

                <div className="bg-factory-gray rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Package className="w-4 h-4 text-primary-400" />
                    <p className="text-xs text-neutral-400">Products</p>
                  </div>
                  <p className="text-2xl font-bold text-white">{summary.byProduct.length}</p>
                  <p className="text-xs text-neutral-400">different types</p>
                </div>

                <div className="bg-factory-gray rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-4 h-4 text-primary-400" />
                    <p className="text-xs text-neutral-400">Avg per Roll</p>
                  </div>
                  <p className="text-2xl font-bold text-white">
                    {summary.totalRolls > 0
                      ? (summary.totalWeight / summary.totalRolls).toFixed(1)
                      : '0'}
                  </p>
                  <p className="text-xs text-neutral-400">kg / roll</p>
                </div>
              </div>
            )}
          </div>

          {/* Product Summary */}
          {summary && summary.byProduct.length > 0 && (
            <div className="bg-factory-dark rounded-2xl border border-factory-border p-5">
              <h3 className="text-lg font-semibold text-white mb-4">Production by Product</h3>
              <div className="space-y-3">
                {summary.byProduct.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between p-3 bg-factory-gray rounded-xl"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">{product.name}</p>
                      <p className="text-xs text-primary-400 font-mono">
                        {product.articleNumber || 'No article'}
                      </p>
                    </div>
                    <div className="text-right ml-4">
                      <p className="text-lg font-bold text-white">{product.weight} kg</p>
                      <p className="text-xs text-neutral-400">{product.rolls} rolls</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Production Logs Table */}
          <div className="bg-factory-dark rounded-2xl border border-factory-border p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Production Log</h3>
              <Button variant="ghost" size="sm" onClick={loadProductionLogs} disabled={isLoadingLogs}>
                <RefreshCw className={`w-4 h-4 mr-1 ${isLoadingLogs ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>

            {isLoadingLogs ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-12">
                <ScrollText className="w-12 h-12 mx-auto mb-3 text-neutral-600" />
                <p className="text-neutral-400">No production recorded</p>
                <p className="text-sm text-neutral-500">
                  {isToday(selectedDate)
                    ? 'Log a roll to get started'
                    : 'No production was logged on this day'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-sm text-neutral-400 border-b border-factory-border">
                      <th className="pb-3 font-medium">Time</th>
                      <th className="pb-3 font-medium">Roll #</th>
                      <th className="pb-3 font-medium">Product</th>
                      <th className="pb-3 font-medium">Machine</th>
                      <th className="pb-3 font-medium text-right">Weight</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {logs.map((log) => (
                      <tr
                        key={log.id}
                        className="border-b border-factory-border/50 hover:bg-factory-gray/50"
                      >
                        <td className="py-3 text-neutral-400">
                          {formatTime(log.createdAt)}
                        </td>
                        <td className="py-3">
                          <span className="font-mono text-primary-400 text-xs">
                            {log.rollNumber || '-'}
                          </span>
                        </td>
                        <td className="py-3">
                          <div>
                            <p className="text-white">{log.product.name}</p>
                            <p className="text-xs text-neutral-500 font-mono">
                              {log.product.articleNumber}
                            </p>
                          </div>
                        </td>
                        <td className="py-3 text-neutral-300">
                          {log.machine ? `#${log.machine}` : '-'}
                        </td>
                        <td className="py-3 text-right">
                          <span className="text-white font-semibold">{log.weight}</span>
                          <span className="text-neutral-400 ml-1">kg</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
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
    </div>
  );
}
