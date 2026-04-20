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

const createProductSchema = z.object({
  name: z.string().min(2, 'Name is required').max(255),
  articleNumber: z.string().max(50).optional(),
  departmentId: z.number().int().positive().optional(),
  groupId: z.number().int().positive().optional(),
  materialId: z.number().int().positive().optional(),
  brandId: z.number().int().positive().optional(),
  colorId: z.number().int().positive().optional(),
  fabricSizeId: z.number().int().positive().optional(),
  description: z.string().optional(),
  unitPrice: z.number().positive().optional(),
  images: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

const updateProductSchema = createProductSchema.partial();

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
productsRouter.get('/', requirePermission('products:read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const products = await req.prisma!.product.findMany({
      include: {
        department: { select: { id: true, code: true, name: true } },
        group: { select: { id: true, code: true, name: true } },
        material: { select: { id: true, code: true, name: true } },
        brand: { select: { id: true, code: true, name: true } },
        color: { select: { id: true, code: true, name: true } },
        fabricSize: { select: { id: true, code: true, displayName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ data: products });
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

    const product = await req.prisma!.product.create({
      data: {
        name: req.body.name,
        articleNumber,
        qrCode,
        departmentId: req.body.departmentId || null,
        groupId: req.body.groupId || null,
        materialId: req.body.materialId || null,
        brandId: req.body.brandId || null,
        colorId: req.body.colorId || null,
        fabricSizeId: req.body.fabricSizeId || null,
        description: req.body.description || null,
        unitPrice: req.body.unitPrice || null,
        images: req.body.images || [],
        isActive: req.body.isActive ?? true,
      },
      include: {
        department: { select: { id: true, code: true, name: true } },
        group: { select: { id: true, code: true, name: true } },
        material: { select: { id: true, code: true, name: true } },
        brand: { select: { id: true, code: true, name: true } },
        color: { select: { id: true, code: true, name: true } },
        fabricSize: { select: { id: true, code: true, displayName: true } },
      },
    });

    res.status(201).json({ message: 'Product created', data: product });
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
    if (req.body.articleNumber !== undefined) updateData.articleNumber = req.body.articleNumber || null;
    if (req.body.departmentId !== undefined) updateData.departmentId = req.body.departmentId || null;
    if (req.body.groupId !== undefined) updateData.groupId = req.body.groupId || null;
    if (req.body.materialId !== undefined) updateData.materialId = req.body.materialId || null;
    if (req.body.brandId !== undefined) updateData.brandId = req.body.brandId || null;
    if (req.body.colorId !== undefined) updateData.colorId = req.body.colorId || null;
    if (req.body.fabricSizeId !== undefined) updateData.fabricSizeId = req.body.fabricSizeId || null;
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

// ============================================
// PRODUCTION LOGS (Stock Movements from Production)
// ============================================

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
