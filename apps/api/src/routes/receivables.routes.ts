import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenant';
import { requirePermission } from '../middleware/rbac';
import { validateBody, validateParams, validateQuery } from '../middleware/validate';
import { AppError } from '../middleware/error-handler';
import { LedgerEntryType, MaterialTransactionType } from '@prisma/client';

export const receivablesRouter = Router();

// Apply authentication and tenant middleware
receivablesRouter.use(authMiddleware);
receivablesRouter.use(tenantMiddleware);

// Common validation schemas
const idParamSchema = z.object({
  id: z.string().regex(/^\d+$/, 'Invalid ID format').transform(Number),
});

const customerIdParamSchema = z.object({
  customerId: z.string().regex(/^\d+$/, 'Invalid ID format').transform(Number),
});

const paginationSchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

// ============================================
// CUSTOMER LEDGER
// ============================================

const ledgerEntrySchema = z.object({
  entryDate: z.string().min(1, 'Date is required'),
  entryType: z.enum(['OPENING_BALANCE', 'SALE', 'PAYMENT_RECEIVED', 'RETURN', 'ADJUSTMENT']),
  debit: z.number().min(0).optional(),
  credit: z.number().min(0).optional(),
  referenceType: z.string().max(50).optional(),
  referenceId: z.number().int().positive().optional(),
  referenceNumber: z.string().max(100).optional(),
  description: z.string().optional(),
});

