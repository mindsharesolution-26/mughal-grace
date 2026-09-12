import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenant';
import { logger } from '../utils/logger';

const router: Router = Router();

router.use(authMiddleware);
router.use(tenantMiddleware);

// ============ EMPLOYEES ============

// Validation schemas
const createEmployeeSchema = z.object({
  code: z.string().min(1).optional(),
  fullName: z.string().min(2),
  fullNameUrdu: z.string().optional(),
  fatherName: z.string().optional(),
  cnic: z.string().regex(/^\d{5}-\d{7}-\d{1}$/, 'Invalid CNIC format (12345-1234567-1)').optional().or(z.literal('')),
  phone: z.string().optional(),
  emergencyPhone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  city: z.string().optional(),
  designationId: z.coerce.number().optional(),
  department: z.string().optional(),
  joiningDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  probationEndDate: z.string().datetime().optional().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
  salaryType: z.enum(['MONTHLY', 'DAILY', 'HOURLY', 'PIECE_RATE']).default('MONTHLY'),
  baseSalary: z.coerce.number().min(0).default(0),
  hourlyRate: z.coerce.number().min(0).optional(),
  dailyRate: z.coerce.number().min(0).optional(),
  overtimeRate: z.coerce.number().min(0).optional(),
  bankName: z.string().optional(),
  bankAccountNo: z.string().optional(),
  bankBranch: z.string().optional(),
  status: z.enum(['ACTIVE', 'ON_LEAVE', 'PROBATION', 'RESIGNED', 'TERMINATED']).default('ACTIVE'),
});

const updateEmployeeSchema = createEmployeeSchema.partial();

// Generate employee code
async function generateEmployeeCode(prisma: any): Promise<string> {
  const lastEmployee = await prisma.employee.findFirst({
    orderBy: { id: 'desc' },
    select: { code: true },
  });

  let nextNum = 1;
  if (lastEmployee?.code) {
    const match = lastEmployee.code.match(/EMP-(\d+)/);
    if (match) {
      nextNum = parseInt(match[1]) + 1;
    }
  }

  return `EMP-${nextNum.toString().padStart(4, '0')}`;
}

// GET /employees - List all employees
router.get('/', async (req: Request, res: Response) => {
  try {
    const prisma = req.prisma!;
    const { search, status, department, designationId, isActive } = req.query;

    const where: any = {};

    if (search) {
      where.OR = [
        { fullName: { contains: search as string, mode: 'insensitive' } },
        { code: { contains: search as string, mode: 'insensitive' } },
        { cnic: { contains: search as string, mode: 'insensitive' } },
        { phone: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = status as string;
    }

    if (department) {
      where.department = department as string;
    }

    if (designationId) {
      where.designationId = parseInt(designationId as string);
    }

    if (isActive === 'true') {
      where.status = { in: ['ACTIVE', 'PROBATION', 'ON_LEAVE'] };
    }

    const employees = await prisma.employee.findMany({
      where,
      orderBy: { fullName: 'asc' },
      include: {
        designation: {
          select: { id: true, code: true, name: true },
        },
      },
    });

    res.json({ data: employees });
  } catch (error) {
    logger.error('Error fetching employees:', error);
    res.status(500).json({ error: 'Failed to fetch employees' });
  }
});

// GET /employees/lookup - Lightweight list for dropdowns
router.get('/lookup', async (req: Request, res: Response) => {
  try {
    const prisma = req.prisma!;

    const employees = await prisma.employee.findMany({
      where: { status: { in: ['ACTIVE', 'PROBATION', 'ON_LEAVE'] } },
      select: {
        id: true,
        code: true,
        fullName: true,
        department: true,
        designation: {
          select: { id: true, name: true },
        },
      },
      orderBy: { fullName: 'asc' },
    });

    res.json({ data: employees });
  } catch (error) {
    logger.error('Error fetching employee lookup:', error);
    res.status(500).json({ error: 'Failed to fetch employees' });
  }
});

// GET /employees/stats - Get employee statistics
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const prisma = req.prisma!;

    const [total, active, onLeave, probation, resigned] = await Promise.all([
      prisma.employee.count(),
      prisma.employee.count({ where: { status: 'ACTIVE' } }),
      prisma.employee.count({ where: { status: 'ON_LEAVE' } }),
      prisma.employee.count({ where: { status: 'PROBATION' } }),
      prisma.employee.count({ where: { status: 'RESIGNED' } }),
    ]);

    res.json({
      total,
      active,
      onLeave,
      probation,
      resigned,
    });
  } catch (error) {
    logger.error('Error fetching employee stats:', error);
    res.status(500).json({ error: 'Failed to fetch employee stats' });
  }
});

