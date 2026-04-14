import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenant';
import { requirePermission } from '../middleware/rbac';
import { validateBody, validateParams, validateQuery } from '../middleware/validate';
import { AppError } from '../middleware/error-handler';

export const inventoryRouter = Router();

// Apply authentication and tenant middleware
inventoryRouter.use(authMiddleware);
inventoryRouter.use(tenantMiddleware);

// ============================================
// SHARED VALIDATION SCHEMAS
// ============================================

const idParamSchema = z.object({
  id: z.string().regex(/^\d+$/, 'Invalid ID format').transform(Number),
});

// ============================================
// WAREHOUSES / LOCATIONS
// ============================================

const createWarehouseSchema = z.object({
  code: z.string().min(1, 'Code is required').max(50),
  name: z.string().min(1, 'Name is required').max(255),
  description: z.string().optional(),
  address: z.string().optional(),
  city: z.string().max(100).optional(),
  parentId: z.number().int().positive().optional(),
  locationType: z.enum(['WAREHOUSE', 'ZONE', 'RACK', 'BIN', 'PRODUCTION', 'QUALITY', 'QUARANTINE']).optional(),
  isDefault: z.boolean().optional(),
  allowNegative: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

const updateWarehouseSchema = createWarehouseSchema.partial();

// GET /inventory/warehouses/lookup - Lightweight lookup for dropdowns
inventoryRouter.get('/warehouses/lookup', requirePermission('inventory:read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const warehouses = await req.prisma!.warehouse.findMany({
      where: { isActive: true },
      select: {
        id: true,
        code: true,
        name: true,
        locationType: true,
        parentId: true,
      },
      orderBy: { name: 'asc' },
    });
    res.json({ data: warehouses });
  } catch (error) {
    next(error);
  }
});

// GET /inventory/warehouses - List all warehouses with hierarchy
inventoryRouter.get('/warehouses', requirePermission('inventory:read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const warehouses = await req.prisma!.warehouse.findMany({
      include: {
        parent: { select: { id: true, code: true, name: true } },
        children: { select: { id: true, code: true, name: true } },
        _count: { select: { stockLevels: true } },
      },
      orderBy: [{ parentId: 'asc' }, { name: 'asc' }],
    });
    res.json({ data: warehouses });
  } catch (error) {
    next(error);
  }
});

// GET /inventory/warehouses/:id - Get single warehouse
inventoryRouter.get('/warehouses/:id', requirePermission('inventory:read'), validateParams(idParamSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params as unknown as { id: number };
    const warehouse = await req.prisma!.warehouse.findUnique({
      where: { id },
      include: {
        parent: { select: { id: true, code: true, name: true } },
        children: {
          select: { id: true, code: true, name: true, locationType: true },
          orderBy: { name: 'asc' },
        },
        stockLevels: {
          include: {
            item: { select: { id: true, code: true, name: true } },
          },
          orderBy: { item: { name: 'asc' } },
          take: 50,
        },
      },
    });
    if (!warehouse) {
      throw AppError.notFound('Warehouse');
    }
    res.json({ data: warehouse });
  } catch (error) {
    next(error);
  }
});

// POST /inventory/warehouses - Create warehouse
inventoryRouter.post('/warehouses', requirePermission('inventory:write'), validateBody(createWarehouseSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Check code uniqueness
    const existing = await req.prisma!.warehouse.findUnique({
      where: { code: req.body.code },
    });
    if (existing) {
      throw AppError.conflict('Warehouse code already exists');
    }

    // Validate parent if provided
    if (req.body.parentId) {
      const parent = await req.prisma!.warehouse.findUnique({
        where: { id: req.body.parentId },
      });
      if (!parent) {
        throw AppError.badRequest('Parent warehouse not found');
      }
    }

    const warehouse = await req.prisma!.warehouse.create({
      data: {
        code: req.body.code,
        name: req.body.name,
        description: req.body.description,
        address: req.body.address,
        city: req.body.city,
        parentId: req.body.parentId,
        locationType: req.body.locationType || 'WAREHOUSE',
        isDefault: req.body.isDefault ?? false,
        allowNegative: req.body.allowNegative ?? false,
        isActive: req.body.isActive ?? true,
      },
      include: {
        parent: { select: { id: true, code: true, name: true } },
      },
    });

    res.status(201).json({ message: 'Warehouse created', data: warehouse });
  } catch (error) {
    next(error);
  }
});

// PUT /inventory/warehouses/:id - Update warehouse
inventoryRouter.put('/warehouses/:id', requirePermission('inventory:write'), validateParams(idParamSchema), validateBody(updateWarehouseSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params as unknown as { id: number };

    const existing = await req.prisma!.warehouse.findUnique({ where: { id } });
    if (!existing) {
      throw AppError.notFound('Warehouse');
    }

    // Check code uniqueness if changing
    if (req.body.code && req.body.code !== existing.code) {
      const codeExists = await req.prisma!.warehouse.findUnique({
        where: { code: req.body.code },
      });
      if (codeExists) {
        throw AppError.conflict('Warehouse code already exists');
      }
    }

    // Prevent circular parent reference
    if (req.body.parentId === id) {
      throw AppError.badRequest('Warehouse cannot be its own parent');
    }

    const warehouse = await req.prisma!.warehouse.update({
      where: { id },
      data: {
        ...(req.body.code !== undefined && { code: req.body.code }),
        ...(req.body.name !== undefined && { name: req.body.name }),
        ...(req.body.description !== undefined && { description: req.body.description }),
        ...(req.body.address !== undefined && { address: req.body.address }),
        ...(req.body.city !== undefined && { city: req.body.city }),
        ...(req.body.parentId !== undefined && { parentId: req.body.parentId }),
        ...(req.body.locationType !== undefined && { locationType: req.body.locationType }),
        ...(req.body.isDefault !== undefined && { isDefault: req.body.isDefault }),
        ...(req.body.allowNegative !== undefined && { allowNegative: req.body.allowNegative }),
        ...(req.body.isActive !== undefined && { isActive: req.body.isActive }),
      },
      include: {
        parent: { select: { id: true, code: true, name: true } },
      },
    });

    res.json({ message: 'Warehouse updated', data: warehouse });
  } catch (error) {
    next(error);
  }
});

