'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/atoms/Button';
import { useToast } from '@/contexts/ToastContext';
import { needleTypesApi } from '@/lib/api/needles';
import {
  NeedleTypeWithStock,
  needleKindLabels,
  stockStatusColors,
  stockStatusLabels,
  StockStatus,
} from '@/lib/types/needle';
import { Upload, Copy, RefreshCw, QrCode, Image as ImageIcon, X, Check } from 'lucide-react';

export default function NeedleTypeDetailPage() {
  const router = useRouter();
  const params = useParams();
  const typeId = Number(params.id);
  const { showToast } = useToast();

  const [type, setType] = useState<NeedleTypeWithStock | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isRegeneratingBarcode, setIsRegeneratingBarcode] = useState(false);
  const [copiedBarcode, setCopiedBarcode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchType();
  }, [typeId]);

  const fetchType = async () => {
    try {
      setIsLoading(true);
      const data = await needleTypesApi.getById(typeId);
      setType(data);
    } catch (error: any) {
      showToast('error', error.response?.data?.error || 'Failed to load needle type');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast('error', 'Image must be less than 5MB');
      return;
    }

    setIsUploadingImage(true);
    try {
      const result = await needleTypesApi.uploadImage(typeId, file);
      setType((prev) => prev ? { ...prev, imageUrl: result.imageUrl } : null);
      showToast('success', 'Image uploaded successfully');
    } catch (error: any) {
      showToast('error', error.response?.data?.error || 'Failed to upload image');
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteImage = async () => {
    if (!confirm('Are you sure you want to delete this image?')) return;

    try {
      await needleTypesApi.deleteImage(typeId);
      setType((prev) => prev ? { ...prev, imageUrl: null } : null);
      showToast('success', 'Image deleted');
    } catch (error: any) {
      showToast('error', error.response?.data?.error || 'Failed to delete image');
    }
  };

  const handleRegenerateBarcode = async () => {
    if (!confirm('This will generate a new barcode. Existing printed barcodes will no longer work. Continue?')) return;

    setIsRegeneratingBarcode(true);
    try {
      const updated = await needleTypesApi.regenerateBarcode(typeId);
      setType((prev) => prev ? { ...prev, barcode: updated.barcode } : null);
      showToast('success', 'Barcode regenerated');
    } catch (error: any) {
      showToast('error', error.response?.data?.error || 'Failed to regenerate barcode');
    } finally {
      setIsRegeneratingBarcode(false);
    }
  };

  const copyBarcode = () => {
    if (type?.barcode) {
      navigator.clipboard.writeText(type.barcode);
      setCopiedBarcode(true);
      setTimeout(() => setCopiedBarcode(false), 2000);
      showToast('success', 'Barcode copied to clipboard');
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

  if (!type) {
    return (
      <div className="text-center py-12">
        <p className="text-error">Needle type not found</p>
        <Button className="mt-4" onClick={() => router.push('/needles/types')}>
          Back to Types
        </Button>
      </div>
    );
  }

  const getStockStatus = (): StockStatus => {
    const stock = type.stockSummary.currentStock;
    if (stock <= type.minStockLevel) return 'LOW';
    if (stock <= type.reorderPoint) return 'REORDER';
    return 'OK';
  };

  const stockStatus = getStockStatus();

  // Generate QR code URL using a public API
  const qrCodeUrl = type.barcode
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(type.barcode)}`
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm">
            <Link href="/needles" className="text-neutral-400 hover:text-white">
              Needles
            </Link>
            <span className="text-neutral-600">/</span>
            <Link href="/needles/types" className="text-neutral-400 hover:text-white">
              Types
            </Link>
            <span className="text-neutral-600">/</span>
            <span className="text-white">{type.name}</span>
          </div>
          <h1 className="text-2xl font-semibold text-white mt-2">{type.name}</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => router.back()}>
            Back
          </Button>
          <Link href={`/needles/types/${typeId}/edit`}>
            <Button variant="secondary">Edit</Button>
          </Link>
        </div>
      </div>

      {/* Image and Barcode Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Image Card */}
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Needle Photo</h3>
          <div className="flex items-start gap-4">
            <div className="w-40 h-40 rounded-xl border-2 border-dashed border-factory-border bg-factory-gray flex items-center justify-center overflow-hidden relative">
              {type.imageUrl ? (
                <>
                  <Image
                    src={type.imageUrl}
                    alt={type.name}
                    fill
                    className="object-cover"
                  />
                  <button
                    onClick={handleDeleteImage}
                    className="absolute top-2 right-2 p-1.5 bg-error/90 rounded-full text-white hover:bg-error"
                    title="Delete image"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <ImageIcon className="w-12 h-12 text-neutral-500" />
              )}
            </div>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleImageUpload}
                className="hidden"
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingImage}
              >
                <Upload className="w-4 h-4 mr-2" />
                {isUploadingImage ? 'Uploading...' : type.imageUrl ? 'Change' : 'Upload'}
              </Button>
              <p className="text-xs text-neutral-500 mt-2">
                JPEG, PNG, WebP, GIF (max 5MB)
              </p>
            </div>
          </div>
        </div>

        {/* Barcode Card */}
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Barcode / QR Code</h3>
          {type.barcode ? (
            <div className="flex items-start gap-4">
              {/* QR Code */}
              <div className="w-40 h-40 rounded-xl bg-white p-2 flex items-center justify-center">
                {qrCodeUrl && (
                  <Image
                    src={qrCodeUrl}
                    alt="QR Code"
                    width={150}
                    height={150}
                    className="object-contain"
                  />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <span className="font-mono text-lg text-primary-400 bg-factory-gray px-3 py-2 rounded-lg">
                    {type.barcode}
                  </span>
                  <button
                    onClick={copyBarcode}
                    className="p-2 text-neutral-400 hover:text-white hover:bg-factory-gray rounded-lg transition-colors"
                    title="Copy barcode"
                  >
                    {copiedBarcode ? (
                      <Check className="w-5 h-5 text-success" />
                    ) : (
                      <Copy className="w-5 h-5" />
                    )}
                  </button>
                </div>
                <p className="text-sm text-neutral-400 mb-3">
                  Scan this QR code or enter the barcode manually to identify this needle type
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRegenerateBarcode}
                  disabled={isRegeneratingBarcode}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${isRegeneratingBarcode ? 'animate-spin' : ''}`} />
                  Regenerate
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <div className="w-40 h-40 rounded-xl border-2 border-dashed border-factory-border bg-factory-gray flex items-center justify-center">
                <QrCode className="w-12 h-12 text-neutral-500" />
              </div>
              <div>
                <p className="text-neutral-400 mb-3">No barcode generated</p>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleRegenerateBarcode}
                  disabled={isRegeneratingBarcode}
                >
                  <QrCode className="w-4 h-4 mr-2" />
                  Generate Barcode
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Info Card */}
      <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-primary-400 font-mono text-sm">{type.code}</span>
            <h2 className="text-xl font-semibold text-white mt-1">{type.name}</h2>
            <p className="text-neutral-400 mt-1">{needleKindLabels[type.needleKind]}</p>
          </div>
          <div className="flex gap-2">
            <span
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                type.isActive
                  ? 'bg-success/20 text-success'
                  : 'bg-neutral-500/20 text-neutral-400'
              }`}
            >
              {type.isActive ? 'Active' : 'Inactive'}
            </span>
            <span
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${stockStatusColors[stockStatus].bg} ${stockStatusColors[stockStatus].text}`}
            >
              {stockStatusLabels[stockStatus]}
            </span>
          </div>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Specifications */}
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Specifications</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-neutral-400">Gauge</span>
              <span className="text-white">{type.gauge}G</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">Length</span>
              <span className="text-white">{type.length ? `${type.length}mm` : '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">Material</span>
              <span className="text-white">{type.material}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">Brand</span>
              <span className="text-white">{type.brand || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">Supplier Code</span>
              <span className="text-white">{type.supplierCode || '-'}</span>
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Pricing</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-neutral-400">Cost per Needle</span>
              <span className="text-white">
                {type.costPerNeedle
                  ? `${type.currency} ${Number(type.costPerNeedle).toFixed(2)}`
                  : '-'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">Currency</span>
              <span className="text-white">{type.currency}</span>
            </div>
          </div>
        </div>

        {/* Inventory Settings */}
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Inventory Settings</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-neutral-400">Min Stock Level</span>
              <span className="text-white">{type.minStockLevel.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">Reorder Point</span>
              <span className="text-white">{type.reorderPoint.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stock Summary */}
      <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Stock Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-factory-gray rounded-xl">
            <p className="text-sm text-neutral-400">Total Received</p>
            <p className="text-xl font-semibold text-white mt-1">
              {type.stockSummary.totalReceived.toLocaleString()}
            </p>
          </div>
          <div className="p-4 bg-factory-gray rounded-xl">
            <p className="text-sm text-neutral-400">Current Stock</p>
            <p className="text-xl font-semibold text-success mt-1">
              {type.stockSummary.currentStock.toLocaleString()}
            </p>
          </div>
          <div className="p-4 bg-factory-gray rounded-xl">
            <p className="text-sm text-neutral-400">Allocated</p>
            <p className="text-xl font-semibold text-blue-400 mt-1">
              {type.stockSummary.allocated.toLocaleString()}
            </p>
          </div>
          <div className="p-4 bg-factory-gray rounded-xl">
            <p className="text-sm text-neutral-400">Damaged</p>
            <p className="text-xl font-semibold text-error mt-1">
              {type.stockSummary.damaged.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Active Allocations */}
      {type.machineAllocations && type.machineAllocations.length > 0 && (
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Active Allocations</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-factory-border">
                  <th className="text-left text-sm font-medium text-neutral-400 pb-3">Machine</th>
                  <th className="text-right text-sm font-medium text-neutral-400 pb-3">Quantity</th>
                  <th className="text-left text-sm font-medium text-neutral-400 pb-3">Position</th>
                  <th className="text-left text-sm font-medium text-neutral-400 pb-3">Installed</th>
                </tr>
              </thead>
              <tbody>
                {type.machineAllocations.map((alloc) => (
                  <tr key={alloc.id} className="border-b border-factory-border last:border-0">
                    <td className="py-3">
                      <span className="text-white">
                        {alloc.machine?.machineNumber} - {alloc.machine?.name}
                      </span>
                    </td>
                    <td className="py-3 text-right text-white">
                      {alloc.installedQuantity.toLocaleString()}
                    </td>
                    <td className="py-3 text-neutral-300">{alloc.position || '-'}</td>
                    <td className="py-3 text-neutral-400">
                      {new Date(alloc.installedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Notes */}
      {type.notes && (
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Notes</h3>
          <p className="text-neutral-300 whitespace-pre-wrap">{type.notes}</p>
        </div>
      )}
    </div>
  );
}
