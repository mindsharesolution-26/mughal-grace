import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenant';
import { logger } from '../utils/logger';

const router: Router = Router();

router.use(authMiddleware);
router.use(tenantMiddleware);

// ============ LEAVE TYPES ============

const createLeaveTypeSchema = z.object({
  code: z.string().min(1).optional(),
  name: z.string().min(2),
  nameUrdu: z.string().optional(),
  description: z.string().optional(),
  annualAllowance: z.coerce.number().min(0).default(0),
  isPaid: z.boolean().default(true),
  isActive: z.boolean().default(true),
});

const updateLeaveTypeSchema = createLeaveTypeSchema.partial();

// Generate leave type code
async function generateLeaveTypeCode(prisma: any): Promise<string> {
  const lastType = await prisma.leaveType.findFirst({
    orderBy: { id: 'desc' },
    select: { code: true },
  });

  let nextNum = 1;
  if (lastType?.code) {
    const match = lastType.code.match(/LT-(\d+)/);
    if (match) {
      nextNum = parseInt(match[1]) + 1;
    }
  }

  return `LT-${nextNum.toString().padStart(3, '0')}`;
}

// GET /leaves/types - List all leave types
router.get('/types', async (req: Request, res: Response) => {
  try {
    const prisma = req.prisma!;
    const { isActive } = req.query;

    const where: any = {};
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const leaveTypes = await prisma.leaveType.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    res.json({ data: leaveTypes });
  } catch (error) {
    logger.error('Error fetching leave types:', error);
    res.status(500).json({ error: 'Failed to fetch leave types' });
  }
});

// POST /leaves/types - Create leave type
router.post('/types', async (req: Request, res: Response) => {
  try {
    const prisma = req.prisma!;
    const data = createLeaveTypeSchema.parse(req.body);

    const code = data.code || await generateLeaveTypeCode(prisma);

    const existing = await prisma.leaveType.findUnique({
      where: { code },
    });

    if (existing) {
      return res.status(400).json({ error: `Leave type code "${code}" already exists` });
    }

    const leaveType = await prisma.leaveType.create({
      data: {
        code,
        name: data.name,
        nameUrdu: data.nameUrdu,
        description: data.description,
        annualAllowance: data.annualAllowance,
        isPaid: data.isPaid,
        isActive: data.isActive,
      },
    });

    logger.info(`Created leave type: ${leaveType.code}`);
    res.status(201).json({ message: 'Leave type created successfully', data: leaveType });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    logger.error('Error creating leave type:', error);
    res.status(500).json({ error: 'Failed to create leave type' });
  }
});

// PUT /leaves/types/:id - Update leave type
router.put('/types/:id', async (req: Request, res: Response) => {
  try {
    const prisma = req.prisma!;
    const id = req.params.id as string;
    const data = updateLeaveTypeSchema.parse(req.body);

    const existing = await prisma.leaveType.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Leave type not found' });
    }

    const leaveType = await prisma.leaveType.update({
      where: { id: parseInt(id) },
      data: {
        ...(data.code && { code: data.code }),
        ...(data.name && { name: data.name }),
        ...(data.nameUrdu !== undefined && { nameUrdu: data.nameUrdu }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.annualAllowance !== undefined && { annualAllowance: data.annualAllowance }),
        ...(data.isPaid !== undefined && { isPaid: data.isPaid }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });

    logger.info(`Updated leave type: ${leaveType.code}`);
    res.json({ message: 'Leave type updated successfully', data: leaveType });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    logger.error('Error updating leave type:', error);
    res.status(500).json({ error: 'Failed to update leave type' });
  }
});

// DELETE /leaves/types/:id - Deactivate leave type
router.delete('/types/:id', async (req: Request, res: Response) => {
  try {
    const prisma = req.prisma!;
    const id = req.params.id as string;

    const existing = await prisma.leaveType.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Leave type not found' });
    }

    await prisma.leaveType.update({
      where: { id: parseInt(id) },
      data: { isActive: false },
    });

    logger.info(`Deactivated leave type: ${existing.code}`);
    res.json({ message: 'Leave type deactivated successfully' });
  } catch (error) {
    logger.error('Error deleting leave type:', error);
    res.status(500).json({ error: 'Failed to delete leave type' });
  }
});

// ============ LEAVE REQUESTS ============