// DELETE /inventory/warehouses/:id - Soft delete
inventoryRouter.delete('/warehouses/:id', requirePermission('inventory:write'), validateParams(idParamSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params as unknown as { id: number };

    const existing = await req.prisma!.warehouse.findUnique({
      where: { id },
      include: {
        _count: { select: { stockLevels: true, children: true } },
      },
    });
    if (!existing) {
      throw AppError.notFound('Warehouse');
    }

    // Prevent deletion if has stock or children
    if (existing._count.stockLevels > 0) {
      throw AppError.badRequest('Cannot delete warehouse with stock. Transfer stock first.');
    }
    if (existing._count.children > 0) {
      throw AppError.badRequest('Cannot delete warehouse with sub-locations. Delete children first.');
    }

    await req.prisma!.warehouse.update({
      where: { id },
      data: { isActive: false },
    });

    res.json({ message: 'Warehouse deactivated' });
  } catch (error) {
    next(error);
  }
});

// ============================================
// STOCK CATEGORIES
// ============================================

const createCategorySchema = z.object({
  code: z.string().min(1, 'Code is required').max(50),
  name: z.string().min(1, 'Name is required').max(255),
  description: z.string().optional(),
  parentId: z.number().int().positive().optional(),
  defaultUnitId: z.number().int().positive().optional(),
  trackBatches: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

const updateCategorySchema = createCategorySchema.partial();

// GET /inventory/categories/lookup - Lightweight lookup
inventoryRouter.get('/categories/lookup', requirePermission('inventory:read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const categories = await req.prisma!.stockCategory.findMany({
      where: { isActive: true },
      select: {
        id: true,
        code: true,
        name: true,
        parentId: true,
        trackBatches: true,
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    res.json({ data: categories });
  } catch (error) {
    next(error);
  }
});

// GET /inventory/categories - List all categories (hierarchical)
inventoryRouter.get('/categories', requirePermission('inventory:read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const categories = await req.prisma!.stockCategory.findMany({
      include: {
        parent: { select: { id: true, code: true, name: true } },
        children: { select: { id: true, code: true, name: true } },
        _count: { select: { items: true } },
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    res.json({ data: categories });
  } catch (error) {
    next(error);
  }
});

// GET /inventory/categories/tree - Get as nested tree structure
inventoryRouter.get('/categories/tree', requirePermission('inventory:read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const categories = await req.prisma!.stockCategory.findMany({
      where: { isActive: true },
      include: {
        _count: { select: { items: true } },
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    // Build tree structure
    const buildTree = (items: typeof categories, parentId: number | null = null): any[] => {
      return items
        .filter((item) => item.parentId === parentId)
        .map((item) => ({
          ...item,
          children: buildTree(items, item.id),
        }));
    };

    res.json({ data: buildTree(categories) });
  } catch (error) {
    next(error);
  }
});

// GET /inventory/categories/:id - Get single category
inventoryRouter.get('/categories/:id', requirePermission('inventory:read'), validateParams(idParamSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params as unknown as { id: number };
    const category = await req.prisma!.stockCategory.findUnique({
      where: { id },
      include: {
        parent: { select: { id: true, code: true, name: true } },
        children: {
          select: { id: true, code: true, name: true },
          orderBy: { name: 'asc' },
        },
        items: {
          select: { id: true, code: true, name: true, itemType: true },
          take: 50,
          orderBy: { name: 'asc' },
        },
      },
    });
    if (!category) {
      throw AppError.notFound('Stock Category');
    }
    res.json({ data: category });
  } catch (error) {
    next(error);
  }
});

// POST /inventory/categories - Create category
inventoryRouter.post('/categories', requirePermission('inventory:write'), validateBody(createCategorySchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Check code uniqueness
    const existing = await req.prisma!.stockCategory.findUnique({
      where: { code: req.body.code },
    });
    if (existing) {
      throw AppError.conflict('Category code already exists');
    }

    const category = await req.prisma!.stockCategory.create({
      data: {
        code: req.body.code,
        name: req.body.name,
        description: req.body.description,
        parentId: req.body.parentId,
        defaultUnitId: req.body.defaultUnitId,
        trackBatches: req.body.trackBatches ?? false,
        sortOrder: req.body.sortOrder ?? 0,
        isActive: req.body.isActive ?? true,
      },
      include: {
        parent: { select: { id: true, code: true, name: true } },
      },
    });

    res.status(201).json({ message: 'Category created', data: category });
  } catch (error) {
    next(error);
  }
});

// PUT /inventory/categories/:id - Update category
inventoryRouter.put('/categories/:id', requirePermission('inventory:write'), validateParams(idParamSchema), validateBody(updateCategorySchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params as unknown as { id: number };

    const existing = await req.prisma!.stockCategory.findUnique({ where: { id } });
    if (!existing) {
      throw AppError.notFound('Stock Category');
    }

    if (req.body.code && req.body.code !== existing.code) {
      const codeExists = await req.prisma!.stockCategory.findUnique({
        where: { code: req.body.code },
      });
      if (codeExists) {
        throw AppError.conflict('Category code already exists');
      }
    }

    if (req.body.parentId === id) {
      throw AppError.badRequest('Category cannot be its own parent');
    }

    const category = await req.prisma!.stockCategory.update({
      where: { id },
      data: {
        ...(req.body.code !== undefined && { code: req.body.code }),
        ...(req.body.name !== undefined && { name: req.body.name }),
        ...(req.body.description !== undefined && { description: req.body.description }),
        ...(req.body.parentId !== undefined && { parentId: req.body.parentId }),
        ...(req.body.defaultUnitId !== undefined && { defaultUnitId: req.body.defaultUnitId }),
        ...(req.body.trackBatches !== undefined && { trackBatches: req.body.trackBatches }),
        ...(req.body.sortOrder !== undefined && { sortOrder: req.body.sortOrder }),
        ...(req.body.isActive !== undefined && { isActive: req.body.isActive }),
      },
      include: {
        parent: { select: { id: true, code: true, name: true } },
      },
    });

    res.json({ message: 'Category updated', data: category });
  } catch (error) {
    next(error);
  }
});

// DELETE /inventory/categories/:id - Soft delete
inventoryRouter.delete('/categories/:id', requirePermission('inventory:write'), validateParams(idParamSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params as unknown as { id: number };

    const existing = await req.prisma!.stockCategory.findUnique({
      where: { id },
      include: {
        _count: { select: { items: true, children: true } },
      },
    });
    if (!existing) {
      throw AppError.notFound('Stock Category');
    }

    if (existing._count.items > 0) {
      throw AppError.badRequest('Cannot delete category with items. Reassign items first.');
    }
    if (existing._count.children > 0) {
      throw AppError.badRequest('Cannot delete category with sub-categories. Delete children first.');
    }

    await req.prisma!.stockCategory.update({
      where: { id },
      data: { isActive: false },
    });

    res.json({ message: 'Category deactivated' });
  } catch (error) {
    next(error);
  }
});

