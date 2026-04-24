'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { useToast } from '@/contexts/ToastContext';
import { fabricsApi, Fabric, FabricLedgerEntry, FabricLedgerLookup } from '@/lib/api/fabrics';
import {
  Search,
  QrCode,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ArrowDownToLine,
  ArrowUpFromLine,
  FileSpreadsheet,
  Shirt,
} from 'lucide-react';

export default function FabricLedgerPage() {
  const { showToast } = useToast();
  const searchParams = useSearchParams();

  // Check for fabric param to auto-load
  const fabricParam = searchParams.get('fabric');

  // Fabric search state
  const [fabrics, setFabrics] = useState<Fabric[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [qrInput, setQrInput] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedFabric, setSelectedFabric] = useState<FabricLedgerLookup | null>(null);

  // Date filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Ledger data
  const [entries, setEntries] = useState<FabricLedgerEntry[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  // Load ledger for selected fabric
  const loadLedger = useCallback(async (fabricId: number, page = 1) => {
    setIsLoading(true);
    try {
      const params: { startDate?: string; endDate?: string; page: number; limit: number } = {
        page,
        limit: pagination.limit,
      };
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const data = await fabricsApi.getLedger(fabricId, params);
      setSelectedFabric(data.fabric);
      setEntries(data.entries);
      setPagination(data.pagination);
    } catch (error: any) {
      showToast('error', error.response?.data?.error || 'Failed to load ledger');
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate, pagination.limit, showToast]);

  // Load fabrics for dropdown
  useEffect(() => {
    const loadFabrics = async () => {
      try {
        const data = await fabricsApi.getAll();
        setFabrics(data);
      } catch (error) {
        console.error('Failed to load fabrics:', error);
      }
    };
    loadFabrics();
  }, []);

  // Auto-load fabric from URL param
  useEffect(() => {
    if (fabricParam && fabrics.length > 0) {
      const fabricId = parseInt(fabricParam, 10);
      if (!isNaN(fabricId)) {
        const fabric = fabrics.find(f => f.id === fabricId);
        if (fabric) {
          setSearchQuery(fabric.name);
          loadLedger(fabricId);
        }
      }
    }
  }, [fabricParam, fabrics, loadLedger]);

  // Filter fabrics based on search
  const filteredFabrics = fabrics.filter((f) => {
    const query = searchQuery.toLowerCase();
    return (
      f.name.toLowerCase().includes(query) ||
      f.code.toLowerCase().includes(query)
    );
  });

  // Handle fabric selection
  const handleSelectFabric = (fabric: Fabric) => {
    setSearchQuery(fabric.name);
    setShowDropdown(false);
    loadLedger(fabric.id);
  };

  // Handle QR code search
  const handleQrSearch = async () => {
    if (!qrInput.trim()) return;

    setIsSearching(true);
    try {
      // Find fabric by code or QR payload
      const fabric = fabrics.find(
        (f) =>
          f.code === qrInput.trim().toUpperCase() ||
          f.qrPayload === qrInput.trim().toUpperCase()
      );

      if (fabric) {
        setSelectedFabric({
          id: fabric.id,
          code: fabric.code,
          name: fabric.name,
          qrPayload: fabric.qrPayload,
          currentStock: fabric.currentStock,
          department: fabric.department ? { id: fabric.department.id, name: fabric.department.name } : null,
          group: fabric.group ? { id: fabric.group.id, name: fabric.group.name } : null,
        });
        setSearchQuery(fabric.name);
        setQrInput('');
        loadLedger(fabric.id);
      } else {
        showToast('error', 'Fabric not found');
      }
    } catch (error: any) {
      showToast('error', error.response?.data?.error || 'Fabric not found');
    } finally {
      setIsSearching(false);
    }
  };

  // Handle date filter apply
  const handleApplyFilters = () => {
    if (selectedFabric) {
      loadLedger(selectedFabric.id, 1);
    }
  };

  // Handle pagination
  const handlePageChange = (newPage: number) => {
    if (selectedFabric && newPage >= 1 && newPage <= pagination.totalPages) {
      loadLedger(selectedFabric.id, newPage);
    }
  };

  // Format date for display
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  // Get reference badge color
  const getReferenceBadge = (reference: string) => {
    const colors: Record<string, string> = {
      'Stock In': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      'Stock Out': 'bg-red-500/20 text-red-400 border-red-500/30',
      'Production': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      'Adjustment': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    };
    return colors[reference] || 'bg-neutral-500/20 text-neutral-400 border-neutral-500/30';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Fabric Ledger</h1>
        <p className="text-neutral-400 mt-1">View stock movement history for fabrics</p>
      </div>

      {/* Search Section */}
      <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Fabric Search */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-300">Search Fabric</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="w-5 h-5 text-neutral-500" />
              </div>
              <Input
                placeholder="Search by name or fabric code..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                className="pl-12"
              />
              {/* Dropdown */}
              {showDropdown && searchQuery && filteredFabrics.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-factory-gray border border-factory-border rounded-xl shadow-lg max-h-60 overflow-auto">
                  {filteredFabrics.slice(0, 10).map((fabric) => (
                    <button
                      key={fabric.id}
                      onClick={() => handleSelectFabric(fabric)}
                      className="w-full px-4 py-3 text-left hover:bg-factory-border/50 transition-colors border-b border-factory-border/50 last:border-0"
                    >
                      <p className="text-sm font-medium text-white">{fabric.name}</p>
                      <p className="text-xs text-neutral-400">
                        {fabric.code}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* QR Code Search */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-300">Search by QR Code</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <QrCode className="w-5 h-5 text-neutral-500" />
                </div>
                <Input
                  placeholder="Scan or enter QR code..."
                  value={qrInput}
                  onChange={(e) => setQrInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleQrSearch()}
                  className="pl-12"
                />
              </div>
              <Button onClick={handleQrSearch} disabled={isSearching || !qrInput.trim()}>
                {isSearching ? 'Searching...' : 'Search'}
              </Button>
            </div>
          </div>
        </div>

        {/* Date Filters */}
        <div className="mt-6 pt-6 border-t border-factory-border">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-300">Start Date</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Calendar className="w-4 h-4 text-neutral-500" />
                </div>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="pl-12 w-44"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-300">End Date</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Calendar className="w-4 h-4 text-neutral-500" />
                </div>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="pl-12 w-44"
                />
              </div>
            </div>
            <Button variant="secondary" onClick={handleApplyFilters} disabled={!selectedFabric}>
              Apply Filters
            </Button>
            {(startDate || endDate) && (
              <Button
                variant="ghost"
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                  if (selectedFabric) loadLedger(selectedFabric.id, 1);
                }}
              >
                Clear
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Selected Fabric Info */}
      {selectedFabric && (
        <div className="bg-gradient-to-br from-primary-500/10 to-primary-600/5 rounded-2xl border border-primary-500/20 p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">{selectedFabric.name}</h2>
              <div className="flex flex-wrap gap-4 mt-2 text-sm text-neutral-400">
                <span>Code: <span className="text-primary-400 font-mono">{selectedFabric.code}</span></span>
                {selectedFabric.qrPayload && (
                  <span>QR: <span className="text-neutral-300 font-mono">{selectedFabric.qrPayload}</span></span>
                )}
                {selectedFabric.department && (
                  <span>Dept: <span className="text-neutral-300">{selectedFabric.department.name}</span></span>
                )}
                {selectedFabric.group && (
                  <span>Group: <span className="text-neutral-300">{selectedFabric.group.name}</span></span>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-neutral-400">Current Stock</p>
              <p className="text-2xl font-bold text-white">
                {parseFloat(selectedFabric.currentStock).toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Ledger Table */}
      {selectedFabric && (
        <div className="bg-factory-dark rounded-2xl border border-factory-border overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-factory-gray/50 border-b border-factory-border">
            <div className="col-span-2 text-xs font-semibold text-neutral-400 uppercase tracking-wider">
              Date
            </div>
            <div className="col-span-2 text-xs font-semibold text-neutral-400 uppercase tracking-wider">
              Reference
            </div>
            <div className="col-span-2 text-xs font-semibold text-neutral-400 uppercase tracking-wider">
              Ref #
            </div>
            <div className="col-span-1 text-xs font-semibold text-neutral-400 uppercase tracking-wider text-right">
              Qty In
            </div>
            <div className="col-span-1 text-xs font-semibold text-neutral-400 uppercase tracking-wider text-right">
              Qty Out
            </div>
            <div className="col-span-2 text-xs font-semibold text-neutral-400 uppercase tracking-wider text-right">
              Balance
            </div>
            <div className="col-span-2 text-xs font-semibold text-neutral-400 uppercase tracking-wider">
              Notes
            </div>
          </div>

          {/* Table Body */}
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
            </div>
          ) : entries.length > 0 ? (
            <div className="divide-y divide-factory-border">
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-factory-gray/30 transition-colors items-center"
                >
                  {/* Date */}
                  <div className="col-span-2">
                    <span className="text-sm text-neutral-300">{formatDate(entry.date)}</span>
                  </div>

                  {/* Reference */}
                  <div className="col-span-2">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium ${getReferenceBadge(entry.reference)}`}>
                      {entry.reference === 'Stock In' && <ArrowDownToLine className="w-3 h-3" />}
                      {entry.reference === 'Stock Out' && <ArrowUpFromLine className="w-3 h-3" />}
                      {entry.reference === 'Production' && <FileSpreadsheet className="w-3 h-3" />}
                      {entry.reference}
                    </span>
                  </div>

                  {/* Reference Number */}
                  <div className="col-span-2">
                    <span className="text-sm font-mono text-neutral-400">
                      {entry.referenceNumber || '-'}
                    </span>
                  </div>

                  {/* Qty In */}
                  <div className="col-span-1 text-right">
                    {entry.qtyIn !== null && entry.qtyIn > 0 ? (
                      <span className="text-sm font-semibold text-emerald-400">
                        +{entry.qtyIn.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </span>
                    ) : (
                      <span className="text-sm text-neutral-600">-</span>
                    )}
                  </div>

                  {/* Qty Out */}
                  <div className="col-span-1 text-right">
                    {entry.qtyOut !== null && entry.qtyOut > 0 ? (
                      <span className="text-sm font-semibold text-red-400">
                        -{entry.qtyOut.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </span>
                    ) : (
                      <span className="text-sm text-neutral-600">-</span>
                    )}
                  </div>

                  {/* Balance */}
                  <div className="col-span-2 text-right">
                    <span className="text-sm font-semibold text-white">
                      {entry.balance.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </span>
                  </div>

                  {/* Notes */}
                  <div className="col-span-2">
                    <span className="text-sm text-neutral-400 truncate block" title={entry.notes || ''}>
                      {entry.notes || '-'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-full bg-factory-gray mx-auto flex items-center justify-center mb-4">
                <FileSpreadsheet className="w-8 h-8 text-neutral-500" />
              </div>
              <p className="text-neutral-400">No ledger entries found</p>
              <p className="text-sm text-neutral-500 mt-1">
                Stock movements will appear here
              </p>
            </div>
          )}

          {/* Pagination */}
          {entries.length > 0 && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-factory-border bg-factory-gray/30">
              <p className="text-sm text-neutral-400">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                {pagination.total} entries
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm text-neutral-300">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.totalPages}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty State - No fabric selected */}
      {!selectedFabric && !isLoading && (
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-16 text-center">
          <div className="w-20 h-20 rounded-full bg-factory-gray mx-auto flex items-center justify-center mb-6">
            <Shirt className="w-10 h-10 text-neutral-500" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">Select a Fabric</h3>
          <p className="text-neutral-400 max-w-md mx-auto">
            Search for a fabric by name, code, or scan its QR code to view the ledger history
          </p>
        </div>
      )}
    </div>
  );
}
