import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenant';
import { requirePermission } from '../middleware/rbac';
import { validateBody, validateParams, validateQuery } from '../middleware/validate';
import { AppError } from '../middleware/error-handler';
import { VendorType, VendorLedgerType, MaterialReceiptType, QualityStatus, MaterialIssueType, ReplacementStatus } from '@prisma/client';

export const payablesRouter: Router = Router();

// Apply authentication and tenant middleware
payablesRouter.use(authMiddleware);
payablesRouter.use(tenantMiddleware);

// Common validation schemas
const idParamSchema = z.object({
  id: z.string().regex(/^\d+$/, 'Invalid ID format').transform(Number),
});

const vendorParamsSchema = z.object({
  vendorType: z.enum(['YARN', 'DYEING', 'GENERAL']),
  vendorId: z.string().regex(/^\d+$/, 'Invalid ID format').transform(Number),
});

const paginationSchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

// ============================================
// GENERAL SUPPLIERS CRUD
// ============================================

const createSupplierSchema = z.object({
  code: z.string().max(50).optional(), // Auto-generated if not provided
  name: z.string().min(1, 'Name is required').max(255),
  supplierType: z.string().max(100).optional(),
  contactPerson: z.string().max(255).optional(),
  phone: z.string().max(50).optional(),
  email: z.string().max(255).optional().nullable(),
  address: z.string().optional(),
  city: z.string().max(100).optional(),
  ntn: z.string().max(50).optional(),
  strn: z.string().max(50).optional(),
  creditLimit: z.number().positive().optional(),
  paymentTerms: z.number().int().min(0).optional(),
  bankDetails: z.object({
    bankName: z.string().optional(),
    accountNumber: z.string().optional(),
    accountTitle: z.string().optional(),
    branchCode: z.string().optional(),
    iban: z.string().optional(),
  }).optional(),
  rating: z.number().int().min(1).max(5).optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
});

const updateSupplierSchema = createSupplierSchema.partial();

// GET /payables/suppliers/lookup - Lightweight lookup for dropdowns
payablesRouter.get('/suppliers/lookup', requirePermission('finance:read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const suppliers = await req.prisma!.generalSupplier.findMany({
      where: { isActive: true },
      select: {
        id: true,
        code: true,
        name: true,
        supplierType: true,
      },
      orderBy: { name: 'asc' },
    });
    res.json({ data: suppliers });
  } catch (error) {
    next(error);
  }
});

// GET /payables/suppliers - List all general suppliers
payablesRouter.get('/suppliers', requirePermission('finance:read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const suppliers = await req.prisma!.generalSupplier.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json({ data: suppliers });
  } catch (error) {
    next(error);
  }
});

// GET /payables/suppliers/:id - Get single supplier with balance
payablesRouter.get('/suppliers/:id', requirePermission('finance:read'), validateParams(idParamSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params as unknown as { id: number };

    const supplier = await req.prisma!.generalSupplier.findUnique({
      where: { id },
    });

    if (!supplier) {
      throw AppError.notFound('Supplier');
    }

    // Get outstanding balance
    const balance = await req.prisma!.outstandingBalance.findUnique({
      where: {
        entityType_entityId: {
          entityType: 'general_supplier',
          entityId: id,
        },
      },
    });

    res.json({ data: { ...supplier, balance } });
  } catch (error) {
    next(error);
  }
});

// POST /payables/suppliers - Create supplier
payablesRouter.post('/suppliers', requirePermission('finance:write'), validateBody(createSupplierSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Auto-generate code if not provided
    let supplierCode = req.body.code;
    if (!supplierCode) {
      // Get the last supplier code to generate the next one
      const lastSupplier = await req.prisma!.generalSupplier.findFirst({
        where: {
          code: { startsWith: 'SUP-' },
        },
        orderBy: { code: 'desc' },
      });

      let nextNumber = 1;
      if (lastSupplier && lastSupplier.code) {
        const match = lastSupplier.code.match(/SUP-(\d+)/);
        if (match) {
          nextNumber = parseInt(match[1], 10) + 1;
        }
      }
      supplierCode = `SUP-${String(nextNumber).padStart(4, '0')}`;
    }

    const existing = await req.prisma!.generalSupplier.findUnique({
      where: { code: supplierCode },
    });
    if (existing) {
      throw AppError.conflict('Supplier code already exists');
    }

    const supplier = await req.prisma!.generalSupplier.create({
      data: {
        code: supplierCode,
        name: req.body.name,
        supplierType: req.body.supplierType,
        contactPerson: req.body.contactPerson,
        phone: req.body.phone,
        email: req.body.email || null,
        address: req.body.address,
        city: req.body.city,
        ntn: req.body.ntn,
        strn: req.body.strn,
        creditLimit: req.body.creditLimit,
        paymentTerms: req.body.paymentTerms ?? 30,
        bankDetails: req.body.bankDetails || null,
        rating: req.body.rating,
        notes: req.body.notes,
        isActive: req.body.isActive ?? true,
      },
    });

    // Initialize outstanding balance
    await req.prisma!.outstandingBalance.create({
      data: {
        entityType: 'general_supplier',
        entityId: supplier.id,
        openingBalance: 0,
        totalDebit: 0,
        totalCredit: 0,
        currentBalance: 0,
        creditLimit: req.body.creditLimit,
        availableCredit: req.body.creditLimit,
      },
    });

    res.status(201).json({ message: 'Supplier created', data: supplier });
  } catch (error) {
    next(error);
  }
});