// ============================================
// STOCK ITEMS
// ============================================

const createStockItemSchema = z.object({
  code: z.string().min(1, 'Code is required').max(50),
  name: z.string().min(1, 'Name is required').max(255),
  description: z.string().optional(),
  itemType: z.enum(['GENERAL', 'RAW_MATERIAL', 'FINISHED_GOODS', 'CONSUMABLE', 'SPARE_PART', 'PACKAGING']).optional(),
  categoryId: z.number().int().positive().optional(),
  primaryUnitId: z.number().int().positive('Primary unit is required'),
  secondaryUnitId: z.number().int().positive().optional(),
  conversionFactor: z.number().positive().optional(),
  trackBatches: z.boolean().optional(),
  trackSerials: z.boolean().optional(),
  trackExpiry: z.boolean().optional(),
  minStockLevel: z.number().min(0).optional(),
  reorderPoint: z.number().min(0).optional(),
  reorderQuantity: z.number().min(0).optional(),
  maxStockLevel: z.number().min(0).optional(),
  valuationMethod: z.enum(['FIFO', 'LIFO', 'WEIGHTED_AVERAGE', 'STANDARD_COST']).optional(),
  standardCost: z.number().min(0).optional(),
  currency: z.string().length(3).optional(),
  attributes: z.record(z.any()).optional(),
  images: z.array(z.string()).optional(),
  moduleCode: z.string().max(50).optional(),
  isActive: z.boolean().optional(),
});

const updateStockItemSchema = createStockItemSchema.partial();

const stockItemQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  search: z.string().optional(),
  categoryId: z.string().regex(/^\d+$/).transform(Number).optional(),
  itemType: z.enum(['GENERAL', 'RAW_MATERIAL', 'FINISHED_GOODS', 'CONSUMABLE', 'SPARE_PART', 'PACKAGING']).optional(),
  isActive: z.string().transform((v) => v === 'true').optional(),
});

// GET /inventory/items/lookup - Lightweight lookup
inventoryRouter.get('/items/lookup', requirePermission('inventory:read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const items = await req.prisma!.stockItem.findMany({
      where: { isActive: true },
      select: {
        id: true,
        code: true,
        name: true,
        itemType: true,
        primaryUnitId: true,
        trackBatches: true,
        primaryUnit: { select: { id: true, code: true, name: true } },
      },
      orderBy: { name: 'asc' },
    });
    res.json({ data: items });
  } catch (error) {
    next(error);
  }
});

