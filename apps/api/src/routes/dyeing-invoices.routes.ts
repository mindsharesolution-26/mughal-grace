import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenant';
import { requirePermission } from '../middleware/rbac';
import { AppError } from '../middleware/error-handler';

export const dyeingInvoicesRouter: Router = Router();

dyeingInvoicesRouter.use(authMiddleware);
dyeingInvoicesRouter.use(tenantMiddleware);

// ============ DYEING INVOICES ============

// GET /dyeing-invoices/stats - Get dashboard stats
dyeingInvoicesRouter.get('/stats', requirePermission('finance:read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [pending, ready, approved, paid, unpaidInvoices] = await Promise.all([
      req.prisma!.dyeingInvoice.count({ where: { status: 'PENDING' } }),
      req.prisma!.dyeingInvoice.count({ where: { status: 'READY' } }),
      req.prisma!.dyeingInvoice.count({ where: { status: 'APPROVED' } }),
      req.prisma!.dyeingInvoice.count({ where: { status: 'PAID' } }),
      req.prisma!.dyeingInvoice.findMany({
        where: {
          status: { in: ['READY', 'APPROVED'] },
          paymentStatus: { not: 'PAID' },
        },
        select: { totalAmount: true },
      }),
    ]);

    const totalUnpaidAmount = unpaidInvoices.reduce(
      (sum, inv) => sum + Number(inv.totalAmount || 0),
      0
    );

    res.json({
      pending,
      ready,
      approved,
      paid,
      totalUnpaidAmount: totalUnpaidAmount.toFixed(2),
    });
  } catch (error) {
    next(error);
  }
});

