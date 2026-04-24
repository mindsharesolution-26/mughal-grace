import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { randomBytes } from 'crypto';
import { authMiddleware } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenant';
import { requirePermission } from '../middleware/rbac';
import { validateBody, validateParams } from '../middleware/validate';
import { AppError } from '../middleware/error-handler';

export const productsRouter: Router = Router();

// Generate unique QR code for product
function generateQRCode(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = randomBytes(3).toString('hex').toUpperCase();
  return `MG-${timestamp}-${random}`;
}

// Generate auto-incrementing article number
async function generateArticleNumber(prisma: any): Promise<string> {
  // Find the last product with an article number that starts with ART-
  const lastProduct = await prisma.product.findFirst({
    where: {
      articleNumber: {
        startsWith: 'ART-',
      },
    },
    orderBy: {
      articleNumber: 'desc',
    },
    select: {
      articleNumber: true,
    },
  });

  let nextNum = 1;
  if (lastProduct && lastProduct.articleNumber) {
    const match = lastProduct.articleNumber.match(/ART-(\d+)/);
    if (match) {
      nextNum = parseInt(match[1], 10) + 1;
    }
  }

  return `ART-${String(nextNum).padStart(4, '0')}`;
}

// Apply authentication and tenant middleware
productsRouter.use(authMiddleware);
productsRouter.use(tenantMiddleware);

// ============================================
// VALIDATION SCHEMAS
// ============================================

// Base schema without refinements (needed for .partial())
const productBaseSchema = z.object({
  name: z.string().min(2, 'Name is required').max(255),
  type: z.enum(['FABRIC', 'GOODS']).optional().default('GOODS'),
  articleNumber: z.string().max(50).optional(),
  departmentId: z.number().int().positive().optional(),
  groupId: z.number().int().positive().optional(),
  materialId: z.number().int().positive().optional(),
  brandId: z.number().int().positive().optional(),
  colorId: z.number().int().positive().optional(),
  fabricSizeId: z.number().int().positive().optional(),
  // Fabric Master Data Reference (required for FABRIC type)
  fabricId: z.number().int().positive().optional(),
  // Fabric/Production fields
  machineId: z.number().int().positive().optional(),
  gradeId: z.number().int().positive().optional(),
  fabricTypeId: z.number().int().positive().optional(),
  fabricCompositionId: z.number().int().positive().optional(),
  gsm: z.number().positive().optional(),
  width: z.number().positive().optional(),
  widthUnit: z.enum(['inch', 'cm']).optional(),
  isTube: z.boolean().optional(),
  // Other fields
  description: z.string().optional(),
  unitPrice: z.number().positive().optional(),
  images: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

// Create schema with refinement for fabricId validation
const createProductSchema = productBaseSchema.refine(
  (data) => {
    // If type is FABRIC, fabricId is required
    if (data.type === 'FABRIC' && !data.fabricId) {
      return false;
    }
    return true;
  },
  {
    message: 'Fabric Template (fabricId) is required for Fabric products',
    path: ['fabricId'],
  }
);

// Update schema - partial of base schema (no refine needed for updates)
const updateProductSchema = productBaseSchema.partial();

const idParamSchema = z.object({
  id: z.string().regex(/^\d+$/, 'Invalid ID format').transform(Number),
});

// ============================================
// PRODUCTS CRUD
// ============================================

// GET /products/lookup - Lightweight lookup for dropdowns
productsRouter.get('/lookup', requirePermission('products:read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const products = await req.prisma!.product.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        articleNumber: true,
        currentStock: true,
      },
      orderBy: { name: 'asc' },
    });
    res.json({ data: products });
  } catch (error) {
    next(error);
  }
});

