'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { useToast } from '@/contexts/ToastContext';
import { productsApi } from '@/lib/api/products';
import { rollsApi } from '@/lib/api/rolls';
import { machinesApi } from '@/lib/api/machines';
import { labelPrinter, buildLabelLines } from '@/lib/services/labelPrinter';
import { QRCodeSVG } from 'qrcode.react';
import type { RollLabelData } from '@/lib/types/roll';
import { ProductFinder } from '@/components/organisms/ProductFinder';
import { FabricFinder } from '@/components/organisms/FabricFinder';
import { FabricProductionLookup } from '@/lib/api/fabrics';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  X,
  Scale,
  CheckCircle,
  Wifi,
  WifiOff,
  Printer,
  QrCode,
  FileSpreadsheet,
  Layers,
  Plus,
  Trash2,
  Edit3,
  Save,
  Loader2,
  AlertCircle,
  Clock,
  Eye,
} from 'lucide-react';
import { Roll } from '@/lib/types/roll';

// Destination options for Fabric Out
const DESTINATIONS = [
  { value: 'DYEING', label: 'Dyeing' },
  { value: 'SALE', label: 'Sale' },
  { value: 'TRANSFER', label: 'Transfer' },
  { value: 'OTHER', label: 'Other' },
];

type ActivePanel = 'none' | 'fabric-in' | 'fabric-out';
type FabricInMode = 'single' | 'lot';

// LOT mode entry — tracks per-roll save & print status so the previous
// roll's barcode can print as soon as the next roll is added.
type LotRollSaveStatus = 'pending' | 'saving' | 'printed' | 'error';

interface LotRollEntry {
  id: number; // temporary ID for editing/removing
  weight: number;
  grade: string;
  saveStatus: LotRollSaveStatus;
  savedRoll?: any; // server response (carries real rollNumber + qrCode once saved)
  errorMessage?: string;
}

interface MachineLookup {
  id: number;
  machineNumber: string;
  name: string;
  status: string;
}

// Module-level lock to prevent duplicate submissions (survives React StrictMode re-renders)
let LOT_SAVE_IN_PROGRESS = false;

