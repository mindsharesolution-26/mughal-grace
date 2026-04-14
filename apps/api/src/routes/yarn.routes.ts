import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenant';
import { requirePermission } from '../middleware/rbac';
import { validateBody, validateParams } from '../middleware/validate';
import { AppError } from '../middleware/error-handler';
import { yarnLedgerRouter } from './yarn-ledger.routes';
import { yarnOutwardRouter } from './yarn-outward.routes';

export const yarnRouter: Router = Router();

// Apply authentication and tenant middleware
yarnRouter.use(authMiddleware);
yarnRouter.use(tenantMiddleware);

// Mount sub-routers
yarnRouter.use('/ledger', yarnLedgerRouter);
yarnRouter.use('/outwards', yarnOutwardRouter);

// ============================================
// YARN TYPES CRUD
// ============================================

// Fiber composition schema
const fiberCompositionSchema = z.object({
  fiberType: z.string().min(1, 'Fiber type is required'),
  percentage: z.number().min(0).max(100, 'Percentage must be 0-100'),
});

// Validation schemas
const createYarnTypeSchema = z.object({
  code: z.string().max(50).optional(), // Auto-generated if not provided
  name: z.string().min(1, 'Name is required').max(255),
  description: z.string().optional(),
  brandName: z.string().min(1, 'Brand name is required').max(255),
  color: z.string().min(1, 'Color is required').max(100),
  grade: z.string().min(1, 'Grade is required').max(50),

  // Composition (array of fiber types with percentages)
  composition: z.array(fiberCompositionSchema).optional(),

  // Count/thickness
  countValue: z.number().positive().optional(),
  countSystem: z.enum(['NE', 'TEX', 'DENIER', 'NM']).optional(),

  // Pricing
  defaultPricePerKg: z.number().positive().optional(),
  priceUnit: z.enum(['KG', 'LB', 'CONE']).optional(),
  currency: z.string().max(10).optional(),

  // Classification
  category: z.string().max(100).optional(),
  tags: z.array(z.string()).optional(),
  certifications: z.array(z.string()).optional(),

  isActive: z.boolean().optional(),
});

const updateYarnTypeSchema = createYarnTypeSchema.partial();

const idParamSchema = z.object({
  id: z.string().regex(/^\d+$/, 'Invalid ID format').transform(Number),
});

// GET /yarn/types/lookup - Lightweight lookup for dropdowns (all modules use this)
yarnRouter.get('/types/lookup', requirePermission('yarn:read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const yarnTypes = await req.prisma!.yarnType.findMany({
      where: { isActive: true },
      select: {
        id: true,
        code: true,
        name: true,
        brandName: true,
        color: true,
        grade: true,
        defaultPricePerKg: true,
      },
      orderBy: { name: 'asc' },
    });
    res.json({ data: yarnTypes });
  } catch (error) {
    next(error);
  }
});

// GET /yarn/types - List all yarn types
yarnRouter.get('/types', requirePermission('yarn:read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const yarnTypes = await req.prisma!.yarnType.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json({ data: yarnTypes });
  } catch (error) {
    next(error);
  }
});

// GET /yarn/types/:id - Get single yarn type
yarnRouter.get('/types/:id', requirePermission('yarn:read'), validateParams(idParamSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params as unknown as { id: number };
    const yarnType = await req.prisma!.yarnType.findUnique({
      where: { id },
    });
    if (!yarnType) {
      throw AppError.notFound('Yarn type');
    }
    res.json({ data: yarnType });
  } catch (error) {
    next(error);
  }
});

// POST /yarn/types - Create yarn type
yarnRouter.post('/types', requirePermission('yarn:write'), validateBody(createYarnTypeSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Auto-generate code if not provided
    let typeCode = req.body.code;
    if (!typeCode) {
      const lastType = await req.prisma!.yarnType.findFirst({
        where: { code: { startsWith: 'YT-' } },
        orderBy: { code: 'desc' },
      });

      let nextNumber = 1;
      if (lastType && lastType.code) {
        const match = lastType.code.match(/YT-(\d+)/);
        if (match) {
          nextNumber = parseInt(match[1], 10) + 1;
        }
      }
      typeCode = `YT-${String(nextNumber).padStart(4, '0')}`;
    }

    // Check code uniqueness
    const existing = await req.prisma!.yarnType.findUnique({
      where: { code: typeCode },
    });
    if (existing) {
      throw AppError.conflict('Yarn type code already exists');
    }

    const yarnType = await req.prisma!.yarnType.create({
      data: {
        code: typeCode,
        name: req.body.name,
        description: req.body.description,
        brandName: req.body.brandName,
        color: req.body.color,
        grade: req.body.grade,
        composition: req.body.composition || null,
        countValue: req.body.countValue,
        countSystem: req.body.countSystem,
        defaultPricePerKg: req.body.defaultPricePerKg,
        priceUnit: req.body.priceUnit || 'KG',
        currency: req.body.currency || 'PKR',
        category: req.body.category,
        tags: req.body.tags || [],
        certifications: req.body.certifications || [],
        isActive: req.body.isActive ?? true,
      },
    });

    res.status(201).json({ message: 'Yarn type created', data: yarnType });
  } catch (error) {
    next(error);
  }
});