// PUT /payables/suppliers/:id - Update supplier
payablesRouter.put('/suppliers/:id', requirePermission('finance:write'), validateParams(idParamSchema), validateBody(updateSupplierSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params as unknown as { id: number };

    const existing = await req.prisma!.generalSupplier.findUnique({ where: { id } });
    if (!existing) {
      throw AppError.notFound('Supplier');
    }

    if (req.body.code && req.body.code !== existing.code) {
      const codeExists = await req.prisma!.generalSupplier.findUnique({
        where: { code: req.body.code },
      });
      if (codeExists) {
        throw AppError.conflict('Supplier code already exists');
      }
    }

    const supplier = await req.prisma!.generalSupplier.update({
      where: { id },
      data: req.body,
    });

    res.json({ message: 'Supplier updated', data: supplier });
  } catch (error) {
    next(error);
  }
});

// DELETE /payables/suppliers/:id - Soft delete
payablesRouter.delete('/suppliers/:id', requirePermission('finance:write'), validateParams(idParamSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params as unknown as { id: number };

    const existing = await req.prisma!.generalSupplier.findUnique({ where: { id } });
    if (!existing) {
      throw AppError.notFound('Supplier');
    }

    await req.prisma!.generalSupplier.update({
      where: { id },
      data: { isActive: false },
    });

    res.json({ message: 'Supplier deactivated' });
  } catch (error) {
    next(error);
  }
});

// ============================================
// VENDOR LEDGER (All vendor types)
// ============================================

const ledgerEntrySchema = z.object({
  entryDate: z.string().min(1, 'Date is required'),
  entryType: z.enum(['OPENING_BALANCE', 'PURCHASE', 'PAYMENT_MADE', 'RETURN', 'ADJUSTMENT', 'DEBIT_NOTE', 'CREDIT_NOTE']),
  debit: z.number().min(0).optional(),
  credit: z.number().min(0).optional(),
  referenceType: z.string().max(50).optional(),
  referenceId: z.number().int().positive().optional(),
  referenceNumber: z.string().max(100).optional(),
  description: z.string().optional(),
});

// Helper to get vendor by type
async function getVendor(prisma: any, vendorType: string, vendorId: number) {
  switch (vendorType) {
    case 'YARN':
      return prisma.yarnVendor.findUnique({ where: { id: vendorId } });
    case 'DYEING':
      return prisma.dyeingVendor.findUnique({ where: { id: vendorId } });
    case 'GENERAL':
      return prisma.generalSupplier.findUnique({ where: { id: vendorId } });
    default:
      return null;
  }
}

