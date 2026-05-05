import { DyeingVendor, DyeingOrderWithItems } from './dyeing';

export type DyeingPricingType = 'RATE_PER_KG' | 'TOTAL_AMOUNT';
export type DyeingInvoiceStatus = 'PENDING' | 'READY' | 'APPROVED' | 'PAID' | 'CANCELLED';
export type DyeingPaymentStatus = 'UNPAID' | 'PARTIAL' | 'PAID';
export type DyeingPaymentMethod = 'CASH' | 'CHEQUE' | 'BANK_TRANSFER';

export interface DyeingInvoice {
  id: number;
  invoiceNumber: string;
  dyeingOrderId: number;
  vendorId: number;

  // Weights
  totalGreyWeight: string;
  totalReceivedWeight?: string;

  // Pricing
  pricingType?: DyeingPricingType;
  ratePerKg?: string;
  totalAmount?: string;

  // Status
  status: DyeingInvoiceStatus;

  // Payment
  paymentStatus: DyeingPaymentStatus;
  paymentMethod?: DyeingPaymentMethod;
  paymentDueDate?: string;
  paidAt?: string;
  paidAmount?: string;
  chequeNumber?: string;
  chequeDate?: string;
  bankName?: string;

  // Notes
  notes?: string;

  // Timestamps
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
  approvedById?: number;
}

export interface DyeingInvoiceWithRelations extends DyeingInvoice {
  vendor?: DyeingVendor;
  dyeingOrder?: DyeingOrderWithItems;
}

export interface DyeingInvoiceListItem extends DyeingInvoice {
  vendor?: {
    id: number;
    code: string;
    name: string;
  };
  dyeingOrder?: {
    id: number;
    orderNumber: string;
    sentAt: string;
    receivedAt?: string;
    status: string;
  };
}

export interface DyeingInvoiceListResponse {
  invoices: DyeingInvoiceListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface DyeingInvoiceStats {
  pending: number;
  ready: number;
  approved: number;
  paid: number;
  totalUnpaidAmount: string;
}

export interface UpdatePricingData {
  pricingType: DyeingPricingType;
  ratePerKg?: number;
  totalAmount?: number;
  notes?: string;
}

export interface RecordPaymentData {
  paymentMethod: DyeingPaymentMethod;
  paidAmount: number;
  paymentDueDate?: string;
  chequeNumber?: string;
  chequeDate?: string;
  bankName?: string;
  notes?: string;
}

export interface DyeingInvoicePrintData {
  invoice: DyeingInvoiceWithRelations;
  printDate: string;
}
