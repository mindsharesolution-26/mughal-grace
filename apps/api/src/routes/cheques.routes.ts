import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenant';
import { requirePermission } from '../middleware/rbac';
import { validateBody, validateParams, validateQuery } from '../middleware/validate';
import { AppError } from '../middleware/error-handler';
import { ChequeType, ChequeStatus, VendorType, VendorLedgerType, LedgerEntryType } from '@prisma/client';

export const chequesRouter: Router = Router();

// Apply authentication and tenant middleware
chequesRouter.use(authMiddleware);
chequesRouter.use(tenantMiddleware);

// Common validation schemas
const idParamSchema = z.object({
  id: z.string().regex(/^\d+$/, 'Invalid ID format').transform(Number),
});

const paginationSchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  type: z.enum(['ISSUED', 'RECEIVED']).optional(),
  status: z.enum(['PENDING', 'DEPOSITED', 'CLEARED', 'BOUNCED', 'CANCELLED', 'REPLACED']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

// ============================================
// CHEQUE CRUD & LIFECYCLE
// ============================================

const createChequeSchema = z.object({
  chequeNumber: z.string().min(1, 'Cheque number is required').max(50),
  chequeType: z.enum(['ISSUED', 'RECEIVED']),
  // Entity reference (one required based on type)
  customerId: z.number().int().positive().optional(),
  vendorType: z.enum(['YARN', 'DYEING', 'GENERAL']).optional(),
  vendorId: z.number().int().positive().optional(),
  // Bank details
  bankName: z.string().min(1, 'Bank name is required').max(100),
  branchName: z.string().max(100).optional(),
  accountNumber: z.string().max(50).optional(),
  // Amount and dates
  amount: z.number().positive('Amount is required'),
  chequeDate: z.string().min(1, 'Cheque date is required'),
  receivedDate: z.string().optional(),
  // Links
  customerPaymentId: z.number().int().positive().optional(),
  vendorPaymentId: z.number().int().positive().optional(),
  notes: z.string().optional(),
});

// GET /cheques - List cheques with filters
chequesRouter.get('/', requirePermission('finance:read'), validateQuery(paginationSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = 1, limit = 50, type, status, startDate, endDate } = req.query as any;

    const whereClause: any = {};
    if (type) whereClause.chequeType = type;
    if (status) whereClause.status = status;
    if (startDate) whereClause.chequeDate = { ...whereClause.chequeDate, gte: new Date(startDate) };
    if (endDate) whereClause.chequeDate = { ...whereClause.chequeDate, lte: new Date(endDate) };

    const [cheques, total] = await Promise.all([
      req.prisma!.cheque.findMany({
        where: whereClause,
        include: {
          customer: { select: { id: true, code: true, name: true } },
          yarnVendor: { select: { id: true, code: true, name: true } },
          dyeingVendor: { select: { id: true, code: true, name: true } },
          generalSupplier: { select: { id: true, code: true, name: true } },
          statusHistory: {
            orderBy: { changedAt: 'desc' },
            take: 1,
          },
        },
        orderBy: [{ chequeDate: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      req.prisma!.cheque.count({ where: whereClause }),
    ]);

    res.json({
      data: cheques,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
});

// GET /cheques/:id - Get single cheque with history
chequesRouter.get('/:id', requirePermission('finance:read'), validateParams(idParamSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params as unknown as { id: number };

    const cheque = await req.prisma!.cheque.findUnique({
      where: { id },
      include: {
        customer: true,
        yarnVendor: true,
        dyeingVendor: true,
        generalSupplier: true,
        customerPayment: true,
        vendorPayment: true,
        replacedBy: true,
        replaces: true,
        statusHistory: {
          orderBy: { changedAt: 'desc' },
        },
      },
    });

    if (!cheque) {
      throw AppError.notFound('Cheque');
    }

    res.json({ data: cheque });
  } catch (error) {
    next(error);
  }
});

// POST /cheques - Create cheque record
chequesRouter.post('/', requirePermission('finance:write'), validateBody(createChequeSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.userId;

    // Validate entity reference
    if (req.body.chequeType === 'RECEIVED' && !req.body.customerId) {
      throw AppError.badRequest('Customer is required for received cheques');
    }
    if (req.body.chequeType === 'ISSUED' && (!req.body.vendorType || !req.body.vendorId)) {
      throw AppError.badRequest('Vendor is required for issued cheques');
    }

    // Build cheque data
    const chequeData: any = {
      chequeNumber: req.body.chequeNumber,
      chequeType: req.body.chequeType as ChequeType,
      bankName: req.body.bankName,
      branchName: req.body.branchName,
      accountNumber: req.body.accountNumber,
      amount: req.body.amount,
      chequeDate: new Date(req.body.chequeDate),
      receivedDate: req.body.receivedDate ? new Date(req.body.receivedDate) : new Date(),
      status: 'PENDING' as ChequeStatus,
      customerPaymentId: req.body.customerPaymentId,
      vendorPaymentId: req.body.vendorPaymentId,
      notes: req.body.notes,
      createdBy: userId,
    };

    if (req.body.customerId) chequeData.customerId = req.body.customerId;
    if (req.body.vendorType === 'YARN') chequeData.yarnVendorId = req.body.vendorId;
    else if (req.body.vendorType === 'DYEING') chequeData.dyeingVendorId = req.body.vendorId;
    else if (req.body.vendorType === 'GENERAL') chequeData.generalSupplierId = req.body.vendorId;

    const cheque = await req.prisma!.cheque.create({ data: chequeData });

    // Create initial status history
    await req.prisma!.chequeStatusHistory.create({
      data: {
        chequeId: cheque.id,
        fromStatus: null,
        toStatus: 'PENDING',
        changedBy: userId,
        reason: 'Cheque created',
      },
    });

    // Update pending cheque count in outstanding balance
    if (req.body.chequeType === 'RECEIVED' && req.body.customerId) {
      await req.prisma!.outstandingBalance.update({
        where: {
          entityType_entityId: {
            entityType: 'customer',
            entityId: req.body.customerId,
          },
        },
        data: {
          pendingChequeAmount: { increment: req.body.amount },
          pendingChequeCount: { increment: 1 },
        },
      });
    }

    res.status(201).json({ message: 'Cheque created', data: cheque });
  } catch (error) {
    next(error);
  }
});

// POST /cheques/:id/deposit - Mark cheque as deposited
chequesRouter.post('/:id/deposit', requirePermission('finance:write'), validateParams(idParamSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params as unknown as { id: number };
    const userId = (req as any).user?.userId;
    const { depositDate, notes } = req.body;

    const cheque = await req.prisma!.cheque.findUnique({ where: { id } });
    if (!cheque) {
      throw AppError.notFound('Cheque');
    }

    if (cheque.status !== 'PENDING') {
      throw AppError.badRequest(`Cannot deposit cheque in ${cheque.status} status`);
    }

    const updatedCheque = await req.prisma!.cheque.update({
      where: { id },
      data: {
        status: 'DEPOSITED',
        depositDate: depositDate ? new Date(depositDate) : new Date(),
      },
    });

    await req.prisma!.chequeStatusHistory.create({
      data: {
        chequeId: id,
        fromStatus: 'PENDING',
        toStatus: 'DEPOSITED',
        changedBy: userId,
        reason: notes || 'Cheque deposited to bank',
      },
    });

    res.json({ message: 'Cheque marked as deposited', data: updatedCheque });
  } catch (error) {
    next(error);
  }
});

// POST /cheques/:id/clear - Mark cheque as cleared
chequesRouter.post('/:id/clear', requirePermission('finance:write'), validateParams(idParamSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params as unknown as { id: number };
    const userId = (req as any).user?.userId;
    const { clearanceDate, notes } = req.body;

    const cheque = await req.prisma!.cheque.findUnique({ where: { id } });
    if (!cheque) {
      throw AppError.notFound('Cheque');
    }

    if (!['PENDING', 'DEPOSITED'].includes(cheque.status)) {
      throw AppError.badRequest(`Cannot clear cheque in ${cheque.status} status`);
    }

    const updatedCheque = await req.prisma!.cheque.update({
      where: { id },
      data: {
        status: 'CLEARED',
        clearanceDate: clearanceDate ? new Date(clearanceDate) : new Date(),
      },
    });

    await req.prisma!.chequeStatusHistory.create({
      data: {
        chequeId: id,
        fromStatus: cheque.status,
        toStatus: 'CLEARED',
        changedBy: userId,
        reason: notes || 'Cheque cleared',
      },
    });

    // Update pending cheque count for received cheques
    if (cheque.chequeType === 'RECEIVED' && cheque.customerId) {
      await req.prisma!.outstandingBalance.update({
        where: {
          entityType_entityId: {
            entityType: 'customer',
            entityId: cheque.customerId,
          },
        },
        data: {
          pendingChequeAmount: { decrement: cheque.amount.toNumber() },
          pendingChequeCount: { decrement: 1 },
        },
      });
    }

    res.json({ message: 'Cheque marked as cleared', data: updatedCheque });
  } catch (error) {
    next(error);
  }
});

// POST /cheques/:id/bounce - Mark cheque as bounced (reverses ledger)
chequesRouter.post('/:id/bounce', requirePermission('finance:write'), validateParams(idParamSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params as unknown as { id: number };
    const userId = (req as any).user?.userId;
    const { bouncedDate, bounceReason, bounceCharges, notes } = req.body;

    const cheque = await req.prisma!.cheque.findUnique({ where: { id } });
    if (!cheque) {
      throw AppError.notFound('Cheque');
    }

    if (!['PENDING', 'DEPOSITED'].includes(cheque.status)) {
      throw AppError.badRequest(`Cannot bounce cheque in ${cheque.status} status`);
    }

    const updatedCheque = await req.prisma!.cheque.update({
      where: { id },
      data: {
        status: 'BOUNCED',
        bouncedDate: bouncedDate ? new Date(bouncedDate) : new Date(),
        bounceReason,
        bounceCharges: bounceCharges || 0,
        bounceCount: { increment: 1 },
      },
    });

    await req.prisma!.chequeStatusHistory.create({
      data: {
        chequeId: id,
        fromStatus: cheque.status,
        toStatus: 'BOUNCED',
        changedBy: userId,
        reason: notes || bounceReason || 'Cheque bounced',
      },
    });

    // Reverse the payment in ledger
    if (cheque.chequeType === 'RECEIVED' && cheque.customerId) {
      // Get current balance
      const balance = await req.prisma!.outstandingBalance.findUnique({
        where: {
          entityType_entityId: {
            entityType: 'customer',
            entityId: cheque.customerId,
          },
        },
      });

      const currentBalance = balance?.currentBalance?.toNumber() || 0;
      const reversalAmount = cheque.amount.toNumber() + (bounceCharges || 0);
      const newBalance = currentBalance + reversalAmount;

      // Create reversal ledger entry
      await req.prisma!.customerLedgerEntry.create({
        data: {
          customerId: cheque.customerId,
          entryDate: new Date(),
          entryType: 'ADJUSTMENT' as LedgerEntryType,
          debit: reversalAmount,
          credit: 0,
          balance: newBalance,
          referenceType: 'cheque_bounce',
          referenceId: cheque.id,
          referenceNumber: cheque.chequeNumber,
          description: `Cheque bounced - ${bounceReason || 'Unknown reason'}${bounceCharges ? ` (Charges: ${bounceCharges})` : ''}`,
        },
      });

      // Update outstanding balance
      await req.prisma!.outstandingBalance.update({
        where: {
          entityType_entityId: {
            entityType: 'customer',
            entityId: cheque.customerId,
          },
        },
        data: {
          totalDebit: { increment: reversalAmount },
          currentBalance: newBalance,
          pendingChequeAmount: { decrement: cheque.amount.toNumber() },
          pendingChequeCount: { decrement: 1 },
          lastTransactionAt: new Date(),
        },
      });
    } else if (cheque.chequeType === 'ISSUED') {
      // Reverse vendor payment
      const vendorId = cheque.yarnVendorId || cheque.dyeingVendorId || cheque.generalSupplierId;
      const vendorType = cheque.yarnVendorId ? 'YARN' : cheque.dyeingVendorId ? 'DYEING' : 'GENERAL';
      const entityType = cheque.yarnVendorId ? 'yarn_vendor' : cheque.dyeingVendorId ? 'dyeing_vendor' : 'general_supplier';

      if (vendorId) {
        const balance = await req.prisma!.outstandingBalance.findUnique({
          where: {
            entityType_entityId: {
              entityType,
              entityId: vendorId,
            },
          },
        });

        const currentBalance = balance?.currentBalance?.toNumber() || 0;
        const newBalance = currentBalance + cheque.amount.toNumber();

        // Create reversal ledger entry
        const ledgerData: any = {
          vendorType: vendorType as VendorType,
          entryDate: new Date(),
          entryType: 'ADJUSTMENT' as VendorLedgerType,
          debit: cheque.amount,
          credit: 0,
          balance: newBalance,
          referenceType: 'cheque_bounce',
          referenceId: cheque.id,
          referenceNumber: cheque.chequeNumber,
          description: `Cheque bounced - ${bounceReason || 'Unknown reason'}`,
          createdBy: userId,
        };

        if (vendorType === 'YARN') ledgerData.yarnVendorId = vendorId;
        else if (vendorType === 'DYEING') ledgerData.dyeingVendorId = vendorId;
        else if (vendorType === 'GENERAL') ledgerData.generalSupplierId = vendorId;

        await req.prisma!.vendorLedgerEntry.create({ data: ledgerData });

        await req.prisma!.outstandingBalance.update({
          where: {
            entityType_entityId: {
              entityType,
              entityId: vendorId,
            },
          },
          data: {
            totalDebit: { increment: cheque.amount },
            currentBalance: newBalance,
            lastTransactionAt: new Date(),
          },
        });
      }
    }

    res.json({ message: 'Cheque marked as bounced, ledger reversed', data: updatedCheque });
  } catch (error) {
    next(error);
  }
});

// POST /cheques/:id/replace - Create replacement cheque
chequesRouter.post('/:id/replace', requirePermission('finance:write'), validateParams(idParamSchema), validateBody(createChequeSchema.omit({ chequeType: true, customerId: true, vendorType: true, vendorId: true })), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params as unknown as { id: number };
    const userId = (req as any).user?.userId;

    const originalCheque = await req.prisma!.cheque.findUnique({ where: { id } });
    if (!originalCheque) {
      throw AppError.notFound('Original cheque');
    }

    if (originalCheque.status !== 'BOUNCED') {
      throw AppError.badRequest('Can only replace bounced cheques');
    }

    // Create replacement cheque with same entity links
    const replacementData: any = {
      chequeNumber: req.body.chequeNumber,
      chequeType: originalCheque.chequeType,
      customerId: originalCheque.customerId,
      yarnVendorId: originalCheque.yarnVendorId,
      dyeingVendorId: originalCheque.dyeingVendorId,
      generalSupplierId: originalCheque.generalSupplierId,
      bankName: req.body.bankName,
      branchName: req.body.branchName,
      accountNumber: req.body.accountNumber,
      amount: req.body.amount,
      chequeDate: new Date(req.body.chequeDate),
      receivedDate: req.body.receivedDate ? new Date(req.body.receivedDate) : new Date(),
      status: 'PENDING' as ChequeStatus,
      originalChequeId: originalCheque.id,
      notes: req.body.notes,
      createdBy: userId,
    };

    const replacementCheque = await req.prisma!.cheque.create({ data: replacementData });

    // Update original cheque
    await req.prisma!.cheque.update({
      where: { id },
      data: {
        status: 'REPLACED',
        replacedByChequeId: replacementCheque.id,
      },
    });

    // Create status history for both
    await req.prisma!.chequeStatusHistory.createMany({
      data: [
        {
          chequeId: id,
          fromStatus: 'BOUNCED',
          toStatus: 'REPLACED',
          changedBy: userId,
          reason: `Replaced by cheque ${req.body.chequeNumber}`,
        },
        {
          chequeId: replacementCheque.id,
          fromStatus: null,
          toStatus: 'PENDING',
          changedBy: userId,
          reason: `Replacement for bounced cheque ${originalCheque.chequeNumber}`,
        },
      ],
    });

    // Update pending cheque for received cheques
    if (originalCheque.chequeType === 'RECEIVED' && originalCheque.customerId) {
      await req.prisma!.outstandingBalance.update({
        where: {
          entityType_entityId: {
            entityType: 'customer',
            entityId: originalCheque.customerId,
          },
        },
        data: {
          pendingChequeAmount: { increment: req.body.amount },
          pendingChequeCount: { increment: 1 },
        },
      });
    }

    res.status(201).json({ message: 'Replacement cheque created', data: replacementCheque });
  } catch (error) {
    next(error);
  }
});

