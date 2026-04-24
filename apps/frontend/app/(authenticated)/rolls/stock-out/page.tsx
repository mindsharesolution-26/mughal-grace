'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { useToast } from '@/contexts/ToastContext';
import { rollsApi } from '@/lib/api/rolls';
import { Roll, RollWithHistory } from '@/lib/types/roll';
import {
  QrCode,
  Camera,
  Search,
  AlertTriangle,
  CheckCircle,
  Package,
  Scale,
  Calendar,
  Clock,
  RefreshCw,
  X,
  ArrowRight,
} from 'lucide-react';

// Roll status colors
const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  GREY_STOCK: { bg: 'bg-slate-500/20', text: 'text-slate-400', label: 'Grey Stock' },
  SENT_TO_DYEING: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Sent to Dyeing' },
  AT_DYEING: { bg: 'bg-purple-500/20', text: 'text-purple-400', label: 'At Dyeing' },
  RECEIVED_FROM_DYEING: { bg: 'bg-indigo-500/20', text: 'text-indigo-400', label: 'From Dyeing' },
  FINISHED_STOCK: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: 'Finished Stock' },
  SOLD: { bg: 'bg-orange-500/20', text: 'text-orange-400', label: 'Sold/Issued' },
  REJECTED: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Rejected' },
};

