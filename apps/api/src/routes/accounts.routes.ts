import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { logger } from '../utils/logger';

const router: Router = Router();

// ============ CHART OF ACCOUNTS ============

// Validation schemas
const createAccountSchema = z.object({
  code: z.string().min(1, 'Account code is required'),
  name: z.string().min(2, 'Account name is required'),
  nameUrdu: z.string().optional(),
  accountType: z.enum([
    'CASH',
    'BANK',
    'ACCOUNTS_RECEIVABLE',
    'INVENTORY',
    'FIXED_ASSET',
    'OTHER_ASSET',
    'ACCOUNTS_PAYABLE',
    'SHORT_TERM_LIABILITY',
    'LONG_TERM_LIABILITY',
    'EQUITY',
    'REVENUE',
    'COST_OF_GOODS_SOLD',
    'OPERATING_EXPENSE',
    'OTHER_INCOME',
    'OTHER_EXPENSE',
  ]),
  accountGroup: z.enum(['ASSETS', 'LIABILITIES', 'EQUITY', 'REVENUE', 'EXPENSE']),
  parentId: z.number().optional().nullable(),
  isHeader: z.boolean().default(false),
  normalBalance: z.enum(['DEBIT', 'CREDIT']).optional(),
  currency: z.string().default('PKR'),
  isControlAccount: z.boolean().default(false),
  controlledEntity: z
    .enum([
      'CUSTOMER',
      'YARN_VENDOR',
      'DYEING_VENDOR',
      'GENERAL_SUPPLIER',
      'EMPLOYEE',
      'BANK',
    ])
    .optional()
    .nullable(),
  openingBalance: z.coerce.number().default(0),
  isBankAccount: z.boolean().default(false),
  bankDetails: z
    .object({
      bankName: z.string().optional(),
      accountNumber: z.string().optional(),
      accountTitle: z.string().optional(),
      branchCode: z.string().optional(),
      iban: z.string().optional(),
    })
    .optional()
    .nullable(),
  description: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  isActive: z.boolean().default(true),
});

const updateAccountSchema = createAccountSchema.partial();

// Helper: Calculate level based on parent
async function calculateLevel(prisma: any, parentId: number | null | undefined): Promise<number> {
  if (!parentId) return 1;

  const parent = await prisma.chartOfAccount.findUnique({
    where: { id: parentId },
    select: { level: true },
  });

  return parent ? parent.level + 1 : 1;
}

// Helper: Determine normal balance based on account group
function getDefaultNormalBalance(accountGroup: string): 'DEBIT' | 'CREDIT' {
  switch (accountGroup) {
    case 'ASSETS':
    case 'EXPENSE':
      return 'DEBIT';
    case 'LIABILITIES':
    case 'EQUITY':
    case 'REVENUE':
      return 'CREDIT';
    default:
      return 'DEBIT';
  }
}

