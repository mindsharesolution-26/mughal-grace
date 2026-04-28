'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/atoms/Button';
import { dyeingRollsApi } from '@/lib/api/dyeing';
import { ScannedRoll, AvailableRoll } from '@/lib/types/dyeing';
import { Scan, AlertCircle, CheckCircle, Loader2, X, Edit3, Search, Package, Check } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface RollQRScannerProps {
  onRollScanned: (roll: ScannedRoll) => void;
  onError?: (error: string, scanValue: string) => void;
  autoFocus?: boolean;
  placeholder?: string;
  label?: string;
  className?: string;
  scannedRolls?: ScannedRoll[];
  onRemoveRoll?: (rollId: number) => void;
  fabricName?: string; // Used for manual entry
  fabricId?: number | null; // Used to fetch available rolls for the selected fabric
}

type ScanStatus = 'idle' | 'scanning' | 'success' | 'error' | 'duplicate';
type EntryMode = 'stock' | 'scan' | 'manual';

// Counter for generating temporary IDs for manual entries
let manualEntryIdCounter = -1;

export function RollQRScanner({
  onRollScanned,
  onError,
  autoFocus = true,
  placeholder = 'Scan QR code or enter roll number...',
  label = 'Scan Roll',
  className = '',
  scannedRolls = [],
  onRemoveRoll,
  fabricName = 'Unknown',
  fabricId,
}: RollQRScannerProps) {
  const [entryMode, setEntryMode] = useState<EntryMode>('stock');
  const [scanValue, setScanValue] = useState('');
  const [status, setStatus] = useState<ScanStatus>('idle');
  const [message, setMessage] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Manual entry fields
  const [manualRollNumber, setManualRollNumber] = useState('');
  const [manualWeight, setManualWeight] = useState('');
  const manualRollRef = useRef<HTMLInputElement>(null);

  // Available rolls from stock
  const [availableRolls, setAvailableRolls] = useState<AvailableRoll[]>([]);
  const [isLoadingRolls, setIsLoadingRolls] = useState(false);

  // Fetch available rolls when fabricId changes
  useEffect(() => {
    const fetchAvailableRolls = async () => {
      if (!fabricId) {
        setAvailableRolls([]);
        return;
      }

      setIsLoadingRolls(true);
      try {
        const rolls = await dyeingRollsApi.getAvailable({ fabricId, limit: 200 });
        setAvailableRolls(rolls);
      } catch (error) {
        console.error('Failed to fetch available rolls:', error);
        setAvailableRolls([]);
      } finally {
        setIsLoadingRolls(false);
      }
    };

    fetchAvailableRolls();
  }, [fabricId]);

  useEffect(() => {
    if (autoFocus) {
      if (entryMode === 'scan' && inputRef.current) {
        inputRef.current.focus();
      } else if (entryMode === 'manual' && manualRollRef.current) {
        manualRollRef.current.focus();
      }
    }
  }, [autoFocus, entryMode]);

  // Check if a roll is already added
  const isRollAdded = useCallback((rollId: number) => {
    return scannedRolls.some((r) => r.id === rollId);
  }, [scannedRolls]);

  // Add roll from available stock
  const handleAddFromStock = useCallback((roll: AvailableRoll) => {
    if (isRollAdded(roll.id)) return;

    const scannedRoll: ScannedRoll = {
      id: roll.id,
      rollNumber: roll.rollNumber,
      fabricType: roll.fabricType,
      greyWeight: roll.greyWeight,
      grade: roll.grade,
      status: 'GREY_STOCK',
      producedAt: roll.producedAt,
      machine: roll.machine,
    };

    onRollScanned(scannedRoll);
    setStatus('success');
    setMessage(`Added: ${roll.rollNumber} - ${roll.greyWeight} kg`);
    setTimeout(() => {
      setStatus('idle');
      setMessage('');
    }, 1000);
  }, [isRollAdded, onRollScanned]);

  // Add all available rolls
  const handleAddAllFromStock = useCallback(() => {
    const rollsToAdd = availableRolls.filter((r) => !isRollAdded(r.id));
    rollsToAdd.forEach((roll) => {
      const scannedRoll: ScannedRoll = {
        id: roll.id,
        rollNumber: roll.rollNumber,
        fabricType: roll.fabricType,
        greyWeight: roll.greyWeight,
        grade: roll.grade,
        status: 'GREY_STOCK',
        producedAt: roll.producedAt,
        machine: roll.machine,
      };
      onRollScanned(scannedRoll);
    });

    if (rollsToAdd.length > 0) {
      setStatus('success');
      setMessage(`Added ${rollsToAdd.length} rolls`);
      setTimeout(() => {
        setStatus('idle');
        setMessage('');
      }, 1500);
    }
  }, [availableRolls, isRollAdded, onRollScanned]);

  const handleLookup = useCallback(
    async (value: string) => {
      const trimmedValue = value.trim();
      if (!trimmedValue) return;

      // Check for duplicate
      const isDuplicate = scannedRolls.some(
        (r) => r.rollNumber.toLowerCase() === trimmedValue.toLowerCase() ||
               r.qrCode?.toLowerCase() === trimmedValue.toLowerCase()
      );

      if (isDuplicate) {
        setStatus('duplicate');
        setMessage('Roll already added');
        setTimeout(() => {
          setStatus('idle');
          setMessage('');
          setScanValue('');
          inputRef.current?.focus();
        }, 2000);
        return;
      }

      setStatus('scanning');
      setMessage('Looking up roll...');

      try {
        const roll = await dyeingRollsApi.lookupByQR(trimmedValue);

        setStatus('success');
        setMessage(`Found: ${roll.rollNumber} - ${roll.greyWeight} kg`);
        onRollScanned(roll);
        setScanValue('');

        setTimeout(() => {
          setStatus('idle');
          setMessage('');
          inputRef.current?.focus();
        }, 1500);
      } catch (error: any) {
        const errorMessage = error.response?.data?.error || 'Roll not found';
        setStatus('error');
        setMessage(errorMessage);

        if (onError) {
          onError(errorMessage, trimmedValue);
        }

        setTimeout(() => {
          setStatus('idle');
          setMessage('');
          setScanValue('');
          inputRef.current?.focus();
        }, 3000);
      }
    },
    [onRollScanned, onError, scannedRolls]
  );

  // Handle manual entry submission
  const handleManualAdd = useCallback(() => {
    const rollNumber = manualRollNumber.trim().toUpperCase();
    const weight = parseFloat(manualWeight);

    if (!rollNumber) {
      setStatus('error');
      setMessage('Roll number is required');
      setTimeout(() => { setStatus('idle'); setMessage(''); }, 2000);
      return;
    }

    if (!weight || weight <= 0) {
      setStatus('error');
      setMessage('Valid weight is required');
      setTimeout(() => { setStatus('idle'); setMessage(''); }, 2000);
      return;
    }

    // Check for duplicate
    const isDuplicate = scannedRolls.some(
      (r) => r.rollNumber.toLowerCase() === rollNumber.toLowerCase()
    );

    if (isDuplicate) {
      setStatus('duplicate');
      setMessage('Roll already added');
      setTimeout(() => { setStatus('idle'); setMessage(''); }, 2000);
      return;
    }

    // Create manual roll entry with temporary negative ID
    const manualRoll: ScannedRoll = {
      id: manualEntryIdCounter--,
      rollNumber: rollNumber,
      fabricType: fabricName,
      greyWeight: weight.toFixed(2),
      grade: 'A',
      status: 'MANUAL',
      producedAt: new Date().toISOString(),
    };

    onRollScanned(manualRoll);
    setManualRollNumber('');
    setManualWeight('');
    setStatus('success');
    setMessage(`Added: ${rollNumber} - ${weight.toFixed(2)} kg`);

    setTimeout(() => {
      setStatus('idle');
      setMessage('');
      manualRollRef.current?.focus();
    }, 1500);
  }, [manualRollNumber, manualWeight, scannedRolls, fabricName, onRollScanned]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleLookup(scanValue);
    }
  };

  const handleManualKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleManualAdd();
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'success':
        return 'border-green-500 bg-green-500/10';
      case 'error':
        return 'border-red-500 bg-red-500/10';
      case 'duplicate':
        return 'border-yellow-500 bg-yellow-500/10';
      case 'scanning':
        return 'border-primary-500 bg-primary-500/10';
      default:
        return 'border-factory-border';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'duplicate':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case 'scanning':
        return <Loader2 className="w-5 h-5 text-primary-500 animate-spin" />;
      default:
        return entryMode === 'scan' ? <Scan className="w-5 h-5 text-neutral-400" /> : <Edit3 className="w-5 h-5 text-neutral-400" />;
    }
  };

  const totalWeight = scannedRolls.reduce((sum, r) => sum + Number(r.greyWeight), 0);
  const availableNotAdded = availableRolls.filter((r) => !isRollAdded(r.id));

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-neutral-300">{label}</label>

        {/* Entry Mode Toggle */}
        <div className="flex rounded-lg bg-factory-gray/50 p-0.5 border border-factory-border">
          <button
            type="button"
            onClick={() => setEntryMode('stock')}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-all',
              entryMode === 'stock'
                ? 'bg-primary-500 text-white'
                : 'text-neutral-400 hover:text-white'
            )}
          >
            <Package className="w-3.5 h-3.5" />
            Stock
            {availableRolls.length > 0 && (
              <span className={cn(
                'px-1.5 py-0.5 rounded text-[10px]',
                entryMode === 'stock' ? 'bg-white/20' : 'bg-primary-500/30 text-primary-400'
              )}>
                {availableRolls.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setEntryMode('scan')}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-all',
              entryMode === 'scan'
                ? 'bg-primary-500 text-white'
                : 'text-neutral-400 hover:text-white'
            )}
          >
            <Search className="w-3.5 h-3.5" />
            Scan
          </button>
          <button
            type="button"
            onClick={() => setEntryMode('manual')}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-all',
              entryMode === 'manual'
                ? 'bg-primary-500 text-white'
                : 'text-neutral-400 hover:text-white'
            )}
          >
            <Edit3 className="w-3.5 h-3.5" />
            Manual
          </button>
        </div>
      </div>

      {/* Stock Mode - Show available rolls for selected fabric */}
      {entryMode === 'stock' && (
        <div className="space-y-2">
          {!fabricId ? (
            <div className="text-center py-6 px-4 bg-factory-gray/30 rounded-xl border border-factory-border">
              <Package className="w-8 h-8 text-neutral-600 mx-auto mb-2" />
              <p className="text-neutral-400 text-sm">Select a fabric template to see available rolls</p>
            </div>
          ) : isLoadingRolls ? (
            <div className="text-center py-6">
              <Loader2 className="w-6 h-6 text-primary-500 animate-spin mx-auto mb-2" />
              <p className="text-neutral-400 text-sm">Loading available rolls...</p>
            </div>
          ) : availableRolls.length === 0 ? (
            <div className="text-center py-6 px-4 bg-factory-gray/30 rounded-xl border border-factory-border">
              <Package className="w-8 h-8 text-neutral-600 mx-auto mb-2" />
              <p className="text-neutral-400 text-sm">No rolls available for this fabric</p>
              <p className="text-neutral-500 text-xs mt-1">Try Scan or Manual entry mode</p>
            </div>
          ) : (
            <>
              {/* Add All Button */}
              {availableNotAdded.length > 0 && (
                <div className="flex items-center justify-between pb-2 border-b border-factory-border">
                  <span className="text-sm text-neutral-400">
                    {availableNotAdded.length} available ({availableRolls.length - availableNotAdded.length} already added)
                  </span>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleAddAllFromStock}
                  >
                    Add All ({availableNotAdded.length})
                  </Button>
                </div>
              )}

              {/* Available Rolls List */}
              <div className="max-h-48 overflow-y-auto space-y-1">
                {availableRolls.map((roll) => {
                  const added = isRollAdded(roll.id);
                  return (
                    <button
                      key={roll.id}
                      type="button"
                      onClick={() => !added && handleAddFromStock(roll)}
                      disabled={added}
                      className={cn(
                        'w-full flex items-center justify-between px-3 py-2 rounded-lg border transition-all text-left',
                        added
                          ? 'bg-green-500/10 border-green-500/30 cursor-default'
                          : 'bg-factory-gray/30 border-factory-border hover:border-primary-500 hover:bg-primary-500/10'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          'w-5 h-5 rounded border flex items-center justify-center',
                          added ? 'bg-green-500 border-green-500' : 'border-neutral-500'
                        )}>
                          {added && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <span className={cn(
                          'font-mono text-sm',
                          added ? 'text-green-400' : 'text-primary-400'
                        )}>
                          {roll.rollNumber}
                        </span>
                        <span className="text-neutral-500 text-xs">{roll.grade}</span>
                      </div>
                      <span className={cn(
                        'font-medium text-sm',
                        added ? 'text-green-400' : 'text-white'
                      )}>
                        {Number(roll.greyWeight).toFixed(2)} kg
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* Scan/Search Mode */}
      {entryMode === 'scan' && (
        <div className="flex gap-2">
          <div className="relative flex-1">
            <div className="absolute left-3 top-1/2 -translate-y-1/2">{getStatusIcon()}</div>
            <input
              ref={inputRef}
              type="text"
              value={scanValue}
              onChange={(e) => setScanValue(e.target.value.toUpperCase())}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={status === 'scanning'}
              className={cn(
                'w-full pl-10 pr-4 py-2.5 rounded-xl bg-factory-gray border text-white',
                'placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500',
                'font-mono uppercase',
                getStatusColor()
              )}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="characters"
              spellCheck={false}
            />
          </div>
          <Button
            type="button"
            onClick={() => handleLookup(scanValue)}
            disabled={!scanValue.trim() || status === 'scanning'}
          >
            Search
          </Button>
        </div>
      )}

      {/* Manual Entry Mode */}
      {entryMode === 'manual' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-neutral-500 mb-1">Roll / Article Number</label>
              <input
                ref={manualRollRef}
                type="text"
                value={manualRollNumber}
                onChange={(e) => setManualRollNumber(e.target.value.toUpperCase())}
                onKeyDown={handleManualKeyDown}
                placeholder="Enter roll number..."
                className={cn(
                  'w-full px-3 py-2.5 rounded-xl bg-factory-gray border text-white',
                  'placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500',
                  'font-mono uppercase',
                  getStatusColor()
                )}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="characters"
                spellCheck={false}
              />
            </div>
            <div>
              <label className="block text-xs text-neutral-500 mb-1">Weight (kg)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={manualWeight}
                onChange={(e) => setManualWeight(e.target.value)}
                onKeyDown={handleManualKeyDown}
                placeholder="Enter weight..."
                className={cn(
                  'w-full px-3 py-2.5 rounded-xl bg-factory-gray border text-white',
                  'placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500',
                  getStatusColor()
                )}
              />
            </div>
          </div>
          <Button
            type="button"
            onClick={handleManualAdd}
            disabled={!manualRollNumber.trim() || !manualWeight}
            className="w-full"
          >
            Add Roll
          </Button>
        </div>
      )}

      {message && (
        <div
          className={cn(
            'text-sm flex items-center gap-2',
            status === 'success' && 'text-green-400',
            status === 'error' && 'text-red-400',
            status === 'duplicate' && 'text-yellow-400',
            status === 'scanning' && 'text-neutral-400'
          )}
        >
          {message}
        </div>
      )}

      {/* Scanned/Added rolls list */}
      {scannedRolls.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-neutral-400">Added Rolls ({scannedRolls.length})</span>
            <span className="text-primary-400 font-medium">{totalWeight.toFixed(2)} kg</span>
          </div>
          <div className="max-h-48 overflow-y-auto space-y-1.5">
            {scannedRolls.map((roll) => (
              <div
                key={roll.id}
                className="flex items-center justify-between px-3 py-2 bg-factory-gray/50 rounded-lg border border-factory-border"
              >
                <div className="flex items-center gap-3">
                  <span className="text-primary-400 font-mono text-sm">{roll.rollNumber}</span>
                  {roll.status === 'MANUAL' && (
                    <span className="text-xs px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded">Manual</span>
                  )}
                  <span className="text-neutral-400 text-sm">{roll.fabricType}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-white font-medium">{Number(roll.greyWeight).toFixed(2)} kg</span>
                  {onRemoveRoll && (
                    <button
                      type="button"
                      onClick={() => onRemoveRoll(roll.id)}
                      className="p-1 text-neutral-500 hover:text-red-400 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default RollQRScanner;