// POST /cheques/:id/cancel - Cancel cheque
chequesRouter.post('/:id/cancel', requirePermission('finance:write'), validateParams(idParamSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params as unknown as { id: number };
    const userId = (req as any).user?.userId;
    const { reason } = req.body;

    const cheque = await req.prisma!.cheque.findUnique({ where: { id } });
    if (!cheque) {
      throw AppError.notFound('Cheque');
    }

    if (!['PENDING'].includes(cheque.status)) {
      throw AppError.badRequest(`Cannot cancel cheque in ${cheque.status} status`);
    }

    const updatedCheque = await req.prisma!.cheque.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    await req.prisma!.chequeStatusHistory.create({
      data: {
        chequeId: id,
        fromStatus: cheque.status,
        toStatus: 'CANCELLED',
        changedBy: userId,
        reason: reason || 'Cheque cancelled',
      },
    });

    // Update pending cheque count
    if (cheque.chequeType === 'RECEIVED' && cheque.customerId) {
      await req.prisma!.outstandingBalance.update({
        where: {
          entityType_entityId: {
            entityType: 'customer',
            entityId: cheque.customerId,
          },
        },
        data: {
          pendingChequeAmount: { decrement: cheque.amount.toNumber() },
          pendingChequeCount: { decrement: 1 },
        },
      });
    }

    res.json({ message: 'Cheque cancelled', data: updatedCheque });
  } catch (error) {
    next(error);
  }
});