// GET /inventory/items - List all stock items with pagination
inventoryRouter.get('/items', requirePermission('inventory:read'), validateQuery(stockItemQuerySchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = 1, limit = 50, search, categoryId, itemType, isActive } = req.query as any;

    const where: any = {};
    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (categoryId) where.categoryId = categoryId;
    if (itemType) where.itemType = itemType;
    if (isActive !== undefined) where.isActive = isActive;

    const [items, total] = await Promise.all([
      req.prisma!.stockItem.findMany({
        where,
        include: {
          category: { select: { id: true, code: true, name: true } },
          primaryUnit: { select: { id: true, code: true, name: true } },
          secondaryUnit: { select: { id: true, code: true, name: true } },
          _count: { select: { stockLevels: true, batches: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      req.prisma!.stockItem.count({ where }),
    ]);

    res.json({
      data: items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /inventory/items/:id - Get single stock item with stock levels
inventoryRouter.get('/items/:id', requirePermission('inventory:read'), validateParams(idParamSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params as unknown as { id: number };
    const item = await req.prisma!.stockItem.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, code: true, name: true } },
        primaryUnit: { select: { id: true, code: true, name: true } },
        secondaryUnit: { select: { id: true, code: true, name: true } },
        stockLevels: {
          include: {
            warehouse: { select: { id: true, code: true, name: true } },
          },
        },
        batches: {
          where: { isActive: true, currentQuantity: { gt: 0 } },
          orderBy: { expiryDate: 'asc' },
          take: 20,
        },
        alerts: {
          where: { status: 'ACTIVE' },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });
    if (!item) {
      throw AppError.notFound('Stock Item');
    }
    res.json({ data: item });
  } catch (error) {
    next(error);
  }
});

// POST /inventory/items - Create stock item
inventoryRouter.post('/items', requirePermission('inventory:write'), validateBody(createStockItemSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Check code uniqueness
    const existing = await req.prisma!.stockItem.findUnique({
      where: { code: req.body.code },
    });
    if (existing) {
      throw AppError.conflict('Stock item code already exists');
    }

    // Validate unit exists
    const unit = await req.prisma!.unit.findUnique({
      where: { id: req.body.primaryUnitId },
    });
    if (!unit) {
      throw AppError.badRequest('Primary unit not found');
    }

    const item = await req.prisma!.stockItem.create({
      data: {
        code: req.body.code,
        name: req.body.name,
        description: req.body.description,
        itemType: req.body.itemType || 'GENERAL',
        categoryId: req.body.categoryId,
        primaryUnitId: req.body.primaryUnitId,
        secondaryUnitId: req.body.secondaryUnitId,
        conversionFactor: req.body.conversionFactor,
        trackBatches: req.body.trackBatches ?? false,
        trackSerials: req.body.trackSerials ?? false,
        trackExpiry: req.body.trackExpiry ?? false,
        minStockLevel: req.body.minStockLevel,
        reorderPoint: req.body.reorderPoint,
        reorderQuantity: req.body.reorderQuantity,
        maxStockLevel: req.body.maxStockLevel,
        valuationMethod: req.body.valuationMethod || 'WEIGHTED_AVERAGE',
        standardCost: req.body.standardCost,
        currency: req.body.currency || 'PKR',
        attributes: req.body.attributes || null,
        images: req.body.images || [],
        moduleCode: req.body.moduleCode,
        isActive: req.body.isActive ?? true,
      },
      include: {
        category: { select: { id: true, code: true, name: true } },
        primaryUnit: { select: { id: true, code: true, name: true } },
      },
    });

    res.status(201).json({ message: 'Stock item created', data: item });
  } catch (error) {
    next(error);
  }
});

// PUT /inventory/items/:id - Update stock item
inventoryRouter.put('/items/:id', requirePermission('inventory:write'), validateParams(idParamSchema), validateBody(updateStockItemSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params as unknown as { id: number };

    const existing = await req.prisma!.stockItem.findUnique({ where: { id } });
    if (!existing) {
      throw AppError.notFound('Stock Item');
    }

    if (req.body.code && req.body.code !== existing.code) {
      const codeExists = await req.prisma!.stockItem.findUnique({
        where: { code: req.body.code },
      });
      if (codeExists) {
        throw AppError.conflict('Stock item code already exists');
      }
    }

    const item = await req.prisma!.stockItem.update({
      where: { id },
      data: {
        ...(req.body.code !== undefined && { code: req.body.code }),
        ...(req.body.name !== undefined && { name: req.body.name }),
        ...(req.body.description !== undefined && { description: req.body.description }),
        ...(req.body.itemType !== undefined && { itemType: req.body.itemType }),
        ...(req.body.categoryId !== undefined && { categoryId: req.body.categoryId }),
        ...(req.body.primaryUnitId !== undefined && { primaryUnitId: req.body.primaryUnitId }),
        ...(req.body.secondaryUnitId !== undefined && { secondaryUnitId: req.body.secondaryUnitId }),
        ...(req.body.conversionFactor !== undefined && { conversionFactor: req.body.conversionFactor }),
        ...(req.body.trackBatches !== undefined && { trackBatches: req.body.trackBatches }),
        ...(req.body.trackSerials !== undefined && { trackSerials: req.body.trackSerials }),
        ...(req.body.trackExpiry !== undefined && { trackExpiry: req.body.trackExpiry }),
        ...(req.body.minStockLevel !== undefined && { minStockLevel: req.body.minStockLevel }),
        ...(req.body.reorderPoint !== undefined && { reorderPoint: req.body.reorderPoint }),
        ...(req.body.reorderQuantity !== undefined && { reorderQuantity: req.body.reorderQuantity }),
        ...(req.body.maxStockLevel !== undefined && { maxStockLevel: req.body.maxStockLevel }),
        ...(req.body.valuationMethod !== undefined && { valuationMethod: req.body.valuationMethod }),
        ...(req.body.standardCost !== undefined && { standardCost: req.body.standardCost }),
        ...(req.body.currency !== undefined && { currency: req.body.currency }),
        ...(req.body.attributes !== undefined && { attributes: req.body.attributes }),
        ...(req.body.images !== undefined && { images: req.body.images }),
        ...(req.body.moduleCode !== undefined && { moduleCode: req.body.moduleCode }),
        ...(req.body.isActive !== undefined && { isActive: req.body.isActive }),
      },
      include: {
        category: { select: { id: true, code: true, name: true } },
        primaryUnit: { select: { id: true, code: true, name: true } },
      },
    });

    res.json({ message: 'Stock item updated', data: item });
  } catch (error) {
    next(error);
  }
});

// DELETE /inventory/items/:id - Soft delete
inventoryRouter.delete('/items/:id', requirePermission('inventory:write'), validateParams(idParamSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params as unknown as { id: number };

    const existing = await req.prisma!.stockItem.findUnique({
      where: { id },
      include: {
        stockLevels: {
          where: { quantityOnHand: { gt: 0 } },
        },
      },
    });
    if (!existing) {
      throw AppError.notFound('Stock Item');
    }

    if (existing.stockLevels.length > 0) {
      throw AppError.badRequest('Cannot delete item with stock on hand. Adjust stock to zero first.');
    }

    await req.prisma!.stockItem.update({
      where: { id },
      data: { isActive: false },
    });

    res.json({ message: 'Stock item deactivated' });
  } catch (error) {
    next(error);
  }
});

// ============================================
// STOCK LEVELS
// ============================================

// GET /inventory/stock-levels - Get stock levels (optionally by warehouse or item)
inventoryRouter.get('/stock-levels', requirePermission('inventory:read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { warehouseId, itemId, lowStock } = req.query;

    const where: any = {};
    if (warehouseId) where.warehouseId = Number(warehouseId);
    if (itemId) where.itemId = Number(itemId);
    if (lowStock === 'true') {
      // Join with item to check against minStockLevel
      where.item = { minStockLevel: { not: null } };
    }

    const stockLevels = await req.prisma!.stockLevel.findMany({
      where,
      include: {
        item: {
          select: {
            id: true,
            code: true,
            name: true,
            minStockLevel: true,
            reorderPoint: true,
            primaryUnit: { select: { code: true, name: true } },
          },
        },
        warehouse: { select: { id: true, code: true, name: true } },
      },
      orderBy: [{ warehouse: { name: 'asc' } }, { item: { name: 'asc' } }],
    });

    // Filter low stock if requested
    let result = stockLevels;
    if (lowStock === 'true') {
      result = stockLevels.filter((sl) => {
        const onHand = Number(sl.quantityOnHand);
        const minLevel = sl.item.minStockLevel ? Number(sl.item.minStockLevel) : 0;
        return onHand <= minLevel;
      });
    }

    res.json({ data: result });
  } catch (error) {
    next(error);
  }
});

// GET /inventory/stock-levels/summary - Get summary by warehouse
inventoryRouter.get('/stock-levels/summary', requirePermission('inventory:read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const summary = await req.prisma!.stockLevel.groupBy({
      by: ['warehouseId'],
      _sum: {
        quantityOnHand: true,
        quantityReserved: true,
        quantityAvailable: true,
        totalValue: true,
      },
      _count: {
        itemId: true,
      },
    });

    // Get warehouse names
    const warehouseIds = summary.map((s) => s.warehouseId);
    const warehouses = await req.prisma!.warehouse.findMany({
      where: { id: { in: warehouseIds } },
      select: { id: true, code: true, name: true },
    });

    const result = summary.map((s) => ({
      warehouse: warehouses.find((w) => w.id === s.warehouseId),
      itemCount: s._count.itemId,
      totalOnHand: s._sum.quantityOnHand,
      totalReserved: s._sum.quantityReserved,
      totalAvailable: s._sum.quantityAvailable,
      totalValue: s._sum.totalValue,
    }));

    res.json({ data: result });
  } catch (error) {
    next(error);
  }
});

// ============================================
// STOCK TRANSACTIONS
// ============================================

