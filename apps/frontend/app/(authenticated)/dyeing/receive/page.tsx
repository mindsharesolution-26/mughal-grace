'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/atoms/Button';
import { useToast } from '@/contexts/ToastContext';
import { dyeingOrdersApi } from '@/lib/api/dyeing';
import { colorsApi } from '@/lib/api/settings';
import { DyeingOrder, DyeingOrderWithItems, DyeingOrderReceiveItem } from '@/lib/types/dyeing';
import { Color } from '@/lib/types/settings';
import { dyeingPrinter, ReceivedRollData } from '@/lib/services/dyeingPrinter';
import {
  ArrowLeft,
  Package,
  Check,
  Scale,
  Palette,
  AlertTriangle,
  Printer,
  CheckCircle,
  Wifi,
  WifiOff,
  Download,
  Plus,
  Trash2,
  Edit2,
  X
} from 'lucide-react';

// Weight entry for the simplified workflow
interface WeightEntry {
  id: string;
  weight: number;
  grade: string;
}

export default function ReceiveFromDyeingPage() {
  const router = useRouter();
  const { showToast } = useToast();

  // State
  const [orders, setOrders] = useState<DyeingOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<DyeingOrderWithItems | null>(null);
  const [colors, setColors] = useState<Color[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingOrder, setIsLoadingOrder] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  // Success state after receiving
  const [receiveSuccess, setReceiveSuccess] = useState(false);
  const [receivedRollsData, setReceivedRollsData] = useState<ReceivedRollData[]>([]);

  // NEW: Simplified weight entry state
  const [enteredWeights, setEnteredWeights] = useState<WeightEntry[]>([]);
  const [currentWeight, setCurrentWeight] = useState('');
  const [currentGrade, setCurrentGrade] = useState('A');
  const [selectedColorId, setSelectedColorId] = useState<number | null>(null);
  const [editingWeightId, setEditingWeightId] = useState<string | null>(null);
  const [editWeight, setEditWeight] = useState('');

  // Scale integration state
  const [isWeighingConnected, setIsWeighingConnected] = useState(true);
  const [scaleWeight, setScaleWeight] = useState<string>('');

  // Derived values
  const unreceivedItems = selectedOrder?.items.filter(item => !item.isReceived) || [];
  const unreceivedCount = unreceivedItems.length;
  const totalSentWeight = unreceivedItems.reduce((sum, item) => sum + Number(item.sentWeight), 0);
  const totalEnteredWeight = enteredWeights.reduce((sum, entry) => sum + entry.weight, 0);
  const selectedColor = colors.find(c => c.id === selectedColorId);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [ordersData, colorsData] = await Promise.all([
        dyeingOrdersApi.getAll({
          limit: 100,
        }),
        colorsApi.getAll(),
      ]);

      // Filter orders that can be received (not completed or cancelled)
      const receivableOrders = ordersData.orders.filter(
        (o) => ['SENT', 'IN_PROCESS', 'READY', 'PARTIALLY_RECEIVED'].includes(o.status)
      );
      setOrders(receivableOrders);
      setColors(colorsData.filter((c) => c.isActive));
    } catch (error: any) {
      showToast('error', error.response?.data?.error || 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectOrder = async (orderId: number) => {
    try {
      setIsLoadingOrder(true);
      const order = await dyeingOrdersApi.getById(orderId);
      setSelectedOrder(order);

      // Reset weight entry state
      setEnteredWeights([]);
      setCurrentWeight('');
      setCurrentGrade('A');
      setSelectedColorId(null);
      setEditingWeightId(null);
    } catch (error: any) {
      showToast('error', error.response?.data?.error || 'Failed to load order');
    } finally {
      setIsLoadingOrder(false);
    }
  };

  const handleBackToOrders = () => {
    setSelectedOrder(null);
    setEnteredWeights([]);
    setCurrentWeight('');
    setSelectedColorId(null);
  };

  // Generate unique ID for weight entries
  const generateId = () => `weight-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Add weight to list
  const handleAddWeight = () => {
    const weight = parseFloat(currentWeight);
    if (isNaN(weight) || weight <= 0) {
      showToast('error', 'Please enter a valid weight');
      return;
    }

    if (enteredWeights.length >= unreceivedCount) {
      showToast('error', `Cannot add more weights. Only ${unreceivedCount} rolls to receive.`);
      return;
    }

    setEnteredWeights(prev => [...prev, {
      id: generateId(),
      weight,
      grade: currentGrade,
    }]);
    setCurrentWeight('');
    setCurrentGrade('A');
  };

  // Remove weight from list
  const handleRemoveWeight = (id: string) => {
    setEnteredWeights(prev => prev.filter(entry => entry.id !== id));
  };

  // Start editing a weight
  const handleStartEdit = (entry: WeightEntry) => {
    setEditingWeightId(entry.id);
    setEditWeight(entry.weight.toString());
  };

  // Save edited weight
  const handleSaveEdit = (id: string) => {
    const weight = parseFloat(editWeight);
    if (isNaN(weight) || weight <= 0) {
      showToast('error', 'Please enter a valid weight');
      return;
    }

    setEnteredWeights(prev => prev.map(entry =>
      entry.id === id ? { ...entry, weight } : entry
    ));
    setEditingWeightId(null);
    setEditWeight('');
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingWeightId(null);
    setEditWeight('');
  };

  // Update grade for a weight entry
  const handleUpdateGrade = (id: string, grade: string) => {
    setEnteredWeights(prev => prev.map(entry =>
      entry.id === id ? { ...entry, grade } : entry
    ));
  };

  // Simulate weight detection from scale
  const simulateWeightDetection = () => {
    const detectedWeight = (15 + Math.random() * 10).toFixed(2);
    setScaleWeight(detectedWeight);
    showToast('success', `Weight detected: ${detectedWeight} kg`);
  };

  // Capture weight from scale
  const captureWeight = () => {
    const detectedWeight = (15 + Math.random() * 10).toFixed(2);
    setScaleWeight(detectedWeight);
    setCurrentWeight(detectedWeight);
    showToast('success', `Weight captured: ${detectedWeight} kg`);
  };

  // Calculate weight variance
  const getWeightVariance = () => {
    if (totalSentWeight === 0) return 0;
    return ((totalEnteredWeight - totalSentWeight) / totalSentWeight) * 100;
  };

  const handleSubmit = async () => {
    // Validation
    if (enteredWeights.length === 0) {
      showToast('error', 'Please enter at least one weight');
      return;
    }

    if (!selectedColorId) {
      showToast('error', 'Please select a color for the received rolls');
      return;
    }

    // Check if all weights are valid
    const invalidWeights = enteredWeights.filter(entry => entry.weight <= 0);
    if (invalidWeights.length > 0) {
      showToast('error', 'All weights must be greater than 0');
      return;
    }

    setIsSubmitting(true);
    try {
      // Map entered weights to unreceived DyeingOrderItems (arbitrary order - rolls are mixed anyway)
      const receiveData: DyeingOrderReceiveItem[] = enteredWeights.map((entry, index) => ({
        dyeingOrderItemId: unreceivedItems[index].id,
        receivedWeight: entry.weight,
        grade: entry.grade || 'A',
        colorId: selectedColorId,
      }));

      await dyeingOrdersApi.receive(selectedOrder!.id, receiveData);

      // Prepare received rolls data for barcode printing
      // We use the original roll info from unreceivedItems but with the new weights
      const receivedRolls: ReceivedRollData[] = enteredWeights.map((entry, index) => {
        const originalItem = unreceivedItems[index];
        return {
          rollNumber: originalItem.roll.rollNumber,
          fabricType: originalItem.roll.fabricType,
          colorName: selectedColor?.name || 'Unknown',
          colorCode: selectedColor?.code,
          finishedWeight: entry.weight,
          grade: entry.grade || 'A',
          dyeingOrderNumber: selectedOrder!.orderNumber,
          vendorName: selectedOrder!.vendor.name,
          receivedDate: new Date().toISOString(),
        };
      });

      setReceivedRollsData(receivedRolls);
      setReceiveSuccess(true);
      showToast('success', `Successfully received ${enteredWeights.length} roll(s) from dyeing`);
    } catch (error: any) {
      showToast('error', error.response?.data?.error || 'Failed to receive from dyeing');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrintBarcodes = async () => {
    if (receivedRollsData.length === 0) return;

    setIsPrinting(true);
    try {
      await dyeingPrinter.printRollBarcodes(receivedRollsData);
      showToast('success', 'Print dialog opened');
    } catch (error) {
      showToast('error', 'Failed to open print dialog');
    } finally {
      setIsPrinting(false);
    }
  };

  const handleDone = () => {
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

  // Success view - after receiving rolls
  if (receiveSuccess) {
    return (
      <div className="space-y-6">
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-8 text-center">
          <div className="w-16 h-16 bg-success/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-success" />
          </div>
          <h2 className="text-2xl font-semibold text-white mb-2">Rolls Received Successfully!</h2>
          <p className="text-neutral-400 mb-6">
            {receivedRollsData.length} roll(s) have been received and added to Dyed Stock
          </p>

          {/* Received Rolls Summary */}
          <div className="bg-factory-gray rounded-xl p-4 max-w-2xl mx-auto mb-6">
            <h3 className="text-sm font-medium text-neutral-400 mb-3">Received Rolls</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {receivedRollsData.map((roll) => (
                <div
                  key={roll.rollNumber}
                  className="flex items-center justify-between p-3 bg-factory-dark rounded-lg"
                >
                  <div className="text-left">
                    <p className="font-mono text-primary-400">{roll.rollNumber}</p>
                    <p className="text-sm text-neutral-500">
                      {roll.fabricType} • {roll.colorName}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-white">{roll.finishedWeight.toFixed(2)} kg</p>
                    <p className="text-sm text-neutral-500">Grade {roll.grade}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-center gap-4">
            <Button
              variant="primary"
              onClick={handlePrintBarcodes}
              disabled={isPrinting}
              className="min-w-[180px]"
            >
              <Printer className="w-4 h-4 mr-2" />
              {isPrinting ? 'Opening Print...' : 'Print QR Labels'}
            </Button>
            <Link href="/dyeing/stock">
              <Button variant="secondary">
                <Package className="w-4 h-4 mr-2" />
                View Dyed Stock
              </Button>
            </Link>
            <Button variant="ghost" onClick={handleDone}>
              Done
            </Button>
          </div>

          <p className="text-neutral-500 text-sm mt-4">
            Print QR code labels to attach to the dyed rolls for identification
          </p>
        </div>
      </div>
    );
  }

  // Order selection view
  if (!selectedOrder) {
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
              <span className="text-white">Receive from Dyeing</span>
            </div>
            <h1 className="text-2xl font-semibold text-white mt-2">Receive from Dyeing</h1>
            <p className="text-neutral-400 text-sm mt-1">
              Select a dyeing order to receive rolls from
            </p>
          </div>
          <Link href="/dyeing">
            <Button variant="ghost">Cancel</Button>
          </Link>
        </div>

        {/* Orders List */}
        <div className="bg-factory-dark rounded-2xl border border-factory-border">
          {orders.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-12 h-12 text-neutral-500 mx-auto mb-4" />
              <p className="text-neutral-400">No orders pending to receive</p>
              <p className="text-neutral-500 text-sm mt-1">
                All orders have been received or there are no active orders
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-factory-border">
                    <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">
                      Order #
                    </th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">
                      Vendor
                    </th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">
                      Status
                    </th>
                    <th className="text-right px-6 py-4 text-sm font-medium text-neutral-400">
                      Rolls
                    </th>
                    <th className="text-right px-6 py-4 text-sm font-medium text-neutral-400">
                      Sent Weight
                    </th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">
                      Sent Date
                    </th>
                    <th className="text-right px-6 py-4 text-sm font-medium text-neutral-400">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-factory-border">
                  {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-factory-gray">
                      <td className="px-6 py-4">
                        <span className="font-mono text-primary-400">{order.orderNumber}</span>
                      </td>
                      <td className="px-6 py-4 text-white">
                        {order.vendor.name}
                        <span className="text-neutral-500 text-sm ml-1">({order.vendor.code})</span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            order.status === 'READY'
                              ? 'bg-success/20 text-success'
                              : order.status === 'PARTIALLY_RECEIVED'
                              ? 'bg-orange-500/20 text-orange-400'
                              : 'bg-warning/20 text-warning'
                          }`}
                        >
                          {order.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-white">{order._count?.items || 0}</td>
                      <td className="px-6 py-4 text-right text-white">
                        {Number(order.sentWeight).toFixed(2)} kg
                      </td>
                      <td className="px-6 py-4 text-neutral-400">
                        {new Date(order.sentAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button
                          size="sm"
                          onClick={() => handleSelectOrder(order.id)}
                          disabled={isLoadingOrder}
                        >
                          Receive
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  // SIMPLIFIED RECEIVE VIEW - Weight Entry Mode
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
            <button
              onClick={handleBackToOrders}
              className="text-neutral-400 hover:text-white"
            >
              Receive from Dyeing
            </button>
            <span className="text-neutral-600">/</span>
            <span className="text-white">{selectedOrder.orderNumber}</span>
          </div>
          <h1 className="text-2xl font-semibold text-white mt-2">
            Receive Order: {selectedOrder.orderNumber}
          </h1>
        </div>
        <Button variant="ghost" onClick={handleBackToOrders}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Order Summary & Color Selection */}
        <div className="lg:col-span-1 space-y-6">
          {/* Order Summary */}
          <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Order Summary</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-neutral-400">Order Number</span>
                <span className="text-white font-mono">{selectedOrder.orderNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Vendor</span>
                <span className="text-white">{selectedOrder.vendor.name}</span>
              </div>
              {selectedOrder.colorName && (
                <div className="flex justify-between items-center">
                  <span className="text-neutral-400">Expected Color</span>
                  <span className="text-white">{selectedOrder.colorName}</span>
                </div>
              )}
              {selectedOrder.processType && (
                <div className="flex justify-between">
                  <span className="text-neutral-400">Process</span>
                  <span className="text-white">{selectedOrder.processType}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-neutral-400">Sent Date</span>
                <span className="text-white">
                  {new Date(selectedOrder.sentAt).toLocaleDateString()}
                </span>
              </div>
              <div className="border-t border-factory-border pt-3 mt-3">
                <div className="flex justify-between">
                  <span className="text-neutral-400">Rolls to Receive</span>
                  <span className="text-white font-semibold">{unreceivedCount}</span>
                </div>
                <div className="flex justify-between mt-2">
                  <span className="text-neutral-400">Total Sent Weight</span>
                  <span className="text-white font-semibold">{totalSentWeight.toFixed(2)} kg</span>
                </div>
              </div>
            </div>
          </div>

          {/* Color Selection - SINGLE for all rolls */}
          <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Palette className="w-5 h-5" />
              Color (for all rolls)
            </h3>
            <p className="text-neutral-400 text-sm mb-4">
              Select the color applied to all rolls in this batch
            </p>
            <select
              value={selectedColorId || ''}
              onChange={(e) => setSelectedColorId(e.target.value ? parseInt(e.target.value) : null)}
              className="w-full px-4 py-3 rounded-xl bg-factory-gray border border-factory-border text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Select color...</option>
              {colors.map((color) => (
                <option key={color.id} value={color.id}>
                  {color.name} ({color.code})
                </option>
              ))}
            </select>
            {selectedColor && (
              <div className="mt-3 flex items-center gap-2">
                <div
                  className="w-6 h-6 rounded-full border border-white/20"
                  style={{ backgroundColor: selectedColor.hexCode || '#888' }}
                />
                <span className="text-white">{selectedColor.name}</span>
              </div>
            )}
          </div>

          {/* Scale Status */}
          <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Scale className="w-5 h-5" />
              Weighing Scale
            </h3>

            {/* Connection Status */}
            <div className={`rounded-xl border p-3 flex items-center gap-3 mb-4 ${
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

            {/* Current Scale Reading */}
            <div className="bg-factory-gray rounded-xl p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Scale className="w-4 h-4 text-neutral-400" />
                <span className="text-xs text-neutral-400 uppercase tracking-wider">Current Reading</span>
              </div>
              <div className="text-3xl font-bold text-white font-mono">
                {scaleWeight || '0.00'} <span className="text-lg text-neutral-400">kg</span>
              </div>
            </div>
          </div>

          {/* Summary & Submit */}
          <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Receive Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-neutral-400">Rolls Entered</span>
                <span className="text-white font-medium">
                  {enteredWeights.length} / {unreceivedCount}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Sent Weight</span>
                <span className="text-white font-medium">{totalSentWeight.toFixed(2)} kg</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Received Weight</span>
                <span className="text-white font-medium">
                  {totalEnteredWeight.toFixed(2)} kg
                </span>
              </div>
              {enteredWeights.length > 0 && (
                <>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Avg Weight/Roll</span>
                    <span className="text-white font-medium">
                      {(totalEnteredWeight / enteredWeights.length).toFixed(2)} kg
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-400">Weight Variance</span>
                    <span
                      className={`font-medium ${
                        getWeightVariance() < 0
                          ? 'text-error'
                          : getWeightVariance() > 0
                          ? 'text-success'
                          : 'text-white'
                      }`}
                    >
                      {getWeightVariance() > 0 ? '+' : ''}
                      {getWeightVariance().toFixed(2)}%
                    </span>
                  </div>
                </>
              )}
              {Math.abs(getWeightVariance()) > 5 && enteredWeights.length > 0 && (
                <div className="flex items-center gap-2 text-warning text-sm mt-2">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Significant weight variance detected</span>
                </div>
              )}
            </div>
            <Button
              onClick={handleSubmit}
              className="w-full mt-6"
              disabled={isSubmitting || enteredWeights.length === 0 || !selectedColorId}
            >
              {isSubmitting ? 'Processing...' : 'Save & Print QR Labels'}
            </Button>
            {(!selectedColorId && enteredWeights.length > 0) && (
              <p className="text-warning text-sm mt-2 text-center">
                Please select a color before saving
              </p>
            )}
          </div>
        </div>

        {/* Right Column - Weight Entry */}
        <div className="lg:col-span-2">
          <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-white">Enter Received Weights</h3>
                <p className="text-sm text-neutral-400">
                  Enter weight for each roll ({unreceivedCount} rolls to receive)
                </p>
              </div>
            </div>

            {/* Weight Input Row */}
            <div className="bg-factory-gray rounded-xl p-4 mb-6">
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Weight Input */}
                <div className="flex-1">
                  <label className="block text-sm text-neutral-400 mb-1">Weight (kg)</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Scale className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                      <input
                        type="number"
                        step="0.001"
                        value={currentWeight}
                        onChange={(e) => setCurrentWeight(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddWeight();
                          }
                        }}
                        placeholder="0.00"
                        className="w-full pl-10 pr-4 py-3 rounded-lg bg-factory-dark border border-factory-border text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={captureWeight}
                      disabled={!isWeighingConnected}
                      title="Capture weight from scale"
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Capture
                    </Button>
                  </div>
                </div>

                {/* Grade Select */}
                <div className="w-32">
                  <label className="block text-sm text-neutral-400 mb-1">Grade</label>
                  <select
                    value={currentGrade}
                    onChange={(e) => setCurrentGrade(e.target.value)}
                    className="w-full px-3 py-3 rounded-lg bg-factory-dark border border-factory-border text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="A">Grade A</option>
                    <option value="B">Grade B</option>
                    <option value="C">Grade C</option>
                  </select>
                </div>

                {/* Add Button */}
                <div className="flex items-end">
                  <Button
                    onClick={handleAddWeight}
                    disabled={!currentWeight || enteredWeights.length >= unreceivedCount}
                    className="h-[46px]"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Roll
                  </Button>
                </div>
              </div>

              {enteredWeights.length >= unreceivedCount && (
                <p className="text-success text-sm mt-2">
                  All {unreceivedCount} roll weights entered
                </p>
              )}
            </div>

            {/* Entered Weights List */}
            {enteredWeights.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-factory-border rounded-xl">
                <Scale className="w-12 h-12 text-neutral-500 mx-auto mb-4" />
                <p className="text-neutral-400">No weights entered yet</p>
                <p className="text-neutral-500 text-sm mt-1">
                  Enter the weight for each roll and click "Add Roll"
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Table Header */}
                <div className="grid grid-cols-12 gap-4 px-4 py-2 text-sm text-neutral-400">
                  <div className="col-span-1">#</div>
                  <div className="col-span-4">Received Weight</div>
                  <div className="col-span-3">Grade</div>
                  <div className="col-span-4 text-right">Actions</div>
                </div>

                {/* Weight Entries */}
                {enteredWeights.map((entry, index) => (
                  <div
                    key={entry.id}
                    className="grid grid-cols-12 gap-4 items-center p-4 bg-factory-gray rounded-xl"
                  >
                    <div className="col-span-1 text-neutral-400 font-medium">
                      {index + 1}
                    </div>

                    <div className="col-span-4">
                      {editingWeightId === entry.id ? (
                        <input
                          type="number"
                          step="0.001"
                          value={editWeight}
                          onChange={(e) => setEditWeight(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleSaveEdit(entry.id);
                            } else if (e.key === 'Escape') {
                              handleCancelEdit();
                            }
                          }}
                          autoFocus
                          className="w-full px-3 py-2 rounded-lg bg-factory-dark border border-primary-500 text-white focus:outline-none"
                        />
                      ) : (
                        <span className="text-white font-medium font-mono">
                          {entry.weight.toFixed(2)} kg
                        </span>
                      )}
                    </div>

                    <div className="col-span-3">
                      <select
                        value={entry.grade}
                        onChange={(e) => handleUpdateGrade(entry.id, e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-factory-dark border border-factory-border text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="A">Grade A</option>
                        <option value="B">Grade B</option>
                        <option value="C">Grade C</option>
                      </select>
                    </div>

                    <div className="col-span-4 flex justify-end gap-2">
                      {editingWeightId === entry.id ? (
                        <>
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => handleSaveEdit(entry.id)}
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleCancelEdit}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleStartEdit(entry)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemoveWeight(entry.id)}
                            className="text-error hover:bg-error/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}

                {/* Summary Row */}
                <div className="grid grid-cols-12 gap-4 items-center p-4 bg-primary-500/10 border border-primary-500/20 rounded-xl mt-4">
                  <div className="col-span-1 text-neutral-400 font-medium">

                  </div>
                  <div className="col-span-4">
                    <span className="text-neutral-400">Total:</span>
                    <span className="text-white font-semibold ml-2 font-mono">
                      {totalEnteredWeight.toFixed(2)} kg
                    </span>
                  </div>
                  <div className="col-span-3">
                    <span className="text-neutral-400">Rolls:</span>
                    <span className="text-white font-semibold ml-2">
                      {enteredWeights.length} / {unreceivedCount}
                    </span>
                  </div>
                  <div className="col-span-4 text-right">
                    <span className="text-neutral-400">Avg:</span>
                    <span className="text-white font-semibold ml-2 font-mono">
                      {(totalEnteredWeight / enteredWeights.length).toFixed(2)} kg
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
