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
 * Generate ZPL (Zebra Programming Language) code for label printing
 * Label size: 50mm x 30mm (2" x 1.2")
 */
export function generateZPL(data: RollLabelData): string {
  // ^XA = Start format
  // ^FO = Field origin (x,y in dots, 203 dpi = ~8 dots/mm)
  // ^BQ = QR Code
  // ^A0 = Scalable font
  // ^FS = Field separator
  // ^XZ = End format
  return `
^XA
^CI28
^FO30,30^BQN,2,4^FDQA,${data.qrCode}^FS
^FO160,30^A0N,28,28^FD${data.rollNumber}^FS
^FO160,65^A0N,22,22^FD${data.weight.toFixed(1)} kg^FS
^FO160,95^A0N,18,18^FD${data.fabricType.slice(0, 20)}^FS
^FO160,120^A0N,16,16^FD${data.date}^FS
${data.machineNumber ? `^FO160,145^A0N,14,14^FDM: ${data.machineNumber}^FS` : ''}
^XZ
`.trim();
}

/**
 * Generate TSPL (TSC Printer Language) code for TSC printers
 */
export function generateTSPL(data: RollLabelData): string {
  return `
SIZE 50 mm, 30 mm
GAP 2 mm, 0 mm
DIRECTION 1
CLS
QRCODE 20,20,L,4,A,0,"${data.qrCode}"
TEXT 150,25,"3",0,1,1,"${data.rollNumber}"
TEXT 150,60,"2",0,1,1,"${data.weight.toFixed(1)} kg"
TEXT 150,90,"2",0,1,1,"${data.fabricType.slice(0, 20)}"
TEXT 150,115,"1",0,1,1,"${data.date}"
${data.machineNumber ? `TEXT 150,140,"1",0,1,1,"M: ${data.machineNumber}"` : ''}
PRINT 1,1
`.trim();
}

/**
 * Generate HTML content for browser printing
 */
function generatePrintHTML(data: RollLabelData): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <title>Roll Label - ${data.rollNumber}</title>
  <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"></script>
  <style>
    @page { size: 50mm 30mm; margin: 0; }
    @media print {
      body { margin: 0; padding: 0; }
      .no-print { display: none; }
    }
    body {
      font-family: 'Courier New', monospace;
      width: 50mm;
      height: 30mm;
      padding: 2mm;
      box-sizing: border-box;
      display: flex;
      align-items: center;
    }
    .qr-container {
      width: 24mm;
      height: 24mm;
      flex-shrink: 0;
    }
    #qr-code {
      width: 100%;
      height: 100%;
    }
    .info {
      margin-left: 2mm;
      font-size: 8pt;
      line-height: 1.3;
      overflow: hidden;
    }
    .roll-number {
      font-weight: bold;
      font-size: 10pt;
    }
    .weight {
      font-size: 9pt;
    }
    .fabric-type, .date, .machine {
      font-size: 7pt;
      color: #333;
    }
  </style>
</head>
<body>
  <div class="qr-container">
    <canvas id="qr-code"></canvas>
  </div>
  <div class="info">
    <div class="roll-number">${data.rollNumber}</div>
    <div class="weight">${data.weight.toFixed(1)} kg</div>
    <div class="fabric-type">${data.fabricType}</div>
    <div class="date">${data.date}</div>
    ${data.machineNumber ? `<div class="machine">M: ${data.machineNumber}</div>` : ''}
  </div>
  <script>
    QRCode.toCanvas(document.getElementById('qr-code'), '${data.qrCode}', {
      width: 90,
      margin: 0,
      errorCorrectionLevel: 'M'
    }, function(error) {
      if (!error) {
        setTimeout(function() { window.print(); }, 300);
      }
    });
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

      // Wait for content to load, then print
      iframe.onload = () => {
        try {
          // Give QR code time to render
          setTimeout(() => {
            if (iframe.contentWindow) {
              iframe.contentWindow.print();
            }
            // Remove iframe after a delay to allow print dialog to appear
            setTimeout(() => {
              if (document.body.contains(iframe)) {
                document.body.removeChild(iframe);
              }
            }, 1000);
            resolve(true);
          }, 500);
        } catch (printError) {
          console.error('Print failed:', printError);
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
          resolve(false);
        }
      };

      // Fallback timeout in case onload doesn't fire
      setTimeout(() => {
        try {
          if (iframe.contentWindow) {
            iframe.contentWindow.print();
          }
          setTimeout(() => {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
          }, 1000);
          resolve(true);
        } catch (e) {
          resolve(false);
        }
      }, 2000);

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
