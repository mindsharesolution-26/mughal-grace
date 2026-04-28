import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenant';
import { requirePermission } from '../middleware/rbac';
import { AppError } from '../middleware/error-handler';

export const dyeingRouter: Router = Router();

dyeingRouter.use(authMiddleware);
dyeingRouter.use(tenantMiddleware);

// ============ DYEING VENDORS ============

// GET /dyeing/vendors - List all dyeing vendors
dyeingRouter.get('/vendors', requirePermission('dyeing:read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { search, isActive } = req.query;

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { code: { contains: search as string, mode: 'insensitive' } },
      ];
    }
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const vendors = await req.prisma!.dyeingVendor.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { dyeingOrders: true },
        },
      },
    });

    // Calculate stats for each vendor
    const vendorsWithStats = await Promise.all(
      vendors.map(async (vendor) => {
        const activeOrders = await req.prisma!.dyeingOrder.count({
          where: {
            vendorId: vendor.id,
            status: { in: ['SENT', 'IN_PROCESS', 'READY'] },
          },
        });

        const completedOrders = await req.prisma!.dyeingOrder.findMany({
          where: {
            vendorId: vendor.id,
            status: 'COMPLETED',
            NOT: [
              { receivedAt: null },
              { sentAt: null },
            ],
          },
          select: {
            sentAt: true,
            receivedAt: true,
            sentWeight: true,
            receivedWeight: true,
          },
        });

        // Calculate average turnaround days
        let avgTurnaround = 0;
        if (completedOrders.length > 0) {
          const totalDays = completedOrders.reduce((sum, order) => {
            const days = Math.ceil(
              (new Date(order.receivedAt!).getTime() - new Date(order.sentAt).getTime()) /
                (1000 * 60 * 60 * 24)
            );
            return sum + days;
          }, 0);
          avgTurnaround = Math.round(totalDays / completedOrders.length);
        }

        // Calculate average weight variance
        let avgWeightVariance = 0;
        const ordersWithWeightData = completedOrders.filter(
          (o) => o.receivedWeight !== null
        );
        if (ordersWithWeightData.length > 0) {
          const totalVariance = ordersWithWeightData.reduce((sum, order) => {
            const variance =
              ((Number(order.receivedWeight) - Number(order.sentWeight)) /
                Number(order.sentWeight)) *
              100;
            return sum + variance;
          }, 0);
          avgWeightVariance = Number((totalVariance / ordersWithWeightData.length).toFixed(2));
        }

        return {
          ...vendor,
          activeOrders,
          completedOrders: completedOrders.length,
          avgTurnaround,
          avgWeightVariance,
        };
      })
    );

    res.json(vendorsWithStats);
  } catch (error) {
    next(error);
  }
});

// GET /dyeing/vendors/lookup - Get vendors for dropdown
dyeingRouter.get('/vendors/lookup', requirePermission('dyeing:read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const vendors = await req.prisma!.dyeingVendor.findMany({
      where: { isActive: true },
      select: {
        id: true,
        code: true,
        name: true,
      },
      orderBy: { name: 'asc' },
    });

    res.json(vendors);
  } catch (error) {
    next(error);
  }
});

// Vendor schema
const vendorSchema = z.object({
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(255),
  contactPerson: z.string().max(255).optional(),
  phone: z.string().max(50).optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  city: z.string().max(100).optional(),
  ntn: z.string().max(50).optional(),
  strn: z.string().max(50).optional(),
  paymentTerms: z.string().max(100).optional(),
  defaultRatePerKg: z.number().positive().optional(),
  qualityRating: z.number().min(0).max(5).optional(),
});

// POST /dyeing/vendors - Create vendor
dyeingRouter.post('/vendors', requirePermission('dyeing:write'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = vendorSchema.parse(req.body);

    // Check for duplicate code
    const existing = await req.prisma!.dyeingVendor.findUnique({
      where: { code: data.code },
    });
    if (existing) {
      throw AppError.conflict('Vendor code already exists');
    }

    const vendor = await req.prisma!.dyeingVendor.create({
      data: {
        ...data,
        email: data.email || null,
      },
    });

    res.status(201).json(vendor);
  } catch (error) {
    next(error);
  }
});

