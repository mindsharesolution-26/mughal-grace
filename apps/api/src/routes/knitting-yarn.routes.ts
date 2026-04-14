import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { requirePermission } from '../middleware/rbac';
import { validateBody, validateParams } from '../middleware/validate';
import { AppError } from '../middleware/error-handler';

export const knittingYarnRouter = Router();

// ============================================
// KNITTING YARN CRUD
// ============================================

// Validation schemas
const createKnittingYarnSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  brandId: z.number().int().positive('Brand is required'),
  departmentId: z.number().int().positive('Department is required'),
  gradeId: z.number().int().positive('Grade is required'),
  groupId: z.number().int().positive('Group is required'),
  colorId: z.number().int().positive('Color is required'),
  description: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

const updateKnittingYarnSchema = createKnittingYarnSchema.partial();

const idParamSchema = z.object({
  id: z.string().regex(/^\d+$/, 'Invalid ID format').transform(Number),
});

// Include relations for all knitting yarn queries
const knittingYarnInclude = {
  brand: { select: { id: true, code: true, name: true } },
  department: { select: { id: true, code: true, name: true } },
  grade: { select: { id: true, code: true, name: true } },
  group: { select: { id: true, code: true, name: true } },
  color: { select: { id: true, code: true, name: true, hexCode: true } },
};

// GET /yarn/knitting - List all knitting yarns
knittingYarnRouter.get('/', requirePermission('yarn:read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const knittingYarns = await req.prisma!.knittingYarn.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: knittingYarnInclude,
    });
    res.json({ data: knittingYarns });
  } catch (error) {
    next(error);
  }
});

// GET /yarn/knitting/lookup - Lightweight lookup for dropdowns
knittingYarnRouter.get('/lookup', requirePermission('yarn:read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const knittingYarns = await req.prisma!.knittingYarn.findMany({
      where: { isActive: true },
      select: {
        id: true,
        code: true,
        name: true,
      },
      orderBy: { name: 'asc' },
    });
    res.json({ data: knittingYarns });
  } catch (error) {
    next(error);
  }
});

// GET /yarn/knitting/:id - Get single knitting yarn
knittingYarnRouter.get('/:id', requirePermission('yarn:read'), validateParams(idParamSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params as unknown as { id: number };
    const knittingYarn = await req.prisma!.knittingYarn.findUnique({
      where: { id },
      include: knittingYarnInclude,
    });
    if (!knittingYarn) {
      throw AppError.notFound('Knitting yarn');
    }
    res.json({ data: knittingYarn });
  } catch (error) {
    next(error);
  }
});

// POST /yarn/knitting - Create knitting yarn
knittingYarnRouter.post('/', requirePermission('yarn:write'), validateBody(createKnittingYarnSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = req.body;

    // Validate all foreign keys exist
    const [brand, department, grade, group, color] = await Promise.all([
      req.prisma!.brand.findUnique({ where: { id: data.brandId } }),
      req.prisma!.department.findUnique({ where: { id: data.departmentId } }),
      req.prisma!.grade.findUnique({ where: { id: data.gradeId } }),
      req.prisma!.group.findUnique({ where: { id: data.groupId } }),
      req.prisma!.color.findUnique({ where: { id: data.colorId } }),
    ]);

    if (!brand) throw AppError.badRequest('Brand not found');
    if (!department) throw AppError.badRequest('Department not found');
    if (!grade) throw AppError.badRequest('Grade not found');
    if (!group) throw AppError.badRequest('Group not found');
    if (!color) throw AppError.badRequest('Color not found');

    // Validate group belongs to department
    if (group.departmentId !== data.departmentId) {
      throw AppError.badRequest('Group does not belong to selected department');
    }

    // Auto-generate code: KY-0001, KY-0002, etc.
    const lastYarn = await req.prisma!.knittingYarn.findFirst({
      where: { code: { startsWith: 'KY-' } },
      orderBy: { code: 'desc' },
    });

    let nextNumber = 1;
    if (lastYarn && lastYarn.code) {
      const match = lastYarn.code.match(/KY-(\d+)/);
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }
    const code = `KY-${String(nextNumber).padStart(4, '0')}`;

    const knittingYarn = await req.prisma!.knittingYarn.create({
      data: {
        code,
        name: data.name,
        brandId: data.brandId,
        departmentId: data.departmentId,
        gradeId: data.gradeId,
        groupId: data.groupId,
        colorId: data.colorId,
        description: data.description || null,
        notes: data.notes || null,
        isActive: data.isActive ?? true,
        createdBy: req.user?.userId,
      },
      include: knittingYarnInclude,
    });

    res.status(201).json({ message: 'Knitting yarn created', data: knittingYarn });
  } catch (error) {
    next(error);
  }
});

// PUT /yarn/knitting/:id - Update knitting yarn
knittingYarnRouter.put('/:id', requirePermission('yarn:write'), validateParams(idParamSchema), validateBody(updateKnittingYarnSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params as unknown as { id: number };
    const data = req.body;

    const existing = await req.prisma!.knittingYarn.findUnique({ where: { id } });
    if (!existing) {
      throw AppError.notFound('Knitting yarn');
    }

    // Validate foreign keys if provided
    if (data.brandId) {
      const brand = await req.prisma!.brand.findUnique({ where: { id: data.brandId } });
      if (!brand) throw AppError.badRequest('Brand not found');
    }

    if (data.departmentId) {
      const department = await req.prisma!.department.findUnique({ where: { id: data.departmentId } });
      if (!department) throw AppError.badRequest('Department not found');
    }

    if (data.gradeId) {
      const grade = await req.prisma!.grade.findUnique({ where: { id: data.gradeId } });
      if (!grade) throw AppError.badRequest('Grade not found');
    }

    if (data.groupId) {
      const group = await req.prisma!.group.findUnique({ where: { id: data.groupId } });
      if (!group) throw AppError.badRequest('Group not found');

      // Validate group belongs to department
      const effectiveDepartmentId = data.departmentId || existing.departmentId;
      if (group.departmentId !== effectiveDepartmentId) {
        throw AppError.badRequest('Group does not belong to selected department');
      }
    }

    if (data.colorId) {
      const color = await req.prisma!.color.findUnique({ where: { id: data.colorId } });
      if (!color) throw AppError.badRequest('Color not found');
    }

    const knittingYarn = await req.prisma!.knittingYarn.update({
      where: { id },
      data: {
        name: data.name,
        brandId: data.brandId,
        departmentId: data.departmentId,
        gradeId: data.gradeId,
        groupId: data.groupId,
        colorId: data.colorId,
        description: data.description,
        notes: data.notes,
        isActive: data.isActive,
        updatedBy: req.user?.userId,
      },
      include: knittingYarnInclude,
    });

    res.json({ message: 'Knitting yarn updated', data: knittingYarn });
  } catch (error) {
    next(error);
  }
});

// DELETE /yarn/knitting/:id - Soft delete knitting yarn
knittingYarnRouter.delete('/:id', requirePermission('yarn:write'), validateParams(idParamSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params as unknown as { id: number };

    const existing = await req.prisma!.knittingYarn.findUnique({ where: { id } });
    if (!existing) {
      throw AppError.notFound('Knitting yarn');
    }

    // Soft delete by setting isActive to false
    await req.prisma!.knittingYarn.update({
      where: { id },
      data: {
        isActive: false,
        updatedBy: req.user?.userId,
      },
    });

    res.json({ message: 'Knitting yarn deleted' });
  } catch (error) {
    next(error);
  }
});