// PUT /yarn/types/:id - Update yarn type
yarnRouter.put('/types/:id', requirePermission('yarn:write'), validateParams(idParamSchema), validateBody(updateYarnTypeSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params as unknown as { id: number };

    // Check if exists
    const existing = await req.prisma!.yarnType.findUnique({ where: { id } });
    if (!existing) {
      throw AppError.notFound('Yarn type');
    }

    // Check code uniqueness if changing
    if (req.body.code && req.body.code !== existing.code) {
      const codeExists = await req.prisma!.yarnType.findUnique({
        where: { code: req.body.code },
      });
      if (codeExists) {
        throw AppError.conflict('Yarn type code already exists');
      }
    }

    // Build update data
    const updateData: any = {};
    if (req.body.code !== undefined) updateData.code = req.body.code;
    if (req.body.name !== undefined) updateData.name = req.body.name;
    if (req.body.description !== undefined) updateData.description = req.body.description;
    if (req.body.brandName !== undefined) updateData.brandName = req.body.brandName;
    if (req.body.color !== undefined) updateData.color = req.body.color;
    if (req.body.grade !== undefined) updateData.grade = req.body.grade;
    if (req.body.composition !== undefined) updateData.composition = req.body.composition;
    if (req.body.countValue !== undefined) updateData.countValue = req.body.countValue;
    if (req.body.countSystem !== undefined) updateData.countSystem = req.body.countSystem;
    if (req.body.defaultPricePerKg !== undefined) updateData.defaultPricePerKg = req.body.defaultPricePerKg;
    if (req.body.priceUnit !== undefined) updateData.priceUnit = req.body.priceUnit;
    if (req.body.currency !== undefined) updateData.currency = req.body.currency;
    if (req.body.category !== undefined) updateData.category = req.body.category;
    if (req.body.tags !== undefined) updateData.tags = req.body.tags;
    if (req.body.certifications !== undefined) updateData.certifications = req.body.certifications;
    if (req.body.isActive !== undefined) updateData.isActive = req.body.isActive;

    const yarnType = await req.prisma!.yarnType.update({
      where: { id },
      data: updateData,
    });

    res.json({ message: 'Yarn type updated', data: yarnType });
  } catch (error) {
    next(error);
  }
});

// DELETE /yarn/types/:id - Soft delete (set inactive)
yarnRouter.delete('/types/:id', requirePermission('yarn:write'), validateParams(idParamSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params as unknown as { id: number };

    const existing = await req.prisma!.yarnType.findUnique({ where: { id } });
    if (!existing) {
      throw AppError.notFound('Yarn type');
    }

    await req.prisma!.yarnType.update({
      where: { id },
      data: { isActive: false },
    });

    res.json({ message: 'Yarn type deactivated' });
  } catch (error) {
    next(error);
  }
});

// ============================================
// YARN VENDORS CRUD
// ============================================

const createVendorSchema = z.object({
  code: z.string().max(50).optional(), // Auto-generated if not provided
  name: z.string().min(1, 'Name is required').max(255),
  contactPerson: z.string().max(255).optional(),
  phone: z.string().max(50).optional(),
  email: z.string().max(255).optional().nullable(),
  address: z.string().optional(),
  city: z.string().max(100).optional(),
  creditLimit: z.number().positive().optional(),
  paymentTerms: z.number().int().min(0).optional(),
  rating: z.number().int().min(1).max(5).optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
});

const updateVendorSchema = createVendorSchema.partial();

// GET /yarn/vendors/lookup - Lightweight lookup for dropdowns
yarnRouter.get('/vendors/lookup', requirePermission('yarn:read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const vendors = await req.prisma!.yarnVendor.findMany({
      where: { isActive: true },
      select: {
        id: true,
        code: true,
        name: true,
      },
      orderBy: { name: 'asc' },
    });
    res.json({ data: vendors });
  } catch (error) {
    next(error);
  }
});

// GET /yarn/vendors - List all vendors
yarnRouter.get('/vendors', requirePermission('yarn:read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const vendors = await req.prisma!.yarnVendor.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json({ data: vendors });
  } catch (error) {
    next(error);
  }
});

// GET /yarn/vendors/:id - Get single vendor
yarnRouter.get('/vendors/:id', requirePermission('yarn:read'), validateParams(idParamSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params as unknown as { id: number };
    const vendor = await req.prisma!.yarnVendor.findUnique({
      where: { id },
    });
    if (!vendor) {
      throw AppError.notFound('Yarn vendor');
    }
    res.json({ data: vendor });
  } catch (error) {
    next(error);
  }
});

