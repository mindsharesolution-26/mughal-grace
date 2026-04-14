'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { useToast } from '@/contexts/ToastContext';
import {
  stockTransactionsApi,
  stockItemsApi,
  warehousesApi,
  stockBatchesApi,
  unitsApi,
} from '@/lib/api/inventory';
import {
  StockTransaction,
  StockTransactionFormData,
  StockItemLookup,
  WarehouseLookup,
  StockBatch,
  Unit,
  StockTransactionType,
  transactionTypeOptions,
  transactionStatusOptions,
  formatQuantity,
  formatCurrency,
  getTransactionDirection,
  isInwardTransaction,
} from '@/lib/types/inventory';

export default function TransactionsPage() {
  const searchParams = useSearchParams();
  const action = searchParams.get('action'); // 'receipt' or 'issue'
  const { showToast } = useToast();

  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  const [items, setItems] = useState<StockItemLookup[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseLookup[]>([]);
  const [batches, setBatches] = useState<StockBatch[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Filters
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [dateFilter, setDateFilter] = useState({ startDate: '', endDate: '' });

  // Modal state
  const [showModal, setShowModal] = useState(action === 'receipt' || action === 'issue');
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<StockTransactionFormData>>({
    transactionDate: new Date().toISOString().split('T')[0],
    transactionType: action === 'issue' ? 'ISSUE' : 'RECEIPT',
    quantity: 0,
  });

  // Selected item for batch loading
  const [selectedItem, setSelectedItem] = useState<StockItemLookup | null>(null);

  // Fetch transactions
  useEffect(() => {
    fetchTransactions();
  }, [page, typeFilter, dateFilter]);

  // Fetch lookup data
  useEffect(() => {
    fetchLookupData();
  }, []);

  // Load batches when item changes
  useEffect(() => {
    if (selectedItem?.trackBatches && selectedItem.id) {
      loadBatches(selectedItem.id);
    } else {
      setBatches([]);
    }
  }, [selectedItem]);

  const fetchTransactions = async () => {
    try {
      setIsLoading(true);
      const data = await stockTransactionsApi.getAll({
        page,
        limit: 50,
        transactionType: typeFilter || undefined,
        startDate: dateFilter.startDate || undefined,
        endDate: dateFilter.endDate || undefined,
      });
      setTransactions(data.data);
      setTotalPages(data.pagination.totalPages);
      setTotal(data.pagination.total);
    } catch (error: any) {
      showToast('error', 'Failed to load transactions');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLookupData = async () => {
    try {
      const [itemsData, warehousesData, unitsData] = await Promise.all([
        stockItemsApi.getLookup(),
        warehousesApi.getLookup(),
        unitsApi.getLookup(),
      ]);
      setItems(itemsData);
      setWarehouses(warehousesData);
      setUnits(unitsData);
    } catch (error: any) {
      showToast('error', 'Failed to load lookup data');
    }
  };

  const loadBatches = async (itemId: number) => {
    try {
      const data = await stockBatchesApi.getAll({ itemId, status: 'ACTIVE' });
      setBatches(data);
    } catch (error) {
      console.error('Failed to load batches', error);
    }
  };

  const handleItemChange = (itemId: number) => {
    const item = items.find((i) => i.id === itemId);
    setSelectedItem(item || null);
    setFormData({
      ...formData,
      itemId,
      unitId: item?.primaryUnitId || formData.unitId,
      batchId: undefined,
    });
  };

  const handleOpenModal = (type: 'receipt' | 'issue') => {
    setFormData({
      transactionDate: new Date().toISOString().split('T')[0],
      transactionType: type === 'issue' ? 'ISSUE' : 'RECEIPT',
      quantity: 0,
    });
    setSelectedItem(null);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedItem(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.itemId || !formData.quantity || !formData.unitId) {
      showToast('error', 'Please fill in all required fields');
      return;
    }

    const isInward = isInwardTransaction(formData.transactionType as StockTransactionType);
    if (isInward && !formData.destWarehouseId) {
      showToast('error', 'Please select a destination warehouse');
      return;
    }
    if (!isInward && !formData.sourceWarehouseId) {
      showToast('error', 'Please select a source warehouse');
      return;
    }

    try {
      setIsSaving(true);
      await stockTransactionsApi.create(formData as StockTransactionFormData);
      showToast('success', `Stock ${isInward ? 'received' : 'issued'} successfully`);
      handleCloseModal();
      fetchTransactions();
    } catch (error: any) {
      showToast('error', error.response?.data?.error || 'Failed to create transaction');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReverse = async (txn: StockTransaction) => {
    if (!confirm(`Are you sure you want to reverse transaction ${txn.transactionNumber}?`)) return;

    try {
      await stockTransactionsApi.reverse(txn.id);
      showToast('success', 'Transaction reversed');
      fetchTransactions();
    } catch (error: any) {
      showToast('error', error.response?.data?.error || 'Failed to reverse transaction');
    }
  };

  const isInward = formData.transactionType
    ? isInwardTransaction(formData.transactionType as StockTransactionType)
    : true;

  if (isLoading && transactions.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Stock Transactions</h1>
          <p className="text-neutral-400 mt-1">
            Track all stock movements and adjustments
          </p>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => handleOpenModal('receipt')}>+ Stock Receipt</Button>
          <Button variant="secondary" onClick={() => handleOpenModal('issue')}>
            Stock Issue
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-factory-dark rounded-2xl border border-factory-border p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All Types</option>
              {transactionTypeOptions.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <Input
              type="date"
              value={dateFilter.startDate}
              onChange={(e) => {
                setDateFilter({ ...dateFilter, startDate: e.target.value });
                setPage(1);
              }}
              placeholder="Start Date"
            />
            <Input
              type="date"
              value={dateFilter.endDate}
              onChange={(e) => {
                setDateFilter({ ...dateFilter, endDate: e.target.value });
                setPage(1);
              }}
              placeholder="End Date"
            />
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-factory-dark rounded-2xl border border-factory-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-factory-border">
                <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">Txn #</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">Date</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">Type</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">Item</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">Warehouse</th>
                <th className="text-right px-6 py-4 text-sm font-medium text-neutral-400">Quantity</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">Status</th>
                <th className="text-right px-6 py-4 text-sm font-medium text-neutral-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-factory-border">
              {transactions.map((txn) => {
                const direction = getTransactionDirection(txn.transactionType);
                const statusOption = transactionStatusOptions.find((s) => s.value === txn.status);
                return (
                  <tr key={txn.id} className="hover:bg-factory-gray transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-mono text-sm text-primary-400">
                        {txn.transactionNumber}
                      </span>
                      {txn.isReversed && (
                        <span className="ml-2 text-xs text-error">Reversed</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-neutral-300">
                      {new Date(txn.transactionDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                          direction === 'IN'
                            ? 'bg-success/20 text-success'
                            : 'bg-warning/20 text-warning'
                        }`}
                      >
                        {direction === 'IN' ? '↓' : '↑'}
                        {transactionTypeOptions.find((t) => t.value === txn.transactionType)?.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-white">{txn.item?.name || '-'}</span>
                      {txn.batch && (
                        <p className="text-xs text-neutral-500">Batch: {txn.batch.batchNumber}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-neutral-300">
                      {direction === 'IN' ? txn.destWarehouse?.name : txn.sourceWarehouse?.name}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span
                        className={`font-medium ${
                          direction === 'IN' ? 'text-success' : 'text-warning'
                        }`}
                      >
                        {direction === 'IN' ? '+' : '-'}{formatQuantity(txn.quantity)}
                      </span>
                      <span className="text-neutral-400 ml-1">{txn.unit?.code}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-${statusOption?.color}-500/20 text-${statusOption?.color}-400`}
                      >
                        {statusOption?.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        {txn.status === 'COMPLETED' && !txn.isReversed && (
                          <Button variant="ghost" size="sm" onClick={() => handleReverse(txn)}>
                            Reverse
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {transactions.length === 0 && (
          <div className="text-center py-12">
            <p className="text-neutral-400">No transactions found</p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-factory-border">
            <p className="text-sm text-neutral-400">
              Page {page} of {totalPages} ({total} transactions)
            </p>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Transaction Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-factory-dark rounded-2xl border border-factory-border w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-factory-border">
              <h2 className="text-xl font-semibold text-white">
                {isInward ? 'Stock Receipt' : 'Stock Issue'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">
                    Date *
                  </label>
                  <Input
                    type="date"
                    value={formData.transactionDate}
                    onChange={(e) => setFormData({ ...formData, transactionDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">
                    Type *
                  </label>
                  <select
                    value={formData.transactionType}
                    onChange={(e) =>
                      setFormData({ ...formData, transactionType: e.target.value as StockTransactionType })
                    }
                    className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    {transactionTypeOptions
                      .filter((t) => t.direction === (isInward ? 'IN' : 'OUT'))
                      .map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Item *
                </label>
                <select
                  value={formData.itemId || ''}
                  onChange={(e) => handleItemChange(Number(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Select item...</option>
                  {items.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.code} - {item.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  {isInward ? 'Destination Warehouse' : 'Source Warehouse'} *
                </label>
                <select
                  value={isInward ? formData.destWarehouseId || '' : formData.sourceWarehouseId || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      [isInward ? 'destWarehouseId' : 'sourceWarehouseId']: Number(e.target.value),
                    })
                  }
                  className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Select warehouse...</option>
                  {warehouses.map((wh) => (
                    <option key={wh.id} value={wh.id}>
                      {wh.name}
                    </option>
                  ))}
                </select>
              </div>

              {selectedItem?.trackBatches && batches.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">
                    Batch
                  </label>
                  <select
                    value={formData.batchId || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, batchId: e.target.value ? Number(e.target.value) : undefined })
                    }
                    className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Select batch...</option>
                    {batches.map((batch) => (
                      <option key={batch.id} value={batch.id}>
                        {batch.batchNumber} (Qty: {formatQuantity(batch.currentQuantity)})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">
                    Quantity *
                  </label>
                  <Input
                    type="number"
                    min="0.001"
                    step="0.001"
                    value={formData.quantity || ''}
                    onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) })}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">
                    Unit *
                  </label>
                  <select
                    value={formData.unitId || ''}
                    onChange={(e) => setFormData({ ...formData, unitId: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Select unit...</option>
                    {units.map((unit) => (
                      <option key={unit.id} value={unit.id}>
                        {unit.name} ({unit.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {isInward && (
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">
                    Unit Cost
                  </label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.unitCost || ''}
                    onChange={(e) => setFormData({ ...formData, unitCost: parseFloat(e.target.value) })}
                    placeholder="0.00"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Reference Number
                </label>
                <Input
                  value={formData.referenceNumber || ''}
                  onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                  placeholder="PO-001, INV-001, etc."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Notes
                </label>
                <textarea
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes..."
                  rows={2}
                  className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-factory-border">
                <Button type="button" variant="secondary" onClick={handleCloseModal}>
                  Cancel
                </Button>
                <Button type="submit" isLoading={isSaving}>
                  {isInward ? 'Receive Stock' : 'Issue Stock'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
