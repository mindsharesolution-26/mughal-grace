import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenant';
import { requirePermission } from '../middleware/rbac';
import { validateBody, validateParams } from '../middleware/validate';
import { AppError } from '../middleware/error-handler';

export const salesRouter: Router = Router();

salesRouter.use(authMiddleware);
salesRouter.use(tenantMiddleware);

// Validation schemas
const idParamSchema = z.object({
  id: z.string().regex(/^\d+$/, 'Invalid ID format').transform(Number),
});

const createCustomerSchema = z.object({
  code: z.string().max(50).optional(), // Auto-generated if not provided
  name: z.string().min(1, 'Name is required').max(255),
  businessName: z.string().max(255).optional(),
  contactPerson: z.string().max(255).optional(),
  phone: z.string().max(50).optional(),
  email: z.string().max(255).optional().nullable(),
  address: z.string().optional(),
  city: z.string().max(100).optional(),
  ntn: z.string().max(50).optional(),
  strn: z.string().max(50).optional(),
  creditLimit: z.number().min(0).optional(),
  paymentTerms: z.number().int().min(0).optional(),
  customerType: z.enum(['REGULAR', 'WHOLESALE', 'RETAIL', 'EXPORT']).optional(),
  isActive: z.boolean().optional(),
});

const updateCustomerSchema = createCustomerSchema.partial();

const createLedgerEntrySchema = z.object({
  entryDate: z.string().min(1, 'Entry date is required'),
  entryType: z.enum(['OPENING_BALANCE', 'SALE', 'PAYMENT_RECEIVED', 'RETURN', 'ADJUSTMENT']),
  debit: z.number().min(0).default(0),
  credit: z.number().min(0).default(0),
  referenceType: z.string().max(50).optional(),
  referenceId: z.number().int().positive().optional(),
  referenceNumber: z.string().max(100).optional(),
  description: z.string().optional(),
});

// ============ CUSTOMERS ============

// GET /sales/customers/lookup - Lightweight lookup for dropdowns
salesRouter.get('/customers/lookup', requirePermission('sales:read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const customers = await req.prisma!.customer.findMany({
      where: { isActive: true },
      select: {
        id: true,
        code: true,
        name: true,
        businessName: true,
      },
      orderBy: { name: 'asc' },
    });
    res.json(customers);
  } catch (error) {
    next(error);
  }
});

// GET /sales/customers/stats - Dashboard stats
salesRouter.get('/customers/stats', requirePermission('sales:read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [
      totalCustomers,
      activeCustomers,
      customersWithBalance,
    ] = await Promise.all([
      req.prisma!.customer.count(),
      req.prisma!.customer.count({ where: { isActive: true } }),
      // Count customers with outstanding balance (debit > credit in ledger)
      req.prisma!.$queryRaw<[{ count: bigint; total: number }]>`
        SELECT COUNT(DISTINCT c.id) as count, COALESCE(SUM(l.balance), 0) as total
        FROM customers c
        LEFT JOIN (
          SELECT customer_id, balance
          FROM customer_ledger_entries
          WHERE id IN (
            SELECT MAX(id) FROM customer_ledger_entries GROUP BY customer_id
          )
        ) l ON l.customer_id = c.id
        WHERE l.balance > 0
      `.catch(() => [{ count: BigInt(0), total: 0 }]),
    ]);

    res.json({
      totalCustomers,
      activeCustomers,
      inactiveCustomers: totalCustomers - activeCustomers,
      customersWithBalance: Number(customersWithBalance[0]?.count || 0),
      totalOutstanding: Number(customersWithBalance[0]?.total || 0),
    });
  } catch (error) {
    next(error);
  }
});

