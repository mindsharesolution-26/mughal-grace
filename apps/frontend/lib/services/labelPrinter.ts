import { RollLabelData } from '../types/roll';

/**
 * Label Printer Service
 *
 * Supports multiple printing methods:
 * 1. ZPL for Zebra/TSC thermal printers (via USB WebUSB API)
 * 2. Browser print dialog fallback
 * 3. Raw print server (if configured)
 */

// Zebra USB Vendor ID
const ZEBRA_VENDOR_ID = 0x0a5f;
// TSC USB Vendor ID
const TSC_VENDOR_ID = 0x1203;

/**
 * Build the ordered label lines (Brand → Product → Article → Weight → Color →
 * GSM → Width → MTR → Machine → Lot). Empty fields are skipped.
 * Exported so the in-app Preview modal renders the same content as the printer.
 */
export function buildLabelLines(data: RollLabelData): { label: string; value: string }[] {
  const widthDisplay =
    data.width != null && data.width !== ''
      ? `${data.width}${data.widthUnit ? ' ' + data.widthUnit : ''}`
      : '';
  const lines: { label: string; value: string }[] = [
    { label: 'Product', value: data.productName || data.fabricType || '' },
    { label: 'Article', value: data.articleNumber || data.rollNumber || '' },
    { label: 'Weight', value: `${data.weight.toFixed(2)} kg` },
    { label: 'Color', value: data.color || '' },
    { label: 'GSM', value: data.gsm != null ? String(data.gsm) : '' },
    { label: 'Width', value: widthDisplay },
    { label: 'MTR', value: data.mtr != null && data.mtr !== '' ? String(data.mtr) : '' },
    { label: 'Machine', value: data.machineNumber || '' },
    { label: 'Lot No', value: data.lotNumber || '' },
  ];
  return lines.filter((l) => l.value !== '');
}

/**
 * Generate ZPL (Zebra Programming Language) code for label printing
 * Label size: 100mm x 75mm (4" x 3") — sized to fit Brand + 9 fields + QR.
 * 203 dpi = ~8 dots/mm → label is 800 × 600 dots.
 */
export function generateZPL(data: RollLabelData): string {
  const lines = buildLabelLines(data);
  // Header (brand) at the top, centered. Body (key/value rows) starts below.
  const header = data.brandName
    ? `^FO0,30^FB800,1,0,C,0^A0N,40,40^FD${data.brandName}^FS`
    : '';
  const bodyStartY = data.brandName ? 95 : 40;
  const lineHeight = 38;
  const body = lines
    .map((l, i) => {
      const y = bodyStartY + i * lineHeight;
      return `^FO40,${y}^A0N,28,28^FD${l.label}: ${l.value}^FS`;
    })
    .join('\n');
  // QR code in bottom-right
  const qr = `^FO620,420^BQN,2,5^FDQA,${data.qrCode}^FS`;
  return `
^XA
^CI28
^PW800
^LL600
${header}
${body}
${qr}
^XZ
`.trim();
}

/**
 * Generate TSPL (TSC Printer Language) code for TSC printers
 * Label size: 100mm x 75mm
 */
export function generateTSPL(data: RollLabelData): string {
  const lines = buildLabelLines(data);
  // 8 dots/mm → label is 800 × 600 dots
  const header = data.brandName
    ? `TEXT 400,25,"4",0,1,1,2,"${data.brandName}"`
    : '';
  const bodyStartY = data.brandName ? 90 : 30;
  const lineHeight = 36;
  const body = lines
    .map((l, i) => {
      const y = bodyStartY + i * lineHeight;
      return `TEXT 30,${y},"3",0,1,1,"${l.label}: ${l.value}"`;
    })
    .join('\n');
  const qr = `QRCODE 620,420,L,5,A,0,"${data.qrCode}"`;
  return `
SIZE 100 mm, 75 mm
GAP 2 mm, 0 mm
DIRECTION 1
CLS
${header}
${body}
${qr}
PRINT 1,1
`.trim();
}

/**
 * Generate HTML content for browser printing.
 * Layout: 100mm × 75mm — Brand header, then ordered key/value rows
 * (Product → Article → Weight → Color → GSM → Width → MTR → Machine → Lot),
 * QR code in bottom-right.
 */