// GET /receivables/customers/:customerId/ledger - Get customer ledger entries
receivablesRouter.get('/customers/:customerId/ledger', requirePermission('sales:read'), validateParams(customerIdParamSchema), validateQuery(paginationSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { customerId } = req.params as unknown as { customerId: number };
    const { page = 1, limit = 50, startDate, endDate } = req.query as any;

    // Verify customer exists
    const customer = await req.prisma!.customer.findUnique({ where: { id: customerId } });
    if (!customer) {
      throw AppError.notFound('Customer');
    }

    const whereClause: any = { customerId };
    if (startDate) whereClause.entryDate = { ...whereClause.entryDate, gte: new Date(startDate) };
    if (endDate) whereClause.entryDate = { ...whereClause.entryDate, lte: new Date(endDate) };

    const [entries, total] = await Promise.all([
      req.prisma!.customerLedgerEntry.findMany({
        where: whereClause,
        orderBy: [{ entryDate: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      req.prisma!.customerLedgerEntry.count({ where: whereClause }),
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

// POST /receivables/customers/:customerId/ledger - Add manual ledger entry
receivablesRouter.post('/customers/:customerId/ledger', requirePermission('sales:write'), validateParams(customerIdParamSchema), validateBody(ledgerEntrySchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { customerId } = req.params as unknown as { customerId: number };

    // Verify customer exists
    const customer = await req.prisma!.customer.findUnique({ where: { id: customerId } });
    if (!customer) {
      throw AppError.notFound('Customer');
    }

    // Get current balance
    const balance = await req.prisma!.outstandingBalance.findUnique({
      where: {
        entityType_entityId: {
          entityType: 'customer',
          entityId: customerId,
        },
      },
    });

    const currentBalance = balance?.currentBalance?.toNumber() || 0;
    const debit = req.body.debit || 0;
    const credit = req.body.credit || 0;
    const newBalance = currentBalance + debit - credit;

    // Create ledger entry
    const entry = await req.prisma!.customerLedgerEntry.create({
      data: {
        customerId,
        entryDate: new Date(req.body.entryDate),
        entryType: req.body.entryType as LedgerEntryType,
        debit,
        credit,
        balance: newBalance,
        referenceType: req.body.referenceType,
        referenceId: req.body.referenceId,
        referenceNumber: req.body.referenceNumber,
        description: req.body.description,
      },
    });

    // Update outstanding balance
    await req.prisma!.outstandingBalance.upsert({
      where: {
        entityType_entityId: {
          entityType: 'customer',
          entityId: customerId,
        },
      },
      update: {
        totalDebit: { increment: debit },
        totalCredit: { increment: credit },
        currentBalance: newBalance,
        lastTransactionAt: new Date(),
      },
      create: {
        entityType: 'customer',
        entityId: customerId,
        openingBalance: 0,
        totalDebit: debit,
        totalCredit: credit,
        currentBalance: newBalance,
        creditLimit: customer.creditLimit,
        lastTransactionAt: new Date(),
      },
    });

    res.status(201).json({ message: 'Ledger entry created', data: entry });
  } catch (error) {
    next(error);
  }
});

// GET /receivables/customers/:customerId/balance - Get current balance
receivablesRouter.get('/customers/:customerId/balance', requirePermission('sales:read'), validateParams(customerIdParamSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { customerId } = req.params as unknown as { customerId: number };

    const balance = await req.prisma!.outstandingBalance.findUnique({
      where: {
        entityType_entityId: {
          entityType: 'customer',
          entityId: customerId,
        },
      },
    });

    res.json({ data: balance || { currentBalance: 0, totalDebit: 0, totalCredit: 0 } });
  } catch (error) {
    next(error);
  }
});

// ============================================
// MATERIAL TRANSACTIONS (Customer Sales/Returns)
// ============================================

const createTransactionSchema = z.object({
  customerId: z.number().int().positive('Customer is required'),
  transactionDate: z.string().min(1, 'Date is required'),
  transactionType: z.enum(['SALE', 'RETURN', 'SAMPLE', 'ADJUSTMENT']),
  referenceNumber: z.string().max(100).optional(),
  items: z.array(z.object({
    rollId: z.number().int().positive().optional(),
    productId: z.number().int().positive().optional(),
    itemDescription: z.string().min(1, 'Description is required').max(255),
    fabricType: z.string().max(100).optional(),
    color: z.string().max(100).optional(),
    quantity: z.number().positive('Quantity is required'),
    unit: z.string().max(20).default('KG'),
    ratePerUnit: z.number().positive('Rate is required'),
    notes: z.string().optional(),
  })).min(1, 'At least one item is required'),
  discountAmount: z.number().min(0).optional(),
  taxAmount: z.number().min(0).optional(),
  deliveryAddress: z.string().optional(),
  vehicleNumber: z.string().max(50).optional(),
  salesOrderId: z.number().int().positive().optional(),
  notes: z.string().optional(),
});

// GET /receivables/transactions - List all material transactions
receivablesRouter.get('/transactions', requirePermission('sales:read'), validateQuery(paginationSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = 1, limit = 50, startDate, endDate } = req.query as any;

    const whereClause: any = {};
    if (startDate) whereClause.transactionDate = { ...whereClause.transactionDate, gte: new Date(startDate) };
    if (endDate) whereClause.transactionDate = { ...whereClause.transactionDate, lte: new Date(endDate) };

    const [transactions, total] = await Promise.all([
      req.prisma!.materialTransaction.findMany({
        where: whereClause,
        include: {
          customer: { select: { id: true, code: true, name: true } },
          items: true,
        },
        orderBy: { transactionDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      req.prisma!.materialTransaction.count({ where: whereClause }),
    ]);

    res.json({
      data: transactions,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
});

// GET /receivables/transactions/:id - Get single transaction
receivablesRouter.get('/transactions/:id', requirePermission('sales:read'), validateParams(idParamSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params as unknown as { id: number };

    const transaction = await req.prisma!.materialTransaction.findUnique({
      where: { id },
      include: {
        customer: true,
        items: true,
      },
    });

    if (!transaction) {
      throw AppError.notFound('Material transaction');
    }

    res.json({ data: transaction });
  } catch (error) {
    next(error);
  }
});

// POST /receivables/transactions - Create material transaction
receivablesRouter.post('/transactions', requirePermission('sales:write'), validateBody(createTransactionSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.userId;

    // Verify customer exists
    const customer = await req.prisma!.customer.findUnique({ where: { id: req.body.customerId } });
    if (!customer) {
      throw AppError.notFound('Customer');
    }

    // Generate transaction number
    const lastTransaction = await req.prisma!.materialTransaction.findFirst({
      orderBy: { id: 'desc' },
      select: { transactionNumber: true },
    });

    const year = new Date().getFullYear();
    let nextNum = 1;
    if (lastTransaction?.transactionNumber) {
      const match = lastTransaction.transactionNumber.match(/MT-(\d{4})-(\d+)/);
      if (match && match[1] === String(year)) {
        nextNum = parseInt(match[2]) + 1;
      }
    }
    const transactionNumber = `MT-${year}-${String(nextNum).padStart(5, '0')}`;

    // Calculate totals
    const subtotal = req.body.items.reduce((sum: number, item: any) => sum + (Number(item.quantity) * Number(item.ratePerUnit)), 0);
    const discountAmount = req.body.discountAmount || 0;
    const taxAmount = req.body.taxAmount || 0;
    const totalAmount = subtotal - discountAmount + taxAmount;

    // Create transaction
    const transaction = await req.prisma!.materialTransaction.create({
      data: {
        transactionNumber,
        customerId: req.body.customerId,
        transactionDate: new Date(req.body.transactionDate),
        transactionType: req.body.transactionType as MaterialTransactionType,
        referenceNumber: req.body.referenceNumber,
        subtotal,
        discountAmount,
        taxAmount,
        totalAmount,
        deliveryAddress: req.body.deliveryAddress,
        vehicleNumber: req.body.vehicleNumber,
        salesOrderId: req.body.salesOrderId,
        notes: req.body.notes,
        createdBy: userId,
        items: {
          create: req.body.items.map((item: any) => ({
            rollId: item.rollId,
            productId: item.productId,
            itemDescription: item.itemDescription,
            fabricType: item.fabricType,
            color: item.color,
            quantity: item.quantity,
            unit: item.unit || 'KG',
            ratePerUnit: item.ratePerUnit,
            amount: item.quantity * item.ratePerUnit,
            notes: item.notes,
          })),
        },
      },
      include: { items: true },
    });

    // Create ledger entry based on transaction type
    const isSale = req.body.transactionType === 'SALE';
    const isReturn = req.body.transactionType === 'RETURN';

    if (isSale || isReturn) {
      const balance = await req.prisma!.outstandingBalance.findUnique({
        where: {
          entityType_entityId: {
            entityType: 'customer',
            entityId: req.body.customerId,
          },
        },
      });

      const currentBalance = balance?.currentBalance?.toNumber() || 0;
      const debit = isSale ? totalAmount : 0;
      const credit = isReturn ? totalAmount : 0;
      const newBalance = currentBalance + debit - credit;

      // Create ledger entry
      const ledgerEntry = await req.prisma!.customerLedgerEntry.create({
        data: {
          customerId: req.body.customerId,
          entryDate: new Date(req.body.transactionDate),
          entryType: isSale ? 'SALE' : 'RETURN',
          debit,
          credit,
          balance: newBalance,
          referenceType: 'material_transaction',
          referenceId: transaction.id,
          referenceNumber: transactionNumber,
          description: `${isSale ? 'Sale' : 'Return'} - ${req.body.referenceNumber || transactionNumber}`,
        },
      });

      // Update transaction with ledger entry ID
      await req.prisma!.materialTransaction.update({
        where: { id: transaction.id },
        data: { ledgerEntryId: ledgerEntry.id },
      });

      // Update outstanding balance
      await req.prisma!.outstandingBalance.upsert({
        where: {
          entityType_entityId: {
            entityType: 'customer',
            entityId: req.body.customerId,
          },
        },
        update: {
          totalDebit: { increment: debit },
          totalCredit: { increment: credit },
          currentBalance: newBalance,
          lastTransactionAt: new Date(),
        },
        create: {
          entityType: 'customer',
          entityId: req.body.customerId,
          openingBalance: 0,
          totalDebit: debit,
          totalCredit: credit,
          currentBalance: newBalance,
          creditLimit: customer.creditLimit,
          lastTransactionAt: new Date(),
        },
      });
    }

    res.status(201).json({ message: 'Transaction created', data: transaction });
  } catch (error) {
    next(error);
  }
});

// GET /receivables/customers/:customerId/materials - Customer material history
receivablesRouter.get('/customers/:customerId/materials', requirePermission('sales:read'), validateParams(customerIdParamSchema), validateQuery(paginationSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { customerId } = req.params as unknown as { customerId: number };
    const { page = 1, limit = 50, startDate, endDate } = req.query as any;

    const whereClause: any = { customerId };
    if (startDate) whereClause.transactionDate = { ...whereClause.transactionDate, gte: new Date(startDate) };
    if (endDate) whereClause.transactionDate = { ...whereClause.transactionDate, lte: new Date(endDate) };

    const [transactions, total] = await Promise.all([
      req.prisma!.materialTransaction.findMany({
        where: whereClause,
        include: { items: true },
        orderBy: { transactionDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      req.prisma!.materialTransaction.count({ where: whereClause }),
    ]);

    res.json({
      data: transactions,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// CUSTOMER PAYMENTS
// ============================================

const createPaymentSchema = z.object({
  customerId: z.number().int().positive('Customer is required'),
  paymentDate: z.string().min(1, 'Date is required'),
  amount: z.number().positive('Amount is required'),
  paymentMethod: z.enum(['CASH', 'CHEQUE', 'BANK_TRANSFER', 'ONLINE']),
  receiptNumber: z.string().max(100).optional(),
  bankName: z.string().max(100).optional(),
  chequeNumber: z.string().max(100).optional(),
  transactionRef: z.string().max(100).optional(),
  notes: z.string().optional(),
});

// GET /receivables/payments - List customer payments
receivablesRouter.get('/payments', requirePermission('sales:read'), validateQuery(paginationSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = 1, limit = 50, startDate, endDate } = req.query as any;

    const whereClause: any = {};
    if (startDate) whereClause.paymentDate = { ...whereClause.paymentDate, gte: new Date(startDate) };
    if (endDate) whereClause.paymentDate = { ...whereClause.paymentDate, lte: new Date(endDate) };

    const [payments, total] = await Promise.all([
      req.prisma!.customerPayment.findMany({
        where: whereClause,
        include: {
          customer: { select: { id: true, code: true, name: true } },
        },
        orderBy: { paymentDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      req.prisma!.customerPayment.count({ where: whereClause }),
    ]);

    res.json({
      data: payments,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
});

// POST /receivables/payments - Create customer payment
receivablesRouter.post('/payments', requirePermission('sales:write'), validateBody(createPaymentSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.userId;

    // Verify customer exists
    const customer = await req.prisma!.customer.findUnique({ where: { id: req.body.customerId } });
    if (!customer) {
      throw AppError.notFound('Customer');
    }

    // Create payment
    const payment = await req.prisma!.customerPayment.create({
      data: {
        customerId: req.body.customerId,
        paymentDate: new Date(req.body.paymentDate),
        amount: req.body.amount,
        paymentMethod: req.body.paymentMethod,
        receiptNumber: req.body.receiptNumber,
        bankName: req.body.bankName,
        chequeNumber: req.body.chequeNumber,
        transactionRef: req.body.transactionRef,
        notes: req.body.notes,
        createdBy: userId,
      },
    });

    // Get current balance
    const balance = await req.prisma!.outstandingBalance.findUnique({
      where: {
        entityType_entityId: {
          entityType: 'customer',
          entityId: req.body.customerId,
        },
      },
    });

    const currentBalance = balance?.currentBalance?.toNumber() || 0;
    const newBalance = currentBalance - req.body.amount;

    // Create ledger entry
    await req.prisma!.customerLedgerEntry.create({
      data: {
        customerId: req.body.customerId,
        entryDate: new Date(req.body.paymentDate),
        entryType: 'PAYMENT_RECEIVED',
        debit: 0,
        credit: req.body.amount,
        balance: newBalance,
        referenceType: 'customer_payment',
        referenceId: payment.id,
        referenceNumber: req.body.receiptNumber || req.body.chequeNumber || `RCP-${payment.id}`,
        description: `Payment - ${req.body.paymentMethod}`,
      },
    });

    // Update outstanding balance
    await req.prisma!.outstandingBalance.upsert({
      where: {
        entityType_entityId: {
          entityType: 'customer',
          entityId: req.body.customerId,
        },
      },
      update: {
        totalCredit: { increment: req.body.amount },
        currentBalance: newBalance,
        lastTransactionAt: new Date(),
      },
      create: {
        entityType: 'customer',
        entityId: req.body.customerId,
        openingBalance: 0,
        totalDebit: 0,
        totalCredit: req.body.amount,
        currentBalance: newBalance,
        creditLimit: customer.creditLimit,
        lastTransactionAt: new Date(),
      },
    });

    res.status(201).json({ message: 'Payment recorded', data: payment });
  } catch (error) {
    next(error);
  }
});

// ============================================
// RECEIVABLES REPORTS
// ============================================

// GET /receivables/aging - Receivables aging report
receivablesRouter.get('/aging', requirePermission('sales:read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get all customer balances with outstanding > 0
    const balances = await req.prisma!.outstandingBalance.findMany({
      where: {
        entityType: 'customer',
        currentBalance: { gt: 0 },
      },
    });

    // Get customer details
    const agingData = await Promise.all(
      balances.map(async (bal) => {
        const customer = await req.prisma!.customer.findUnique({
          where: { id: bal.entityId },
          select: { id: true, code: true, name: true, businessName: true, creditLimit: true },
        });

        return {
          customerId: bal.entityId,
          customer,
          currentBalance: bal.currentBalance,
          creditLimit: bal.creditLimit,
          availableCredit: bal.availableCredit,
          isOverdue: bal.isOverdue,
          overdueAmount: bal.overdueAmount,
          overdueDays: bal.overdueDays,
          pendingChequeAmount: bal.pendingChequeAmount,
          pendingChequeCount: bal.pendingChequeCount,
        };
      })
    );

    res.json({ data: agingData.filter(a => a.customer !== null) });
  } catch (error) {
    next(error);
  }
});

// GET /receivables/outstanding - Outstanding amounts list
receivablesRouter.get('/outstanding', requirePermission('sales:read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const balances = await req.prisma!.outstandingBalance.findMany({
      where: {
        entityType: 'customer',
        currentBalance: { not: 0 },
      },
      orderBy: { currentBalance: 'desc' },
    });

    const customerIds = balances.map(b => b.entityId);
    const customers = await req.prisma!.customer.findMany({
      where: { id: { in: customerIds } },
      select: { id: true, code: true, name: true, businessName: true, phone: true },
    });

    const customersMap = new Map(customers.map(c => [c.id, c]));

    const data = balances.map(bal => ({
      ...bal,
      customer: customersMap.get(bal.entityId),
    }));

    res.json({ data });
  } catch (error) {
    next(error);
  }
});

// GET /receivables/customers/:customerId/statement - Account statement
receivablesRouter.get('/customers/:customerId/statement', requirePermission('sales:read'), validateParams(customerIdParamSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { customerId } = req.params as unknown as { customerId: number };
    const { startDate, endDate } = req.query as any;

    const customer = await req.prisma!.customer.findUnique({ where: { id: customerId } });
    if (!customer) {
      throw AppError.notFound('Customer');
    }

    const whereClause: any = { customerId };
    if (startDate) whereClause.entryDate = { ...whereClause.entryDate, gte: new Date(startDate) };
    if (endDate) whereClause.entryDate = { ...whereClause.entryDate, lte: new Date(endDate) };

    const entries = await req.prisma!.customerLedgerEntry.findMany({
      where: whereClause,
      orderBy: [{ entryDate: 'asc' }, { createdAt: 'asc' }],
    });

    const balance = await req.prisma!.outstandingBalance.findUnique({
      where: {
        entityType_entityId: {
          entityType: 'customer',
          entityId: customerId,
        },
      },
    });

    res.json({
      data: {
        customer,
        entries,
        summary: {
          totalDebit: balance?.totalDebit || 0,
          totalCredit: balance?.totalCredit || 0,
          currentBalance: balance?.currentBalance || 0,
          creditLimit: balance?.creditLimit || customer.creditLimit,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /receivables/summary - Dashboard summary
receivablesRouter.get('/summary', requirePermission('sales:read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Total receivables
    const totalReceivables = await req.prisma!.outstandingBalance.aggregate({
      where: {
        entityType: 'customer',
        currentBalance: { gt: 0 },
      },
      _sum: {
        currentBalance: true,
        overdueAmount: true,
        pendingChequeAmount: true,
      },
      _count: true,
    });

    // Recent payments
    const recentPayments = await req.prisma!.customerPayment.findMany({
      take: 5,
      orderBy: { paymentDate: 'desc' },
      include: {
        customer: { select: { name: true } },
      },
    });

    // Top debtors
    const topDebtors = await req.prisma!.outstandingBalance.findMany({
      where: {
        entityType: 'customer',
        currentBalance: { gt: 0 },
      },
      orderBy: { currentBalance: 'desc' },
      take: 5,
    });

    const debtorIds = topDebtors.map(d => d.entityId);
    const debtorCustomers = await req.prisma!.customer.findMany({
      where: { id: { in: debtorIds } },
      select: { id: true, code: true, name: true },
    });
    const debtorMap = new Map(debtorCustomers.map(c => [c.id, c]));

    res.json({
      data: {
        totalReceivables: totalReceivables._sum.currentBalance || 0,
        totalOverdue: totalReceivables._sum.overdueAmount || 0,
        pendingCheques: totalReceivables._sum.pendingChequeAmount || 0,
        customerCount: totalReceivables._count,
        recentPayments,
        topDebtors: topDebtors.map(d => ({
          ...d,
          customer: debtorMap.get(d.entityId),
        })),
      },
    });
  } catch (error) {
    next(error);
  }
});
