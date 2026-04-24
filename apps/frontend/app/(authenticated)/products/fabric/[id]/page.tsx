'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { useToast } from '@/contexts/ToastContext';
import { fabricsApi, Fabric, FabricStockMovement, FabricStockMovementInput, FabricLedgerEntry } from '@/lib/api/fabrics';

type TabId = 'overview' | 'ledger' | 'qr-code';

export default function FabricDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const fabricId = Number(params.id);
  const qrRef = useRef<HTMLDivElement>(null);

  const [fabric, setFabric] = useState<Fabric | null>(null);
  const [stockHistory, setStockHistory] = useState<FabricStockMovement[]>([]);
  const [ledgerEntries, setLedgerEntries] = useState<FabricLedgerEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [showStockModal, setShowStockModal] = useState(false);
  const [stockModalType, setStockModalType] = useState<'IN' | 'OUT'>('IN');
  const [isProcessing, setIsProcessing] = useState(false);

  // Date filters for ledger
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Fetch fabric and stock history
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [fabricData, historyData] = await Promise.all([
          fabricsApi.getById(fabricId),
          fabricsApi.getStockHistory(fabricId),
        ]);
        setFabric(fabricData);
        setStockHistory(historyData);
      } catch (error: any) {
        showToast('error', 'Failed to load fabric');
        router.push('/products?view=fabric');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [fabricId, showToast, router]);

  // Load ledger when tab is active or dates change
  useEffect(() => {
    if (activeTab === 'ledger' && fabric) {
      loadLedger();
    }
  }, [activeTab, fabric, startDate, endDate]);

  const loadLedger = async () => {
    try {
      const params: { startDate?: string; endDate?: string } = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const data = await fabricsApi.getLedger(fabricId, params);
      setLedgerEntries(data.entries);
    } catch (error) {
      console.error('Failed to load ledger:', error);
    }
  };

  // Calculate stock stats
  const { totalIn, totalOut } = useMemo(() => {
    if (!stockHistory.length) {
      return { totalIn: 0, totalOut: 0 };
    }

    const totalIn = stockHistory
      .filter((m) => m.type === 'IN')
      .reduce((sum, m) => sum + Number(m.quantity), 0);
    const totalOut = stockHistory
      .filter((m) => m.type === 'OUT')
      .reduce((sum, m) => sum + Number(m.quantity), 0);

    return { totalIn, totalOut };
  }, [stockHistory]);

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-PK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const openStockModal = (type: 'IN' | 'OUT') => {
    setStockModalType(type);
    setShowStockModal(true);
  };

  // Get movement type label
  const getTypeLabel = (movement: FabricStockMovement) => {
    if (movement.type === 'IN') {
      const source = movement.sourceType || 'Stock';
      return `IN (${source.charAt(0) + source.slice(1).toLowerCase()})`;
    } else {
      const dest = movement.destinationType || 'Issue';
      return `OUT (${dest.charAt(0) + dest.slice(1).toLowerCase()})`;
    }
  };

  // Stock Movement Modal
  const StockMovementModal = () => {
    const [movementData, setMovementData] = useState<Partial<FabricStockMovementInput>>({
      fabricId,
      type: stockModalType,
      quantity: 0,
    });

    const handleSubmit = async () => {
      if (!movementData.quantity || movementData.quantity <= 0) {
        showToast('error', 'Please enter a valid quantity');
        return;
      }

      setIsProcessing(true);
      try {
        const result = await fabricsApi.recordStockMovement({
          fabricId,
          type: stockModalType,
          quantity: movementData.quantity,
          referenceNumber: movementData.referenceNumber,
          sourceType: movementData.sourceType,
          destinationType: movementData.destinationType,
          notes: movementData.notes,
        });

        setFabric(result.fabric);
        setStockHistory((prev) => [result.movement, ...prev]);
        showToast(
          'success',
          `Stock ${stockModalType === 'IN' ? 'received' : 'issued'} successfully!`
        );
        setShowStockModal(false);
      } catch (error: any) {
        const message = error.response?.data?.error || 'Failed to record stock movement';
        showToast('error', message);
      } finally {
        setIsProcessing(false);
      }
    };

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-factory-dark rounded-2xl border border-factory-border w-full max-w-md">
          <div className="p-6 border-b border-factory-border">
            <h2 className="text-xl font-semibold text-white">
              {stockModalType === 'IN' ? 'Stock In' : 'Stock Out'}
            </h2>
            <p className="text-sm text-neutral-400 mt-1">
              Current Stock: {Number(fabric?.currentStock || 0).toLocaleString()}
            </p>
          </div>

          <div className="p-6 space-y-4">
            <Input
              label="Quantity *"
              type="number"
              step="0.001"
              placeholder="Enter quantity"
              value={movementData.quantity || ''}
              onChange={(e) =>
                setMovementData({ ...movementData, quantity: Number(e.target.value) })
              }
            />

            <Input
              label="Reference Number"
              placeholder="Batch #, Order #, etc."
              value={movementData.referenceNumber || ''}
              onChange={(e) =>
                setMovementData({ ...movementData, referenceNumber: e.target.value })
              }
            />

            {stockModalType === 'IN' && (
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                  Source
                </label>
                <select
                  value={movementData.sourceType || ''}
                  onChange={(e) =>
                    setMovementData({ ...movementData, sourceType: e.target.value })
                  }
                  className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Select Source</option>
                  <option value="PRODUCTION">Production</option>
                  <option value="PURCHASE">Purchase</option>
                  <option value="RETURN">Return</option>
                  <option value="ADJUSTMENT">Adjustment</option>
                </select>
              </div>
            )}

            {stockModalType === 'OUT' && (
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                  Destination
                </label>
                <select
                  value={movementData.destinationType || ''}
                  onChange={(e) =>
                    setMovementData({ ...movementData, destinationType: e.target.value })
                  }
                  className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Select Destination</option>
                  <option value="SALE">Sale</option>
                  <option value="ISSUE">Issue</option>
                  <option value="TRANSFER">Transfer</option>
                  <option value="WASTAGE">Wastage</option>
                  <option value="ADJUSTMENT">Adjustment</option>
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                Notes
              </label>
              <textarea
                rows={2}
                className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Optional notes..."
                value={movementData.notes || ''}
                onChange={(e) => setMovementData({ ...movementData, notes: e.target.value })}
              />
            </div>
          </div>

          <div className="p-6 border-t border-factory-border flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setShowStockModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isProcessing || !movementData.quantity}
            >
              {isProcessing
                ? 'Processing...'
                : stockModalType === 'IN'
                ? 'Add Stock'
                : 'Remove Stock'}
            </Button>
          </div>
        </div>
      </div>
    );
  };

  // Overview Tab
  const OverviewTab = () => (
    <div className="space-y-6">
      {/* Fabric Details Card */}
      <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Fabric Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <p className="text-sm text-neutral-400">Article Code</p>
              <p className="text-white font-mono">{fabric?.code || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-neutral-400">Department</p>
              <p className="text-white">{fabric?.department?.name || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-neutral-400">Group</p>
              <p className="text-white">{fabric?.group?.name || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-neutral-400">Material</p>
              <p className="text-white">{fabric?.material?.name || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-neutral-400">Machine</p>
              <p className="text-white">{fabric?.machine?.name || '-'}</p>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-neutral-400">Brand</p>
              <p className="text-white">{fabric?.brand?.name || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-neutral-400">Color</p>
              <p className="text-white">{fabric?.color?.name || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-neutral-400">Fabric Type</p>
              <p className="text-white">{fabric?.fabricType?.name || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-neutral-400">GSM / Width</p>
              <p className="text-white">
                {fabric?.gsm || '-'} GSM / {fabric?.width || '-'} {fabric?.widthUnit || ''}
              </p>
            </div>
            <div>
              <p className="text-sm text-neutral-400">Status</p>
              <span
                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                  fabric?.isActive
                    ? 'bg-success/20 text-success'
                    : 'bg-neutral-500/20 text-neutral-400'
                }`}
              >
                {fabric?.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>
        {fabric?.description && (
          <div className="mt-6 pt-4 border-t border-factory-border">
            <p className="text-sm text-neutral-400">Description</p>
            <p className="text-white mt-1">{fabric.description}</p>
          </div>
        )}
      </div>

      {/* Timestamps */}
      <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-neutral-400">Created</p>
            <p className="text-white">{fabric ? formatDateTime(fabric.createdAt) : '-'}</p>
          </div>
          <div>
            <p className="text-sm text-neutral-400">Last Updated</p>
            <p className="text-white">{fabric ? formatDateTime(fabric.updatedAt) : '-'}</p>
          </div>
        </div>
      </div>
    </div>
  );

  // Fabric Ledger Tab
  const LedgerTab = () => (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-violet-500/10 to-violet-600/5 rounded-2xl border border-violet-500/20 p-6">
          <p className="text-sm text-violet-400">Current Stock</p>
          <p className="text-4xl font-bold text-white mt-1">
            {Number(fabric?.currentStock || 0).toLocaleString()}
          </p>
        </div>
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
          <p className="text-sm text-neutral-400">Total IN</p>
          <p className="text-2xl font-semibold text-emerald-400 mt-1">
            +{totalIn.toLocaleString()}
          </p>
        </div>
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
          <p className="text-sm text-neutral-400">Total OUT</p>
          <p className="text-2xl font-semibold text-red-400 mt-1">
            -{totalOut.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Date Filter */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm text-neutral-400">From:</label>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-40"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-neutral-400">To:</label>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-40"
          />
        </div>
        {(startDate || endDate) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setStartDate('');
              setEndDate('');
            }}
          >
            Clear
          </Button>
        )}
      </div>

      {/* Ledger Table */}
      <div className="bg-factory-dark rounded-2xl border border-factory-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-factory-border bg-factory-gray/50">
                <th className="text-left px-6 py-4 text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                  Date
                </th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                  Reference
                </th>
                <th className="text-right px-6 py-4 text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                  Qty IN
                </th>
                <th className="text-right px-6 py-4 text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                  Qty OUT
                </th>
                <th className="text-right px-6 py-4 text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                  Balance
                </th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                  Notes
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-factory-border">
              {ledgerEntries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-neutral-400">
                    No ledger entries yet
                  </td>
                </tr>
              ) : (
                ledgerEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-factory-gray/30 transition-colors">
                    <td className="px-6 py-4 text-white">
                      {formatDate(entry.date)}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-lg text-xs font-medium ${
                          entry.qtyIn !== null && entry.qtyIn > 0
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}
                      >
                        {entry.reference}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {entry.qtyIn !== null && entry.qtyIn > 0 ? (
                        <span className="text-emerald-400 font-medium">
                          {entry.qtyIn.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-neutral-600">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {entry.qtyOut !== null && entry.qtyOut > 0 ? (
                        <span className="text-red-400 font-medium">
                          {entry.qtyOut.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-neutral-600">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-white font-semibold">
                        {entry.balance.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-neutral-400 text-sm">
                      {entry.notes || entry.referenceNumber || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // Download QR code as PNG
  const downloadQRCode = () => {
    if (!qrRef.current || !fabric) return;
    const svg = qrRef.current.querySelector('svg');
    if (!svg) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const svgData = new XMLSerializer().serializeToString(svg);
    const img = new Image();

    canvas.width = 400;
    canvas.height = 500;

    img.onload = () => {
      if (!ctx) return;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 50, 30, 300, 300);

      ctx.fillStyle = '#000000';
      ctx.font = 'bold 18px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(fabric.name, canvas.width / 2, 370);

      ctx.font = '14px monospace';
      ctx.fillText(fabric.qrPayload || fabric.code, canvas.width / 2, 400);

      ctx.font = '12px Arial';
      ctx.fillStyle = '#666666';
      ctx.fillText(`Code: ${fabric.code}`, canvas.width / 2, 430);

      const link = document.createElement('a');
      link.download = `QR-${fabric.code}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  // Print QR code
  const printQRCode = () => {
    if (!fabric) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Code - ${fabric.name}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              padding: 20px;
              box-sizing: border-box;
            }
            .qr-container {
              text-align: center;
              border: 2px solid #000;
              padding: 30px;
              border-radius: 12px;
            }
            h2 { margin: 20px 0 10px; font-size: 20px; }
            .code { font-family: monospace; font-size: 16px; margin: 10px 0; }
            .article { color: #666; font-size: 14px; }
            @media print {
              body { padding: 0; }
              .qr-container { border: 1px solid #000; }
            }
          </style>
        </head>
        <body>
          <div class="qr-container">
            ${qrRef.current?.innerHTML || ''}
            <h2>${fabric.name}</h2>
            <div class="code">${fabric.qrPayload || fabric.code}</div>
            <div class="article">Code: ${fabric.code}</div>
          </div>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // QR Code Tab
  const QRCodeTab = () => (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* QR Code Display */}
      <div className="bg-factory-dark rounded-2xl border border-factory-border p-8">
        <div className="flex flex-col items-center">
          <div ref={qrRef} className="bg-white p-6 rounded-2xl">
            <QRCodeSVG
              value={fabric?.qrPayload || fabric?.code || ''}
              size={250}
              level="H"
              includeMargin={false}
            />
          </div>

          <div className="mt-6 text-center">
            <p className="text-2xl font-mono font-bold text-white">{fabric?.qrPayload || fabric?.code}</p>
            <p className="text-neutral-400 mt-2">{fabric?.name}</p>
            <p className="text-sm text-neutral-500 mt-1">Code: {fabric?.code}</p>
          </div>

          <div className="flex gap-3 mt-8">
            <Button onClick={downloadQRCode}>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download PNG
            </Button>
            <Button variant="secondary" onClick={printQRCode}>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print
            </Button>
          </div>
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
        <h3 className="text-lg font-semibold text-white mb-4">About This QR Code</h3>
        <div className="space-y-3 text-sm text-neutral-400">
          <p>
            This QR code is permanently linked to this fabric template. It was generated when the fabric
            was created and will never change.
          </p>
          <p>
            Scan this code during production to automatically update the fabric's ledger with
            stock movements, production data, and other transactions.
          </p>
          <div className="pt-3 border-t border-factory-border">
            <p className="text-neutral-300">
              <span className="text-neutral-500">QR Payload:</span> {fabric?.qrPayload || fabric?.code}
            </p>
            <p className="text-neutral-300 mt-1">
              <span className="text-neutral-500">Created:</span> {fabric ? formatDateTime(fabric.createdAt) : '-'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const tabs: { id: TabId; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'ledger', label: 'Fabric Ledger' },
    { id: 'qr-code', label: 'QR Code' },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div>
      </div>
    );
  }

  if (!fabric) {
    return (
      <div className="text-center py-12">
        <p className="text-neutral-400">Fabric not found.</p>
        <Link href="/products?view=fabric" className="mt-4 inline-block">
          <Button variant="secondary">Back to Fabrics</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm">
            <Link href="/products?view=fabric" className="text-neutral-400 hover:text-white">
              Fabrics
            </Link>
            <span className="text-neutral-600">/</span>
            <span className="text-white">{fabric.name}</span>
          </div>
          <div className="flex items-center gap-3 mt-2">
            <h1 className="text-2xl font-semibold text-white">{fabric.name}</h1>
            <span
              className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                fabric.isActive ? 'bg-success/20 text-success' : 'bg-neutral-500/20 text-neutral-400'
              }`}
            >
              {fabric.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
          <p className="text-neutral-400 mt-1">
            {fabric.code && `#${fabric.code}`}
            {fabric.department && ` • ${fabric.department.name}`}
            {fabric.fabricType && ` • ${fabric.fabricType.name}`}
          </p>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => openStockModal('IN')}>+ Stock In</Button>
          <Button variant="secondary" onClick={() => openStockModal('OUT')}>
            - Stock Out
          </Button>
          <Link href={`/settings/fabrics`}>
            <Button variant="ghost">Edit</Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-violet-500/10 to-violet-600/5 rounded-2xl border border-violet-500/20 p-6">
          <p className="text-sm text-violet-400">Current Stock</p>
          <p className="text-4xl font-bold text-white mt-1">
            {Number(fabric.currentStock).toLocaleString()}
          </p>
        </div>
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
          <p className="text-sm text-neutral-400">Total IN</p>
          <p className="text-2xl font-semibold text-emerald-400 mt-1">
            +{totalIn.toLocaleString()}
          </p>
        </div>
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
          <p className="text-sm text-neutral-400">Total OUT</p>
          <p className="text-2xl font-semibold text-red-400 mt-1">
            -{totalOut.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-factory-border">
        <div className="flex gap-1 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors relative ${
                activeTab === tab.id
                  ? 'text-violet-400'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-500" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'ledger' && <LedgerTab />}
        {activeTab === 'qr-code' && <QRCodeTab />}
      </div>

      {/* Stock Movement Modal */}
      {showStockModal && <StockMovementModal />}
    </div>
  );
}