// GET /dyeing-invoices - List all invoices with filtering
dyeingInvoicesRouter.get('/', requirePermission('finance:read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      page = '1',
      limit = '20',
      status,
      paymentStatus,
      vendorId,
      search,
      fromDate,
      toDate,
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const where: any = {};

    if (status) {
      where.status = status as string;
    }

    if (paymentStatus) {
      where.paymentStatus = paymentStatus as string;
    }

    if (vendorId) {
      where.vendorId = Number(vendorId);
    }

    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search as string, mode: 'insensitive' } },
        { vendor: { name: { contains: search as string, mode: 'insensitive' } } },
        { dyeingOrder: { orderNumber: { contains: search as string, mode: 'insensitive' } } },
      ];
    }

    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) {
        where.createdAt.gte = new Date(fromDate as string);
      }
      if (toDate) {
        where.createdAt.lte = new Date(toDate as string);
      }
    }

    const [invoices, total] = await Promise.all([
      req.prisma!.dyeingInvoice.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          vendor: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
          dyeingOrder: {
            select: {
              id: true,
              orderNumber: true,
              sentAt: true,
              receivedAt: true,
              status: true,
            },
          },
        },
      }),
      req.prisma!.dyeingInvoice.count({ where }),
    ]);

    res.json({
      invoices,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /dyeing-invoices/:id - Get invoice details
dyeingInvoicesRouter.get('/:id', requirePermission('finance:read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const invoice = await req.prisma!.dyeingInvoice.findUnique({
      where: { id: Number(id) },
      include: {
        vendor: true,
        dyeingOrder: {
          include: {
            items: {
              include: {
                roll: {
                  select: {
                    id: true,
                    rollNumber: true,
                    fabricType: true,
                    greyWeight: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!invoice) {
      throw new AppError('Invoice not found', 404);
    }

    res.json(invoice);
  } catch (error) {
    next(error);
  }
});

// PUT /dyeing-invoices/:id/pricing - Update pricing (finance action)
const pricingSchema = z.object({
  pricingType: z.enum(['RATE_PER_KG', 'TOTAL_AMOUNT']),
  ratePerKg: z.number().positive().optional(),
  totalAmount: z.number().positive().optional(),
  notes: z.string().optional(),
}).refine(
  (data) => {
    if (data.pricingType === 'RATE_PER_KG') return data.ratePerKg !== undefined;
    if (data.pricingType === 'TOTAL_AMOUNT') return data.totalAmount !== undefined;
    return false;
  },
  { message: 'Rate or amount required based on pricing type' }
);

dyeingInvoicesRouter.put('/:id/pricing', requirePermission('finance:write'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const data = pricingSchema.parse(req.body);

    const invoice = await req.prisma!.dyeingInvoice.findUnique({
      where: { id: Number(id) },
    });

    if (!invoice) {
      throw new AppError('Invoice not found', 404);
    }

    if (invoice.status !== 'READY') {
      throw new AppError('Pricing can only be entered when invoice is in READY status', 400);
    }

    // Calculate total amount if rate per kg is provided
    let totalAmount = data.totalAmount;
    if (data.pricingType === 'RATE_PER_KG' && data.ratePerKg) {
      const weight = Number(invoice.totalReceivedWeight || invoice.totalGreyWeight);
      totalAmount = Number((data.ratePerKg * weight).toFixed(2));
    }

    const updated = await req.prisma!.dyeingInvoice.update({
      where: { id: Number(id) },
      data: {
        pricingType: data.pricingType,
        ratePerKg: data.ratePerKg,
        totalAmount,
        notes: data.notes,
      },
      include: {
        vendor: true,
        dyeingOrder: true,
      },
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

// PUT /dyeing-invoices/:id/approve - Approve invoice
dyeingInvoicesRouter.put('/:id/approve', requirePermission('finance:write'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const invoice = await req.prisma!.dyeingInvoice.findUnique({
      where: { id: Number(id) },
    });

    if (!invoice) {
      throw new AppError('Invoice not found', 404);
    }

    if (invoice.status !== 'READY') {
      throw new AppError('Invoice can only be approved from READY status', 400);
    }

    if (!invoice.totalAmount && !invoice.ratePerKg) {
      throw new AppError('Pricing must be entered before approving', 400);
    }

    const updated = await req.prisma!.dyeingInvoice.update({
      where: { id: Number(id) },
      data: {
        status: 'APPROVED',
        approvedAt: new Date(),
        approvedById: req.user!.userId,
      },
      include: {
        vendor: true,
        dyeingOrder: true,
      },
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

// POST /dyeing-invoices/:id/payment - Record payment
const paymentSchema = z.object({
  paymentMethod: z.enum(['CASH', 'CHEQUE', 'BANK_TRANSFER']),
  paidAmount: z.number().positive(),
  paymentDueDate: z.string().datetime().optional(),
  chequeNumber: z.string().optional(),
  chequeDate: z.string().datetime().optional(),
  bankName: z.string().optional(),
  notes: z.string().optional(),
});

dyeingInvoicesRouter.post('/:id/payment', requirePermission('finance:write'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const data = paymentSchema.parse(req.body);

    const invoice = await req.prisma!.dyeingInvoice.findUnique({
      where: { id: Number(id) },
    });

    if (!invoice) {
      throw new AppError('Invoice not found', 404);
    }

    if (invoice.status !== 'APPROVED') {
      throw new AppError('Payment can only be recorded for approved invoices', 400);
    }

    // Validate cheque details if payment method is CHEQUE
    if (data.paymentMethod === 'CHEQUE') {
      if (!data.chequeNumber) {
        throw new AppError('Cheque number is required for cheque payments', 400);
      }
      if (!data.chequeDate) {
        throw new AppError('Cheque date is required for cheque payments', 400);
      }
    }

    // Determine payment status
    const totalAmount = Number(invoice.totalAmount || 0);
    const previousPaid = Number(invoice.paidAmount || 0);
    const newTotalPaid = previousPaid + data.paidAmount;

    let paymentStatus: 'UNPAID' | 'PARTIAL' | 'PAID' = 'PARTIAL';
    let invoiceStatus: string = invoice.status;

    if (newTotalPaid >= totalAmount) {
      paymentStatus = 'PAID';
      invoiceStatus = 'PAID';
    }

    const updated = await req.prisma!.dyeingInvoice.update({
      where: { id: Number(id) },
      data: {
        status: invoiceStatus as any,
        paymentStatus,
        paymentMethod: data.paymentMethod,
        paidAt: new Date(),
        paidAmount: newTotalPaid,
        paymentDueDate: data.paymentDueDate ? new Date(data.paymentDueDate) : null,
        chequeNumber: data.chequeNumber,
        chequeDate: data.chequeDate ? new Date(data.chequeDate) : null,
        bankName: data.bankName,
        notes: data.notes || invoice.notes,
      },
      include: {
        vendor: true,
        dyeingOrder: true,
      },
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

// PUT /dyeing-invoices/:id/cancel - Cancel invoice
dyeingInvoicesRouter.put('/:id/cancel', requirePermission('finance:write'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const invoice = await req.prisma!.dyeingInvoice.findUnique({
      where: { id: Number(id) },
    });

    if (!invoice) {
      throw new AppError('Invoice not found', 404);
    }

    if (invoice.status === 'PAID') {
      throw new AppError('Cannot cancel a paid invoice', 400);
    }

    const updated = await req.prisma!.dyeingInvoice.update({
      where: { id: Number(id) },
      data: {
        status: 'CANCELLED',
        notes: reason ? `Cancelled: ${reason}` : invoice.notes,
      },
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

// GET /dyeing-invoices/:id/print - Get print data
dyeingInvoicesRouter.get('/:id/print', requirePermission('finance:read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const invoice = await req.prisma!.dyeingInvoice.findUnique({
      where: { id: Number(id) },
      include: {
        vendor: true,
        dyeingOrder: {
          include: {
            items: {
              include: {
                roll: {
                  select: {
                    id: true,
                    rollNumber: true,
                    fabricType: true,
                    greyWeight: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!invoice) {
      throw new AppError('Invoice not found', 404);
    }

    res.json({
      invoice,
      printDate: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});
