'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from '@/components/atoms/Input';
import { Button } from '@/components/atoms/Button';
import { Search, Hash, QrCode, Camera, X, Loader2 } from 'lucide-react';
import { productsApi } from '@/lib/api/products';
import { ProductLookup } from '@/lib/types/product';
import { cn } from '@/lib/utils/cn';

type SearchTab = 'name' | 'article' | 'qr';

interface ProductFinderProps {
  onProductSelect: (product: any) => void;
  selectedProduct: any | null;
  onClear: () => void;
}

export function ProductFinder({ onProductSelect, selectedProduct, onClear }: ProductFinderProps) {
  const [activeTab, setActiveTab] = useState<SearchTab>('name');
  const [products, setProducts] = useState<ProductLookup[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [articleQuery, setArticleQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const scannerRef = useRef<any>(null);
  const scannerContainerRef = useRef<HTMLDivElement>(null);

  // Load products for autocomplete
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

  // Filter products by name
  const filteredByName = products.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filter products by article number
  const filteredByArticle = products.filter((p) =>
    p.articleNumber && p.articleNumber.toLowerCase().includes(articleQuery.toLowerCase())
  );

  // Handle product selection
  const handleSelectProduct = async (product: ProductLookup) => {
    setShowDropdown(false);
    setSearchQuery('');
    setArticleQuery('');
    try {
      const fullProduct = await productsApi.getById(product.id);
      onProductSelect(fullProduct);
    } catch (error) {
      onProductSelect(product);
    }
  };

  // Handle QR scan result
  const handleQrScan = useCallback(async (qrCode: string) => {
    if (isSearching) return;
    setIsSearching(true);
    try {
      const product = await productsApi.searchByQR(qrCode);
      onProductSelect(product);
      stopCamera();
    } catch (error: any) {
      setCameraError('Product not found for this QR code');
      setTimeout(() => setCameraError(null), 3000);
    } finally {
      setIsSearching(false);
    }
  }, [isSearching, onProductSelect]);

  // Start camera for QR scanning
  const startCamera = async () => {
    setCameraError(null);
    setIsCameraActive(true);

    try {
      const { Html5Qrcode } = await import('html5-qrcode');

      if (!scannerContainerRef.current) return;

      // Create scanner element if it doesn't exist
      let scannerId = 'qr-scanner-region';
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
        () => {} // Ignore scan errors
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
    { id: 'article' as SearchTab, label: 'By Article', icon: Hash },
    { id: 'qr' as SearchTab, label: 'Scan QR', icon: QrCode },
  ];

  // If product is selected, show the selection
  if (selectedProduct) {
    return (
      <div className="space-y-3">
        <label className="block text-sm font-medium text-neutral-300">Product *</label>
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-emerald-400 mb-1">Selected Product</p>
              <p className="text-white font-medium truncate">{selectedProduct.name}</p>
              <p className="text-sm text-neutral-400 mt-1">
                {selectedProduct.articleNumber && (
                  <span className="font-mono text-primary-400">{selectedProduct.articleNumber}</span>
                )}
                {selectedProduct.qrCode && (
                  <span className="ml-3 text-neutral-500">QR: {selectedProduct.qrCode}</span>
                )}
              </p>
              {selectedProduct.currentStock !== undefined && (
                <p className="text-sm text-neutral-400 mt-1">
                  Current Stock: <span className="text-white">{selectedProduct.currentStock} units</span>
                </p>
              )}
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
      <label className="block text-sm font-medium text-neutral-300">Product Finder *</label>

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

      {/* Search by Name */}
      {activeTab === 'name' && (
        <div className="relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
            <input
              type="text"
              placeholder="Type product name..."
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
              {filteredByName.slice(0, 10).map((product) => (
                <button
                  key={product.id}
                  onClick={() => handleSelectProduct(product)}
                  className="w-full px-4 py-3 text-left hover:bg-factory-gray transition-colors border-b border-factory-border/50 last:border-0"
                >
                  <p className="text-white font-medium">{product.name}</p>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    {product.articleNumber && <span className="font-mono text-primary-400">{product.articleNumber}</span>}
                    {product.currentStock !== undefined && (
                      <span className="ml-2">Stock: {product.currentStock}</span>
                    )}
                  </p>
                </button>
              ))}
            </div>
          )}
          {showDropdown && searchQuery && filteredByName.length === 0 && (
            <div className="absolute z-50 w-full mt-2 bg-factory-dark border border-factory-border rounded-xl p-4 text-center text-neutral-400">
              No products found
            </div>
          )}
        </div>
      )}

      {/* Search by Article Number */}
      {activeTab === 'article' && (
        <div className="relative">
          <div className="relative">
            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
            <input
              type="text"
              placeholder="Enter article number (e.g., ART-0001)..."
              value={articleQuery}
              onChange={(e) => {
                setArticleQuery(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-factory-gray border border-factory-border text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono"
            />
          </div>
          {showDropdown && articleQuery && filteredByArticle.length > 0 && (
            <div className="absolute z-50 w-full mt-2 bg-factory-dark border border-factory-border rounded-xl shadow-xl max-h-60 overflow-auto">
              {filteredByArticle.slice(0, 10).map((product) => (
                <button
                  key={product.id}
                  onClick={() => handleSelectProduct(product)}
                  className="w-full px-4 py-3 text-left hover:bg-factory-gray transition-colors border-b border-factory-border/50 last:border-0"
                >
                  <p className="font-mono text-primary-400 font-medium">{product.articleNumber}</p>
                  <p className="text-sm text-white mt-0.5">{product.name}</p>
                </button>
              ))}
            </div>
          )}
          {showDropdown && articleQuery && filteredByArticle.length === 0 && (
            <div className="absolute z-50 w-full mt-2 bg-factory-dark border border-factory-border rounded-xl p-4 text-center text-neutral-400">
              No products found with this article number
            </div>
          )}
        </div>
      )}

      {/* QR Code Scanner */}
      {activeTab === 'qr' && (
        <div className="space-y-3">
          {!isCameraActive ? (
            <button
              onClick={startCamera}
              className="w-full py-8 rounded-xl border-2 border-dashed border-factory-border hover:border-primary-500/50 bg-factory-gray/50 transition-colors flex flex-col items-center justify-center gap-3 text-neutral-400 hover:text-white"
            >
              <Camera className="w-12 h-12" />
              <span className="text-sm font-medium">Click to open camera</span>
              <span className="text-xs text-neutral-500">Point camera at product QR code</span>
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
            <p className="text-xs text-neutral-500 mb-2 text-center">Or enter QR code manually</p>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter QR code..."
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