const createTransactionSchema = z.object({
  transactionDate: z.string().transform((s) => new Date(s)),
  transactionType: z.enum([
    'RECEIPT', 'PURCHASE', 'RETURN_IN', 'TRANSFER_IN', 'PRODUCTION_OUT', 'ADJUSTMENT_IN', 'OPENING_STOCK',
    'ISSUE', 'SALE', 'RETURN_OUT', 'TRANSFER_OUT', 'PRODUCTION_IN', 'ADJUSTMENT_OUT', 'SCRAP', 'SAMPLE',
  ]),
  itemId: z.number().int().positive('Item is required'),
  batchId: z.number().int().positive().optional(),
  sourceWarehouseId: z.number().int().positive().optional(),
  destWarehouseId: z.number().int().positive().optional(),
  quantity: z.number().positive('Quantity must be positive'),
  unitId: z.number().int().positive('Unit is required'),
  unitCost: z.number().min(0).optional(),
  referenceType: z.string().max(50).optional(),
  referenceId: z.number().int().positive().optional(),
  referenceNumber: z.string().max(100).optional(),
  reason: z.string().max(255).optional(),
  notes: z.string().optional(),
});

const transactionQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  itemId: z.string().regex(/^\d+$/).transform(Number).optional(),
  warehouseId: z.string().regex(/^\d+$/).transform(Number).optional(),
  transactionType: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.enum(['PENDING', 'APPROVED', 'COMPLETED', 'REVERSED', 'CANCELLED']).optional(),
});

// Helper to generate transaction number
const generateTransactionNumber = async (prisma: any, prefix: string = 'TXN'): Promise<string> => {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  const lastTxn = await prisma.stockTransaction.findFirst({
    where: {
      transactionNumber: { startsWith: `${prefix}-${dateStr}` },
    },
    orderBy: { transactionNumber: 'desc' },
  });

  let seq = 1;
  if (lastTxn) {
    const lastSeq = parseInt(lastTxn.transactionNumber.split('-').pop() || '0', 10);
    seq = lastSeq + 1;
  }

  return `${prefix}-${dateStr}-${seq.toString().padStart(4, '0')}`;
};

// Determine if transaction type is inward
const isInwardTransaction = (type: string): boolean => {
  return ['RECEIPT', 'PURCHASE', 'RETURN_IN', 'TRANSFER_IN', 'PRODUCTION_OUT', 'ADJUSTMENT_IN', 'OPENING_STOCK'].includes(type);
};

