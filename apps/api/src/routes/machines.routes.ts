import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenant';
import { requirePermission } from '../middleware/rbac';
import { validateBody, validateQuery } from '../middleware/validate';
import { AppError } from '../middleware/error-handler';
import { logger } from '../utils/logger';
import { parsePagination, buildPaginationMeta } from '../utils/pagination';

export const machinesRouter: Router = Router();

// Apply middleware to all routes
machinesRouter.use(authMiddleware);
machinesRouter.use(tenantMiddleware);

// ========================================
// Validation Schemas
// ========================================

const machineTypeEnum = z.enum(['CIRCULAR_KNITTING', 'FLAT_KNITTING', 'WARP_KNITTING', 'JACQUARD']);
const machineStatusEnum = z.enum(['OPERATIONAL', 'MAINTENANCE', 'BREAKDOWN', 'IDLE', 'DECOMMISSIONED']);

const needleConfigSchema = z.object({
  name: z.string().min(1).max(100),
  position: z.string().max(50).optional(),
  quantity: z.number().int().positive(),
});

const createMachineSchema = z.object({
  machineNumber: z.string().min(1).max(50),
  name: z.string().min(1).max(255),
  brand: z.string().max(100).optional(),
  model: z.string().max(100).optional(),
  serialNumber: z.string().max(100).optional(),
  machineType: machineTypeEnum,
  gauge: z.number().int().positive().optional(),
  diameter: z.number().int().positive().optional(),
  feeders: z.number().int().positive().optional(),
  location: z.string().max(100).optional(),
  position: z.string().max(50).optional(),
  status: machineStatusEnum.optional(),
  installationDate: z.string().optional(),
  needleGauge: z.number().int().positive().optional(),
  totalNeedleSlots: z.number().int().positive().optional(),
  cylinderNeedles: z.number().int().positive().optional(),
  dialNeedles: z.number().int().positive().optional(),
  needles: z.array(needleConfigSchema).optional(),
});

const updateMachineSchema = createMachineSchema.partial();

const updateStatusSchema = z.object({
  status: machineStatusEnum,
  notes: z.string().optional(),
});

const scheduleMaintSchema = z.object({
  nextMaintenanceAt: z.string(),
  notes: z.string().optional(),
});

const completeMaintSchema = z.object({
  notes: z.string().optional(),
  nextMaintenanceAt: z.string().optional(),
});

const listMachinesSchema = z.object({
  status: machineStatusEnum.optional(),
  machineType: machineTypeEnum.optional(),
  search: z.string().optional(),
  sortBy: z.enum(['machineNumber', 'name', 'status', 'createdAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  page: z.string().regex(/^\d+$/).optional(),
  limit: z.string().regex(/^\d+$/).optional(),
});

// ========================================
// GET /machines - List all machines
// ========================================
machinesRouter.get('/', requirePermission('production:read'), validateQuery(listMachinesSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, machineType, search, sortBy = 'machineNumber', sortOrder = 'asc', page = '1', limit = '50' } = req.query;

    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (machineType) {
      where.machineType = machineType;
    }

    if (search) {
      where.OR = [
        { machineNumber: { contains: search as string, mode: 'insensitive' } },
        { name: { contains: search as string, mode: 'insensitive' } },
        { brand: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    // SECURITY: Use safe pagination with bounds validation
    const pagination = parsePagination(page as string, limit as string, { maxLimit: 100 });

    const [machines, total] = await Promise.all([
      req.prisma!.machine.findMany({
        where,
        orderBy: { [sortBy as string]: sortOrder },
        skip: pagination.skip,
        take: pagination.limit,
        include: {
          _count: {
            select: {
              productionLogs: true,
              needleAllocations: {
                where: { status: 'INSTALLED' }
              }
            }
          }
        }
      }),
      req.prisma!.machine.count({ where }),
    ]);

    res.json({
      machines,
      pagination: buildPaginationMeta(pagination.page, pagination.limit, total),
    });
  } catch (error) {
    next(error);
  }
});

// ========================================
// GET /machines/lookup - Lightweight list for dropdowns
// ========================================
machinesRouter.get('/lookup', requirePermission('production:read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const machines = await req.prisma!.machine.findMany({
      where: {
        status: { not: 'DECOMMISSIONED' }
      },
      select: {
        id: true,
        machineNumber: true,
        name: true,
        machineType: true,
        status: true,
        gauge: true,
        diameter: true,
      },
      orderBy: { machineNumber: 'asc' },
    });

    res.json(machines);
  } catch (error) {
    next(error);
  }
});