export default function StockOutPage() {
  const { showToast } = useToast();
  const [manualCode, setManualCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStockingOut, setIsStockingOut] = useState(false);
  const [scannedRoll, setScannedRoll] = useState<RollWithHistory | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [stockOutNotes, setStockOutNotes] = useState('');

  // Camera scanner state
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Handle QR code lookup
  const handleLookup = async (qrCode: string) => {
    if (!qrCode.trim()) {
      showToast('error', 'Please enter or scan a QR code');
      return;
    }

    setIsLoading(true);
    setScannedRoll(null);
    setWarning(null);

    try {
      const response = await rollsApi.lookupByQR(qrCode.trim());
      setScannedRoll(response.data);
      setWarning(response.warning);

      if (response.isIssued) {
        showToast('warning', 'This roll has already been issued');
      } else {
        showToast('success', `Roll ${response.data.rollNumber} found`);
      }
    } catch (error: any) {
      if (error.response?.status === 404) {
        showToast('error', 'Roll not found with this QR code');
      } else {
        showToast('error', error.response?.data?.error || 'Failed to lookup roll');
      }
    } finally {
      setIsLoading(false);
      setManualCode('');
    }
  };

  // Handle stock out
  const handleStockOut = async () => {
    if (!scannedRoll) return;

    setIsStockingOut(true);
    try {
      const response = await rollsApi.stockOut(scannedRoll.id, {
        notes: stockOutNotes || 'Issued via QR scan',
        destinationType: 'SALE',
      });

      if (response.wasAlreadyIssued) {
        showToast('warning', 'Roll was already issued - status updated again');
      } else {
        showToast('success', `Roll ${scannedRoll.rollNumber} marked as issued`);
      }

      // Reset for next scan
      setScannedRoll(null);
      setWarning(null);
      setStockOutNotes('');
    } catch (error: any) {
      showToast('error', error.response?.data?.error || 'Failed to stock out roll');
    } finally {
      setIsStockingOut(false);
    }
  };

  // Handle keyboard scanner input (barcode scanners act as keyboards)
  useEffect(() => {
    let buffer = '';
    let timeout: NodeJS.Timeout;

    const handleKeyPress = (e: KeyboardEvent) => {
      // Ignore if focused on input
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }

      // Enter key submits the buffer
      if (e.key === 'Enter' && buffer.length > 5) {
        handleLookup(buffer);
        buffer = '';
        return;
      }

      // Add character to buffer
      if (e.key.length === 1) {
        buffer += e.key;

        // Clear buffer after 100ms of no input (scanner inputs are fast)
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          buffer = '';
        }, 100);
      }
    };

    window.addEventListener('keypress', handleKeyPress);
    return () => {
      window.removeEventListener('keypress', handleKeyPress);
      clearTimeout(timeout);
    };
  }, []);

  // Camera setup
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      setShowCamera(true);

      // Start scanning for QR codes
      // Note: In production, you'd use a library like @zxing/browser for actual QR scanning
      // This is a placeholder for the camera UI
    } catch (error) {
      console.error('Camera error:', error);
      showToast('error', 'Failed to access camera. Please use manual entry.');
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
    }
    setShowCamera(false);
  };

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Get status display info
  const getStatusInfo = (status: string) => {
    return STATUS_COLORS[status] || { bg: 'bg-gray-500/20', text: 'text-gray-400', label: status };
  };

  return (
    <div className="min-h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
            <Package className="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-white">Roll Stock Out</h1>
            <p className="text-neutral-400">Scan QR codes to verify and mark rolls as issued</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl">
        {/* Scanner Section */}
        <div className="bg-factory-dark border border-factory-border rounded-2xl p-6 mb-6">
          <h2 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
            <QrCode className="w-5 h-5 text-primary-400" />
            Scan Roll QR Code
          </h2>

          {/* Camera View */}
          {showCamera && (
            <div className="relative mb-4">
              <video
                ref={videoRef}
                className="w-full aspect-video bg-black rounded-xl"
                autoPlay
                playsInline
                muted
              />
              <canvas ref={canvasRef} className="hidden" />
              <button
                onClick={stopCamera}
                className="absolute top-2 right-2 p-2 bg-black/50 rounded-lg text-white hover:bg-black/70"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-48 h-48 border-2 border-primary-400 rounded-xl opacity-50" />
              </div>
            </div>
          )}

          {/* Scanner Buttons */}
          <div className="flex gap-3 mb-4">
            <Button
              variant={showCamera ? 'secondary' : 'primary'}
              onClick={showCamera ? stopCamera : startCamera}
              className="flex-1"
            >
              <Camera className="w-4 h-4 mr-2" />
              {showCamera ? 'Stop Camera' : 'Use Camera'}
            </Button>
          </div>

          {/* Manual Entry */}
          <div className="flex gap-3">
            <Input
              placeholder="Enter or scan QR code..."
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleLookup(manualCode);
                }
              }}
              className="flex-1"
            />
            <Button onClick={() => handleLookup(manualCode)} disabled={isLoading}>
              {isLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
            </Button>
          </div>

          <p className="text-xs text-neutral-500 mt-3">
            Tip: Use a barcode scanner for faster input - it works like a keyboard
          </p>
        </div>

        {/* Warning Banner */}
        {warning && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-6 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-yellow-300 font-medium">Warning</p>
              <p className="text-yellow-400/80 text-sm">{warning}</p>
            </div>
          </div>
        )}

        {/* Roll Details */}
        {scannedRoll && (
          <div className="bg-factory-dark border border-factory-border rounded-2xl overflow-hidden">
            {/* Roll Header */}
            <div className="p-6 border-b border-factory-border">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-white mb-1">
                    {scannedRoll.rollNumber}
                  </h3>
                  <p className="text-neutral-400 font-mono text-sm">{scannedRoll.qrCode}</p>
                </div>
                <div className={`px-3 py-1.5 rounded-lg ${getStatusInfo(scannedRoll.status).bg}`}>
                  <span className={`text-sm font-medium ${getStatusInfo(scannedRoll.status).text}`}>
                    {getStatusInfo(scannedRoll.status).label}
                  </span>
                </div>
              </div>
            </div>

            {/* Roll Info Grid */}
            <div className="p-6 grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-factory-gray flex items-center justify-center">
                  <Scale className="w-5 h-5 text-neutral-400" />
                </div>
                <div>
                  <p className="text-sm text-neutral-400">Weight</p>
                  <p className="text-lg font-semibold text-white">
                    {Number(scannedRoll.greyWeight).toFixed(2)} kg
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-factory-gray flex items-center justify-center">
                  <Package className="w-5 h-5 text-neutral-400" />
                </div>
                <div>
                  <p className="text-sm text-neutral-400">Fabric Type</p>
                  <p className="text-lg font-semibold text-white">{scannedRoll.fabricType}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-factory-gray flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-neutral-400" />
                </div>
                <div>
                  <p className="text-sm text-neutral-400">Produced</p>
                  <p className="text-lg font-semibold text-white">
                    {new Date(scannedRoll.producedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {scannedRoll.machine && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-factory-gray flex items-center justify-center">
                    <span className="text-neutral-400 font-bold text-sm">M</span>
                  </div>
                  <div>
                    <p className="text-sm text-neutral-400">Machine</p>
                    <p className="text-lg font-semibold text-white">
                      #{scannedRoll.machine.machineNumber}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Status History */}
            {scannedRoll.statusHistory && scannedRoll.statusHistory.length > 0 && (
              <div className="p-6 border-t border-factory-border">
                <h4 className="text-sm font-medium text-neutral-300 mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Recent History
                </h4>
                <div className="space-y-2">
                  {scannedRoll.statusHistory.slice(0, 3).map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center gap-2 text-sm text-neutral-400"
                    >
                      <span className="text-neutral-500">
                        {new Date(entry.changedAt).toLocaleString()}
                      </span>
                      <ArrowRight className="w-3 h-3" />
                      <span className={getStatusInfo(entry.toStatus).text}>
                        {getStatusInfo(entry.toStatus).label}
                      </span>
                      {entry.notes && (
                        <span className="text-neutral-500">- {entry.notes}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Stock Out Action */}
            <div className="p-6 border-t border-factory-border bg-factory-gray/30">
              <div className="mb-4">
                <Input
                  label="Notes (Optional)"
                  placeholder="Add any notes for this stock out..."
                  value={stockOutNotes}
                  onChange={(e) => setStockOutNotes(e.target.value)}
                />
              </div>

              <div className="flex gap-3">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setScannedRoll(null);
                    setWarning(null);
                    setStockOutNotes('');
                  }}
                  className="flex-1"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  onClick={handleStockOut}
                  disabled={isStockingOut}
                  className="flex-1"
                  variant={scannedRoll.status === 'SOLD' ? 'secondary' : 'primary'}
                >
                  {isStockingOut ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4 mr-2" />
                  )}
                  {scannedRoll.status === 'SOLD' ? 'Re-confirm Issue' : 'Mark as Issued'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!scannedRoll && !isLoading && (
          <div className="bg-factory-dark border border-factory-border border-dashed rounded-2xl p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-factory-gray flex items-center justify-center mx-auto mb-4">
              <QrCode className="w-8 h-8 text-neutral-500" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">No Roll Scanned</h3>
            <p className="text-neutral-400 max-w-sm mx-auto">
              Scan a QR code using the camera, barcode scanner, or enter the code manually to view roll details and mark as issued.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