// GET /accounts - List all accounts (flat or tree structure)
router.get('/', async (req: Request, res: Response) => {
  try {
    const prisma = req.prisma!;
    const { search, accountGroup, accountType, isActive, isHeader, tree } = req.query;

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { code: { contains: search as string, mode: 'insensitive' } },
        { nameUrdu: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    if (accountGroup) {
      where.accountGroup = accountGroup as string;
    }

    if (accountType) {
      where.accountType = accountType as string;
    }

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    if (isHeader !== undefined) {
      where.isHeader = isHeader === 'true';
    }

    const accounts = await prisma.chartOfAccount.findMany({
      where,
      orderBy: [{ accountGroup: 'asc' }, { code: 'asc' }],
      include: {
        parent: {
          select: { id: true, code: true, name: true },
        },
        _count: {
          select: { children: true },
        },
      },
    });

    // If tree=true, build hierarchical structure
    if (tree === 'true') {
      const accountMap = new Map();
      const roots: any[] = [];

      // First pass: create map of all accounts
      accounts.forEach((account) => {
        accountMap.set(account.id, { ...account, children: [] });
      });

      // Second pass: build tree
      accounts.forEach((account) => {
        const node = accountMap.get(account.id);
        if (account.parentId && accountMap.has(account.parentId)) {
          accountMap.get(account.parentId).children.push(node);
        } else {
          roots.push(node);
        }
      });

      return res.json({ data: roots });
    }

    res.json({ data: accounts });
  } catch (error) {
    logger.error('Error fetching accounts:', error);
    res.status(500).json({ error: 'Failed to fetch accounts' });
  }
});

// GET /accounts/lookup - Lightweight list for dropdowns
router.get('/lookup', async (req: Request, res: Response) => {
  try {
    const prisma = req.prisma!;
    const { accountGroup, accountType, isHeader, excludeHeaders } = req.query;

    const where: any = { isActive: true };

    if (accountGroup) {
      where.accountGroup = accountGroup as string;
    }

    if (accountType) {
      where.accountType = accountType as string;
    }

    if (isHeader !== undefined) {
      where.isHeader = isHeader === 'true';
    }

    if (excludeHeaders === 'true') {
      where.isHeader = false;
    }

    const accounts = await prisma.chartOfAccount.findMany({
      where,
      select: {
        id: true,
        code: true,
        name: true,
        nameUrdu: true,
        accountType: true,
        accountGroup: true,
        level: true,
        isHeader: true,
        normalBalance: true,
      },
      orderBy: [{ accountGroup: 'asc' }, { code: 'asc' }],
    });

    res.json({ data: accounts });
  } catch (error) {
    logger.error('Error fetching accounts lookup:', error);
    res.status(500).json({ error: 'Failed to fetch accounts' });
  }
});

// GET /accounts/summary - Get account balances summary by group
router.get('/summary', async (req: Request, res: Response) => {
  try {
    const prisma = req.prisma!;

    const summary = await prisma.chartOfAccount.groupBy({
      by: ['accountGroup'],
      where: { isActive: true, isHeader: false },
      _sum: {
        currentBalance: true,
      },
      _count: {
        id: true,
      },
    });

    res.json({ data: summary });
  } catch (error) {
    logger.error('Error fetching accounts summary:', error);
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
});

// GET /accounts/:id - Get single account with children
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const prisma = req.prisma!;
    const id = req.params.id as string;

    const account = await prisma.chartOfAccount.findUnique({
      where: { id: parseInt(id) },
      include: {
        parent: {
          select: { id: true, code: true, name: true },
        },
        children: {
          select: {
            id: true,
            code: true,
            name: true,
            accountType: true,
            currentBalance: true,
            isActive: true,
          },
          orderBy: { code: 'asc' },
        },
      },
    });

    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    res.json({ data: account });
  } catch (error) {
    logger.error('Error fetching account:', error);
    res.status(500).json({ error: 'Failed to fetch account' });
  }
});

// POST /accounts - Create new account
router.post('/', async (req: Request, res: Response) => {
  try {
    const prisma = req.prisma!;
    const data = createAccountSchema.parse(req.body);

    // Check for duplicate code
    const existing = await prisma.chartOfAccount.findUnique({
      where: { code: data.code },
    });

    if (existing) {
      return res.status(400).json({ error: `Account code "${data.code}" already exists` });
    }

    // Validate parent exists if provided
    if (data.parentId) {
      const parent = await prisma.chartOfAccount.findUnique({
        where: { id: data.parentId },
      });
      if (!parent) {
        return res.status(400).json({ error: 'Parent account not found' });
      }
      // Parent must be a header account
      if (!parent.isHeader) {
        return res.status(400).json({ error: 'Parent account must be a header account' });
      }
      // Parent must have same account group
      if (parent.accountGroup !== data.accountGroup) {
        return res.status(400).json({
          error: 'Child account must have same account group as parent',
        });
      }
    }

    // Calculate level
    const level = await calculateLevel(prisma, data.parentId);

    // Determine normal balance
    const normalBalance = data.normalBalance || getDefaultNormalBalance(data.accountGroup);

    const account = await prisma.chartOfAccount.create({
      data: {
        code: data.code,
        name: data.name,
        nameUrdu: data.nameUrdu,
        accountType: data.accountType as any,
        accountGroup: data.accountGroup as any,
        parentId: data.parentId,
        level,
        isHeader: data.isHeader,
        normalBalance: normalBalance as any,
        currency: data.currency,
        isControlAccount: data.isControlAccount,
        controlledEntity: data.controlledEntity as any,
        openingBalance: data.openingBalance,
        currentBalance: data.openingBalance, // Start with opening balance
        isBankAccount: data.isBankAccount,
        bankDetails: data.bankDetails as any,
        description: data.description,
        notes: data.notes,
        tags: data.tags || [],
        isActive: data.isActive,
      },
    });

    logger.info(`Created account: ${account.code} - ${account.name}`);
    res.status(201).json({ message: 'Account created successfully', data: account });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    logger.error('Error creating account:', error);
    res.status(500).json({ error: 'Failed to create account' });
  }
});