// GET /employees/:id - Get single employee with details
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const prisma = req.prisma!;
    const id = req.params.id as string;

    const employee = await prisma.employee.findUnique({
      where: { id: parseInt(id) },
      include: {
        designation: true,
        attendances: {
          orderBy: { date: 'desc' },
          take: 30,
        },
        leaves: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: { leaveType: true },
        },
        salaries: {
          orderBy: [{ year: 'desc' }, { month: 'desc' }],
          take: 12,
        },
      },
    });

    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    res.json({ data: employee });
  } catch (error) {
    logger.error('Error fetching employee:', error);
    res.status(500).json({ error: 'Failed to fetch employee' });
  }
});

// POST /employees - Create new employee
router.post('/', async (req: Request, res: Response) => {
  try {
    const prisma = req.prisma!;
    const data = createEmployeeSchema.parse(req.body);

    // Generate code if not provided
    const code = data.code || await generateEmployeeCode(prisma);

    // Check for duplicate code
    const existingCode = await prisma.employee.findUnique({
      where: { code },
    });

    if (existingCode) {
      return res.status(400).json({ error: `Employee code "${code}" already exists` });
    }

    // Check for duplicate CNIC if provided
    if (data.cnic) {
      const existingCnic = await prisma.employee.findUnique({
        where: { cnic: data.cnic },
      });
      if (existingCnic) {
        return res.status(400).json({ error: `CNIC "${data.cnic}" already exists` });
      }
    }

    const employee = await prisma.employee.create({
      data: {
        code,
        fullName: data.fullName,
        fullNameUrdu: data.fullNameUrdu,
        fatherName: data.fatherName,
        cnic: data.cnic || null,
        phone: data.phone,
        emergencyPhone: data.emergencyPhone,
        email: data.email || null,
        address: data.address,
        city: data.city,
        designationId: data.designationId,
        department: data.department,
        joiningDate: new Date(data.joiningDate),
        probationEndDate: data.probationEndDate ? new Date(data.probationEndDate) : null,
        salaryType: data.salaryType as any,
        baseSalary: data.baseSalary,
        hourlyRate: data.hourlyRate,
        dailyRate: data.dailyRate,
        overtimeRate: data.overtimeRate,
        bankName: data.bankName,
        bankAccountNo: data.bankAccountNo,
        bankBranch: data.bankBranch,
        status: data.status as any,
      },
      include: {
        designation: { select: { id: true, code: true, name: true } },
      },
    });

    logger.info(`Created employee: ${employee.code} - ${employee.fullName}`);
    res.status(201).json({ message: 'Employee created successfully', data: employee });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    logger.error('Error creating employee:', error);
    res.status(500).json({ error: 'Failed to create employee' });
  }
});