// POST /yarn/vendors - Create vendor
yarnRouter.post('/vendors', requirePermission('yarn:write'), validateBody(createVendorSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Auto-generate code if not provided
    let vendorCode = req.body.code;
    if (!vendorCode) {
      const lastVendor = await req.prisma!.yarnVendor.findFirst({
        where: { code: { startsWith: 'YV-' } },
        orderBy: { code: 'desc' },
      });

      let nextNumber = 1;
      if (lastVendor && lastVendor.code) {
        const match = lastVendor.code.match(/YV-(\d+)/);
        if (match) {
          nextNumber = parseInt(match[1], 10) + 1;
        }
      }
      vendorCode = `YV-${String(nextNumber).padStart(4, '0')}`;
    }

    const existing = await req.prisma!.yarnVendor.findUnique({
      where: { code: vendorCode },
    });
    if (existing) {
      throw AppError.conflict('Vendor code already exists');
    }

    const vendor = await req.prisma!.yarnVendor.create({
      data: {
        code: vendorCode,
        name: req.body.name,
        contactPerson: req.body.contactPerson,
        phone: req.body.phone,
        email: req.body.email || null,
        address: req.body.address,
        city: req.body.city,
        creditLimit: req.body.creditLimit,
        paymentTerms: req.body.paymentTerms ?? 30,
        rating: req.body.rating,
        notes: req.body.notes,
        isActive: req.body.isActive ?? true,
      },
    });

    res.status(201).json({ message: 'Vendor created', data: vendor });
  } catch (error) {
    next(error);
  }
});

// PUT /yarn/vendors/:id - Update vendor
yarnRouter.put('/vendors/:id', requirePermission('yarn:write'), validateParams(idParamSchema), validateBody(updateVendorSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params as unknown as { id: number };

    const existing = await req.prisma!.yarnVendor.findUnique({ where: { id } });
    if (!existing) {
      throw AppError.notFound('Yarn vendor');
    }

    if (req.body.code && req.body.code !== existing.code) {
      const codeExists = await req.prisma!.yarnVendor.findUnique({
        where: { code: req.body.code },
      });
      if (codeExists) {
        throw AppError.conflict('Vendor code already exists');
      }
    }

    const vendor = await req.prisma!.yarnVendor.update({
      where: { id },
      data: req.body,
    });

    res.json({ message: 'Vendor updated', data: vendor });
  } catch (error) {
    next(error);
  }
});

// DELETE /yarn/vendors/:id - Soft delete
yarnRouter.delete('/vendors/:id', requirePermission('yarn:write'), validateParams(idParamSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params as unknown as { id: number };

    const existing = await req.prisma!.yarnVendor.findUnique({ where: { id } });
    if (!existing) {
      throw AppError.notFound('Yarn vendor');
    }

    await req.prisma!.yarnVendor.update({
      where: { id },
      data: { isActive: false },
    });

    res.json({ message: 'Vendor deactivated' });
  } catch (error) {
    next(error);
  }
});

yarnRouter.get('/vendors/:id/ledger', requirePermission('yarn:read'), (_req, res) => {
  res.json({ message: 'Get vendor ledger - coming soon' });
});

// ============================================
// YARN BOXES (Inward with Ledger Integration)
// ============================================

const createBoxSchema = z.object({
  vendorId: z.number().int().positive('Vendor is required'),
  yarnTypeId: z.number().int().positive('Yarn type is required'),
  lotNumber: z.string().max(100).optional(),
  grossWeight: z.number().positive('Gross weight must be positive'),
  tareWeight: z.number().min(0).default(0),
  pricePerKg: z.number().positive('Price per KG is required'),
  receivedAt: z.string().min(1, 'Received date is required'),
  invoiceNumber: z.string().max(100).optional(),
  gatePassNumber: z.string().max(100).optional(),
  payOrderId: z.number().int().positive().optional(),
  paymentStatus: z.enum(['UNPAID', 'PARTIAL', 'PAID']).optional(),
  notes: z.string().optional(),
  cones: z.array(z.object({
    coneNumber: z.string().min(1, 'Cone number is required'),
    weight: z.number().positive('Cone weight must be positive'),
  })).optional(),
});

