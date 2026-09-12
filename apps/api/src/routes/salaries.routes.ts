import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenant';
import { logger } from '../utils/logger';

const router: Router = Router();

router.use(authMiddleware);
router.use(tenantMiddleware);

// ============ SALARIES ============

const generateSalarySchema = z.object({
  month: z.coerce.number().min(1).max(12),
  year: z.coerce.number().min(2020).max(2100),
  employeeIds: z.array(z.coerce.number()).optional(),
});

const updateSalarySchema = z.object({
  baseSalary: z.coerce.number().min(0).optional(),
  overtimeAmount: z.coerce.number().min(0).optional(),
  allowances: z.coerce.number().min(0).optional(),
  bonus: z.coerce.number().min(0).optional(),
  advances: z.coerce.number().min(0).optional(),
  loans: z.coerce.number().min(0).optional(),
  tax: z.coerce.number().min(0).optional(),
  eobi: z.coerce.number().min(0).optional(),
  otherDeductions: z.coerce.number().min(0).optional(),
  notes: z.string().optional(),
});

const paymentSchema = z.object({
  paymentMethod: z.enum(['CASH', 'BANK_TRANSFER', 'CHEQUE']),
  notes: z.string().optional(),
});

// GET /salaries - List salary records
router.get('/', async (req: Request, res: Response) => {
  try {
    const prisma = req.prisma!;
    const { month, year, status, employeeId, department } = req.query;

    const where: any = {};

    if (month) {
      where.month = parseInt(month as string);
    }

    if (year) {
      where.year = parseInt(year as string);
    }

    if (status) {
      where.status = status as string;
    }

    if (employeeId) {
      where.employeeId = parseInt(employeeId as string);
    }

    if (department) {
      where.employee = { department: department as string };
    }

    const salaries = await prisma.salary.findMany({
      where,
      orderBy: [{ year: 'desc' }, { month: 'desc' }, { employeeId: 'asc' }],
      include: {
        employee: {
          select: {
            id: true,
            code: true,
            fullName: true,
            department: true,
            designation: { select: { name: true } },
            bankName: true,
            bankAccountNo: true,
          },
        },
      },
    });

    res.json({ data: salaries });
  } catch (error) {
    logger.error('Error fetching salaries:', error);
    res.status(500).json({ error: 'Failed to fetch salaries' });
  }
});

// GET /salaries/stats - Get salary statistics
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const prisma = req.prisma!;
    const month = parseInt((req.query.month as string) || new Date().getMonth().toString()) || new Date().getMonth() + 1;
    const year = parseInt((req.query.year as string) || new Date().getFullYear().toString());

    const [draft, pending, approved, paid, totals] = await Promise.all([
      prisma.salary.count({ where: { month, year, status: 'DRAFT' } }),
      prisma.salary.count({ where: { month, year, status: 'PENDING' } }),
      prisma.salary.count({ where: { month, year, status: 'APPROVED' } }),
      prisma.salary.count({ where: { month, year, status: 'PAID' } }),
      prisma.salary.aggregate({
        where: { month, year },
        _sum: {
          grossSalary: true,
          totalDeductions: true,
          netSalary: true,
        },
      }),
    ]);

    res.json({
      month,
      year,
      counts: { draft, pending, approved, paid, total: draft + pending + approved + paid },
      totals: {
        grossSalary: Number(totals._sum.grossSalary || 0).toFixed(2),
        totalDeductions: Number(totals._sum.totalDeductions || 0).toFixed(2),
        netSalary: Number(totals._sum.netSalary || 0).toFixed(2),
      },
    });
  } catch (error) {
    logger.error('Error fetching salary stats:', error);
    res.status(500).json({ error: 'Failed to fetch salary stats' });
  }
});

// GET /salaries/:id - Get salary details
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const prisma = req.prisma!;
    const id = req.params.id as string;

    const salary = await prisma.salary.findUnique({
      where: { id: parseInt(id) },
      include: {
        employee: {
          include: {
            designation: true,
          },
        },
      },
    });

    if (!salary) {
      return res.status(404).json({ error: 'Salary record not found' });
    }

    res.json({ data: salary });
  } catch (error) {
    logger.error('Error fetching salary:', error);
    res.status(500).json({ error: 'Failed to fetch salary' });
  }
});