export default function DailyProductionPage() {
  const { showToast } = useToast();
  const [activePanel, setActivePanel] = useState<ActivePanel>('none');
  const [fabricInMode, setFabricInMode] = useState<FabricInMode>('single');

  // Machine data from API
  const [machines, setMachines] = useState<MachineLookup[]>([]);
  const [loadingMachines, setLoadingMachines] = useState(true);

  // Fabric In state
  const [selectedFabric, setSelectedFabric] = useState<FabricProductionLookup | null>(null);

  // Fabric Out state (uses Product)
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  // Shared state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [weight, setWeight] = useState('');
  const [isWeighingConnected, setIsWeighingConnected] = useState(true);

  // Fabric In specific state
  const [machineId, setMachineId] = useState('');

  // Fabric Out specific state
  const [destination, setDestination] = useState('');
  const [notes, setNotes] = useState('');

  // Label printing state
  const [isPrinting, setIsPrinting] = useState(false);
  const [lastCreatedRoll, setLastCreatedRoll] = useState<any>(null);

  // Preview modal state
  const [showPreview, setShowPreview] = useState(false);

  // LOT mode state
  const [lotRolls, setLotRolls] = useState<LotRollEntry[]>([]);
  const [lotNextId, setLotNextId] = useState(1);
  const [editingRollId, setEditingRollId] = useState<number | null>(null);
  const [editWeight, setEditWeight] = useState('');
  const [lotCompleted, setLotCompleted] = useState(false);
  const [lotSummarySnapshot, setLotSummarySnapshot] = useState<{
    totalRolls: number;
    totalWeight: number;
    averageWeight: number;
  } | null>(null);
  // Generated when the first roll of a LOT is added; printed on every label of that LOT
  const [lotNumber, setLotNumber] = useState<string | null>(null);
  // Holds the label data for the on-screen Preview Label modal (null = closed)
  const [previewLabelData, setPreviewLabelData] = useState<RollLabelData | null>(null);

  // Live ref to lotRolls so async handlers (like handleLotSave) can read the
  // latest state without stale-closure issues.
  const lotRollsRef = useRef<LotRollEntry[]>([]);
  useEffect(() => {
    lotRollsRef.current = lotRolls;
  }, [lotRolls]);


  // Load machines on mount
  useEffect(() => {
    async function loadMachines() {
      try {
        const data = await machinesApi.getLookup();
        setMachines(data);
      } catch (error) {
        console.error('Failed to load machines:', error);
        showToast('error', 'Failed to load machines');
      } finally {
        setLoadingMachines(false);
      }
    }
    loadMachines();
  }, []);

  // Simulate weight detection
  const simulateWeightDetection = () => {
    const detectedWeight = (15 + Math.random() * 10).toFixed(2);
    setWeight(detectedWeight);
    showToast('success', `Weight detected: ${detectedWeight} kg`);
  };

  // Reset form
  const resetForm = () => {
    setSelectedFabric(null);
    setSelectedProduct(null);
    setWeight('');
    setMachineId('');
    setDestination('');
    setNotes('');
    setLastCreatedRoll(null);
  };

  // Close panel — warns if there are still-pending LOT rolls (already-saved ones are safe)
  const closePanel = () => {
    const hasPending = lotRolls.some((r) => r.saveStatus === 'pending' || r.saveStatus === 'error');
    if (activePanel === 'fabric-in' && fabricInMode === 'lot' && hasPending) {
      if (!confirm('You have unsaved rolls. Are you sure you want to exit?')) {
        return;
      }
    }
    setActivePanel('none');
    resetForm();
    resetLotMode();
    setFabricInMode('single');
  };

  // Switch between Single and LOT inside the Fabric In panel
  const switchFabricInMode = (newMode: FabricInMode) => {
    if (newMode === fabricInMode) return;
    if (newMode === 'single' && lotRolls.length > 0) {
      if (!confirm('Switching to Single mode will discard the rolls in LOT. Continue?')) {
        return;
      }
      setLotRolls([]);
      setLotNextId(1);
    }
    setWeight('');
    setEditingRollId(null);
    setEditWeight('');
    setFabricInMode(newMode);
  };

  // Build label data from a saved roll (used by both Print and Preview)
  const buildLabelDataForRoll = (roll: any): RollLabelData | null => {
    if (!roll?.qrCode) return null;
    // Prefer per-roll fabric snapshot (set at save time) so re-printing
    // works even after the user selects a different fabric.
    const fabric = roll.fabricSnapshot || selectedFabric;
    return {
      qrCode: roll.qrCode,
      rollNumber: roll.rollNumber,
      weight: Number(roll.greyWeight),
      fabricType: roll.fabricType,
      date: new Date().toLocaleDateString(),
      machineNumber: roll.machine?.machineNumber,
      brandName: fabric?.brand?.name,
      productName: fabric?.name || roll.fabricType,
      articleNumber: fabric?.code,
      color: fabric?.color?.name,
      gsm: fabric?.gsm ?? undefined,
      width: fabric?.width ?? undefined,
      widthUnit: fabric?.widthUnit ?? undefined,
      mtr: roll.greyLength ?? undefined,
      lotNumber: roll.lotNumber || undefined,
    };
  };

  // Print QR label for a roll
  const printRollLabel = async (roll: any) => {
    const labelData = buildLabelDataForRoll(roll);
    if (!labelData) {
      showToast('error', 'Roll does not have a QR code');
      return;
    }

    setIsPrinting(true);
    try {

      const result = await labelPrinter.print(labelData);

      if (result.success) {
        showToast('success', `Label printed via ${result.method}`);
      } else {
        showToast('error', 'Failed to print label');
      }
    } catch (error) {
      console.error('Print error:', error);
      showToast('error', 'Failed to print label');
    } finally {
      setIsPrinting(false);
    }
  };

  // Show preview before submitting
  const showFabricInPreview = () => {
    if (!selectedFabric) {
      showToast('error', 'Please select a fabric');
      return;
    }
    if (!weight || Number(weight) <= 0) {
      showToast('error', 'Please enter or detect weight');
      return;
    }
    if (!selectedFabric.machineId) {
      showToast('error', 'Selected fabric does not have a machine assigned');
      return;
    }
    setShowPreview(true);
  };

  // Get selected machine details from fabric
  const getSelectedMachine = () => {
    return selectedFabric?.machine || null;
  };

  // Save + print a single LOT entry. Reads weight from the live ref (no
  // side-effects-in-setter-callback pattern, which can be quirky under
  // React StrictMode dev double-invocation).
  const saveAndPrintLotEntry = async (entryId: number, capturedWeight: number) => {
    console.log('[LOT] saveAndPrintLotEntry start', { entryId, capturedWeight, hasFabric: !!selectedFabric });
    if (!selectedFabric) {
      console.warn('[LOT] no fabric selected; flipping to error');
      showToast('error', 'No fabric selected — cannot save roll');
      setLotRolls((prev) =>
        prev.map((r) =>
          r.id === entryId
            ? { ...r, saveStatus: 'error', errorMessage: 'No fabric selected' }
            : r
        )
      );
      return;
    }

    // Mark as saving (idempotent — addRollToLot already set 'saving', but Finish-mode
    // retries call us with rolls that may be in 'pending' or 'error').
    setLotRolls((prev) =>
      prev.map((r) =>
        r.id === entryId ? { ...r, saveStatus: 'saving', errorMessage: undefined } : r
      )
    );

    try {
      console.log('[LOT] POST /rolls', { fabricId: selectedFabric.id, greyWeight: capturedWeight });

      // Use raw fetch with a hard AbortController timeout. 60s accommodates
      // the slowest Korea-region Supabase round-trips (we've seen successful
      // saves take 9–10s; 25s was too aggressive and aborted real saves).
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60_000);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010';
      const devSecret = process.env.NEXT_PUBLIC_DEV_AUTH_SECRET || '';
      const cookieMatch = typeof document !== 'undefined'
        ? document.cookie.match(/(?:^|;\s*)access_token=([^;]+)/)
        : null;
      const accessToken = cookieMatch ? decodeURIComponent(cookieMatch[1]) : '';

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (devSecret) headers['X-Dev-Auth'] = devSecret;
      if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

      console.log('[LOT] fetch ->', `${apiUrl}/api/v1/rolls`, {
        hasDevSecret: !!devSecret,
        hasToken: !!accessToken,
      });

      let httpResp: Response;
      try {
        httpResp = await fetch(`${apiUrl}/api/v1/rolls`, {
          method: 'POST',
          headers,
          credentials: 'include',
          body: JSON.stringify({
            fabricId: selectedFabric.id,
            greyWeight: capturedWeight,
          }),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeoutId);
      }

      console.log('[LOT] fetch response', { status: httpResp.status, ok: httpResp.ok });

      if (!httpResp.ok) {
        const text = await httpResp.text().catch(() => '');
        let errMsg = `HTTP ${httpResp.status}`;
        try {
          const j = JSON.parse(text);
          errMsg = j.error || j.message || errMsg;
        } catch {}
        throw new Error(errMsg);
      }

      const json = await httpResp.json();
      const response = { data: json.data };
      // Attach a snapshot of the fabric + the LOT session number so manual
      // re-prints from this row carry the right label data even if the user
      // later switches fabric or starts a new LOT.
      const lotNo = ensureLotNumber();
      const savedRoll = {
        ...response.data,
        fabricSnapshot: selectedFabric,
        lotNumber: lotNo,
      };
      console.log('[LOT] saved', { rollNumber: savedRoll?.rollNumber, qrCode: savedRoll?.qrCode, lotNumber: lotNo });

      // Mark saved (not yet "printed" — that depends on the printer)
      setLotRolls((prev) =>
        prev.map((r) =>
          r.id === entryId ? { ...r, savedRoll, saveStatus: 'printed' } : r
        )
      );

      // Print, but don't let print failures block the queue
      try {
        await printRollLabel(savedRoll);
      } catch (printErr) {
        console.error('[LOT] print failed (record saved):', printErr);
        showToast('error', `Saved roll ${savedRoll.rollNumber} but label did not print — use the Print button to retry`);
      }
    } catch (error: any) {
      const msg = error.response?.data?.error || error.message || 'Unknown error';
      console.error('[LOT] save failed:', error);
      setLotRolls((prev) =>
        prev.map((r) =>
          r.id === entryId ? { ...r, saveStatus: 'error', errorMessage: msg } : r
        )
      );
      showToast('error', `Roll save failed: ${msg}`);
    }
  };

  // Add a new roll to the LOT. Each Add saves THIS roll to the DB and prints
  // its label immediately, then clears the input for the next entry — so the
  // operator labels each physical roll the moment they finish weighing it.
  // Saves run in parallel; saveAndPrintLotEntry's own status guard prevents
  // double-save of the same entry.
  const addRollToLot = () => {
    const weightNum = Number(weight);
    console.log('[LOT] addRollToLot click', {
      weight,
      weightNum,
      selectedFabric: selectedFabric?.code,
      newId: lotNextId,
    });

    if (weightNum <= 0 || Number.isNaN(weightNum)) {
      showToast('error', 'Please enter a valid weight');
      return;
    }
    if (!selectedFabric) {
      showToast('error', 'Please select a fabric first');
      return;
    }

    const newId = lotNextId;
    setLotRolls((prev) => [
      ...prev,
      {
        id: newId,
        weight: weightNum,
        grade: 'A',
        saveStatus: 'saving', // shows the spinner immediately
      },
    ]);
    setLotNextId((prev) => prev + 1);
    setWeight('');

    // Fire save+print directly. Wrapped in an IIFE so any unexpected throw
    // surfaces here instead of becoming an unhandled rejection.
    (async () => {
      try {
        await saveAndPrintLotEntry(newId, weightNum);
      } catch (err) {
        console.error('[LOT] saveAndPrintLotEntry crashed:', err);
        showToast('error', 'Roll save crashed — see console for details');
        setLotRolls((prev) =>
          prev.map((r) =>
            r.id === newId
              ? { ...r, saveStatus: 'error', errorMessage: String(err) }
              : r
          )
        );
      }
    })();

    // Watchdog: 120s upper bound. fetch's own AbortController fires at 60s;
    // this just catches the case where the inner catch somehow doesn't update
    // the row (shouldn't happen, but failsafe).
    setTimeout(() => {
      let didTimeout = false;
      setLotRolls((prev) => {
        const row = prev.find((r) => r.id === newId);
        if (row && row.saveStatus === 'saving') {
          didTimeout = true;
          return prev.map((r) =>
            r.id === newId
              ? { ...r, saveStatus: 'error', errorMessage: 'Save timed out (120s)' }
              : r
          );
        }
        return prev;
      });
      if (didTimeout) {
        console.error('[LOT] watchdog timeout — flipping to error', { newId });
        showToast('error', 'Roll save timed out (120s) — check the network or retry');
      }
    }, 120_000);
  };

  const removeRollFromLot = (id: number) => {
    let blocked = false;
    setLotRolls((prev) => {
      const target = prev.find((r) => r.id === id);
      if (target && target.saveStatus !== 'pending') {
        blocked = true;
        return prev;
      }
      return prev.filter((r) => r.id !== id);
    });
    if (blocked) {
      // Toast outside the updater — calling setState during another component's
      // render (which is what showToast does) is a React anti-pattern.
      showToast('error', 'Saved rolls cannot be removed from the LOT');
    }
  };

  const startEditRoll = (roll: LotRollEntry) => {
    if (roll.saveStatus !== 'pending') {
      showToast('error', 'Saved rolls cannot be edited');
      return;
    }
    setEditingRollId(roll.id);
    setEditWeight(String(roll.weight));
  };

  const saveEditRoll = () => {
    if (!editingRollId) return;
    const weightNum = Number(editWeight);
    if (weightNum <= 0) {
      showToast('error', 'Please enter a valid weight');
      return;
    }
    setLotRolls((prev) =>
      prev.map((r) =>
        r.id === editingRollId && r.saveStatus === 'pending' ? { ...r, weight: weightNum } : r
      )
    );
    setEditingRollId(null);
    setEditWeight('');
  };

  const cancelEditRoll = () => {
    setEditingRollId(null);
    setEditWeight('');
  };

  // Calculate LOT summary
  const lotSummary = {
    totalRolls: lotRolls.length,
    totalWeight: lotRolls.reduce((sum, r) => sum + r.weight, 0),
    averageWeight: lotRolls.length > 0
      ? lotRolls.reduce((sum, r) => sum + r.weight, 0) / lotRolls.length
      : 0,
  };

  // Reset LOT mode
  const resetLotMode = () => {
    setLotRolls([]);
    setLotNextId(1);
    setSelectedFabric(null);
    setWeight('');
    setEditingRollId(null);
    setEditWeight('');
    setLotCompleted(false);
    setLotSummarySnapshot(null);
    setLotNumber(null);
  };

  // Generate a Lot Number for the current LOT session if not already set.
  // Format: LOT-YYMMDD-HHMM (operator-friendly, sortable, unique enough per session)
  const ensureLotNumber = (): string => {
    if (lotNumber) return lotNumber;
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const yy = now.getFullYear().toString().slice(-2);
    const id = `LOT-${yy}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
    setLotNumber(id);
    return id;
  };

  // Finalize LOT. Each Add already saved+printed its roll, so here we just
  // wait for any queued saves to drain, finalize any errors/pending, and
  // flip into a "completed" state — WITHOUT closing the panel, so the user
  // sees a clear success summary.
  const handleLotSave = async () => {
    if (LOT_SAVE_IN_PROGRESS) {
      console.log('LOT save already in progress, ignoring duplicate call');
      return;
    }
    if (!selectedFabric) {
      showToast('error', 'Please select a fabric');
      return;
    }
    if (lotRolls.length === 0) {
      showToast('error', 'Please add at least one roll');
      return;
    }

    LOT_SAVE_IN_PROGRESS = true;
    setIsSubmitting(true);

    try {
      // Wait for any in-flight saves (started by prior Adds) to finish.
      // Poll the live ref since useState values in closures are stale.
      const start = Date.now();
      while (lotRollsRef.current.some((r) => r.saveStatus === 'saving')) {
        if (Date.now() - start > 60_000) break; // safety: don't hang forever
        await new Promise((r) => setTimeout(r, 250));
      }

      // Retry anything that errored or is still pending
      const failed = lotRollsRef.current.filter(
        (r) => r.saveStatus === 'error' || r.saveStatus === 'pending'
      );
      await Promise.all(failed.map((entry) => saveAndPrintLotEntry(entry.id, entry.weight)));

      // Snapshot totals from the live ref (state may have updated during the
      // wait/retry above; the closure's `lotRolls` would be stale)
      const finalRolls = lotRollsRef.current;
      const totalRolls = finalRolls.length;
      const totalWeight = finalRolls.reduce((sum, r) => sum + r.weight, 0);
      const averageWeight = totalRolls > 0 ? totalWeight / totalRolls : 0;
      setLotSummarySnapshot({ totalRolls, totalWeight, averageWeight });

      setLotCompleted(true);
      showToast('success', `LOT saved: ${totalRolls} rolls, total ${totalWeight.toFixed(2)} kg`);
    } catch (error: any) {
      console.error('LOT finalize failed:', error);
      showToast('error', error.response?.data?.error || 'Failed to finish LOT');
    } finally {
      setIsSubmitting(false);
      setIsPrinting(false);
      setTimeout(() => {
        LOT_SAVE_IN_PROGRESS = false;
      }, 1500);
    }
  };

  // "Start New Lot" — clear table + summary, ready for next batch in the same panel
  const startNewLot = () => {
    setLotCompleted(false);
    setLotSummarySnapshot(null);
    resetLotMode();
  };

  // Handle Fabric In submission - CREATES ROLL WITH QR CODE
  const handleFabricIn = async () => {
    if (!selectedFabric) return;

    setIsSubmitting(true);
    try {
      // Create Roll record with QR code, linked to Fabric template
      const response = await rollsApi.create({
        fabricId: selectedFabric.id,
        greyWeight: Number(weight),
      });

      const roll = response.data;
      setLastCreatedRoll(roll);

      // Auto-print QR label
      await printRollLabel(roll);

      showToast('success', `Roll ${roll.rollNumber} created (${weight} kg) - Label printed`);
      setShowPreview(false);
      resetForm();
      setActivePanel('none');
    } catch (error: any) {
      showToast('error', error.response?.data?.error || 'Failed to record fabric in');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Fabric Out submission
  const handleFabricOut = async () => {
    if (!selectedProduct) {
      showToast('error', 'Please select a product');
      return;
    }
    if (!weight || Number(weight) <= 0) {
      showToast('error', 'Please enter or detect weight');
      return;
    }
    if (!destination) {
      showToast('error', 'Please select a destination');
      return;
    }

    setIsSubmitting(true);
    try {
      await productsApi.recordStockMovement({
        productId: selectedProduct.id,
        type: 'OUT',
        quantity: Number(weight),
        referenceNumber: `OUT-${Date.now()}`,
        sourceType: destination,
        notes: notes || undefined,
      });

      showToast('success', `Fabric Out: ${weight} kg of ${selectedProduct.name} to ${destination}`);
      resetForm();
      setActivePanel('none');
    } catch (error: any) {
      showToast('error', error.response?.data?.error || 'Failed to record fabric out');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Weighing Machine Status Component — telemetry strip
  const WeighingStatus = () => (
    <div
      className={`rounded-lg border px-3 py-2 flex items-center gap-3 ${
        isWeighingConnected
          ? 'bg-emerald-500/[0.04] border-emerald-500/20'
          : 'bg-red-500/[0.04] border-red-500/20'
      }`}
    >
      <span className="relative flex h-2 w-2">
        {isWeighingConnected && (
          <span className="absolute inset-0 rounded-full bg-emerald-400/50 animate-ping" />
        )}
        <span
          className={`relative inline-flex rounded-full h-2 w-2 ${
            isWeighingConnected ? 'bg-emerald-400' : 'bg-red-400'
          }`}
        />
      </span>
      {isWeighingConnected ? (
        <Wifi className="w-3.5 h-3.5 text-emerald-400" />
      ) : (
        <WifiOff className="w-3.5 h-3.5 text-red-400" />
      )}
      <span
        className={`tabular-nums text-[10px] tracking-widest uppercase flex-1 ${
          isWeighingConnected ? 'text-emerald-300/90' : 'text-red-300/90'
        }`}
      >
        {isWeighingConnected ? 'Scale Online' : 'Scale Offline'}
      </span>
      <button
        onClick={simulateWeightDetection}
        className="tabular-nums text-[10px] tracking-widest uppercase text-neutral-500 hover:text-white transition-colors px-2 py-0.5"
      >
        Test ↻
      </button>
    </div>
  );

  // Weight Display — digital scale readout
  const WeightDisplay = () => (
    <div className="relative bg-black/40 rounded-xl border border-factory-border p-5 overflow-hidden">
      <div aria-hidden className="absolute top-0 left-5 right-5 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      <div className="flex items-baseline justify-between mb-2">
        <p className="eyebrow-mute">Reading</p>
        <Scale className="w-3.5 h-3.5 text-neutral-600" />
      </div>
      <div className="flex items-baseline gap-2 -mt-1">
        <span
          className="tabular-nums text-white"
          style={{ fontSize: '3rem', lineHeight: 1, letterSpacing: '-0.04em', fontWeight: 500 }}
        >
          {weight && Number(weight) > 0 ? Number(weight).toFixed(2) : '— —'}
        </span>
        <span className="tabular-nums text-xs text-neutral-500 tracking-widest">KG</span>
      </div>
      <input
        type="number"
        step="0.01"
        value={weight}
        onChange={(e) => setWeight(e.target.value)}
        placeholder="Type or use scale"
        className="mt-3 w-full bg-transparent border-0 border-b border-factory-border focus:border-primary-500 outline-none px-0 py-1.5 text-sm text-neutral-300 placeholder:text-neutral-600 transition-colors tabular-nums"
      />
    </div>
  );

  // Fabric In Panel (Single Roll + LOT Mode unified)
  const FabricInPanel = () => (
    <div className="h-full flex flex-col">
      {/* Panel Header — editorial with amber identity bar */}
      <div className="px-5 pt-5 pb-4 border-b border-factory-border relative">
        {/* vertical amber identity bar */}
        <div aria-hidden className="absolute left-0 top-5 bottom-4 w-px bg-gradient-to-b from-transparent via-primary-400/40 to-transparent" />
        <div className="pl-4 flex items-start justify-between">
          <div>
            <p className="eyebrow mb-1.5">
              {fabricInMode === 'single' ? 'Single · Roll Entry' : 'Lot · Batch Entry'}
            </p>
            <h2
              className="text-white"
              style={{ fontSize: '1.65rem', fontWeight: 400, fontStyle: 'italic', letterSpacing: '-0.01em', lineHeight: 1 }}
            >
              Fabric In
            </h2>
            <p className="text-xs text-neutral-500 mt-1.5">
              {fabricInMode === 'single'
                ? 'Weigh, save & label one roll'
                : 'Each roll auto-saves & prints as you add it'}
            </p>
          </div>
          <button
            onClick={closePanel}
            className="p-2 text-neutral-500 hover:text-white hover:bg-white/5 rounded-lg transition-colors -mt-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Mode Toggle — refined segmented control */}
      <div className="px-5 pt-4">
        <div className="bg-black/30 border border-factory-border rounded-xl p-1 flex gap-1 relative overflow-hidden">
          <button
            onClick={() => switchFabricInMode('single')}
            className={`flex-1 py-2 rounded-lg text-sm transition-all flex items-center justify-center gap-2 relative ${
              fabricInMode === 'single'
                ? 'text-emerald-300 bg-emerald-500/10 ring-1 ring-emerald-500/30'
                : 'text-neutral-500 hover:text-white'
            }`}
          >
            <ArrowDownToLine className="w-3.5 h-3.5" />
            <span className="tabular-nums text-xs tracking-widest uppercase">Single</span>
          </button>
          <button
            onClick={() => switchFabricInMode('lot')}
            className={`flex-1 py-2 rounded-lg text-sm transition-all flex items-center justify-center gap-2 relative ${
              fabricInMode === 'lot'
                ? 'text-primary-300 bg-primary-500/10 ring-1 ring-primary-500/30'
                : 'text-neutral-500 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="tabular-nums text-xs tracking-widest uppercase">Lot</span>
            {lotRolls.length > 0 && (
              <span className="ml-0.5 px-1.5 py-0.5 text-[10px] tabular-nums rounded bg-primary-500/30 text-primary-100 ring-1 ring-primary-400/40">
                {lotRolls.length.toString().padStart(2, '0')}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
        {fabricInMode === 'single' ? (
          <>
            <div className="space-y-3">
              <p className="eyebrow-cool">Step 01 · Weigh</p>
              <WeighingStatus />
              <WeightDisplay />
            </div>

            <div className="space-y-3">
              <p className="eyebrow">Step 02 · Choose Warp</p>
              <FabricFinder
                onFabricSelect={(fabric) => {
                  setSelectedFabric(fabric);
                  if (fabric?.machineId) {
                    setMachineId(String(fabric.machineId));
                  } else {
                    setMachineId('');
                  }
                }}
                selectedFabric={selectedFabric}
                onClear={() => {
                  setSelectedFabric(null);
                  setMachineId('');
                }}
              />
            </div>

            {/* QR notice — refined banner */}
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-primary-500/[0.06] border border-primary-500/20">
              <QrCode className="w-4 h-4 text-primary-300 flex-shrink-0" />
              <p className="text-[11px] text-primary-200/90 leading-relaxed">
                <span className="tabular-nums tracking-wider uppercase mr-1">Label</span>
                A QR-coded sticker auto-prints with all 10 textile fields when the roll is recorded.
              </p>
            </div>
          </>
        ) : (
          <>
            {/* LOT Mode body — Heritage Loom */}
            {!selectedFabric ? (
              <div>
                <div className="flex items-baseline justify-between mb-3">
                  <p className="eyebrow">Step 01 · Choose Warp</p>
                  <span className="tabular-nums text-[10px] text-neutral-600 tracking-wider">REQUIRED</span>
                </div>
                <FabricFinder
                  onFabricSelect={(fabric) => {
                    setSelectedFabric(fabric);
                    if (fabric?.machineId) {
                      setMachineId(String(fabric.machineId));
                    }
                  }}
                  selectedFabric={selectedFabric}
                  onClear={() => setSelectedFabric(null)}
                />
              </div>
            ) : (
              <>
                {/* Selected Fabric Display — editorial card */}
                <div className="glass-panel rounded-xl p-4 relative overflow-hidden">
                  <div aria-hidden className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="eyebrow mb-1.5">Selected Warp</p>
                      <h3
                        className="text-white truncate"
                        style={{ fontSize: '1.1rem', fontWeight: 400, fontStyle: 'italic', letterSpacing: '-0.005em', lineHeight: 1.15 }}
                      >
                        {selectedFabric.name}
                      </h3>
                      <p className="tabular-nums text-xs text-primary-300/80 mt-1 tracking-wide">
                        {selectedFabric.code}
                      </p>
                      {selectedFabric.machine && (
                        <p className="tabular-nums text-[10px] text-neutral-500 mt-2 tracking-wide uppercase">
                          Machine {selectedFabric.machine.machineNumber} · {selectedFabric.machine.name}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        if (lotRolls.length > 0) {
                          showToast('error', 'Clear all rolls before changing fabric');
                        } else {
                          setSelectedFabric(null);
                        }
                      }}
                      className="tabular-nums text-[10px] tracking-widest uppercase text-neutral-500 hover:text-white transition-colors flex-shrink-0 px-2 py-1"
                    >
                      Change
                    </button>
                  </div>
                </div>

                {/* Step 2: Weight entry — digital scale display aesthetic */}
                {!lotCompleted && (
                  <div className="space-y-3">
                    <div className="flex items-baseline justify-between">
                      <p className="eyebrow-cool">Step 02 · Weigh &amp; Add</p>
                      <span className="tabular-nums text-[10px] text-neutral-600 tabular-nums tracking-wider">
                        {(lotRolls.length + 1).toString().padStart(2, '0')} · NEXT
                      </span>
                    </div>

                    <WeighingStatus />

                    {/* Digital scale readout */}
                    <div className="relative bg-black/40 rounded-xl border border-factory-border p-5 overflow-hidden">
                      <div aria-hidden className="absolute top-0 left-5 right-5 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                      <p className="eyebrow-mute mb-2">Reading</p>
                      <div className="flex items-baseline gap-2 -mt-1">
                        <span
                          className="tabular-nums text-white"
                          style={{ fontSize: '3rem', lineHeight: 1, letterSpacing: '-0.04em', fontWeight: 500 }}
                        >
                          {weight && Number(weight) > 0 ? Number(weight).toFixed(2) : '— —'}
                        </span>
                        <span className="tabular-nums text-xs text-neutral-500 tracking-widest">KG</span>
                      </div>
                      <input
                        type="number"
                        step="0.01"
                        value={weight}
                        onChange={(e) => setWeight(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addRollToLot();
                          }
                        }}
                        placeholder="Type or use scale"
                        className="mt-3 w-full bg-transparent border-0 border-b border-factory-border focus:border-primary-500 outline-none px-0 py-1.5 text-sm text-neutral-300 placeholder:text-neutral-600 transition-colors tabular-nums"
                      />
                    </div>

                    {/* Add Next Roll — chunky CTA */}
                    <button
                      onClick={addRollToLot}
                      disabled={!weight || Number(weight) <= 0}
                      className="w-full group relative overflow-hidden bg-primary-500 hover:bg-primary-400 active:bg-primary-600 disabled:bg-factory-gray disabled:cursor-not-allowed text-factory-black disabled:text-neutral-600 rounded-xl py-3 px-4 transition-all flex items-center justify-between"
                    >
                      <span className="flex items-center gap-2">
                        <Plus className="w-4 h-4" strokeWidth={2.5} />
                        <span className="tabular-nums text-sm tracking-widest uppercase font-semibold">
                          Add Next Roll
                        </span>
                      </span>
                      <span className="tabular-nums text-xs tabular-nums opacity-70 group-hover:opacity-100 transition-opacity">
                        {weight && Number(weight) > 0 ? `${Number(weight).toFixed(2)} KG ↩` : '— —'}
                      </span>
                    </button>

                    <p className="text-[11px] text-neutral-500 leading-relaxed pt-1">
                      <span className="tabular-nums">Press Enter</span> or click Add. Each roll auto-saves &amp; the QR label prints as you go.
                    </p>
                  </div>
                )}

                {/* Lot Number ribbon — tiny but visible identity for the operator */}
                {!lotCompleted && lotNumber && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/[0.04] border border-amber-500/20">
                    <span className="w-1 h-1 rounded-full" style={{ background: '#7dd3fc' }} />
                    <span className="eyebrow flex-1">Lot Number</span>
                    <span className="tabular-nums text-xs tabular-nums" style={{ color: '#7dd3fc' }}>
                      {lotNumber}
                    </span>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-factory-border bg-factory-dark">
        {fabricInMode === 'single' ? (
          <button
            onClick={showFabricInPreview}
            disabled={isSubmitting || isPrinting || !selectedFabric || !weight || !selectedFabric?.machineId}
            className="w-full group rounded-xl py-3 px-4 transition-all flex items-center justify-between disabled:cursor-not-allowed bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 disabled:bg-factory-gray text-factory-black disabled:text-neutral-600"
          >
            <span className="flex items-center gap-2">
              <QrCode className="w-4 h-4" strokeWidth={2.5} />
              <span className="tabular-nums text-xs tracking-widest uppercase font-semibold">
                Record Fabric In
              </span>
            </span>
            <span className="tabular-nums text-xs tabular-nums opacity-70 group-hover:opacity-100 transition-opacity">
              {weight && Number(weight) > 0 ? `${Number(weight).toFixed(2)} KG →` : '— —'}
            </span>
          </button>
        ) : (
          <>
            {lotCompleted ? (
              <button
                onClick={startNewLot}
                className="w-full bg-primary-500 hover:bg-primary-400 text-factory-black rounded-xl py-3 transition-all flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" strokeWidth={2.5} />
                <span className="tabular-nums text-sm tracking-widest uppercase font-semibold">
                  Start New Lot
                </span>
              </button>
            ) : (
              <>
                {selectedFabric && lotRolls.length > 0 && (
                  <div className="space-y-2">
                    {/* Lot summary inline (kg total + roll count) */}
                    <div className="flex items-baseline justify-between px-1">
                      <span className="eyebrow-mute">In Lot</span>
                      <span className="tabular-nums text-sm text-neutral-300 tabular-nums">
                        {lotSummary.totalRolls.toString().padStart(2, '0')} ·{' '}
                        <span className="text-primary-300">{lotSummary.totalWeight.toFixed(2)}</span>{' '}
                        <span className="text-[10px] text-neutral-500">KG</span>
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          if (confirm('Clear all rolls?')) {
                            resetLotMode();
                          }
                        }}
                        disabled={isSubmitting}
                        className="px-4 py-2.5 rounded-xl border border-factory-border text-neutral-400 hover:text-white hover:bg-white/5 transition-colors tabular-nums text-xs tracking-widest uppercase disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Clear
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleLotSave();
                        }}
                        disabled={isSubmitting || isPrinting}
                        className="flex-1 group relative overflow-hidden rounded-xl py-2.5 px-4 transition-all flex items-center justify-center gap-2 disabled:cursor-not-allowed"
                        style={{
                          background: isSubmitting || isPrinting
                            ? 'var(--factory-gray)'
                            : 'linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)',
                          color: isSubmitting || isPrinting ? 'var(--neutral-500, #737373)' : '#0a0a0a',
                        }}
                      >
                        {isSubmitting || isPrinting ? (
                          <span className="flex items-center gap-2 tabular-nums text-xs tracking-widest uppercase">
                            {isPrinting ? <Printer className="w-3.5 h-3.5 animate-pulse" /> : null}
                            {isSubmitting ? 'Saving' : 'Printing'}
                          </span>
                        ) : (
                          <>
                            <Save className="w-4 h-4" strokeWidth={2.5} />
                            <span className="tabular-nums text-xs tracking-widest uppercase font-semibold">
                              Finish Lot · Seal
                            </span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
                {!selectedFabric && (
                  <p className="text-center text-xs text-neutral-500 italic py-1">
                    Choose a warp first.
                  </p>
                )}
                {selectedFabric && lotRolls.length === 0 && (
                  <p className="text-center text-xs text-neutral-500 italic py-1">
                    Awaiting first reading.
                  </p>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );

  // Fabric Out Panel — Heritage Loom
  const FabricOutPanel = () => (
    <div className="h-full flex flex-col">
      {/* Panel Header */}
      <div className="px-5 pt-5 pb-4 border-b border-factory-border relative">
        <div
          aria-hidden
          className="absolute left-0 top-5 bottom-4 w-px"
          style={{ background: 'linear-gradient(180deg, transparent, rgba(251,146,60,0.5), transparent)' }}
        />
        <div className="pl-4 flex items-start justify-between">
          <div>
            <p className="eyebrow mb-1.5" style={{ color: 'rgba(251,146,60,0.85)' }}>
              Outbound · Dispatch
            </p>
            <h2
              className="text-white"
              style={{ fontSize: '1.65rem', fontWeight: 400, fontStyle: 'italic', letterSpacing: '-0.01em', lineHeight: 1 }}
            >
              Fabric Out
            </h2>
            <p className="text-xs text-neutral-500 mt-1.5">
              Move fabric off the loom floor.
            </p>
          </div>
          <button
            onClick={closePanel}
            className="p-2 text-neutral-500 hover:text-white hover:bg-white/5 rounded-lg transition-colors -mt-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
        <div className="space-y-3">
          <p className="eyebrow-cool">Step 01 · Weigh</p>
          <WeighingStatus />
          <WeightDisplay />
        </div>

        <div className="space-y-3">
          <p className="eyebrow">Step 02 · Identify</p>
          <ProductFinder
            onProductSelect={setSelectedProduct}
            selectedProduct={selectedProduct}
            onClear={() => setSelectedProduct(null)}
          />
        </div>

        <div className="space-y-3">
          <p className="eyebrow">Step 03 · Destination</p>
          <select
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-black/30 border border-factory-border text-white tabular-nums text-sm tracking-wide focus:outline-none focus:ring-1 focus:ring-orange-500/50 focus:border-orange-500/50 transition-colors"
          >
            <option value="">— Choose destination —</option>
            {DESTINATIONS.map((dest) => (
              <option key={dest.value} value={dest.value}>
                {dest.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <p className="eyebrow-mute">Notes · Optional</p>
          <input
            type="text"
            placeholder="Voucher, reference, anything to remember…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg bg-black/30 border border-factory-border text-sm text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:border-orange-500/50 transition-colors"
          />
        </div>
      </div>

      {/* Submit Button */}
      <div className="px-5 py-4 border-t border-factory-border bg-factory-dark">
        <button
          onClick={handleFabricOut}
          disabled={isSubmitting || !selectedProduct || !weight || !destination}
          className="w-full group rounded-xl py-3 px-4 transition-all flex items-center justify-between disabled:cursor-not-allowed bg-orange-500 hover:bg-orange-400 active:bg-orange-600 disabled:bg-factory-gray text-factory-black disabled:text-neutral-600"
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2 mx-auto tabular-nums text-xs tracking-widest uppercase">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Recording
            </span>
          ) : (
            <>
              <span className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" strokeWidth={2.5} />
                <span className="tabular-nums text-xs tracking-widest uppercase font-semibold">
                  Record Fabric Out
                </span>
              </span>
              <span className="tabular-nums text-xs tabular-nums opacity-70 group-hover:opacity-100 transition-opacity">
                {weight && Number(weight) > 0 ? `${Number(weight).toFixed(2)} KG →` : '— —'}
              </span>
            </>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-[calc(100vh-8rem)] relative">
      {/* Page header — Heritage Loom editorial */}
      <div className="mb-10 relative pl-5">
        <div aria-hidden className="absolute left-0 top-1 bottom-1 w-px bg-gradient-to-b from-transparent via-primary-400/40 to-transparent" />
        <p className="eyebrow mb-2">Production · Floor Telemetry</p>
        <h1
          className="text-white"
          style={{ fontSize: 'clamp(2.25rem, 4vw, 3rem)', fontWeight: 400, letterSpacing: '-0.02em', lineHeight: 1 }}
        >
          Daily <span style={{ fontStyle: 'italic' }}>Production</span>
        </h1>
        <p className="mt-3 text-sm text-neutral-400 max-w-md">
          Record fabric flowing in &amp; out of the looms. Each roll weighed, labelled, and
          written to the ledger.
        </p>
        <div className="bg-gradient-to-r from-transparent via-white/10 to-transparent h-px mt-5 w-full max-w-md" />
      </div>

      {/* Landing — two doors of the loom */}
      {activePanel === 'none' && (
        <div className="grid md:grid-cols-2 gap-5 max-w-4xl animate-glass-rise">
          {/* Fabric In — entry */}
          <button
            onClick={() => setActivePanel('fabric-in')}
            className="group relative glass-panel rounded-2xl p-8 text-left transition-all hover:border-primary-500/50 overflow-hidden"
          >
            {/* corner amber tick */}
            <div aria-hidden className="absolute top-0 left-0 w-20 h-20 pointer-events-none opacity-40 group-hover:opacity-80 transition-opacity">
              <div className="absolute top-3 left-3 w-10 h-px" style={{ background: 'rgba(14, 165, 233, 0.3)' }} />
              <div className="absolute top-3 left-3 w-px h-10" style={{ background: 'rgba(14, 165, 233, 0.3)' }} />
            </div>
            <div className="relative">
              <div className="flex items-baseline justify-between mb-8">
                <p className="eyebrow">Inbound · Production</p>
                <ArrowDownToLine className="w-4 h-4 text-emerald-400/70 group-hover:text-emerald-300 transition-colors" />
              </div>
              <h2
                className="text-white mb-3"
                style={{ fontSize: '2rem', fontWeight: 400, letterSpacing: '-0.015em', lineHeight: 1 }}
              >
                Fabric <span style={{ fontStyle: 'italic' }}>In</span>
              </h2>
              <p className="text-sm text-neutral-400 mb-5 max-w-xs">
                Weigh, save and print QR labels — one roll at a time, or as a continuous lot batch.
              </p>
              <div className="flex items-center gap-3 pt-4 border-t border-factory-border">
                <span className="tabular-nums text-[10px] tracking-widest uppercase text-emerald-400/80">Single</span>
                <span className="text-neutral-700">/</span>
                <span className="tabular-nums text-[10px] tracking-widest uppercase text-primary-300">LOT</span>
                <span className="ml-auto tabular-nums text-[10px] text-neutral-600 group-hover:text-neutral-400 transition-colors">
                  Open →
                </span>
              </div>
            </div>
          </button>

          {/* Fabric Out — egress */}
          <button
            onClick={() => setActivePanel('fabric-out')}
            className="group relative glass-panel rounded-2xl p-8 text-left transition-all hover:border-orange-500/50 overflow-hidden"
          >
            <div aria-hidden className="absolute top-0 right-0 w-20 h-20 pointer-events-none opacity-40 group-hover:opacity-80 transition-opacity">
              <div className="absolute top-3 right-3 w-10 h-px" style={{ background: 'rgba(14, 165, 233, 0.3)' }} />
              <div className="absolute top-3 right-3 w-px h-10" style={{ background: 'rgba(14, 165, 233, 0.3)' }} />
            </div>
            <div className="relative">
              <div className="flex items-baseline justify-between mb-8">
                <p className="eyebrow">Outbound · Dispatch</p>
                <ArrowUpFromLine className="w-4 h-4 text-orange-400/70 group-hover:text-orange-300 transition-colors" />
              </div>
              <h2
                className="text-white mb-3"
                style={{ fontSize: '2rem', fontWeight: 400, letterSpacing: '-0.015em', lineHeight: 1 }}
              >
                Fabric <span style={{ fontStyle: 'italic' }}>Out</span>
              </h2>
              <p className="text-sm text-neutral-400 mb-5 max-w-xs">
                Move fabric off the floor — to dyeing, sale, transfer. Each destination tracked.
              </p>
              <div className="flex items-center gap-3 pt-4 border-t border-factory-border">
                <span className="tabular-nums text-[10px] tracking-widest uppercase text-orange-400/80">Dye</span>
                <span className="text-neutral-700">·</span>
                <span className="tabular-nums text-[10px] tracking-widest uppercase text-orange-400/80">Sale</span>
                <span className="text-neutral-700">·</span>
                <span className="tabular-nums text-[10px] tracking-widest uppercase text-orange-400/80">Transfer</span>
                <span className="ml-auto tabular-nums text-[10px] text-neutral-600 group-hover:text-neutral-400 transition-colors">
                  Open →
                </span>
              </div>
            </div>
          </button>
        </div>
      )}

      {/* LOT Session Main View — Heritage Loom — rolls + summary appear here as they're added */}
      {activePanel === 'fabric-in' && fabricInMode === 'lot' && (
        <div className="md:pr-[28rem] relative">
          {/* Subtle blueprint grid backdrop — etched, technical, low-contrast */}
          <div
            aria-hidden
            className="absolute inset-0  pointer-events-none opacity-60 -z-10"
          />

          <div className="space-y-10">
            {/* ===================== LOT IDENTITY HEADER ===================== */}
            <div className="animate-glass-rise relative pl-5">
              {/* vertical amber identity bar */}
              <div className="absolute left-0 top-1 bottom-1 w-px bg-gradient-to-b from-transparent via-primary-400/40 to-transparent" />

              <p className="eyebrow mb-3">
                {lotCompleted ? 'Quality Control · Lot Closed' : 'Mughal Grace · Loom Telemetry'}
              </p>

              <div className="flex items-baseline gap-4 flex-wrap">
                <h2
                  className="text-white tracking-tight"
                  style={{
                    fontSize: 'clamp(2.25rem, 4.5vw, 3.5rem)',
                    fontWeight: 400,
                    fontStyle: lotCompleted ? 'italic' : 'normal',
                    letterSpacing: '-0.02em',
                    lineHeight: 1,
                  }}
                >
                  {lotCompleted ? 'Lot Saved' : (lotNumber || 'New Lot Session')}
                </h2>
                {!lotCompleted && lotNumber && (
                  <span className="eyebrow-cool">in progress</span>
                )}
              </div>

              {selectedFabric ? (
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                  <span className="text-neutral-200">{selectedFabric.brand?.name || 'Mughal Grace'}</span>
                  <span className="text-neutral-500">·</span>
                  <span className="italic text-neutral-100" style={{ fontSize: '1.05rem' }}>
                    {selectedFabric.name}
                  </span>
                  <span className="text-neutral-500">·</span>
                  <span className="tabular-nums text-xs text-primary-400/90 tracking-wide">
                    {selectedFabric.code}
                  </span>
                  {selectedFabric.machine && (
                    <>
                      <span className="text-neutral-500">·</span>
                      <span className="tabular-nums text-xs text-neutral-400 tracking-wide">
                        Machine {selectedFabric.machine.machineNumber}
                      </span>
                    </>
                  )}
                </div>
              ) : (
                <p className="mt-3 text-sm text-neutral-400 italic">
                  Choose a fabric in the side panel — each lot threads through one warp.
                </p>
              )}

              {/* horizontal amber rule beneath the identity */}
              <div className="bg-gradient-to-r from-transparent via-white/10 to-transparent h-px mt-5 w-full max-w-md" />
            </div>

            {/* ===================== SUCCESS CARD (after Finish) ===================== */}
            {lotCompleted && lotSummarySnapshot && (
              <div className="animate-glass-rise relative glass-panel rounded-2xl p-7 overflow-hidden">
                {/* corner amber tick — like a quality-control stamp */}
                <div className="absolute top-0 right-0 w-24 h-24 -z-0">
                  <div className="absolute top-3 right-3 w-12 h-px " style={{ background: 'rgba(14, 165, 233, 0.3)' }} />
                  <div className="absolute top-3 right-3 w-px h-12 " style={{ background: 'rgba(14, 165, 233, 0.3)' }} />
                </div>

                <div className="relative flex flex-col md:flex-row md:items-end gap-8">
                  <div className="flex-1 min-w-0">
                    <p className="eyebrow mb-2">Stamp · Lot Closed</p>
                    <h3
                      className="text-white"
                      style={{
                        fontSize: 'clamp(1.75rem, 3vw, 2.4rem)',
                        fontWeight: 400,
                        fontStyle: 'italic',
                        letterSpacing: '-0.01em',
                        lineHeight: 1.05,
                      }}
                    >
                      Sealed &amp; signed off
                    </h3>
                    <p className="mt-2 text-sm text-neutral-400">
                      All rolls in this lot are written to the ledger and labelled.
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-6 md:gap-8">
                    <div>
                      <p className="eyebrow-mute">Rolls</p>
                      <p className="tabular-nums text-3xl text-white tabular-nums mt-1">
                        {lotSummarySnapshot.totalRolls.toString().padStart(2, '0')}
                      </p>
                    </div>
                    <div>
                      <p className="eyebrow-mute">Total kg</p>
                      <p className="tabular-nums text-3xl tabular-nums mt-1 text-primary-300">
                        {lotSummarySnapshot.totalWeight.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="eyebrow-mute">Avg kg</p>
                      <p className="tabular-nums text-3xl text-neutral-300 tabular-nums mt-1">
                        {lotSummarySnapshot.averageWeight.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="relative flex flex-wrap gap-3 mt-7 pt-5 border-t border-factory-border">
                  <Button onClick={startNewLot}>
                    <Plus className="w-4 h-4 mr-1.5" />
                    Start New Lot
                  </Button>
                  <Button variant="ghost" onClick={closePanel}>
                    Close session
                  </Button>
                </div>
              </div>
            )}

            {/* ===================== EMPTY STATES ===================== */}
            {!selectedFabric ? (
              <div className="animate-glass-rise glass-panel rounded-2xl p-14 text-center relative overflow-hidden">
                <div aria-hidden className="absolute inset-x-1/4 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                <p className="eyebrow mb-4">Awaiting fabric</p>
                <p
                  className="text-neutral-200 italic"
                  style={{ fontSize: '1.5rem', fontWeight: 400, letterSpacing: '-0.01em' }}
                >
                  No warp on the loom yet
                </p>
                <p className="mt-3 text-sm text-neutral-500 max-w-sm mx-auto">
                  Pick a fabric in the side panel to begin a lot session — each lot is bound to one fabric.
                </p>
              </div>
            ) : lotRolls.length === 0 ? (
              <div className="animate-glass-rise glass-panel rounded-2xl p-14 text-center relative overflow-hidden">
                <div aria-hidden className="absolute inset-x-1/4 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                <p className="eyebrow-cool mb-4">Ready · Loom calibrated</p>
                <p
                  className="text-neutral-200 italic"
                  style={{ fontSize: '1.5rem', fontWeight: 400, letterSpacing: '-0.01em' }}
                >
                  Awaiting first roll
                </p>
                <p className="mt-3 text-sm text-neutral-500 max-w-sm mx-auto">
                  Type a weight in the side panel and press Enter. Each roll is saved &amp; labelled as you add it.
                </p>
              </div>
            ) : (
              <>
                {/* ===================== EDITORIAL STATS ROW ===================== */}
                <div className="grid grid-cols-3 gap-px bg-factory-border overflow-hidden rounded-2xl animate-glass-rise">
                  <div className="glass-panel p-6">
                    <p className="eyebrow-mute">Rolls in lot</p>
                    <p className="tabular-nums text-4xl text-white tabular-nums mt-2 leading-none">
                      {lotSummary.totalRolls.toString().padStart(2, '0')}
                    </p>
                  </div>
                  <div className="glass-panel p-6 relative">
                    <p className="eyebrow-cool">Total weight</p>
                    <p className="mt-2 leading-none flex items-baseline gap-1.5">
                      <span className="tabular-nums text-4xl text-primary-300 tabular-nums">
                        {lotSummary.totalWeight.toFixed(2)}
                      </span>
                      <span className="tabular-nums text-xs text-neutral-500 tracking-wider">KG</span>
                    </p>
                    {/* subtle accent under the active "primary" stat */}
                    <div className="absolute bottom-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                  </div>
                  <div className="glass-panel p-6">
                    <p className="eyebrow-mute">Average</p>
                    <p className="mt-2 leading-none flex items-baseline gap-1.5">
                      <span className="tabular-nums text-4xl text-neutral-300 tabular-nums">
                        {lotSummary.averageWeight.toFixed(2)}
                      </span>
                      <span className="tabular-nums text-xs text-neutral-500 tracking-wider">KG</span>
                    </p>
                  </div>
                </div>

                {/* ===================== LEDGER TABLE ===================== */}
                <div className="glass-panel rounded-2xl overflow-hidden animate-glass-rise">
                  <div className="px-6 py-4 border-b border-factory-border flex items-center justify-between">
                    <div>
                      <p className="eyebrow">Lot Ledger</p>
                      <p className="text-white mt-0.5" style={{ fontSize: '1.15rem', fontWeight: 400, letterSpacing: '-0.01em' }}>
                        Rolls in flight &amp; sealed
                      </p>
                    </div>
                    <span className="tabular-nums text-xs text-neutral-500 tabular-nums">
                      {lotRolls.length.toString().padStart(3, '0')} / 050
                    </span>
                  </div>

                  <div className="max-h-[60vh] overflow-y-auto overflow-x-auto">
                    <table className="w-full">
                      <thead className="sticky top-0 z-10 bg-factory-dark/95 backdrop-blur">
                        <tr className="border-b border-factory-border">
                          <th className="text-left px-6 py-3 w-14 eyebrow-mute">No.</th>
                          <th className="text-left px-4 py-3 eyebrow-mute">Weight</th>
                          <th className="text-left px-4 py-3 eyebrow-mute">Grade</th>
                          <th className="text-left px-4 py-3 eyebrow-mute">Roll №</th>
                          <th className="text-left px-4 py-3 eyebrow-mute">Status</th>
                          <th className="text-right px-6 py-3 eyebrow-mute">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lotRolls.map((roll, index) => {
                          const isEditable = roll.saveStatus === 'pending';
                          return (
                            <tr
                              key={roll.id}
                              className="group border-b border-factory-border/60 last:border-0 hover:bg-white/[0.015] transition-colors"
                            >
                              {/* Row index — large mono, editorial */}
                              <td className="px-6 py-4 align-top">
                                <span className="tabular-nums text-base text-neutral-500 tabular-nums">
                                  {(index + 1).toString().padStart(2, '0')}
                                </span>
                              </td>

                              {/* Weight — the headline of the row */}
                              <td className="px-4 py-4 align-top">
                                {editingRollId === roll.id ? (
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={editWeight}
                                    onChange={(e) => setEditWeight(e.target.value)}
                                    className="w-28 py-1 text-sm tabular-nums"
                                    autoFocus
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') saveEditRoll();
                                      if (e.key === 'Escape') cancelEditRoll();
                                    }}
                                  />
                                ) : (
                                  <span className="inline-flex items-baseline gap-1">
                                    <span className="tabular-nums text-lg text-white tabular-nums tracking-tight">
                                      {roll.weight.toFixed(2)}
                                    </span>
                                    <span className="tabular-nums text-[10px] text-neutral-500 tracking-wider">KG</span>
                                  </span>
                                )}
                              </td>

                              <td className="px-4 py-4 align-top">
                                <span className="tabular-nums text-sm text-neutral-300">{roll.grade}</span>
                              </td>

                              {/* Roll number — primary accent for saved rolls */}
                              <td className="px-4 py-4 align-top">
                                {roll.savedRoll?.rollNumber ? (
                                  <span className="tabular-nums text-sm text-primary-300 tracking-wide">
                                    {roll.savedRoll.rollNumber}
                                  </span>
                                ) : (
                                  <span className="tabular-nums text-sm text-neutral-700">— — —</span>
                                )}
                              </td>

                              {/* Status — pills with subtle character per state */}
                              <td className="px-4 py-4 align-top">
                                {roll.saveStatus === 'printed' && (
                                  <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-success/10 border border-success/20">
                                    <Printer className="w-3 h-3 text-success" />
                                    <span className="eyebrow-cool" style={{ color: 'rgba(110, 231, 183, 0.85)' }}>Printed</span>
                                  </span>
                                )}
                                {roll.saveStatus === 'saving' && (
                                  <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-info/10 border border-info/30 animate-glass-pulse">
                                    <Loader2 className="w-3 h-3 text-info animate-spin" />
                                    <span className="eyebrow-cool">Saving</span>
                                  </span>
                                )}
                                {roll.saveStatus === 'pending' && (
                                  <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md border border-neutral-700">
                                    <Clock className="w-3 h-3 text-neutral-500" />
                                    <span className="eyebrow-mute">Pending</span>
                                  </span>
                                )}
                                {roll.saveStatus === 'error' && (
                                  <div className="flex flex-col gap-1">
                                    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-error/10 border border-error/30 self-start">
                                      <AlertCircle className="w-3 h-3 text-error" />
                                      <span className="eyebrow" style={{ color: 'rgba(252, 165, 165, 0.9)' }}>Failed</span>
                                    </span>
                                    {roll.errorMessage && (
                                      <span className="text-xs text-error/80 max-w-[280px] break-words tabular-nums leading-snug">
                                        {roll.errorMessage}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </td>

                              {/* Actions — quiet, reveal-on-hover discipline */}
                              <td className="px-6 py-4 text-right align-top">
                                {editingRollId === roll.id ? (
                                  <div className="flex items-center justify-end gap-1">
                                    <button
                                      onClick={saveEditRoll}
                                      className="p-1.5 text-emerald-400 hover:bg-emerald-500/10 rounded transition-colors"
                                    >
                                      <CheckCircle className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={cancelEditRoll}
                                      className="p-1.5 text-neutral-400 hover:bg-neutral-500/10 rounded transition-colors"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-end gap-0.5 opacity-70 group-hover:opacity-100 transition-opacity">
                                    <button
                                      onClick={() => {
                                        if (!roll.savedRoll) return;
                                        const data = buildLabelDataForRoll(roll.savedRoll);
                                        if (data) setPreviewLabelData(data);
                                      }}
                                      disabled={!roll.savedRoll}
                                      className="p-1.5 text-neutral-300 hover:text-white hover:bg-white/5 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-neutral-300"
                                      title={roll.savedRoll ? 'Preview label' : 'Roll not saved yet'}
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => roll.savedRoll && printRollLabel(roll.savedRoll)}
                                      disabled={!roll.savedRoll || isPrinting}
                                      className="p-1.5 text-primary-400 hover:text-primary-300 hover:bg-primary-500/10 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-primary-400"
                                      title={roll.savedRoll ? 'Print label' : 'Roll not saved yet'}
                                    >
                                      <Printer className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => startEditRoll(roll)}
                                      disabled={!isEditable}
                                      className="p-1.5 text-neutral-400 hover:text-white hover:bg-white/5 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-neutral-400"
                                      title={isEditable ? 'Edit weight' : 'Saved rolls cannot be edited'}
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => removeRollFromLot(roll.id)}
                                      disabled={!isEditable}
                                      className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-red-400"
                                      title={isEditable ? 'Remove' : 'Saved rolls cannot be removed'}
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Panel Overlay */}
      {activePanel !== 'none' && (
        <>
          {/* Backdrop only when not in LOT mode (LOT keeps the main area interactive) */}
          {!(activePanel === 'fabric-in' && fabricInMode === 'lot') && (
            <div className="fixed inset-0 z-40 bg-black/60" onClick={closePanel} />
          )}
          <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-factory-dark border-l border-factory-border animate-in slide-in-from-right duration-300">
            {activePanel === 'fabric-in' && <FabricInPanel />}
            {activePanel === 'fabric-out' && <FabricOutPanel />}
          </div>
        </>
      )}

      {/* Confirm Roll Modal — Heritage Loom certificate */}
      {showPreview && selectedFabric && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={() => !isSubmitting && setShowPreview(false)} />
          <div className="relative glass-panel rounded-2xl w-full max-w-md animate-in zoom-in-95 duration-200 overflow-hidden">
            {/* Top amber rule */}
            <div aria-hidden className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

            {/* Modal Header */}
            <div className="px-6 pt-6 pb-4 border-b border-factory-border">
              <p className="eyebrow mb-2">Confirm · Before Print</p>
              <h3
                className="text-white"
                style={{ fontSize: '1.5rem', fontWeight: 400, fontStyle: 'italic', letterSpacing: '-0.01em', lineHeight: 1 }}
              >
                Roll Manifest
              </h3>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-5 space-y-5">
              {/* Massive weight readout */}
              <div className="text-center py-2">
                <p className="eyebrow-mute mb-1">Weight</p>
                <p className="tabular-nums text-emerald-300 leading-none" style={{ fontSize: '4rem', letterSpacing: '-0.04em', fontWeight: 500 }}>
                  {Number(weight || 0).toFixed(2)}
                </p>
                <p className="tabular-nums text-xs text-neutral-500 tracking-widest mt-1">KG · GREY</p>
              </div>

              <div aria-hidden className="bg-gradient-to-r from-transparent via-white/10 to-transparent h-px" />

              {/* Manifest grid */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                <div>
                  <p className="eyebrow-mute mb-1">Fabric</p>
                  <p className="text-white italic" style={{ fontSize: '0.95rem', lineHeight: 1.2 }}>
                    {selectedFabric.name}
                  </p>
                </div>
                <div>
                  <p className="eyebrow-mute mb-1">Article</p>
                  <p className="tabular-nums text-sm text-primary-300 tracking-wide">{selectedFabric.code}</p>
                </div>
                <div>
                  <p className="eyebrow-mute mb-1">Machine</p>
                  <p className="tabular-nums text-sm text-neutral-200">
                    {getSelectedMachine()?.machineNumber}
                  </p>
                  <p className="text-xs text-neutral-500 mt-0.5">{getSelectedMachine()?.name}</p>
                </div>
                <div>
                  <p className="eyebrow-mute mb-1">Roll №</p>
                  <p className="tabular-nums text-sm text-neutral-500 italic">auto-generated</p>
                </div>
                <div className="col-span-2">
                  <p className="eyebrow-mute mb-1">Date</p>
                  <p className="tabular-nums text-sm text-neutral-200">
                    {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              </div>

              {/* Info note */}
              <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg bg-primary-500/[0.06] border border-primary-500/20">
                <Printer className="w-3.5 h-3.5 text-primary-300 mt-0.5 flex-shrink-0" />
                <p className="text-[11px] text-primary-200/85 leading-relaxed">
                  On confirm, the roll is saved to the ledger and a QR-coded label is automatically printed.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-factory-border flex gap-2">
              <button
                onClick={() => setShowPreview(false)}
                disabled={isSubmitting}
                className="px-4 py-2.5 rounded-xl border border-factory-border text-neutral-400 hover:text-white hover:bg-white/5 transition-colors tabular-nums text-xs tracking-widest uppercase disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleFabricIn}
                disabled={isSubmitting || isPrinting}
                className="flex-1 group rounded-xl py-2.5 px-4 transition-all flex items-center justify-center gap-2 disabled:cursor-not-allowed"
                style={{
                  background: isSubmitting || isPrinting
                    ? 'var(--factory-gray)'
                    : 'linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)',
                  color: isSubmitting || isPrinting ? '#737373' : '#0a0a0a',
                }}
              >
                {isSubmitting || isPrinting ? (
                  <span className="flex items-center gap-2 tabular-nums text-xs tracking-widest uppercase">
                    {isPrinting ? <Printer className="w-3.5 h-3.5 animate-pulse" /> : <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    {isSubmitting ? 'Saving' : 'Printing'}
                  </span>
                ) : (
                  <>
                    <Printer className="w-4 h-4" strokeWidth={2.5} />
                    <span className="tabular-nums text-xs tracking-widest uppercase font-semibold">
                      Save &amp; Print Label
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Label Preview Modal — proof on a drafting table */}
      {previewLabelData && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            onClick={() => setPreviewLabelData(null)}
          />
          <div className="relative glass-panel rounded-2xl w-full max-w-2xl overflow-hidden">
            <div aria-hidden className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

            {/* Header */}
            <div className="px-6 pt-6 pb-4 border-b border-factory-border flex items-start justify-between">
              <div>
                <p className="eyebrow mb-2">Proof · Before Print</p>
                <h3
                  className="text-white"
                  style={{ fontSize: '1.5rem', fontWeight: 400, fontStyle: 'italic', letterSpacing: '-0.01em', lineHeight: 1 }}
                >
                  Label Preview
                </h3>
                <div className="flex items-center gap-3 mt-2">
                  <span className="tabular-nums text-xs text-primary-300 tracking-wide">
                    {previewLabelData.rollNumber}
                  </span>
                  {previewLabelData.lotNumber && (
                    <>
                      <span className="text-neutral-700">·</span>
                      <span className="tabular-nums text-xs tracking-wide" style={{ color: '#7dd3fc' }}>
                        {previewLabelData.lotNumber}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <button
                onClick={() => setPreviewLabelData(null)}
                className="p-2 text-neutral-500 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Label canvas on a parchment/drafting backdrop */}
            <div
              className="p-8 flex items-center justify-center"
              style={{
                background:
                  'radial-gradient(ellipse at center, #e8e2d5 0%, #d4ccba 100%)',
              }}
            >
              <div
                className="rounded-sm"
                style={{
                  boxShadow:
                    '0 24px 48px -12px rgba(0,0,0,0.4), 0 0 0 1px rgba(0,0,0,0.08)',
                }}
              >
                <LabelPreview data={previewLabelData} />
              </div>
            </div>

            {/* Actions */}
            <div className="px-6 py-4 border-t border-factory-border flex justify-between items-center">
              <span className="tabular-nums text-[10px] text-neutral-600 tracking-widest uppercase">
                100 mm × 75 mm · 1:1 scale
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPreviewLabelData(null)}
                  className="px-4 py-2.5 rounded-xl border border-factory-border text-neutral-400 hover:text-white hover:bg-white/5 transition-colors tabular-nums text-xs tracking-widest uppercase"
                >
                  Close
                </button>
                <button
                  onClick={async () => {
                    setIsPrinting(true);
                    try {
                      const result = await labelPrinter.print(previewLabelData);
                      if (result.success) {
                        showToast('success', `Label printed via ${result.method}`);
                      } else {
                        showToast('error', 'Failed to print label');
                      }
                    } catch (err) {
                      console.error('Print error:', err);
                      showToast('error', 'Failed to print label');
                    } finally {
                      setIsPrinting(false);
                    }
                  }}
                  disabled={isPrinting}
                  className="px-5 py-2.5 rounded-xl transition-all flex items-center gap-2 disabled:cursor-not-allowed"
                  style={{
                    background: isPrinting
                      ? 'var(--factory-gray)'
                      : 'linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)',
                    color: isPrinting ? '#737373' : '#0a0a0a',
                  }}
                >
                  {isPrinting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span className="tabular-nums text-xs tracking-widest uppercase">Printing</span>
                    </>
                  ) : (
                    <>
                      <Printer className="w-4 h-4" strokeWidth={2.5} />
                      <span className="tabular-nums text-xs tracking-widest uppercase font-semibold">
                        Print this label
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Visual preview of the printed label. Mirrors the HTML/ZPL/TSPL layout in
 * labelPrinter.ts: brand header on top, key/value rows beneath, QR in the
 * bottom-right corner. Uses real QR rendering via qrcode.react.
 */
function LabelPreview({ data }: { data: RollLabelData }) {
  const lines = buildLabelLines(data);
  return (
    <div
      className="bg-white text-black shadow-lg"
      style={{
        width: '100mm',
        height: '75mm',
        padding: '3mm',
        boxSizing: 'border-box',
        display: 'grid',
        gridTemplateRows: 'auto 1fr',
        gap: '2mm',
        fontFamily: 'Helvetica, Arial, sans-serif',
      }}
    >
      <div
        style={{
          textAlign: 'center',
          fontSize: '14pt',
          fontWeight: 800,
          letterSpacing: '0.5px',
          textTransform: 'uppercase',
          borderBottom: '0.5mm solid #000',
          paddingBottom: '1.5mm',
        }}
      >
        {data.brandName || data.fabricType || 'Roll Label'}
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 30mm',
          gap: '3mm',
          alignItems: 'start',
        }}
      >
        <table style={{ fontSize: '9pt', lineHeight: 1.35, borderCollapse: 'collapse', width: '100%' }}>
          <tbody>
            {lines.map((l) => (
              <tr key={l.label}>
                <th
                  style={{
                    textAlign: 'left',
                    fontWeight: 600,
                    color: '#555',
                    paddingRight: '3mm',
                    whiteSpace: 'nowrap',
                    width: '18mm',
                    verticalAlign: 'top',
                  }}
                >
                  {l.label}
                </th>
                <td style={{ fontWeight: 700, verticalAlign: 'top', wordBreak: 'break-word' }}>
                  {l.value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ alignSelf: 'end', justifySelf: 'end' }}>
          <QRCodeSVG value={data.qrCode} size={100} level="M" includeMargin={false} />
        </div>
      </div>
    </div>
  );
}