// GET /yarn/boxes - List yarn boxes
yarnRouter.get('/boxes', requirePermission('yarn:read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { vendorId, yarnTypeId, status, page = '1', limit = '50' } = req.query;

    const where: any = {};
    if (vendorId) where.vendorId = Number(vendorId);
    if (yarnTypeId) where.yarnTypeId = Number(yarnTypeId);
    if (status) where.status = status;

    const skip = (Number(page) - 1) * Number(limit);

    const [boxes, total] = await Promise.all([
      req.prisma!.yarnBox.findMany({
        where,
        include: {
          vendor: { select: { id: true, code: true, name: true } },
          yarnType: { select: { id: true, code: true, name: true, brandName: true, color: true } },
          cones: { select: { id: true, coneNumber: true, initialWeight: true, currentWeight: true, status: true } },
        },
        orderBy: { receivedAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      req.prisma!.yarnBox.count({ where }),
    ]);

    res.json({
      data: boxes,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /yarn/boxes - Create yarn box (inward) with ledger entry
yarnRouter.post('/boxes', requirePermission('yarn:write'), validateBody(createBoxSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.userId;

    // Validate vendor exists
    const vendor = await req.prisma!.yarnVendor.findUnique({ where: { id: req.body.vendorId } });
    if (!vendor) {
      throw AppError.notFound('Vendor');
    }

    // Validate yarn type exists
    const yarnType = await req.prisma!.yarnType.findUnique({ where: { id: req.body.yarnTypeId } });
    if (!yarnType) {
      throw AppError.notFound('Yarn type');
    }

    // Generate box number
    const lastBox = await req.prisma!.yarnBox.findFirst({
      where: { boxNumber: { startsWith: 'YB-' } },
      orderBy: { boxNumber: 'desc' },
    });
    let nextNum = 1;
    if (lastBox?.boxNumber) {
      const match = lastBox.boxNumber.match(/YB-(\d+)/);
      if (match) nextNum = parseInt(match[1]) + 1;
    }
    const boxNumber = `YB-${String(nextNum).padStart(6, '0')}`;

    // Calculate net weight and total value
    const netWeight = req.body.grossWeight - (req.body.tareWeight || 0);
    const totalValue = netWeight * req.body.pricePerKg;

    // Use transaction to create box, cones, and ledger entry atomically
    const result = await req.prisma!.$transaction(async (tx) => {
      // 1. Create YarnBox
      const yarnBox = await tx.yarnBox.create({
        data: {
          boxNumber,
          vendorId: req.body.vendorId,
          yarnTypeId: req.body.yarnTypeId,
          lotNumber: req.body.lotNumber,
          grossWeight: req.body.grossWeight,
          tareWeight: req.body.tareWeight || 0,
          netWeight,
          pricePerKg: req.body.pricePerKg,
          totalValue,
          receivedAt: new Date(req.body.receivedAt),
          invoiceNumber: req.body.invoiceNumber,
          gatePassNumber: req.body.gatePassNumber,
          payOrderId: req.body.payOrderId,
          status: 'IN_STOCK',
        },
      });

      // 2. Create YarnCones if provided
      let cones: any[] = [];
      if (req.body.cones && req.body.cones.length > 0) {
        for (const cone of req.body.cones) {
          const createdCone = await tx.yarnCone.create({
            data: {
              coneNumber: cone.coneNumber,
              boxId: yarnBox.id,
              yarnTypeId: req.body.yarnTypeId,
              initialWeight: cone.weight,
              currentWeight: cone.weight,
              usedWeight: 0,
              status: 'AVAILABLE',
            },
          });
          cones.push(createdCone);
        }
      }

      // 3. Get the last ledger entry for this yarn type to calculate running balance
      const lastLedgerEntry = await tx.yarnLedger.findFirst({
        where: { yarnTypeId: req.body.yarnTypeId },
        orderBy: [{ entryDate: 'desc' }, { id: 'desc' }],
      });

      const previousBalance = lastLedgerEntry?.runningBalance?.toNumber() || 0;
      const newBalance = previousBalance + netWeight;

      // 4. Create YarnLedger entry
      const ledgerEntry = await tx.yarnLedger.create({
        data: {
          yarnTypeId: req.body.yarnTypeId,
          entryDate: new Date(req.body.receivedAt),
          entryType: 'INWARD',
          quantityIn: netWeight,
          quantityOut: 0,
          runningBalance: newBalance,
          pricePerKg: req.body.pricePerKg,
          totalValue,
          referenceType: 'yarn_box',
          referenceId: yarnBox.id,
          referenceNumber: boxNumber,
          vendorId: req.body.vendorId,
          invoiceNumber: req.body.invoiceNumber,
          paymentStatus: req.body.paymentStatus || 'UNPAID',
          notes: req.body.notes,
          createdBy: userId,
        },
      });

      // 5. Update Pay Order if linked
      if (req.body.payOrderId) {
        // Find the PO item matching this yarn type
        const poItem = await tx.payOrderItem.findFirst({
          where: {
            payOrderId: req.body.payOrderId,
            yarnTypeId: req.body.yarnTypeId,
          },
        });

        if (poItem) {
          // Update received quantity on PO item
          const newReceivedQty = Number(poItem.receivedQuantity) + netWeight;
          await tx.payOrderItem.update({
            where: { id: poItem.id },
            data: { receivedQuantity: newReceivedQty },
          });

          // Check all items to determine PO status
          const allItems = await tx.payOrderItem.findMany({
            where: { payOrderId: req.body.payOrderId },
          });

          // After our update, recalculate
          const updatedItems = allItems.map(item =>
            item.id === poItem.id
              ? { ...item, receivedQuantity: newReceivedQty }
              : item
          );

          const allFullyReceived = updatedItems.every(
            item => Number(item.receivedQuantity) >= Number(item.orderedQuantity)
          );
          const someReceived = updatedItems.some(
            item => Number(item.receivedQuantity) > 0
          );

          // Update PO status
          let newStatus: 'SENT' | 'PARTIALLY_RECEIVED' | 'COMPLETED' = 'SENT';
          if (allFullyReceived) {
            newStatus = 'COMPLETED';
          } else if (someReceived) {
            newStatus = 'PARTIALLY_RECEIVED';
          }

          await tx.payOrder.update({
            where: { id: req.body.payOrderId },
            data: { status: newStatus },
          });
        }
      }

      return { yarnBox, cones, ledgerEntry };
    });

    // Fetch the complete box with relations
    const completeBox = await req.prisma!.yarnBox.findUnique({
      where: { id: result.yarnBox.id },
      include: {
        vendor: { select: { id: true, code: true, name: true } },
        yarnType: { select: { id: true, code: true, name: true, brandName: true, color: true } },
        cones: true,
      },
    });

    res.status(201).json({
      message: 'Yarn box created with ledger entry',
      data: {
        box: completeBox,
        ledgerEntry: result.ledgerEntry,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /yarn/boxes/:id - Get yarn box details
yarnRouter.get('/boxes/:id', requirePermission('yarn:read'), validateParams(idParamSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params as unknown as { id: number };

    const box = await req.prisma!.yarnBox.findUnique({
      where: { id },
      include: {
        vendor: true,
        yarnType: true,
        cones: {
          include: {
            machine: { select: { id: true, machineNumber: true, name: true } },
          },
        },
        payOrder: { select: { id: true, orderNumber: true, status: true } },
      },
    });

    if (!box) {
      throw AppError.notFound('Yarn box');
    }

    // Also fetch related ledger entry
    const ledgerEntry = await req.prisma!.yarnLedger.findFirst({
      where: {
        referenceType: 'yarn_box',
        referenceId: id,
      },
    });

    res.json({ data: { ...box, ledgerEntry } });
  } catch (error) {
    next(error);
  }
});

// ============================================
// YARN CONES (placeholder)
// ============================================

yarnRouter.get('/cones', requirePermission('yarn:read'), (_req, res) => {
  res.json({ message: 'List yarn cones - coming soon' });
});

yarnRouter.post('/cones/:id/assign', requirePermission('yarn:write'), (_req, res) => {
  res.json({ message: 'Assign cone to machine - coming soon' });
});

// ============================================
// STOCK SUMMARY (placeholder)
// ============================================

yarnRouter.get('/stock/summary', requirePermission('yarn:read'), (_req, res) => {
  res.json({ message: 'Get yarn stock summary - coming soon' });
});

// ============================================
// PAY ORDERS (Purchase Orders for Yarn)
// ============================================

const createPayOrderSchema = z.object({
  vendorId: z.number().int().positive('Vendor is required'),
  orderDate: z.string().min(1, 'Order date is required'),
  expectedDeliveryDate: z.string().optional(),
  items: z.array(z.object({
    yarnTypeId: z.number().int().positive('Yarn type is required'),
    orderedQuantity: z.number().positive('Quantity must be positive'),
    unit: z.string().default('KG'),
    pricePerUnit: z.number().positive().optional(),
    notes: z.string().optional(),
  })).min(1, 'At least one item is required'),
  terms: z.string().optional(),
  notes: z.string().optional(),
});

const updatePayOrderSchema = z.object({
  expectedDeliveryDate: z.string().optional(),
  terms: z.string().optional(),
  notes: z.string().optional(),
});

// GET /yarn/pay-orders - List all pay orders
yarnRouter.get('/pay-orders', requirePermission('yarn:read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payOrders = await req.prisma!.payOrder.findMany({
      include: {
        vendor: {
          select: { id: true, code: true, name: true },
        },
        items: {
          include: {
            yarnType: {
              select: { id: true, code: true, name: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ data: payOrders });
  } catch (error) {
    next(error);
  }
});

// GET /yarn/pay-orders/:id - Get single pay order
yarnRouter.get('/pay-orders/:id', requirePermission('yarn:read'), validateParams(idParamSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params as unknown as { id: number };
    const payOrder = await req.prisma!.payOrder.findUnique({
      where: { id },
      include: {
        vendor: true,
        items: {
          include: {
            yarnType: true,
          },
        },
      },
    });
    if (!payOrder) {
      throw AppError.notFound('Pay order');
    }
    res.json({ data: payOrder });
  } catch (error) {
    next(error);
  }
});

// POST /yarn/pay-orders - Create pay order
yarnRouter.post('/pay-orders', requirePermission('yarn:write'), validateBody(createPayOrderSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Generate order number
    const lastOrder = await req.prisma!.payOrder.findFirst({
      orderBy: { id: 'desc' },
      select: { orderNumber: true },
    });

    const year = new Date().getFullYear();
    let nextNum = 1;
    if (lastOrder?.orderNumber) {
      const match = lastOrder.orderNumber.match(/PO-(\d{4})-(\d+)/);
      if (match && match[1] === String(year)) {
        nextNum = parseInt(match[2]) + 1;
      }
    }
    const orderNumber = `PO-${year}-${String(nextNum).padStart(4, '0')}`;

    // Calculate total quantity
    const totalQuantity = req.body.items.reduce(
      (sum: number, item: any) => sum + Number(item.orderedQuantity),
      0
    );

    // Calculate total amount if prices provided
    const totalAmount = req.body.items.reduce(
      (sum: number, item: any) => {
        if (item.pricePerUnit) {
          return sum + (Number(item.orderedQuantity) * Number(item.pricePerUnit));
        }
        return sum;
      },
      0
    );

    const payOrder = await req.prisma!.payOrder.create({
      data: {
        orderNumber,
        vendorId: req.body.vendorId,
        orderDate: new Date(req.body.orderDate),
        expectedDeliveryDate: req.body.expectedDeliveryDate ? new Date(req.body.expectedDeliveryDate) : null,
        totalQuantity,
        totalAmount: totalAmount > 0 ? totalAmount : null,
        status: req.body.status || 'DRAFT',
        terms: req.body.terms,
        notes: req.body.notes,
        createdBy: (req as any).user?.userId,
        items: {
          create: req.body.items.map((item: any) => ({
            yarnTypeId: item.yarnTypeId,
            orderedQuantity: item.orderedQuantity,
            unit: item.unit || 'KG',
            pricePerUnit: item.pricePerUnit,
            amount: item.pricePerUnit ? item.orderedQuantity * item.pricePerUnit : null,
            notes: item.notes,
          })),
        },
      },
      include: {
        vendor: true,
        items: {
          include: {
            yarnType: true,
          },
        },
      },
    });

    res.status(201).json({ message: 'Pay order created', data: payOrder });
  } catch (error) {
    next(error);
  }
});

// PUT /yarn/pay-orders/:id - Update pay order (only DRAFT status)
yarnRouter.put('/pay-orders/:id', requirePermission('yarn:write'), validateParams(idParamSchema), validateBody(updatePayOrderSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params as unknown as { id: number };

    const existing = await req.prisma!.payOrder.findUnique({ where: { id } });
    if (!existing) {
      throw AppError.notFound('Pay order');
    }

    // Only allow updates to DRAFT orders
    if (existing.status !== 'DRAFT') {
      throw AppError.badRequest('Can only update orders in DRAFT status');
    }

    const updateData: any = { ...req.body };
    if (req.body.expectedDeliveryDate) {
      updateData.expectedDeliveryDate = new Date(req.body.expectedDeliveryDate);
    }

    const payOrder = await req.prisma!.payOrder.update({
      where: { id },
      data: updateData,
      include: {
        vendor: true,
        items: {
          include: {
            yarnType: true,
          },
        },
      },
    });

    res.json({ message: 'Pay order updated', data: payOrder });
  } catch (error) {
    next(error);
  }
});

// POST /yarn/pay-orders/:id/approve - Approve pay order (DRAFT -> APPROVED)
yarnRouter.post('/pay-orders/:id/approve', requirePermission('yarn:write'), validateParams(idParamSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params as unknown as { id: number };
    const userId = (req as any).user?.userId;

    const existing = await req.prisma!.payOrder.findUnique({ where: { id } });
    if (!existing) {
      throw AppError.notFound('Pay order');
    }

    if (existing.status !== 'DRAFT') {
      throw AppError.badRequest('Can only approve orders in DRAFT status');
    }

    const payOrder = await req.prisma!.payOrder.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedBy: userId,
        approvedAt: new Date(),
      },
      include: {
        vendor: true,
        items: { include: { yarnType: true } },
      },
    });

    res.json({ message: 'Pay order approved', data: payOrder });
  } catch (error) {
    next(error);
  }
});

// POST /yarn/pay-orders/:id/send - Mark as sent to vendor (APPROVED -> SENT)
yarnRouter.post('/pay-orders/:id/send', requirePermission('yarn:write'), validateParams(idParamSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params as unknown as { id: number };

    const existing = await req.prisma!.payOrder.findUnique({ where: { id } });
    if (!existing) {
      throw AppError.notFound('Pay order');
    }

    if (existing.status !== 'APPROVED') {
      throw AppError.badRequest('Can only send approved orders');
    }

    const payOrder = await req.prisma!.payOrder.update({
      where: { id },
      data: {
        status: 'SENT',
        sentAt: new Date(),
      },
      include: {
        vendor: true,
        items: { include: { yarnType: true } },
      },
    });

    res.json({ message: 'Pay order marked as sent', data: payOrder });
  } catch (error) {
    next(error);
  }
});

// POST /yarn/pay-orders/:id/cancel - Cancel pay order
yarnRouter.post('/pay-orders/:id/cancel', requirePermission('yarn:write'), validateParams(idParamSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params as unknown as { id: number };

    const existing = await req.prisma!.payOrder.findUnique({ where: { id } });
    if (!existing) {
      throw AppError.notFound('Pay order');
    }

    // Only allow cancellation of DRAFT, APPROVED, or SENT orders
    if (!['DRAFT', 'APPROVED', 'SENT'].includes(existing.status)) {
      throw AppError.badRequest('Cannot cancel this order - it has received items');
    }

    await req.prisma!.payOrder.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    res.json({ message: 'Pay order cancelled' });
  } catch (error) {
    next(error);
  }
});

// DELETE /yarn/pay-orders/:id - Delete pay order (only DRAFT)
yarnRouter.delete('/pay-orders/:id', requirePermission('yarn:write'), validateParams(idParamSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params as unknown as { id: number };

    const existing = await req.prisma!.payOrder.findUnique({ where: { id } });
    if (!existing) {
      throw AppError.notFound('Pay order');
    }

    // Only allow deletion of DRAFT orders
    if (existing.status !== 'DRAFT') {
      throw AppError.badRequest('Can only delete orders in DRAFT status');
    }

    // Delete items first, then order
    await req.prisma!.$transaction([
      req.prisma!.payOrderItem.deleteMany({ where: { payOrderId: id } }),
      req.prisma!.payOrder.delete({ where: { id } }),
    ]);

    res.json({ message: 'Pay order deleted' });
  } catch (error) {
    next(error);
  }
});

// ============================================
// KNITTING YARNS / BLENDS CRUD
// ============================================

const blendItemSchema = z.object({
  yarnTypeId: z.number().int().positive('Yarn type is required'),
  percentage: z.number().min(0.01).max(100, 'Percentage must be between 0.01 and 100'),
});

const createKnittingYarnSchema = z.object({
  code: z.string().max(50).optional(), // Auto-generated if not provided
  name: z.string().min(1, 'Name is required').max(255),
  description: z.string().optional(),
  defaultPricePerKg: z.number().positive().optional(),
  yarnTypes: z.array(blendItemSchema).min(1, 'At least one yarn type is required'),
  isActive: z.boolean().optional(),
});

const updateKnittingYarnSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  defaultPricePerKg: z.number().positive().optional(),
  yarnTypes: z.array(blendItemSchema).min(1).optional(),
  isActive: z.boolean().optional(),
});

// Helper function to generate blend summary
const generateBlendSummary = async (prisma: any, yarnTypes: { yarnTypeId: number; percentage: number }[]) => {
  const typeIds = yarnTypes.map(yt => yt.yarnTypeId);
  const types = await prisma.yarnType.findMany({
    where: { id: { in: typeIds } },
    select: { id: true, name: true, brandName: true, color: true },
  });

  const typeMap = new Map<number, { id: number; name: string; brandName: string; color: string }>(
    types.map((t: any) => [t.id, t])
  );
  const summary = yarnTypes
    .map(yt => {
      const type = typeMap.get(yt.yarnTypeId);
      return type ? `${yt.percentage}% ${type.name}` : null;
    })
    .filter(Boolean)
    .join(' + ');

  return summary;
};

// GET /yarn/blends/lookup - Lightweight lookup for dropdowns
yarnRouter.get('/blends/lookup', requirePermission('yarn:read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const blends = await req.prisma!.knittingYarn.findMany({
      where: { isActive: true },
      select: {
        id: true,
        code: true,
        name: true,
        blendSummary: true,
        defaultPricePerKg: true,
      },
      orderBy: { name: 'asc' },
    });
    res.json({ data: blends });
  } catch (error) {
    next(error);
  }
});

