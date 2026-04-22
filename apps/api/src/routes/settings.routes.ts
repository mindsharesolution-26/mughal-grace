import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenant';
import { requireRole, requirePermission } from '../middleware/rbac';
import { z } from 'zod';
import { TenantRequest } from '../types';
import { logger } from '../utils/logger';

export const settingsRouter: Router = Router();

settingsRouter.use(authMiddleware);
settingsRouter.use(tenantMiddleware);

// ==================== DEPARTMENTS ====================

const departmentSchema = z.object({
  // Code is auto-generated, optional for create
  code: z.string().min(2).max(50).optional(),
  name: z.string().min(2).max(255),  // REQUIRED
  description: z.string().optional(),
  parentId: z.number().optional().nullable(),
  // Personnel Information
  managerName: z.string().max(255).optional().nullable(),
  contactPerson: z.string().max(255).optional().nullable(),
  employeeCount: z.number().int().min(0).optional().nullable(),
  // Keep for future User linkage
  managerId: z.number().optional().nullable(),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().optional(),
});

// List departments
settingsRouter.get('/departments', requirePermission('settings:read'), async (req: Request, res: Response) => {
  try {
    const tenantReq = req as TenantRequest;
    const departments = await tenantReq.prisma.department.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        parent: { select: { id: true, code: true, name: true } },
        children: { select: { id: true, code: true, name: true } },
      },
    });
    res.json({ data: departments });
  } catch (error) {
    console.error('Error fetching departments:', error);
    res.status(500).json({ error: 'Failed to fetch departments' });
  }
});

// Get single department
settingsRouter.get('/departments/:id', requirePermission('settings:read'), async (req: Request, res: Response) => {
  try {
    const tenantReq = req as TenantRequest;
    const department = await tenantReq.prisma.department.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        parent: { select: { id: true, code: true, name: true } },
        children: { select: { id: true, code: true, name: true } },
      },
    });
    if (!department) {
      return res.status(404).json({ error: 'Department not found' });
    }
    res.json({ data: department });
  } catch (error) {
    console.error('Error fetching department:', error);
    res.status(500).json({ error: 'Failed to fetch department' });
  }
});

// Create department
settingsRouter.post('/departments', requirePermission('settings:write'), async (req: Request, res: Response) => {
  try {
    const tenantReq = req as TenantRequest;
    const data = departmentSchema.parse(req.body);

    // Auto-generate code
    const lastDept = await tenantReq.prisma.department.findFirst({
      orderBy: { id: 'desc' },
      select: { code: true },
    });
    let nextNum = 1;
    if (lastDept && lastDept.code.startsWith('DEPT-')) {
      const num = parseInt(lastDept.code.replace('DEPT-', ''), 10);
      if (!isNaN(num)) nextNum = num + 1;
    }
    const deptCode = `DEPT-${String(nextNum).padStart(3, '0')}`;

    // Check for duplicate code (unlikely with auto-generation but just in case)
    const existing = await tenantReq.prisma.department.findUnique({
      where: { code: deptCode },
    });
    if (existing) {
      return res.status(400).json({ error: 'Department code already exists' });
    }

    const department = await tenantReq.prisma.department.create({
      data: {
        code: deptCode,
        name: data.name,
        description: data.description,
        parentId: data.parentId,
        // Personnel Information
        managerName: data.managerName,
        contactPerson: data.contactPerson,
        employeeCount: data.employeeCount ?? 0,
        // Keep for future User linkage
        managerId: data.managerId,
        notes: data.notes,
        isActive: data.isActive ?? true,
        sortOrder: data.sortOrder ?? 0,
        createdBy: tenantReq.user?.userId,
      },
    });

    res.status(201).json({ message: 'Department created', data: department });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Error creating department:', error);
    res.status(500).json({ error: 'Failed to create department' });
  }
});

// Update department
settingsRouter.put('/departments/:id', requirePermission('settings:write'), async (req: Request, res: Response) => {
  try {
    const tenantReq = req as TenantRequest;
    const data = departmentSchema.partial().parse(req.body);
    const id = Number(req.params.id);

    // Check if exists
    const existing = await tenantReq.prisma.department.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Department not found' });
    }

    // Don't allow code changes (code is auto-generated and should not be editable)
    // Remove code from update data if present
    const { code, ...updateData } = data;

    const department = await tenantReq.prisma.department.update({
      where: { id },
      data: {
        ...updateData,
        updatedBy: tenantReq.user?.userId,
      },
    });

    res.json({ message: 'Department updated', data: department });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Error updating department:', error);
    res.status(500).json({ error: 'Failed to update department' });
  }
});

// Delete department
settingsRouter.delete('/departments/:id', requirePermission('settings:write'), async (req: Request, res: Response) => {
  try {
    const tenantReq = req as TenantRequest;
    const id = Number(req.params.id);

    // Check if has children
    const hasChildren = await tenantReq.prisma.department.count({
      where: { parentId: id },
    });
    if (hasChildren > 0) {
      return res.status(400).json({ error: 'Cannot delete department with sub-departments' });
    }

    await tenantReq.prisma.department.delete({ where: { id } });
    res.json({ message: 'Department deleted' });
  } catch (error) {
    console.error('Error deleting department:', error);
    res.status(500).json({ error: 'Failed to delete department' });
  }
});

// ==================== PRODUCT GROUPS ====================

const productGroupSchema = z.object({
  code: z.string().min(2).max(50),
  name: z.string().min(2).max(255),
  description: z.string().optional(),
  parentId: z.number().optional().nullable(),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().optional(),
});

// List product groups
settingsRouter.get('/product-groups', requirePermission('settings:read'), async (req: Request, res: Response) => {
  try {
    const tenantReq = req as TenantRequest;
    const groups = await tenantReq.prisma.productGroup.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        parent: { select: { id: true, code: true, name: true } },
        children: { select: { id: true, code: true, name: true } },
      },
    });
    res.json({ data: groups });
  } catch (error) {
    console.error('Error fetching product groups:', error);
    res.status(500).json({ error: 'Failed to fetch product groups' });
  }
});

// Get single product group
settingsRouter.get('/product-groups/:id', requirePermission('settings:read'), async (req: Request, res: Response) => {
  try {
    const tenantReq = req as TenantRequest;
    const group = await tenantReq.prisma.productGroup.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        parent: { select: { id: true, code: true, name: true } },
        children: { select: { id: true, code: true, name: true } },
      },
    });
    if (!group) {
      return res.status(404).json({ error: 'Product group not found' });
    }
    res.json({ data: group });
  } catch (error) {
    console.error('Error fetching product group:', error);
    res.status(500).json({ error: 'Failed to fetch product group' });
  }
});

// Create product group
settingsRouter.post('/product-groups', requirePermission('settings:write'), async (req: Request, res: Response) => {
  try {
    const tenantReq = req as TenantRequest;
    const data = productGroupSchema.parse(req.body);

    const existing = await tenantReq.prisma.productGroup.findUnique({
      where: { code: data.code },
    });
    if (existing) {
      return res.status(400).json({ error: 'Product group code already exists' });
    }

    const group = await tenantReq.prisma.productGroup.create({
      data: {
        code: data.code,
        name: data.name,
        description: data.description,
        parentId: data.parentId,
        notes: data.notes,
        isActive: data.isActive ?? true,
        sortOrder: data.sortOrder ?? 0,
        createdBy: tenantReq.user?.userId,
      },
    });

    res.status(201).json({ message: 'Product group created', data: group });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Error creating product group:', error);
    res.status(500).json({ error: 'Failed to create product group' });
  }
});

// Update product group
settingsRouter.put('/product-groups/:id', requirePermission('settings:write'), async (req: Request, res: Response) => {
  try {
    const tenantReq = req as TenantRequest;
    const data = productGroupSchema.partial().parse(req.body);
    const id = Number(req.params.id);

    const existing = await tenantReq.prisma.productGroup.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Product group not found' });
    }

    if (data.code && data.code !== existing.code) {
      const duplicate = await tenantReq.prisma.productGroup.findUnique({
        where: { code: data.code },
      });
      if (duplicate) {
        return res.status(400).json({ error: 'Product group code already exists' });
      }
    }

    const group = await tenantReq.prisma.productGroup.update({
      where: { id },
      data: {
        ...data,
        updatedBy: tenantReq.user?.userId,
      },
    });

    res.json({ message: 'Product group updated', data: group });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Error updating product group:', error);
    res.status(500).json({ error: 'Failed to update product group' });
  }
});

// Delete product group
settingsRouter.delete('/product-groups/:id', requirePermission('settings:write'), async (req: Request, res: Response) => {
  try {
    const tenantReq = req as TenantRequest;
    const id = Number(req.params.id);

    const hasChildren = await tenantReq.prisma.productGroup.count({
      where: { parentId: id },
    });
    if (hasChildren > 0) {
      return res.status(400).json({ error: 'Cannot delete product group with sub-groups' });
    }

    await tenantReq.prisma.productGroup.delete({ where: { id } });
    res.json({ message: 'Product group deleted' });
  } catch (error) {
    console.error('Error deleting product group:', error);
    res.status(500).json({ error: 'Failed to delete product group' });
  }
});

// ==================== BRANDS ====================

const brandSchema = z.object({
  code: z.string().min(2).max(50).optional(),  // Optional - auto-generated if not provided
  name: z.string().min(2).max(255),             // REQUIRED - only required field
  description: z.string().optional().nullable(),
  logoUrl: z.string().max(500).optional().nullable(),  // No strict URL validation
  website: z.string().max(500).optional().nullable(),  // No strict URL validation
  // Contact Information
  phone: z.string().max(50).optional().nullable(),
  email: z.string().max(255).optional().nullable(),
  fax: z.string().max(50).optional().nullable(),
  contactPerson: z.string().max(255).optional().nullable(),
  // Address Fields
  addressLine1: z.string().max(255).optional().nullable(),
  addressLine2: z.string().max(255).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  stateProvince: z.string().max(100).optional().nullable(),
  postalCode: z.string().max(20).optional().nullable(),
  country: z.string().optional().nullable(),
  // Business Registration
  taxId: z.string().max(50).optional().nullable(),
  registrationNumber: z.string().max(50).optional().nullable(),
  // Other
  notes: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().optional(),
});

// List brands
settingsRouter.get('/brands', requirePermission('settings:read'), async (req: Request, res: Response) => {
  try {
    const tenantReq = req as TenantRequest;
    const brands = await tenantReq.prisma.brand.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    res.json({ data: brands });
  } catch (error) {
    console.error('Error fetching brands:', error);
    res.status(500).json({ error: 'Failed to fetch brands' });
  }
});

