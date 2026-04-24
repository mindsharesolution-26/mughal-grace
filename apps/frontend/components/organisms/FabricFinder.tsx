'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/atoms/Button';
import { Search, Hash, QrCode, Camera, X, Loader2, Settings2 } from 'lucide-react';
import { fabricsApi, FabricProductionLookup } from '@/lib/api/fabrics';
import { cn } from '@/lib/utils/cn';

type SearchTab = 'name' | 'code' | 'qr';

interface FabricFinderProps {
  onFabricSelect: (fabric: FabricProductionLookup) => void;
  selectedFabric: FabricProductionLookup | null;
  onClear: () => void;
}

export function FabricFinder({ onFabricSelect, selectedFabric, onClear }: FabricFinderProps) {
  const [activeTab, setActiveTab] = useState<SearchTab>('name');
  const [fabrics, setFabrics] = useState<FabricProductionLookup[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [codeQuery, setCodeQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const scannerRef = useRef<any>(null);
  const scannerContainerRef = useRef<HTMLDivElement>(null);

  // Load fabrics for autocomplete
  useEffect(() => {
    const loadFabrics = async () => {
      try {
        const data = await fabricsApi.getProductionLookup();
        setFabrics(data);
      } catch (error) {
        console.error('Failed to load fabrics:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadFabrics();
  }, []);

  // Filter fabrics by name
  const filteredByName = fabrics.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filter fabrics by code
  const filteredByCode = fabrics.filter((f) =>
    f.code.toLowerCase().includes(codeQuery.toLowerCase())
  );

  // Handle fabric selection
  const handleSelectFabric = (fabric: FabricProductionLookup) => {
    setShowDropdown(false);
    setSearchQuery('');
    setCodeQuery('');
    onFabricSelect(fabric);
  };

  // Handle QR scan result
  const handleQrScan = useCallback(async (qrPayload: string) => {
    if (isSearching) return;
    setIsSearching(true);
    try {
      // Find fabric by qrPayload or code
      const found = fabrics.find(
        f => f.qrPayload === qrPayload || f.code === qrPayload
      );
      if (found) {
        onFabricSelect(found);
        stopCamera();
      } else {
        setCameraError('Fabric not found for this QR code');
        setTimeout(() => setCameraError(null), 3000);
      }
    } finally {
      setIsSearching(false);
    }
  }, [isSearching, fabrics, onFabricSelect]);

  // Start camera for QR scanning
  const startCamera = async () => {
    setCameraError(null);
    setIsCameraActive(true);

    try {
      const { Html5Qrcode } = await import('html5-qrcode');

      if (!scannerContainerRef.current) return;

      let scannerId = 'fabric-qr-scanner-region';
      let scannerElement = document.getElementById(scannerId);
      if (!scannerElement) {
        scannerElement = document.createElement('div');
        scannerElement.id = scannerId;
        scannerContainerRef.current.appendChild(scannerElement);
      }

      const html5QrCode = new Html5Qrcode(scannerId);
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 200, height: 200 },
        },
        (decodedText) => {
          handleQrScan(decodedText);
        },
        () => {}
      );
    } catch (error: any) {
      console.error('Camera error:', error);
      setCameraError(error.message || 'Failed to access camera');
      setIsCameraActive(false);
    }
  };

  // Stop camera
  const stopCamera = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current = null;
      } catch (error) {
        console.error('Error stopping scanner:', error);
      }
    }
    setIsCameraActive(false);
    setCameraError(null);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  // Stop camera when switching tabs
  useEffect(() => {
    if (activeTab !== 'qr' && isCameraActive) {
      stopCamera();
    }
  }, [activeTab, isCameraActive]);

  const tabs = [
    { id: 'name' as SearchTab, label: 'By Name', icon: Search },
    { id: 'code' as SearchTab, label: 'By Code', icon: Hash },
    { id: 'qr' as SearchTab, label: 'Scan QR', icon: QrCode },
  ];

  // If fabric is selected, show the selection
  if (selectedFabric) {
    return (
      <div className="space-y-3">
        <label className="block text-sm font-medium text-neutral-300">Fabric Template *</label>
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-emerald-400 mb-1">Selected Fabric</p>
              <p className="text-white font-medium truncate">{selectedFabric.name}</p>
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-sm">
                <span className="font-mono text-primary-400">{selectedFabric.code}</span>
                {selectedFabric.machine && (
                  <span className="text-neutral-400 flex items-center gap-1">
                    <Settings2 className="w-3.5 h-3.5" />
                    #{selectedFabric.machine.machineNumber}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs text-neutral-500">
                {selectedFabric.gsm && <span>GSM: {selectedFabric.gsm}</span>}
                {selectedFabric.width && (
                  <span>Width: {selectedFabric.width} {selectedFabric.widthUnit}</span>
                )}
                {selectedFabric.fabricType && (
                  <span>Type: {selectedFabric.fabricType.name}</span>
                )}
              </div>
            </div>
            <button
              onClick={onClear}
              className="p-2 text-neutral-400 hover:text-white hover:bg-factory-gray rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-neutral-300">Fabric Template *</label>

      {/* Search Tabs */}
      <div className="flex bg-factory-gray rounded-xl p-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-medium transition-all',
                activeTab === tab.id
                  ? 'bg-primary-500 text-white'
                  : 'text-neutral-400 hover:text-white'
              )}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-8 text-neutral-400">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          <span>Loading fabrics...</span>
        </div>
      )}

      {/* Search by Name */}
      {!isLoading && activeTab === 'name' && (
        <div className="relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
            <input
              type="text"
              placeholder="Type fabric name..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-factory-gray border border-factory-border text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          {showDropdown && searchQuery && filteredByName.length > 0 && (
            <div className="absolute z-50 w-full mt-2 bg-factory-dark border border-factory-border rounded-xl shadow-xl max-h-60 overflow-auto">
              {filteredByName.slice(0, 10).map((fabric) => (
                <button
                  key={fabric.id}
                  onClick={() => handleSelectFabric(fabric)}
                  className="w-full px-4 py-3 text-left hover:bg-factory-gray transition-colors border-b border-factory-border/50 last:border-0"
                >
                  <p className="text-white font-medium">{fabric.name}</p>
                  <p className="text-xs text-neutral-400 mt-0.5 flex items-center gap-2">
                    <span className="font-mono text-primary-400">{fabric.code}</span>
                    {fabric.machine && (
                      <span>Machine #{fabric.machine.machineNumber}</span>
                    )}
                    {fabric.gsm && <span>GSM: {fabric.gsm}</span>}
                  </p>
                </button>
              ))}
            </div>
          )}
          {showDropdown && searchQuery && filteredByName.length === 0 && (
            <div className="absolute z-50 w-full mt-2 bg-factory-dark border border-factory-border rounded-xl p-4 text-center text-neutral-400">
              No fabrics found
            </div>
          )}
        </div>
      )}

      {/* Search by Code */}
      {!isLoading && activeTab === 'code' && (
        <div className="relative">
          <div className="relative">
            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
            <input
              type="text"
              placeholder="Enter fabric code (e.g., FAB000001)..."
              value={codeQuery}
              onChange={(e) => {
                setCodeQuery(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-factory-gray border border-factory-border text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono"
            />
          </div>
          {showDropdown && codeQuery && filteredByCode.length > 0 && (
            <div className="absolute z-50 w-full mt-2 bg-factory-dark border border-factory-border rounded-xl shadow-xl max-h-60 overflow-auto">
              {filteredByCode.slice(0, 10).map((fabric) => (
                <button
                  key={fabric.id}
                  onClick={() => handleSelectFabric(fabric)}
                  className="w-full px-4 py-3 text-left hover:bg-factory-gray transition-colors border-b border-factory-border/50 last:border-0"
                >
                  <p className="font-mono text-primary-400 font-medium">{fabric.code}</p>
                  <p className="text-sm text-white mt-0.5">{fabric.name}</p>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    {fabric.machine && `Machine #${fabric.machine.machineNumber}`}
                  </p>
                </button>
              ))}
            </div>
          )}
          {showDropdown && codeQuery && filteredByCode.length === 0 && (
            <div className="absolute z-50 w-full mt-2 bg-factory-dark border border-factory-border rounded-xl p-4 text-center text-neutral-400">
              No fabrics found with this code
            </div>
          )}
        </div>
      )}

      {/* QR Code Scanner */}
      {!isLoading && activeTab === 'qr' && (
        <div className="space-y-3">
          {!isCameraActive ? (
            <button
              onClick={startCamera}
              className="w-full py-8 rounded-xl border-2 border-dashed border-factory-border hover:border-primary-500/50 bg-factory-gray/50 transition-colors flex flex-col items-center justify-center gap-3 text-neutral-400 hover:text-white"
            >
              <Camera className="w-12 h-12" />
              <span className="text-sm font-medium">Click to open camera</span>
              <span className="text-xs text-neutral-500">Point camera at fabric QR code</span>
            </button>
          ) : (
            <div className="space-y-3">
              <div
                ref={scannerContainerRef}
                className="relative rounded-xl overflow-hidden bg-black aspect-[4/3]"
              >
                {isSearching && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
                    <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
                  </div>
                )}
              </div>
              {cameraError && (
                <p className="text-sm text-red-400 text-center">{cameraError}</p>
              )}
              <Button
                variant="secondary"
                className="w-full"
                onClick={stopCamera}
              >
                <X className="w-4 h-4 mr-2" />
                Close Camera
              </Button>
            </div>
          )}

          {/* Manual QR Input Fallback */}
          <div className="pt-3 border-t border-factory-border">
            <p className="text-xs text-neutral-500 mb-2 text-center">Or enter QR code / fabric code manually</p>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter QR / code..."
                className="flex-1 px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono text-sm"
                onKeyDown={async (e) => {
                  if (e.key === 'Enter') {
                    const input = e.target as HTMLInputElement;
                    if (input.value.trim()) {
                      await handleQrScan(input.value.trim());
                      input.value = '';
                    }
                  }
                }}
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={async (e) => {
                  const input = (e.target as HTMLElement).parentElement?.querySelector('input');
                  if (input && input.value.trim()) {
                    await handleQrScan(input.value.trim());
                    input.value = '';
                  }
                }}
              >
                Find
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close dropdown */}
      {showDropdown && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowDropdown(false)}
        />
      )}
    </div>
  );
}