// GET /yarn/blends - List all knitting yarns/blends
yarnRouter.get('/blends', requirePermission('yarn:read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const blends = await req.prisma!.knittingYarn.findMany({
      include: {
        yarnTypes: {
          include: {
            yarnType: {
              select: { id: true, code: true, name: true, brandName: true, color: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ data: blends });
  } catch (error) {
    next(error);
  }
});

// GET /yarn/blends/:id - Get single blend
yarnRouter.get('/blends/:id', requirePermission('yarn:read'), validateParams(idParamSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params as unknown as { id: number };
    const blend = await req.prisma!.knittingYarn.findUnique({
      where: { id },
      include: {
        yarnTypes: {
          include: {
            yarnType: true,
          },
        },
      },
    });
    if (!blend) {
      throw AppError.notFound('Knitting yarn');
    }
    res.json({ data: blend });
  } catch (error) {
    next(error);
  }
});

// POST /yarn/blends - Create knitting yarn/blend
yarnRouter.post('/blends', requirePermission('yarn:write'), validateBody(createKnittingYarnSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validate total percentage equals 100%
    const totalPercentage = req.body.yarnTypes.reduce(
      (sum: number, yt: any) => sum + Number(yt.percentage),
      0
    );
    if (Math.abs(totalPercentage - 100) > 0.01) {
      throw AppError.badRequest('Total percentage must equal 100%');
    }

    // Auto-generate code if not provided
    let blendCode = req.body.code;
    if (!blendCode) {
      const lastBlend = await req.prisma!.knittingYarn.findFirst({
        where: { code: { startsWith: 'KY-' } },
        orderBy: { code: 'desc' },
      });

      let nextNumber = 1;
      if (lastBlend && lastBlend.code) {
        const match = lastBlend.code.match(/KY-(\d+)/);
        if (match) {
          nextNumber = parseInt(match[1], 10) + 1;
        }
      }
      blendCode = `KY-${String(nextNumber).padStart(4, '0')}`;
    }

    // Check code uniqueness
    const existing = await req.prisma!.knittingYarn.findUnique({
      where: { code: blendCode },
    });
    if (existing) {
      throw AppError.conflict('Knitting yarn code already exists');
    }

    // Generate blend summary
    const blendSummary = await generateBlendSummary(req.prisma!, req.body.yarnTypes);

    // Calculate weighted average price if not provided
    let defaultPrice = req.body.defaultPricePerKg;
    if (!defaultPrice) {
      const typeIds = req.body.yarnTypes.map((yt: any) => yt.yarnTypeId);
      const types = await req.prisma!.yarnType.findMany({
        where: { id: { in: typeIds } },
        select: { id: true, defaultPricePerKg: true },
      });
      const priceMap = new Map(types.map((t: any) => [t.id, t.defaultPricePerKg]));

      let totalWeightedPrice = 0;
      for (const yt of req.body.yarnTypes) {
        const price = priceMap.get(yt.yarnTypeId);
        if (price) {
          totalWeightedPrice += (Number(price) * yt.percentage) / 100;
        }
      }
      if (totalWeightedPrice > 0) {
        defaultPrice = Math.round(totalWeightedPrice * 100) / 100;
      }
    }

    const knittingYarn = await req.prisma!.knittingYarn.create({
      data: {
        code: blendCode,
        name: req.body.name,
        description: req.body.description,
        blendSummary,
        defaultPricePerKg: defaultPrice,
        isActive: req.body.isActive ?? true,
        yarnTypes: {
          create: req.body.yarnTypes.map((yt: any) => ({
            yarnTypeId: yt.yarnTypeId,
            percentage: yt.percentage,
          })),
        },
      },
      include: {
        yarnTypes: {
          include: {
            yarnType: {
              select: { id: true, code: true, name: true, brandName: true, color: true },
            },
          },
        },
      },
    });

    res.status(201).json({ message: 'Knitting yarn created', data: knittingYarn });
  } catch (error) {
    next(error);
  }
});