// ============================================
// CHEQUE REPORTS
// ============================================

// GET /cheques/pending-clearance - Awaiting clearance
chequesRouter.get('/pending-clearance', requirePermission('finance:read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cheques = await req.prisma!.cheque.findMany({
      where: {
        status: { in: ['PENDING', 'DEPOSITED'] },
      },
      include: {
        customer: { select: { id: true, code: true, name: true } },
        yarnVendor: { select: { id: true, code: true, name: true } },
        dyeingVendor: { select: { id: true, code: true, name: true } },
        generalSupplier: { select: { id: true, code: true, name: true } },
      },
      orderBy: { chequeDate: 'asc' },
    });

    res.json({ data: cheques });
  } catch (error) {
    next(error);
  }
});

// GET /cheques/post-dated - Future dated cheques
chequesRouter.get('/post-dated', requirePermission('finance:read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const cheques = await req.prisma!.cheque.findMany({
      where: {
        chequeDate: { gt: today },
        status: 'PENDING',
      },
      include: {
        customer: { select: { id: true, code: true, name: true } },
        yarnVendor: { select: { id: true, code: true, name: true } },
        dyeingVendor: { select: { id: true, code: true, name: true } },
        generalSupplier: { select: { id: true, code: true, name: true } },
      },
      orderBy: { chequeDate: 'asc' },
    });

    res.json({ data: cheques });
  } catch (error) {
    next(error);
  }
});