function generatePrintHTML(data: RollLabelData): string {
  const widthDisplay =
    data.width != null && data.width !== ''
      ? `${data.width}${data.widthUnit ? ' ' + data.widthUnit : ''}`
      : '';
  const rows: { label: string; value: string }[] = [
    { label: 'Product', value: data.productName || data.fabricType || '' },
    { label: 'Article', value: data.articleNumber || data.rollNumber || '' },
    { label: 'Weight', value: `${data.weight.toFixed(2)} kg` },
    { label: 'Color', value: data.color || '' },
    { label: 'GSM', value: data.gsm != null ? String(data.gsm) : '' },
    { label: 'Width', value: widthDisplay },
    { label: 'MTR', value: data.mtr != null && data.mtr !== '' ? String(data.mtr) : '' },
    { label: 'Machine', value: data.machineNumber || '' },
    { label: 'Lot No', value: data.lotNumber || '' },
  ].filter((r) => r.value !== '');

  const escapeHtml = (s: string) =>
    String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  const rowsHtml = rows
    .map(
      (r) =>
        `<tr><th>${escapeHtml(r.label)}</th><td>${escapeHtml(r.value)}</td></tr>`,
    )
    .join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <title>Roll Label - ${escapeHtml(data.rollNumber)}</title>
  <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"></script>
  <style>
    @page { size: 100mm 75mm; margin: 0; }
    @media print {
      body { margin: 0; padding: 0; }
      .no-print { display: none; }
    }
    body {
      font-family: 'Helvetica Neue', Arial, sans-serif;
      width: 100mm;
      height: 75mm;
      padding: 3mm;
      box-sizing: border-box;
      display: grid;
      grid-template-rows: auto 1fr;
      gap: 2mm;
      color: #000;
    }
    .brand {
      text-align: center;
      font-size: 14pt;
      font-weight: 800;
      letter-spacing: 0.5px;
      border-bottom: 0.5mm solid #000;
      padding-bottom: 1.5mm;
      text-transform: uppercase;
    }
    .body {
      display: grid;
      grid-template-columns: 1fr 30mm;
      gap: 3mm;
      align-items: start;
    }
    .info {
      font-size: 9pt;
      line-height: 1.35;
      border-collapse: collapse;
      width: 100%;
    }
    .info th {
      text-align: left;
      font-weight: 600;
      color: #555;
      padding-right: 3mm;
      white-space: nowrap;
      width: 18mm;
      vertical-align: top;
    }
    .info td {
      font-weight: 700;
      color: #000;
      vertical-align: top;
      word-break: break-word;
    }
    .qr-container {
      width: 28mm;
      height: 28mm;
      align-self: end;
      justify-self: end;
    }
    #qr-code {
      width: 100%;
      height: 100%;
    }
  </style>
</head>
<body>
  <div class="brand">${escapeHtml(data.brandName || data.fabricType || 'Roll Label')}</div>
  <div class="body">
    <table class="info"><tbody>${rowsHtml}</tbody></table>
    <div class="qr-container"><canvas id="qr-code"></canvas></div>
  </div>
  <script>
    // Single-flight print guard — prevents the iframe onload, the QR callback,
    // and the parent-side fallback timeout from all firing window.print()
    var __PRINTED = false;
    window.__triggerPrint = function() {
      if (__PRINTED) return;
      __PRINTED = true;
      window.print();
    };
    function tryRenderQR() {
      if (typeof QRCode === 'undefined') {
        setTimeout(tryRenderQR, 100);
        return;
      }
      QRCode.toCanvas(document.getElementById('qr-code'), '${escapeHtml(data.qrCode)}', {
        width: 100,
        margin: 0,
        errorCorrectionLevel: 'M'
      }, function(error) {
        setTimeout(window.__triggerPrint, 300);
      });
    }
    setTimeout(tryRenderQR, 200);
    window.onafterprint = function() { window.close(); };
  </script>
