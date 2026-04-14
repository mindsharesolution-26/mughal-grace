'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Input } from '@/components/atoms/Input';
import { Button } from '@/components/atoms/Button';
import { fabricsApi } from '@/lib/api/settings';
import { Fabric } from '@/lib/types/settings';
import { Scan, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

interface FabricScannerProps {
  /**
   * Callback when a fabric is successfully found
   */
  onFabricFound: (fabric: Fabric) => void;

  /**
   * Callback when lookup fails (optional)
   */
  onError?: (error: string, scanValue: string) => void;

  /**
   * Whether to auto-focus the input field
   */
  autoFocus?: boolean;

  /**
   * Placeholder text for the input
   */
  placeholder?: string;

  /**
   * Whether to allow inactive fabrics (shows warning but still returns fabric)
   */
  allowInactive?: boolean;

  /**
   * Callback when an inactive fabric is scanned (optional)
   * Return false to block the fabric from being accepted
   */
  onInactiveFabric?: (fabric: Fabric) => boolean;

  /**
   * Label for the input field
   */
  label?: string;

  /**
   * Additional CSS classes
   */
  className?: string;
}

type ScanStatus = 'idle' | 'scanning' | 'success' | 'error' | 'inactive';

/**
 * FabricScanner Component
 *
 * Handles hardware barcode/QR scanner input for fabric lookup.
 * Works with keyboard wedge scanners that output text + Enter key.
 *
 * Scanner workflow:
 * 1. Scanner outputs scanned text into the input field
 * 2. User scans → input receives payload like "FABRIC|FAB000123" + Enter
 * 3. Component parses payload and looks up fabric via API
 * 4. Returns fabric record via onFabricFound callback
 *
 * Also supports manual entry of fabric codes (FAB000001) or QR payloads.
 */
export function FabricScanner({
  onFabricFound,
  onError,
  autoFocus = true,
  placeholder = 'Scan fabric QR code or enter code...',
  allowInactive = true,
  onInactiveFabric,
  label = 'Scan Fabric',
  className = '',
}: FabricScannerProps) {
  const [scanValue, setScanValue] = useState('');
  const [status, setStatus] = useState<ScanStatus>('idle');
  const [message, setMessage] = useState('');
  const [lastFabric, setLastFabric] = useState<Fabric | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus on mount
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const handleLookup = useCallback(
    async (value: string) => {
      const trimmedValue = value.trim();
      if (!trimmedValue) return;

      setStatus('scanning');
      setMessage('Looking up fabric...');

      try {
        const response = await fabricsApi.lookup(trimmedValue);
        const fabric = response.data;

        if (!fabric.isActive) {
          setStatus('inactive');
          setMessage(`Fabric ${fabric.code} is INACTIVE`);
          setLastFabric(fabric);

          // Check if inactive fabrics should be blocked
          if (onInactiveFabric) {
            const shouldAccept = onInactiveFabric(fabric);
            if (!shouldAccept) {
              if (onError) {
                onError('Fabric is inactive and cannot be used', trimmedValue);
              }
              return;
            }
          }

          if (allowInactive) {
            onFabricFound(fabric);
          } else {
            if (onError) {
              onError('Fabric is inactive', trimmedValue);
            }
          }
        } else {
          setStatus('success');
          setMessage(`Found: ${fabric.code} - ${fabric.name}`);
          setLastFabric(fabric);
          onFabricFound(fabric);
        }

        // Clear input after successful scan
        setScanValue('');

        // Reset status after delay
        setTimeout(() => {
          setStatus('idle');
          setMessage('');
          // Refocus for next scan
          if (inputRef.current) {
            inputRef.current.focus();
          }
        }, 2000);
      } catch (error: any) {
        const errorMessage = error.response?.data?.error || 'Fabric not found';
        setStatus('error');
        setMessage(errorMessage);
        setLastFabric(null);

        if (onError) {
          onError(errorMessage, trimmedValue);
        }

        // Reset status after delay
        setTimeout(() => {
          setStatus('idle');
          setMessage('');
          setScanValue('');
          // Refocus for retry
          if (inputRef.current) {
            inputRef.current.focus();
          }
        }, 3000);
      }
    },
    [onFabricFound, onError, allowInactive, onInactiveFabric]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Scanner typically sends Enter after the barcode data
    if (e.key === 'Enter') {
      e.preventDefault();
      handleLookup(scanValue);
    }
  };

  const handleManualSubmit = () => {
    handleLookup(scanValue);
  };

  const getStatusColor = () => {
    switch (status) {
      case 'success':
        return 'border-green-500 bg-green-500/10';
      case 'error':
        return 'border-red-500 bg-red-500/10';
      case 'inactive':
        return 'border-yellow-500 bg-yellow-500/10';
      case 'scanning':
        return 'border-primary-500 bg-primary-500/10';
      default:
        return '';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'inactive':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case 'scanning':
        return <Loader2 className="w-5 h-5 text-primary-500 animate-spin" />;
      default:
        return <Scan className="w-5 h-5 text-neutral-400" />;
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <label className="block text-sm font-medium text-neutral-300">{label}</label>

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
            className={`w-full pl-10 pr-4 py-2.5 rounded-xl bg-factory-gray border text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono uppercase ${getStatusColor()} ${
              status === 'idle' ? 'border-factory-border' : ''
            }`}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="characters"
            spellCheck={false}
          />
        </div>
        <Button
          type="button"
          onClick={handleManualSubmit}
          disabled={!scanValue.trim() || status === 'scanning'}
        >
          Lookup
        </Button>
      </div>

      {/* Status message */}
      {message && (
        <div
          className={`text-sm flex items-center gap-2 ${
            status === 'success'
              ? 'text-green-400'
              : status === 'error'
                ? 'text-red-400'
                : status === 'inactive'
                  ? 'text-yellow-400'
                  : 'text-neutral-400'
          }`}
        >
          {message}
        </div>
      )}

      {/* Last scanned fabric preview */}
      {lastFabric && status !== 'error' && (
        <div className="p-3 bg-factory-gray/50 rounded-lg border border-factory-border">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-primary-400 font-mono text-sm">{lastFabric.code}</span>
              <span className="text-white ml-2">{lastFabric.name}</span>
            </div>
            {!lastFabric.isActive && (
              <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded">
                Inactive
              </span>
            )}
          </div>
          {(lastFabric.type || lastFabric.composition) && (
            <div className="text-sm text-neutral-400 mt-1">
              {lastFabric.type && <span>{lastFabric.type}</span>}
              {lastFabric.type && lastFabric.composition && <span> | </span>}
              {lastFabric.composition && <span>{lastFabric.composition}</span>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default FabricScanner;