// GET /sales/customers - List all customers
salesRouter.get('/customers', requirePermission('sales:read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { search, isActive, customerType, page = '1', limit = '50' } = req.query;

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: String(search), mode: 'insensitive' } },
        { code: { contains: String(search), mode: 'insensitive' } },
        { businessName: { contains: String(search), mode: 'insensitive' } },
        { contactPerson: { contains: String(search), mode: 'insensitive' } },
        { phone: { contains: String(search), mode: 'insensitive' } },
        { city: { contains: String(search), mode: 'insensitive' } },
      ];
    }

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    if (customerType) {
      where.customerType = customerType;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [customers, total] = await Promise.all([
      req.prisma!.customer.findMany({
        where,
        include: {
          _count: {
            select: { salesOrders: true, ledgerEntries: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      req.prisma!.customer.count({ where }),
    ]);

    // Get latest balance for each customer
    const customerIds = customers.map(c => c.id);
    const latestBalances = await req.prisma!.customerLedgerEntry.findMany({
      where: {
        customerId: { in: customerIds },
      },
      orderBy: [{ entryDate: 'desc' }, { id: 'desc' }],
      distinct: ['customerId'],
      select: {
        customerId: true,
        balance: true,
      },
    });

    const balanceMap = new Map(latestBalances.map(b => [b.customerId, b.balance]));

    const customersWithBalance = customers.map(customer => ({
      ...customer,
      currentBalance: balanceMap.get(customer.id)?.toNumber() || 0,
    }));

    res.json({
      customers: customersWithBalance,
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

// GET /sales/customers/:id - Get single customer
salesRouter.get('/customers/:id', requirePermission('sales:read'), validateParams(idParamSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params as unknown as { id: number };

    const customer = await req.prisma!.customer.findUnique({
      where: { id },
      include: {
        _count: {
          select: { salesOrders: true, ledgerEntries: true, payments: true },
        },
      },
    });

    if (!customer) {
      throw AppError.notFound('Customer');
    }

    // Get current balance
    const latestEntry = await req.prisma!.customerLedgerEntry.findFirst({
      where: { customerId: id },
      orderBy: [{ entryDate: 'desc' }, { id: 'desc' }],
      select: { balance: true },
    });

    res.json({
      ...customer,
      currentBalance: latestEntry?.balance?.toNumber() || 0,
    });
  } catch (error) {
    next(error);
  }
});

// POST /sales/customers - Create customer
salesRouter.post('/customers', requirePermission('sales:write'), validateBody(createCustomerSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Auto-generate code if not provided
    let customerCode = req.body.code;
    if (!customerCode) {
      const lastCustomer = await req.prisma!.customer.findFirst({
        where: { code: { startsWith: 'CUST-' } },
        orderBy: { code: 'desc' },
      });

      let nextNumber = 1;
      if (lastCustomer && lastCustomer.code) {
        const match = lastCustomer.code.match(/CUST-(\d+)/);
        if (match) {
          nextNumber = parseInt(match[1], 10) + 1;
        }
      }
      customerCode = `CUST-${String(nextNumber).padStart(4, '0')}`;
    }

    // Check code uniqueness
    const existing = await req.prisma!.customer.findUnique({
      where: { code: customerCode },
    });
    if (existing) {
      throw AppError.conflict('Customer code already exists');
    }

    const customer = await req.prisma!.customer.create({
      data: {
        code: customerCode,
        name: req.body.name,
        businessName: req.body.businessName,
        contactPerson: req.body.contactPerson,
        phone: req.body.phone,
        email: req.body.email || null,
        address: req.body.address,
        city: req.body.city,
        ntn: req.body.ntn,
        strn: req.body.strn,
        creditLimit: req.body.creditLimit,
        paymentTerms: req.body.paymentTerms ?? 30,
        customerType: req.body.customerType || 'REGULAR',
        isActive: req.body.isActive ?? true,
      },
    });

    res.status(201).json(customer);
  } catch (error) {
    next(error);
  }
});

// PUT /sales/customers/:id - Update customer
salesRouter.put('/customers/:id', requirePermission('sales:write'), validateParams(idParamSchema), validateBody(updateCustomerSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params as unknown as { id: number };

    const existing = await req.prisma!.customer.findUnique({ where: { id } });
    if (!existing) {
      throw AppError.notFound('Customer');
    }

    // Check code uniqueness if changing
    if (req.body.code && req.body.code !== existing.code) {
      const codeExists = await req.prisma!.customer.findUnique({
        where: { code: req.body.code },
      });
      if (codeExists) {
        throw AppError.conflict('Customer code already exists');
      }
    }

    const customer = await req.prisma!.customer.update({
      where: { id },
      data: req.body,
    });

    res.json(customer);
  } catch (error) {
    next(error);
  }
});

// DELETE /sales/customers/:id - Soft delete (set inactive)
salesRouter.delete('/customers/:id', requirePermission('sales:write'), validateParams(idParamSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params as unknown as { id: number };

    const existing = await req.prisma!.customer.findUnique({ where: { id } });
    if (!existing) {
      throw AppError.notFound('Customer');
    }

    await req.prisma!.customer.update({
      where: { id },
      data: { isActive: false },
    });

    res.json({ message: 'Customer deactivated' });
  } catch (error) {
    next(error);
  }
});

// ============ CUSTOMER LEDGER ============

// GET /sales/customers/:id/ledger - Get customer ledger entries
salesRouter.get('/customers/:id/ledger', requirePermission('sales:read'), validateParams(idParamSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params as unknown as { id: number };
    const { fromDate, toDate, page = '1', limit = '50' } = req.query;

    // Verify customer exists
    const customer = await req.prisma!.customer.findUnique({
      where: { id },
      select: { id: true, code: true, name: true },
    });
    if (!customer) {
      throw AppError.notFound('Customer');
    }

    const where: any = { customerId: id };

    if (fromDate) {
      where.entryDate = { ...where.entryDate, gte: new Date(String(fromDate)) };
    }
    if (toDate) {
      where.entryDate = { ...where.entryDate, lte: new Date(String(toDate)) };
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [entries, total] = await Promise.all([
      req.prisma!.customerLedgerEntry.findMany({
        where,
        orderBy: [{ entryDate: 'desc' }, { id: 'desc' }],
        skip,
        take: Number(limit),
      }),
      req.prisma!.customerLedgerEntry.count({ where }),
    ]);

    // Get totals
    const totals = await req.prisma!.customerLedgerEntry.aggregate({
      where: { customerId: id },
      _sum: { debit: true, credit: true },
    });

    // Get current balance (latest entry)
    const latestEntry = entries.length > 0 ? entries[0] : null;

    res.json({
      customer,
      entries,
      summary: {
        totalDebit: totals._sum.debit?.toNumber() || 0,
        totalCredit: totals._sum.credit?.toNumber() || 0,
        currentBalance: latestEntry?.balance?.toNumber() || 0,
      },
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

// POST /sales/customers/:id/ledger - Add ledger entry (opening balance, adjustment)
salesRouter.post('/customers/:id/ledger', requirePermission('sales:write'), validateParams(idParamSchema), validateBody(createLedgerEntrySchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params as unknown as { id: number };

    // Verify customer exists
    const customer = await req.prisma!.customer.findUnique({ where: { id } });
    if (!customer) {
      throw AppError.notFound('Customer');
    }

    // Get the last ledger entry to calculate running balance
    const lastEntry = await req.prisma!.customerLedgerEntry.findFirst({
      where: { customerId: id },
      orderBy: [{ entryDate: 'desc' }, { id: 'desc' }],
    });

    const previousBalance = lastEntry?.balance?.toNumber() || 0;
    const newBalance = previousBalance + req.body.debit - req.body.credit;

    const entry = await req.prisma!.customerLedgerEntry.create({
      data: {
        customerId: id,
        entryDate: new Date(req.body.entryDate),
        entryType: req.body.entryType,
        debit: req.body.debit,
        credit: req.body.credit,
        balance: newBalance,
        referenceType: req.body.referenceType,
        referenceId: req.body.referenceId,
        referenceNumber: req.body.referenceNumber,
        description: req.body.description,
      },
    });

    res.status(201).json(entry);
  } catch (error) {
    next(error);
  }
});

// GET /sales/customers/:id/orders - Get customer orders
salesRouter.get('/customers/:id/orders', requirePermission('sales:read'), validateParams(idParamSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params as unknown as { id: number };
    const { status, page = '1', limit = '20' } = req.query;

    // Verify customer exists
    const customer = await req.prisma!.customer.findUnique({ where: { id } });
    if (!customer) {
      throw AppError.notFound('Customer');
    }

    const where: any = { customerId: id };
    if (status) {
      where.status = status;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [orders, total] = await Promise.all([
      req.prisma!.salesOrder.findMany({
        where,
        include: {
          items: true,
          _count: { select: { items: true } },
        },
        orderBy: { orderDate: 'desc' },
        skip,
        take: Number(limit),
      }),
      req.prisma!.salesOrder.count({ where }),
    ]);

    res.json({
      orders,
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

// ============ SALES ORDERS (Placeholder for future) ============

salesRouter.get('/orders', requirePermission('sales:read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, customerId, page = '1', limit = '20' } = req.query;

    const where: any = {};
    if (status) where.status = status;
    if (customerId) where.customerId = Number(customerId);

    const skip = (Number(page) - 1) * Number(limit);

    const [orders, total] = await Promise.all([
      req.prisma!.salesOrder.findMany({
        where,
        include: {
          customer: { select: { id: true, code: true, name: true } },
          _count: { select: { items: true } },
        },
        orderBy: { orderDate: 'desc' },
        skip,
        take: Number(limit),
      }),
      req.prisma!.salesOrder.count({ where }),
    ]);

    res.json({
      orders,
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

salesRouter.post('/orders', requirePermission('sales:write'), (_req, res) => {
  res.json({ message: 'Create sales order - coming soon' });
});

salesRouter.get('/orders/:id', requirePermission('sales:read'), validateParams(idParamSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params as unknown as { id: number };

    const order = await req.prisma!.salesOrder.findUnique({
      where: { id },
      include: {
        customer: true,
        items: {
          include: {
            roll: true,
          },
        },
      },
    });

    if (!order) {
      throw AppError.notFound('Sales order');
    }

    res.json(order);
  } catch (error) {
    next(error);
  }
});

salesRouter.patch('/orders/:id/confirm', requirePermission('sales:write'), (_req, res) => {
  res.json({ message: 'Confirm order - coming soon' });
});

salesRouter.patch('/orders/:id/dispatch', requirePermission('sales:write'), (_req, res) => {
  res.json({ message: 'Dispatch order - coming soon' });
});

salesRouter.get('/orders/:id/invoice', requirePermission('sales:read'), (_req, res) => {
  res.json({ message: 'Generate invoice - coming soon' });
});

// ============ PAYMENTS ============

salesRouter.get('/payments', requirePermission('sales:read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { customerId, fromDate, toDate, page = '1', limit = '20' } = req.query;

    const where: any = {};
    if (customerId) where.customerId = Number(customerId);
    if (fromDate) {
      where.paymentDate = { ...where.paymentDate, gte: new Date(String(fromDate)) };
    }
    if (toDate) {
      where.paymentDate = { ...where.paymentDate, lte: new Date(String(toDate)) };
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [payments, total] = await Promise.all([
      req.prisma!.customerPayment.findMany({
        where,
        include: {
          customer: { select: { id: true, code: true, name: true } },
        },
        orderBy: { paymentDate: 'desc' },
        skip,
        take: Number(limit),
      }),
      req.prisma!.customerPayment.count({ where }),
    ]);

    res.json({
      payments,
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

const recordPaymentSchema = z.object({
  customerId: z.number().int().positive('Customer is required'),
  paymentDate: z.string().min(1, 'Payment date is required'),
  amount: z.number().positive('Amount must be positive'),
  paymentMethod: z.enum(['CASH', 'CHEQUE', 'BANK_TRANSFER', 'ONLINE']),
  receiptNumber: z.string().max(100).optional(),
  bankName: z.string().max(100).optional(),
  chequeNumber: z.string().max(100).optional(),
  transactionRef: z.string().max(100).optional(),
  notes: z.string().optional(),
});

salesRouter.post('/payments', requirePermission('sales:write'), validateBody(recordPaymentSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.userId;

    // Verify customer exists
    const customer = await req.prisma!.customer.findUnique({
      where: { id: req.body.customerId },
    });
    if (!customer) {
      throw AppError.notFound('Customer');
    }

    // Generate receipt number if not provided
    let receiptNumber = req.body.receiptNumber;
    if (!receiptNumber) {
      const year = new Date().getFullYear();
      const lastPayment = await req.prisma!.customerPayment.findFirst({
        where: { receiptNumber: { startsWith: `RCP-${year}-` } },
        orderBy: { receiptNumber: 'desc' },
      });

      let nextNum = 1;
      if (lastPayment?.receiptNumber) {
        const match = lastPayment.receiptNumber.match(/RCP-\d{4}-(\d+)/);
        if (match) nextNum = parseInt(match[1]) + 1;
      }
      receiptNumber = `RCP-${year}-${String(nextNum).padStart(5, '0')}`;
    }

    // Use transaction to create payment and ledger entry
    const result = await req.prisma!.$transaction(async (tx) => {
      // Create payment record
      const payment = await tx.customerPayment.create({
        data: {
          customerId: req.body.customerId,
          paymentDate: new Date(req.body.paymentDate),
          amount: req.body.amount,
          paymentMethod: req.body.paymentMethod,
          receiptNumber,
          bankName: req.body.bankName,
          chequeNumber: req.body.chequeNumber,
          transactionRef: req.body.transactionRef,
          notes: req.body.notes,
          createdBy: userId,
        },
      });

      // Get last ledger entry for balance
      const lastEntry = await tx.customerLedgerEntry.findFirst({
        where: { customerId: req.body.customerId },
        orderBy: [{ entryDate: 'desc' }, { id: 'desc' }],
      });

      const previousBalance = lastEntry?.balance?.toNumber() || 0;
      const newBalance = previousBalance - req.body.amount; // Credit reduces balance

      // Create ledger entry
      const ledgerEntry = await tx.customerLedgerEntry.create({
        data: {
          customerId: req.body.customerId,
          entryDate: new Date(req.body.paymentDate),
          entryType: 'PAYMENT_RECEIVED',
          debit: 0,
          credit: req.body.amount,
          balance: newBalance,
          referenceType: 'customer_payment',
          referenceId: payment.id,
          referenceNumber: receiptNumber,
          description: `Payment received via ${req.body.paymentMethod}`,
        },
      });

      return { payment, ledgerEntry };
    });

    res.status(201).json(result.payment);
  } catch (error) {
    next(error);
  }
});

// ============ SALES LEDGER (Combined View) ============

// GET /sales/ledger - Get combined customer and vendor ledger entries
salesRouter.get('/ledger', requirePermission('sales:read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { type = 'all', fromDate, toDate, page = '1', limit = '50' } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    // Build date filter
    const dateFilter: any = {};
    if (fromDate) {
      dateFilter.gte = new Date(String(fromDate));
    }
    if (toDate) {
      dateFilter.lte = new Date(String(toDate));
    }

    const customerWhere: any = {};
    const vendorWhere: any = {};

    if (Object.keys(dateFilter).length > 0) {
      customerWhere.entryDate = dateFilter;
      vendorWhere.entryDate = dateFilter;
    }

    // Fetch entries based on type filter
    let customerEntries: any[] = [];
    let vendorEntries: any[] = [];

    if (type === 'all' || type === 'customer') {
      customerEntries = await req.prisma!.customerLedgerEntry.findMany({
        where: customerWhere,
        include: {
          customer: { select: { id: true, code: true, name: true } },
        },
        orderBy: [{ entryDate: 'desc' }, { id: 'desc' }],
      });
    }

    if (type === 'all' || type === 'vendor') {
      vendorEntries = await req.prisma!.vendorLedgerEntry.findMany({
        where: vendorWhere,
        include: {
          yarnVendor: { select: { id: true, code: true, name: true } },
          dyeingVendor: { select: { id: true, code: true, name: true } },
          generalSupplier: { select: { id: true, code: true, name: true } },
        },
        orderBy: [{ entryDate: 'desc' }, { id: 'desc' }],
      });
    }

    // Transform and combine entries
    const combinedEntries = [
      ...customerEntries.map(entry => ({
        id: entry.id,
        partyType: 'customer' as const,
        partyId: entry.customerId,
        partyName: entry.customer?.name || 'Unknown',
        partyCode: entry.customer?.code || '',
        entryDate: entry.entryDate,
        entryType: entry.entryType,
        debit: entry.debit?.toString() || '0',
        credit: entry.credit?.toString() || '0',
        balance: entry.balance?.toString() || '0',
        description: entry.description,
        referenceNumber: entry.referenceNumber,
      })),
      ...vendorEntries.map(entry => {
        const vendor = entry.yarnVendor || entry.dyeingVendor || entry.generalSupplier;
        return {
          id: entry.id,
          partyType: 'vendor' as const,
          partyId: entry.yarnVendorId || entry.dyeingVendorId || entry.generalSupplierId,
          partyName: vendor?.name || 'Unknown',
          partyCode: vendor?.code || '',
          entryDate: entry.entryDate,
          entryType: entry.entryType,
          debit: entry.debit?.toString() || '0',
          credit: entry.credit?.toString() || '0',
          balance: entry.balance?.toString() || '0',
          description: entry.description,
          referenceNumber: entry.referenceNumber,
        };
      }),
    ];

    // Sort by date descending
    combinedEntries.sort((a, b) => new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime());

    // Calculate pagination
    const total = combinedEntries.length;
    const paginatedEntries = combinedEntries.slice(skip, skip + Number(limit));

    // Calculate summary totals
    // Get total receivables (latest balance per customer where balance > 0)
    const customerBalances = await req.prisma!.$queryRaw<{ total: number }[]>`
      SELECT COALESCE(SUM(balance), 0) as total
      FROM (
        SELECT DISTINCT ON (customer_id) balance
        FROM customer_ledger_entries
        ORDER BY customer_id, entry_date DESC, id DESC
      ) latest
      WHERE balance > 0
    `.catch(() => [{ total: 0 }]);

    // Get total payables (latest balance per vendor where balance > 0)
    const vendorBalances = await req.prisma!.$queryRaw<{ total: number }[]>`
      SELECT COALESCE(SUM(balance), 0) as total
      FROM (
        SELECT DISTINCT ON (COALESCE(yarn_vendor_id, dyeing_vendor_id, general_supplier_id)) balance
        FROM vendor_ledger_entries
        ORDER BY COALESCE(yarn_vendor_id, dyeing_vendor_id, general_supplier_id), entry_date DESC, id DESC
      ) latest
      WHERE balance > 0
    `.catch(() => [{ total: 0 }]);

    const totalReceivable = Number(customerBalances[0]?.total || 0);
    const totalPayable = Number(vendorBalances[0]?.total || 0);

    res.json({
      entries: paginatedEntries,
      summary: {
        totalReceivable,
        totalPayable,
        netBalance: totalReceivable - totalPayable,
      },
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

// GET /sales/ledger/alerts - Get pending payments and upcoming cheques
salesRouter.get('/ledger/alerts', requirePermission('sales:read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get pending payments (customers/vendors with outstanding balance)
    // Customers with balance > 0 (they owe us)
    const customerPending = await req.prisma!.$queryRaw<{
      party_id: number;
      party_name: string;
      party_code: string;
      amount: number;
    }[]>`
      SELECT
        c.id as party_id,
        c.name as party_name,
        c.code as party_code,
        le.balance as amount
      FROM customers c
      INNER JOIN (
        SELECT DISTINCT ON (customer_id) customer_id, balance
        FROM customer_ledger_entries
        ORDER BY customer_id, entry_date DESC, id DESC
      ) le ON le.customer_id = c.id
      WHERE le.balance > 0 AND c.is_active = true
      ORDER BY le.balance DESC
      LIMIT 10
    `.catch(() => []);

    // Vendors with balance > 0 (we owe them)
    const vendorPending = await req.prisma!.$queryRaw<{
      party_id: number;
      party_name: string;
      party_code: string;
      amount: number;
      vendor_type: string;
    }[]>`
      SELECT
        COALESCE(yv.id, dv.id, gs.id) as party_id,
        COALESCE(yv.name, dv.name, gs.name) as party_name,
        COALESCE(yv.code, dv.code, gs.code) as party_code,
        le.balance as amount,
        le.vendor_type
      FROM vendor_ledger_entries le
      LEFT JOIN yarn_vendors yv ON yv.id = le.yarn_vendor_id
      LEFT JOIN dyeing_vendors dv ON dv.id = le.dyeing_vendor_id
      LEFT JOIN general_suppliers gs ON gs.id = le.general_supplier_id
      WHERE le.id IN (
        SELECT DISTINCT ON (COALESCE(yarn_vendor_id, dyeing_vendor_id, general_supplier_id)) id
        FROM vendor_ledger_entries
        ORDER BY COALESCE(yarn_vendor_id, dyeing_vendor_id, general_supplier_id), entry_date DESC, id DESC
      )
      AND le.balance > 0
      ORDER BY le.balance DESC
      LIMIT 10
    `.catch(() => []);

    // Format pending payments
    const pendingPayments = [
      ...customerPending.map(p => ({
        partyType: 'customer' as const,
        partyId: Number(p.party_id),
        partyName: p.party_name,
        partyCode: p.party_code,
        amount: Number(p.amount),
        direction: 'receivable' as const, // They owe us
      })),
      ...vendorPending.map(p => ({
        partyType: 'vendor' as const,
        partyId: Number(p.party_id),
        partyName: p.party_name,
        partyCode: p.party_code,
        amount: Number(p.amount),
        direction: 'payable' as const, // We owe them
      })),
    ];

    // Sort by amount descending
    pendingPayments.sort((a, b) => b.amount - a.amount);

    // Get upcoming cheques (next 30 days)
    const today = new Date();
    const thirtyDaysLater = new Date();
    thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);

    const upcomingCheques = await req.prisma!.cheque.findMany({
      where: {
        chequeDate: {
          gte: today,
          lte: thirtyDaysLater,
        },
        status: { in: ['PENDING', 'DEPOSITED'] },
      },
      include: {
        customer: { select: { id: true, code: true, name: true } },
        yarnVendor: { select: { id: true, code: true, name: true } },
        dyeingVendor: { select: { id: true, code: true, name: true } },
        generalSupplier: { select: { id: true, code: true, name: true } },
      },
      orderBy: { chequeDate: 'asc' },
      take: 20,
    });

    // Format cheques with days until due
    const formattedCheques = upcomingCheques.map(cheque => {
      const party = cheque.customer || cheque.yarnVendor || cheque.dyeingVendor || cheque.generalSupplier;
      const daysUntilDue = Math.ceil(
        (new Date(cheque.chequeDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );

      return {
        id: cheque.id,
        chequeNumber: cheque.chequeNumber,
        chequeType: cheque.chequeType,
        partyName: party?.name || 'Unknown',
        partyCode: party?.code || '',
        amount: cheque.amount?.toNumber() || 0,
        chequeDate: cheque.chequeDate,
        daysUntilDue,
        status: cheque.status,
      };
    });

    res.json({
      pendingPayments: pendingPayments.slice(0, 15),
      upcomingCheques: formattedCheques,
    });
  } catch (error) {
    next(error);
  }
});
