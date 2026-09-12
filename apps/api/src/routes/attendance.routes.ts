import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenant';
import { logger } from '../utils/logger';

const router: Router = Router();

router.use(authMiddleware);
router.use(tenantMiddleware);

// ============ ATTENDANCE ============

// Validation schemas
const checkInSchema = z.object({
  employeeId: z.coerce.number(),
  checkIn: z.string().datetime().optional(),
  notes: z.string().optional(),
});

const checkOutSchema = z.object({
  employeeId: z.coerce.number(),
  checkOut: z.string().datetime().optional(),
  breakMinutes: z.coerce.number().min(0).default(0),
  notes: z.string().optional(),
});

const bulkAttendanceSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  entries: z.array(z.object({
    employeeId: z.coerce.number(),
    status: z.enum(['PRESENT', 'ABSENT', 'HALF_DAY', 'LEAVE', 'HOLIDAY', 'LATE']),
    checkIn: z.string().datetime().optional(),
    checkOut: z.string().datetime().optional(),
    hoursWorked: z.coerce.number().min(0).optional(),
    overtimeHours: z.coerce.number().min(0).optional(),
    notes: z.string().optional(),
  })),
});

const updateAttendanceSchema = z.object({
  status: z.enum(['PRESENT', 'ABSENT', 'HALF_DAY', 'LEAVE', 'HOLIDAY', 'LATE']).optional(),
  checkIn: z.string().datetime().optional(),
  checkOut: z.string().datetime().optional(),
  breakMinutes: z.coerce.number().min(0).optional(),
  hoursWorked: z.coerce.number().min(0).optional(),
  overtimeHours: z.coerce.number().min(0).optional(),
  notes: z.string().optional(),
});

// Calculate hours worked
function calculateHoursWorked(checkIn: Date, checkOut: Date, breakMinutes: number = 0): number {
  const diffMs = checkOut.getTime() - checkIn.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  const breakHours = breakMinutes / 60;
  return Math.max(0, Number((diffHours - breakHours).toFixed(2)));
}

// GET /attendance - List attendance records
router.get('/', async (req: Request, res: Response) => {
  try {
    const prisma = req.prisma!;
    const { date, fromDate, toDate, employeeId, status, department } = req.query;

    const where: any = {};

    if (date) {
      where.date = new Date(date as string);
    } else if (fromDate || toDate) {
      where.date = {};
      if (fromDate) where.date.gte = new Date(fromDate as string);
      if (toDate) where.date.lte = new Date(toDate as string);
    }

    if (employeeId) {
      where.employeeId = parseInt(employeeId as string);
    }

    if (status) {
      where.status = status as string;
    }

    if (department) {
      where.employee = { department: department as string };
    }

    const attendances = await prisma.attendance.findMany({
      where,
      orderBy: [{ date: 'desc' }, { employeeId: 'asc' }],
      include: {
        employee: {
          select: {
            id: true,
            code: true,
            fullName: true,
            department: true,
            designation: { select: { name: true } },
          },
        },
      },
    });

    res.json({ data: attendances });
  } catch (error) {
    logger.error('Error fetching attendance:', error);
    res.status(500).json({ error: 'Failed to fetch attendance records' });
  }
});

// GET /attendance/daily - Get today's attendance for all employees
router.get('/daily', async (req: Request, res: Response) => {
  try {
    const prisma = req.prisma!;
    const dateStr = (req.query.date as string) || new Date().toISOString().split('T')[0];
    const date = new Date(dateStr);

    // Get all active employees
    const employees = await prisma.employee.findMany({
      where: { status: { in: ['ACTIVE', 'PROBATION', 'ON_LEAVE'] } },
      select: {
        id: true,
        code: true,
        fullName: true,
        department: true,
        designation: { select: { name: true } },
      },
      orderBy: { fullName: 'asc' },
    });

    // Get existing attendance for the date
    const attendances = await prisma.attendance.findMany({
      where: { date },
    });

    const attendanceMap = new Map(attendances.map(a => [a.employeeId, a]));

    // Combine employees with their attendance
    const result = employees.map(emp => ({
      employee: emp,
      attendance: attendanceMap.get(emp.id) || null,
    }));

    // Stats
    const present = attendances.filter(a => a.status === 'PRESENT').length;
    const absent = attendances.filter(a => a.status === 'ABSENT').length;
    const leave = attendances.filter(a => a.status === 'LEAVE').length;
    const late = attendances.filter(a => a.status === 'LATE').length;

    res.json({
      date: dateStr,
      stats: {
        total: employees.length,
        present,
        absent,
        leave,
        late,
        unmarked: employees.length - attendances.length,
      },
      data: result,
    });
  } catch (error) {
    logger.error('Error fetching daily attendance:', error);
    res.status(500).json({ error: 'Failed to fetch daily attendance' });
  }
});