// ========================================
// GET /machines/stats - Dashboard statistics
// ========================================
machinesRouter.get('/stats', requirePermission('production:read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [statusCounts, typeCounts, maintenanceDue] = await Promise.all([
      // Count by status
      req.prisma!.machine.groupBy({
        by: ['status'],
        _count: { status: true },
      }),
      // Count by type
      req.prisma!.machine.groupBy({
        by: ['machineType'],
        _count: { machineType: true },
      }),
      // Machines due for maintenance (next 7 days)
      req.prisma!.machine.count({
        where: {
          nextMaintenanceAt: {
            lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            gte: new Date(),
          },
          status: { not: 'DECOMMISSIONED' },
        },
      }),
    ]);

    const totalMachines = await req.prisma!.machine.count({
      where: { status: { not: 'DECOMMISSIONED' } }
    });

    const operational = statusCounts.find(s => s.status === 'OPERATIONAL')?._count.status || 0;
    const maintenance = statusCounts.find(s => s.status === 'MAINTENANCE')?._count.status || 0;
    const breakdown = statusCounts.find(s => s.status === 'BREAKDOWN')?._count.status || 0;
    const idle = statusCounts.find(s => s.status === 'IDLE')?._count.status || 0;

    res.json({
      total: totalMachines,
      byStatus: {
        operational,
        maintenance,
        breakdown,
        idle,
      },
      byType: typeCounts.reduce((acc, t) => {
        acc[t.machineType] = t._count.machineType;
        return acc;
      }, {} as Record<string, number>),
      maintenanceDue,
      operationalRate: totalMachines > 0 ? Math.round((operational / totalMachines) * 100) : 0,
    });
  } catch (error) {
    next(error);
  }
});

// ========================================
// GET /machines/maintenance-schedule - Upcoming maintenance
// ========================================
machinesRouter.get('/maintenance-schedule', requirePermission('production:read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const machines = await req.prisma!.machine.findMany({
      where: {
        nextMaintenanceAt: { not: null },
        status: { not: 'DECOMMISSIONED' },
      },
      select: {
        id: true,
        machineNumber: true,
        name: true,
        machineType: true,
        status: true,
        lastMaintenanceAt: true,
        nextMaintenanceAt: true,
      },
      orderBy: { nextMaintenanceAt: 'asc' },
      take: 20,
    });

    // Add days until maintenance
    const withDays = machines.map(m => ({
      ...m,
      daysUntilMaintenance: m.nextMaintenanceAt
        ? Math.ceil((new Date(m.nextMaintenanceAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : null,
      isOverdue: m.nextMaintenanceAt ? new Date(m.nextMaintenanceAt) < new Date() : false,
    }));

    res.json(withDays);
  } catch (error) {
    next(error);
  }
});

// ========================================
// GET /machines/:id - Get machine details
// ========================================
machinesRouter.get('/:id', requirePermission('production:read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id as string);

    const machine = await req.prisma!.machine.findUnique({
      where: { id },
      include: {
        needleAllocations: {
          where: { status: 'INSTALLED' },
          include: {
            needleType: {
              select: {
                id: true,
                code: true,
                name: true,
                gauge: true,
                material: true,
              }
            },
            batch: {
              select: {
                id: true,
                batchNumber: true,
              }
            }
          },
          orderBy: { installedAt: 'desc' },
        },
        productionLogs: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            shiftId: true,
            rollsProduced: true,
            actualWeight: true,
            createdAt: true,
          }
        },
        downtimeLogs: {
          take: 10,
          orderBy: { startTime: 'desc' },
          select: {
            id: true,
            reason: true,
            startTime: true,
            endTime: true,
            durationMinutes: true,
          }
        },
      },
    });

    if (!machine) {
      throw AppError.notFound('Machine');
    }

    // Calculate summary stats
    const totalNeedlesInstalled = machine.needleAllocations?.reduce(
      (sum: number, a: { installedQuantity: number }) => sum + a.installedQuantity, 0
    ) || 0;

    const utilizationPercent = machine.totalNeedleSlots
      ? Math.round((totalNeedlesInstalled / machine.totalNeedleSlots) * 100)
      : null;

    res.json({
      ...machine,
      summary: {
        totalNeedlesInstalled,
        utilizationPercent,
        activeAllocations: machine.needleAllocations?.length || 0,
      }
    });
  } catch (error) {
    next(error);
  }
});

