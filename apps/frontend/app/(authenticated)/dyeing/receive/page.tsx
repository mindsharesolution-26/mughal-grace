'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { useToast } from '@/contexts/ToastContext';
import { dyeingOrdersApi } from '@/lib/api/dyeing';
import { colorsApi } from '@/lib/api/settings';
import { DyeingOrder, DyeingOrderWithItems, DyeingOrderReceiveItem } from '@/lib/types/dyeing';
import { Color } from '@/lib/types/settings';
import { ArrowLeft, Package, Check, Scale, Palette, AlertTriangle } from 'lucide-react';

interface ReceiveItemData {
  dyeingOrderItemId: number;
  rollNumber: string;
  fabricType: string;
  sentWeight: number;
  receivedWeight: string;
  grade: string;
  defects: string;
  colorId: number | null;
  isSelected: boolean;
}

export default function ReceiveFromDyeingPage() {
  const router = useRouter();
  const { showToast } = useToast();

  // State
  const [orders, setOrders] = useState<DyeingOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<DyeingOrderWithItems | null>(null);
  const [colors, setColors] = useState<Color[]>([]);
  const [receiveItems, setReceiveItems] = useState<ReceiveItemData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingOrder, setIsLoadingOrder] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

      // Initialize receive items from order items that haven't been received yet
      const items: ReceiveItemData[] = order.items
        .filter((item) => !item.isReceived)
        .map((item) => ({
          dyeingOrderItemId: item.id,
          rollNumber: item.roll.rollNumber,
          fabricType: item.roll.fabricType,
          sentWeight: Number(item.sentWeight),
          receivedWeight: item.sentWeight, // Default to sent weight
          grade: 'A',
          defects: '',
          colorId: null,
          isSelected: true,
        }));
      setReceiveItems(items);
    } catch (error: any) {
      showToast('error', error.response?.data?.error || 'Failed to load order');
    } finally {
      setIsLoadingOrder(false);
    }
  };

  const handleBackToOrders = () => {
    setSelectedOrder(null);
    setReceiveItems([]);
  };

  const toggleItemSelection = (dyeingOrderItemId: number) => {
    setReceiveItems((prev) =>
      prev.map((item) =>
        item.dyeingOrderItemId === dyeingOrderItemId
          ? { ...item, isSelected: !item.isSelected }
          : item
      )
    );
  };

  const updateItem = (dyeingOrderItemId: number, field: keyof ReceiveItemData, value: any) => {
    setReceiveItems((prev) =>
      prev.map((item) =>
        item.dyeingOrderItemId === dyeingOrderItemId ? { ...item, [field]: value } : item
      )
    );
  };

  const applyColorToAll = (colorId: number | null) => {
    setReceiveItems((prev) =>
      prev.map((item) => (item.isSelected ? { ...item, colorId } : item))
    );
  };

  const getSelectedItems = () => receiveItems.filter((item) => item.isSelected);

  const getTotalReceivedWeight = () => {
    return getSelectedItems().reduce((sum, item) => sum + (parseFloat(item.receivedWeight) || 0), 0);
  };

  const getTotalSentWeight = () => {
    return getSelectedItems().reduce((sum, item) => sum + item.sentWeight, 0);
  };

  const getWeightVariance = () => {
    const sent = getTotalSentWeight();
    const received = getTotalReceivedWeight();
    if (sent === 0) return 0;
    return ((received - sent) / sent) * 100;
  };

  const handleSubmit = async () => {
    const selectedItems = getSelectedItems();

    if (selectedItems.length === 0) {
      showToast('error', 'Please select at least one item to receive');
      return;
    }

    // Validate all selected items have received weight and color
    const invalidItems = selectedItems.filter(
      (item) => !item.receivedWeight || parseFloat(item.receivedWeight) <= 0
    );
    if (invalidItems.length > 0) {
      showToast('error', 'Please enter valid received weight for all selected items');
      return;
    }

    const itemsWithoutColor = selectedItems.filter((item) => !item.colorId);
    if (itemsWithoutColor.length > 0) {
      showToast('error', 'Please select a color for all selected items');
      return;
    }

    setIsSubmitting(true);
    try {
      const receiveData: DyeingOrderReceiveItem[] = selectedItems.map((item) => ({
        dyeingOrderItemId: item.dyeingOrderItemId,
        receivedWeight: parseFloat(item.receivedWeight),
        grade: item.grade || undefined,
        defects: item.defects || undefined,
        colorId: item.colorId || undefined,
      }));

      await dyeingOrdersApi.receive(selectedOrder!.id, receiveData);
      showToast('success', `Successfully received ${selectedItems.length} roll(s) from dyeing`);
      router.push('/dyeing');
    } catch (error: any) {
      showToast('error', error.response?.data?.error || 'Failed to receive from dyeing');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
        <span className="ml-3 text-neutral-400">Loading...</span>
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
                      Items
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

  // Receive items view
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
          <p className="text-neutral-400 text-sm mt-1">
            Vendor: {selectedOrder.vendor.name} ({selectedOrder.vendor.code})
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="ghost" onClick={handleBackToOrders}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Summary & Actions */}
        <div className="lg:col-span-1 space-y-6">
          {/* Order Info */}
          <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Order Information</h3>
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
                <div className="flex justify-between">
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
            </div>
          </div>

          {/* Apply Color to All */}
          <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Palette className="w-5 h-5" />
              Apply Color to All
            </h3>
            <p className="text-neutral-400 text-sm mb-4">
              Select a color to apply to all selected items
            </p>
            <select
              onChange={(e) => applyColorToAll(e.target.value ? parseInt(e.target.value) : null)}
              className="w-full px-4 py-3 rounded-xl bg-factory-gray border border-factory-border text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Select color...</option>
              {colors.map((color) => (
                <option key={color.id} value={color.id}>
                  {color.name} ({color.code})
                </option>
              ))}
            </select>
          </div>

          {/* Receive Summary */}
          <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Receive Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-neutral-400">Selected Items</span>
                <span className="text-white font-medium">
                  {getSelectedItems().length} / {receiveItems.length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Sent Weight</span>
                <span className="text-white font-medium">{getTotalSentWeight().toFixed(2)} kg</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Received Weight</span>
                <span className="text-white font-medium">
                  {getTotalReceivedWeight().toFixed(2)} kg
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
              {Math.abs(getWeightVariance()) > 5 && (
                <div className="flex items-center gap-2 text-warning text-sm mt-2">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Significant weight variance detected</span>
                </div>
              )}
            </div>
            <Button
              onClick={handleSubmit}
              className="w-full mt-6"
              disabled={isSubmitting || getSelectedItems().length === 0}
            >
              {isSubmitting ? 'Processing...' : 'Confirm Receipt'}
            </Button>
          </div>
        </div>

        {/* Right Column - Items Table */}
        <div className="lg:col-span-2">
          <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-white">Items to Receive</h3>
                <p className="text-sm text-neutral-400">
                  {receiveItems.length} roll(s) pending receipt
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  setReceiveItems((prev) =>
                    prev.map((item) => ({ ...item, isSelected: !prev.every((i) => i.isSelected) }))
                  )
                }
              >
                {receiveItems.every((i) => i.isSelected) ? 'Deselect All' : 'Select All'}
              </Button>
            </div>

            {receiveItems.length === 0 ? (
              <div className="text-center py-12">
                <Check className="w-12 h-12 text-success mx-auto mb-4" />
                <p className="text-neutral-400">All items have been received</p>
              </div>
            ) : (
              <div className="space-y-4">
                {receiveItems.map((item) => (
                  <div
                    key={item.dyeingOrderItemId}
                    className={`p-4 rounded-xl border transition-colors ${
                      item.isSelected
                        ? 'bg-primary-500/10 border-primary-500/30'
                        : 'bg-factory-gray border-factory-border'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      {/* Checkbox */}
                      <button
                        onClick={() => toggleItemSelection(item.dyeingOrderItemId)}
                        className={`mt-1 w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 ${
                          item.isSelected
                            ? 'bg-primary-500 border-primary-500'
                            : 'border-factory-border'
                        }`}
                      >
                        {item.isSelected && <Check className="w-3 h-3 text-white" />}
                      </button>

                      {/* Item Details */}
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* Roll Info */}
                        <div>
                          <p className="text-sm text-neutral-400 mb-1">Roll</p>
                          <p className="font-mono text-primary-400">{item.rollNumber}</p>
                          <p className="text-sm text-neutral-500">{item.fabricType}</p>
                          <p className="text-sm text-neutral-400 mt-1">
                            Sent: {item.sentWeight.toFixed(2)} kg
                          </p>
                        </div>

                        {/* Received Weight */}
                        <div>
                          <label className="block text-sm text-neutral-400 mb-1">
                            Received Weight (kg) *
                          </label>
                          <div className="relative">
                            <Scale className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                            <input
                              type="number"
                              step="0.001"
                              value={item.receivedWeight}
                              onChange={(e) =>
                                updateItem(item.dyeingOrderItemId, 'receivedWeight', e.target.value)
                              }
                              className="w-full pl-10 pr-4 py-2 rounded-lg bg-factory-dark border border-factory-border text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                              disabled={!item.isSelected}
                            />
                          </div>
                        </div>

                        {/* Color */}
                        <div>
                          <label className="block text-sm text-neutral-400 mb-1">Color *</label>
                          <select
                            value={item.colorId || ''}
                            onChange={(e) =>
                              updateItem(
                                item.dyeingOrderItemId,
                                'colorId',
                                e.target.value ? parseInt(e.target.value) : null
                              )
                            }
                            className="w-full px-3 py-2 rounded-lg bg-factory-dark border border-factory-border text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                            disabled={!item.isSelected}
                          >
                            <option value="">Select color...</option>
                            {colors.map((color) => (
                              <option key={color.id} value={color.id}>
                                {color.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Grade */}
                        <div>
                          <label className="block text-sm text-neutral-400 mb-1">Grade</label>
                          <select
                            value={item.grade}
                            onChange={(e) =>
                              updateItem(item.dyeingOrderItemId, 'grade', e.target.value)
                            }
                            className="w-full px-3 py-2 rounded-lg bg-factory-dark border border-factory-border text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                            disabled={!item.isSelected}
                          >
                            <option value="A">Grade A</option>
                            <option value="B">Grade B</option>
                            <option value="C">Grade C</option>
                          </select>
                        </div>

                        {/* Defects */}
                        <div className="md:col-span-2">
                          <label className="block text-sm text-neutral-400 mb-1">
                            Defects (if any)
                          </label>
                          <input
                            type="text"
                            value={item.defects}
                            onChange={(e) =>
                              updateItem(item.dyeingOrderItemId, 'defects', e.target.value)
                            }
                            placeholder="Note any defects..."
                            className="w-full px-3 py-2 rounded-lg bg-factory-dark border border-factory-border text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                            disabled={!item.isSelected}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