// Get single brand
settingsRouter.get('/brands/:id', requirePermission('settings:read'), async (req: Request, res: Response) => {
  try {
    const tenantReq = req as TenantRequest;
    const brand = await tenantReq.prisma.brand.findUnique({
      where: { id: Number(req.params.id) },
    });
    if (!brand) {
      return res.status(404).json({ error: 'Brand not found' });
    }
    res.json({ data: brand });
  } catch (error) {
    console.error('Error fetching brand:', error);
    res.status(500).json({ error: 'Failed to fetch brand' });
  }
});

// Create brand
settingsRouter.post('/brands', requirePermission('settings:write'), async (req: Request, res: Response) => {
  try {
    const tenantReq = req as TenantRequest;
    const data = brandSchema.parse(req.body);

    // Auto-generate code if not provided
    let brandCode = data.code;
    if (!brandCode) {
      const lastBrand = await tenantReq.prisma.brand.findFirst({
        orderBy: { id: 'desc' },
        select: { code: true },
      });
      let nextNum = 1;
      if (lastBrand && lastBrand.code.startsWith('BRD-')) {
        const num = parseInt(lastBrand.code.replace('BRD-', ''), 10);
        if (!isNaN(num)) nextNum = num + 1;
      }
      brandCode = `BRD-${String(nextNum).padStart(3, '0')}`;
    }

    // Check for duplicate code
    const existing = await tenantReq.prisma.brand.findUnique({
      where: { code: brandCode },
    });
    if (existing) {
      return res.status(400).json({ error: 'Brand code already exists' });
    }

    const brand = await tenantReq.prisma.brand.create({
      data: {
        code: brandCode,
        name: data.name,
        description: data.description,
        logoUrl: data.logoUrl,
        website: data.website,
        // Contact Information
        phone: data.phone,
        email: data.email || null,
        fax: data.fax,
        contactPerson: data.contactPerson,
        // Address Fields
        addressLine1: data.addressLine1,
        addressLine2: data.addressLine2,
        city: data.city,
        stateProvince: data.stateProvince,
        postalCode: data.postalCode,
        country: data.country,
        // Business Registration
        taxId: data.taxId,
        registrationNumber: data.registrationNumber,
        // Other
        notes: data.notes,
        isActive: data.isActive ?? true,
        sortOrder: data.sortOrder ?? 0,
        createdBy: tenantReq.user?.userId,
      },
    });

    res.status(201).json({ message: 'Brand created', data: brand });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Error creating brand:', error);
    res.status(500).json({ error: 'Failed to create brand' });
  }
});

// Update brand
settingsRouter.put('/brands/:id', requirePermission('settings:write'), async (req: Request, res: Response) => {
  try {
    const tenantReq = req as TenantRequest;
    const data = brandSchema.partial().parse(req.body);
    const id = Number(req.params.id);

    const existing = await tenantReq.prisma.brand.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Brand not found' });
    }

    if (data.code && data.code !== existing.code) {
      const duplicate = await tenantReq.prisma.brand.findUnique({
        where: { code: data.code },
      });
      if (duplicate) {
        return res.status(400).json({ error: 'Brand code already exists' });
      }
    }

    // Handle empty email string
    const updateData = {
      ...data,
      email: data.email === '' ? null : data.email,
      updatedBy: tenantReq.user?.userId,
    };

    const brand = await tenantReq.prisma.brand.update({
      where: { id },
      data: updateData,
    });

    res.json({ message: 'Brand updated', data: brand });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Error updating brand:', error);
    res.status(500).json({ error: 'Failed to update brand' });
  }
});

// Delete brand
settingsRouter.delete('/brands/:id', requirePermission('settings:write'), async (req: Request, res: Response) => {
  try {
    const tenantReq = req as TenantRequest;
    await tenantReq.prisma.brand.delete({ where: { id: Number(req.params.id) } });
    res.json({ message: 'Brand deleted' });
  } catch (error) {
    console.error('Error deleting brand:', error);
    res.status(500).json({ error: 'Failed to delete brand' });
  }
});

// ==================== UNITS ====================

const unitSchema = z.object({
  code: z.string().min(1).max(20),
  name: z.string().min(2).max(100),
  symbol: z.string().min(1).max(20),
  category: z.enum(['LENGTH', 'MASS', 'VOLUME', 'AREA', 'COUNT', 'TIME', 'TEMPERATURE', 'OTHER']),
  description: z.string().optional(),
  baseUnit: z.string().optional().nullable(),
  conversionFactor: z.number().optional().nullable(),
  siUnit: z.boolean().optional(),
  isoCode: z.string().optional().nullable(),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().optional(),
});

// List units
settingsRouter.get('/units', requirePermission('settings:read'), async (req: Request, res: Response) => {
  try {
    const tenantReq = req as TenantRequest;
    const { category } = req.query;

    const units = await tenantReq.prisma.unit.findMany({
      where: category ? { category: category as any } : undefined,
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
    });
    res.json({ data: units });
  } catch (error) {
    console.error('Error fetching units:', error);
    res.status(500).json({ error: 'Failed to fetch units' });
  }
});

// Get single unit
settingsRouter.get('/units/:id', requirePermission('settings:read'), async (req: Request, res: Response) => {
  try {
    const tenantReq = req as TenantRequest;
    const unit = await tenantReq.prisma.unit.findUnique({
      where: { id: Number(req.params.id) },
    });
    if (!unit) {
      return res.status(404).json({ error: 'Unit not found' });
    }
    res.json({ data: unit });
  } catch (error) {
    console.error('Error fetching unit:', error);
    res.status(500).json({ error: 'Failed to fetch unit' });
  }
});

// Create unit
settingsRouter.post('/units', requirePermission('settings:write'), async (req: Request, res: Response) => {
  try {
    const tenantReq = req as TenantRequest;
    const data = unitSchema.parse(req.body);

    const existing = await tenantReq.prisma.unit.findUnique({
      where: { code: data.code },
    });
    if (existing) {
      return res.status(400).json({ error: 'Unit code already exists' });
    }

    const unit = await tenantReq.prisma.unit.create({
      data: {
        code: data.code,
        name: data.name,
        symbol: data.symbol,
        category: data.category,
        description: data.description,
        baseUnit: data.baseUnit,
        conversionFactor: data.conversionFactor,
        siUnit: data.siUnit ?? false,
        isoCode: data.isoCode,
        notes: data.notes,
        isActive: data.isActive ?? true,
        sortOrder: data.sortOrder ?? 0,
        createdBy: tenantReq.user?.userId,
      },
    });

    res.status(201).json({ message: 'Unit created', data: unit });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Error creating unit:', error);
    res.status(500).json({ error: 'Failed to create unit' });
  }
});

// Update unit
settingsRouter.put('/units/:id', requirePermission('settings:write'), async (req: Request, res: Response) => {
  try {
    const tenantReq = req as TenantRequest;
    const data = unitSchema.partial().parse(req.body);
    const id = Number(req.params.id);

    const existing = await tenantReq.prisma.unit.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Unit not found' });
    }

    if (data.code && data.code !== existing.code) {
      const duplicate = await tenantReq.prisma.unit.findUnique({
        where: { code: data.code },
      });
      if (duplicate) {
        return res.status(400).json({ error: 'Unit code already exists' });
      }
    }

    const unit = await tenantReq.prisma.unit.update({
      where: { id },
      data: {
        ...data,
        updatedBy: tenantReq.user?.userId,
      },
    });

    res.json({ message: 'Unit updated', data: unit });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Error updating unit:', error);
    res.status(500).json({ error: 'Failed to update unit' });
  }
});

// Delete unit
settingsRouter.delete('/units/:id', requirePermission('settings:write'), async (req: Request, res: Response) => {
  try {
    const tenantReq = req as TenantRequest;
    await tenantReq.prisma.unit.delete({ where: { id: Number(req.params.id) } });
    res.json({ message: 'Unit deleted' });
  } catch (error) {
    console.error('Error deleting unit:', error);
    res.status(500).json({ error: 'Failed to delete unit' });
  }
});

