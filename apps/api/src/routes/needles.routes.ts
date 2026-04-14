import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenant';
import { requirePermission } from '../middleware/rbac';
import { validateBody, validateParams } from '../middleware/validate';
import { AppError } from '../middleware/error-handler';

export const needlesRouter: Router = Router();

// Apply authentication and tenant middleware
needlesRouter.use(authMiddleware);
needlesRouter.use(tenantMiddleware);

// Common validation schemas
const idParamSchema = z.object({
  id: z.string().regex(/^\d+$/, 'Invalid ID format').transform(Number),
});

const machineIdParamSchema = z.object({
  machineId: z.string().regex(/^\d+$/, 'Invalid machine ID format').transform(Number),
});

// ============================================
// NEEDLE TYPES CRUD (Master Data)
// ============================================

const createNeedleTypeSchema = z.object({
  code: z.string().max(20).optional(), // Auto-generated if not provided
  name: z.string().min(1, 'Name is required').max(100),
  needleKind: z.enum(['LATCH', 'COMPOUND', 'BEARDED']),
  gauge: z.number().int().positive('Gauge must be positive'),
  length: z.number().positive().optional(),
  material: z.string().min(1, 'Material is required').max(50),
  brand: z.string().max(100).optional(),
  supplierCode: z.string().max(50).optional(),
  costPerNeedle: z.number().positive().optional(),
  currency: z.string().length(3).optional(),
  minStockLevel: z.number().int().min(0).optional(),
  reorderPoint: z.number().int().min(0).optional(),
  compatibleMachines: z.array(z.string()).optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
});

const updateNeedleTypeSchema = createNeedleTypeSchema.partial();

// GET /needles/types/lookup - Lightweight lookup for dropdowns
needlesRouter.get('/types/lookup', requirePermission('production:read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const needleTypes = await req.prisma!.needleType.findMany({
      where: { isActive: true },
      select: {
        id: true,
        code: true,
        name: true,
        needleKind: true,
        gauge: true,
        material: true,
      },
      orderBy: { name: 'asc' },
    });
    res.json({ data: needleTypes });
  } catch (error) {
    next(error);
  }
});