// GET /inventory/transactions - List transactions with filters
inventoryRouter.get('/transactions', requirePermission('inventory:read'), validateQuery(transactionQuerySchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = 1, limit = 50, itemId, warehouseId, transactionType, startDate, endDate, status } = req.query as any;

    const where: any = {};
    if (itemId) where.itemId = itemId;
    if (warehouseId) {
      where.OR = [
        { sourceWarehouseId: warehouseId },
        { destWarehouseId: warehouseId },
      ];
    }
    if (transactionType) where.transactionType = transactionType;
    if (status) where.status = status;
    if (startDate || endDate) {
      where.transactionDate = {};
      if (startDate) where.transactionDate.gte = new Date(startDate as string);
      if (endDate) where.transactionDate.lte = new Date(endDate as string);
    }

    const [transactions, total] = await Promise.all([
      req.prisma!.stockTransaction.findMany({
        where,
        include: {
          item: { select: { id: true, code: true, name: true } },
          batch: { select: { id: true, batchNumber: true } },
          sourceWarehouse: { select: { id: true, code: true, name: true } },
          destWarehouse: { select: { id: true, code: true, name: true } },
          unit: { select: { id: true, code: true, name: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ transactionDate: 'desc' }, { createdAt: 'desc' }],
      }),
      req.prisma!.stockTransaction.count({ where }),
    ]);

    res.json({
      data: transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /inventory/transactions/:id - Get single transaction
inventoryRouter.get('/transactions/:id', requirePermission('inventory:read'), validateParams(idParamSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params as unknown as { id: number };
    const transaction = await req.prisma!.stockTransaction.findUnique({
      where: { id },
      include: {
        item: {
          select: {
            id: true,
            code: true,
            name: true,
            primaryUnit: { select: { code: true, name: true } },
          },
        },
        batch: { select: { id: true, batchNumber: true, lotNumber: true, expiryDate: true } },
        sourceWarehouse: { select: { id: true, code: true, name: true } },
        destWarehouse: { select: { id: true, code: true, name: true } },
        unit: { select: { id: true, code: true, name: true } },
      },
    });
    if (!transaction) {
      throw AppError.notFound('Stock Transaction');
    }
    res.json({ data: transaction });
  } catch (error) {
    next(error);
  }
});

// POST /inventory/transactions - Create and process stock transaction
inventoryRouter.post('/transactions', requirePermission('inventory:write'), validateBody(createTransactionSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user;
    const {
      transactionDate,
      transactionType,
      itemId,
      batchId,
      sourceWarehouseId,
      destWarehouseId,
      quantity,
      unitId,
      unitCost,
      referenceType,
      referenceId,
      referenceNumber,
      reason,
      notes,
    } = req.body;

    // Validate item exists
    const item = await req.prisma!.stockItem.findUnique({
      where: { id: itemId },
    });
    if (!item) {
      throw AppError.badRequest('Stock item not found');
    }

    // Validate warehouses based on transaction type
    const isInward = isInwardTransaction(transactionType);
    const isTransfer = transactionType.includes('TRANSFER');

    if (isTransfer) {
      if (!sourceWarehouseId || !destWarehouseId) {
        throw AppError.badRequest('Transfer transactions require both source and destination warehouses');
      }
      if (sourceWarehouseId === destWarehouseId) {
        throw AppError.badRequest('Source and destination warehouses must be different');
      }
    } else if (isInward) {
      if (!destWarehouseId) {
        throw AppError.badRequest('Inward transactions require a destination warehouse');
      }
    } else {
      if (!sourceWarehouseId) {
        throw AppError.badRequest('Outward transactions require a source warehouse');
      }
    }

    // Execute in transaction
    const result = await req.prisma!.$transaction(async (tx: any) => {
      // Generate transaction number
      const transactionNumber = await generateTransactionNumber(tx);

      // Create the transaction record
      const stockTransaction = await tx.stockTransaction.create({
        data: {
          transactionNumber,
          transactionDate,
          transactionType,
          itemId,
          batchId,
          sourceWarehouseId,
          destWarehouseId,
          quantity,
          unitId,
          unitCost,
          totalCost: unitCost ? quantity * unitCost : null,
          referenceType,
          referenceId,
          referenceNumber,
          reason,
          notes,
          createdBy: user?.userId,
          createdByName: user?.email || 'System',
          status: 'COMPLETED', // Auto-complete for now
        },
        include: {
          item: { select: { id: true, code: true, name: true } },
          sourceWarehouse: { select: { id: true, code: true, name: true } },
          destWarehouse: { select: { id: true, code: true, name: true } },
        },
      });

      // Update stock levels
      if (isTransfer) {
        // Decrease source
        await updateStockLevel(tx, itemId, sourceWarehouseId!, -quantity, unitCost);
        // Increase destination
        await updateStockLevel(tx, itemId, destWarehouseId!, quantity, unitCost);
      } else if (isInward) {
        await updateStockLevel(tx, itemId, destWarehouseId!, quantity, unitCost);
      } else {
        // Check if enough stock
        const sourceLevel = await tx.stockLevel.findUnique({
          where: { itemId_warehouseId: { itemId, warehouseId: sourceWarehouseId! } },
        });

        const warehouse = await tx.warehouse.findUnique({
          where: { id: sourceWarehouseId! },
        });

        const currentQty = sourceLevel ? Number(sourceLevel.quantityOnHand) : 0;
        if (currentQty < quantity && !warehouse?.allowNegative) {
          throw AppError.badRequest(`Insufficient stock. Available: ${currentQty}`);
        }

        await updateStockLevel(tx, itemId, sourceWarehouseId!, -quantity, unitCost);
      }

      // Update batch quantities if batch tracking
      if (batchId) {
        const qtyChange = isInward ? quantity : -quantity;
        await tx.stockBatch.update({
          where: { id: batchId },
          data: {
            currentQuantity: { increment: qtyChange },
          },
        });
      }

      // Check and create alerts
      await checkAndCreateAlerts(tx, itemId);

      return stockTransaction;
    });

    res.status(201).json({
      message: `Stock ${isInward ? 'received' : 'issued'} successfully`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

// Helper function to update stock level
async function updateStockLevel(
  tx: any,
  itemId: number,
  warehouseId: number,
  quantityChange: number,
  unitCost?: number
): Promise<void> {
  const existing = await tx.stockLevel.findUnique({
    where: { itemId_warehouseId: { itemId, warehouseId } },
  });

  if (existing) {
    const newOnHand = Number(existing.quantityOnHand) + quantityChange;
    const newAvailable = Number(existing.quantityAvailable) + quantityChange;

    // Calculate new average cost if receiving
    let newAvgCost: number | null = existing.averageCost ? Number(existing.averageCost) : null;
    let newTotalValue = Number(existing.totalValue);

    if (quantityChange > 0 && unitCost) {
      // Weighted average calculation
      const oldValue = Number(existing.quantityOnHand) * Number(existing.averageCost || 0);
      const newValue = quantityChange * unitCost;
      newAvgCost = newOnHand > 0 ? (oldValue + newValue) / newOnHand : null;
      newTotalValue = newOnHand * (newAvgCost || 0);
    } else {
      newTotalValue = newOnHand * (newAvgCost || 0);
    }

    await tx.stockLevel.update({
      where: { itemId_warehouseId: { itemId, warehouseId } },
      data: {
        quantityOnHand: newOnHand,
        quantityAvailable: newAvailable,
        averageCost: newAvgCost,
        totalValue: newTotalValue,
        lastMovementAt: new Date(),
      },
    });
  } else {
    // Create new stock level
    await tx.stockLevel.create({
      data: {
        itemId,
        warehouseId,
        quantityOnHand: quantityChange,
        quantityReserved: 0,
        quantityAvailable: quantityChange,
        quantityOnOrder: 0,
        averageCost: unitCost,
        totalValue: quantityChange * (unitCost || 0),
        lastMovementAt: new Date(),
      },
    });
  }
}

// Helper function to check and create stock alerts
async function checkAndCreateAlerts(tx: any, itemId: number): Promise<void> {
  const item = await tx.stockItem.findUnique({
    where: { id: itemId },
    include: {
      stockLevels: true,
    },
  });

  if (!item) return;

  // Calculate total stock across all warehouses
  const totalStock = item.stockLevels.reduce(
    (sum: number, sl: any) => sum + Number(sl.quantityOnHand),
    0
  );

  const minLevel = item.minStockLevel ? Number(item.minStockLevel) : null;
  const reorderPoint = item.reorderPoint ? Number(item.reorderPoint) : null;

  // Check for out of stock
  if (totalStock <= 0) {
    await createOrUpdateAlert(tx, itemId, 'OUT_OF_STOCK', totalStock, 0);
  }
  // Check for low stock
  else if (minLevel && totalStock <= minLevel) {
    await createOrUpdateAlert(tx, itemId, 'LOW_STOCK', totalStock, minLevel);
  }
  // Check for reorder point
  else if (reorderPoint && totalStock <= reorderPoint) {
    await createOrUpdateAlert(tx, itemId, 'REORDER_POINT', totalStock, reorderPoint);
  }
  // Resolve any existing alerts if stock is adequate
  else {
    await tx.stockAlert.updateMany({
      where: {
        itemId,
        status: 'ACTIVE',
        alertType: { in: ['LOW_STOCK', 'OUT_OF_STOCK', 'REORDER_POINT'] },
      },
      data: {
        status: 'RESOLVED',
        resolvedAt: new Date(),
      },
    });
  }
}

async function createOrUpdateAlert(
  tx: any,
  itemId: number,
  alertType: string,
  currentLevel: number,
  thresholdLevel: number
): Promise<void> {
  // Check if active alert already exists
  const existing = await tx.stockAlert.findFirst({
    where: {
      itemId,
      alertType,
      status: 'ACTIVE',
    },
  });

  if (existing) {
    // Update the current level
    await tx.stockAlert.update({
      where: { id: existing.id },
      data: { currentLevel },
    });
  } else {
    // Create new alert
    await tx.stockAlert.create({
      data: {
        itemId,
        alertType,
        currentLevel,
        thresholdLevel,
        status: 'ACTIVE',
      },
    });
  }
}

// POST /inventory/transactions/:id/reverse - Reverse a transaction
inventoryRouter.post('/transactions/:id/reverse', requirePermission('inventory:write'), validateParams(idParamSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params as unknown as { id: number };
    const user = req.user;

    const original = await req.prisma!.stockTransaction.findUnique({
      where: { id },
    });

    if (!original) {
      throw AppError.notFound('Stock Transaction');
    }

    if (original.status !== 'COMPLETED') {
      throw AppError.badRequest('Only completed transactions can be reversed');
    }

    if (original.isReversed) {
      throw AppError.badRequest('Transaction has already been reversed');
    }

    const result = await req.prisma!.$transaction(async (tx: any) => {
      // Generate reversal transaction number
      const transactionNumber = await generateTransactionNumber(tx, 'REV');

      // Determine reversal type
      const isInward = isInwardTransaction(original.transactionType);

      // Create reversal transaction
      const reversal = await tx.stockTransaction.create({
        data: {
          transactionNumber,
          transactionDate: new Date(),
          transactionType: isInward ? 'ADJUSTMENT_OUT' : 'ADJUSTMENT_IN',
          itemId: original.itemId,
          batchId: original.batchId,
          sourceWarehouseId: original.destWarehouseId,
          destWarehouseId: original.sourceWarehouseId,
          quantity: original.quantity,
          unitId: original.unitId,
          unitCost: original.unitCost,
          totalCost: original.totalCost,
          referenceType: 'REVERSAL',
          referenceId: original.id,
          referenceNumber: original.transactionNumber,
          reason: `Reversal of ${original.transactionNumber}`,
          notes: req.body.notes,
          createdBy: user?.userId,
          createdByName: user?.email || 'System',
          status: 'COMPLETED',
        },
      });

      // Mark original as reversed
      await tx.stockTransaction.update({
        where: { id: original.id },
        data: {
          isReversed: true,
          reversalId: reversal.id,
          status: 'REVERSED',
        },
      });

      // Reverse stock level changes
      const isTransfer = original.transactionType.includes('TRANSFER');
      const qty = Number(original.quantity);

      if (isTransfer) {
        // Reverse: increase source, decrease destination
        if (original.sourceWarehouseId) {
          await updateStockLevel(tx, original.itemId, original.sourceWarehouseId, qty, undefined);
        }
        if (original.destWarehouseId) {
          await updateStockLevel(tx, original.itemId, original.destWarehouseId, -qty, undefined);
        }
      } else if (isInward && original.destWarehouseId) {
        await updateStockLevel(tx, original.itemId, original.destWarehouseId, -qty, undefined);
      } else if (!isInward && original.sourceWarehouseId) {
        await updateStockLevel(tx, original.itemId, original.sourceWarehouseId, qty, undefined);
      }

      // Reverse batch quantity if applicable
      if (original.batchId) {
        const qtyChange = isInward ? -qty : qty;
        await tx.stockBatch.update({
          where: { id: original.batchId },
          data: { currentQuantity: { increment: qtyChange } },
        });
      }

      // Recheck alerts
      await checkAndCreateAlerts(tx, original.itemId);

      return reversal;
    });

    res.json({ message: 'Transaction reversed', data: result });
  } catch (error) {
    next(error);
  }
});

// ============================================
// STOCK BATCHES
// ============================================

const createBatchSchema = z.object({
  batchNumber: z.string().min(1, 'Batch number is required').max(100),
  itemId: z.number().int().positive('Item is required'),
  manufacturingDate: z.string().transform((s) => new Date(s)).optional(),
  expiryDate: z.string().transform((s) => new Date(s)).optional(),
  lotNumber: z.string().max(100).optional(),
  initialQuantity: z.number().positive('Initial quantity must be positive'),
  unitCost: z.number().min(0).optional(),
  supplierId: z.number().int().positive().optional(),
  purchaseOrderRef: z.string().max(100).optional(),
  attributes: z.record(z.any()).optional(),
  notes: z.string().optional(),
});

const updateBatchSchema = z.object({
  manufacturingDate: z.string().transform((s) => new Date(s)).optional(),
  expiryDate: z.string().transform((s) => new Date(s)).optional(),
  lotNumber: z.string().max(100).optional(),
  unitCost: z.number().min(0).optional(),
  supplierId: z.number().int().positive().optional(),
  purchaseOrderRef: z.string().max(100).optional(),
  attributes: z.record(z.any()).optional(),
  notes: z.string().optional(),
  status: z.enum(['ACTIVE', 'QUARANTINE', 'EXPIRED', 'DEPLETED']).optional(),
});

// GET /inventory/batches - List batches with filters
inventoryRouter.get('/batches', requirePermission('inventory:read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { itemId, status, expiringSoon } = req.query;

    const where: any = { isActive: true };
    if (itemId) where.itemId = Number(itemId);
    if (status) where.status = status;

    // Expiring within 30 days
    if (expiringSoon === 'true') {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      where.expiryDate = {
        lte: thirtyDaysFromNow,
        gte: new Date(),
      };
      where.status = { not: 'EXPIRED' };
    }

    const batches = await req.prisma!.stockBatch.findMany({
      where,
      include: {
        item: { select: { id: true, code: true, name: true } },
      },
      orderBy: [{ expiryDate: 'asc' }, { createdAt: 'desc' }],
    });

    res.json({ data: batches });
  } catch (error) {
    next(error);
  }
});

// GET /inventory/batches/:id - Get single batch
inventoryRouter.get('/batches/:id', requirePermission('inventory:read'), validateParams(idParamSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params as unknown as { id: number };
    const batch = await req.prisma!.stockBatch.findUnique({
      where: { id },
      include: {
        item: {
          select: {
            id: true,
            code: true,
            name: true,
            primaryUnit: { select: { code: true, name: true } },
          },
        },
        transactions: {
          orderBy: { transactionDate: 'desc' },
          take: 20,
          select: {
            id: true,
            transactionNumber: true,
            transactionType: true,
            quantity: true,
            transactionDate: true,
          },
        },
      },
    });
    if (!batch) {
      throw AppError.notFound('Stock Batch');
    }
    res.json({ data: batch });
  } catch (error) {
    next(error);
  }
});

// POST /inventory/batches - Create batch (usually done via transaction)
inventoryRouter.post('/batches', requirePermission('inventory:write'), validateBody(createBatchSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Check batch number uniqueness
    const existing = await req.prisma!.stockBatch.findUnique({
      where: { batchNumber: req.body.batchNumber },
    });
    if (existing) {
      throw AppError.conflict('Batch number already exists');
    }

    // Validate item exists and has batch tracking enabled
    const item = await req.prisma!.stockItem.findUnique({
      where: { id: req.body.itemId },
    });
    if (!item) {
      throw AppError.badRequest('Stock item not found');
    }
    if (!item.trackBatches) {
      throw AppError.badRequest('This item does not have batch tracking enabled');
    }

    const batch = await req.prisma!.stockBatch.create({
      data: {
        batchNumber: req.body.batchNumber,
        itemId: req.body.itemId,
        manufacturingDate: req.body.manufacturingDate,
        expiryDate: req.body.expiryDate,
        lotNumber: req.body.lotNumber,
        initialQuantity: req.body.initialQuantity,
        currentQuantity: req.body.initialQuantity,
        unitCost: req.body.unitCost,
        totalCost: req.body.unitCost ? req.body.initialQuantity * req.body.unitCost : null,
        supplierId: req.body.supplierId,
        purchaseOrderRef: req.body.purchaseOrderRef,
        attributes: req.body.attributes || null,
        notes: req.body.notes,
        status: 'ACTIVE',
        isActive: true,
      },
      include: {
        item: { select: { id: true, code: true, name: true } },
      },
    });

    res.status(201).json({ message: 'Batch created', data: batch });
  } catch (error) {
    next(error);
  }
});

// PUT /inventory/batches/:id - Update batch metadata
inventoryRouter.put('/batches/:id', requirePermission('inventory:write'), validateParams(idParamSchema), validateBody(updateBatchSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params as unknown as { id: number };

    const existing = await req.prisma!.stockBatch.findUnique({ where: { id } });
    if (!existing) {
      throw AppError.notFound('Stock Batch');
    }

    const batch = await req.prisma!.stockBatch.update({
      where: { id },
      data: {
        ...(req.body.manufacturingDate !== undefined && { manufacturingDate: req.body.manufacturingDate }),
        ...(req.body.expiryDate !== undefined && { expiryDate: req.body.expiryDate }),
        ...(req.body.lotNumber !== undefined && { lotNumber: req.body.lotNumber }),
        ...(req.body.unitCost !== undefined && { unitCost: req.body.unitCost }),
        ...(req.body.supplierId !== undefined && { supplierId: req.body.supplierId }),
        ...(req.body.purchaseOrderRef !== undefined && { purchaseOrderRef: req.body.purchaseOrderRef }),
        ...(req.body.attributes !== undefined && { attributes: req.body.attributes }),
        ...(req.body.notes !== undefined && { notes: req.body.notes }),
        ...(req.body.status !== undefined && { status: req.body.status }),
      },
      include: {
        item: { select: { id: true, code: true, name: true } },
      },
    });

    res.json({ message: 'Batch updated', data: batch });
  } catch (error) {
    next(error);
  }
});

// ============================================
// STOCK ALERTS
// ============================================

// GET /inventory/alerts - List active alerts
inventoryRouter.get('/alerts', requirePermission('inventory:read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, alertType, itemId } = req.query;

    const where: any = {};
    if (status) where.status = status;
    else where.status = { in: ['ACTIVE', 'ACKNOWLEDGED'] }; // Default to active alerts
    if (alertType) where.alertType = alertType;
    if (itemId) where.itemId = Number(itemId);

    const alerts = await req.prisma!.stockAlert.findMany({
      where,
      include: {
        item: {
          select: {
            id: true,
            code: true,
            name: true,
            minStockLevel: true,
            reorderPoint: true,
            primaryUnit: { select: { code: true, name: true } },
          },
        },
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    });

    res.json({ data: alerts });
  } catch (error) {
    next(error);
  }
});

// GET /inventory/alerts/summary - Get alert counts by type
inventoryRouter.get('/alerts/summary', requirePermission('inventory:read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const summary = await req.prisma!.stockAlert.groupBy({
      by: ['alertType', 'status'],
      _count: { id: true },
      where: { status: { in: ['ACTIVE', 'ACKNOWLEDGED'] } },
    });

    res.json({ data: summary });
  } catch (error) {
    next(error);
  }
});

