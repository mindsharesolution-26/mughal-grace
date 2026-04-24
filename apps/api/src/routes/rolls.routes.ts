import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { authMiddleware } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenant';
import { requirePermission } from '../middleware/rbac';
import { validateBody, validateQuery } from '../middleware/validate';
import { AppError } from '../middleware/error-handler';
import { logger } from '../utils/logger';
import { parsePagination, buildPaginationMeta } from '../utils/pagination';

export const rollsRouter: Router = Router();

rollsRouter.use(authMiddleware);
rollsRouter.use(tenantMiddleware);

// ========================================
// Validation Schemas
// ========================================

const rollStatusEnum = z.enum([
  'GREY_STOCK',
  'SENT_TO_DYEING',
  'AT_DYEING',
  'RECEIVED_FROM_DYEING',
  'FINISHED_STOCK',
  'SOLD',
  'REJECTED'
]);

const createRollSchema = z.object({
  // New: Primary way - link to Fabric template
  fabricId: z.number().int().positive().optional(),
  // Legacy: Direct machine + fabricType (now optional if fabricId provided)
  machineId: z.number().int().positive().optional(),
  fabricType: z.string().min(1).max(100).optional(),
  // Required fields
  greyWeight: z.number().positive(),
  rollNumber: z.string().max(50).optional(),
  grade: z.string().max(10).optional(),
  defectNotes: z.string().optional(),
  location: z.string().max(100).optional(),
  productionLogId: z.number().int().positive().optional(),
}).refine(
  data => data.fabricId || (data.machineId && data.fabricType),
  { message: 'Either fabricId OR (machineId + fabricType) must be provided' }
);

const updateRollStatusSchema = z.object({
  status: rollStatusEnum,
  notes: z.string().optional(),
});

const stockOutSchema = z.object({
  notes: z.string().optional(),
  destinationType: z.enum(['SALE', 'DYEING', 'TRANSFER', 'RETURN']).optional(),
  referenceId: z.number().int().positive().optional(),
});