// GET /dyeing/vendors/:id - Get vendor by ID
dyeingRouter.get('/vendors/:id', requirePermission('dyeing:read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);

    const vendor = await req.prisma!.dyeingVendor.findUnique({
      where: { id },
      include: {
        dyeingOrders: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            _count: { select: { items: true } },
          },
        },
      },
    });

    if (!vendor) {
      throw AppError.notFound('Dyeing vendor');
    }

    res.json(vendor);
  } catch (error) {
    next(error);
  }
});

// PUT /dyeing/vendors/:id - Update vendor
dyeingRouter.put('/vendors/:id', requirePermission('dyeing:write'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const data = vendorSchema.partial().parse(req.body);

    const existing = await req.prisma!.dyeingVendor.findUnique({
      where: { id },
    });
    if (!existing) {
      throw AppError.notFound('Dyeing vendor');
    }

    // Check for duplicate code if changing
    if (data.code && data.code !== existing.code) {
      const duplicate = await req.prisma!.dyeingVendor.findUnique({
        where: { code: data.code },
      });
      if (duplicate) {
        throw AppError.conflict('Vendor code already exists');
      }
    }

    const vendor = await req.prisma!.dyeingVendor.update({
      where: { id },
      data: {
        ...data,
        email: data.email === '' ? null : data.email,
      },
    });

    res.json(vendor);
  } catch (error) {
    next(error);
  }
});

// ============ DYEING ORDERS ============

// GET /dyeing/orders - List dyeing orders
dyeingRouter.get('/orders', requirePermission('dyeing:read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      page = '1',
      limit = '20',
      status,
      vendorId,
      search,
      fromDate,
      toDate,
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    if (status) {
      where.status = status;
    }
    if (vendorId) {
      where.vendorId = parseInt(vendorId as string);
    }
    if (search) {
      where.OR = [
        { orderNumber: { contains: search as string, mode: 'insensitive' } },
        { colorName: { contains: search as string, mode: 'insensitive' } },
        { vendor: { name: { contains: search as string, mode: 'insensitive' } } },
      ];
    }
    if (fromDate) {
      where.sentAt = { ...where.sentAt, gte: new Date(fromDate as string) };
    }
    if (toDate) {
      where.sentAt = { ...where.sentAt, lte: new Date(toDate as string) };
    }

    const [orders, total] = await Promise.all([
      req.prisma!.dyeingOrder.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          vendor: {
            select: { id: true, code: true, name: true },
          },
          _count: { select: { items: true } },
        },
      }),
      req.prisma!.dyeingOrder.count({ where }),
    ]);

    res.json({
      orders,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /dyeing/orders/stats - Dashboard stats
dyeingRouter.get('/orders/stats', requirePermission('dyeing:read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [pending, inProgress, ready, totalPendingWeight] = await Promise.all([
      req.prisma!.dyeingOrder.count({ where: { status: 'SENT' } }),
      req.prisma!.dyeingOrder.count({ where: { status: 'IN_PROCESS' } }),
      req.prisma!.dyeingOrder.count({ where: { status: 'READY' } }),
      req.prisma!.dyeingOrder.aggregate({
        where: { status: { in: ['SENT', 'IN_PROCESS', 'READY'] } },
        _sum: { sentWeight: true },
      }),
    ]);

    // Calculate average weight loss from completed orders
    const completedOrders = await req.prisma!.dyeingOrder.findMany({
      where: {
        status: 'COMPLETED',
        receivedWeight: { not: null },
      },
      select: {
        sentWeight: true,
        receivedWeight: true,
      },
    });

    let avgWeightLoss = 0;
    if (completedOrders.length > 0) {
      const totalLoss = completedOrders.reduce((sum, order) => {
        const loss =
          ((Number(order.sentWeight) - Number(order.receivedWeight!)) /
            Number(order.sentWeight)) *
          100;
        return sum + loss;
      }, 0);
      avgWeightLoss = Number((totalLoss / completedOrders.length).toFixed(2));
    }

    res.json({
      pending,
      inProgress,
      ready,
      pendingWeight: Number(totalPendingWeight._sum.sentWeight) || 0,
      avgWeightLoss,
    });
  } catch (error) {
    next(error);
  }
});