// GET /attendance/report - Get attendance report
router.get('/report', async (req: Request, res: Response) => {
  try {
    const prisma = req.prisma!;
    const { month, year, employeeId } = req.query;

    const monthNum = parseInt(month as string) || new Date().getMonth() + 1;
    const yearNum = parseInt(year as string) || new Date().getFullYear();

    // Calculate date range for the month
    const startDate = new Date(yearNum, monthNum - 1, 1);
    const endDate = new Date(yearNum, monthNum, 0);

    const where: any = {
      date: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (employeeId) {
      where.employeeId = parseInt(employeeId as string);
    }

    const attendances = await prisma.attendance.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            code: true,
            fullName: true,
            department: true,
          },
        },
      },
    });

    // Group by employee
    const byEmployee = new Map<number, any>();

    for (const att of attendances) {
      if (!byEmployee.has(att.employeeId)) {
        byEmployee.set(att.employeeId, {
          employee: att.employee,
          present: 0,
          absent: 0,
          halfDay: 0,
          leave: 0,
          late: 0,
          totalHours: 0,
          overtimeHours: 0,
        });
      }

      const stats = byEmployee.get(att.employeeId);
      if (att.status === 'PRESENT') stats.present++;
      else if (att.status === 'ABSENT') stats.absent++;
      else if (att.status === 'HALF_DAY') stats.halfDay++;
      else if (att.status === 'LEAVE') stats.leave++;
      else if (att.status === 'LATE') { stats.late++; stats.present++; }

      stats.totalHours += Number(att.hoursWorked || 0);
      stats.overtimeHours += Number(att.overtimeHours || 0);
    }

    res.json({
      month: monthNum,
      year: yearNum,
      workingDays: endDate.getDate(),
      data: Array.from(byEmployee.values()),
    });
  } catch (error) {
    logger.error('Error fetching attendance report:', error);
    res.status(500).json({ error: 'Failed to fetch attendance report' });
  }
});

// POST /attendance/check-in - Record check-in
router.post('/check-in', async (req: Request, res: Response) => {
  try {
    const prisma = req.prisma!;
    const data = checkInSchema.parse(req.body);

    const checkInTime = data.checkIn ? new Date(data.checkIn) : new Date();
    const today = new Date(checkInTime.toISOString().split('T')[0]);

    // Check if attendance already exists for today
    const existing = await prisma.attendance.findUnique({
      where: {
        employeeId_date: {
          employeeId: data.employeeId,
          date: today,
        },
      },
    });

    if (existing && existing.checkIn) {
      return res.status(400).json({ error: 'Employee already checked in today' });
    }

    let attendance;
    if (existing) {
      // Update existing record with check-in
      attendance = await prisma.attendance.update({
        where: { id: existing.id },
        data: {
          checkIn: checkInTime,
          status: 'PRESENT',
          notes: data.notes,
        },
        include: {
          employee: { select: { code: true, fullName: true } },
        },
      });
    } else {
      // Create new attendance record
      attendance = await prisma.attendance.create({
        data: {
          employeeId: data.employeeId,
          date: today,
          checkIn: checkInTime,
          status: 'PRESENT',
          notes: data.notes,
        },
        include: {
          employee: { select: { code: true, fullName: true } },
        },
      });
    }

    logger.info(`Check-in recorded: ${attendance.employee.code} at ${checkInTime}`);
    res.json({ message: 'Check-in recorded successfully', data: attendance });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    logger.error('Error recording check-in:', error);
    res.status(500).json({ error: 'Failed to record check-in' });
  }
});

// POST /attendance/check-out - Record check-out
router.post('/check-out', async (req: Request, res: Response) => {
  try {
    const prisma = req.prisma!;
    const data = checkOutSchema.parse(req.body);

    const checkOutTime = data.checkOut ? new Date(data.checkOut) : new Date();
    const today = new Date(checkOutTime.toISOString().split('T')[0]);

    // Find today's attendance
    const existing = await prisma.attendance.findUnique({
      where: {
        employeeId_date: {
          employeeId: data.employeeId,
          date: today,
        },
      },
    });

    if (!existing) {
      return res.status(400).json({ error: 'No check-in found for today. Please check-in first.' });
    }

    if (!existing.checkIn) {
      return res.status(400).json({ error: 'Employee has not checked in today' });
    }

    if (existing.checkOut) {
      return res.status(400).json({ error: 'Employee already checked out today' });
    }

    // Calculate hours worked
    const hoursWorked = calculateHoursWorked(existing.checkIn, checkOutTime, data.breakMinutes);

    // Calculate overtime (assuming 8 hours is standard)
    const overtimeHours = Math.max(0, hoursWorked - 8);

    const attendance = await prisma.attendance.update({
      where: { id: existing.id },
      data: {
        checkOut: checkOutTime,
        breakMinutes: data.breakMinutes,
        hoursWorked,
        overtimeHours,
        notes: data.notes || existing.notes,
      },
      include: {
        employee: { select: { code: true, fullName: true } },
      },
    });

    logger.info(`Check-out recorded: ${attendance.employee.code} at ${checkOutTime}`);
    res.json({ message: 'Check-out recorded successfully', data: attendance });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    logger.error('Error recording check-out:', error);
    res.status(500).json({ error: 'Failed to record check-out' });
  }
});