// POST /salaries/generate - Generate monthly salaries
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const prisma = req.prisma!;
    const data = generateSalarySchema.parse(req.body);

    // Get employees to generate salaries for
    const employeeWhere: any = {
      status: { in: ['ACTIVE', 'PROBATION', 'ON_LEAVE'] },
    };

    if (data.employeeIds && data.employeeIds.length > 0) {
      employeeWhere.id = { in: data.employeeIds };
    }

    const employees = await prisma.employee.findMany({
      where: employeeWhere,
      include: {
        designation: true,
      },
    });

    // Get attendance data for the month
    const startDate = new Date(data.year, data.month - 1, 1);
    const endDate = new Date(data.year, data.month, 0);
    const workingDays = endDate.getDate();

    const results = [];

    for (const employee of employees) {
      // Check if salary already exists
      const existing = await prisma.salary.findUnique({
        where: {
          employeeId_month_year: {
            employeeId: employee.id,
            month: data.month,
            year: data.year,
          },
        },
      });

      if (existing) {
        results.push({
          employeeId: employee.id,
          code: employee.code,
          success: false,
          error: 'Salary already exists',
        });
        continue;
      }

      // Get attendance for this employee
      const attendances = await prisma.attendance.findMany({
        where: {
          employeeId: employee.id,
          date: { gte: startDate, lte: endDate },
        },
      });

      const presentDays = attendances.filter(a => a.status === 'PRESENT' || a.status === 'LATE').length;
      const absentDays = attendances.filter(a => a.status === 'ABSENT').length;
      const leaveDays = attendances.filter(a => a.status === 'LEAVE').length;
      const halfDays = attendances.filter(a => a.status === 'HALF_DAY').length;
      const totalOvertimeHours = attendances.reduce((sum, a) => sum + Number(a.overtimeHours || 0), 0);

      // Calculate salary based on salary type
      let baseSalary = Number(employee.baseSalary);
      let overtimeAmount = 0;

      if (employee.salaryType === 'DAILY') {
        const effectiveDays = presentDays + (halfDays * 0.5) + leaveDays;
        baseSalary = Number(employee.dailyRate || 0) * effectiveDays;
      } else if (employee.salaryType === 'HOURLY') {
        const totalHours = attendances.reduce((sum, a) => sum + Number(a.hoursWorked || 0), 0);
        baseSalary = Number(employee.hourlyRate || 0) * totalHours;
      } else {
        // MONTHLY salary - deduct for absences
        const dailyRate = baseSalary / workingDays;
        const deduction = dailyRate * (absentDays + (halfDays * 0.5));
        baseSalary = baseSalary - deduction;
      }

      // Calculate overtime
      if (employee.overtimeRate && totalOvertimeHours > 0) {
        overtimeAmount = Number(employee.overtimeRate) * totalOvertimeHours;
      }

      // Get pending advances to deduct
      const advances = await prisma.advancePayment.findMany({
        where: {
          employeeId: employee.id,
          status: 'APPROVED',
          deductFromMonth: { lte: data.month },
          deductFromYear: { lte: data.year },
          installmentsPaid: { lt: prisma.advancePayment.fields.installments },
        },
      });

      let advanceDeduction = 0;
      for (const advance of advances) {
        const remainingInstallments = advance.installments - advance.installmentsPaid;
        const installmentAmount = Number(advance.amount) / advance.installments;
        advanceDeduction += installmentAmount;
      }

      // Calculate totals
      const grossSalary = baseSalary + overtimeAmount;
      const totalDeductions = advanceDeduction;
      const netSalary = grossSalary - totalDeductions;

      try {
        const salary = await prisma.salary.create({
          data: {
            employeeId: employee.id,
            month: data.month,
            year: data.year,
            baseSalary,
            overtimeAmount,
            allowances: 0,
            bonus: 0,
            grossSalary,
            advances: advanceDeduction,
            loans: 0,
            tax: 0,
            eobi: 0,
            otherDeductions: 0,
            totalDeductions,
            netSalary,
            workingDays,
            presentDays,
            absentDays,
            leaveDays,
            overtimeHours: totalOvertimeHours,
            status: 'DRAFT',
          },
        });

        results.push({
          employeeId: employee.id,
          code: employee.code,
          success: true,
          data: salary,
        });
      } catch (err) {
        results.push({
          employeeId: employee.id,
          code: employee.code,
          success: false,
          error: 'Failed to create',
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    logger.info(`Generated ${successCount}/${results.length} salaries for ${data.month}/${data.year}`);

    res.json({
      message: `Generated ${successCount}/${results.length} salaries`,
      month: data.month,
      year: data.year,
      results,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    logger.error('Error generating salaries:', error);
    res.status(500).json({ error: 'Failed to generate salaries' });
  }
});

// PUT /salaries/:id - Update salary
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const prisma = req.prisma!;
    const id = req.params.id as string;
    const data = updateSalarySchema.parse(req.body);

    const existing = await prisma.salary.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Salary record not found' });
    }

    if (existing.status === 'PAID') {
      return res.status(400).json({ error: 'Cannot update paid salary' });
    }

    // Calculate new totals
    const baseSalary = data.baseSalary ?? Number(existing.baseSalary);
    const overtimeAmount = data.overtimeAmount ?? Number(existing.overtimeAmount);
    const allowances = data.allowances ?? Number(existing.allowances);
    const bonus = data.bonus ?? Number(existing.bonus);

    const grossSalary = baseSalary + overtimeAmount + allowances + bonus;

    const advances = data.advances ?? Number(existing.advances);
    const loans = data.loans ?? Number(existing.loans);
    const tax = data.tax ?? Number(existing.tax);
    const eobi = data.eobi ?? Number(existing.eobi);
    const otherDeductions = data.otherDeductions ?? Number(existing.otherDeductions);

    const totalDeductions = advances + loans + tax + eobi + otherDeductions;
    const netSalary = grossSalary - totalDeductions;

    const salary = await prisma.salary.update({
      where: { id: parseInt(id) },
      data: {
        baseSalary,
        overtimeAmount,
        allowances,
        bonus,
        grossSalary,
        advances,
        loans,
        tax,
        eobi,
        otherDeductions,
        totalDeductions,
        netSalary,
        notes: data.notes ?? existing.notes,
      },
      include: {
        employee: { select: { code: true, fullName: true } },
      },
    });

    logger.info(`Updated salary: ${salary.employee.code} - ${existing.month}/${existing.year}`);
    res.json({ message: 'Salary updated successfully', data: salary });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    logger.error('Error updating salary:', error);
    res.status(500).json({ error: 'Failed to update salary' });
  }
});