// Generate order number
async function generateOrderNumber(prisma: any): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `DYE-${year}-`;

  const lastOrder = await prisma.dyeingOrder.findFirst({
    where: { orderNumber: { startsWith: prefix } },
    orderBy: { orderNumber: 'desc' },
  });

  let sequence = 1;
  if (lastOrder) {
    const lastSequence = parseInt(lastOrder.orderNumber.replace(prefix, ''));
    sequence = lastSequence + 1;
  }

  return `${prefix}${String(sequence).padStart(4, '0')}`;
}

// Order creation schema - ratePerKg and expectedReturnAt are now optional (handled by Finance)
const createOrderSchema = z.object({
  vendorId: z.number().int().positive(),
  colorCode: z.string().max(50).optional(),
  colorName: z.string().max(100).optional(),
  colorId: z.number().int().positive().optional(),
  processType: z.string().max(100).optional(),
  ratePerKg: z.number().positive().optional(), // Optional - Finance will handle rates
  expectedReturnAt: z.string().datetime().optional(), // Optional - not used in new flow
  notes: z.string().optional(),
  rollIds: z.array(z.number().int().positive()).min(1, 'At least one roll is required'),
  // New: Fabric grouping support
  fabricGroups: z.array(z.object({
    fabricId: z.number().int().positive().optional(),
    colorId: z.number().int().positive().optional(),
    colorCode: z.string().max(50).optional(),
    colorName: z.string().max(100).optional(),
    rollIds: z.array(z.number().int().positive()).min(1),
    notes: z.string().optional(),
  })).optional(),
});

// POST /dyeing/orders - Create dyeing order (send rolls for dyeing)
dyeingRouter.post('/orders', requirePermission('dyeing:write'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createOrderSchema.parse(req.body);

    // Verify vendor exists
    const vendor = await req.prisma!.dyeingVendor.findUnique({
      where: { id: data.vendorId },
    });
    if (!vendor) {
      throw AppError.notFound('Dyeing vendor');
    }

    // Verify all rolls exist and are in GREY_STOCK status
    const rolls = await req.prisma!.roll.findMany({
      where: {
        id: { in: data.rollIds },
      },
    });

    if (rolls.length !== data.rollIds.length) {
      throw AppError.badRequest('Some rolls were not found');
    }

    const invalidRolls = rolls.filter((r) => r.status !== 'GREY_STOCK');
    if (invalidRolls.length > 0) {
      throw AppError.badRequest(
        `Rolls must be in GREY_STOCK status. Invalid rolls: ${invalidRolls.map((r) => r.rollNumber).join(', ')}`
      );
    }

    // Calculate total weight
    const totalWeight = rolls.reduce((sum, r) => sum + Number(r.greyWeight), 0);

    // Generate order number
    const orderNumber = await generateOrderNumber(req.prisma!);

    // Create order with items in a transaction
    const order = await req.prisma!.$transaction(async (tx: any) => {
      // Create the dyeing order
      const newOrder = await tx.dyeingOrder.create({
        data: {
          orderNumber,
          vendor: {
            connect: { id: data.vendorId },
          },
          colorCode: data.colorCode,
          colorName: data.colorName,
          processType: data.processType,
          sentWeight: totalWeight,
          // Only include ratePerKg and totalAmount if rate is provided (Finance handles rates)
          ...(data.ratePerKg && {
            ratePerKg: data.ratePerKg,
            totalAmount: totalWeight * data.ratePerKg,
          }),
          sentAt: new Date(),
          expectedReturnAt: data.expectedReturnAt ? new Date(data.expectedReturnAt) : null,
          notes: data.notes,
          status: 'SENT',
          items: {
            create: rolls.map((roll) => ({
              roll: { connect: { id: roll.id } },
              sentWeight: roll.greyWeight,
            })),
          },
        },
        include: {
          vendor: { select: { id: true, code: true, name: true } },
          items: {
            include: {
              roll: { select: { id: true, rollNumber: true, fabricType: true, greyWeight: true } },
            },
          },
        },
      });

      // Update roll statuses
      await tx.roll.updateMany({
        where: { id: { in: data.rollIds } },
        data: { status: 'SENT_FOR_DYEING' },
      });

      // Create status history for each roll
      const userId = (req as any).user?.userId || null;
      await tx.rollStatusHistory.createMany({
        data: data.rollIds.map((rollId) => ({
          rollId,
          fromStatus: 'GREY_STOCK',
          toStatus: 'SENT_FOR_DYEING',
          changedBy: userId,
          notes: `Sent for dyeing - Order ${orderNumber}`,
        })),
      });

      return newOrder;
    });

    res.status(201).json(order);
  } catch (error) {
    next(error);
  }
});