// PUT /yarn/blends/:id - Update knitting yarn/blend
yarnRouter.put('/blends/:id', requirePermission('yarn:write'), validateParams(idParamSchema), validateBody(updateKnittingYarnSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params as unknown as { id: number };

    const existing = await req.prisma!.knittingYarn.findUnique({ where: { id } });
    if (!existing) {
      throw AppError.notFound('Knitting yarn');
    }

    // If updating yarn types, validate percentages
    if (req.body.yarnTypes) {
      const totalPercentage = req.body.yarnTypes.reduce(
        (sum: number, yt: any) => sum + Number(yt.percentage),
        0
      );
      if (Math.abs(totalPercentage - 100) > 0.01) {
        throw AppError.badRequest('Total percentage must equal 100%');
      }
    }

    // Build update data
    const updateData: any = {};
    if (req.body.name !== undefined) updateData.name = req.body.name;
    if (req.body.description !== undefined) updateData.description = req.body.description;
    if (req.body.defaultPricePerKg !== undefined) updateData.defaultPricePerKg = req.body.defaultPricePerKg;
    if (req.body.isActive !== undefined) updateData.isActive = req.body.isActive;

    // If updating yarn types, regenerate blend summary
    if (req.body.yarnTypes) {
      updateData.blendSummary = await generateBlendSummary(req.prisma!, req.body.yarnTypes);
    }

    // Use transaction if updating yarn types
    if (req.body.yarnTypes) {
      const knittingYarn = await req.prisma!.$transaction(async (tx: any) => {
        // Delete existing yarn type relations
        await tx.yarnTypeKnittingYarn.deleteMany({
          where: { knittingYarnId: id },
        });

        // Update knitting yarn and create new relations
        return tx.knittingYarn.update({
          where: { id },
          data: {
            ...updateData,
            yarnTypes: {
              create: req.body.yarnTypes.map((yt: any) => ({
                yarnTypeId: yt.yarnTypeId,
                percentage: yt.percentage,
              })),
            },
          },
          include: {
            yarnTypes: {
              include: {
                yarnType: {
                  select: { id: true, code: true, name: true, brandName: true, color: true },
                },
              },
            },
          },
        });
      });

      res.json({ message: 'Knitting yarn updated', data: knittingYarn });
    } else {
      const knittingYarn = await req.prisma!.knittingYarn.update({
        where: { id },
        data: updateData,
        include: {
          yarnTypes: {
            include: {
              yarnType: {
                select: { id: true, code: true, name: true, brandName: true, color: true },
              },
            },
          },
        },
      });

      res.json({ message: 'Knitting yarn updated', data: knittingYarn });
    }
  } catch (error) {
    next(error);
  }
});

// DELETE /yarn/blends/:id - Soft delete (set inactive)
yarnRouter.delete('/blends/:id', requirePermission('yarn:write'), validateParams(idParamSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params as unknown as { id: number };

    const existing = await req.prisma!.knittingYarn.findUnique({ where: { id } });
    if (!existing) {
      throw AppError.notFound('Knitting yarn');
    }

    await req.prisma!.knittingYarn.update({
      where: { id },
      data: { isActive: false },
    });

    res.json({ message: 'Knitting yarn deactivated' });
  } catch (error) {
    next(error);
  }
});