// PUT /employees/:id - Update employee
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const prisma = req.prisma!;
    const id = req.params.id as string;
    const data = updateEmployeeSchema.parse(req.body);

    const existing = await prisma.employee.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Check for duplicate code if code is being changed
    if (data.code && data.code !== existing.code) {
      const codeExists = await prisma.employee.findUnique({
        where: { code: data.code },
      });
      if (codeExists) {
        return res.status(400).json({ error: `Employee code "${data.code}" already exists` });
      }
    }

    // Check for duplicate CNIC if CNIC is being changed
    if (data.cnic && data.cnic !== existing.cnic) {
      const cnicExists = await prisma.employee.findUnique({
        where: { cnic: data.cnic },
      });
      if (cnicExists) {
        return res.status(400).json({ error: `CNIC "${data.cnic}" already exists` });
      }
    }

    const employee = await prisma.employee.update({
      where: { id: parseInt(id) },
      data: {
        ...(data.code && { code: data.code }),
        ...(data.fullName && { fullName: data.fullName }),
        ...(data.fullNameUrdu !== undefined && { fullNameUrdu: data.fullNameUrdu }),
        ...(data.fatherName !== undefined && { fatherName: data.fatherName }),
        ...(data.cnic !== undefined && { cnic: data.cnic || null }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.emergencyPhone !== undefined && { emergencyPhone: data.emergencyPhone }),
        ...(data.email !== undefined && { email: data.email || null }),
        ...(data.address !== undefined && { address: data.address }),
        ...(data.city !== undefined && { city: data.city }),
        ...(data.designationId !== undefined && { designationId: data.designationId }),
        ...(data.department !== undefined && { department: data.department }),
        ...(data.joiningDate && { joiningDate: new Date(data.joiningDate) }),
        ...(data.probationEndDate !== undefined && { probationEndDate: data.probationEndDate ? new Date(data.probationEndDate) : null }),
        ...(data.salaryType && { salaryType: data.salaryType as any }),
        ...(data.baseSalary !== undefined && { baseSalary: data.baseSalary }),
        ...(data.hourlyRate !== undefined && { hourlyRate: data.hourlyRate }),
        ...(data.dailyRate !== undefined && { dailyRate: data.dailyRate }),
        ...(data.overtimeRate !== undefined && { overtimeRate: data.overtimeRate }),
        ...(data.bankName !== undefined && { bankName: data.bankName }),
        ...(data.bankAccountNo !== undefined && { bankAccountNo: data.bankAccountNo }),
        ...(data.bankBranch !== undefined && { bankBranch: data.bankBranch }),
        ...(data.status && { status: data.status as any }),
      },
      include: {
        designation: { select: { id: true, code: true, name: true } },
      },
    });

    logger.info(`Updated employee: ${employee.code}`);
    res.json({ message: 'Employee updated successfully', data: employee });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    logger.error('Error updating employee:', error);
    res.status(500).json({ error: 'Failed to update employee' });
  }
});

// PUT /employees/:id/status - Update employee status
router.put('/:id/status', async (req: Request, res: Response) => {
  try {
    const prisma = req.prisma!;
    const id = req.params.id as string;
    const { status, resignationDate, lastWorkingDate } = req.body;

    const existing = await prisma.employee.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const updateData: any = { status };

    if (status === 'RESIGNED' || status === 'TERMINATED') {
      if (resignationDate) updateData.resignationDate = new Date(resignationDate);
      if (lastWorkingDate) updateData.lastWorkingDate = new Date(lastWorkingDate);
    }

    const employee = await prisma.employee.update({
      where: { id: parseInt(id) },
      data: updateData,
    });

    logger.info(`Updated employee status: ${employee.code} -> ${status}`);
    res.json({ message: 'Employee status updated successfully', data: employee });
  } catch (error) {
    logger.error('Error updating employee status:', error);
    res.status(500).json({ error: 'Failed to update employee status' });
  }
});

// DELETE /employees/:id - Soft delete (deactivate) employee
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const prisma = req.prisma!;
    const id = req.params.id as string;

    const existing = await prisma.employee.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Soft delete - set status to TERMINATED
    await prisma.employee.update({
      where: { id: parseInt(id) },
      data: {
        status: 'TERMINATED',
        lastWorkingDate: new Date(),
      },
    });

    logger.info(`Terminated employee: ${existing.code}`);
    res.json({ message: 'Employee terminated successfully' });
  } catch (error) {
    logger.error('Error deleting employee:', error);
    res.status(500).json({ error: 'Failed to delete employee' });
  }
});

export default router;