const createLeaveSchema = z.object({
  employeeId: z.coerce.number(),
  leaveTypeId: z.coerce.number(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.string().optional(),
});

const updateLeaveSchema = createLeaveSchema.partial().extend({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']).optional(),
  rejectionReason: z.string().optional(),
});

// Calculate days between dates
function calculateDays(startDate: Date, endDate: Date): number {
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
}

// GET /leaves - List all leave requests
router.get('/', async (req: Request, res: Response) => {
  try {
    const prisma = req.prisma!;
    const { employeeId, status, leaveTypeId, fromDate, toDate } = req.query;

    const where: any = {};

    if (employeeId) {
      where.employeeId = parseInt(employeeId as string);
    }

    if (status) {
      where.status = status as string;
    }

    if (leaveTypeId) {
      where.leaveTypeId = parseInt(leaveTypeId as string);
    }

    if (fromDate || toDate) {
      where.startDate = {};
      if (fromDate) where.startDate.gte = new Date(fromDate as string);
      if (toDate) where.startDate.lte = new Date(toDate as string);
    }

    const leaves = await prisma.leave.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        employee: {
          select: {
            id: true,
            code: true,
            fullName: true,
            department: true,
          },
        },
        leaveType: {
          select: { id: true, code: true, name: true, isPaid: true },
        },
      },
    });

    res.json({ data: leaves });
  } catch (error) {
    logger.error('Error fetching leaves:', error);
    res.status(500).json({ error: 'Failed to fetch leave requests' });
  }
});

// GET /leaves/pending - Get pending leave requests
router.get('/pending', async (req: Request, res: Response) => {
  try {
    const prisma = req.prisma!;

    const leaves = await prisma.leave.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
      include: {
        employee: {
          select: {
            id: true,
            code: true,
            fullName: true,
            department: true,
          },
        },
        leaveType: {
          select: { id: true, code: true, name: true },
        },
      },
    });

    res.json({ data: leaves });
  } catch (error) {
    logger.error('Error fetching pending leaves:', error);
    res.status(500).json({ error: 'Failed to fetch pending leaves' });
  }
});

// GET /leaves/balance/:employeeId - Get leave balance for employee
router.get('/balance/:employeeId', async (req: Request, res: Response) => {
  try {
    const prisma = req.prisma!;
    const employeeId = parseInt(req.params.employeeId as string);
    const year = parseInt((req.query.year as string) || new Date().getFullYear().toString());

    // Get all leave types
    const leaveTypes = await prisma.leaveType.findMany({
      where: { isActive: true },
    });

    // Get used leaves for this year
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31);

    const usedLeaves = await prisma.leave.findMany({
      where: {
        employeeId,
        status: 'APPROVED',
        startDate: { gte: startOfYear, lte: endOfYear },
      },
      select: {
        leaveTypeId: true,
        days: true,
      },
    });

    // Calculate balance for each leave type
    const usedByType = new Map<number, number>();
    for (const leave of usedLeaves) {
      usedByType.set(leave.leaveTypeId, (usedByType.get(leave.leaveTypeId) || 0) + leave.days);
    }

    const balance = leaveTypes.map(lt => ({
      leaveType: { id: lt.id, code: lt.code, name: lt.name },
      allowed: lt.annualAllowance,
      used: usedByType.get(lt.id) || 0,
      remaining: lt.annualAllowance - (usedByType.get(lt.id) || 0),
    }));

    res.json({ year, data: balance });
  } catch (error) {
    logger.error('Error fetching leave balance:', error);
    res.status(500).json({ error: 'Failed to fetch leave balance' });
  }
});

// GET /leaves/:id - Get leave details
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const prisma = req.prisma!;
    const id = req.params.id as string;

    const leave = await prisma.leave.findUnique({
      where: { id: parseInt(id) },
      include: {
        employee: true,
        leaveType: true,
      },
    });

    if (!leave) {
      return res.status(404).json({ error: 'Leave request not found' });
    }

    res.json({ data: leave });
  } catch (error) {
    logger.error('Error fetching leave:', error);
    res.status(500).json({ error: 'Failed to fetch leave request' });
  }
});

// POST /leaves - Create leave request
router.post('/', async (req: Request, res: Response) => {
  try {
    const prisma = req.prisma!;
    const data = createLeaveSchema.parse(req.body);

    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);

    if (endDate < startDate) {
      return res.status(400).json({ error: 'End date must be after start date' });
    }

    const days = calculateDays(startDate, endDate);

    // Check for overlapping leaves
    const overlapping = await prisma.leave.findFirst({
      where: {
        employeeId: data.employeeId,
        status: { in: ['PENDING', 'APPROVED'] },
        OR: [
          {
            startDate: { lte: endDate },
            endDate: { gte: startDate },
          },
        ],
      },
    });

    if (overlapping) {
      return res.status(400).json({ error: 'Leave request overlaps with an existing leave' });
    }

    const leave = await prisma.leave.create({
      data: {
        employeeId: data.employeeId,
        leaveTypeId: data.leaveTypeId,
        startDate,
        endDate,
        days,
        reason: data.reason,
        status: 'PENDING',
      },
      include: {
        employee: { select: { code: true, fullName: true } },
        leaveType: { select: { name: true } },
      },
    });

    logger.info(`Leave request created: ${leave.employee.code} - ${leave.leaveType.name} (${days} days)`);
    res.status(201).json({ message: 'Leave request created successfully', data: leave });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    logger.error('Error creating leave:', error);
    res.status(500).json({ error: 'Failed to create leave request' });
  }
});