// GET /cheques/maturing - Cheques maturing in next N days
chequesRouter.get('/maturing', requirePermission('finance:read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const days = parseInt(req.query.days as string) || 7;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + days);

    const cheques = await req.prisma!.cheque.findMany({
      where: {
        chequeDate: {
          gte: today,
          lte: endDate,
        },
        status: 'PENDING',
      },
      include: {
        customer: { select: { id: true, code: true, name: true } },
        yarnVendor: { select: { id: true, code: true, name: true } },
        dyeingVendor: { select: { id: true, code: true, name: true } },
        generalSupplier: { select: { id: true, code: true, name: true } },
      },
      orderBy: { chequeDate: 'asc' },
    });

    res.json({ data: cheques });
  } catch (error) {
    next(error);
  }
});

// GET /cheques/summary - Dashboard stats
chequesRouter.get('/summary', requirePermission('finance:read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [statusCounts, typeCounts, pendingAmount, bouncedCount] = await Promise.all([
      req.prisma!.cheque.groupBy({
        by: ['status'],
        _count: true,
        _sum: { amount: true },
      }),
      req.prisma!.cheque.groupBy({
        by: ['chequeType'],
        where: { status: 'PENDING' },
        _count: true,
        _sum: { amount: true },
      }),
      req.prisma!.cheque.aggregate({
        where: { status: { in: ['PENDING', 'DEPOSITED'] } },
        _sum: { amount: true },
        _count: true,
      }),
      req.prisma!.cheque.count({
        where: { status: 'BOUNCED' },
      }),
    ]);

    // Recent bounced cheques
    const recentBounced = await req.prisma!.cheque.findMany({
      where: { status: 'BOUNCED' },
      take: 5,
      orderBy: { bouncedDate: 'desc' },
      include: {
        customer: { select: { name: true } },
        yarnVendor: { select: { name: true } },
        dyeingVendor: { select: { name: true } },
        generalSupplier: { select: { name: true } },
      },
    });

    res.json({
      data: {
        byStatus: statusCounts,
        byType: typeCounts,
        pendingClearance: {
          count: pendingAmount._count,
          amount: pendingAmount._sum.amount || 0,
        },
        bouncedCount,
        recentBounced,
      },
    });
  } catch (error) {
    next(error);
  }
});