// ========================================
// POST /machines - Create new machine
// ========================================
machinesRouter.post('/', requirePermission('production:write'), validateBody(createMachineSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { needles, ...data } = req.body;

    // Check for duplicate machine number
    const existing = await req.prisma!.machine.findUnique({
      where: { machineNumber: data.machineNumber },
    });

    if (existing) {
      throw AppError.conflict('Machine number already exists');
    }

    const machine = await req.prisma!.machine.create({
      data: {
        ...data,
        installationDate: data.installationDate ? new Date(data.installationDate) : null,
        needleConfigs: needles && needles.length > 0 ? needles : undefined,
      },
    });

    logger.info(`Machine created: ${machine.machineNumber} (ID: ${machine.id})`);

    res.status(201).json(machine);
  } catch (error) {
    next(error);
  }
});

// ========================================
// PUT /machines/:id - Update machine
// ========================================
machinesRouter.put('/:id', requirePermission('production:write'), validateBody(updateMachineSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id as string);
    const { needles, ...data } = req.body;

    const existing = await req.prisma!.machine.findUnique({
      where: { id },
    });

    if (!existing) {
      throw AppError.notFound('Machine');
    }

    // Check for duplicate machine number if changing
    if (data.machineNumber && data.machineNumber !== existing.machineNumber) {
      const duplicate = await req.prisma!.machine.findUnique({
        where: { machineNumber: data.machineNumber },
      });
      if (duplicate) {
        throw AppError.conflict('Machine number already exists');
      }
    }

    const machine = await req.prisma!.machine.update({
      where: { id },
      data: {
        ...data,
        installationDate: data.installationDate ? new Date(data.installationDate) : undefined,
        needleConfigs: needles !== undefined ? (needles && needles.length > 0 ? needles : null) : undefined,
      },
    });

    logger.info(`Machine updated: ${machine.machineNumber} (ID: ${machine.id})`);

    res.json(machine);
  } catch (error) {
    next(error);
  }
});

// ========================================
// PATCH /machines/:id/status - Update machine status
// ========================================
machinesRouter.patch('/:id/status', requirePermission('production:write'), validateBody(updateStatusSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id as string);
    const { status, notes } = req.body;

    const existing = await req.prisma!.machine.findUnique({
      where: { id },
    });

    if (!existing) {
      throw AppError.notFound('Machine');
    }

    const updateData: any = { status };

    // If going to maintenance, record the start
    if (status === 'MAINTENANCE' && existing.status !== 'MAINTENANCE') {
      // Create a downtime log
      await req.prisma!.downtimeLog.create({
        data: {
          machineId: id,
          reason: notes || 'Scheduled Maintenance',
          startTime: new Date(),
        },
      });
    }

    // If coming out of maintenance, update last maintenance date
    if (existing.status === 'MAINTENANCE' && status !== 'MAINTENANCE') {
      updateData.lastMaintenanceAt = new Date();

      // End any open downtime logs
      await req.prisma!.downtimeLog.updateMany({
        where: {
          machineId: id,
          endTime: null,
        },
        data: {
          endTime: new Date(),
        },
      });
    }

    const machine = await req.prisma!.machine.update({
      where: { id },
      data: updateData,
    });

    logger.info(`Machine ${machine.machineNumber} status changed: ${existing.status} -> ${status}`);

    res.json(machine);
  } catch (error) {
    next(error);
  }
});

// ========================================
// POST /machines/:id/schedule-maintenance - Schedule maintenance
// ========================================
machinesRouter.post('/:id/schedule-maintenance', requirePermission('production:write'), validateBody(scheduleMaintSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id as string);
    const { nextMaintenanceAt } = req.body;

    const existing = await req.prisma!.machine.findUnique({
      where: { id },
    });

    if (!existing) {
      throw AppError.notFound('Machine');
    }

    const machine = await req.prisma!.machine.update({
      where: { id },
      data: {
        nextMaintenanceAt: new Date(nextMaintenanceAt),
      },
    });

    logger.info(`Maintenance scheduled for machine ${machine.machineNumber}: ${nextMaintenanceAt}`);

    res.json(machine);
  } catch (error) {
    next(error);
  }
});