// GET /dyeing/orders/:id - Get order details
dyeingRouter.get('/orders/:id', requirePermission('dyeing:read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);

    const order = await req.prisma!.dyeingOrder.findUnique({
      where: { id },
      include: {
        vendor: true,
        items: {
          include: {
            roll: {
              select: {
                id: true,
                rollNumber: true,
                fabricType: true,
                greyWeight: true,
                finishedWeight: true,
                grade: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      throw AppError.notFound('Dyeing order');
    }

    res.json(order);
  } catch (error) {
    next(error);
  }
});

// Receive schema
const receiveSchema = z.object({
  items: z.array(
    z.object({
      dyeingOrderItemId: z.number().int().positive(),
      receivedWeight: z.number().positive(),
      grade: z.string().max(10).optional(),
      defects: z.string().optional(),
      colorId: z.number().int().positive().optional(), // Color received from dyeing
    })
  ).min(1),
});

// POST /dyeing/orders/:id/receive - Receive rolls from dyeing
dyeingRouter.post('/orders/:id/receive', requirePermission('dyeing:write'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orderId = parseInt(req.params.id);
    const data = receiveSchema.parse(req.body);

    const order = await req.prisma!.dyeingOrder.findUnique({
      where: { id: orderId },
      include: {
        items: true,
      },
    });

    if (!order) {
      throw AppError.notFound('Dyeing order');
    }

    if (order.status === 'COMPLETED' || order.status === 'CANCELLED') {
      throw AppError.badRequest(`Cannot receive from ${order.status} order`);
    }

    // Verify all items belong to this order
    const orderItemIds = order.items.map((i) => i.id);
    const invalidItems = data.items.filter(
      (i) => !orderItemIds.includes(i.dyeingOrderItemId)
    );
    if (invalidItems.length > 0) {
      throw AppError.badRequest('Some items do not belong to this order');
    }

    // Process in transaction
    const updatedOrder = await req.prisma!.$transaction(async (tx: any) => {
      const userId = (req as any).user?.userId || null;

      // Update each item
      for (const item of data.items) {
        const orderItem = order.items.find((i) => i.id === item.dyeingOrderItemId);
        if (!orderItem) continue;

        // Update the dyeing order item
        await tx.dyeingOrderItem.update({
          where: { id: item.dyeingOrderItemId },
          data: {
            receivedWeight: item.receivedWeight,
            isReceived: true,
            grade: item.grade,
            defects: item.defects,
          },
        });

        // Update the roll
        await tx.roll.update({
          where: { id: orderItem.rollId },
          data: {
            status: 'DYEING_COMPLETE',
            finishedWeight: item.receivedWeight,
            grade: item.grade || 'A',
            colorId: item.colorId || null, // Color received from dyeing
          },
        });

        // Create roll status history
        await tx.rollStatusHistory.create({
          data: {
            rollId: orderItem.rollId,
            fromStatus: 'AT_DYEING',
            toStatus: 'DYEING_COMPLETE',
            changedBy: userId,
            notes: `Received from dyeing - Order ${order.orderNumber}`,
          },
        });
      }

      // Check if all items received
      const allReceived = await tx.dyeingOrderItem.count({
        where: {
          dyeingOrderId: orderId,
          isReceived: false,
        },
      });

      const totalReceivedWeight = await tx.dyeingOrderItem.aggregate({
        where: { dyeingOrderId: orderId, isReceived: true },
        _sum: { receivedWeight: true },
      });

      const receivedWeight = Number(totalReceivedWeight._sum.receivedWeight) || 0;
      const weightGainLoss = receivedWeight - Number(order.sentWeight);
      const weightVariance = (weightGainLoss / Number(order.sentWeight)) * 100;

      // Update order
      const updated = await tx.dyeingOrder.update({
        where: { id: orderId },
        data: {
          status: allReceived === 0 ? 'COMPLETED' : 'PARTIALLY_RECEIVED',
          receivedWeight,
          weightGainLoss,
          weightVariance,
          receivedAt: allReceived === 0 ? new Date() : null,
          totalAmount: receivedWeight * Number(order.ratePerKg),
        },
        include: {
          vendor: { select: { id: true, code: true, name: true } },
          items: {
            include: {
              roll: { select: { id: true, rollNumber: true, fabricType: true, greyWeight: true, finishedWeight: true } },
            },
          },
        },
      });

      return updated;
    });

    res.json(updatedOrder);
  } catch (error) {
    next(error);
  }
});

// PUT /dyeing/orders/:id/status - Update order status
dyeingRouter.put('/orders/:id/status', requirePermission('dyeing:write'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const { status, notes } = req.body;

    const validStatuses = ['SENT', 'IN_PROCESS', 'READY', 'PARTIALLY_RECEIVED', 'COMPLETED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      throw AppError.badRequest('Invalid status');
    }

    const order = await req.prisma!.dyeingOrder.findUnique({
      where: { id },
    });

    if (!order) {
      throw AppError.notFound('Dyeing order');
    }

    const updated = await req.prisma!.dyeingOrder.update({
      where: { id },
      data: {
        status,
        notes: notes || order.notes,
      },
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

// GET /dyeing/rolls/by-qr/:qrCode - Lookup roll by QR code for dyeing selection
dyeingRouter.get('/rolls/by-qr/:qrCode', requirePermission('dyeing:read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { qrCode } = req.params;

    // Find roll by QR code (case-insensitive search)
    const roll = await req.prisma!.roll.findFirst({
      where: {
        OR: [
          { rollNumber: { equals: qrCode, mode: 'insensitive' } },
          { qrCode: { equals: qrCode, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        rollNumber: true,
        qrCode: true,
        fabricType: true,
        greyWeight: true,
        grade: true,
        status: true,
        producedAt: true,
        fabricId: true,
        machine: {
          select: { id: true, machineNumber: true, name: true },
        },
        fabric: {
          select: { id: true, code: true, name: true },
        },
      },
    });

    if (!roll) {
      throw AppError.notFound('Roll not found with QR code: ' + qrCode);
    }

    // Validate roll status is GREY_STOCK
    if (roll.status !== 'GREY_STOCK') {
      throw AppError.badRequest(
        `Roll ${roll.rollNumber} is not available for dyeing. Current status: ${roll.status}`
      );
    }

    res.json(roll);
  } catch (error) {
    next(error);
  }
});

// GET /dyeing/orders/:id/print-data - Get formatted data for printing challans
dyeingRouter.get('/orders/:id/print-data', requirePermission('dyeing:read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);

    const order = await req.prisma!.dyeingOrder.findUnique({
      where: { id },
      include: {
        vendor: true,
        items: {
          include: {
            roll: {
              select: {
                id: true,
                rollNumber: true,
                fabricType: true,
                greyWeight: true,
                finishedWeight: true,
                grade: true,
                fabricId: true,
                fabric: {
                  select: { id: true, code: true, name: true },
                },
                color: {
                  select: { id: true, code: true, name: true, hexCode: true },
                },
              },
            },
          },
        },
      },
    });

    if (!order) {
      throw AppError.notFound('Dyeing order');
    }

    // Group items by fabric for organized printing
    const itemsByFabric: Record<string, any[]> = {};
    for (const item of order.items) {
      const fabricKey = item.roll.fabric?.code || item.roll.fabricType || 'Unknown';
      if (!itemsByFabric[fabricKey]) {
        itemsByFabric[fabricKey] = [];
      }
      itemsByFabric[fabricKey].push({
        id: item.id,
        rollNumber: item.roll.rollNumber,
        greyWeight: Number(item.roll.greyWeight),
        sentWeight: Number(item.sentWeight),
        receivedWeight: item.receivedWeight ? Number(item.receivedWeight) : null,
        grade: item.grade || item.roll.grade,
        fabric: item.roll.fabric,
        color: item.roll.color,
      });
    }

    // Calculate totals per fabric group
    const fabricGroups = Object.entries(itemsByFabric).map(([fabricCode, items]) => ({
      fabricCode,
      fabricName: items[0]?.fabric?.name || fabricCode,
      rollCount: items.length,
      totalSentWeight: items.reduce((sum, i) => sum + i.sentWeight, 0),
      totalReceivedWeight: items.reduce((sum, i) => sum + (i.receivedWeight || 0), 0),
      items,
    }));

    const printData = {
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        sentAt: order.sentAt,
        receivedAt: order.receivedAt,
        notes: order.notes,
      },
      vendor: {
        id: order.vendor.id,
        code: order.vendor.code,
        name: order.vendor.name,
        contactPerson: order.vendor.contactPerson,
        phone: order.vendor.phone,
        address: order.vendor.address,
        city: order.vendor.city,
      },
      summary: {
        totalRolls: order.items.length,
        totalSentWeight: Number(order.sentWeight),
        totalReceivedWeight: order.receivedWeight ? Number(order.receivedWeight) : null,
        weightVariance: order.weightVariance ? Number(order.weightVariance) : null,
      },
      fabricGroups,
      printDate: new Date().toISOString(),
      copies: ['FINANCE', 'GATE_PASS', 'DYEING'],
    };

    res.json(printData);
  } catch (error) {
    next(error);
  }
});

// GET /dyeing/rolls/available - Get rolls available for dyeing (in GREY_STOCK status)
dyeingRouter.get('/rolls/available', requirePermission('dyeing:read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { search, fabricType, fabricId, limit = '100' } = req.query;

    const where: any = {
      status: 'GREY_STOCK',
    };

    if (search) {
      where.OR = [
        { rollNumber: { contains: search as string, mode: 'insensitive' } },
        { fabricType: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    if (fabricType) {
      where.fabricType = fabricType;
    }

    // Support filtering by fabricId (from fabric template selection)
    if (fabricId) {
      where.fabricId = parseInt(fabricId as string);
    }

    const rolls = await req.prisma!.roll.findMany({
      where,
      take: parseInt(limit as string),
      orderBy: { producedAt: 'desc' },
      select: {
        id: true,
        rollNumber: true,
        qrCode: true,
        fabricType: true,
        greyWeight: true,
        grade: true,
        status: true,
        producedAt: true,
        fabricId: true,
        machine: {
          select: { id: true, machineNumber: true, name: true },
        },
        fabric: {
          select: { id: true, code: true, name: true },
        },
      },
    });

    res.json(rolls);
  } catch (error) {
    next(error);
  }
});

// GET /dyeing/rolls/available/summary - Get summary of available rolls by fabric type
dyeingRouter.get('/rolls/available/summary', requirePermission('dyeing:read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const summary = await req.prisma!.roll.groupBy({
      by: ['fabricType'],
      where: { status: 'GREY_STOCK' },
      _count: { id: true },
      _sum: { greyWeight: true },
    });

    const result = summary.map((s) => ({
      fabricType: s.fabricType,
      rollCount: s._count.id,
      totalWeight: Number(s._sum.greyWeight) || 0,
    }));

    res.json(result);
  } catch (error) {
    next(error);
  }
});