// GET /needles/types - List all needle types
needlesRouter.get('/types', requirePermission('production:read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { gauge, needleKind, isActive } = req.query;

    const where: any = {};
    if (gauge) where.gauge = Number(gauge);
    if (needleKind) where.needleKind = needleKind;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const needleTypes = await req.prisma!.needleType.findMany({
      where,
      include: {
        _count: {
          select: {
            stockBatches: true,
            machineAllocations: { where: { status: 'INSTALLED' } },
            damageRecords: { where: { resolutionStatus: 'PENDING' } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate current stock for each type
    const typesWithStock = await Promise.all(
      needleTypes.map(async (type) => {
        const stockAgg = await req.prisma!.needleStockBatch.aggregate({
          where: { needleTypeId: type.id, isActive: true },
          _sum: { currentQuantity: true },
        });
        return {
          ...type,
          currentStock: stockAgg._sum.currentQuantity || 0,
        };
      })
    );

    res.json({ data: typesWithStock });
  } catch (error) {
    next(error);
  }
});

// GET /needles/types/:id - Get single needle type
needlesRouter.get('/types/:id', requirePermission('production:read'), validateParams(idParamSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params as unknown as { id: number };
    const needleType = await req.prisma!.needleType.findUnique({
      where: { id },
      include: {
        stockBatches: {
          where: { currentQuantity: { gt: 0 } },
          orderBy: { receivedDate: 'desc' },
          take: 10,
        },
        machineAllocations: {
          where: { status: 'INSTALLED' },
          include: {
            machine: { select: { id: true, machineNumber: true, name: true } },
          },
        },
        _count: {
          select: {
            damageRecords: true,
          },
        },
      },
    });
    if (!needleType) {
      throw AppError.notFound('Needle type');
    }

    // Calculate total stock
    const stockAgg = await req.prisma!.needleStockBatch.aggregate({
      where: { needleTypeId: id, isActive: true },
      _sum: {
        currentQuantity: true,
        allocatedQuantity: true,
        damagedQuantity: true,
        receivedQuantity: true,
      },
    });

    res.json({
      data: {
        ...needleType,
        stockSummary: {
          totalReceived: stockAgg._sum.receivedQuantity || 0,
          currentStock: stockAgg._sum.currentQuantity || 0,
          allocated: stockAgg._sum.allocatedQuantity || 0,
          damaged: stockAgg._sum.damagedQuantity || 0,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /needles/types - Create needle type
needlesRouter.post('/types', requirePermission('production:write'), validateBody(createNeedleTypeSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Auto-generate code if not provided
    let typeCode = req.body.code;
    if (!typeCode) {
      const lastType = await req.prisma!.needleType.findFirst({
        where: { code: { startsWith: 'NL-' } },
        orderBy: { code: 'desc' },
      });

      let nextNumber = 1;
      if (lastType && lastType.code) {
        const match = lastType.code.match(/NL-(\d+)/);
        if (match) {
          nextNumber = parseInt(match[1], 10) + 1;
        }
      }
      typeCode = `NL-${String(nextNumber).padStart(4, '0')}`;
    }

    // Check code uniqueness
    const existing = await req.prisma!.needleType.findUnique({
      where: { code: typeCode },
    });
    if (existing) {
      throw AppError.conflict('Needle type code already exists');
    }

    const needleType = await req.prisma!.needleType.create({
      data: {
        code: typeCode,
        name: req.body.name,
        needleKind: req.body.needleKind,
        gauge: req.body.gauge,
        length: req.body.length,
        material: req.body.material,
        brand: req.body.brand,
        supplierCode: req.body.supplierCode,
        costPerNeedle: req.body.costPerNeedle,
        currency: req.body.currency || 'PKR',
        minStockLevel: req.body.minStockLevel ?? 100,
        reorderPoint: req.body.reorderPoint ?? 200,
        compatibleMachines: req.body.compatibleMachines || ['CIRCULAR_KNITTING'],
        notes: req.body.notes,
        isActive: req.body.isActive ?? true,
      },
    });

    res.status(201).json({ message: 'Needle type created', data: needleType });
  } catch (error) {
    next(error);
  }
});

// PUT /needles/types/:id - Update needle type
needlesRouter.put('/types/:id', requirePermission('production:write'), validateParams(idParamSchema), validateBody(updateNeedleTypeSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params as unknown as { id: number };

    const existing = await req.prisma!.needleType.findUnique({ where: { id } });
    if (!existing) {
      throw AppError.notFound('Needle type');
    }

    // Check code uniqueness if changing
    if (req.body.code && req.body.code !== existing.code) {
      const codeExists = await req.prisma!.needleType.findUnique({
        where: { code: req.body.code },
      });
      if (codeExists) {
        throw AppError.conflict('Needle type code already exists');
      }
    }

    const needleType = await req.prisma!.needleType.update({
      where: { id },
      data: req.body,
    });

    res.json({ message: 'Needle type updated', data: needleType });
  } catch (error) {
    next(error);
  }
});

// DELETE /needles/types/:id - Soft delete (set inactive)
needlesRouter.delete('/types/:id', requirePermission('production:write'), validateParams(idParamSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params as unknown as { id: number };

    const existing = await req.prisma!.needleType.findUnique({ where: { id } });
    if (!existing) {
      throw AppError.notFound('Needle type');
    }

    await req.prisma!.needleType.update({
      where: { id },
      data: { isActive: false },
    });

    res.json({ message: 'Needle type deactivated' });
  } catch (error) {
    next(error);
  }
});

// ============================================
// NEEDLE STOCK BATCHES
// ============================================

const createStockBatchSchema = z.object({
  needleTypeId: z.number().int().positive('Needle type is required'),
  receivedQuantity: z.number().int().positive('Quantity must be positive'),
  receivedDate: z.string().optional(),
  invoiceNumber: z.string().max(50).optional(),
  invoiceDate: z.string().optional(),
  unitCost: z.number().positive().optional(),
  supplierId: z.number().int().positive().optional(),
  supplierName: z.string().max(200).optional(),
  collectedBy: z.number().int().positive().optional(),
  collectorName: z.string().max(100).optional(),
  collectionDate: z.string().optional(),
  lotNumber: z.string().max(50).optional(),
  notes: z.string().optional(),
});

const adjustStockSchema = z.object({
  quantity: z.number().int().refine(val => val !== 0, { message: 'Quantity cannot be zero' }),
  reason: z.string().min(1, 'Reason is required').max(200),
  notes: z.string().optional(),
});

// GET /needles/stock/summary - Stock summary by needle type
needlesRouter.get('/stock/summary', requirePermission('production:read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const needleTypes = await req.prisma!.needleType.findMany({
      where: { isActive: true },
      select: {
        id: true,
        code: true,
        name: true,
        gauge: true,
        needleKind: true,
        minStockLevel: true,
        reorderPoint: true,
      },
    });

    const summary = await Promise.all(
      needleTypes.map(async (type) => {
        const stockAgg = await req.prisma!.needleStockBatch.aggregate({
          where: { needleTypeId: type.id, isActive: true },
          _sum: {
            currentQuantity: true,
            allocatedQuantity: true,
            damagedQuantity: true,
            receivedQuantity: true,
          },
        });

        const currentStock = stockAgg._sum.currentQuantity || 0;

        return {
          ...type,
          totalReceived: stockAgg._sum.receivedQuantity || 0,
          currentStock,
          allocated: stockAgg._sum.allocatedQuantity || 0,
          damaged: stockAgg._sum.damagedQuantity || 0,
          status: currentStock <= type.minStockLevel
            ? 'LOW'
            : currentStock <= type.reorderPoint
              ? 'REORDER'
              : 'OK',
        };
      })
    );

    res.json({ data: summary });
  } catch (error) {
    next(error);
  }
});

// GET /needles/stock - List all stock batches
needlesRouter.get('/stock', requirePermission('production:read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { needleTypeId, hasStock } = req.query;

    const where: any = { isActive: true };
    if (needleTypeId) where.needleTypeId = Number(needleTypeId);
    if (hasStock === 'true') where.currentQuantity = { gt: 0 };

    const batches = await req.prisma!.needleStockBatch.findMany({
      where,
      include: {
        needleType: {
          select: { id: true, code: true, name: true, gauge: true },
        },
      },
      orderBy: { receivedDate: 'desc' },
    });

    res.json({ data: batches });
  } catch (error) {
    next(error);
  }
});

// GET /needles/stock/:id - Get batch details
needlesRouter.get('/stock/:id', requirePermission('production:read'), validateParams(idParamSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params as unknown as { id: number };
    const batch = await req.prisma!.needleStockBatch.findUnique({
      where: { id },
      include: {
        needleType: true,
        movements: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
        allocations: {
          include: {
            machine: { select: { id: true, machineNumber: true, name: true } },
          },
        },
      },
    });
    if (!batch) {
      throw AppError.notFound('Stock batch');
    }
    res.json({ data: batch });
  } catch (error) {
    next(error);
  }
});

// POST /needles/stock - Receive new stock batch
needlesRouter.post('/stock', requirePermission('production:write'), validateBody(createStockBatchSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Generate batch number
    const year = new Date().getFullYear();
    const lastBatch = await req.prisma!.needleStockBatch.findFirst({
      where: { batchNumber: { startsWith: `NB-${year}-` } },
      orderBy: { batchNumber: 'desc' },
    });

    let nextNum = 1;
    if (lastBatch?.batchNumber) {
      const match = lastBatch.batchNumber.match(/NB-\d{4}-(\d+)/);
      if (match) {
        nextNum = parseInt(match[1]) + 1;
      }
    }
    const batchNumber = `NB-${year}-${String(nextNum).padStart(4, '0')}`;

    const user = (req as any).user;
    const totalCost = req.body.unitCost
      ? req.body.unitCost * req.body.receivedQuantity
      : null;

    const batch = await req.prisma!.needleStockBatch.create({
      data: {
        batchNumber,
        needleTypeId: req.body.needleTypeId,
        receivedQuantity: req.body.receivedQuantity,
        currentQuantity: req.body.receivedQuantity,
        allocatedQuantity: 0,
        damagedQuantity: 0,
        receivedDate: req.body.receivedDate ? new Date(req.body.receivedDate) : new Date(),
        invoiceNumber: req.body.invoiceNumber,
        invoiceDate: req.body.invoiceDate ? new Date(req.body.invoiceDate) : null,
        unitCost: req.body.unitCost,
        totalCost,
        supplierId: req.body.supplierId,
        supplierName: req.body.supplierName,
        collectedBy: req.body.collectedBy,
        collectorName: req.body.collectorName,
        collectionDate: req.body.collectionDate ? new Date(req.body.collectionDate) : null,
        lotNumber: req.body.lotNumber,
        notes: req.body.notes,
        // Create initial movement record
        movements: {
          create: {
            movementType: 'IN',
            quantity: req.body.receivedQuantity,
            referenceType: 'PURCHASE',
            performedBy: user?.userId || 0,
            performerName: user?.fullName || 'System',
            notes: `Initial stock receipt: ${req.body.receivedQuantity} needles`,
          },
        },
      },
      include: {
        needleType: true,
      },
    });

    res.status(201).json({ message: 'Stock received', data: batch });
  } catch (error) {
    next(error);
  }
});

// POST /needles/stock/:id/adjust - Adjust stock quantity
needlesRouter.post('/stock/:id/adjust', requirePermission('production:write'), validateParams(idParamSchema), validateBody(adjustStockSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params as unknown as { id: number };
    const { quantity, reason, notes } = req.body;

    const batch = await req.prisma!.needleStockBatch.findUnique({ where: { id } });
    if (!batch) {
      throw AppError.notFound('Stock batch');
    }

    const newQuantity = batch.currentQuantity + quantity;
    if (newQuantity < 0) {
      throw AppError.badRequest('Adjustment would result in negative stock');
    }

    const user = (req as any).user;

    const updatedBatch = await req.prisma!.needleStockBatch.update({
      where: { id },
      data: {
        currentQuantity: newQuantity,
        movements: {
          create: {
            movementType: 'ADJUST',
            quantity,
            referenceType: 'ADJUSTMENT',
            performedBy: user?.userId || 0,
            performerName: user?.fullName || 'System',
            notes: `${reason}${notes ? `: ${notes}` : ''}`,
          },
        },
      },
      include: {
        needleType: true,
      },
    });

    res.json({ message: 'Stock adjusted', data: updatedBatch });
  } catch (error) {
    next(error);
  }
});

// GET /needles/stock/:id/movements - Get movement history
needlesRouter.get('/stock/:id/movements', requirePermission('production:read'), validateParams(idParamSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params as unknown as { id: number };

    const batch = await req.prisma!.needleStockBatch.findUnique({ where: { id } });
    if (!batch) {
      throw AppError.notFound('Stock batch');
    }

    const movements = await req.prisma!.needleStockMovement.findMany({
      where: { batchId: id },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ data: movements });
  } catch (error) {
    next(error);
  }
});