// Seed default international units
settingsRouter.post('/units/seed-defaults', requireRole('FACTORY_OWNER', 'SUPER_ADMIN', 'MANAGER'), async (req: Request, res: Response) => {
  try {
    const tenantReq = req as TenantRequest;

    const defaultUnits = [
      // Length
      { code: 'M', name: 'Meter', symbol: 'm', category: 'LENGTH' as const, siUnit: true, isoCode: 'MTR', baseUnit: 'M', conversionFactor: 1 },
      { code: 'CM', name: 'Centimeter', symbol: 'cm', category: 'LENGTH' as const, siUnit: false, baseUnit: 'M', conversionFactor: 0.01 },
      { code: 'MM', name: 'Millimeter', symbol: 'mm', category: 'LENGTH' as const, siUnit: false, baseUnit: 'M', conversionFactor: 0.001 },
      { code: 'KM', name: 'Kilometer', symbol: 'km', category: 'LENGTH' as const, siUnit: false, baseUnit: 'M', conversionFactor: 1000 },
      { code: 'IN', name: 'Inch', symbol: 'in', category: 'LENGTH' as const, siUnit: false, isoCode: 'INH', baseUnit: 'M', conversionFactor: 0.0254 },
      { code: 'FT', name: 'Foot', symbol: 'ft', category: 'LENGTH' as const, siUnit: false, isoCode: 'FOT', baseUnit: 'M', conversionFactor: 0.3048 },
      { code: 'YD', name: 'Yard', symbol: 'yd', category: 'LENGTH' as const, siUnit: false, isoCode: 'YRD', baseUnit: 'M', conversionFactor: 0.9144 },
      // Mass
      { code: 'KG', name: 'Kilogram', symbol: 'kg', category: 'MASS' as const, siUnit: true, isoCode: 'KGM', baseUnit: 'KG', conversionFactor: 1 },
      { code: 'G', name: 'Gram', symbol: 'g', category: 'MASS' as const, siUnit: false, isoCode: 'GRM', baseUnit: 'KG', conversionFactor: 0.001 },
      { code: 'MG', name: 'Milligram', symbol: 'mg', category: 'MASS' as const, siUnit: false, isoCode: 'MGM', baseUnit: 'KG', conversionFactor: 0.000001 },
      { code: 'TON', name: 'Metric Ton', symbol: 't', category: 'MASS' as const, siUnit: false, isoCode: 'TNE', baseUnit: 'KG', conversionFactor: 1000 },
      { code: 'LB', name: 'Pound', symbol: 'lb', category: 'MASS' as const, siUnit: false, isoCode: 'LBR', baseUnit: 'KG', conversionFactor: 0.453592 },
      { code: 'OZ', name: 'Ounce', symbol: 'oz', category: 'MASS' as const, siUnit: false, isoCode: 'ONZ', baseUnit: 'KG', conversionFactor: 0.0283495 },
      // Volume
      { code: 'L', name: 'Liter', symbol: 'L', category: 'VOLUME' as const, siUnit: false, isoCode: 'LTR', baseUnit: 'L', conversionFactor: 1 },
      { code: 'ML', name: 'Milliliter', symbol: 'mL', category: 'VOLUME' as const, siUnit: false, isoCode: 'MLT', baseUnit: 'L', conversionFactor: 0.001 },
      { code: 'M3', name: 'Cubic Meter', symbol: 'm³', category: 'VOLUME' as const, siUnit: true, isoCode: 'MTQ', baseUnit: 'L', conversionFactor: 1000 },
      { code: 'GAL', name: 'Gallon (US)', symbol: 'gal', category: 'VOLUME' as const, siUnit: false, isoCode: 'GLL', baseUnit: 'L', conversionFactor: 3.78541 },
      // Area
      { code: 'M2', name: 'Square Meter', symbol: 'm²', category: 'AREA' as const, siUnit: true, isoCode: 'MTK', baseUnit: 'M2', conversionFactor: 1 },
      { code: 'CM2', name: 'Square Centimeter', symbol: 'cm²', category: 'AREA' as const, siUnit: false, baseUnit: 'M2', conversionFactor: 0.0001 },
      { code: 'FT2', name: 'Square Foot', symbol: 'ft²', category: 'AREA' as const, siUnit: false, isoCode: 'FTK', baseUnit: 'M2', conversionFactor: 0.092903 },
      // Count
      { code: 'PCS', name: 'Pieces', symbol: 'pcs', category: 'COUNT' as const, siUnit: false, isoCode: 'PCE', baseUnit: 'PCS', conversionFactor: 1 },
      { code: 'DOZ', name: 'Dozen', symbol: 'doz', category: 'COUNT' as const, siUnit: false, isoCode: 'DZN', baseUnit: 'PCS', conversionFactor: 12 },
      { code: 'GRS', name: 'Gross', symbol: 'gr', category: 'COUNT' as const, siUnit: false, isoCode: 'GRO', baseUnit: 'PCS', conversionFactor: 144 },
      { code: 'SET', name: 'Set', symbol: 'set', category: 'COUNT' as const, siUnit: false, baseUnit: 'SET', conversionFactor: 1 },
      { code: 'PAIR', name: 'Pair', symbol: 'pr', category: 'COUNT' as const, siUnit: false, isoCode: 'PR', baseUnit: 'PCS', conversionFactor: 2 },
      { code: 'BOX', name: 'Box', symbol: 'box', category: 'COUNT' as const, siUnit: false, isoCode: 'BX', baseUnit: 'BOX', conversionFactor: 1 },
      { code: 'ROLL', name: 'Roll', symbol: 'roll', category: 'COUNT' as const, siUnit: false, isoCode: 'RL', baseUnit: 'ROLL', conversionFactor: 1 },
      // Time
      { code: 'SEC', name: 'Second', symbol: 's', category: 'TIME' as const, siUnit: true, isoCode: 'SEC', baseUnit: 'SEC', conversionFactor: 1 },
      { code: 'MIN', name: 'Minute', symbol: 'min', category: 'TIME' as const, siUnit: false, isoCode: 'MIN', baseUnit: 'SEC', conversionFactor: 60 },
      { code: 'HR', name: 'Hour', symbol: 'hr', category: 'TIME' as const, siUnit: false, isoCode: 'HUR', baseUnit: 'SEC', conversionFactor: 3600 },
      { code: 'DAY', name: 'Day', symbol: 'd', category: 'TIME' as const, siUnit: false, isoCode: 'DAY', baseUnit: 'SEC', conversionFactor: 86400 },
    ];

    let created = 0;
    let skipped = 0;

    for (const unit of defaultUnits) {
      const existing = await tenantReq.prisma.unit.findUnique({
        where: { code: unit.code },
      });
      if (!existing) {
        await tenantReq.prisma.unit.create({ data: unit });
        created++;
      } else {
        skipped++;
      }
    }

    res.json({
      message: `Default units seeded: ${created} created, ${skipped} skipped (already exist)`,
    });
  } catch (error) {
    console.error('Error seeding units:', error);
    res.status(500).json({ error: 'Failed to seed default units' });
  }
});

// ==================== GROUPS ====================

const groupSchema = z.object({
  name: z.string().min(2).max(255),           // REQUIRED
  departmentId: z.number(),                    // REQUIRED
  description: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().optional(),
});

// List groups
settingsRouter.get('/groups', requirePermission('settings:read'), async (req: Request, res: Response) => {
  try {
    const tenantReq = req as TenantRequest;
    const { departmentId } = req.query;

    const groups = await tenantReq.prisma.group.findMany({
      where: departmentId ? { departmentId: Number(departmentId) } : undefined,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        department: { select: { id: true, code: true, name: true } },
      },
    });
    res.json({ data: groups });
  } catch (error) {
    console.error('Error fetching groups:', error);
    res.status(500).json({ error: 'Failed to fetch groups' });
  }
});

// Get single group
settingsRouter.get('/groups/:id', requirePermission('settings:read'), async (req: Request, res: Response) => {
  try {
    const tenantReq = req as TenantRequest;
    const group = await tenantReq.prisma.group.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        department: { select: { id: true, code: true, name: true } },
      },
    });
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }
    res.json({ data: group });
  } catch (error) {
    console.error('Error fetching group:', error);
    res.status(500).json({ error: 'Failed to fetch group' });
  }
});

// Create group
settingsRouter.post('/groups', requirePermission('settings:write'), async (req: Request, res: Response) => {
  try {
    const tenantReq = req as TenantRequest;
    const data = groupSchema.parse(req.body);

    // Verify department exists and is active
    const department = await tenantReq.prisma.department.findUnique({
      where: { id: data.departmentId },
    });
    if (!department) {
      return res.status(400).json({ error: 'Department not found' });
    }
    if (!department.isActive) {
      return res.status(400).json({ error: 'Cannot assign group to inactive department' });
    }

    // Check unique name within department
    const existingName = await tenantReq.prisma.group.findFirst({
      where: {
        departmentId: data.departmentId,
        name: data.name,
      },
    });
    if (existingName) {
      return res.status(400).json({ error: 'Group name already exists in this department' });
    }

    // Auto-generate code: GRP-001, GRP-002, etc.
    const lastGroup = await tenantReq.prisma.group.findFirst({
      orderBy: { id: 'desc' },
      select: { code: true },
    });
    const nextNum = lastGroup && lastGroup.code.startsWith('GRP-')
      ? parseInt(lastGroup.code.replace('GRP-', '')) + 1
      : 1;
    const groupCode = `GRP-${String(nextNum).padStart(3, '0')}`;

    const group = await tenantReq.prisma.group.create({
      data: {
        code: groupCode,
        name: data.name,
        departmentId: data.departmentId,
        description: data.description,
        notes: data.notes,
        isActive: data.isActive ?? true,
        sortOrder: data.sortOrder ?? 0,
        createdBy: tenantReq.user?.userId,
      },
      include: {
        department: { select: { id: true, code: true, name: true } },
      },
    });

    res.status(201).json({ message: 'Group created', data: group });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Error creating group:', error);
    res.status(500).json({ error: 'Failed to create group' });
  }
});

// Update group
settingsRouter.put('/groups/:id', requirePermission('settings:write'), async (req: Request, res: Response) => {
  try {
    const tenantReq = req as TenantRequest;
    const data = groupSchema.partial().parse(req.body);
    const id = Number(req.params.id);

    const existing = await tenantReq.prisma.group.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // If changing department, verify new department exists and is active
    if (data.departmentId && data.departmentId !== existing.departmentId) {
      const department = await tenantReq.prisma.department.findUnique({
        where: { id: data.departmentId },
      });
      if (!department) {
        return res.status(400).json({ error: 'Department not found' });
      }
      if (!department.isActive) {
        return res.status(400).json({ error: 'Cannot assign group to inactive department' });
      }
    }

    // Check unique name within department (if name or departmentId is changing)
    const targetDepartmentId = data.departmentId ?? existing.departmentId;
    const targetName = data.name ?? existing.name;
    if (data.name || data.departmentId) {
      const duplicate = await tenantReq.prisma.group.findFirst({
        where: {
          departmentId: targetDepartmentId,
          name: targetName,
          id: { not: id },
        },
      });
      if (duplicate) {
        return res.status(400).json({ error: 'Group name already exists in this department' });
      }
    }

    const group = await tenantReq.prisma.group.update({
      where: { id },
      data: {
        name: data.name,
        departmentId: data.departmentId,
        description: data.description,
        notes: data.notes,
        isActive: data.isActive,
        sortOrder: data.sortOrder,
        updatedBy: tenantReq.user?.userId,
      },
      include: {
        department: { select: { id: true, code: true, name: true } },
      },
    });

    res.json({ message: 'Group updated', data: group });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Error updating group:', error);
    res.status(500).json({ error: 'Failed to update group' });
  }
});

// Delete group
settingsRouter.delete('/groups/:id', requirePermission('settings:write'), async (req: Request, res: Response) => {
  try {
    const tenantReq = req as TenantRequest;
    const id = Number(req.params.id);

    await tenantReq.prisma.group.delete({ where: { id } });
    res.json({ message: 'Group deleted' });
  } catch (error) {
    console.error('Error deleting group:', error);
    res.status(500).json({ error: 'Failed to delete group' });
  }
});

// ==================== MATERIALS (Yarn Specifications / Raw Material) ====================
// Material = Yarn Spec used in knitting factories
// Examples: "70/24/1 RW", "150/48/2 FD", "75/36/1 SD"
// Format: Count/Filaments/Ply + Type (RW=Raw White, FD=Full Dull, SD=Semi Dull, BR=Bright)

const materialSchema = z.object({
  name: z.string().min(1).max(255),             // REQUIRED - Yarn spec: "70/24/1 RW"
  grade: z.string().max(20).optional().nullable(),       // Quality grade: AAA, AA, A, B, C
  gradeNumber: z.string().max(50).optional().nullable(), // Internal grade code
  description: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().optional(),
});