const listRollsSchema = z.object({
  status: rollStatusEnum.optional(),
  machineId: z.string().regex(/^\d+$/).optional(),
  search: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  sortBy: z.enum(['rollNumber', 'greyWeight', 'producedAt', 'createdAt', 'status']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  page: z.string().regex(/^\d+$/).optional(),
  limit: z.string().regex(/^\d+$/).optional(),
});

// ========================================
// Helper Functions
// ========================================

/**
 * Generate a unique QR code string
 * Format: ROLL-{timestamp_base36}-{random_hex}
 */
function generateQRCode(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `ROLL-${timestamp}-${random}`;
}

/**
 * Generate a unique roll number
 * Format: R-{YYMMDD}-{sequence}
 */
async function generateRollNumber(prisma: any): Promise<string> {
  const today = new Date();
  const dateStr = today.toISOString().slice(2, 10).replace(/-/g, '');
  const prefix = `R-${dateStr}-`;

  // Find the latest roll number with this prefix
  const latestRoll = await prisma.roll.findFirst({
    where: {
      rollNumber: { startsWith: prefix }
    },
    orderBy: { rollNumber: 'desc' },
    select: { rollNumber: true }
  });

  let sequence = 1;
  if (latestRoll?.rollNumber) {
    const lastSeq = parseInt(latestRoll.rollNumber.replace(prefix, ''), 10);
    if (!isNaN(lastSeq)) {
      sequence = lastSeq + 1;
    }
  }

  return `${prefix}${sequence.toString().padStart(4, '0')}`;
}

// ========================================
// GET /rolls - List all rolls
// ========================================
rollsRouter.get('/', requirePermission('rolls:read'), validateQuery(listRollsSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      status,
      machineId,
      search,
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = '1',
      limit = '50'
    } = req.query;

    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (machineId) {
      where.machineId = parseInt(machineId as string);
    }

    if (search) {
      where.OR = [
        { rollNumber: { contains: search as string, mode: 'insensitive' } },
        { qrCode: { contains: search as string, mode: 'insensitive' } },
        { fabricType: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    if (startDate || endDate) {
      where.producedAt = {};
      if (startDate) where.producedAt.gte = new Date(startDate as string);
      if (endDate) where.producedAt.lte = new Date(endDate as string);
    }

    const pagination = parsePagination(page as string, limit as string, { maxLimit: 100 });

    const [rolls, total] = await Promise.all([
      req.prisma!.roll.findMany({
        where,
        orderBy: { [sortBy as string]: sortOrder },
        skip: pagination.skip,
        take: pagination.limit,
        include: {
          machine: {
            select: {
              id: true,
              machineNumber: true,
              name: true,
            }
          }
        }
      }),
      req.prisma!.roll.count({ where }),
    ]);

    res.json({
      rolls,
      pagination: buildPaginationMeta(pagination.page, pagination.limit, total),
    });
  } catch (error) {
    next(error);
  }
});

// ========================================
// GET /rolls/by-qr/:qrCode - Lookup roll by QR code
// ========================================
rollsRouter.get('/by-qr/:qrCode', requirePermission('rolls:read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { qrCode } = req.params;

    const roll = await req.prisma!.roll.findUnique({
      where: { qrCode },
      include: {
        machine: {
          select: {
            id: true,
            machineNumber: true,
            name: true,
          }
        },
        statusHistory: {
          orderBy: { changedAt: 'desc' },
          take: 5,
          select: {
            id: true,
            fromStatus: true,
            toStatus: true,
            notes: true,
            changedAt: true,
          }
        }
      }
    });

    if (!roll) {
      throw AppError.notFound('Roll');
    }

    const isIssued = roll.status === 'SOLD';
    const warning = isIssued ? 'This roll has already been issued/sold' : null;

    res.json({
      data: roll,
      isIssued,
      warning,
    });
  } catch (error) {
    next(error);
  }
});

// ========================================
// GET /rolls/grey-stock/summary - Get grey stock summary
// ========================================
rollsRouter.get('/grey-stock/summary', requirePermission('rolls:read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [greyStock, byMachine, recentRolls] = await Promise.all([
      // Total grey stock
      req.prisma!.roll.aggregate({
        where: { status: 'GREY_STOCK' },
        _count: { id: true },
        _sum: { greyWeight: true },
      }),
      // By machine
      req.prisma!.roll.groupBy({
        by: ['machineId'],
        where: { status: 'GREY_STOCK' },
        _count: { id: true },
        _sum: { greyWeight: true },
      }),
      // Recent rolls
      req.prisma!.roll.findMany({
        where: { status: 'GREY_STOCK' },
        take: 10,
        orderBy: { producedAt: 'desc' },
        select: {
          id: true,
          rollNumber: true,
          qrCode: true,
          greyWeight: true,
          fabricType: true,
          producedAt: true,
          machine: {
            select: {
              machineNumber: true,
              name: true,
            }
          }
        }
      })
    ]);

    res.json({
      totalRolls: greyStock._count.id || 0,
      totalWeight: Number(greyStock._sum.greyWeight) || 0,
      byMachine,
      recentRolls,
    });
  } catch (error) {
    next(error);
  }
});

// ========================================
// GET /rolls/finished-stock/summary - Get finished stock summary
// ========================================
rollsRouter.get('/finished-stock/summary', requirePermission('rolls:read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [finishedStock, byStatus, recentRolls] = await Promise.all([
      // Total finished stock
      req.prisma!.roll.aggregate({
        where: { status: 'FINISHED_STOCK' },
        _count: { id: true },
        _sum: { greyWeight: true },
      }),
      // Count by status
      req.prisma!.roll.groupBy({
        by: ['status'],
        _count: { id: true },
        _sum: { greyWeight: true },
      }),
      // Recent finished rolls
      req.prisma!.roll.findMany({
        where: { status: 'FINISHED_STOCK' },
        take: 10,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          rollNumber: true,
          qrCode: true,
          greyWeight: true,
          fabricType: true,
          producedAt: true,
        }
      })
    ]);

    res.json({
      totalRolls: finishedStock._count.id || 0,
      totalWeight: Number(finishedStock._sum.greyWeight) || 0,
      byStatus: byStatus.reduce((acc, s) => {
        acc[s.status] = {
          count: s._count.id,
          weight: Number(s._sum.greyWeight) || 0,
        };
        return acc;
      }, {} as Record<string, { count: number; weight: number }>),
      recentRolls,
    });
  } catch (error) {
    next(error);
  }
});

// ========================================
// GET /rolls/:id - Get roll details
// ========================================
rollsRouter.get('/:id', requirePermission('rolls:read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      throw AppError.badRequest('Invalid roll ID');
    }

    const roll = await req.prisma!.roll.findUnique({
      where: { id },
      include: {
        machine: {
          select: {
            id: true,
            machineNumber: true,
            name: true,
            machineType: true,
          }
        },
        productionLog: {
          select: {
            id: true,
            shiftId: true,
            targetWeight: true,
            actualWeight: true,
            createdAt: true,
          }
        },
        statusHistory: {
          orderBy: { changedAt: 'desc' },
          select: {
            id: true,
            fromStatus: true,
            toStatus: true,
            notes: true,
            changedAt: true,
          }
        }
      }
    });

    if (!roll) {
      throw AppError.notFound('Roll');
    }

    res.json(roll);
  } catch (error) {
    next(error);
  }
});