// ============================================
// MACHINE ALLOCATIONS (Install/Remove Needles)
// ============================================

const installNeedlesSchema = z.object({
  needleTypeId: z.number().int().positive('Needle type is required'),
  batchId: z.number().int().positive().optional(),
  installedQuantity: z.number().int().positive('Quantity must be positive'),
  position: z.string().max(50).optional(), // Cylinder, Dial
  notes: z.string().optional(),
});

const removeNeedlesSchema = z.object({
  removalReason: z.enum(['REPLACEMENT', 'MAINTENANCE', 'DAMAGE']),
  notes: z.string().optional(),
});

// GET /needles/allocations - List all allocations
needlesRouter.get('/allocations', requirePermission('production:read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { machineId, status, needleTypeId } = req.query;

    const where: any = {};
    if (machineId) where.machineId = Number(machineId);
    if (status) where.status = status;
    if (needleTypeId) where.needleTypeId = Number(needleTypeId);

    const allocations = await req.prisma!.needleMachineAllocation.findMany({
      where,
      include: {
        machine: { select: { id: true, machineNumber: true, name: true } },
        needleType: { select: { id: true, code: true, name: true, gauge: true } },
        batch: { select: { id: true, batchNumber: true } },
      },
      orderBy: { installedAt: 'desc' },
    });

    res.json({ data: allocations });
  } catch (error) {
    next(error);
  }
});