// POST /attendance/bulk - Bulk attendance entry
router.post('/bulk', async (req: Request, res: Response) => {
  try {
    const prisma = req.prisma!;
    const data = bulkAttendanceSchema.parse(req.body);
    const date = new Date(data.date);

    const results = [];

    for (const entry of data.entries) {
      try {
        const attendance = await prisma.attendance.upsert({
          where: {
            employeeId_date: {
              employeeId: entry.employeeId,
              date,
            },
          },
          create: {
            employeeId: entry.employeeId,
            date,
            status: entry.status as any,
            checkIn: entry.checkIn ? new Date(entry.checkIn) : null,
            checkOut: entry.checkOut ? new Date(entry.checkOut) : null,
            hoursWorked: entry.hoursWorked,
            overtimeHours: entry.overtimeHours,
            notes: entry.notes,
          },
          update: {
            status: entry.status as any,
            checkIn: entry.checkIn ? new Date(entry.checkIn) : undefined,
            checkOut: entry.checkOut ? new Date(entry.checkOut) : undefined,
            hoursWorked: entry.hoursWorked,
            overtimeHours: entry.overtimeHours,
            notes: entry.notes,
          },
        });
        results.push({ employeeId: entry.employeeId, success: true, data: attendance });
      } catch (err) {
        results.push({ employeeId: entry.employeeId, success: false, error: 'Failed to save' });
      }
    }

    logger.info(`Bulk attendance saved for ${data.date}: ${results.filter(r => r.success).length}/${results.length} succeeded`);
    res.json({ message: 'Bulk attendance saved', results });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    logger.error('Error saving bulk attendance:', error);
    res.status(500).json({ error: 'Failed to save bulk attendance' });
  }
});

// PUT /attendance/:id - Update attendance record
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const prisma = req.prisma!;
    const id = req.params.id as string;
    const data = updateAttendanceSchema.parse(req.body);

    const existing = await prisma.attendance.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Attendance record not found' });
    }

    // Recalculate hours if check-in/check-out changed
    let hoursWorked = data.hoursWorked;
    let overtimeHours = data.overtimeHours;

    if (data.checkIn || data.checkOut) {
      const checkIn = data.checkIn ? new Date(data.checkIn) : existing.checkIn;
      const checkOut = data.checkOut ? new Date(data.checkOut) : existing.checkOut;
      const breakMinutes = data.breakMinutes ?? existing.breakMinutes;

      if (checkIn && checkOut) {
        hoursWorked = calculateHoursWorked(checkIn, checkOut, breakMinutes);
        overtimeHours = Math.max(0, hoursWorked - 8);
      }
    }

    const attendance = await prisma.attendance.update({
      where: { id: parseInt(id) },
      data: {
        ...(data.status && { status: data.status as any }),
        ...(data.checkIn && { checkIn: new Date(data.checkIn) }),
        ...(data.checkOut && { checkOut: new Date(data.checkOut) }),
        ...(data.breakMinutes !== undefined && { breakMinutes: data.breakMinutes }),
        ...(hoursWorked !== undefined && { hoursWorked }),
        ...(overtimeHours !== undefined && { overtimeHours }),
        ...(data.notes !== undefined && { notes: data.notes }),
      },
      include: {
        employee: { select: { code: true, fullName: true } },
      },
    });

    logger.info(`Updated attendance: ${attendance.id}`);
    res.json({ message: 'Attendance updated successfully', data: attendance });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    logger.error('Error updating attendance:', error);
    res.status(500).json({ error: 'Failed to update attendance' });
  }
});

// DELETE /attendance/:id - Delete attendance record
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const prisma = req.prisma!;
    const id = req.params.id as string;

    const existing = await prisma.attendance.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Attendance record not found' });
    }

    await prisma.attendance.delete({
      where: { id: parseInt(id) },
    });

    logger.info(`Deleted attendance: ${id}`);
    res.json({ message: 'Attendance record deleted successfully' });
  } catch (error) {
    logger.error('Error deleting attendance:', error);
    res.status(500).json({ error: 'Failed to delete attendance' });
  }
});

export default router;