// ========================================
// POST /rolls - Create new roll with QR code
// ========================================
rollsRouter.post('/', requirePermission('rolls:write'), validateBody(createRollSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = req.body;
    const userId = req.user?.userId;

    let machineId: number;
    let fabricType: string;
    let fabricId: number | null = null;
    let fabric: any = null;

    // If fabricId provided, fetch Fabric and derive values
    if (data.fabricId) {
      fabric = await req.prisma!.fabric.findUnique({
        where: { id: data.fabricId },
        include: {
          machine: { select: { id: true, machineNumber: true, name: true } },
        }
      });

      if (!fabric) {
        throw AppError.notFound('Fabric');
      }

      if (!fabric.machineId) {
        throw AppError.badRequest('Selected Fabric does not have a machine assigned');
      }

      machineId = fabric.machineId;
      fabricType = fabric.name;
      fabricId = fabric.id;
    } else {
      // Legacy: Use provided machineId and fabricType
      machineId = data.machineId!;
      fabricType = data.fabricType!;

      // Verify machine exists
      const machine = await req.prisma!.machine.findUnique({
        where: { id: machineId },
      });

      if (!machine) {
        throw AppError.notFound('Machine');
      }
    }

    // Generate unique QR code and roll number
    const qrCode = generateQRCode();
    const rollNumber = data.rollNumber || await generateRollNumber(req.prisma!);

    // Check for duplicate roll number
    const existingRoll = await req.prisma!.roll.findUnique({
      where: { rollNumber },
    });

    if (existingRoll) {
      throw AppError.conflict('Roll number already exists');
    }

    // Create roll with QR code and update fabric stock in a transaction
    const roll = await req.prisma!.$transaction(async (tx: any) => {
      // Create the roll
      const newRoll = await tx.roll.create({
        data: {
          rollNumber,
          qrCode,
          fabricId,  // Link to Fabric template (null for legacy)
          machineId,
          fabricType,  // Keep for backward compatibility
          greyWeight: data.greyWeight,
          grade: data.grade || 'A',
          defectNotes: data.defectNotes,
          location: data.location,
          productionLogId: data.productionLogId,
          status: 'GREY_STOCK',
          producedAt: new Date(),
        },
        include: {
          machine: {
            select: {
              id: true,
              machineNumber: true,
              name: true,
            }
          },
          fabric: {
            select: {
              id: true,
              code: true,
              name: true,
            }
          }
        }
      });

      // Create initial status history entry
      await tx.rollStatusHistory.create({
        data: {
          rollId: newRoll.id,
          toStatus: 'GREY_STOCK',
          notes: fabric
            ? `Roll created from Fabric: ${fabric.code} (${fabric.name})`
            : 'Roll created from production',
          changedBy: userId,
        }
      });

      // If linked to a Fabric, update its stock and create movement record
      if (fabricId) {
        // Increment fabric currentStock
        await tx.fabric.update({
          where: { id: fabricId },
          data: {
            currentStock: {
              increment: data.greyWeight
            }
          }
        });

        // Create stock movement record
        await tx.fabricStockMovement.create({
          data: {
            fabricId: fabricId,
            type: 'IN',
            quantity: data.greyWeight,
            referenceNumber: newRoll.rollNumber,
            sourceType: 'PRODUCTION',
            notes: `Production roll: ${newRoll.rollNumber}`,
            createdBy: userId,
          }
        });
      }

      return newRoll;
    });

    logger.info(`Roll created: ${roll.rollNumber} (QR: ${roll.qrCode}, Fabric: ${fabric?.code || 'N/A'})`);

    res.status(201).json({
      data: roll,
      message: 'Roll created successfully',
    });
  } catch (error) {
    next(error);
  }
});