// ========================================
// POST /machines/:id/complete-maintenance - Complete maintenance
// ========================================
machinesRouter.post('/:id/complete-maintenance', requirePermission('production:write'), validateBody(completeMaintSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id as string);
    const { notes, nextMaintenanceAt } = req.body;

    const existing = await req.prisma!.machine.findUnique({
      where: { id },
    });

    if (!existing) {
      throw AppError.notFound('Machine');
    }

    // End any open downtime logs
    await req.prisma!.downtimeLog.updateMany({
      where: {
        machineId: id,
        endTime: null,
      },
      data: {
        endTime: new Date(),
      },
    });

    const machine = await req.prisma!.machine.update({
      where: { id },
      data: {
        status: 'OPERATIONAL',
        lastMaintenanceAt: new Date(),
        nextMaintenanceAt: nextMaintenanceAt ? new Date(nextMaintenanceAt) : null,
      },
    });

    logger.info(`Maintenance completed for machine ${machine.machineNumber}`);

    res.json(machine);
  } catch (error) {
    next(error);
  }
});

// ========================================
// GET /machines/:id/production-history - Get production history
// ========================================
machinesRouter.get('/:id/production-history', requirePermission('production:read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id as string);
    const { startDate, endDate, limit = '50' } = req.query;

    const where: any = { machineId: id };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate as string);
      if (endDate) where.createdAt.lte = new Date(endDate as string);
    }

    const logs = await req.prisma!.productionLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
      include: {
        shift: {
          select: {
            id: true,
            name: true,
            code: true,
          }
        }
      }
    });

    // Calculate summary
    const summary = {
      totalRolls: logs.reduce((sum, l) => sum + (l.rollsProduced || 0), 0),
      totalWeight: logs.reduce((sum, l) => sum + (Number(l.actualWeight) || 0), 0),
      daysActive: new Set(logs.map(l => l.createdAt.toISOString().split('T')[0])).size,
    };

    res.json({ logs, summary });
  } catch (error) {
    next(error);
  }
});

// ========================================
// GET /machines/:id/downtime-history - Get downtime history
// ========================================
machinesRouter.get('/:id/downtime-history', requirePermission('production:read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id as string);
    const { startDate, endDate, limit = '50' } = req.query;

    const where: any = { machineId: id };

    if (startDate || endDate) {
      where.startTime = {};
      if (startDate) where.startTime.gte = new Date(startDate as string);
      if (endDate) where.startTime.lte = new Date(endDate as string);
    }

    const logs = await req.prisma!.downtimeLog.findMany({
      where,
      orderBy: { startTime: 'desc' },
      take: parseInt(limit as string),
    });

    // Calculate total downtime
    const totalDowntimeMinutes = logs.reduce((sum, l) => {
      if (l.durationMinutes) return sum + l.durationMinutes;
      if (l.endTime) {
        return sum + Math.round((new Date(l.endTime).getTime() - new Date(l.startTime).getTime()) / 60000);
      }
      return sum;
    }, 0);

    res.json({
      logs,
      summary: {
        totalDowntimeMinutes,
        totalDowntimeHours: Math.round(totalDowntimeMinutes / 60 * 10) / 10,
        incidents: logs.length,
      }
    });
  } catch (error) {
    next(error);
  }
});

// ========================================
// DELETE /machines/:id - Decommission machine
// ========================================
machinesRouter.delete('/:id', requirePermission('production:write'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id as string);

    const existing = await req.prisma!.machine.findUnique({
      where: { id },
    });

    if (!existing) {
      throw AppError.notFound('Machine');
    }

    // Soft delete - set status to decommissioned
    const machine = await req.prisma!.machine.update({
      where: { id },
      data: { status: 'DECOMMISSIONED' },
    });

    // Remove any active needle allocations
    await req.prisma!.needleMachineAllocation.updateMany({
      where: {
        machineId: id,
        status: 'INSTALLED',
      },
      data: {
        status: 'REMOVED',
        removedAt: new Date(),
        removalReason: 'Machine decommissioned',
      },
    });

    logger.info(`Machine decommissioned: ${machine.machineNumber} (ID: ${machine.id})`);

    res.json({ message: 'Machine decommissioned successfully', machine });
  } catch (error) {
    next(error);
  }
});