// GET /products - List all products
// Query params: type=FABRIC|GOODS, status=PENDING|APPROVED|REJECTED, showAll=true
productsRouter.get('/', requirePermission('products:read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, showAll, type } = req.query;
    const user = (req as any).user;

    // Build where clause
    const where: any = {};

    // Filter by product type (FABRIC or GOODS)
    if (type && (type === 'FABRIC' || type === 'GOODS')) {
      where.type = type;
    }

    // Filter by approval status
    if (status) {
      where.approvalStatus = status;
    } else if (showAll !== 'true') {
      // By default, only show approved products unless user is admin/super_admin
      const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
      if (!isAdmin) {
        where.approvalStatus = 'APPROVED';
      }
    }

    const products = await req.prisma!.product.findMany({
      where,
      include: {
        department: { select: { id: true, code: true, name: true } },
        group: { select: { id: true, code: true, name: true } },
        material: { select: { id: true, code: true, name: true } },
        brand: { select: { id: true, code: true, name: true } },
        color: { select: { id: true, code: true, name: true } },
        fabricSize: { select: { id: true, code: true, displayName: true } },
        fabric: {
          select: {
            id: true,
            code: true,
            name: true,
            gsm: true,
            width: true,
            widthUnit: true,
            isTube: true,
            machine: { select: { id: true, machineNumber: true, name: true } },
            fabricType: { select: { id: true, code: true, name: true } },
            grade: { select: { id: true, code: true, name: true } },
            color: { select: { id: true, code: true, name: true } },
          },
        },
        machine: { select: { id: true, machineNumber: true, name: true, gauge: true, diameter: true } },
        grade: { select: { id: true, code: true, name: true } },
        fabricType: { select: { id: true, code: true, name: true } },
        fabricComposition: { select: { id: true, code: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ data: products });
  } catch (error) {
    next(error);
  }
});

// ============================================
// PRODUCTION LOGS (Stock Movements from Production)
// NOTE: Must be before /:id route to avoid matching
// ============================================

// GET /products/pending-approval - List products awaiting approval (admin only)
// NOTE: Must be before /:id route to avoid matching
productsRouter.get('/pending-approval', requirePermission('products:write'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

    if (!isAdmin) {
      throw AppError.forbidden('Only admins can view pending approvals');
    }

    const products = await req.prisma!.product.findMany({
      where: { approvalStatus: 'PENDING' },
      include: {
        department: { select: { id: true, code: true, name: true } },
        group: { select: { id: true, code: true, name: true } },
        material: { select: { id: true, code: true, name: true } },
        brand: { select: { id: true, code: true, name: true } },
        color: { select: { id: true, code: true, name: true } },
        fabricSize: { select: { id: true, code: true, displayName: true } },
        fabric: {
          select: {
            id: true,
            code: true,
            name: true,
            gsm: true,
            width: true,
            widthUnit: true,
            isTube: true,
            machine: { select: { id: true, machineNumber: true, name: true } },
            fabricType: { select: { id: true, code: true, name: true } },
            grade: { select: { id: true, code: true, name: true } },
            color: { select: { id: true, code: true, name: true } },
          },
        },
        machine: { select: { id: true, machineNumber: true, name: true, gauge: true, diameter: true } },
        grade: { select: { id: true, code: true, name: true } },
        fabricType: { select: { id: true, code: true, name: true } },
        fabricComposition: { select: { id: true, code: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ data: products });
  } catch (error) {
    next(error);
  }
});

// GET /products/production-logs - Get production logs for today/date range
productsRouter.get('/production-logs', requirePermission('products:read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { date, startDate, endDate, limit = '50' } = req.query;

    // Build date filter
    let dateFilter: any = {};

    if (date) {
      // Single date filter
      const targetDate = new Date(date as string);
      targetDate.setHours(0, 0, 0, 0);
      const nextDay = new Date(targetDate);
      nextDay.setDate(nextDay.getDate() + 1);

      dateFilter = {
        gte: targetDate,
        lt: nextDay,
      };
    } else if (startDate && endDate) {
      // Date range filter
      const start = new Date(startDate as string);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate as string);
      end.setHours(23, 59, 59, 999);

      dateFilter = {
        gte: start,
        lte: end,
      };
    } else {
      // Default to today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      dateFilter = {
        gte: today,
        lt: tomorrow,
      };
    }

    // Get production stock movements
    const movements = await req.prisma!.stockMovement.findMany({
      where: {
        sourceType: 'PRODUCTION',
        createdAt: dateFilter,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            articleNumber: true,
            qrCode: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
    });

    // Calculate summary
    const totalWeight = movements.reduce((sum, m) => sum + Number(m.quantity), 0);
    const totalRolls = movements.length;

    // Group by product for summary
    const productSummary: Record<number, { product: any; weight: number; rolls: number }> = {};
    movements.forEach((m) => {
      if (!productSummary[m.productId]) {
        productSummary[m.productId] = {
          product: m.product,
          weight: 0,
          rolls: 0,
        };
      }
      productSummary[m.productId].weight += Number(m.quantity);
      productSummary[m.productId].rolls += 1;
    });

    res.json({
      data: {
        logs: movements.map((m) => ({
          id: m.id,
          rollNumber: m.referenceNumber,
          weight: Number(m.quantity),
          machine: m.notes?.replace('Machine #', '') || null,
          product: m.product,
          createdAt: m.createdAt,
        })),
        summary: {
          totalWeight: Math.round(totalWeight * 100) / 100,
          totalRolls,
          byProduct: Object.values(productSummary).map((p) => ({
            ...p.product,
            weight: Math.round(p.weight * 100) / 100,
            rolls: p.rolls,
          })),
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /products/:id - Get single product
productsRouter.get('/:id', requirePermission('products:read'), validateParams(idParamSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params as unknown as { id: number };
    const product = await req.prisma!.product.findUnique({
      where: { id },
      include: {
        department: { select: { id: true, code: true, name: true } },
        group: { select: { id: true, code: true, name: true } },
        material: { select: { id: true, code: true, name: true } },
        brand: { select: { id: true, code: true, name: true } },
        color: { select: { id: true, code: true, name: true } },
        fabricSize: { select: { id: true, code: true, displayName: true } },
        fabric: {
          select: {
            id: true,
            code: true,
            name: true,
            gsm: true,
            width: true,
            widthUnit: true,
            isTube: true,
            machine: { select: { id: true, machineNumber: true, name: true } },
            fabricType: { select: { id: true, code: true, name: true } },
            grade: { select: { id: true, code: true, name: true } },
            color: { select: { id: true, code: true, name: true } },
          },
        },
        machine: { select: { id: true, machineNumber: true, name: true, gauge: true, diameter: true } },
        grade: { select: { id: true, code: true, name: true } },
        fabricType: { select: { id: true, code: true, name: true } },
        fabricComposition: { select: { id: true, code: true, name: true } },
        stockMovements: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });
    if (!product) {
      throw AppError.notFound('Product');
    }
    res.json({ data: product });
  } catch (error) {
    next(error);
  }
});

// POST /products - Create product
productsRouter.post('/', requirePermission('products:write'), validateBody(createProductSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

    // Check article number uniqueness if provided
    if (req.body.articleNumber) {
      const existing = await req.prisma!.product.findUnique({
        where: { articleNumber: req.body.articleNumber },
      });
      if (existing) {
        throw AppError.conflict('Product with this article number already exists');
      }
    }

    // Generate unique QR code
    const qrCode = generateQRCode();

    // Auto-generate article number if not provided
    const articleNumber = req.body.articleNumber || await generateArticleNumber(req.prisma!);

    // Set approval status based on user role
    // Admins auto-approve, regular users need approval
    const approvalStatus = isAdmin ? 'APPROVED' : 'PENDING';
    const approvedBy = isAdmin ? user?.userId : null;
    const approvedAt = isAdmin ? new Date() : null;

    const product = await req.prisma!.product.create({
      data: {
        name: req.body.name,
        type: req.body.type || 'GOODS',
        articleNumber,
        qrCode,
        departmentId: req.body.departmentId || null,
        groupId: req.body.groupId || null,
        materialId: req.body.materialId || null,
        brandId: req.body.brandId || null,
        colorId: req.body.colorId || null,
        fabricSizeId: req.body.fabricSizeId || null,
        // Fabric Master Data Reference (required for FABRIC type)
        fabricId: req.body.fabricId || null,
        // Fabric/Production fields
        machineId: req.body.machineId || null,
        gradeId: req.body.gradeId || null,
        fabricTypeId: req.body.fabricTypeId || null,
        fabricCompositionId: req.body.fabricCompositionId || null,
        gsm: req.body.gsm || null,
        width: req.body.width || null,
        widthUnit: req.body.widthUnit || 'inch',
        isTube: req.body.isTube ?? false,
        // Other fields
        description: req.body.description || null,
        unitPrice: req.body.unitPrice || null,
        images: req.body.images || [],
        isActive: req.body.isActive ?? true,
        // Approval workflow
        approvalStatus,
        approvedBy,
        approvedAt,
        createdBy: user?.userId || null,
      },
      include: {
        department: { select: { id: true, code: true, name: true } },
        group: { select: { id: true, code: true, name: true } },
        material: { select: { id: true, code: true, name: true } },
        brand: { select: { id: true, code: true, name: true } },
        color: { select: { id: true, code: true, name: true } },
        fabricSize: { select: { id: true, code: true, displayName: true } },
        fabric: {
          select: {
            id: true,
            code: true,
            name: true,
            gsm: true,
            width: true,
            widthUnit: true,
            isTube: true,
            machine: { select: { id: true, machineNumber: true, name: true } },
            fabricType: { select: { id: true, code: true, name: true } },
            grade: { select: { id: true, code: true, name: true } },
            color: { select: { id: true, code: true, name: true } },
          },
        },
        machine: { select: { id: true, machineNumber: true, name: true, gauge: true, diameter: true } },
        grade: { select: { id: true, code: true, name: true } },
        fabricType: { select: { id: true, code: true, name: true } },
        fabricComposition: { select: { id: true, code: true, name: true } },
      },
    });

    const message = isAdmin
      ? 'Product created and approved'
      : 'Product created and submitted for approval';

    res.status(201).json({ message, data: product });
  } catch (error) {
    next(error);
  }
});

// PUT /products/:id - Update product
productsRouter.put('/:id', requirePermission('products:write'), validateParams(idParamSchema), validateBody(updateProductSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params as unknown as { id: number };

    // Check if exists
    const existing = await req.prisma!.product.findUnique({ where: { id } });
    if (!existing) {
      throw AppError.notFound('Product');
    }

    // Check article number uniqueness if changing
    if (req.body.articleNumber && req.body.articleNumber !== existing.articleNumber) {
      const articleExists = await req.prisma!.product.findUnique({
        where: { articleNumber: req.body.articleNumber },
      });
      if (articleExists) {
        throw AppError.conflict('Product with this article number already exists');
      }
    }

    // Build update data
    const updateData: any = {};
    if (req.body.name !== undefined) updateData.name = req.body.name;
    if (req.body.type !== undefined) updateData.type = req.body.type;
    if (req.body.articleNumber !== undefined) updateData.articleNumber = req.body.articleNumber || null;
    if (req.body.departmentId !== undefined) updateData.departmentId = req.body.departmentId || null;
    if (req.body.groupId !== undefined) updateData.groupId = req.body.groupId || null;
    if (req.body.materialId !== undefined) updateData.materialId = req.body.materialId || null;
    if (req.body.brandId !== undefined) updateData.brandId = req.body.brandId || null;
    if (req.body.colorId !== undefined) updateData.colorId = req.body.colorId || null;
    if (req.body.fabricSizeId !== undefined) updateData.fabricSizeId = req.body.fabricSizeId || null;
    // Fabric Master Data Reference
    if (req.body.fabricId !== undefined) updateData.fabricId = req.body.fabricId || null;
    // Fabric/Production fields
    if (req.body.machineId !== undefined) updateData.machineId = req.body.machineId || null;
    if (req.body.gradeId !== undefined) updateData.gradeId = req.body.gradeId || null;
    if (req.body.fabricTypeId !== undefined) updateData.fabricTypeId = req.body.fabricTypeId || null;
    if (req.body.fabricCompositionId !== undefined) updateData.fabricCompositionId = req.body.fabricCompositionId || null;
    if (req.body.gsm !== undefined) updateData.gsm = req.body.gsm || null;
    if (req.body.width !== undefined) updateData.width = req.body.width || null;
    if (req.body.widthUnit !== undefined) updateData.widthUnit = req.body.widthUnit || 'inch';
    if (req.body.isTube !== undefined) updateData.isTube = req.body.isTube;
    // Other fields
    if (req.body.description !== undefined) updateData.description = req.body.description || null;
    if (req.body.unitPrice !== undefined) updateData.unitPrice = req.body.unitPrice || null;
    if (req.body.images !== undefined) updateData.images = req.body.images;
    if (req.body.isActive !== undefined) updateData.isActive = req.body.isActive;

    const product = await req.prisma!.product.update({
      where: { id },
      data: updateData,
      include: {
        department: { select: { id: true, code: true, name: true } },
        group: { select: { id: true, code: true, name: true } },
        material: { select: { id: true, code: true, name: true } },
        brand: { select: { id: true, code: true, name: true } },
        color: { select: { id: true, code: true, name: true } },
        fabricSize: { select: { id: true, code: true, displayName: true } },
        fabric: {
          select: {
            id: true,
            code: true,
            name: true,
            gsm: true,
            width: true,
            widthUnit: true,
            isTube: true,
            machine: { select: { id: true, machineNumber: true, name: true } },
            fabricType: { select: { id: true, code: true, name: true } },
            grade: { select: { id: true, code: true, name: true } },
            color: { select: { id: true, code: true, name: true } },
          },
        },
        machine: { select: { id: true, machineNumber: true, name: true, gauge: true, diameter: true } },
        grade: { select: { id: true, code: true, name: true } },
        fabricType: { select: { id: true, code: true, name: true } },
        fabricComposition: { select: { id: true, code: true, name: true } },
      },
    });

    res.json({ message: 'Product updated', data: product });
  } catch (error) {
    next(error);
  }
});

// DELETE /products/:id - Soft delete (set inactive)
productsRouter.delete('/:id', requirePermission('products:write'), validateParams(idParamSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params as unknown as { id: number };

    const existing = await req.prisma!.product.findUnique({ where: { id } });
    if (!existing) {
      throw AppError.notFound('Product');
    }

    await req.prisma!.product.update({
      where: { id },
      data: { isActive: false },
    });

    res.json({ message: 'Product deactivated' });
  } catch (error) {
    next(error);
  }
});

// ============================================
// PRODUCT APPROVAL WORKFLOW
// ============================================

const approvalSchema = z.object({
  rejectionReason: z.string().optional(),
});

// POST /products/:id/approve - Approve a pending product
productsRouter.post('/:id/approve', requirePermission('products:write'), validateParams(idParamSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params as unknown as { id: number };
    const user = (req as any).user;
    const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

    if (!isAdmin) {
      throw AppError.forbidden('Only admins can approve products');
    }

    const existing = await req.prisma!.product.findUnique({ where: { id } });
    if (!existing) {
      throw AppError.notFound('Product');
    }

    if (existing.approvalStatus === 'APPROVED') {
      throw AppError.badRequest('Product is already approved');
    }

    const product = await req.prisma!.product.update({
      where: { id },
      data: {
        approvalStatus: 'APPROVED',
        approvedBy: user?.userId,
        approvedAt: new Date(),
        rejectionReason: null,
      },
      include: {
        department: { select: { id: true, code: true, name: true } },
        group: { select: { id: true, code: true, name: true } },
        fabric: {
          select: {
            id: true,
            code: true,
            name: true,
            gsm: true,
            width: true,
            widthUnit: true,
            isTube: true,
            machine: { select: { id: true, machineNumber: true, name: true } },
            fabricType: { select: { id: true, code: true, name: true } },
            grade: { select: { id: true, code: true, name: true } },
            color: { select: { id: true, code: true, name: true } },
          },
        },
        machine: { select: { id: true, machineNumber: true, name: true } },
      },
    });

    res.json({ message: 'Product approved', data: product });
  } catch (error) {
    next(error);
  }
});

// POST /products/:id/reject - Reject a pending product
productsRouter.post('/:id/reject', requirePermission('products:write'), validateParams(idParamSchema), validateBody(approvalSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params as unknown as { id: number };
    const user = (req as any).user;
    const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

    if (!isAdmin) {
      throw AppError.forbidden('Only admins can reject products');
    }

    const existing = await req.prisma!.product.findUnique({ where: { id } });
    if (!existing) {
      throw AppError.notFound('Product');
    }

    if (existing.approvalStatus === 'REJECTED') {
      throw AppError.badRequest('Product is already rejected');
    }

    const product = await req.prisma!.product.update({
      where: { id },
      data: {
        approvalStatus: 'REJECTED',
        approvedBy: user?.userId,
        approvedAt: new Date(),
        rejectionReason: req.body.rejectionReason || null,
      },
      include: {
        department: { select: { id: true, code: true, name: true } },
        group: { select: { id: true, code: true, name: true } },
        fabric: {
          select: {
            id: true,
            code: true,
            name: true,
            gsm: true,
            width: true,
            widthUnit: true,
            isTube: true,
            machine: { select: { id: true, machineNumber: true, name: true } },
            fabricType: { select: { id: true, code: true, name: true } },
            grade: { select: { id: true, code: true, name: true } },
            color: { select: { id: true, code: true, name: true } },
          },
        },
        machine: { select: { id: true, machineNumber: true, name: true } },
      },
    });

    res.json({ message: 'Product rejected', data: product });
  } catch (error) {
    next(error);
  }
});

// ============================================
// STOCK MOVEMENTS
// ============================================

const createStockMovementSchema = z.object({
  productId: z.number().int().positive('Product is required'),
  type: z.enum(['IN', 'OUT']),
  quantity: z.number().positive('Quantity must be positive'),
  referenceNumber: z.string().max(50).optional(),
  sourceType: z.string().max(50).optional(),
  destinationType: z.string().max(50).optional(),
  notes: z.string().optional(),
});

// POST /products/stock-movement - Record stock movement
productsRouter.post('/stock-movement', requirePermission('products:write'), validateBody(createStockMovementSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { productId, type, quantity, referenceNumber, sourceType, destinationType, notes } = req.body;

    // Get current product
    const product = await req.prisma!.product.findUnique({
      where: { id: productId },
    });
    if (!product) {
      throw AppError.notFound('Product');
    }

    // Check if enough stock for OUT movement
    if (type === 'OUT') {
      const currentStock = Number(product.currentStock);
      if (currentStock < quantity) {
        throw AppError.badRequest(`Insufficient stock. Current stock: ${currentStock}`);
      }
    }

    // Create movement and update stock in a transaction
    const result = await req.prisma!.$transaction(async (tx) => {
      // Create stock movement
      const movement = await tx.stockMovement.create({
        data: {
          productId,
          type,
          quantity,
          referenceNumber,
          sourceType,
          destinationType,
          notes,
          createdBy: (req as any).user?.userId,
        },
      });

      // Update product stock
      const newStock = type === 'IN'
        ? Number(product.currentStock) + quantity
        : Number(product.currentStock) - quantity;

      const updatedProduct = await tx.product.update({
        where: { id: productId },
        data: { currentStock: newStock },
      });

      return { movement, product: updatedProduct };
    });

    res.status(201).json({
      message: `Stock ${type === 'IN' ? 'received' : 'issued'} successfully`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

// GET /products/:id/stock-history - Get stock movement history
productsRouter.get('/:id/stock-history', requirePermission('products:read'), validateParams(idParamSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params as unknown as { id: number };

    const product = await req.prisma!.product.findUnique({ where: { id } });
    if (!product) {
      throw AppError.notFound('Product');
    }

    const movements = await req.prisma!.stockMovement.findMany({
      where: { productId: id },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ data: movements });
  } catch (error) {
    next(error);
  }
});

// ============================================
// PRODUCT LEDGER
// ============================================

// GET /products/search-by-qr/:qrCode - Find product by QR code
productsRouter.get('/search-by-qr/:qrCode', requirePermission('products:read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const qrCode = req.params.qrCode as string;

    const product = await req.prisma!.product.findUnique({
      where: { qrCode },
      select: {
        id: true,
        name: true,
        articleNumber: true,
        qrCode: true,
        currentStock: true,
        department: { select: { id: true, name: true } },
        group: { select: { id: true, name: true } },
      },
    });

    if (!product) {
      throw AppError.notFound('Product with this QR code not found');
    }

    res.json({ data: product });
  } catch (error) {
    next(error);
  }
});

// GET /products/:id/ledger - Get product ledger with running balance
productsRouter.get('/:id/ledger', requirePermission('products:read'), validateParams(idParamSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params as unknown as { id: number };
    const { startDate, endDate, page = '1', limit = '50' } = req.query;

    // Get product
    const product = await req.prisma!.product.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        articleNumber: true,
        qrCode: true,
        currentStock: true,
        department: { select: { id: true, name: true } },
        group: { select: { id: true, name: true } },
      },
    });

    if (!product) {
      throw AppError.notFound('Product');
    }

    // Build date filter
    const dateFilter: any = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate as string);
    }
    if (endDate) {
      const end = new Date(endDate as string);
      end.setHours(23, 59, 59, 999);
      dateFilter.lte = end;
    }

    // Get all movements (ordered by date ASC for balance calculation)
    const movements = await req.prisma!.stockMovement.findMany({
      where: {
        productId: id,
        ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
      },
      orderBy: { createdAt: 'asc' },
    });

    // Calculate running balance
    let runningBalance = 0;

    // If we have a start date filter, we need to calculate the opening balance
    if (startDate) {
      const priorMovements = await req.prisma!.stockMovement.findMany({
        where: {
          productId: id,
          createdAt: { lt: new Date(startDate as string) },
        },
      });

      runningBalance = priorMovements.reduce((balance, m) => {
        return m.type === 'IN'
          ? balance + Number(m.quantity)
          : balance - Number(m.quantity);
      }, 0);
    }

    // Build ledger entries with running balance
    const entries = movements.map((m) => {
      const qtyIn = m.type === 'IN' ? Number(m.quantity) : 0;
      const qtyOut = m.type === 'OUT' ? Number(m.quantity) : 0;
      runningBalance = m.type === 'IN'
        ? runningBalance + qtyIn
        : runningBalance - qtyOut;

      // Determine reference type
      let reference = m.type === 'IN' ? 'Stock In' : 'Stock Out';
      if (m.sourceType === 'PRODUCTION' || m.destinationType === 'PRODUCTION') {
        reference = 'Production';
      } else if (m.sourceType === 'ADJUSTMENT' || m.destinationType === 'ADJUSTMENT') {
        reference = 'Adjustment';
      }

      return {
        id: m.id,
        date: m.createdAt,
        reference,
        referenceNumber: m.referenceNumber,
        qtyIn: qtyIn || null,
        qtyOut: qtyOut || null,
        balance: runningBalance,
        notes: m.notes,
        sourceType: m.sourceType,
        destinationType: m.destinationType,
      };
    });

    // Reverse for display (newest first) and apply pagination
    const reversedEntries = entries.reverse();
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const startIndex = (pageNum - 1) * limitNum;
    const paginatedEntries = reversedEntries.slice(startIndex, startIndex + limitNum);

    res.json({
      data: {
        product,
        entries: paginatedEntries,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: entries.length,
          totalPages: Math.ceil(entries.length / limitNum),
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// SEED DUMMY DATA
// ============================================

const dummyProducts = [
  { name: 'Cotton Jersey Fabric', articleNumber: 'CJF-001', description: 'Premium quality cotton jersey for t-shirts' },
  { name: 'Polyester Blend Knit', articleNumber: 'PBK-002', description: 'Durable polyester blend knit fabric' },
  { name: 'Ribbed Cotton Fabric', articleNumber: 'RCF-003', description: 'Ribbed texture cotton for collars and cuffs' },
  { name: 'French Terry Cloth', articleNumber: 'FTC-004', description: 'Soft french terry for sweatshirts' },
  { name: 'Interlock Knit Fabric', articleNumber: 'IKF-005', description: 'Double-knit interlock fabric' },
  { name: 'Pique Cotton Fabric', articleNumber: 'PCF-006', description: 'Textured pique for polo shirts' },
  { name: 'Fleece Fabric', articleNumber: 'FLF-007', description: 'Warm fleece for jackets and hoodies' },
  { name: 'Modal Jersey Fabric', articleNumber: 'MJF-008', description: 'Soft modal jersey blend' },
  { name: 'Viscose Knit Fabric', articleNumber: 'VKF-009', description: 'Lightweight viscose knit' },
  { name: 'Bamboo Cotton Blend', articleNumber: 'BCB-010', description: 'Eco-friendly bamboo cotton fabric' },
];

// POST /products/seed-dummy - Seed dummy products
productsRouter.post('/seed-dummy', requirePermission('products:write'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const createdProducts = [];

    for (const product of dummyProducts) {
      // Check if product with this article number already exists
      const existing = await req.prisma!.product.findUnique({
        where: { articleNumber: product.articleNumber },
      });

      if (!existing) {
        const qrCode = generateQRCode();
        const newProduct = await req.prisma!.product.create({
          data: {
            name: product.name,
            articleNumber: product.articleNumber,
            qrCode,
            description: product.description,
            currentStock: Math.floor(Math.random() * 500) + 50, // Random stock 50-550
            isActive: true,
          },
        });
        createdProducts.push(newProduct);
      }
    }

    res.json({
      message: `Created ${createdProducts.length} dummy products`,
      data: createdProducts,
    });
  } catch (error) {
    next(error);
  }
});