// ========================================
// PATCH /rolls/:id/status - Update roll status
// ========================================
rollsRouter.patch('/:id/status', requirePermission('rolls:write'), validateBody(updateRollStatusSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const { status, notes } = req.body;
    const userId = req.user?.userId;

    if (isNaN(id)) {
      throw AppError.badRequest('Invalid roll ID');
    }

    const existing = await req.prisma!.roll.findUnique({
      where: { id },
    });

    if (!existing) {
      throw AppError.notFound('Roll');
    }

    const previousStatus = existing.status;

    // Update roll status
    const roll = await req.prisma!.roll.update({
      where: { id },
      data: { status },
      include: {
        machine: {
          select: {
            id: true,
            machineNumber: true,
            name: true,
          }
        }
      }
    });

    // Create status history entry
    await req.prisma!.rollStatusHistory.create({
      data: {
        rollId: id,
        fromStatus: previousStatus,
        toStatus: status,
        notes,
        changedBy: userId,
      }
    });

    logger.info(`Roll ${roll.rollNumber} status changed: ${previousStatus} -> ${status}`);

    res.json({
      data: roll,
      previousStatus,
      newStatus: status,
    });
  } catch (error) {
    next(error);
  }
});

// ========================================
// POST /rolls/:id/stock-out - Mark roll as issued/sold
// ========================================
rollsRouter.post('/:id/stock-out', requirePermission('rolls:write'), validateBody(stockOutSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const { notes, destinationType } = req.body;
    const userId = req.user?.userId;

    if (isNaN(id)) {
      throw AppError.badRequest('Invalid roll ID');
    }

    const existing = await req.prisma!.roll.findUnique({
      where: { id },
    });

    if (!existing) {
      throw AppError.notFound('Roll');
    }

    const previousStatus = existing.status;
    const isAlreadyIssued = previousStatus === 'SOLD';

    // Update roll status to SOLD
    const roll = await req.prisma!.roll.update({
      where: { id },
      data: { status: 'SOLD' },
      include: {
        machine: {
          select: {
            id: true,
            machineNumber: true,
            name: true,
          }
        }
      }
    });

    // Create status history entry
    const stockOutNote = destinationType
      ? `Stock out (${destinationType})${notes ? ': ' + notes : ''}`
      : notes || 'Stock out';

    await req.prisma!.rollStatusHistory.create({
      data: {
        rollId: id,
        fromStatus: previousStatus,
        toStatus: 'SOLD',
        notes: stockOutNote,
        changedBy: userId,
      }
    });

    logger.info(`Roll ${roll.rollNumber} stocked out. Previous status: ${previousStatus}`);

    res.json({
      data: roll,
      previousStatus,
      wasAlreadyIssued: isAlreadyIssued,
      warning: isAlreadyIssued ? 'This roll was already marked as issued' : null,
    });
  } catch (error) {
    next(error);
  }
});

// ========================================
// GET /rolls/:id/history - Get roll status history
// ========================================
rollsRouter.get('/:id/history', requirePermission('rolls:read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      throw AppError.badRequest('Invalid roll ID');
    }

    const roll = await req.prisma!.roll.findUnique({
      where: { id },
      select: {
        id: true,
        rollNumber: true,
        qrCode: true,
        status: true,
      }
    });

    if (!roll) {
      throw AppError.notFound('Roll');
    }

    const history = await req.prisma!.rollStatusHistory.findMany({
      where: { rollId: id },
      orderBy: { changedAt: 'desc' },
    });

    res.json({
      roll,
      history,
    });
  } catch (error) {
    next(error);
  }
});

// ========================================
// GET /rolls/stats - Roll statistics
// ========================================
rollsRouter.get('/stats/overview', requirePermission('rolls:read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [byStatus, todayProduction, totalWeight] = await Promise.all([
      // Count by status
      req.prisma!.roll.groupBy({
        by: ['status'],
        _count: { id: true },
        _sum: { greyWeight: true },
      }),
      // Today's production
      req.prisma!.roll.aggregate({
        where: {
          producedAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          }
        },
        _count: { id: true },
        _sum: { greyWeight: true },
      }),
      // Total weight
      req.prisma!.roll.aggregate({
        _sum: { greyWeight: true },
      }),
    ]);

    const statusSummary = byStatus.reduce((acc, s) => {
      acc[s.status] = {
        count: s._count.id,
        weight: Number(s._sum.greyWeight) || 0,
      };
      return acc;
    }, {} as Record<string, { count: number; weight: number }>);

    res.json({
      byStatus: statusSummary,
      today: {
        rollsProduced: todayProduction._count.id || 0,
        weightProduced: Number(todayProduction._sum.greyWeight) || 0,
      },
      totalWeight: Number(totalWeight._sum.greyWeight) || 0,
      greyStockCount: statusSummary['GREY_STOCK']?.count || 0,
      finishedStockCount: statusSummary['FINISHED_STOCK']?.count || 0,
      soldCount: statusSummary['SOLD']?.count || 0,
    });
  } catch (error) {
    next(error);
  }
});