// GET /needles/machines/:machineId/needles - Get needles for a specific machine
needlesRouter.get('/machines/:machineId/needles', requirePermission('production:read'), validateParams(machineIdParamSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { machineId } = req.params as unknown as { machineId: number };

    const machine = await req.prisma!.machine.findUnique({
      where: { id: machineId },
      select: {
        id: true,
        machineNumber: true,
        name: true,
        machineType: true,
        needleGauge: true,
        totalNeedleSlots: true,
        cylinderNeedles: true,
        dialNeedles: true,
      },
    });

    if (!machine) {
      throw AppError.notFound('Machine');
    }

    const allocations = await req.prisma!.needleMachineAllocation.findMany({
      where: { machineId, status: 'INSTALLED' },
      include: {
        needleType: { select: { id: true, code: true, name: true, gauge: true } },
        batch: { select: { id: true, batchNumber: true } },
      },
      orderBy: { installedAt: 'desc' },
    });

    // Get recent damage history for this machine
    const recentDamages = await req.prisma!.needleDamage.findMany({
      where: { machineId },
      orderBy: { damageDate: 'desc' },
      take: 10,
      include: {
        needleType: { select: { id: true, code: true, name: true } },
      },
    });

    // Calculate total installed
    const totalInstalled = allocations.reduce((sum, a) => sum + a.installedQuantity, 0);

    res.json({
      data: {
        machine,
        allocations,
        recentDamages,
        summary: {
          totalInstalled,
          totalSlots: machine.totalNeedleSlots || 0,
          utilizationPercent: machine.totalNeedleSlots
            ? Math.round((totalInstalled / machine.totalNeedleSlots) * 100)
            : null,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /needles/machines/:machineId/install - Install needles on machine
needlesRouter.post('/machines/:machineId/install', requirePermission('production:write'), validateParams(machineIdParamSchema), validateBody(installNeedlesSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { machineId } = req.params as unknown as { machineId: number };
    const { needleTypeId, batchId, installedQuantity, position, notes } = req.body;

    // Verify machine exists
    const machine = await req.prisma!.machine.findUnique({ where: { id: machineId } });
    if (!machine) {
      throw AppError.notFound('Machine');
    }

    // Verify needle type exists
    const needleType = await req.prisma!.needleType.findUnique({ where: { id: needleTypeId } });
    if (!needleType) {
      throw AppError.notFound('Needle type');
    }

    const user = (req as any).user;

    // If batch specified, verify it has enough stock
    let batch = null;
    if (batchId) {
      batch = await req.prisma!.needleStockBatch.findUnique({ where: { id: batchId } });
      if (!batch) {
        throw AppError.notFound('Stock batch');
      }
      if (batch.currentQuantity < installedQuantity) {
        throw AppError.badRequest(`Insufficient stock in batch. Available: ${batch.currentQuantity}`);
      }
    }

    // Create allocation and update batch in transaction
    const result = await req.prisma!.$transaction(async (tx) => {
      // Create allocation
      const allocation = await tx.needleMachineAllocation.create({
        data: {
          machineId,
          needleTypeId,
          batchId,
          installedQuantity,
          position,
          installedBy: user?.userId || 0,
          installerName: user?.fullName || 'System',
          status: 'INSTALLED',
          notes,
        },
        include: {
          machine: { select: { id: true, machineNumber: true, name: true } },
          needleType: { select: { id: true, code: true, name: true, gauge: true } },
          batch: { select: { id: true, batchNumber: true } },
        },
      });

      // Update batch if specified
      if (batch) {
        await tx.needleStockBatch.update({
          where: { id: batchId },
          data: {
            currentQuantity: { decrement: installedQuantity },
            allocatedQuantity: { increment: installedQuantity },
          },
        });

        // Create movement record
        await tx.needleStockMovement.create({
          data: {
            batchId: batchId!,
            movementType: 'OUT',
            quantity: -installedQuantity,
            referenceType: 'ALLOCATION',
            referenceId: allocation.id,
            performedBy: user?.userId || 0,
            performerName: user?.fullName || 'System',
            notes: `Installed on machine ${machine.machineNumber}${position ? ` (${position})` : ''}`,
          },
        });
      }

      return allocation;
    });

    res.status(201).json({ message: 'Needles installed', data: result });
  } catch (error) {
    next(error);
  }
});

// POST /needles/machines/:machineId/remove - Remove needles from machine
needlesRouter.post('/machines/:machineId/remove', requirePermission('production:write'), validateParams(machineIdParamSchema), validateBody(z.object({
  allocationId: z.number().int().positive('Allocation ID is required'),
  removalReason: z.enum(['REPLACEMENT', 'MAINTENANCE', 'DAMAGE']),
  returnToStock: z.boolean().optional(),
  returnQuantity: z.number().int().positive().optional(),
  notes: z.string().optional(),
})), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { machineId } = req.params as unknown as { machineId: number };
    const { allocationId, removalReason, returnToStock, returnQuantity, notes } = req.body;

    const allocation = await req.prisma!.needleMachineAllocation.findUnique({
      where: { id: allocationId },
      include: { machine: true, batch: true },
    });

    if (!allocation) {
      throw AppError.notFound('Allocation');
    }
    if (allocation.machineId !== machineId) {
      throw AppError.badRequest('Allocation does not belong to this machine');
    }
    if (allocation.status !== 'INSTALLED') {
      throw AppError.badRequest('Allocation is not currently installed');
    }

    const user = (req as any).user;
    const quantityToReturn = returnToStock ? (returnQuantity || allocation.installedQuantity) : 0;

    const result = await req.prisma!.$transaction(async (tx) => {
      // Update allocation
      const updated = await tx.needleMachineAllocation.update({
        where: { id: allocationId },
        data: {
          status: 'REMOVED',
          removedAt: new Date(),
          removedBy: user?.userId,
          removerName: user?.fullName,
          removalReason,
          notes: notes ? `${allocation.notes || ''}\nRemoval: ${notes}`.trim() : allocation.notes,
        },
        include: {
          machine: { select: { id: true, machineNumber: true, name: true } },
          needleType: { select: { id: true, code: true, name: true, gauge: true } },
        },
      });

      // Return to stock if requested and batch exists
      if (returnToStock && quantityToReturn > 0 && allocation.batchId) {
        await tx.needleStockBatch.update({
          where: { id: allocation.batchId },
          data: {
            currentQuantity: { increment: quantityToReturn },
            allocatedQuantity: { decrement: quantityToReturn },
          },
        });

        await tx.needleStockMovement.create({
          data: {
            batchId: allocation.batchId,
            movementType: 'RETURN',
            quantity: quantityToReturn,
            referenceType: 'ALLOCATION',
            referenceId: allocationId,
            performedBy: user?.userId || 0,
            performerName: user?.fullName || 'System',
            notes: `Returned from machine ${allocation.machine.machineNumber}: ${removalReason}`,
          },
        });
      }

      return updated;
    });

    res.json({ message: 'Needles removed', data: result });
  } catch (error) {
    next(error);
  }
});

// GET /needles/allocations/:id/history - Allocation history
needlesRouter.get('/allocations/:id/history', requirePermission('production:read'), validateParams(idParamSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params as unknown as { id: number };

    const allocation = await req.prisma!.needleMachineAllocation.findUnique({
      where: { id },
      include: {
        machine: true,
        needleType: true,
        batch: {
          include: {
            movements: {
              where: { referenceId: id, referenceType: 'ALLOCATION' },
              orderBy: { createdAt: 'desc' },
            },
          },
        },
        damages: {
          orderBy: { damageDate: 'desc' },
        },
      },
    });

    if (!allocation) {
      throw AppError.notFound('Allocation');
    }

    res.json({ data: allocation });
  } catch (error) {
    next(error);
  }
});

// ============================================
// DAMAGE TRACKING
// ============================================

const reportDamageSchema = z.object({
  needleTypeId: z.number().int().positive('Needle type is required'),
  batchId: z.number().int().positive().optional(),
  allocationId: z.number().int().positive().optional(),
  machineId: z.number().int().positive().optional(),
  damageDate: z.string().optional(),
  damageType: z.enum(['BROKEN', 'BENT', 'WORN', 'HOOK_DAMAGE', 'LATCH_DAMAGE']),
  damagedQuantity: z.number().int().positive('Quantity must be positive'),
  cause: z.enum(['YARN_KNOT', 'METAL_FATIGUE', 'OPERATOR_ERROR', 'UNKNOWN']).optional(),
  description: z.string().optional(),
  notes: z.string().optional(),
});

const resolveDamageSchema = z.object({
  resolutionStatus: z.enum(['REPLACED', 'WRITTEN_OFF']),
  replacedQuantity: z.number().int().min(0).optional(),
  replacementBatchId: z.number().int().positive().optional(),
  notes: z.string().optional(),
});

// GET /needles/damages - List damage records
needlesRouter.get('/damages', requirePermission('production:read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { needleTypeId, machineId, damageType, resolutionStatus } = req.query;

    const where: any = {};
    if (needleTypeId) where.needleTypeId = Number(needleTypeId);
    if (machineId) where.machineId = Number(machineId);
    if (damageType) where.damageType = damageType;
    if (resolutionStatus) where.resolutionStatus = resolutionStatus;

    const damages = await req.prisma!.needleDamage.findMany({
      where,
      include: {
        needleType: { select: { id: true, code: true, name: true, gauge: true } },
        batch: { select: { id: true, batchNumber: true } },
        allocation: {
          select: {
            id: true,
            machine: { select: { id: true, machineNumber: true, name: true } },
          },
        },
      },
      orderBy: { damageDate: 'desc' },
    });

    res.json({ data: damages });
  } catch (error) {
    next(error);
  }
});

// GET /needles/damages/summary - Damage summary
needlesRouter.get('/damages/summary', requirePermission('production:read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate } = req.query;

    const where: any = {};
    if (startDate || endDate) {
      where.damageDate = {};
      if (startDate) where.damageDate.gte = new Date(startDate as string);
      if (endDate) where.damageDate.lte = new Date(endDate as string);
    }

    // Group by damage type
    const byType = await req.prisma!.needleDamage.groupBy({
      by: ['damageType'],
      where,
      _sum: { damagedQuantity: true },
      _count: true,
    });

    // Group by cause
    const byCause = await req.prisma!.needleDamage.groupBy({
      by: ['cause'],
      where,
      _sum: { damagedQuantity: true },
      _count: true,
    });

    // Pending vs resolved
    const byStatus = await req.prisma!.needleDamage.groupBy({
      by: ['resolutionStatus'],
      where,
      _sum: { damagedQuantity: true },
      _count: true,
    });

    // Total damaged
    const total = await req.prisma!.needleDamage.aggregate({
      where,
      _sum: { damagedQuantity: true },
      _count: true,
    });

    res.json({
      data: {
        total: {
          count: total._count,
          quantity: total._sum.damagedQuantity || 0,
        },
        byType,
        byCause,
        byStatus,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /needles/damages/:id - Get damage details
needlesRouter.get('/damages/:id', requirePermission('production:read'), validateParams(idParamSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params as unknown as { id: number };
    const damage = await req.prisma!.needleDamage.findUnique({
      where: { id },
      include: {
        needleType: true,
        batch: true,
        allocation: {
          include: {
            machine: true,
          },
        },
      },
    });
    if (!damage) {
      throw AppError.notFound('Damage record');
    }
    res.json({ data: damage });
  } catch (error) {
    next(error);
  }
});

// POST /needles/damages - Report needle damage
needlesRouter.post('/damages', requirePermission('production:write'), validateBody(reportDamageSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;

    const result = await req.prisma!.$transaction(async (tx) => {
      // Create damage record
      const damage = await tx.needleDamage.create({
        data: {
          needleTypeId: req.body.needleTypeId,
          batchId: req.body.batchId,
          allocationId: req.body.allocationId,
          machineId: req.body.machineId,
          damageDate: req.body.damageDate ? new Date(req.body.damageDate) : new Date(),
          damageType: req.body.damageType,
          damagedQuantity: req.body.damagedQuantity,
          cause: req.body.cause || 'UNKNOWN',
          description: req.body.description,
          reportedBy: user?.userId || 0,
          reporterName: user?.fullName || 'System',
          resolutionStatus: 'PENDING',
          notes: req.body.notes,
        },
        include: {
          needleType: { select: { id: true, code: true, name: true } },
          batch: { select: { id: true, batchNumber: true } },
        },
      });

      // Update batch damaged quantity if batch specified
      if (req.body.batchId) {
        await tx.needleStockBatch.update({
          where: { id: req.body.batchId },
          data: {
            damagedQuantity: { increment: req.body.damagedQuantity },
          },
        });

        // Create movement record
        await tx.needleStockMovement.create({
          data: {
            batchId: req.body.batchId,
            movementType: 'DAMAGE',
            quantity: -req.body.damagedQuantity,
            referenceType: 'DAMAGE',
            referenceId: damage.id,
            performedBy: user?.userId || 0,
            performerName: user?.fullName || 'System',
            notes: `Damage reported: ${req.body.damageType}${req.body.machineId ? ` on machine #${req.body.machineId}` : ''}`,
          },
        });
      }

      return damage;
    });

    res.status(201).json({ message: 'Damage reported', data: result });
  } catch (error) {
    next(error);
  }
});

// PUT /needles/damages/:id - Update damage record
needlesRouter.put('/damages/:id', requirePermission('production:write'), validateParams(idParamSchema), validateBody(reportDamageSchema.partial()), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params as unknown as { id: number };

    const existing = await req.prisma!.needleDamage.findUnique({ where: { id } });
    if (!existing) {
      throw AppError.notFound('Damage record');
    }

    if (existing.resolutionStatus !== 'PENDING') {
      throw AppError.badRequest('Cannot modify resolved damage records');
    }

    const damage = await req.prisma!.needleDamage.update({
      where: { id },
      data: {
        damageType: req.body.damageType,
        damagedQuantity: req.body.damagedQuantity,
        cause: req.body.cause,
        description: req.body.description,
        notes: req.body.notes,
      },
      include: {
        needleType: { select: { id: true, code: true, name: true } },
      },
    });

    res.json({ message: 'Damage record updated', data: damage });
  } catch (error) {
    next(error);
  }
});

// POST /needles/damages/:id/resolve - Resolve damage (replace or write off)
needlesRouter.post('/damages/:id/resolve', requirePermission('production:write'), validateParams(idParamSchema), validateBody(resolveDamageSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params as unknown as { id: number };
    const { resolutionStatus, replacedQuantity, replacementBatchId, notes } = req.body;

    const damage = await req.prisma!.needleDamage.findUnique({ where: { id } });
    if (!damage) {
      throw AppError.notFound('Damage record');
    }

    if (damage.resolutionStatus !== 'PENDING') {
      throw AppError.badRequest('Damage already resolved');
    }

    const user = (req as any).user;

    const result = await req.prisma!.$transaction(async (tx) => {
      // Update damage record
      const updated = await tx.needleDamage.update({
        where: { id },
        data: {
          resolutionStatus,
          replacedQuantity: resolutionStatus === 'REPLACED' ? replacedQuantity : null,
          replacedAt: new Date(),
          replacedBy: user?.userId,
          replacerName: user?.fullName,
          notes: notes ? `${damage.notes || ''}\nResolution: ${notes}`.trim() : damage.notes,
        },
        include: {
          needleType: { select: { id: true, code: true, name: true } },
        },
      });

      // If replaced and batch specified, deduct from replacement batch
      if (resolutionStatus === 'REPLACED' && replacedQuantity && replacementBatchId) {
        const batch = await tx.needleStockBatch.findUnique({ where: { id: replacementBatchId } });
        if (!batch) {
          throw AppError.notFound('Replacement batch');
        }
        if (batch.currentQuantity < replacedQuantity) {
          throw AppError.badRequest('Insufficient stock in replacement batch');
        }

        await tx.needleStockBatch.update({
          where: { id: replacementBatchId },
          data: {
            currentQuantity: { decrement: replacedQuantity },
          },
        });

        await tx.needleStockMovement.create({
          data: {
            batchId: replacementBatchId,
            movementType: 'OUT',
            quantity: -replacedQuantity,
            referenceType: 'DAMAGE',
            referenceId: id,
            performedBy: user?.userId || 0,
            performerName: user?.fullName || 'System',
            notes: `Replacement for damage #${id}`,
          },
        });
      }

      return updated;
    });

    res.json({ message: 'Damage resolved', data: result });
  } catch (error) {
    next(error);
  }
});

// ============================================
// REPORTS
// ============================================

// GET /needles/reports/low-stock - Low stock alerts
needlesRouter.get('/reports/low-stock', requirePermission('production:read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const needleTypes = await req.prisma!.needleType.findMany({
      where: { isActive: true },
    });

    const alerts = await Promise.all(
      needleTypes.map(async (type) => {
        const stockAgg = await req.prisma!.needleStockBatch.aggregate({
          where: { needleTypeId: type.id, isActive: true },
          _sum: { currentQuantity: true },
        });

        const currentStock = stockAgg._sum.currentQuantity || 0;

        if (currentStock <= type.reorderPoint) {
          return {
            needleType: type,
            currentStock,
            minStockLevel: type.minStockLevel,
            reorderPoint: type.reorderPoint,
            severity: currentStock <= type.minStockLevel ? 'CRITICAL' : 'WARNING',
            shortfall: type.reorderPoint - currentStock,
          };
        }
        return null;
      })
    );

    const filtered = alerts.filter(Boolean);
    filtered.sort((a, b) => (a!.severity === 'CRITICAL' ? -1 : 1));

    res.json({ data: filtered });
  } catch (error) {
    next(error);
  }
});