// List materials (yarn specs)
settingsRouter.get('/materials', requirePermission('settings:read'), async (req: Request, res: Response) => {
  try {
    const tenantReq = req as TenantRequest;
    const { grade } = req.query;

    const materials = await tenantReq.prisma.material.findMany({
      where: grade ? { grade: grade as string } : undefined,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    res.json({ data: materials });
  } catch (error) {
    console.error('Error fetching materials:', error);
    res.status(500).json({ error: 'Failed to fetch materials' });
  }
});

// Get single material
settingsRouter.get('/materials/:id', requirePermission('settings:read'), async (req: Request, res: Response) => {
  try {
    const tenantReq = req as TenantRequest;
    const material = await tenantReq.prisma.material.findUnique({
      where: { id: Number(req.params.id) },
    });
    if (!material) {
      return res.status(404).json({ error: 'Material not found' });
    }
    res.json({ data: material });
  } catch (error) {
    console.error('Error fetching material:', error);
    res.status(500).json({ error: 'Failed to fetch material' });
  }
});

// Create material (yarn spec)
settingsRouter.post('/materials', requirePermission('settings:write'), async (req: Request, res: Response) => {
  try {
    const tenantReq = req as TenantRequest;
    const data = materialSchema.parse(req.body);

    // Auto-generate code: MAT-001, MAT-002, etc.
    const lastMaterial = await tenantReq.prisma.material.findFirst({
      orderBy: { id: 'desc' },
      select: { code: true },
    });
    let nextNum = 1;
    if (lastMaterial && lastMaterial.code.startsWith('MAT-')) {
      const num = parseInt(lastMaterial.code.replace('MAT-', ''), 10);
      if (!isNaN(num)) nextNum = num + 1;
    }
    const materialCode = `MAT-${String(nextNum).padStart(3, '0')}`;

    const material = await tenantReq.prisma.material.create({
      data: {
        code: materialCode,
        name: data.name,
        grade: data.grade,
        gradeNumber: data.gradeNumber,
        description: data.description,
        notes: data.notes,
        isActive: data.isActive ?? true,
        sortOrder: data.sortOrder ?? 0,
        createdBy: tenantReq.user?.userId,
      },
    });

    res.status(201).json({ message: 'Yarn spec created', data: material });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Error creating material:', error);
    res.status(500).json({ error: 'Failed to create yarn spec' });
  }
});

// Update material (yarn spec)
settingsRouter.put('/materials/:id', requirePermission('settings:write'), async (req: Request, res: Response) => {
  try {
    const tenantReq = req as TenantRequest;
    const data = materialSchema.partial().parse(req.body);
    const id = Number(req.params.id);

    const existing = await tenantReq.prisma.material.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Yarn spec not found' });
    }

    const material = await tenantReq.prisma.material.update({
      where: { id },
      data: {
        name: data.name,
        grade: data.grade,
        gradeNumber: data.gradeNumber,
        description: data.description,
        notes: data.notes,
        isActive: data.isActive,
        sortOrder: data.sortOrder,
        updatedBy: tenantReq.user?.userId,
      },
    });

    res.json({ message: 'Yarn spec updated', data: material });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Error updating material:', error);
    res.status(500).json({ error: 'Failed to update yarn spec' });
  }
});

// Delete material
settingsRouter.delete('/materials/:id', requirePermission('settings:write'), async (req: Request, res: Response) => {
  try {
    const tenantReq = req as TenantRequest;
    await tenantReq.prisma.material.delete({ where: { id: Number(req.params.id) } });
    res.json({ message: 'Material deleted' });
  } catch (error) {
    console.error('Error deleting material:', error);
    res.status(500).json({ error: 'Failed to delete material' });
  }
});

// Seed default yarn specifications (common yarn specs used in knitting)
settingsRouter.post('/materials/seed-defaults', requireRole('FACTORY_OWNER', 'SUPER_ADMIN', 'MANAGER'), async (req: Request, res: Response) => {
  try {
    const tenantReq = req as TenantRequest;

    // Common yarn specifications in knitting industry
    // Format: Count/Filaments/Ply + Type (RW=Raw White, FD=Full Dull, SD=Semi Dull, BR=Bright)
    const defaultYarnSpecs = [
      // Common polyester yarn specs
      { name: '70/24/1 RW', grade: 'AAA', description: 'Fine denier, 24 filament, single ply, raw white' },
      { name: '70/24/1 FD', grade: 'AAA', description: 'Fine denier, 24 filament, single ply, full dull' },
      { name: '70/24/1 SD', grade: 'AAA', description: 'Fine denier, 24 filament, single ply, semi dull' },
      { name: '75/36/1 RW', grade: 'AAA', description: '75 denier, 36 filament, single ply, raw white' },
      { name: '75/36/1 FD', grade: 'AAA', description: '75 denier, 36 filament, single ply, full dull' },
      { name: '100/36/1 RW', grade: 'AA', description: '100 denier, 36 filament, single ply, raw white' },
      { name: '100/36/1 FD', grade: 'AA', description: '100 denier, 36 filament, single ply, full dull' },
      { name: '150/48/1 RW', grade: 'AA', description: '150 denier, 48 filament, single ply, raw white' },
      { name: '150/48/1 FD', grade: 'AA', description: '150 denier, 48 filament, single ply, full dull' },
      { name: '150/48/2 RW', grade: 'A', description: '150 denier, 48 filament, 2-ply, raw white' },
      { name: '75/72/1 RW', grade: 'AAA', description: 'Micro filament, 72 filaments, raw white' },
      { name: '75/144/1 RW', grade: 'AAA', description: 'Ultra micro filament, 144 filaments' },
      // Nylon yarn specs
      { name: '70D/24F PA RW', grade: 'AA', description: 'Nylon 70 denier, 24 filament, raw white' },
      { name: '40D/34F PA SD', grade: 'AAA', description: 'Fine nylon, 34 filament, semi dull' },
      // Spandex/Lycra
      { name: '20D EL', grade: 'A', description: '20 denier elastane/spandex' },
      { name: '40D EL', grade: 'A', description: '40 denier elastane/spandex' },
    ];

    let created = 0;
    let skipped = 0;

    for (let i = 0; i < defaultYarnSpecs.length; i++) {
      const yarnData = defaultYarnSpecs[i];
      // Check if yarn spec with same name exists
      const existing = await tenantReq.prisma.material.findFirst({
        where: { name: yarnData.name },
      });
      if (!existing) {
        const code = `MAT-${String(i + 1).padStart(3, '0')}`;
        await tenantReq.prisma.material.create({
          data: {
            code,
            name: yarnData.name,
            grade: yarnData.grade,
            description: yarnData.description,
            sortOrder: i,
            createdBy: tenantReq.user?.userId,
          },
        });
        created++;
      } else {
        skipped++;
      }
    }

    res.json({
      message: `Default yarn specs seeded: ${created} created, ${skipped} skipped (already exist)`,
    });
  } catch (error) {
    console.error('Error seeding materials:', error);
    res.status(500).json({ error: 'Failed to seed default yarn specs' });
  }
});

// ==================== COLORS ====================

const colorSchema = z.object({
  code: z.string().min(2).max(50).optional(),  // Optional - auto-generated if not provided
  name: z.string().min(2).max(255),             // REQUIRED - only required field
  hexCode: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().nullable().or(z.literal('')),
  pantoneCode: z.string().optional().nullable(),
  description: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().optional(),
});

// List colors
settingsRouter.get('/colors', requirePermission('settings:read'), async (req: Request, res: Response) => {
  try {
    const tenantReq = req as TenantRequest;
    const colors = await tenantReq.prisma.color.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    res.json({ data: colors });
  } catch (error) {
    console.error('Error fetching colors:', error);
    res.status(500).json({ error: 'Failed to fetch colors' });
  }
});

// Get single color
settingsRouter.get('/colors/:id', requirePermission('settings:read'), async (req: Request, res: Response) => {
  try {
    const tenantReq = req as TenantRequest;
    const color = await tenantReq.prisma.color.findUnique({
      where: { id: Number(req.params.id) },
    });
    if (!color) {
      return res.status(404).json({ error: 'Color not found' });
    }
    res.json({ data: color });
  } catch (error) {
    console.error('Error fetching color:', error);
    res.status(500).json({ error: 'Failed to fetch color' });
  }
});

// Create color
settingsRouter.post('/colors', requirePermission('settings:write'), async (req: Request, res: Response) => {
  try {
    const tenantReq = req as TenantRequest;
    const data = colorSchema.parse(req.body);

    // Auto-generate code if not provided
    let colorCode = data.code;
    if (!colorCode) {
      const lastColor = await tenantReq.prisma.color.findFirst({
        orderBy: { id: 'desc' },
        select: { code: true },
      });
      let nextNum = 1;
      if (lastColor && lastColor.code.startsWith('COL-')) {
        const num = parseInt(lastColor.code.replace('COL-', ''), 10);
        if (!isNaN(num)) nextNum = num + 1;
      }
      colorCode = `COL-${String(nextNum).padStart(3, '0')}`;
    }

    // Check for duplicate code
    const existing = await tenantReq.prisma.color.findUnique({
      where: { code: colorCode },
    });
    if (existing) {
      return res.status(400).json({ error: 'Color code already exists' });
    }

    const color = await tenantReq.prisma.color.create({
      data: {
        code: colorCode,
        name: data.name,
        hexCode: data.hexCode || null,
        pantoneCode: data.pantoneCode || null,
        description: data.description,
        notes: data.notes,
        isActive: data.isActive ?? true,
        sortOrder: data.sortOrder ?? 0,
        createdBy: tenantReq.user?.userId,
      },
    });

    res.status(201).json({ message: 'Color created', data: color });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Error creating color:', error);
    res.status(500).json({ error: 'Failed to create color' });
  }
});

// Update color
settingsRouter.put('/colors/:id', requirePermission('settings:write'), async (req: Request, res: Response) => {
  try {
    const tenantReq = req as TenantRequest;
    const data = colorSchema.partial().parse(req.body);
    const id = Number(req.params.id);

    const existing = await tenantReq.prisma.color.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Color not found' });
    }

    if (data.code && data.code !== existing.code) {
      const duplicate = await tenantReq.prisma.color.findUnique({
        where: { code: data.code },
      });
      if (duplicate) {
        return res.status(400).json({ error: 'Color code already exists' });
      }
    }

    const color = await tenantReq.prisma.color.update({
      where: { id },
      data: {
        ...data,
        updatedBy: tenantReq.user?.userId,
      },
    });

    res.json({ message: 'Color updated', data: color });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Error updating color:', error);
    res.status(500).json({ error: 'Failed to update color' });
  }
});

