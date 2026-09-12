import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenant';
import { logger } from '../utils/logger';

const router: Router = Router();

router.use(authMiddleware);
router.use(tenantMiddleware);

// ============ DESIGNATIONS ============

// Validation schemas
const createDesignationSchema = z.object({
  code: z.string().min(1).optional(),
  name: z.string().min(2),
  nameUrdu: z.string().optional(),
  department: z.string().optional(),
  baseSalary: z.coerce.number().min(0).optional(),
  level: z.coerce.number().min(1).default(1),
  isActive: z.boolean().default(true),
});

const updateDesignationSchema = createDesignationSchema.partial();

// Generate designation code
async function generateDesignationCode(prisma: any): Promise<string> {
  const lastDesignation = await prisma.designation.findFirst({
    orderBy: { id: 'desc' },
    select: { code: true },
  });

  let nextNum = 1;
  if (lastDesignation?.code) {
    const match = lastDesignation.code.match(/DES-(\d+)/);
    if (match) {
      nextNum = parseInt(match[1]) + 1;
    }
  }

  return `DES-${nextNum.toString().padStart(3, '0')}`;
}

// GET /designations - List all designations
router.get('/', async (req: Request, res: Response) => {
  try {
    const prisma = req.prisma!;
    const { search, isActive, department } = req.query;

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { code: { contains: search as string, mode: 'insensitive' } },
        { nameUrdu: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    if (department) {
      where.department = department as string;
    }

    const designations = await prisma.designation.findMany({
      where,
      orderBy: [{ level: 'asc' }, { name: 'asc' }],
      include: {
        _count: { select: { employees: true } },
      },
    });

    res.json({ data: designations });
  } catch (error) {
    logger.error('Error fetching designations:', error);
    res.status(500).json({ error: 'Failed to fetch designations' });
  }
});

// GET /designations/lookup - Lightweight list for dropdowns
router.get('/lookup', async (req: Request, res: Response) => {
  try {
    const prisma = req.prisma!;

    const designations = await prisma.designation.findMany({
      where: { isActive: true },
      select: {
        id: true,
        code: true,
        name: true,
        nameUrdu: true,
        department: true,
        baseSalary: true,
      },
      orderBy: [{ level: 'asc' }, { name: 'asc' }],
    });

    res.json({ data: designations });
  } catch (error) {
    logger.error('Error fetching designation lookup:', error);
    res.status(500).json({ error: 'Failed to fetch designations' });
  }
});

// GET /designations/:id - Get single designation
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const prisma = req.prisma!;
    const id = req.params.id as string;

    const designation = await prisma.designation.findUnique({
      where: { id: parseInt(id) },
      include: {
        _count: { select: { employees: true } },
      },
    });

    if (!designation) {
      return res.status(404).json({ error: 'Designation not found' });
    }

    res.json({ data: designation });
  } catch (error) {
    logger.error('Error fetching designation:', error);
    res.status(500).json({ error: 'Failed to fetch designation' });
  }
});

// POST /designations - Create new designation
router.post('/', async (req: Request, res: Response) => {
  try {
    const prisma = req.prisma!;
    const data = createDesignationSchema.parse(req.body);

    // Generate code if not provided
    const code = data.code || await generateDesignationCode(prisma);

    // Check for duplicate code
    const existing = await prisma.designation.findUnique({
      where: { code },
    });

    if (existing) {
      return res.status(400).json({ error: `Designation code "${code}" already exists` });
    }

    const designation = await prisma.designation.create({
      data: {
        code,
        name: data.name,
        nameUrdu: data.nameUrdu,
        department: data.department,
        baseSalary: data.baseSalary,
        level: data.level,
        isActive: data.isActive,
      },
    });

    logger.info(`Created designation: ${designation.code} - ${designation.name}`);
    res.status(201).json({ message: 'Designation created successfully', data: designation });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    logger.error('Error creating designation:', error);
    res.status(500).json({ error: 'Failed to create designation' });
  }
});

// PUT /designations/:id - Update designation
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const prisma = req.prisma!;
    const id = req.params.id as string;
    const data = updateDesignationSchema.parse(req.body);

    const existing = await prisma.designation.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Designation not found' });
    }

    // Check for duplicate code if code is being changed
    if (data.code && data.code !== existing.code) {
      const codeExists = await prisma.designation.findUnique({
        where: { code: data.code },
      });
      if (codeExists) {
        return res.status(400).json({ error: `Designation code "${data.code}" already exists` });
      }
    }

    const designation = await prisma.designation.update({
      where: { id: parseInt(id) },
      data: {
        ...(data.code && { code: data.code }),
        ...(data.name && { name: data.name }),
        ...(data.nameUrdu !== undefined && { nameUrdu: data.nameUrdu }),
        ...(data.department !== undefined && { department: data.department }),
        ...(data.baseSalary !== undefined && { baseSalary: data.baseSalary }),
        ...(data.level !== undefined && { level: data.level }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });

    logger.info(`Updated designation: ${designation.code}`);
    res.json({ message: 'Designation updated successfully', data: designation });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    logger.error('Error updating designation:', error);
    res.status(500).json({ error: 'Failed to update designation' });
  }
});

// DELETE /designations/:id - Soft delete (deactivate) designation
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const prisma = req.prisma!;
    const id = req.params.id as string;

    const existing = await prisma.designation.findUnique({
      where: { id: parseInt(id) },
      include: {
        _count: { select: { employees: true } },
      },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Designation not found' });
    }

    // Check if designation has employees
    if (existing._count.employees > 0) {
      return res.status(400).json({
        error: 'Cannot delete designation with active employees. Reassign employees first.',
      });
    }

    // Soft delete - just deactivate
    await prisma.designation.update({
      where: { id: parseInt(id) },
      data: { isActive: false },
    });

    logger.info(`Deactivated designation: ${existing.code}`);
    res.json({ message: 'Designation deactivated successfully' });
  } catch (error) {
    logger.error('Error deleting designation:', error);
    res.status(500).json({ error: 'Failed to delete designation' });
  }
});

export default router;
