import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { requirePermission } from '../middleware/rbac';
import { validateBody, validateParams } from '../middleware/validate';
import { AppError } from '../middleware/error-handler';

export const yarnOutwardRouter: Router = Router();

// Validation schemas
const createOutwardSchema = z.object({
  yarnTypeId: z.number().int().positive('Yarn type is required'),
  boxId: z.number().int().positive().optional(),
  quantityIssued: z.number().positive('Quantity must be positive'),
  machineId: z.number().int().positive('Machine is required'),
  issuedAt: z.string().min(1, 'Issue date is required'),
  collectedBy: z.string().min(1, 'Collector name is required').max(255),
  shiftId: z.number().int().positive().optional(),
  purpose: z.enum(['PRODUCTION', 'SAMPLE', 'TESTING', 'OTHER']).optional(),
  notes: z.string().optional(),
});

const completeOutwardSchema = z.object({
  quantityUsed: z.number().min(0, 'Quantity used must be non-negative'),
  quantityReturned: z.number().min(0, 'Quantity returned must be non-negative'),
  notes: z.string().optional(),
});

const idParamSchema = z.object({
  id: z.string().regex(/^\d+$/, 'Invalid ID format').transform(Number),
});

// GET /outwards - List outward records
yarnOutwardRouter.get('/', requirePermission('yarn:read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { yarnTypeId, machineId, status, page = '1', limit = '50' } = req.query;

    const where: any = {};
    if (yarnTypeId) where.yarnTypeId = Number(yarnTypeId);
    if (machineId) where.machineId = Number(machineId);
    if (status) where.status = status;

    const skip = (Number(page) - 1) * Number(limit);

    const [outwards, total] = await Promise.all([
      req.prisma!.yarnOutward.findMany({
        where,
        include: {
          yarnType: { select: { id: true, code: true, name: true, brandName: true, color: true } },
          machine: { select: { id: true, machineNumber: true, name: true } },
          box: { select: { id: true, boxNumber: true } },
          shift: { select: { id: true, name: true, code: true } },
        },
        orderBy: { issuedAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      req.prisma!.yarnOutward.count({ where }),
    ]);

    res.json({
      data: outwards,
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

// GET /outwards/:id - Get single outward
yarnOutwardRouter.get('/:id', requirePermission('yarn:read'), validateParams(idParamSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params as unknown as { id: number };

    const outward = await req.prisma!.yarnOutward.findUnique({
      where: { id },
      include: {
        yarnType: true,
        machine: true,
        box: true,
        shift: true,
      },
    });

    if (!outward) {
      throw AppError.notFound('Outward record');
    }

    // Also fetch related ledger entry
    const ledgerEntry = await req.prisma!.yarnLedger.findFirst({
      where: {
        referenceType: 'yarn_outward',
        referenceId: id,
      },
    });

    res.json({ data: { ...outward, ledgerEntry } });
  } catch (error) {
    next(error);
  }
});

// GET /outwards/by-machine/:machineId - Get outwards for a machine
yarnOutwardRouter.get('/by-machine/:machineId', requirePermission('yarn:read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const machineId = Number(req.params.machineId);

    const outwards = await req.prisma!.yarnOutward.findMany({
      where: {
        machineId,
        status: { in: ['ISSUED', 'IN_USE'] },
      },
      include: {
        yarnType: { select: { id: true, code: true, name: true, brandName: true, color: true } },
        box: { select: { id: true, boxNumber: true } },
      },
      orderBy: { issuedAt: 'desc' },
    });

    res.json({ data: outwards });
  } catch (error) {
    next(error);
  }
});

// POST /outwards - Issue yarn to machine
yarnOutwardRouter.post('/', requirePermission('yarn:write'), validateBody(createOutwardSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.userId;

    // Validate yarn type exists
    const yarnType = await req.prisma!.yarnType.findUnique({ where: { id: req.body.yarnTypeId } });
    if (!yarnType) {
      throw AppError.notFound('Yarn type');
    }

    // Validate machine exists
    const machine = await req.prisma!.machine.findUnique({ where: { id: req.body.machineId } });
    if (!machine) {
      throw AppError.notFound('Machine');
    }

    // Validate box if provided
    if (req.body.boxId) {
      const box = await req.prisma!.yarnBox.findUnique({ where: { id: req.body.boxId } });
      if (!box) {
        throw AppError.notFound('Box');
      }
      if (box.yarnTypeId !== req.body.yarnTypeId) {
        throw AppError.badRequest('Box yarn type does not match');
      }
    }

    // Check available stock from ledger
    const lastLedgerEntry = await req.prisma!.yarnLedger.findFirst({
      where: { yarnTypeId: req.body.yarnTypeId },
      orderBy: [{ entryDate: 'desc' }, { id: 'desc' }],
    });

    const currentBalance = lastLedgerEntry?.runningBalance?.toNumber() || 0;
    if (currentBalance < req.body.quantityIssued) {
      throw AppError.badRequest(`Insufficient stock. Available: ${currentBalance} KG, Requested: ${req.body.quantityIssued} KG`);
    }

    // Generate outward number
    const lastOutward = await req.prisma!.yarnOutward.findFirst({
      where: { outwardNumber: { startsWith: 'OUT-' } },
      orderBy: { outwardNumber: 'desc' },
    });
    let nextNum = 1;
    if (lastOutward?.outwardNumber) {
      const match = lastOutward.outwardNumber.match(/OUT-(\d+)/);
      if (match) nextNum = parseInt(match[1]) + 1;
    }
    const outwardNumber = `OUT-${String(nextNum).padStart(6, '0')}`;

    // Create outward and ledger entry in transaction
    const result = await req.prisma!.$transaction(async (tx) => {
      // 1. Create YarnOutward
      const outward = await tx.yarnOutward.create({
        data: {
          outwardNumber,
          yarnTypeId: req.body.yarnTypeId,
          boxId: req.body.boxId,
          quantityIssued: req.body.quantityIssued,
          machineId: req.body.machineId,
          issuedAt: new Date(req.body.issuedAt),
          issuedBy: userId,
          collectedBy: req.body.collectedBy,
          shiftId: req.body.shiftId,
          purpose: req.body.purpose || 'PRODUCTION',
          notes: req.body.notes,
          status: 'ISSUED',
        },
      });

      // 2. Create YarnLedger OUTWARD entry
      const newBalance = currentBalance - req.body.quantityIssued;
      const ledgerEntry = await tx.yarnLedger.create({
        data: {
          yarnTypeId: req.body.yarnTypeId,
          entryDate: new Date(req.body.issuedAt),
          entryType: 'OUTWARD',
          quantityIn: 0,
          quantityOut: req.body.quantityIssued,
          runningBalance: newBalance,
          referenceType: 'yarn_outward',
          referenceId: outward.id,
          referenceNumber: outwardNumber,
          description: `Issued to Machine ${machine.machineNumber}`,
          notes: req.body.notes,
          createdBy: userId,
        },
      });

      return { outward, ledgerEntry };
    });

    // Fetch complete outward with relations
    const completeOutward = await req.prisma!.yarnOutward.findUnique({
      where: { id: result.outward.id },
      include: {
        yarnType: { select: { id: true, code: true, name: true, brandName: true, color: true } },
        machine: { select: { id: true, machineNumber: true, name: true } },
        box: { select: { id: true, boxNumber: true } },
        shift: { select: { id: true, name: true, code: true } },
      },
    });

    res.status(201).json({
      message: 'Yarn issued to machine',
      data: {
        outward: completeOutward,
        ledgerEntry: result.ledgerEntry,
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /outwards/:id/complete - Mark outward as completed
yarnOutwardRouter.post('/:id/complete', requirePermission('yarn:write'), validateParams(idParamSchema), validateBody(completeOutwardSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params as unknown as { id: number };
    const { quantityUsed, quantityReturned, notes } = req.body;
    const userId = (req as any).user?.userId;

    const outward = await req.prisma!.yarnOutward.findUnique({
      where: { id },
      include: { machine: true },
    });

    if (!outward) {
      throw AppError.notFound('Outward record');
    }

    if (outward.status === 'COMPLETED' || outward.status === 'RETURNED') {
      throw AppError.badRequest('Outward already completed');
    }

    // Validate quantities
    const totalAccounted = quantityUsed + quantityReturned;
    const issuedQty = Number(outward.quantityIssued);
    if (totalAccounted > issuedQty) {
      throw AppError.badRequest(`Total (used + returned) cannot exceed issued quantity (${issuedQty} KG)`);
    }

    await req.prisma!.$transaction(async (tx) => {
      // 1. Update outward record
      await tx.yarnOutward.update({
        where: { id },
        data: {
          quantityUsed,
          quantityReturned,
          status: quantityReturned > 0 ? 'RETURNED' : 'COMPLETED',
          notes: notes || outward.notes,
        },
      });

      // 2. If there's a return, create a RETURN ledger entry to add back to stock
      if (quantityReturned > 0) {
        // Get current balance
        const lastLedgerEntry = await tx.yarnLedger.findFirst({
          where: { yarnTypeId: outward.yarnTypeId },
          orderBy: [{ entryDate: 'desc' }, { id: 'desc' }],
        });

        const currentBalance = lastLedgerEntry?.runningBalance?.toNumber() || 0;
        const newBalance = currentBalance + quantityReturned;

        await tx.yarnLedger.create({
          data: {
            yarnTypeId: outward.yarnTypeId,
            entryDate: new Date(),
            entryType: 'RETURN',
            quantityIn: quantityReturned,
            quantityOut: 0,
            runningBalance: newBalance,
            referenceType: 'yarn_outward',
            referenceId: id,
            referenceNumber: outward.outwardNumber,
            description: `Returned from Machine ${outward.machine?.machineNumber}`,
            notes: notes,
            createdBy: userId,
          },
        });
      }
    });

    // Fetch updated outward
    const updatedOutward = await req.prisma!.yarnOutward.findUnique({
      where: { id },
      include: {
        yarnType: { select: { id: true, code: true, name: true, brandName: true, color: true } },
        machine: { select: { id: true, machineNumber: true, name: true } },
      },
    });

    res.json({
      message: 'Outward completed',
      data: updatedOutward,
    });
  } catch (error) {
    next(error);
  }
});

// POST /outwards/:id/start - Mark as in use (ISSUED -> IN_USE)
yarnOutwardRouter.post('/:id/start', requirePermission('yarn:write'), validateParams(idParamSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params as unknown as { id: number };

    const outward = await req.prisma!.yarnOutward.findUnique({ where: { id } });
    if (!outward) {
      throw AppError.notFound('Outward record');
    }

    if (outward.status !== 'ISSUED') {
      throw AppError.badRequest('Can only start issued outward');
    }

    const updated = await req.prisma!.yarnOutward.update({
      where: { id },
      data: { status: 'IN_USE' },
      include: {
        yarnType: { select: { id: true, code: true, name: true } },
        machine: { select: { id: true, machineNumber: true, name: true } },
      },
    });

    res.json({ message: 'Outward marked as in use', data: updated });
  } catch (error) {
    next(error);
  }
});