// Delete color
settingsRouter.delete('/colors/:id', requirePermission('settings:write'), async (req: Request, res: Response) => {
  try {
    const tenantReq = req as TenantRequest;
    await tenantReq.prisma.color.delete({ where: { id: Number(req.params.id) } });
    res.json({ message: 'Color deleted' });
  } catch (error) {
    console.error('Error deleting color:', error);
    res.status(500).json({ error: 'Failed to delete color' });
  }
});

// ==================== GRADES ====================

const gradeSchema = z.object({
  code: z.string().min(1).max(50),
  name: z.string().min(2).max(255),
  level: z.number().min(0).optional(),
  description: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().optional(),
});

// List grades
settingsRouter.get('/grades', requirePermission('settings:read'), async (req: Request, res: Response) => {
  try {
    const tenantReq = req as TenantRequest;
    const grades = await tenantReq.prisma.grade.findMany({
      orderBy: [{ level: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
    });
    res.json({ data: grades });
  } catch (error) {
    console.error('Error fetching grades:', error);
    res.status(500).json({ error: 'Failed to fetch grades' });
  }
});

// Get single grade
settingsRouter.get('/grades/:id', requirePermission('settings:read'), async (req: Request, res: Response) => {
  try {
    const tenantReq = req as TenantRequest;
    const grade = await tenantReq.prisma.grade.findUnique({
      where: { id: Number(req.params.id) },
    });
    if (!grade) {
      return res.status(404).json({ error: 'Grade not found' });
    }
    res.json({ data: grade });
  } catch (error) {
    console.error('Error fetching grade:', error);
    res.status(500).json({ error: 'Failed to fetch grade' });
  }
});

// Create grade
settingsRouter.post('/grades', requirePermission('settings:write'), async (req: Request, res: Response) => {
  try {
    const tenantReq = req as TenantRequest;
    const data = gradeSchema.parse(req.body);

    const existing = await tenantReq.prisma.grade.findUnique({
      where: { code: data.code },
    });
    if (existing) {
      return res.status(400).json({ error: 'Grade code already exists' });
    }

    const grade = await tenantReq.prisma.grade.create({
      data: {
        code: data.code,
        name: data.name,
        level: data.level ?? 0,
        description: data.description,
        notes: data.notes,
        isActive: data.isActive ?? true,
        sortOrder: data.sortOrder ?? 0,
        createdBy: tenantReq.user?.userId,
      },
    });

    res.status(201).json({ message: 'Grade created', data: grade });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Error creating grade:', error);
    res.status(500).json({ error: 'Failed to create grade' });
  }
});

// Update grade
settingsRouter.put('/grades/:id', requirePermission('settings:write'), async (req: Request, res: Response) => {
  try {
    const tenantReq = req as TenantRequest;
    const data = gradeSchema.partial().parse(req.body);
    const id = Number(req.params.id);

    const existing = await tenantReq.prisma.grade.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Grade not found' });
    }

    if (data.code && data.code !== existing.code) {
      const duplicate = await tenantReq.prisma.grade.findUnique({
        where: { code: data.code },
      });
      if (duplicate) {
        return res.status(400).json({ error: 'Grade code already exists' });
      }
    }

    const grade = await tenantReq.prisma.grade.update({
      where: { id },
      data: {
        ...data,
        updatedBy: tenantReq.user?.userId,
      },
    });

    res.json({ message: 'Grade updated', data: grade });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Error updating grade:', error);
    res.status(500).json({ error: 'Failed to update grade' });
  }
});

// Delete grade
settingsRouter.delete('/grades/:id', requirePermission('settings:write'), async (req: Request, res: Response) => {
  try {
    const tenantReq = req as TenantRequest;
    await tenantReq.prisma.grade.delete({ where: { id: Number(req.params.id) } });
    res.json({ message: 'Grade deleted' });
  } catch (error) {
    console.error('Error deleting grade:', error);
    res.status(500).json({ error: 'Failed to delete grade' });
  }
});

// Seed default grades
settingsRouter.post('/grades/seed-defaults', requirePermission('settings:write'), async (req: Request, res: Response) => {
  try {
    const tenantReq = req as TenantRequest;

    const defaultGrades = [
      { code: 'A', name: 'A Grade', level: 1, description: 'Premium quality - no defects' },
      { code: 'B', name: 'B Grade', level: 2, description: 'Good quality - minor defects' },
      { code: 'C', name: 'C Grade', level: 3, description: 'Standard quality - visible defects' },
      { code: 'EXP', name: 'Export Quality', level: 1, description: 'Export standard - premium quality' },
      { code: 'REJ', name: 'Rejected', level: 99, description: 'Rejected - not sellable' },
    ];

    let created = 0;
    let skipped = 0;

    for (const grade of defaultGrades) {
      const existing = await tenantReq.prisma.grade.findUnique({
        where: { code: grade.code },
      });
      if (!existing) {
        await tenantReq.prisma.grade.create({
          data: {
            ...grade,
            createdBy: tenantReq.user?.userId,
          },
        });
        created++;
      } else {
        skipped++;
      }
    }

    res.json({
      message: `Default grades seeded: ${created} created, ${skipped} skipped (already exist)`,
    });
  } catch (error) {
    console.error('Error seeding grades:', error);
    res.status(500).json({ error: 'Failed to seed default grades' });
  }
});

// ==================== KNITTING MACHINE SIZES ====================

const knittingMachineSizeSchema = z.object({
  code: z.string().min(2).max(50),
  name: z.string().min(2).max(255),
  gauge: z.number().optional().nullable(),
  diameter: z.number().optional().nullable(),
  needleCount: z.number().optional().nullable(),
  machineType: z.string().optional(),
  description: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().optional(),
});

// List knitting machine sizes
settingsRouter.get('/knitting-machine-sizes', requirePermission('settings:read'), async (req: Request, res: Response) => {
  try {
    const tenantReq = req as TenantRequest;
    const sizes = await tenantReq.prisma.knittingMachineSize.findMany({
      orderBy: [{ sortOrder: 'asc' }, { gauge: 'asc' }, { name: 'asc' }],
    });
    res.json({ data: sizes });
  } catch (error) {
    console.error('Error fetching knitting machine sizes:', error);
    res.status(500).json({ error: 'Failed to fetch knitting machine sizes' });
  }
});

// Get single knitting machine size
settingsRouter.get('/knitting-machine-sizes/:id', requirePermission('settings:read'), async (req: Request, res: Response) => {
  try {
    const tenantReq = req as TenantRequest;
    const size = await tenantReq.prisma.knittingMachineSize.findUnique({
      where: { id: Number(req.params.id) },
    });
    if (!size) {
      return res.status(404).json({ error: 'Knitting machine size not found' });
    }
    res.json({ data: size });
  } catch (error) {
    console.error('Error fetching knitting machine size:', error);
    res.status(500).json({ error: 'Failed to fetch knitting machine size' });
  }
});

// Create knitting machine size
settingsRouter.post('/knitting-machine-sizes', requirePermission('settings:write'), async (req: Request, res: Response) => {
  try {
    const tenantReq = req as TenantRequest;
    const data = knittingMachineSizeSchema.parse(req.body);

    const existing = await tenantReq.prisma.knittingMachineSize.findUnique({
      where: { code: data.code },
    });
    if (existing) {
      return res.status(400).json({ error: 'Knitting machine size code already exists' });
    }

    const size = await tenantReq.prisma.knittingMachineSize.create({
      data: {
        code: data.code,
        name: data.name,
        gauge: data.gauge,
        diameter: data.diameter,
        needleCount: data.needleCount,
        machineType: data.machineType,
        description: data.description,
        notes: data.notes,
        isActive: data.isActive ?? true,
        sortOrder: data.sortOrder ?? 0,
        createdBy: tenantReq.user?.userId,
      },
    });

    res.status(201).json({ message: 'Knitting machine size created', data: size });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Error creating knitting machine size:', error);
    res.status(500).json({ error: 'Failed to create knitting machine size' });
  }
});

// Update knitting machine size
settingsRouter.put('/knitting-machine-sizes/:id', requirePermission('settings:write'), async (req: Request, res: Response) => {
  try {
    const tenantReq = req as TenantRequest;
    const data = knittingMachineSizeSchema.partial().parse(req.body);
    const id = Number(req.params.id);

    const existing = await tenantReq.prisma.knittingMachineSize.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Knitting machine size not found' });
    }

    if (data.code && data.code !== existing.code) {
      const duplicate = await tenantReq.prisma.knittingMachineSize.findUnique({
        where: { code: data.code },
      });
      if (duplicate) {
        return res.status(400).json({ error: 'Knitting machine size code already exists' });
      }
    }

    const size = await tenantReq.prisma.knittingMachineSize.update({
      where: { id },
      data: {
        ...data,
        updatedBy: tenantReq.user?.userId,
      },
    });

    res.json({ message: 'Knitting machine size updated', data: size });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Error updating knitting machine size:', error);
    res.status(500).json({ error: 'Failed to update knitting machine size' });
  }
});

// Delete knitting machine size
settingsRouter.delete('/knitting-machine-sizes/:id', requirePermission('settings:write'), async (req: Request, res: Response) => {
  try {
    const tenantReq = req as TenantRequest;
    await tenantReq.prisma.knittingMachineSize.delete({ where: { id: Number(req.params.id) } });
    res.json({ message: 'Knitting machine size deleted' });
  } catch (error) {
    console.error('Error deleting knitting machine size:', error);
    res.status(500).json({ error: 'Failed to delete knitting machine size' });
  }
});

// ==================== FABRIC SIZES ====================

const fabricSizeSchema = z.object({
  widthValue: z.number().positive(),
  unit: z.enum(['INCHES', 'MM']),
  formId: z.number().int().positive().optional().nullable(),  // Reference to FabricForm (Open/Tube)
  description: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().optional(),
});

// List fabric sizes
settingsRouter.get('/fabric-sizes', requirePermission('settings:read'), async (req: Request, res: Response) => {
  try {
    const tenantReq = req as TenantRequest;
    const sizes = await tenantReq.prisma.fabricSize.findMany({
      orderBy: [{ sortOrder: 'asc' }, { widthValue: 'asc' }],
      include: {
        form: { select: { id: true, code: true, name: true } },
      },
    });
    res.json({ data: sizes });
  } catch (error) {
    console.error('Error fetching fabric sizes:', error);
    res.status(500).json({ error: 'Failed to fetch fabric sizes' });
  }
});