// PUT /inventory/alerts/:id/acknowledge - Acknowledge an alert
inventoryRouter.put('/alerts/:id/acknowledge', requirePermission('inventory:write'), validateParams(idParamSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params as unknown as { id: number };
    const user = req.user;

    const alert = await req.prisma!.stockAlert.findUnique({ where: { id } });
    if (!alert) {
      throw AppError.notFound('Stock Alert');
    }

    if (alert.status !== 'ACTIVE') {
      throw AppError.badRequest('Only active alerts can be acknowledged');
    }

    const updated = await req.prisma!.stockAlert.update({
      where: { id },
      data: {
        status: 'ACKNOWLEDGED',
        acknowledgedBy: user?.userId,
        acknowledgedAt: new Date(),
      },
      include: {
        item: { select: { id: true, code: true, name: true } },
      },
    });

    res.json({ message: 'Alert acknowledged', data: updated });
  } catch (error) {
    next(error);
  }
});

// PUT /inventory/alerts/:id/resolve - Resolve an alert
inventoryRouter.put('/alerts/:id/resolve', requirePermission('inventory:write'), validateParams(idParamSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params as unknown as { id: number };

    const alert = await req.prisma!.stockAlert.findUnique({ where: { id } });
    if (!alert) {
      throw AppError.notFound('Stock Alert');
    }

    if (alert.status === 'RESOLVED') {
      throw AppError.badRequest('Alert is already resolved');
    }

    const updated = await req.prisma!.stockAlert.update({
      where: { id },
      data: {
        status: 'RESOLVED',
        resolvedAt: new Date(),
      },
    });

    res.json({ message: 'Alert resolved', data: updated });
  } catch (error) {
    next(error);
  }
});

// PUT /inventory/alerts/:id/ignore - Ignore an alert
inventoryRouter.put('/alerts/:id/ignore', requirePermission('inventory:write'), validateParams(idParamSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params as unknown as { id: number };

    const alert = await req.prisma!.stockAlert.findUnique({ where: { id } });
    if (!alert) {
      throw AppError.notFound('Stock Alert');
    }

    const updated = await req.prisma!.stockAlert.update({
      where: { id },
      data: { status: 'IGNORED' },
    });

    res.json({ message: 'Alert ignored', data: updated });
  } catch (error) {
    next(error);
  }
});

// ============================================
// UNITS LOOKUP (helper for inventory)
// ============================================

// GET /inventory/units/lookup - Get available units
inventoryRouter.get('/units/lookup', requirePermission('inventory:read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const units = await req.prisma!.unit.findMany({
      where: { isActive: true },
      select: {
        id: true,
        code: true,
        name: true,
        category: true,
      },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
    res.json({ data: units });
  } catch (error) {
    next(error);
  }
});