// PUT /salaries/:id/submit - Submit salary for approval
router.put('/:id/submit', async (req: Request, res: Response) => {
  try {
    const prisma = req.prisma!;
    const id = req.params.id as string;

    const existing = await prisma.salary.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Salary record not found' });
    }

    if (existing.status !== 'DRAFT') {
      return res.status(400).json({ error: 'Only draft salaries can be submitted' });
    }

    const salary = await prisma.salary.update({
      where: { id: parseInt(id) },
      data: { status: 'PENDING' },
      include: {
        employee: { select: { code: true, fullName: true } },
      },
    });

    logger.info(`Salary submitted: ${salary.employee.code}`);
    res.json({ message: 'Salary submitted for approval', data: salary });
  } catch (error) {
    logger.error('Error submitting salary:', error);
    res.status(500).json({ error: 'Failed to submit salary' });
  }
});

// PUT /salaries/:id/approve - Approve salary
router.put('/:id/approve', async (req: Request, res: Response) => {
  try {
    const prisma = req.prisma!;
    const id = req.params.id as string;

    const existing = await prisma.salary.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Salary record not found' });
    }

    if (existing.status !== 'PENDING') {
      return res.status(400).json({ error: 'Only pending salaries can be approved' });
    }

    const salary = await prisma.salary.update({
      where: { id: parseInt(id) },
      data: { status: 'APPROVED' },
      include: {
        employee: { select: { code: true, fullName: true } },
      },
    });

    logger.info(`Salary approved: ${salary.employee.code}`);
    res.json({ message: 'Salary approved', data: salary });
  } catch (error) {
    logger.error('Error approving salary:', error);
    res.status(500).json({ error: 'Failed to approve salary' });
  }
});