// Get single fabric size
settingsRouter.get('/fabric-sizes/:id', requirePermission('settings:read'), async (req: Request, res: Response) => {
  try {
    const tenantReq = req as TenantRequest;
    const size = await tenantReq.prisma.fabricSize.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        form: { select: { id: true, code: true, name: true } },
      },
    });
    if (!size) {
      return res.status(404).json({ error: 'Fabric size not found' });
    }
    res.json({ data: size });
  } catch (error) {
    console.error('Error fetching fabric size:', error);
    res.status(500).json({ error: 'Failed to fetch fabric size' });
  }
});

// Create fabric size
settingsRouter.post('/fabric-sizes', requirePermission('settings:write'), async (req: Request, res: Response) => {
  try {
    const tenantReq = req as TenantRequest;
    const data = fabricSizeSchema.parse(req.body);

    // Auto-generate code: FS-001, FS-002, etc.
    const lastSize = await tenantReq.prisma.fabricSize.findFirst({
      orderBy: { id: 'desc' },
      select: { code: true },
    });
    let nextNum = 1;
    if (lastSize && lastSize.code.startsWith('FS-')) {
      const num = parseInt(lastSize.code.replace('FS-', ''), 10);
      if (!isNaN(num)) nextNum = num + 1;
    }
    const sizeCode = `FS-${String(nextNum).padStart(3, '0')}`;

    // Auto-generate display name: e.g., "36 Inches" or "900 mm"
    const unitLabel = data.unit === 'INCHES' ? 'Inches' : 'mm';
    const displayName = `${data.widthValue} ${unitLabel}`;

    // Check for duplicate display name
    const existing = await tenantReq.prisma.fabricSize.findFirst({
      where: { displayName },
    });
    if (existing) {
      return res.status(400).json({ error: `Fabric size "${displayName}" already exists` });
    }

    const size = await tenantReq.prisma.fabricSize.create({
      data: {
        code: sizeCode,
        widthValue: data.widthValue,
        unit: data.unit,
        displayName,
        formId: data.formId || null,
        description: data.description,
        notes: data.notes,
        isActive: data.isActive ?? true,
        sortOrder: data.sortOrder ?? 0,
        createdBy: tenantReq.user?.userId,
      },
      include: {
        form: { select: { id: true, code: true, name: true } },
      },
    });

    res.status(201).json({ message: 'Fabric size created', data: size });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Error creating fabric size:', error);
    res.status(500).json({ error: 'Failed to create fabric size' });
  }
});

// Update fabric size
settingsRouter.put('/fabric-sizes/:id', requirePermission('settings:write'), async (req: Request, res: Response) => {
  try {
    const tenantReq = req as TenantRequest;
    const data = fabricSizeSchema.partial().parse(req.body);
    const id = Number(req.params.id);

    const existing = await tenantReq.prisma.fabricSize.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Fabric size not found' });
    }

    // Recalculate display name if widthValue or unit changed
    let displayName = existing.displayName;
    const widthValue = data.widthValue ?? Number(existing.widthValue);
    const unit = data.unit ?? existing.unit;
    if (data.widthValue !== undefined || data.unit !== undefined) {
      const unitLabel = unit === 'INCHES' ? 'Inches' : 'mm';
      displayName = `${widthValue} ${unitLabel}`;

      // Check for duplicate display name (excluding current record)
      const duplicate = await tenantReq.prisma.fabricSize.findFirst({
        where: { displayName, id: { not: id } },
      });
      if (duplicate) {
        return res.status(400).json({ error: `Fabric size "${displayName}" already exists` });
      }
    }

    const size = await tenantReq.prisma.fabricSize.update({
      where: { id },
      data: {
        widthValue: data.widthValue,
        unit: data.unit,
        displayName,
        formId: data.formId !== undefined ? (data.formId || null) : undefined,
        description: data.description,
        notes: data.notes,
        isActive: data.isActive,
        sortOrder: data.sortOrder,
        updatedBy: tenantReq.user?.userId,
      },
      include: {
        form: { select: { id: true, code: true, name: true } },
      },
    });

    res.json({ message: 'Fabric size updated', data: size });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Error updating fabric size:', error);
    res.status(500).json({ error: 'Failed to update fabric size' });
  }
});

// Delete fabric size
settingsRouter.delete('/fabric-sizes/:id', requirePermission('settings:write'), async (req: Request, res: Response) => {
  try {
    const tenantReq = req as TenantRequest;
    await tenantReq.prisma.fabricSize.delete({ where: { id: Number(req.params.id) } });
    res.json({ message: 'Fabric size deleted' });
  } catch (error) {
    console.error('Error deleting fabric size:', error);
    res.status(500).json({ error: 'Failed to delete fabric size' });
  }
});

// Seed default fabric sizes
settingsRouter.post('/fabric-sizes/seed-defaults', requireRole('FACTORY_OWNER', 'SUPER_ADMIN', 'MANAGER'), async (req: Request, res: Response) => {
  try {
    const tenantReq = req as TenantRequest;

    const defaultSizes = [
      { widthValue: 30, unit: 'INCHES' as const, displayName: '30 Inches' },
      { widthValue: 36, unit: 'INCHES' as const, displayName: '36 Inches' },
      { widthValue: 40, unit: 'INCHES' as const, displayName: '40 Inches' },
      { widthValue: 44, unit: 'INCHES' as const, displayName: '44 Inches' },
      { widthValue: 48, unit: 'INCHES' as const, displayName: '48 Inches' },
      { widthValue: 54, unit: 'INCHES' as const, displayName: '54 Inches' },
      { widthValue: 60, unit: 'INCHES' as const, displayName: '60 Inches' },
      { widthValue: 72, unit: 'INCHES' as const, displayName: '72 Inches' },
    ];

    let created = 0;
    let skipped = 0;

    for (let i = 0; i < defaultSizes.length; i++) {
      const sizeData = defaultSizes[i];
      const existing = await tenantReq.prisma.fabricSize.findFirst({
        where: { displayName: sizeData.displayName },
      });
      if (!existing) {
        const code = `FS-${String(i + 1).padStart(3, '0')}`;
        await tenantReq.prisma.fabricSize.create({
          data: {
            code,
            widthValue: sizeData.widthValue,
            unit: sizeData.unit,
            displayName: sizeData.displayName,
            createdBy: tenantReq.user?.userId,
          },
        });
        created++;
      } else {
        skipped++;
      }
    }

    res.json({
      message: `Default fabric sizes seeded: ${created} created, ${skipped} skipped (already exist)`,
    });
  } catch (error) {
    console.error('Error seeding fabric sizes:', error);
    res.status(500).json({ error: 'Failed to seed default fabric sizes' });
  }
});

// ==================== FABRIC FORMS ====================

const fabricFormSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().optional(),
});

// List fabric forms
settingsRouter.get('/fabric-forms', requirePermission('settings:read'), async (req: Request, res: Response) => {
  try {
    const tenantReq = req as TenantRequest;
    const forms = await tenantReq.prisma.fabricForm.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    res.json({ data: forms });
  } catch (error) {
    console.error('Error fetching fabric forms:', error);
    res.status(500).json({ error: 'Failed to fetch fabric forms' });
  }
});

// Get single fabric form
settingsRouter.get('/fabric-forms/:id', requirePermission('settings:read'), async (req: Request, res: Response) => {
  try {
    const tenantReq = req as TenantRequest;
    const form = await tenantReq.prisma.fabricForm.findUnique({
      where: { id: Number(req.params.id) },
    });
    if (!form) {
      return res.status(404).json({ error: 'Fabric form not found' });
    }
    res.json({ data: form });
  } catch (error) {
    console.error('Error fetching fabric form:', error);
    res.status(500).json({ error: 'Failed to fetch fabric form' });
  }
});

// Create fabric form
settingsRouter.post('/fabric-forms', requirePermission('settings:write'), async (req: Request, res: Response) => {
  try {
    const tenantReq = req as TenantRequest;
    const data = fabricFormSchema.parse(req.body);

    // Check for duplicate name
    const existingName = await tenantReq.prisma.fabricForm.findFirst({
      where: { name: data.name },
    });
    if (existingName) {
      return res.status(400).json({ error: 'Fabric form name already exists' });
    }

    // Auto-generate code: FF-001, FF-002, etc.
    const lastForm = await tenantReq.prisma.fabricForm.findFirst({
      orderBy: { id: 'desc' },
      select: { code: true },
    });
    let nextNum = 1;
    if (lastForm && lastForm.code.startsWith('FF-')) {
      const num = parseInt(lastForm.code.replace('FF-', ''), 10);
      if (!isNaN(num)) nextNum = num + 1;
    }
    const formCode = `FF-${String(nextNum).padStart(3, '0')}`;

    const form = await tenantReq.prisma.fabricForm.create({
      data: {
        code: formCode,
        name: data.name,
        description: data.description,
        notes: data.notes,
        isActive: data.isActive ?? true,
        sortOrder: data.sortOrder ?? 0,
        createdBy: tenantReq.user?.userId,
      },
    });

    res.status(201).json({ message: 'Fabric form created', data: form });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Error creating fabric form:', error);
    res.status(500).json({ error: 'Failed to create fabric form' });
  }
});

// Update fabric form
settingsRouter.put('/fabric-forms/:id', requirePermission('settings:write'), async (req: Request, res: Response) => {
  try {
    const tenantReq = req as TenantRequest;
    const data = fabricFormSchema.partial().parse(req.body);
    const id = Number(req.params.id);

    const existing = await tenantReq.prisma.fabricForm.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Fabric form not found' });
    }

    // Check for duplicate name (if name is being changed)
    if (data.name && data.name !== existing.name) {
      const duplicate = await tenantReq.prisma.fabricForm.findFirst({
        where: { name: data.name, id: { not: id } },
      });
      if (duplicate) {
        return res.status(400).json({ error: 'Fabric form name already exists' });
      }
    }

    const form = await tenantReq.prisma.fabricForm.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        notes: data.notes,
        isActive: data.isActive,
        sortOrder: data.sortOrder,
        updatedBy: tenantReq.user?.userId,
      },
    });

    res.json({ message: 'Fabric form updated', data: form });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Error updating fabric form:', error);
    res.status(500).json({ error: 'Failed to update fabric form' });
  }
});

// Delete fabric form
settingsRouter.delete('/fabric-forms/:id', requirePermission('settings:write'), async (req: Request, res: Response) => {
  try {
    const tenantReq = req as TenantRequest;
    await tenantReq.prisma.fabricForm.delete({ where: { id: Number(req.params.id) } });
    res.json({ message: 'Fabric form deleted' });
  } catch (error) {
    console.error('Error deleting fabric form:', error);
    res.status(500).json({ error: 'Failed to delete fabric form' });
  }
});

