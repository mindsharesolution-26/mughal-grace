import { DyeingOrderPrintData, DyeingPrintCopyType, dyeingPrintCopyLabels } from '../types/dyeing';

/**
 * Dyeing Challan Printer Service
 *
 * Handles printing of dyeing challans in two formats:
 * 1. PDF (A4) - Opens print dialog with formatted challan
 * 2. Thermal Label - Prints to thermal printer via WebUSB (if supported)
 */

// Format date for display
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-PK', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('en-PK', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Generate HTML for A4 PDF challan
function generateChallanHTML(data: DyeingOrderPrintData, copyType: DyeingPrintCopyType): string {
  const copyLabel = dyeingPrintCopyLabels[copyType];

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Dyeing Challan - ${data.order.orderNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      font-size: 12px;
      color: #1a1a1a;
      padding: 20px;
    }
    .page {
      max-width: 800px;
      margin: 0 auto;
      border: 2px solid #1a1a1a;
      padding: 20px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #1a1a1a;
      padding-bottom: 15px;
      margin-bottom: 15px;
    }
    .company-name {
      font-size: 24px;
      font-weight: bold;
      color: #1a1a1a;
    }
    .document-title {
      font-size: 18px;
      font-weight: bold;
      text-align: right;
    }
    .copy-type {
      display: inline-block;
      background: #f0f0f0;
      padding: 4px 12px;
      border: 1px solid #1a1a1a;
      font-size: 12px;
      font-weight: bold;
      margin-top: 8px;
    }
    .info-section {
      display: flex;
      justify-content: space-between;
      margin-bottom: 15px;
      padding-bottom: 15px;
      border-bottom: 1px solid #ddd;
    }
    .info-block { width: 48%; }
    .info-row {
      display: flex;
      margin-bottom: 6px;
    }
    .info-label {
      width: 100px;
      font-weight: 600;
      color: #666;
    }
    .info-value { font-weight: 500; }
    .fabric-section {
      margin-bottom: 15px;
      padding: 12px;
      background: #f9f9f9;
      border: 1px solid #ddd;
    }
    .fabric-header {
      font-weight: bold;
      font-size: 14px;
      margin-bottom: 10px;
      padding-bottom: 8px;
      border-bottom: 1px solid #ddd;
    }
    .color-indicator {
      display: inline-block;
      width: 16px;
      height: 16px;
      border-radius: 4px;
      vertical-align: middle;
      margin-right: 8px;
      border: 1px solid #999;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 8px;
      text-align: left;
    }
    th {
      background: #f0f0f0;
      font-weight: 600;
    }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .font-mono { font-family: 'Courier New', monospace; }
    .subtotal-row {
      background: #f5f5f5;
      font-weight: bold;
    }
    .summary-section {
      margin-top: 20px;
      padding: 15px;
      background: #1a1a1a;
      color: white;
    }
    .summary-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
    }
    .summary-label { font-size: 14px; }
    .summary-value { font-size: 18px; font-weight: bold; }
    .signature-section {
      margin-top: 40px;
      display: flex;
      justify-content: space-between;
    }
    .signature-box {
      width: 30%;
      text-align: center;
    }
    .signature-line {
      border-top: 1px solid #1a1a1a;
      margin-top: 50px;
      padding-top: 8px;
    }
    .footer {
      margin-top: 20px;
      padding-top: 10px;
      border-top: 1px solid #ddd;
      font-size: 10px;
      color: #666;
      text-align: center;
    }
    @media print {
      body { padding: 0; }
      .page { border: none; max-width: none; }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div>
        <div class="company-name">MUGHAL GRACE</div>
        <div style="color: #666; margin-top: 4px;">Textile Manufacturing</div>
      </div>
      <div class="document-title">
        <div>DYEING CHALLAN</div>
        <div class="copy-type">${copyLabel.toUpperCase()}</div>
      </div>
    </div>

    <div class="info-section">
      <div class="info-block">
        <div class="info-row">
          <span class="info-label">Order No:</span>
          <span class="info-value font-mono">${data.order.orderNumber}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Date:</span>
          <span class="info-value">${formatDate(data.order.sentAt)}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Status:</span>
          <span class="info-value">${data.order.status}</span>
        </div>
      </div>
      <div class="info-block">
        <div class="info-row">
          <span class="info-label">Vendor:</span>
          <span class="info-value">${data.vendor.name}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Vendor Code:</span>
          <span class="info-value font-mono">${data.vendor.code}</span>
        </div>
        ${data.vendor.phone ? `
        <div class="info-row">
          <span class="info-label">Phone:</span>
          <span class="info-value">${data.vendor.phone}</span>
        </div>
        ` : ''}
      </div>
    </div>

    ${data.fabricGroups.map(group => `
    <div class="fabric-section">
      <div class="fabric-header">
        ${group.fabricName} (${group.fabricCode})
        ${group.items[0]?.color ? `
          <span style="margin-left: 20px;">
            <span class="color-indicator" style="background: ${group.items[0].color.hexCode || '#6B7280'}"></span>
            ${group.items[0].color.name}
          </span>
        ` : ''}
      </div>
      <table>
        <thead>
          <tr>
            <th style="width: 50px;">#</th>
            <th>Roll Number</th>
            <th class="text-right" style="width: 120px;">Weight (kg)</th>
          </tr>
        </thead>
        <tbody>
          ${group.items.map((item, idx) => `
          <tr>
            <td class="text-center">${idx + 1}</td>
            <td class="font-mono">${item.rollNumber}</td>
            <td class="text-right">${item.sentWeight.toFixed(2)}</td>
          </tr>
          `).join('')}
          <tr class="subtotal-row">
            <td colspan="2" class="text-right">Subtotal (${group.rollCount} rolls)</td>
            <td class="text-right">${group.totalSentWeight.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>
    </div>
    `).join('')}

    <div class="summary-section">
      <div class="summary-row">
        <span class="summary-label">Total Rolls</span>
        <span class="summary-value">${data.summary.totalRolls}</span>
      </div>
      <div class="summary-row">
        <span class="summary-label">Total Weight</span>
        <span class="summary-value">${data.summary.totalSentWeight.toFixed(2)} kg</span>
      </div>
    </div>

    ${data.order.notes ? `
    <div style="margin-top: 15px; padding: 10px; background: #fffbe6; border: 1px solid #ffe58f;">
      <strong>Notes:</strong> ${data.order.notes}
    </div>
    ` : ''}

    <div class="signature-section">
      <div class="signature-box">
        <div class="signature-line">Prepared By</div>
      </div>
      <div class="signature-box">
        <div class="signature-line">Checked By</div>
      </div>
      <div class="signature-box">
        <div class="signature-line">Received By</div>
      </div>
    </div>

    <div class="footer">
      Printed on ${formatDateTime(data.printDate)} | ${data.order.orderNumber}
    </div>
  </div>
</body>
</html>
  `;
}

// Generate ZPL for thermal printer (50mm x 30mm label)
function generateLabelZPL(data: DyeingOrderPrintData, copyType: DyeingPrintCopyType): string {
  const copyLabel = dyeingPrintCopyLabels[copyType];
  const date = formatDate(data.order.sentAt);

  // ZPL code for 50mm x 30mm label (approximately 400 x 240 dots at 203 DPI)
  return `
^XA
^CI28
^PW400
^LL240
^FO20,20^A0N,28,28^FD${copyLabel.toUpperCase()}^FS
^FO20,55^A0N,32,32^FB360,1,0,L^FD${data.order.orderNumber}^FS
^FO20,95^A0N,22,22^FD${data.vendor.name.substring(0, 25)}^FS
^FO20,125^A0N,24,24^FD${data.summary.totalRolls} rolls | ${data.summary.totalSentWeight.toFixed(2)} kg^FS
^FO20,160^A0N,20,20^FD${date}^FS
^FO20,190^BY2^BCN,40,N,N,N^FD${data.order.orderNumber}^FS
^XZ
  `.trim();
}

export const dyeingPrinter = {
  /**
   * Generate A4 challan HTML for PDF printing
   */
  generateChallanHTML,

  /**
   * Generate ZPL for thermal printer
   */
  generateLabelZPL,

  /**
   * Print challans via browser (opens print dialog)
   * Creates a new window with all selected copies and triggers print
   */
  async printViaBrowser(
    data: DyeingOrderPrintData,
    copies: DyeingPrintCopyType[]
  ): Promise<boolean> {
    if (copies.length === 0) return false;

    // Generate HTML for all copies with page breaks
    const allCopiesHTML = copies
      .map((copy, index) => {
        const html = generateChallanHTML(data, copy);
        // Add page break between copies
        const pageBreak = index < copies.length - 1
          ? '<div style="page-break-after: always;"></div>'
          : '';
        return html.replace('</body>', `${pageBreak}</body>`);
      })
      .join('');

    // Create a wrapper HTML that includes all copies
    const fullHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Dyeing Challan - ${data.order.orderNumber}</title>
</head>
<body>
  ${copies.map((copy, index) => `
    ${index > 0 ? '<div style="page-break-before: always;"></div>' : ''}
    ${generateChallanHTML(data, copy).replace(/<\/?html>|<\/?body>|<head>.*<\/head>/gs, '')}
  `).join('')}
</body>
</html>
    `;

    // Open print dialog
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      console.error('Failed to open print window. Popup may be blocked.');
      return false;
    }

    printWindow.document.write(fullHTML);
    printWindow.document.close();

    // Wait for content to load, then print
    printWindow.onload = () => {
      printWindow.print();
    };

    // Trigger print immediately as well (fallback)
    setTimeout(() => {
      printWindow.print();
    }, 500);

    return true;
  },

  /**
   * Print labels via thermal printer using WebUSB (if supported)
   * This is a basic implementation - may need adjustment for specific printer models
   */
  async printViaThermal(
    data: DyeingOrderPrintData,
    copies: DyeingPrintCopyType[]
  ): Promise<boolean> {
    if (!('usb' in navigator)) {
      console.error('WebUSB not supported in this browser');
      // Fall back to browser print for thermal
      return this.printViaBrowser(data, copies);
    }

    try {
      // Request USB device (printer)
      const device = await (navigator as any).usb.requestDevice({
        filters: [
          // Common thermal printer vendor IDs
          { vendorId: 0x0A5F }, // Zebra
          { vendorId: 0x04B8 }, // Seiko Epson
          { vendorId: 0x1664 }, // GODEX
        ],
      });

      await device.open();
      await device.selectConfiguration(1);
      await device.claimInterface(0);

      // Send ZPL for each copy
      for (const copy of copies) {
        const zpl = generateLabelZPL(data, copy);
        const encoder = new TextEncoder();
        const zplData = encoder.encode(zpl);

        await device.transferOut(1, zplData);
        // Small delay between prints
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      await device.close();
      return true;
    } catch (error) {
      console.error('Thermal print error:', error);
      // Fall back to browser print
      return this.printViaBrowser(data, copies);
    }
  },
};

export default dyeingPrinter;