// GET /payables/vendors/:vendorType/:vendorId/ledger - Get vendor ledger entries
payablesRouter.get('/vendors/:vendorType/:vendorId/ledger', requirePermission('finance:read'), validateParams(vendorParamsSchema), validateQuery(paginationSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { vendorType, vendorId } = req.params as unknown as { vendorType: VendorType; vendorId: number };
    const { page = 1, limit = 50, startDate, endDate } = req.query as any;

    // Verify vendor exists
    const vendor = await getVendor(req.prisma!, vendorType, vendorId);
    if (!vendor) {
      throw AppError.notFound('Vendor');
    }

    // Build where clause
    const whereClause: any = { vendorType };
    if (vendorType === 'YARN') whereClause.yarnVendorId = vendorId;
    else if (vendorType === 'DYEING') whereClause.dyeingVendorId = vendorId;
    else if (vendorType === 'GENERAL') whereClause.generalSupplierId = vendorId;

    if (startDate) whereClause.entryDate = { ...whereClause.entryDate, gte: new Date(startDate) };
    if (endDate) whereClause.entryDate = { ...whereClause.entryDate, lte: new Date(endDate) };

    const [entries, total] = await Promise.all([
      req.prisma!.vendorLedgerEntry.findMany({
        where: whereClause,
        orderBy: [{ entryDate: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      req.prisma!.vendorLedgerEntry.count({ where: whereClause }),
    ]);

    res.json({
      data: entries,
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

// POST /payables/vendors/:vendorType/:vendorId/ledger - Add manual ledger entry
payablesRouter.post('/vendors/:vendorType/:vendorId/ledger', requirePermission('finance:write'), validateParams(vendorParamsSchema), validateBody(ledgerEntrySchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { vendorType, vendorId } = req.params as unknown as { vendorType: VendorType; vendorId: number };
    const userId = (req as any).user?.userId;

    // Verify vendor exists
    const vendor = await getVendor(req.prisma!, vendorType, vendorId);
    if (!vendor) {
      throw AppError.notFound('Vendor');
    }

    // Get current balance
    const entityTypeMap: Record<string, string> = {
      YARN: 'yarn_vendor',
      DYEING: 'dyeing_vendor',
      GENERAL: 'general_supplier',
    };

    const balance = await req.prisma!.outstandingBalance.findUnique({
      where: {
        entityType_entityId: {
          entityType: entityTypeMap[vendorType],
          entityId: vendorId,
        },
      },
    });

    const currentBalance = balance?.currentBalance?.toNumber() || 0;
    const debit = req.body.debit || 0;
    const credit = req.body.credit || 0;
    const newBalance = currentBalance + debit - credit;

    // Create ledger entry
    const entryData: any = {
      vendorType,
      entryDate: new Date(req.body.entryDate),
      entryType: req.body.entryType as VendorLedgerType,
      debit,
      credit,
      balance: newBalance,
      referenceType: req.body.referenceType,
      referenceId: req.body.referenceId,
      referenceNumber: req.body.referenceNumber,
      description: req.body.description,
      createdBy: userId,
    };

    if (vendorType === 'YARN') entryData.yarnVendorId = vendorId;
    else if (vendorType === 'DYEING') entryData.dyeingVendorId = vendorId;
    else if (vendorType === 'GENERAL') entryData.generalSupplierId = vendorId;

    const entry = await req.prisma!.vendorLedgerEntry.create({ data: entryData });

    // Update outstanding balance
    await req.prisma!.outstandingBalance.upsert({
      where: {
        entityType_entityId: {
          entityType: entityTypeMap[vendorType],
          entityId: vendorId,
        },
      },
      update: {
        totalDebit: { increment: debit },
        totalCredit: { increment: credit },
        currentBalance: newBalance,
        lastTransactionAt: new Date(),
      },
      create: {
        entityType: entityTypeMap[vendorType],
        entityId: vendorId,
        openingBalance: 0,
        totalDebit: debit,
        totalCredit: credit,
        currentBalance: newBalance,
        lastTransactionAt: new Date(),
      },
    });

    res.status(201).json({ message: 'Ledger entry created', data: entry });
  } catch (error) {
    next(error);
  }
});

// GET /payables/vendors/:vendorType/:vendorId/balance - Get current balance
payablesRouter.get('/vendors/:vendorType/:vendorId/balance', requirePermission('finance:read'), validateParams(vendorParamsSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { vendorType, vendorId } = req.params as unknown as { vendorType: VendorType; vendorId: number };

    const entityTypeMap: Record<string, string> = {
      YARN: 'yarn_vendor',
      DYEING: 'dyeing_vendor',
      GENERAL: 'general_supplier',
    };

    const balance = await req.prisma!.outstandingBalance.findUnique({
      where: {
        entityType_entityId: {
          entityType: entityTypeMap[vendorType],
          entityId: vendorId,
        },
      },
    });

    res.json({ data: balance || { currentBalance: 0, totalDebit: 0, totalCredit: 0 } });
  } catch (error) {
    next(error);
  }
});

// ============================================
// MATERIAL RECEIPTS
// ============================================

const createReceiptSchema = z.object({
  vendorType: z.enum(['YARN', 'DYEING', 'GENERAL']),
  vendorId: z.number().int().positive('Vendor is required'),
  receiptDate: z.string().min(1, 'Date is required'),
  receiptType: z.enum(['PURCHASE', 'RETURN_IN', 'ADJUSTMENT']).default('PURCHASE'),
  invoiceNumber: z.string().max(100).optional(),
  gatePassNumber: z.string().max(100).optional(),
  vehicleNumber: z.string().max(50).optional(),
  payOrderId: z.number().int().positive().optional(),
  items: z.array(z.object({
    productId: z.number().int().positive().optional(),
    yarnTypeId: z.number().int().positive().optional(),
    itemDescription: z.string().min(1, 'Description is required').max(255),
    orderedQty: z.number().positive().optional(),
    receivedQty: z.number().positive('Received quantity is required'),
    acceptedQty: z.number().min(0),
    rejectedQty: z.number().min(0).optional(),
    unit: z.string().max(20).default('KG'),
    ratePerUnit: z.number().positive('Rate is required'),
    qualityNotes: z.string().optional(),
  })).min(1, 'At least one item is required'),
  discountAmount: z.number().min(0).optional(),
  taxAmount: z.number().min(0).optional(),
  qualityNotes: z.string().optional(),
  notes: z.string().optional(),
});

// GET /payables/receipts - List all material receipts
payablesRouter.get('/receipts', requirePermission('finance:read'), validateQuery(paginationSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = 1, limit = 50, startDate, endDate } = req.query as any;

    const whereClause: any = {};
    if (startDate) whereClause.receiptDate = { ...whereClause.receiptDate, gte: new Date(startDate) };
    if (endDate) whereClause.receiptDate = { ...whereClause.receiptDate, lte: new Date(endDate) };

    const [receipts, total] = await Promise.all([
      req.prisma!.materialReceipt.findMany({
        where: whereClause,
        include: {
          yarnVendor: { select: { id: true, code: true, name: true } },
          dyeingVendor: { select: { id: true, code: true, name: true } },
          generalSupplier: { select: { id: true, code: true, name: true } },
          items: true,
        },
        orderBy: { receiptDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      req.prisma!.materialReceipt.count({ where: whereClause }),
    ]);

    res.json({
      data: receipts,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
});

// GET /payables/receipts/:id - Get single receipt
payablesRouter.get('/receipts/:id', requirePermission('finance:read'), validateParams(idParamSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params as unknown as { id: number };

    const receipt = await req.prisma!.materialReceipt.findUnique({
      where: { id },
      include: {
        yarnVendor: true,
        dyeingVendor: true,
        generalSupplier: true,
        items: true,
        returns: true,
      },
    });

    if (!receipt) {
      throw AppError.notFound('Material receipt');
    }

    res.json({ data: receipt });
  } catch (error) {
    next(error);
  }
});

// POST /payables/receipts - Create material receipt
payablesRouter.post('/receipts', requirePermission('finance:write'), validateBody(createReceiptSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.userId;

    // Generate receipt number
    const lastReceipt = await req.prisma!.materialReceipt.findFirst({
      orderBy: { id: 'desc' },
      select: { receiptNumber: true },
    });

    const year = new Date().getFullYear();
    let nextNum = 1;
    if (lastReceipt?.receiptNumber) {
      const match = lastReceipt.receiptNumber.match(/MR-(\d{4})-(\d+)/);
      if (match && match[1] === String(year)) {
        nextNum = parseInt(match[2]) + 1;
      }
    }
    const receiptNumber = `MR-${year}-${String(nextNum).padStart(5, '0')}`;

    // Calculate totals
    const receivedQty = req.body.items.reduce((sum: number, item: any) => sum + Number(item.receivedQty), 0);
    const acceptedQty = req.body.items.reduce((sum: number, item: any) => sum + Number(item.acceptedQty), 0);
    const rejectedQty = req.body.items.reduce((sum: number, item: any) => sum + Number(item.rejectedQty || 0), 0);
    const grossAmount = req.body.items.reduce((sum: number, item: any) => sum + (Number(item.acceptedQty) * Number(item.ratePerUnit)), 0);
    const discountAmount = req.body.discountAmount || 0;
    const taxAmount = req.body.taxAmount || 0;
    const netAmount = grossAmount - discountAmount + taxAmount;

    // Build receipt data
    const receiptData: any = {
      receiptNumber,
      vendorType: req.body.vendorType as VendorType,
      receiptDate: new Date(req.body.receiptDate),
      receiptType: req.body.receiptType as MaterialReceiptType,
      invoiceNumber: req.body.invoiceNumber,
      gatePassNumber: req.body.gatePassNumber,
      vehicleNumber: req.body.vehicleNumber,
      payOrderId: req.body.payOrderId,
      receivedQty,
      acceptedQty,
      rejectedQty,
      unit: req.body.items[0].unit || 'KG',
      grossAmount,
      discountAmount,
      taxAmount,
      netAmount,
      qualityNotes: req.body.qualityNotes,
      notes: req.body.notes,
      createdBy: userId,
      items: {
        create: req.body.items.map((item: any) => ({
          productId: item.productId,
          yarnTypeId: item.yarnTypeId,
          itemDescription: item.itemDescription,
          orderedQty: item.orderedQty,
          receivedQty: item.receivedQty,
          acceptedQty: item.acceptedQty,
          rejectedQty: item.rejectedQty || 0,
          unit: item.unit || 'KG',
          ratePerUnit: item.ratePerUnit,
          amount: item.acceptedQty * item.ratePerUnit,
          qualityNotes: item.qualityNotes,
        })),
      },
    };

    // Set vendor ID based on type
    if (req.body.vendorType === 'YARN') receiptData.yarnVendorId = req.body.vendorId;
    else if (req.body.vendorType === 'DYEING') receiptData.dyeingVendorId = req.body.vendorId;
    else if (req.body.vendorType === 'GENERAL') receiptData.generalSupplierId = req.body.vendorId;

    const receipt = await req.prisma!.materialReceipt.create({
      data: receiptData,
      include: { items: true },
    });

    // Create ledger entry for the purchase
    const entityTypeMap: Record<string, string> = {
      YARN: 'yarn_vendor',
      DYEING: 'dyeing_vendor',
      GENERAL: 'general_supplier',
    };

    // Get current balance
    const balance = await req.prisma!.outstandingBalance.findUnique({
      where: {
        entityType_entityId: {
          entityType: entityTypeMap[req.body.vendorType],
          entityId: req.body.vendorId,
        },
      },
    });

    const currentBalance = balance?.currentBalance?.toNumber() || 0;
    const newBalance = currentBalance + netAmount;

    // Create ledger entry
    const ledgerData: any = {
      vendorType: req.body.vendorType as VendorType,
      entryDate: new Date(req.body.receiptDate),
      entryType: 'PURCHASE' as VendorLedgerType,
      debit: netAmount,
      credit: 0,
      balance: newBalance,
      referenceType: 'material_receipt',
      referenceId: receipt.id,
      referenceNumber: receiptNumber,
      description: `Purchase - Invoice: ${req.body.invoiceNumber || 'N/A'}`,
      createdBy: userId,
    };

    if (req.body.vendorType === 'YARN') ledgerData.yarnVendorId = req.body.vendorId;
    else if (req.body.vendorType === 'DYEING') ledgerData.dyeingVendorId = req.body.vendorId;
    else if (req.body.vendorType === 'GENERAL') ledgerData.generalSupplierId = req.body.vendorId;

    await req.prisma!.vendorLedgerEntry.create({ data: ledgerData });

    // Update outstanding balance
    await req.prisma!.outstandingBalance.upsert({
      where: {
        entityType_entityId: {
          entityType: entityTypeMap[req.body.vendorType],
          entityId: req.body.vendorId,
        },
      },
      update: {
        totalDebit: { increment: netAmount },
        currentBalance: newBalance,
        lastTransactionAt: new Date(),
      },
      create: {
        entityType: entityTypeMap[req.body.vendorType],
        entityId: req.body.vendorId,
        openingBalance: 0,
        totalDebit: netAmount,
        totalCredit: 0,
        currentBalance: newBalance,
        lastTransactionAt: new Date(),
      },
    });

    res.status(201).json({ message: 'Material receipt created', data: receipt });
  } catch (error) {
    next(error);
  }
});

// ============================================
// MATERIAL RETURNS
// ============================================

const createReturnSchema = z.object({
  vendorType: z.enum(['YARN', 'DYEING', 'GENERAL']),
  vendorId: z.number().int().positive('Vendor is required'),
  materialReceiptId: z.number().int().positive().optional(),
  returnDate: z.string().min(1, 'Date is required'),
  returnChallanNumber: z.string().max(100).optional(),
  issueType: z.enum(['WRONG_TYPE', 'QUALITY_DEFECT', 'SHORT_WEIGHT', 'DAMAGED', 'COLOR_MISMATCH', 'OTHER']),
  issueDescription: z.string().optional(),
  returnedQuantity: z.number().positive('Quantity is required'),
  unit: z.string().max(20).default('KG'),
  returnValue: z.number().positive('Value is required'),
  notes: z.string().optional(),
});

// GET /payables/returns - List all material returns
payablesRouter.get('/returns', requirePermission('finance:read'), validateQuery(paginationSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = 1, limit = 50, startDate, endDate } = req.query as any;

    const whereClause: any = {};
    if (startDate) whereClause.returnDate = { ...whereClause.returnDate, gte: new Date(startDate) };
    if (endDate) whereClause.returnDate = { ...whereClause.returnDate, lte: new Date(endDate) };

    const [returns, total] = await Promise.all([
      req.prisma!.materialReturn.findMany({
        where: whereClause,
        include: {
          yarnVendor: { select: { id: true, code: true, name: true } },
          dyeingVendor: { select: { id: true, code: true, name: true } },
          generalSupplier: { select: { id: true, code: true, name: true } },
          materialReceipt: { select: { id: true, receiptNumber: true } },
        },
        orderBy: { returnDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      req.prisma!.materialReturn.count({ where: whereClause }),
    ]);

    res.json({
      data: returns,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
});

// POST /payables/returns - Create material return
payablesRouter.post('/returns', requirePermission('finance:write'), validateBody(createReturnSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.userId;

    // Generate return number
    const lastReturn = await req.prisma!.materialReturn.findFirst({
      orderBy: { id: 'desc' },
      select: { returnNumber: true },
    });

    const year = new Date().getFullYear();
    let nextNum = 1;
    if (lastReturn?.returnNumber) {
      const match = lastReturn.returnNumber.match(/RTN-(\d{4})-(\d+)/);
      if (match && match[1] === String(year)) {
        nextNum = parseInt(match[2]) + 1;
      }
    }
    const returnNumber = `RTN-${year}-${String(nextNum).padStart(5, '0')}`;

    // Build return data
    const returnData: any = {
      returnNumber,
      vendorType: req.body.vendorType as VendorType,
      materialReceiptId: req.body.materialReceiptId,
      returnDate: new Date(req.body.returnDate),
      returnChallanNumber: req.body.returnChallanNumber,
      issueType: req.body.issueType as MaterialIssueType,
      issueDescription: req.body.issueDescription,
      returnedQuantity: req.body.returnedQuantity,
      unit: req.body.unit,
      returnValue: req.body.returnValue,
      replacementStatus: 'REPORTED' as ReplacementStatus,
      notes: req.body.notes,
      createdBy: userId,
    };

    if (req.body.vendorType === 'YARN') returnData.yarnVendorId = req.body.vendorId;
    else if (req.body.vendorType === 'DYEING') returnData.dyeingVendorId = req.body.vendorId;
    else if (req.body.vendorType === 'GENERAL') returnData.generalSupplierId = req.body.vendorId;

    const materialReturn = await req.prisma!.materialReturn.create({ data: returnData });

    // Create ledger entry (credit for return)
    const entityTypeMap: Record<string, string> = {
      YARN: 'yarn_vendor',
      DYEING: 'dyeing_vendor',
      GENERAL: 'general_supplier',
    };

    const balance = await req.prisma!.outstandingBalance.findUnique({
      where: {
        entityType_entityId: {
          entityType: entityTypeMap[req.body.vendorType],
          entityId: req.body.vendorId,
        },
      },
    });

    const currentBalance = balance?.currentBalance?.toNumber() || 0;
    const newBalance = currentBalance - req.body.returnValue;

    const ledgerData: any = {
      vendorType: req.body.vendorType as VendorType,
      entryDate: new Date(req.body.returnDate),
      entryType: 'RETURN' as VendorLedgerType,
      debit: 0,
      credit: req.body.returnValue,
      balance: newBalance,
      referenceType: 'material_return',
      referenceId: materialReturn.id,
      referenceNumber: returnNumber,
      description: `Return - ${req.body.issueType}`,
      createdBy: userId,
    };

    if (req.body.vendorType === 'YARN') ledgerData.yarnVendorId = req.body.vendorId;
    else if (req.body.vendorType === 'DYEING') ledgerData.dyeingVendorId = req.body.vendorId;
    else if (req.body.vendorType === 'GENERAL') ledgerData.generalSupplierId = req.body.vendorId;

    await req.prisma!.vendorLedgerEntry.create({ data: ledgerData });

    // Update outstanding balance
    await req.prisma!.outstandingBalance.update({
      where: {
        entityType_entityId: {
          entityType: entityTypeMap[req.body.vendorType],
          entityId: req.body.vendorId,
        },
      },
      data: {
        totalCredit: { increment: req.body.returnValue },
        currentBalance: newBalance,
        lastTransactionAt: new Date(),
      },
    });

    res.status(201).json({ message: 'Material return created', data: materialReturn });
  } catch (error) {
    next(error);
  }
});

// PATCH /payables/returns/:id/status - Update return status
payablesRouter.patch('/returns/:id/status', requirePermission('finance:write'), validateParams(idParamSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params as unknown as { id: number };
    const { status, replacementQuantity, replacementReceiptId, creditAmount, creditNoteNumber, resolutionNotes } = req.body;
    const userId = (req as any).user?.userId;

    const existing = await req.prisma!.materialReturn.findUnique({ where: { id } });
    if (!existing) {
      throw AppError.notFound('Material return');
    }

    const updateData: any = {
      replacementStatus: status,
      resolutionNotes,
    };

    if (status === 'REPLACED') {
      updateData.replacementQuantity = replacementQuantity;
      updateData.replacementDate = new Date();
      updateData.replacementReceiptId = replacementReceiptId;
      updateData.resolvedAt = new Date();
      updateData.resolvedBy = userId;
    } else if (status === 'CREDITED') {
      updateData.creditAmount = creditAmount;
      updateData.creditDate = new Date();
      updateData.creditNoteNumber = creditNoteNumber;
      updateData.resolvedAt = new Date();
      updateData.resolvedBy = userId;
    } else if (status === 'CLOSED') {
      updateData.resolvedAt = new Date();
      updateData.resolvedBy = userId;
    }

    const materialReturn = await req.prisma!.materialReturn.update({
      where: { id },
      data: updateData,
    });

    res.json({ message: 'Return status updated', data: materialReturn });
  } catch (error) {
    next(error);
  }
});

// ============================================
// VENDOR PAYMENTS
// ============================================

const createPaymentSchema = z.object({
  vendorType: z.enum(['YARN', 'DYEING', 'GENERAL']),
  vendorId: z.number().int().positive('Vendor is required'),
  paymentDate: z.string().min(1, 'Date is required'),
  amount: z.number().positive('Amount is required'),
  paymentMethod: z.enum(['CASH', 'CHEQUE', 'BANK_TRANSFER', 'ONLINE']),
  voucherNumber: z.string().max(100).optional(),
  chequeNumber: z.string().max(100).optional(),
  bankName: z.string().max(100).optional(),
  transactionRef: z.string().max(100).optional(),
  notes: z.string().optional(),
});

// GET /payables/payments - List vendor payments
payablesRouter.get('/payments', requirePermission('finance:read'), validateQuery(paginationSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = 1, limit = 50, startDate, endDate } = req.query as any;

    const whereClause: any = {};
    if (startDate) whereClause.paymentDate = { ...whereClause.paymentDate, gte: new Date(startDate) };
    if (endDate) whereClause.paymentDate = { ...whereClause.paymentDate, lte: new Date(endDate) };

    const [payments, total] = await Promise.all([
      req.prisma!.vendorPayment.findMany({
        where: whereClause,
        include: {
          yarnVendor: { select: { id: true, code: true, name: true } },
          dyeingVendor: { select: { id: true, code: true, name: true } },
          generalSupplier: { select: { id: true, code: true, name: true } },
        },
        orderBy: { paymentDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      req.prisma!.vendorPayment.count({ where: whereClause }),
    ]);

    res.json({
      data: payments,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
});

// POST /payables/payments - Create vendor payment
payablesRouter.post('/payments', requirePermission('finance:write'), validateBody(createPaymentSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.userId;

    // Build payment data
    const paymentData: any = {
      vendorType: req.body.vendorType as VendorType,
      paymentDate: new Date(req.body.paymentDate),
      amount: req.body.amount,
      paymentMethod: req.body.paymentMethod,
      voucherNumber: req.body.voucherNumber,
      chequeNumber: req.body.chequeNumber,
      bankName: req.body.bankName,
      transactionRef: req.body.transactionRef,
      notes: req.body.notes,
      createdBy: userId,
    };

    if (req.body.vendorType === 'YARN') paymentData.yarnVendorId = req.body.vendorId;
    else if (req.body.vendorType === 'DYEING') paymentData.dyeingVendorId = req.body.vendorId;
    else if (req.body.vendorType === 'GENERAL') paymentData.generalSupplierId = req.body.vendorId;

    const payment = await req.prisma!.vendorPayment.create({ data: paymentData });

    // Create ledger entry
    const entityTypeMap: Record<string, string> = {
      YARN: 'yarn_vendor',
      DYEING: 'dyeing_vendor',
      GENERAL: 'general_supplier',
    };

    const balance = await req.prisma!.outstandingBalance.findUnique({
      where: {
        entityType_entityId: {
          entityType: entityTypeMap[req.body.vendorType],
          entityId: req.body.vendorId,
        },
      },
    });

    const currentBalance = balance?.currentBalance?.toNumber() || 0;
    const newBalance = currentBalance - req.body.amount;

    const ledgerData: any = {
      vendorType: req.body.vendorType as VendorType,
      entryDate: new Date(req.body.paymentDate),
      entryType: 'PAYMENT_MADE' as VendorLedgerType,
      debit: 0,
      credit: req.body.amount,
      balance: newBalance,
      referenceType: 'vendor_payment',
      referenceId: payment.id,
      referenceNumber: req.body.voucherNumber || req.body.chequeNumber || `PAY-${payment.id}`,
      description: `Payment - ${req.body.paymentMethod}`,
      createdBy: userId,
    };

    if (req.body.vendorType === 'YARN') ledgerData.yarnVendorId = req.body.vendorId;
    else if (req.body.vendorType === 'DYEING') ledgerData.dyeingVendorId = req.body.vendorId;
    else if (req.body.vendorType === 'GENERAL') ledgerData.generalSupplierId = req.body.vendorId;

    await req.prisma!.vendorLedgerEntry.create({ data: ledgerData });

    // Update outstanding balance
    await req.prisma!.outstandingBalance.upsert({
      where: {
        entityType_entityId: {
          entityType: entityTypeMap[req.body.vendorType],
          entityId: req.body.vendorId,
        },
      },
      update: {
        totalCredit: { increment: req.body.amount },
        currentBalance: newBalance,
        lastTransactionAt: new Date(),
      },
      create: {
        entityType: entityTypeMap[req.body.vendorType],
        entityId: req.body.vendorId,
        openingBalance: 0,
        totalDebit: 0,
        totalCredit: req.body.amount,
        currentBalance: newBalance,
        lastTransactionAt: new Date(),
      },
    });

    res.status(201).json({ message: 'Payment recorded', data: payment });
  } catch (error) {
    next(error);
  }
});

// ============================================
// PAYABLES REPORTS
// ============================================

// GET /payables/aging - Payables aging report
payablesRouter.get('/aging', requirePermission('finance:read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get all vendor balances
    const balances = await req.prisma!.outstandingBalance.findMany({
      where: {
        entityType: { in: ['yarn_vendor', 'dyeing_vendor', 'general_supplier'] },
        currentBalance: { gt: 0 },
      },
    });

    // Get latest aging snapshots or calculate live
    const agingData = await Promise.all(
      balances.map(async (bal) => {
        let vendor: any = null;
        if (bal.entityType === 'yarn_vendor') {
          vendor = await req.prisma!.yarnVendor.findUnique({
            where: { id: bal.entityId },
            select: { id: true, code: true, name: true },
          });
        } else if (bal.entityType === 'dyeing_vendor') {
          vendor = await req.prisma!.dyeingVendor.findUnique({
            where: { id: bal.entityId },
            select: { id: true, code: true, name: true },
          });
        } else if (bal.entityType === 'general_supplier') {
          vendor = await req.prisma!.generalSupplier.findUnique({
            where: { id: bal.entityId },
            select: { id: true, code: true, name: true },
          });
        }

        return {
          vendorType: bal.entityType,
          vendorId: bal.entityId,
          vendor,
          currentBalance: bal.currentBalance,
          isOverdue: bal.isOverdue,
          overdueAmount: bal.overdueAmount,
          overdueDays: bal.overdueDays,
        };
      })
    );

    res.json({ data: agingData.filter(a => a.vendor !== null) });
  } catch (error) {
    next(error);
  }
});

// GET /payables/summary - Dashboard summary
payablesRouter.get('/summary', requirePermission('finance:read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Total payables by vendor type
    const balances = await req.prisma!.outstandingBalance.groupBy({
      by: ['entityType'],
      where: {
        entityType: { in: ['yarn_vendor', 'dyeing_vendor', 'general_supplier'] },
      },
      _sum: {
        currentBalance: true,
        overdueAmount: true,
      },
      _count: true,
    });

    // Recent payments
    const recentPayments = await req.prisma!.vendorPayment.findMany({
      take: 5,
      orderBy: { paymentDate: 'desc' },
      include: {
        yarnVendor: { select: { name: true } },
        dyeingVendor: { select: { name: true } },
        generalSupplier: { select: { name: true } },
      },
    });

    // Pending returns
    const pendingReturns = await req.prisma!.materialReturn.count({
      where: {
        replacementStatus: { in: ['REPORTED', 'RETURN_PENDING', 'REPLACEMENT_PENDING'] },
      },
    });

    res.json({
      data: {
        balancesByType: balances,
        recentPayments,
        pendingReturns,
      },
    });
  } catch (error) {
    next(error);
  }
});