// Seed default fabric forms
settingsRouter.post('/fabric-forms/seed-defaults', requireRole('FACTORY_OWNER', 'SUPER_ADMIN', 'MANAGER'), async (req: Request, res: Response) => {
  try {
    const tenantReq = req as TenantRequest;

    const defaultForms = [
      { name: 'Open', description: 'Open width fabric - flat fabric' },
      { name: 'Tube', description: 'Tubular fabric - closed/circular fabric' },
    ];

    let created = 0;
    let skipped = 0;

    for (let i = 0; i < defaultForms.length; i++) {
      const formData = defaultForms[i];
      const existing = await tenantReq.prisma.fabricForm.findFirst({
        where: { name: formData.name },
      });
      if (!existing) {
        const code = `FF-${String(i + 1).padStart(3, '0')}`;
        await tenantReq.prisma.fabricForm.create({
          data: {
            code,
            name: formData.name,
            description: formData.description,
            createdBy: tenantReq.user?.userId,
          },
        });
        created++;
      } else {
        skipped++;
      }
    }

    res.json({
      message: `Default fabric forms seeded: ${created} created, ${skipped} skipped (already exist)`,
    });
  } catch (error) {
    console.error('Error seeding fabric forms:', error);
    res.status(500).json({ error: 'Failed to seed default fabric forms' });
  }
});

// ==================== FABRIC TYPES ====================

const fabricTypeSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().optional(),
});

// List fabric types
settingsRouter.get('/fabric-types', requirePermission('settings:read'), async (req: Request, res: Response) => {
  try {
    const tenantReq = req as TenantRequest;
    const types = await tenantReq.prisma.fabricType.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    res.json({ data: types });
  } catch (error) {
    console.error('Error fetching fabric types:', error);
    res.status(500).json({ error: 'Failed to fetch fabric types' });
  }
});

// Get single fabric type
settingsRouter.get('/fabric-types/:id', requirePermission('settings:read'), async (req: Request, res: Response) => {
  try {
    const tenantReq = req as TenantRequest;
    const type = await tenantReq.prisma.fabricType.findUnique({
      where: { id: Number(req.params.id) },
    });
    if (!type) {
      return res.status(404).json({ error: 'Fabric type not found' });
    }
    res.json({ data: type });
  } catch (error) {
    console.error('Error fetching fabric type:', error);
    res.status(500).json({ error: 'Failed to fetch fabric type' });
  }
});

// Create fabric type
settingsRouter.post('/fabric-types', requirePermission('settings:write'), async (req: Request, res: Response) => {
  try {
    const tenantReq = req as TenantRequest;
    const data = fabricTypeSchema.parse(req.body);

    // Check for duplicate name
    const existingName = await tenantReq.prisma.fabricType.findFirst({
      where: { name: data.name },
    });
    if (existingName) {
      return res.status(400).json({ error: 'Fabric type name already exists' });
    }

    // Auto-generate code: FT-001, FT-002, etc.
    const lastType = await tenantReq.prisma.fabricType.findFirst({
      orderBy: { id: 'desc' },
      select: { code: true },
    });
    let nextNum = 1;
    if (lastType && lastType.code.startsWith('FT-')) {
      const num = parseInt(lastType.code.replace('FT-', ''), 10);
      if (!isNaN(num)) nextNum = num + 1;
    }
    const typeCode = `FT-${String(nextNum).padStart(3, '0')}`;

    const type = await tenantReq.prisma.fabricType.create({
      data: {
        code: typeCode,
        name: data.name,
        description: data.description,
        notes: data.notes,
        isActive: data.isActive ?? true,
        sortOrder: data.sortOrder ?? 0,
        createdBy: tenantReq.user?.userId,
      },
    });

    res.status(201).json({ message: 'Fabric type created', data: type });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Error creating fabric type:', error);
    res.status(500).json({ error: 'Failed to create fabric type' });
  }
});

// Update fabric type
settingsRouter.put('/fabric-types/:id', requirePermission('settings:write'), async (req: Request, res: Response) => {
  try {
    const tenantReq = req as TenantRequest;
    const data = fabricTypeSchema.partial().parse(req.body);
    const id = Number(req.params.id);

    const existing = await tenantReq.prisma.fabricType.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Fabric type not found' });
    }

    // Check for duplicate name (if name is being changed)
    if (data.name && data.name !== existing.name) {
      const duplicate = await tenantReq.prisma.fabricType.findFirst({
        where: { name: data.name, id: { not: id } },
      });
      if (duplicate) {
        return res.status(400).json({ error: 'Fabric type name already exists' });
      }
    }

    const type = await tenantReq.prisma.fabricType.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        notes: data.notes,
        isActive: data.isActive,
        sortOrder: data.sortOrder,
        updatedBy: tenantReq.user?.userId,
      },
    });

    res.json({ message: 'Fabric type updated', data: type });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Error updating fabric type:', error);
    res.status(500).json({ error: 'Failed to update fabric type' });
  }
});

// Delete fabric type
settingsRouter.delete('/fabric-types/:id', requirePermission('settings:write'), async (req: Request, res: Response) => {
  try {
    const tenantReq = req as TenantRequest;
    await tenantReq.prisma.fabricType.delete({ where: { id: Number(req.params.id) } });
    res.json({ message: 'Fabric type deleted' });
  } catch (error) {
    console.error('Error deleting fabric type:', error);
    res.status(500).json({ error: 'Failed to delete fabric type' });
  }
});

// Seed default fabric types
settingsRouter.post('/fabric-types/seed-defaults', requireRole('FACTORY_OWNER', 'SUPER_ADMIN', 'MANAGER'), async (req: Request, res: Response) => {
  try {
    const tenantReq = req as TenantRequest;

    const defaultTypes = [
      { name: 'Single Jersey', description: 'Basic single knit fabric' },
      { name: 'Double Jersey', description: 'Double knit fabric with two layers' },
      { name: 'Rib', description: 'Ribbed knit fabric (1x1, 2x2)' },
      { name: 'Interlock', description: 'Double-faced interlock fabric' },
      { name: 'Pique', description: 'Textured pique knit (polo shirt fabric)' },
      { name: 'Fleece', description: 'Brushed fleece fabric' },
      { name: 'Terry', description: 'Terry cloth / loop fabric' },
      { name: 'Velour', description: 'Velour/velvet knit fabric' },
      { name: 'Jacquard', description: 'Patterned jacquard knit' },
    ];

    let created = 0;
    let skipped = 0;

    for (let i = 0; i < defaultTypes.length; i++) {
      const typeData = defaultTypes[i];
      const existing = await tenantReq.prisma.fabricType.findFirst({
        where: { name: typeData.name },
      });
      if (!existing) {
        const code = `FT-${String(i + 1).padStart(3, '0')}`;
        await tenantReq.prisma.fabricType.create({
          data: {
            code,
            name: typeData.name,
            description: typeData.description,
            sortOrder: i,
            createdBy: tenantReq.user?.userId,
          },
        });
        created++;
      } else {
        skipped++;
      }
    }

    res.json({
      message: `Default fabric types seeded: ${created} created, ${skipped} skipped (already exist)`,
    });
  } catch (error) {
    console.error('Error seeding fabric types:', error);
    res.status(500).json({ error: 'Failed to seed default fabric types' });
  }
});

// ==================== FABRIC COMPOSITIONS ====================

const fabricCompositionSchema = z.object({
  name: z.string().min(2).max(255),
  description: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().optional(),
});

// List fabric compositions
settingsRouter.get('/fabric-compositions', requirePermission('settings:read'), async (req: Request, res: Response) => {
  try {
    const tenantReq = req as TenantRequest;
    const compositions = await tenantReq.prisma.fabricComposition.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    res.json({ data: compositions });
  } catch (error) {
    console.error('Error fetching fabric compositions:', error);
    res.status(500).json({ error: 'Failed to fetch fabric compositions' });
  }
});

// Get single fabric composition
settingsRouter.get('/fabric-compositions/:id', requirePermission('settings:read'), async (req: Request, res: Response) => {
  try {
    const tenantReq = req as TenantRequest;
    const composition = await tenantReq.prisma.fabricComposition.findUnique({
      where: { id: Number(req.params.id) },
    });
    if (!composition) {
      return res.status(404).json({ error: 'Fabric composition not found' });
    }
    res.json({ data: composition });
  } catch (error) {
    console.error('Error fetching fabric composition:', error);
    res.status(500).json({ error: 'Failed to fetch fabric composition' });
  }
});

// Create fabric composition
settingsRouter.post('/fabric-compositions', requirePermission('settings:write'), async (req: Request, res: Response) => {
  try {
    const tenantReq = req as TenantRequest;
    const data = fabricCompositionSchema.parse(req.body);

    // Check for duplicate name
    const existingName = await tenantReq.prisma.fabricComposition.findFirst({
      where: { name: data.name },
    });
    if (existingName) {
      return res.status(400).json({ error: 'Fabric composition name already exists' });
    }

    // Auto-generate code: FC-001, FC-002, etc.
    const lastComposition = await tenantReq.prisma.fabricComposition.findFirst({
      orderBy: { id: 'desc' },
      select: { code: true },
    });
    let nextNum = 1;
    if (lastComposition && lastComposition.code.startsWith('FC-')) {
      const num = parseInt(lastComposition.code.replace('FC-', ''), 10);
      if (!isNaN(num)) nextNum = num + 1;
    }
    const compositionCode = `FC-${String(nextNum).padStart(3, '0')}`;

    const composition = await tenantReq.prisma.fabricComposition.create({
      data: {
        code: compositionCode,
        name: data.name,
        description: data.description,
        notes: data.notes,
        isActive: data.isActive ?? true,
        sortOrder: data.sortOrder ?? 0,
        createdBy: tenantReq.user?.userId,
      },
    });

    res.status(201).json({ message: 'Fabric composition created', data: composition });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Error creating fabric composition:', error);
    res.status(500).json({ error: 'Failed to create fabric composition' });
  }
});

// Update fabric composition
settingsRouter.put('/fabric-compositions/:id', requirePermission('settings:write'), async (req: Request, res: Response) => {
  try {
    const tenantReq = req as TenantRequest;
    const data = fabricCompositionSchema.partial().parse(req.body);
    const id = Number(req.params.id);

    const existing = await tenantReq.prisma.fabricComposition.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Fabric composition not found' });
    }

    // Check for duplicate name (if name is being changed)
    if (data.name && data.name !== existing.name) {
      const duplicate = await tenantReq.prisma.fabricComposition.findFirst({
        where: { name: data.name, id: { not: id } },
      });
      if (duplicate) {
        return res.status(400).json({ error: 'Fabric composition name already exists' });
      }
    }

    const composition = await tenantReq.prisma.fabricComposition.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        notes: data.notes,
        isActive: data.isActive,
        sortOrder: data.sortOrder,
        updatedBy: tenantReq.user?.userId,
      },
    });

    res.json({ message: 'Fabric composition updated', data: composition });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Error updating fabric composition:', error);
    res.status(500).json({ error: 'Failed to update fabric composition' });
  }
});