</body>
</html>
`;
}

/**
 * Print label using browser print dialog (uses hidden iframe to avoid popup blockers)
 */
export async function printViaBrowser(data: RollLabelData): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      // Create a hidden iframe for printing
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.top = '-10000px';
      iframe.style.left = '-10000px';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = 'none';

      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc) {
        console.error('Failed to access iframe document');
        document.body.removeChild(iframe);
        resolve(false);
        return;
      }

      // Write the print HTML to the iframe
      iframeDoc.open();
      iframeDoc.write(generatePrintHTML(data));
      iframeDoc.close();

      // Belt-and-suspenders: the inline <script> in the iframe self-prints via
      // window.__triggerPrint (single-flight guarded by __PRINTED), AND the
      // parent triggers it too as a fallback in case the inline script is
      // delayed (slow CDN, etc). The guard prevents double-printing.
      const triggerPrintFromParent = (delay: number) => {
        setTimeout(() => {
          try {
            const cw = iframe.contentWindow as any;
            if (cw && typeof cw.__triggerPrint === 'function') {
              cw.__triggerPrint();
            } else if (cw) {
              // QR script never loaded — print anyway (label still has text content)
              cw.print();
            }
          } catch (e) {
            console.warn('Parent-side print trigger failed:', e);
          }
        }, delay);
      };

      iframe.onload = () => {
        // Trigger print 800ms after onload (gives QR render ~600ms + buffer).
        // The inline script may already have fired — that's fine, the
        // __PRINTED guard makes our call a no-op in that case.
        triggerPrintFromParent(800);
        // Clean up iframe after print dialog has had time to appear
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 6000);
        resolve(true);
      };

      // Safety: if onload never fires (rare), still trigger print + cleanup
      setTimeout(() => {
        triggerPrintFromParent(0);
      }, 2000);
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
        resolve(true);
      }, 6000);

    } catch (error) {
      console.error('Browser print failed:', error);
      resolve(false);
    }
  });
}

/**
 * Print label using WebUSB API (for direct USB thermal printers)
 */
export async function printViaUSB(data: RollLabelData, printerType: 'zebra' | 'tsc' = 'zebra'): Promise<boolean> {
  // Check if WebUSB is available
  if (!('usb' in navigator)) {
    console.warn('WebUSB not available - falling back to browser print');
    return printViaBrowser(data);
  }

  try {
    const vendorId = printerType === 'zebra' ? ZEBRA_VENDOR_ID : TSC_VENDOR_ID;

    // Request device access
    const device = await (navigator as any).usb.requestDevice({
      filters: [{ vendorId }]
    });

    await device.open();

    // Select configuration and claim interface
    if (device.configuration === null) {
      await device.selectConfiguration(1);
    }
    await device.claimInterface(0);

    // Generate print data
    const printData = printerType === 'zebra'
      ? generateZPL(data)
      : generateTSPL(data);

    const encoder = new TextEncoder();
    const printBytes = encoder.encode(printData);

    // Send to printer
    await device.transferOut(1, printBytes);

    // Clean up
    await device.releaseInterface(0);
    await device.close();

    return true;
  } catch (error: any) {
    // User cancelled or no device found - fall back to browser print
    if (error.name === 'NotFoundError') {
      console.warn('No USB printer found - falling back to browser print');
      return printViaBrowser(data);
    }
    console.error('USB print failed:', error);
    return false;
  }
}

/**
 * Print label using raw print server (if configured)
 * This is for setups where a print server middleware is running
 */
export async function printViaPrintServer(
  data: RollLabelData,
  serverUrl: string,
  printerName: string
): Promise<boolean> {
  try {
    const response = await fetch(serverUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        printer: printerName,
        data: generateZPL(data),
        type: 'zpl'
      })
    });

    if (!response.ok) {
      throw new Error(`Print server error: ${response.status}`);
    }

    return true;
  } catch (error) {
    console.error('Print server failed:', error);
    return false;
  }
}

/**
 * Main label printer interface
 */
export const labelPrinter = {
  generateZPL,
  generateTSPL,
  printViaBrowser,
  printViaUSB,
  printViaPrintServer,

  /**
   * Auto-print using the best available method
   * Priority: USB → Print Server → Browser
   */
  async print(
    data: RollLabelData,
    options?: {
      preferredMethod?: 'usb' | 'server' | 'browser';
      printerType?: 'zebra' | 'tsc';
      printServerUrl?: string;
      printServerPrinter?: string;
    }
  ): Promise<{ success: boolean; method: string }> {
    const preferredMethod = options?.preferredMethod || 'browser';
    const printerType = options?.printerType || 'zebra';

    // Try USB if preferred or available
    if (preferredMethod === 'usb' && 'usb' in navigator) {
      const success = await printViaUSB(data, printerType);
      if (success) return { success: true, method: 'usb' };
    }

    // Try print server if configured
    if (preferredMethod === 'server' && options?.printServerUrl) {
      const success = await printViaPrintServer(
        data,
        options.printServerUrl,
        options.printServerPrinter || 'default'
      );
      if (success) return { success: true, method: 'server' };
    }

    // Fall back to browser
    const success = await printViaBrowser(data);
    return { success, method: 'browser' };
  },

  /**
   * Check if USB printing is supported
   */
  isUSBSupported(): boolean {
    return 'usb' in navigator;
  },

  /**
   * Get list of connected USB printers
   */
  async getConnectedPrinters(): Promise<Array<{ name: string; vendorId: number }>> {
    if (!('usb' in navigator)) return [];

    try {
      const devices = await (navigator as any).usb.getDevices();
      return devices
        .filter((d: any) => d.vendorId === ZEBRA_VENDOR_ID || d.vendorId === TSC_VENDOR_ID)
        .map((d: any) => ({
          name: d.productName || `Printer (${d.vendorId})`,
          vendorId: d.vendorId
        }));
    } catch (error) {
      console.error('Failed to get USB devices:', error);
      return [];
    }
  }
};

export default labelPrinter;