// POST /salaries/:id/pay - Mark salary as paid
router.post('/:id/pay', async (req: Request, res: Response) => {
  try {
    const prisma = req.prisma!;
    const id = req.params.id as string;
    const data = paymentSchema.parse(req.body);

    const existing = await prisma.salary.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Salary record not found' });
    }

    if (existing.status !== 'APPROVED') {
      return res.status(400).json({ error: 'Only approved salaries can be paid' });
    }

    // Update advance payments
    if (Number(existing.advances) > 0) {
      const advances = await prisma.advancePayment.findMany({
        where: {
          employeeId: existing.employeeId,
          status: 'APPROVED',
          deductFromMonth: { lte: existing.month },
          deductFromYear: { lte: existing.year },
          installmentsPaid: { lt: prisma.advancePayment.fields.installments },
        },
      });

      for (const advance of advances) {
        const newInstallmentsPaid = advance.installmentsPaid + 1;
        const newStatus = newInstallmentsPaid >= advance.installments ? 'FULLY_DEDUCTED' : 'PARTIALLY_DEDUCTED';

        await prisma.advancePayment.update({
          where: { id: advance.id },
          data: {
            installmentsPaid: newInstallmentsPaid,
            status: newStatus,
          },
        });
      }
    }

    const salary = await prisma.salary.update({
      where: { id: parseInt(id) },
      data: {
        status: 'PAID',
        paymentMethod: data.paymentMethod,
        paidAt: new Date(),
        notes: data.notes ?? existing.notes,
      },
      include: {
        employee: { select: { code: true, fullName: true } },
      },
    });

    logger.info(`Salary paid: ${salary.employee.code} - ${data.paymentMethod}`);
    res.json({ message: 'Salary marked as paid', data: salary });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    logger.error('Error paying salary:', error);
    res.status(500).json({ error: 'Failed to pay salary' });
  }
});

// POST /salaries/bulk-approve - Bulk approve salaries
router.post('/bulk-approve', async (req: Request, res: Response) => {
  try {
    const prisma = req.prisma!;
    const { salaryIds } = req.body;

    if (!Array.isArray(salaryIds) || salaryIds.length === 0) {
      return res.status(400).json({ error: 'Salary IDs are required' });
    }

    const result = await prisma.salary.updateMany({
      where: {
        id: { in: salaryIds },
        status: 'PENDING',
      },
      data: { status: 'APPROVED' },
    });

    logger.info(`Bulk approved ${result.count} salaries`);
    res.json({ message: `Approved ${result.count} salaries`, count: result.count });
  } catch (error) {
    logger.error('Error bulk approving salaries:', error);
    res.status(500).json({ error: 'Failed to approve salaries' });
  }
});

// DELETE /salaries/:id - Delete salary (only draft)
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const prisma = req.prisma!;
    const id = req.params.id as string;

    const existing = await prisma.salary.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Salary record not found' });
    }

    if (existing.status !== 'DRAFT') {
      return res.status(400).json({ error: 'Only draft salaries can be deleted' });
    }

    await prisma.salary.delete({
      where: { id: parseInt(id) },
    });

    logger.info(`Deleted salary: ${id}`);
    res.json({ message: 'Salary record deleted' });
  } catch (error) {
    logger.error('Error deleting salary:', error);
    res.status(500).json({ error: 'Failed to delete salary' });
  }
});

export default router;
