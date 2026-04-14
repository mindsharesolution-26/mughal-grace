import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenant';
import { requirePermission } from '../middleware/rbac';
import { validateBody, validateParams, validateQuery } from '../middleware/validate';
import { AppError } from '../middleware/error-handler';

export const yarnLedgerRouter: Router = Router();

// Apply authentication and tenant middleware
yarnLedgerRouter.use(authMiddleware);
yarnLedgerRouter.use(tenantMiddleware);

// ============================================
// VALIDATION SCHEMAS
// ============================================

const idParamSchema = z.object({
  id: z.string().regex(/^\d+$/, 'Invalid ID format').transform(Number),
});

const ledgerQuerySchema = z.object({
  yarnTypeId: z.string().regex(/^\d+$/).transform(Number).optional(),
  vendorId: z.string().regex(/^\d+$/).transform(Number).optional(),
  entryType: z.enum(['OPENING_BALANCE', 'INWARD', 'OUTWARD', 'ADJUSTMENT', 'RETURN']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  paymentStatus: z.enum(['UNPAID', 'PARTIAL', 'PAID', 'OVERDUE']).optional(),
  page: z.string().regex(/^\d+$/).transform(Number).default('1'),
  limit: z.string().regex(/^\d+$/).transform(Number).default('50'),
});

const openingBalanceSchema = z.object({
  yarnTypeId: z.number().int().positive('Yarn type is required'),
  entryDate: z.string().min(1, 'Entry date is required'),
  quantity: z.number().positive('Quantity must be positive'),
  pricePerKg: z.number().positive().optional(),
  notes: z.string().optional(),
});

const adjustmentSchema = z.object({
  yarnTypeId: z.number().int().positive('Yarn type is required'),
  entryDate: z.string().min(1, 'Entry date is required'),
  quantityIn: z.number().min(0).default(0),
  quantityOut: z.number().min(0).default(0),
  pricePerKg: z.number().positive().optional(),
  description: z.string().min(1, 'Description is required'),
  notes: z.string().optional(),
});

// ============================================
// GET /yarn/ledger - List all ledger entries with filters
// ============================================

yarnLedgerRouter.get('/', requirePermission('yarn:read'), validateQuery(ledgerQuerySchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      yarnTypeId,
      vendorId,
      entryType,
      startDate,
      endDate,
      paymentStatus,
      page,
      limit,
    } = req.query as any;

    const where: any = {};

    if (yarnTypeId) where.yarnTypeId = yarnTypeId;
    if (vendorId) where.vendorId = vendorId;
    if (entryType) where.entryType = entryType;
    if (paymentStatus) where.paymentStatus = paymentStatus;

    if (startDate || endDate) {
      where.entryDate = {};
      if (startDate) where.entryDate.gte = new Date(startDate);
      if (endDate) where.entryDate.lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;

    const [entries, total] = await Promise.all([
      req.prisma!.yarnLedger.findMany({
        where,
        include: {
          yarnType: {
            select: { id: true, code: true, name: true, brandName: true, color: true },
          },
          vendor: {
            select: { id: true, code: true, name: true },
          },
        },
        orderBy: [{ entryDate: 'desc' }, { id: 'desc' }],
        skip,
        take: limit,
      }),
      req.prisma!.yarnLedger.count({ where }),
    ]);

    res.json({
      data: entries,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// GET /yarn/ledger/by-type/:yarnTypeId - Get ledger for specific yarn type
// ============================================

yarnLedgerRouter.get('/by-type/:yarnTypeId', requirePermission('yarn:read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const yarnTypeId = Number(req.params.yarnTypeId);
    const { startDate, endDate, page = '1', limit = '100' } = req.query;

    if (isNaN(yarnTypeId)) {
      throw AppError.badRequest('Invalid yarn type ID');
    }

    // Check if yarn type exists
    const yarnType = await req.prisma!.yarnType.findUnique({ where: { id: yarnTypeId } });
    if (!yarnType) {
      throw AppError.notFound('Yarn type');
    }

    const where: any = { yarnTypeId };

    if (startDate || endDate) {
      where.entryDate = {};
      if (startDate) where.entryDate.gte = new Date(startDate as string);
      if (endDate) where.entryDate.lte = new Date(endDate as string);
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [entries, total] = await Promise.all([
      req.prisma!.yarnLedger.findMany({
        where,
        include: {
          vendor: { select: { id: true, code: true, name: true } },
        },
        orderBy: [{ entryDate: 'asc' }, { id: 'asc' }],
        skip,
        take: Number(limit),
      }),
      req.prisma!.yarnLedger.count({ where }),
    ]);

    // Get current balance (latest entry)
    const latestEntry = await req.prisma!.yarnLedger.findFirst({
      where: { yarnTypeId },
      orderBy: [{ entryDate: 'desc' }, { id: 'desc' }],
      select: { runningBalance: true },
    });

    res.json({
      data: {
        yarnType,
        currentBalance: latestEntry?.runningBalance || 0,
        entries,
      },
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

// ============================================
// GET /yarn/ledger/summary - Get stock summary by yarn type
// ============================================

yarnLedgerRouter.get('/summary', requirePermission('yarn:read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get all active yarn types with their latest balance
    const yarnTypes = await req.prisma!.yarnType.findMany({
      where: { isActive: true },
      select: {
        id: true,
        code: true,
        name: true,
        brandName: true,
        color: true,
        defaultPricePerKg: true,
      },
      orderBy: { name: 'asc' },
    });

    // For each yarn type, get the latest ledger entry for current balance
    const summaryPromises = yarnTypes.map(async (yt) => {
      const latestEntry = await req.prisma!.yarnLedger.findFirst({
        where: { yarnTypeId: yt.id },
        orderBy: [{ entryDate: 'desc' }, { id: 'desc' }],
        select: {
          runningBalance: true,
          pricePerKg: true,
          entryDate: true,
        },
      });

      // Get totals
      const totals = await req.prisma!.yarnLedger.aggregate({
        where: { yarnTypeId: yt.id },
        _sum: {
          quantityIn: true,
          quantityOut: true,
          totalValue: true,
        },
      });

      return {
        ...yt,
        currentBalance: latestEntry?.runningBalance?.toNumber() || 0,
        lastPricePerKg: latestEntry?.pricePerKg?.toNumber() || yt.defaultPricePerKg?.toNumber() || 0,
        lastEntryDate: latestEntry?.entryDate || null,
        totalIn: totals._sum.quantityIn?.toNumber() || 0,
        totalOut: totals._sum.quantityOut?.toNumber() || 0,
        totalValue: totals._sum.totalValue?.toNumber() || 0,
      };
    });

    const summary = await Promise.all(summaryPromises);

    // Filter out yarn types with no activity if needed
    const activeSummary = summary.filter(s => s.currentBalance > 0 || s.totalIn > 0);

    // Calculate grand totals
    const grandTotals = {
      totalStock: activeSummary.reduce((sum, s) => sum + s.currentBalance, 0),
      totalIn: activeSummary.reduce((sum, s) => sum + s.totalIn, 0),
      totalOut: activeSummary.reduce((sum, s) => sum + s.totalOut, 0),
      totalValue: activeSummary.reduce((sum, s) => sum + (s.currentBalance * s.lastPricePerKg), 0),
    };

    res.json({
      data: {
        summary: activeSummary,
        totals: grandTotals,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// POST /yarn/ledger/opening-balance - Set opening balance
// ============================================

yarnLedgerRouter.post('/opening-balance', requirePermission('yarn:write'), validateBody(openingBalanceSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.userId;
    const { yarnTypeId, entryDate, quantity, pricePerKg, notes } = req.body;

    // Check if yarn type exists
    const yarnType = await req.prisma!.yarnType.findUnique({ where: { id: yarnTypeId } });
    if (!yarnType) {
      throw AppError.notFound('Yarn type');
    }

    // Check if there's already an opening balance for this yarn type
    const existingOpening = await req.prisma!.yarnLedger.findFirst({
      where: {
        yarnTypeId,
        entryType: 'OPENING_BALANCE',
      },
    });

    if (existingOpening) {
      throw AppError.conflict('Opening balance already exists for this yarn type. Use adjustment instead.');
    }

    // Check if there are any other entries for this yarn type
    const existingEntries = await req.prisma!.yarnLedger.count({
      where: { yarnTypeId },
    });

    if (existingEntries > 0) {
      throw AppError.badRequest('Cannot create opening balance when ledger entries already exist. Use adjustment instead.');
    }

    const totalValue = pricePerKg ? quantity * pricePerKg : null;

    const ledgerEntry = await req.prisma!.yarnLedger.create({
      data: {
        yarnTypeId,
        entryDate: new Date(entryDate),
        entryType: 'OPENING_BALANCE',
        quantityIn: quantity,
        quantityOut: 0,
        runningBalance: quantity,
        pricePerKg,
        totalValue,
        description: 'Opening Balance',
        notes,
        createdBy: userId,
      },
      include: {
        yarnType: { select: { id: true, code: true, name: true } },
      },
    });

    res.status(201).json({
      message: 'Opening balance created',
      data: ledgerEntry,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// POST /yarn/ledger/adjustment - Create manual adjustment
// ============================================

yarnLedgerRouter.post('/adjustment', requirePermission('yarn:write'), validateBody(adjustmentSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.userId;
    const { yarnTypeId, entryDate, quantityIn, quantityOut, pricePerKg, description, notes } = req.body;

    // Validate that at least one quantity is provided
    if (quantityIn === 0 && quantityOut === 0) {
      throw AppError.badRequest('Either quantity in or quantity out must be greater than 0');
    }

    // Check if yarn type exists
    const yarnType = await req.prisma!.yarnType.findUnique({ where: { id: yarnTypeId } });
    if (!yarnType) {
      throw AppError.notFound('Yarn type');
    }

    // Get the last ledger entry to calculate new running balance
    const lastEntry = await req.prisma!.yarnLedger.findFirst({
      where: { yarnTypeId },
      orderBy: [{ entryDate: 'desc' }, { id: 'desc' }],
    });

    const previousBalance = lastEntry?.runningBalance?.toNumber() || 0;
    const newBalance = previousBalance + quantityIn - quantityOut;

    if (newBalance < 0) {
      throw AppError.badRequest(`Insufficient balance. Current: ${previousBalance} KG, trying to remove: ${quantityOut} KG`);
    }

    const netQuantity = quantityIn - quantityOut;
    const totalValue = pricePerKg ? Math.abs(netQuantity) * pricePerKg : null;

    const ledgerEntry = await req.prisma!.yarnLedger.create({
      data: {
        yarnTypeId,
        entryDate: new Date(entryDate),
        entryType: 'ADJUSTMENT',
        quantityIn,
        quantityOut,
        runningBalance: newBalance,
        pricePerKg,
        totalValue,
        description,
        notes,
        createdBy: userId,
      },
      include: {
        yarnType: { select: { id: true, code: true, name: true } },
      },
    });

    res.status(201).json({
      message: 'Adjustment created',
      data: ledgerEntry,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// GET /yarn/ledger/:id - Get single ledger entry
// ============================================

yarnLedgerRouter.get('/:id', requirePermission('yarn:read'), validateParams(idParamSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params as unknown as { id: number };

    const entry = await req.prisma!.yarnLedger.findUnique({
      where: { id },
      include: {
        yarnType: true,
        vendor: true,
      },
    });

    if (!entry) {
      throw AppError.notFound('Ledger entry');
    }

    res.json({ data: entry });
  } catch (error) {
    next(error);
  }
});