// GET /needles/reports/machine-status - Current needle status per machine
needlesRouter.get('/reports/machine-status', requirePermission('production:read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const machines = await req.prisma!.machine.findMany({
      where: {
        machineType: 'CIRCULAR_KNITTING',
        status: { not: 'DECOMMISSIONED' },
      },
      select: {
        id: true,
        machineNumber: true,
        name: true,
        status: true,
        needleGauge: true,
        totalNeedleSlots: true,
        needleAllocations: {
          where: { status: 'INSTALLED' },
          include: {
            needleType: { select: { id: true, code: true, name: true, gauge: true } },
          },
        },
      },
    });

    const machineStatus = machines.map((m) => {
      const totalInstalled = m.needleAllocations.reduce((sum, a) => sum + a.installedQuantity, 0);
      return {
        machine: {
          id: m.id,
          machineNumber: m.machineNumber,
          name: m.name,
          status: m.status,
          needleGauge: m.needleGauge,
          totalNeedleSlots: m.totalNeedleSlots,
        },
        allocations: m.needleAllocations,
        totalInstalled,
        utilizationPercent: m.totalNeedleSlots
          ? Math.round((totalInstalled / m.totalNeedleSlots) * 100)
          : null,
        needsAttention: m.totalNeedleSlots
          ? totalInstalled < m.totalNeedleSlots * 0.9
          : false,
      };
    });

    res.json({ data: machineStatus });
  } catch (error) {
    next(error);
  }
});

