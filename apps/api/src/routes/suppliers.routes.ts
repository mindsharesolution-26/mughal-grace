import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { logger } from '../utils/logger';

const router: Router = Router();

// ============ GENERAL SUPPLIERS ============

// Validation schemas
const createSupplierSchema = z.object({
  code: z.string().min(1).optional(), // Auto-generate if not provided
  name: z.string().min(2),
  supplierType: z.string().optional(),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  city: z.string().optional(),
  ntn: z.string().optional(),
  strn: z.string().optional(),
  creditLimit: z.coerce.number().min(0).optional(),
  paymentTerms: z.coerce.number().min(1).default(30),
  rating: z.coerce.number().min(1).max(5).optional(),
  notes: z.string().optional(),
  isActive: z.boolean().default(true),
});

const updateSupplierSchema = createSupplierSchema.partial();

// Generate supplier code
async function generateSupplierCode(prisma: any): Promise<string> {
  const lastSupplier = await prisma.generalSupplier.findFirst({
    orderBy: { id: 'desc' },
    select: { code: true },
  });

  let nextNum = 1;
  if (lastSupplier?.code) {
    const match = lastSupplier.code.match(/GS-(\d+)/);
    if (match) {
      nextNum = parseInt(match[1]) + 1;
    }
  }

  return `GS-${nextNum.toString().padStart(3, '0')}`;
}

// GET /suppliers - List all general suppliers
router.get('/', async (req: Request, res: Response) => {
  try {
    const prisma = req.prisma!;
    const { search, isActive, supplierType } = req.query;

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { code: { contains: search as string, mode: 'insensitive' } },
        { contactPerson: { contains: search as string, mode: 'insensitive' } },
        { city: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    if (supplierType) {
      where.supplierType = supplierType as string;
    }

    const suppliers = await prisma.generalSupplier.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    res.json({ data: suppliers });
  } catch (error) {
    logger.error('Error fetching general suppliers:', error);
    res.status(500).json({ error: 'Failed to fetch suppliers' });
  }
});

// GET /suppliers/lookup - Lightweight list for dropdowns
router.get('/lookup', async (req: Request, res: Response) => {
  try {
    const prisma = req.prisma!;

    const suppliers = await prisma.generalSupplier.findMany({
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
    logger.error('Error fetching supplier lookup:', error);
    res.status(500).json({ error: 'Failed to fetch suppliers' });
  }
});

// GET /suppliers/:id - Get single supplier
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const prisma = req.prisma!;
    const id = req.params.id as string;

    const supplier = await prisma.generalSupplier.findUnique({
      where: { id: parseInt(id) },
    });

    if (!supplier) {
      return res.status(404).json({ error: 'Supplier not found' });
    }

    res.json({ data: supplier });
  } catch (error) {
    logger.error('Error fetching supplier:', error);
    res.status(500).json({ error: 'Failed to fetch supplier' });
  }
});

// POST /suppliers - Create new supplier
router.post('/', async (req: Request, res: Response) => {
  try {
    const prisma = req.prisma!;
    const data = createSupplierSchema.parse(req.body);

    // Generate code if not provided
    const code = data.code || await generateSupplierCode(prisma);

    // Check for duplicate code
    const existing = await prisma.generalSupplier.findUnique({
      where: { code },
    });

    if (existing) {
      return res.status(400).json({ error: `Supplier code "${code}" already exists` });
    }

    const supplier = await prisma.generalSupplier.create({
      data: {
        code,
        name: data.name,
        supplierType: data.supplierType,
        contactPerson: data.contactPerson,
        phone: data.phone,
        email: data.email || null,
        address: data.address,
        city: data.city,
        ntn: data.ntn,
        strn: data.strn,
        creditLimit: data.creditLimit,
        paymentTerms: data.paymentTerms,
        rating: data.rating,
        notes: data.notes,
        isActive: data.isActive,
      },
    });

    logger.info(`Created general supplier: ${supplier.code} - ${supplier.name}`);
    res.status(201).json({ message: 'Supplier created successfully', data: supplier });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    logger.error('Error creating supplier:', error);
    res.status(500).json({ error: 'Failed to create supplier' });
  }
});

// PUT /suppliers/:id - Update supplier
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const prisma = req.prisma!;
    const id = req.params.id as string;
    const data = updateSupplierSchema.parse(req.body);

    const existing = await prisma.generalSupplier.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Supplier not found' });
    }

    // Check for duplicate code if code is being changed
    if (data.code && data.code !== existing.code) {
      const codeExists = await prisma.generalSupplier.findUnique({
        where: { code: data.code },
      });
      if (codeExists) {
        return res.status(400).json({ error: `Supplier code "${data.code}" already exists` });
      }
    }

    const supplier = await prisma.generalSupplier.update({
      where: { id: parseInt(id) },
      data: {
        ...(data.code && { code: data.code }),
        ...(data.name && { name: data.name }),
        ...(data.supplierType !== undefined && { supplierType: data.supplierType }),
        ...(data.contactPerson !== undefined && { contactPerson: data.contactPerson }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.email !== undefined && { email: data.email || null }),
        ...(data.address !== undefined && { address: data.address }),
        ...(data.city !== undefined && { city: data.city }),
        ...(data.ntn !== undefined && { ntn: data.ntn }),
        ...(data.strn !== undefined && { strn: data.strn }),
        ...(data.creditLimit !== undefined && { creditLimit: data.creditLimit }),
        ...(data.paymentTerms !== undefined && { paymentTerms: data.paymentTerms }),
        ...(data.rating !== undefined && { rating: data.rating }),
        ...(data.notes !== undefined && { notes: data.notes }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });

    logger.info(`Updated general supplier: ${supplier.code}`);
    res.json({ message: 'Supplier updated successfully', data: supplier });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    logger.error('Error updating supplier:', error);
    res.status(500).json({ error: 'Failed to update supplier' });
  }
});

// DELETE /suppliers/:id - Soft delete (deactivate) supplier
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const prisma = req.prisma!;
    const id = req.params.id as string;

    const existing = await prisma.generalSupplier.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Supplier not found' });
    }

    // Soft delete - just deactivate
    await prisma.generalSupplier.update({
      where: { id: parseInt(id) },
      data: { isActive: false },
    });

    logger.info(`Deactivated general supplier: ${existing.code}`);
    res.json({ message: 'Supplier deactivated successfully' });
  } catch (error) {
    logger.error('Error deleting supplier:', error);
    res.status(500).json({ error: 'Failed to delete supplier' });
  }
});

export default router;