// Delete fabric composition
settingsRouter.delete('/fabric-compositions/:id', requirePermission('settings:write'), async (req: Request, res: Response) => {
  try {
    const tenantReq = req as TenantRequest;
    await tenantReq.prisma.fabricComposition.delete({ where: { id: Number(req.params.id) } });
    res.json({ message: 'Fabric composition deleted' });
  } catch (error) {
    console.error('Error deleting fabric composition:', error);
    res.status(500).json({ error: 'Failed to delete fabric composition' });
  }
});

// Seed default fabric compositions
settingsRouter.post('/fabric-compositions/seed-defaults', requireRole('FACTORY_OWNER', 'SUPER_ADMIN', 'MANAGER'), async (req: Request, res: Response) => {
  try {
    const tenantReq = req as TenantRequest;

    const defaultCompositions = [
      { name: '100% Cotton', description: 'Pure cotton fabric' },
      { name: '100% Polyester', description: 'Pure polyester fabric' },
      { name: '50/50 Cotton/Polyester', description: 'Equal blend of cotton and polyester' },
      { name: '60/40 Cotton/Polyester', description: '60% cotton, 40% polyester blend' },
      { name: '80/20 Cotton/Polyester', description: '80% cotton, 20% polyester blend' },
      { name: '95/5 Cotton/Spandex', description: '95% cotton with 5% spandex for stretch' },
      { name: '100% Viscose', description: 'Pure viscose/rayon fabric' },
      { name: 'Cotton/Viscose Blend', description: 'Cotton and viscose blend' },
    ];

    let created = 0;
    let skipped = 0;

    for (let i = 0; i < defaultCompositions.length; i++) {
      const compData = defaultCompositions[i];
      const existing = await tenantReq.prisma.fabricComposition.findFirst({
        where: { name: compData.name },
      });
      if (!existing) {
        const code = `FC-${String(i + 1).padStart(3, '0')}`;
        await tenantReq.prisma.fabricComposition.create({
          data: {
            code,
            name: compData.name,
            description: compData.description,
            sortOrder: i,
            createdBy: tenantReq.user?.userId,
          },
        });
        created++;
      } else {
        skipped++;
      }
    }

    res.json({
      message: `Default fabric compositions seeded: ${created} created, ${skipped} skipped (already exist)`,
    });
  } catch (error) {
    console.error('Error seeding fabric compositions:', error);
    res.status(500).json({ error: 'Failed to seed default fabric compositions' });
  }
});

// ==================== GENERAL SETTINGS ====================

// Settings (Factory Owner only)
settingsRouter.get('/', requireRole('FACTORY_OWNER'), (_req, res) => {
  res.json({ message: 'Get all settings - coming soon' });
});

settingsRouter.put('/:key', requireRole('FACTORY_OWNER'), (_req, res) => {
  res.json({ message: 'Update setting - coming soon' });
});

// Users management
settingsRouter.get('/users', requireRole('FACTORY_OWNER'), (_req, res) => {
  res.json({ message: 'List users - coming soon' });
});

settingsRouter.post('/users', requireRole('FACTORY_OWNER'), (_req, res) => {
  res.json({ message: 'Create user - coming soon' });
});

settingsRouter.put('/users/:id', requireRole('FACTORY_OWNER'), (_req, res) => {
  res.json({ message: 'Update user - coming soon' });
});

settingsRouter.delete('/users/:id', requireRole('FACTORY_OWNER'), (_req, res) => {
  res.json({ message: 'Delete user - coming soon' });
});

// ==================== FACTORY DATA RESET ====================

const resetDataSchema = z.object({
  confirmation: z.string().min(1),
  keepSettings: z.boolean().optional().default(false),
});

// Reset factory data - clears all transactional data
settingsRouter.post('/reset-factory-data', requireRole('FACTORY_OWNER', 'SUPER_ADMIN'), async (req: Request, res: Response) => {
  try {
    const tenantReq = req as TenantRequest;
    const data = resetDataSchema.parse(req.body);

    // Require explicit confirmation
    if (data.confirmation !== 'RESET_FACTORY_DATA') {
      return res.status(400).json({
        error: 'Invalid confirmation. Type "RESET_FACTORY_DATA" to confirm.'
      });
    }

    const prisma = tenantReq.prisma;

    // Delete transactional data in order (respecting foreign key constraints)
    // Start with the most dependent tables and work backwards

    const deletedCounts: Record<string, number> = {};

    // 1. Delete cheques and financial transactions
    const cheques = await prisma.cheque.deleteMany({});
    deletedCounts.cheques = cheques.count;

    // 2. Delete receivables and payables
    const receivablePayments = await prisma.receivablePayment.deleteMany({});
    deletedCounts.receivablePayments = receivablePayments.count;

    const receivables = await prisma.receivable.deleteMany({});
    deletedCounts.receivables = receivables.count;

    const payablePayments = await prisma.payablePayment.deleteMany({});
    deletedCounts.payablePayments = payablePayments.count;

    const payables = await prisma.payable.deleteMany({});
    deletedCounts.payables = payables.count;

    // 3. Delete sales
    const saleItems = await prisma.saleItem.deleteMany({});
    deletedCounts.saleItems = saleItems.count;

    const sales = await prisma.sale.deleteMany({});
    deletedCounts.sales = sales.count;

    // 4. Delete dyeing records
    const dyeingEntries = await prisma.dyeingEntry.deleteMany({});
    deletedCounts.dyeingEntries = dyeingEntries.count;

    // 5. Delete roll inventory
    const rollInventory = await prisma.rollInventory.deleteMany({});
    deletedCounts.rollInventory = rollInventory.count;

    // 6. Delete production records
    const production = await prisma.production.deleteMany({});
    deletedCounts.production = production.count;

    // 7. Delete needle machine assignments and damage reports
    const needleDamages = await prisma.needleDamageReport.deleteMany({});
    deletedCounts.needleDamages = needleDamages.count;

    const machineNeedles = await prisma.machineNeedle.deleteMany({});
    deletedCounts.machineNeedles = machineNeedles.count;

    // 8. Delete needle transactions and stock
    const needleTransactions = await prisma.needleTransaction.deleteMany({});
    deletedCounts.needleTransactions = needleTransactions.count;

    const needleStock = await prisma.needleStock.deleteMany({});
    deletedCounts.needleStock = needleStock.count;

    // 9. Delete machine maintenance logs
    const machineLogs = await prisma.machineLog.deleteMany({});
    deletedCounts.machineLogs = machineLogs.count;

    // 10. Delete stock movements and inventory transactions
    const stockMovements = await prisma.stockMovement.deleteMany({});
    deletedCounts.stockMovements = stockMovements.count;

    const inventoryTransactions = await prisma.inventoryTransaction.deleteMany({});
    deletedCounts.inventoryTransactions = inventoryTransactions.count;

    // 11. Delete inventory items
    const inventoryItems = await prisma.inventoryItem.deleteMany({});
    deletedCounts.inventoryItems = inventoryItems.count;

    // 12. Delete yarn ledger and transactions
    const yarnLedgerEntries = await prisma.yarnLedgerEntry.deleteMany({});
    deletedCounts.yarnLedgerEntries = yarnLedgerEntries.count;

    const yarnInwardItems = await prisma.yarnInwardItem.deleteMany({});
    deletedCounts.yarnInwardItems = yarnInwardItems.count;

    const yarnInwards = await prisma.yarnInward.deleteMany({});
    deletedCounts.yarnInwards = yarnInwards.count;

    const yarnOutwardItems = await prisma.yarnOutwardItem.deleteMany({});
    deletedCounts.yarnOutwardItems = yarnOutwardItems.count;

    const yarnOutwards = await prisma.yarnOutward.deleteMany({});
    deletedCounts.yarnOutwards = yarnOutwards.count;

    const yarnPayOrderItems = await prisma.yarnPayOrderItem.deleteMany({});
    deletedCounts.yarnPayOrderItems = yarnPayOrderItems.count;

    const yarnPayOrders = await prisma.yarnPayOrder.deleteMany({});
    deletedCounts.yarnPayOrders = yarnPayOrders.count;

    // 13. Delete yarn stock
    const yarnStock = await prisma.yarnStock.deleteMany({});
    deletedCounts.yarnStock = yarnStock.count;

    // If keepSettings is false, also delete master data
    if (!data.keepSettings) {
      // Delete products
      const products = await prisma.product.deleteMany({});
      deletedCounts.products = products.count;

      // Delete fabrics
      const fabrics = await prisma.fabric.deleteMany({});
      deletedCounts.fabrics = fabrics.count;

      // Delete machines
      const machines = await prisma.machine.deleteMany({});
      deletedCounts.machines = machines.count;

      // Delete needle types
      const needleTypes = await prisma.needleType.deleteMany({});
      deletedCounts.needleTypes = needleTypes.count;

      // Delete yarn types
      const yarnTypes = await prisma.yarnType.deleteMany({});
      deletedCounts.yarnTypes = yarnTypes.count;

      // Delete yarn vendors
      const yarnVendors = await prisma.yarnVendor.deleteMany({});
      deletedCounts.yarnVendors = yarnVendors.count;

      // Delete customers/parties
      const parties = await prisma.party.deleteMany({});
      deletedCounts.parties = parties.count;

      // Delete warehouses
      const warehouses = await prisma.warehouse.deleteMany({});
      deletedCounts.warehouses = warehouses.count;

      // Delete inventory categories
      const invCategories = await prisma.inventoryCategory.deleteMany({});
      deletedCounts.inventoryCategories = invCategories.count;
    }

    // Calculate total deleted records
    const totalDeleted = Object.values(deletedCounts).reduce((sum, count) => sum + count, 0);

    logger.info(`Factory data reset by user ${tenantReq.user?.userId}. Deleted ${totalDeleted} records.`);

    res.json({
      message: `Factory data reset successfully. Deleted ${totalDeleted} records.`,
      details: deletedCounts,
      keepSettings: data.keepSettings,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Error resetting factory data:', error);
    res.status(500).json({ error: 'Failed to reset factory data' });
  }
});