// PUT /leaves/:id/approve - Approve leave request
router.put('/:id/approve', async (req: Request, res: Response) => {
  try {
    const prisma = req.prisma!;
    const id = req.params.id as string;

    const existing = await prisma.leave.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Leave request not found' });
    }

    if (existing.status !== 'PENDING') {
      return res.status(400).json({ error: 'Only pending requests can be approved' });
    }

    const leave = await prisma.leave.update({
      where: { id: parseInt(id) },
      data: {
        status: 'APPROVED',
        approvedById: req.user!.userId,
        approvedAt: new Date(),
      },
      include: {
        employee: { select: { code: true, fullName: true } },
        leaveType: { select: { name: true } },
      },
    });

    // Create attendance records for leave days
    const startDate = new Date(existing.startDate);
    const endDate = new Date(existing.endDate);
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      await prisma.attendance.upsert({
        where: {
          employeeId_date: {
            employeeId: existing.employeeId,
            date: new Date(currentDate),
          },
        },
        create: {
          employeeId: existing.employeeId,
          date: new Date(currentDate),
          status: 'LEAVE',
          leaveId: existing.id,
        },
        update: {
          status: 'LEAVE',
          leaveId: existing.id,
        },
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    logger.info(`Leave approved: ${leave.employee.code} - ${leave.leaveType.name}`);
    res.json({ message: 'Leave request approved successfully', data: leave });
  } catch (error) {
    logger.error('Error approving leave:', error);
    res.status(500).json({ error: 'Failed to approve leave request' });
  }
});

// PUT /leaves/:id/reject - Reject leave request
router.put('/:id/reject', async (req: Request, res: Response) => {
  try {
    const prisma = req.prisma!;
    const id = req.params.id as string;
    const { rejectionReason } = req.body;

    const existing = await prisma.leave.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Leave request not found' });
    }

    if (existing.status !== 'PENDING') {
      return res.status(400).json({ error: 'Only pending requests can be rejected' });
    }

    const leave = await prisma.leave.update({
      where: { id: parseInt(id) },
      data: {
        status: 'REJECTED',
        approvedById: req.user!.userId,
        approvedAt: new Date(),
        rejectionReason,
      },
      include: {
        employee: { select: { code: true, fullName: true } },
        leaveType: { select: { name: true } },
      },
    });

    logger.info(`Leave rejected: ${leave.employee.code} - ${leave.leaveType.name}`);
    res.json({ message: 'Leave request rejected', data: leave });
  } catch (error) {
    logger.error('Error rejecting leave:', error);
    res.status(500).json({ error: 'Failed to reject leave request' });
  }
});

// PUT /leaves/:id/cancel - Cancel leave request
router.put('/:id/cancel', async (req: Request, res: Response) => {
  try {
    const prisma = req.prisma!;
    const id = req.params.id as string;

    const existing = await prisma.leave.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Leave request not found' });
    }

    if (existing.status === 'CANCELLED') {
      return res.status(400).json({ error: 'Leave request is already cancelled' });
    }

    const leave = await prisma.leave.update({
      where: { id: parseInt(id) },
      data: {
        status: 'CANCELLED',
      },
      include: {
        employee: { select: { code: true, fullName: true } },
      },
    });

    // Remove attendance records if leave was approved
    if (existing.status === 'APPROVED') {
      await prisma.attendance.deleteMany({
        where: { leaveId: existing.id },
      });
    }

    logger.info(`Leave cancelled: ${leave.employee.code}`);
    res.json({ message: 'Leave request cancelled', data: leave });
  } catch (error) {
    logger.error('Error cancelling leave:', error);
    res.status(500).json({ error: 'Failed to cancel leave request' });
  }
});

// DELETE /leaves/:id - Delete leave request
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const prisma = req.prisma!;
    const id = req.params.id as string;

    const existing = await prisma.leave.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Leave request not found' });
    }

    if (existing.status === 'APPROVED') {
      return res.status(400).json({ error: 'Cannot delete approved leave. Cancel it first.' });
    }

    await prisma.leave.delete({
      where: { id: parseInt(id) },
    });

    logger.info(`Leave deleted: ${id}`);
    res.json({ message: 'Leave request deleted successfully' });
  } catch (error) {
    logger.error('Error deleting leave:', error);
    res.status(500).json({ error: 'Failed to delete leave request' });
  }
});

export default router;