// GET /needles/dashboard - Dashboard summary
needlesRouter.get('/dashboard', requirePermission('production:read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Total needle types
    const totalTypes = await req.prisma!.needleType.count({ where: { isActive: true } });

    // Total stock
    const stockAgg = await req.prisma!.needleStockBatch.aggregate({
      where: { isActive: true },
      _sum: { currentQuantity: true, allocatedQuantity: true, damagedQuantity: true },
    });

    // Low stock count
    const needleTypes = await req.prisma!.needleType.findMany({ where: { isActive: true } });
    let lowStockCount = 0;
    for (const type of needleTypes) {
      const typeStock = await req.prisma!.needleStockBatch.aggregate({
        where: { needleTypeId: type.id, isActive: true },
        _sum: { currentQuantity: true },
      });
      if ((typeStock._sum.currentQuantity || 0) <= type.reorderPoint) {
        lowStockCount++;
      }
    }

    // Pending damage reports
    const pendingDamages = await req.prisma!.needleDamage.count({
      where: { resolutionStatus: 'PENDING' },
    });

    // Recent activity
    const recentMovements = await req.prisma!.needleStockMovement.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        batch: {
          select: {
            batchNumber: true,
            needleType: { select: { code: true, name: true } },
          },
        },
      },
    });

    const recentDamages = await req.prisma!.needleDamage.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        needleType: { select: { code: true, name: true } },
      },
    });

    res.json({
      data: {
        stats: {
          totalTypes,
          totalStock: stockAgg._sum.currentQuantity || 0,
          allocated: stockAgg._sum.allocatedQuantity || 0,
          damaged: stockAgg._sum.damagedQuantity || 0,
          lowStockAlerts: lowStockCount,
          pendingDamages,
        },
        recentMovements,
        recentDamages,
      },
    });
  } catch (error) {
    next(error);
  }
});