// PUT /accounts/:id - Update account
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const prisma = req.prisma!;
    const id = req.params.id as string;
    const data = updateAccountSchema.parse(req.body);

    const existing = await prisma.chartOfAccount.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Account not found' });
    }

    // Prevent editing system accounts
    if (existing.isSystemAccount) {
      return res.status(400).json({ error: 'Cannot modify system accounts' });
    }

    // Check for duplicate code if code is being changed
    if (data.code && data.code !== existing.code) {
      const codeExists = await prisma.chartOfAccount.findUnique({
        where: { code: data.code },
      });
      if (codeExists) {
        return res.status(400).json({ error: `Account code "${data.code}" already exists` });
      }
    }

    // Validate parent if being changed
    let level = existing.level;
    if (data.parentId !== undefined && data.parentId !== existing.parentId) {
      if (data.parentId) {
        // Cannot set self as parent
        if (data.parentId === existing.id) {
          return res.status(400).json({ error: 'Account cannot be its own parent' });
        }

        const parent = await prisma.chartOfAccount.findUnique({
          where: { id: data.parentId },
        });
        if (!parent) {
          return res.status(400).json({ error: 'Parent account not found' });
        }
        if (!parent.isHeader) {
          return res.status(400).json({ error: 'Parent account must be a header account' });
        }

        // Check for circular reference
        let checkParent = parent;
        while (checkParent.parentId) {
          if (checkParent.parentId === existing.id) {
            return res.status(400).json({ error: 'Circular parent reference detected' });
          }
          checkParent = await prisma.chartOfAccount.findUnique({
            where: { id: checkParent.parentId },
          });
          if (!checkParent) break;
        }

        level = parent.level + 1;
      } else {
        level = 1;
      }
    }

    const account = await prisma.chartOfAccount.update({
      where: { id: parseInt(id) },
      data: {
        ...(data.code && { code: data.code }),
        ...(data.name && { name: data.name }),
        ...(data.nameUrdu !== undefined && { nameUrdu: data.nameUrdu }),
        ...(data.accountType && { accountType: data.accountType as any }),
        ...(data.accountGroup && { accountGroup: data.accountGroup as any }),
        ...(data.parentId !== undefined && { parentId: data.parentId, level }),
        ...(data.isHeader !== undefined && { isHeader: data.isHeader }),
        ...(data.normalBalance && { normalBalance: data.normalBalance as any }),
        ...(data.currency && { currency: data.currency }),
        ...(data.isControlAccount !== undefined && { isControlAccount: data.isControlAccount }),
        ...(data.controlledEntity !== undefined && { controlledEntity: data.controlledEntity as any }),
        ...(data.isBankAccount !== undefined && { isBankAccount: data.isBankAccount }),
        ...(data.bankDetails !== undefined && { bankDetails: data.bankDetails as any }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.notes !== undefined && { notes: data.notes }),
        ...(data.tags !== undefined && { tags: data.tags }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      } as any,
    });

    logger.info(`Updated account: ${account.code}`);
    res.json({ message: 'Account updated successfully', data: account });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    logger.error('Error updating account:', error);
    res.status(500).json({ error: 'Failed to update account' });
  }
});

// DELETE /accounts/:id - Soft delete (deactivate) account
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const prisma = req.prisma!;
    const id = req.params.id as string;

    const existing = await prisma.chartOfAccount.findUnique({
      where: { id: parseInt(id) },
      include: {
        _count: { select: { children: true } },
      },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Account not found' });
    }

    // Prevent deleting system accounts
    if (existing.isSystemAccount) {
      return res.status(400).json({ error: 'Cannot delete system accounts' });
    }

    // Prevent deleting accounts with children
    if (existing._count.children > 0) {
      return res.status(400).json({
        error: 'Cannot delete account with child accounts. Delete children first.',
      });
    }

    // Prevent deleting accounts with non-zero balance
    if (Number(existing.currentBalance) !== 0) {
      return res.status(400).json({
        error: 'Cannot delete account with non-zero balance. Transfer balance first.',
      });
    }

    // Soft delete - just deactivate
    await prisma.chartOfAccount.update({
      where: { id: parseInt(id) },
      data: { isActive: false },
    });

    logger.info(`Deactivated account: ${existing.code}`);
    res.json({ message: 'Account deactivated successfully' });
  } catch (error) {
    logger.error('Error deleting account:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

export default router;
