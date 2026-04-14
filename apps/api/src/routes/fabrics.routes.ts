import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenant';
import { requirePermission } from '../middleware/rbac';
import { z } from 'zod';
import { TenantRequest } from '../types';

export const fabricsRouter = Router();

fabricsRouter.use(authMiddleware);
fabricsRouter.use(tenantMiddleware);

// ==================== FABRIC VALIDATION SCHEMAS ====================

const fabricSchema = z.object({
  name: z.string().min(2).max(255),
  // Required relations
  departmentId: z.number().int().positive(),
  groupId: z.number().int().positive(),
  // Optional relations
  materialId: z.number().int().positive().optional().nullable(),
  brandId: z.number().int().positive().optional().nullable(),
  colorId: z.number().int().positive().optional().nullable(),
  machineId: z.number().int().positive().optional().nullable(),  // Machine number reference
  fabricTypeId: z.number().int().positive().optional().nullable(),  // FabricType master
  fabricCompositionId: z.number().int().positive().optional().nullable(),  // FabricComposition master
  // Fabric properties (legacy string fields - deprecated)
  type: z.string().max(100).optional().nullable(),
  composition: z.string().max(255).optional().nullable(),
  gsm: z.number().positive().optional().nullable(),
  width: z.number().positive().optional().nullable(),
  widthUnit: z.enum(['inch', 'cm']).optional().nullable(),
  isTube: z.boolean().optional(),
  description: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().optional(),
});

const lookupSchema = z.object({
  scan_value: z.string().min(1),
});

// ==================== HELPER FUNCTIONS ====================

/**
 * Generate auto-incrementing fabric code: FAB000001, FAB000002, etc.
 */
async function generateFabricCode(prisma: any): Promise<string> {
  const lastFabric = await prisma.fabric.findFirst({
    orderBy: { id: 'desc' },
    select: { code: true },
  });

  let nextNumber = 1;
  if (lastFabric?.code) {
    const match = lastFabric.code.match(/FAB(\d+)/);
    if (match) {
      nextNumber = parseInt(match[1], 10) + 1;
    }
  }

  return `FAB${nextNumber.toString().padStart(6, '0')}`;
}

/**
 * Generate QR payload from fabric code: FABRIC|FAB000001
 */
function generateQrPayload(fabricCode: string): string {
  return `FABRIC|${fabricCode}`;
}

/**
 * Parse QR payload and extract fabric code
 * Returns null if invalid format
 */
function parseQrPayload(scanValue: string): { fabricCode: string } | null {
  // Handle direct fabric code lookup (FAB000001)
  if (/^FAB\d{6}$/.test(scanValue)) {
    return { fabricCode: scanValue };
  }

  // Handle QR payload format (FABRIC|FAB000001)
  const match = scanValue.match(/^FABRIC\|([A-Z0-9]+)$/);
  if (match) {
    return { fabricCode: match[1] };
  }

  return null;
}

// Include relations for all fabric queries
const fabricInclude = {
  department: { select: { id: true, code: true, name: true } },
  group: { select: { id: true, code: true, name: true } },
  material: { select: { id: true, code: true, name: true } },
  brand: { select: { id: true, code: true, name: true } },
  color: { select: { id: true, code: true, name: true, hexCode: true } },
  machine: { select: { id: true, machineNumber: true, name: true, gauge: true, diameter: true } },
};

// ==================== FABRIC ROUTES ====================

// List all fabrics
fabricsRouter.get('/', requirePermission('settings:read'), async (req: Request, res: Response) => {
  try {
    const tenantReq = req as TenantRequest;
    const fabrics = await tenantReq.prisma.fabric.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: fabricInclude,
    });
    res.json({ data: fabrics });
  } catch (error) {
    console.error('Error fetching fabrics:', error);
    res.status(500).json({ error: 'Failed to fetch fabrics' });
  }
});

// Get single fabric by ID
fabricsRouter.get('/:id', requirePermission('settings:read'), async (req: Request, res: Response) => {
  try {
    const tenantReq = req as TenantRequest;
    const id = Number(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid fabric ID' });
    }

    const fabric = await tenantReq.prisma.fabric.findUnique({
      where: { id },
      include: fabricInclude,
    });

    if (!fabric) {
      return res.status(404).json({ error: 'Fabric not found' });
    }

    res.json({ data: fabric });
  } catch (error) {
    console.error('Error fetching fabric:', error);
    res.status(500).json({ error: 'Failed to fetch fabric' });
  }
});

// Create fabric (auto-generates code and QR payload)
fabricsRouter.post('/', requirePermission('settings:write'), async (req: Request, res: Response) => {
  try {
    const tenantReq = req as TenantRequest;
    const data = fabricSchema.parse(req.body);

    // Validate department exists
    const department = await tenantReq.prisma.department.findUnique({
      where: { id: data.departmentId },
    });
    if (!department) {
      return res.status(400).json({ error: 'Department not found' });
    }

    // Validate group exists and belongs to department
    const group = await tenantReq.prisma.group.findUnique({
      where: { id: data.groupId },
    });
    if (!group) {
      return res.status(400).json({ error: 'Group not found' });
    }
    if (group.departmentId !== data.departmentId) {
      return res.status(400).json({ error: 'Group does not belong to selected department' });
    }

    // Validate optional relations if provided
    if (data.materialId) {
      const material = await tenantReq.prisma.material.findUnique({
        where: { id: data.materialId },
      });
      if (!material) {
        return res.status(400).json({ error: 'Material not found' });
      }
    }

    if (data.brandId) {
      const brand = await tenantReq.prisma.brand.findUnique({
        where: { id: data.brandId },
      });
      if (!brand) {
        return res.status(400).json({ error: 'Brand not found' });
      }
    }

    if (data.colorId) {
      const color = await tenantReq.prisma.color.findUnique({
        where: { id: data.colorId },
      });
      if (!color) {
        return res.status(400).json({ error: 'Color not found' });
      }
    }

    if (data.machineId) {
      const machine = await tenantReq.prisma.machine.findUnique({
        where: { id: data.machineId },
      });
      if (!machine) {
        return res.status(400).json({ error: 'Machine not found' });
      }
    }

    // Generate unique fabric code
    const code = await generateFabricCode(tenantReq.prisma);

    // Generate QR payload after code is created
    const qrPayload = generateQrPayload(code);

    const fabric = await tenantReq.prisma.fabric.create({
      data: {
        code,
        name: data.name,
        qrPayload,
        qrGeneratedAt: new Date(),
        departmentId: data.departmentId,
        groupId: data.groupId,
        materialId: data.materialId || null,
        brandId: data.brandId || null,
        colorId: data.colorId || null,
        machineId: data.machineId || null,
        fabricTypeId: data.fabricTypeId || null,
        fabricCompositionId: data.fabricCompositionId || null,
        type: data.type || null,
        composition: data.composition || null,
        gsm: data.gsm,
        width: data.width,
        widthUnit: data.widthUnit || 'inch',
        isTube: data.isTube ?? false,
        description: data.description || null,
        notes: data.notes || null,
        isActive: data.isActive ?? true,
        sortOrder: data.sortOrder ?? 0,
        createdBy: tenantReq.user?.userId,
      },
      include: fabricInclude,
    });

    res.status(201).json({ message: 'Fabric created', data: fabric });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Error creating fabric:', error);
    res.status(500).json({ error: 'Failed to create fabric' });
  }
});

// Update fabric (code and qrPayload are read-only, cannot be changed)
fabricsRouter.put('/:id', requirePermission('settings:write'), async (req: Request, res: Response) => {
  try {
    const tenantReq = req as TenantRequest;
    const id = Number(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid fabric ID' });
    }

    const data = fabricSchema.partial().parse(req.body);

    const existing = await tenantReq.prisma.fabric.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Fabric not found' });
    }

    // Validate department if changing
    if (data.departmentId && data.departmentId !== existing.departmentId) {
      const department = await tenantReq.prisma.department.findUnique({
        where: { id: data.departmentId },
      });
      if (!department) {
        return res.status(400).json({ error: 'Department not found' });
      }
    }

    // Validate group if changing
    const effectiveDepartmentId = data.departmentId || existing.departmentId;
    if (data.groupId && data.groupId !== existing.groupId) {
      const group = await tenantReq.prisma.group.findUnique({
        where: { id: data.groupId },
      });
      if (!group) {
        return res.status(400).json({ error: 'Group not found' });
      }
      if (group.departmentId !== effectiveDepartmentId) {
        return res.status(400).json({ error: 'Group does not belong to selected department' });
      }
    }

    // Validate optional relations if provided
    if (data.materialId) {
      const material = await tenantReq.prisma.material.findUnique({
        where: { id: data.materialId },
      });
      if (!material) {
        return res.status(400).json({ error: 'Material not found' });
      }
    }

    if (data.brandId) {
      const brand = await tenantReq.prisma.brand.findUnique({
        where: { id: data.brandId },
      });
      if (!brand) {
        return res.status(400).json({ error: 'Brand not found' });
      }
    }

    if (data.colorId) {
      const color = await tenantReq.prisma.color.findUnique({
        where: { id: data.colorId },
      });
      if (!color) {
        return res.status(400).json({ error: 'Color not found' });
      }
    }

    if (data.machineId) {
      const machine = await tenantReq.prisma.machine.findUnique({
        where: { id: data.machineId },
      });
      if (!machine) {
        return res.status(400).json({ error: 'Machine not found' });
      }
    }

    // Note: code and qrPayload are NOT updated - they are immutable
    const fabric = await tenantReq.prisma.fabric.update({
      where: { id },
      data: {
        name: data.name,
        departmentId: data.departmentId,
        groupId: data.groupId,
        materialId: data.materialId,
        brandId: data.brandId,
        colorId: data.colorId,
        machineId: data.machineId,
        fabricTypeId: data.fabricTypeId,
        fabricCompositionId: data.fabricCompositionId,
        type: data.type,
        composition: data.composition,
        gsm: data.gsm,
        width: data.width,
        widthUnit: data.widthUnit,
        isTube: data.isTube,
        description: data.description,
        notes: data.notes,
        isActive: data.isActive,
        sortOrder: data.sortOrder,
        updatedBy: tenantReq.user?.userId,
      },
      include: fabricInclude,
    });

    res.json({ message: 'Fabric updated', data: fabric });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Error updating fabric:', error);
    res.status(500).json({ error: 'Failed to update fabric' });
  }
});

// Delete fabric
fabricsRouter.delete('/:id', requirePermission('settings:write'), async (req: Request, res: Response) => {
  try {
    const tenantReq = req as TenantRequest;
    const id = Number(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid fabric ID' });
    }

    const existing = await tenantReq.prisma.fabric.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Fabric not found' });
    }

    // TODO: Add check for fabric usage in production before allowing delete

    await tenantReq.prisma.fabric.delete({ where: { id } });
    res.json({ message: 'Fabric deleted' });
  } catch (error) {
    console.error('Error deleting fabric:', error);
    res.status(500).json({ error: 'Failed to delete fabric' });
  }
});

// ==================== QR SCANNER LOOKUP ====================

/**
 * POST /fabrics/lookup
 * Scanner workflow endpoint - looks up fabric by scanned QR payload or fabric code
 *
 * Request body: { "scan_value": "FABRIC|FAB000001" } or { "scan_value": "FAB000001" }
 * Response: Fabric details or error
 */
fabricsRouter.post('/lookup', requirePermission('settings:read'), async (req: Request, res: Response) => {
  try {
    const tenantReq = req as TenantRequest;
    const { scan_value } = lookupSchema.parse(req.body);

    // First try to parse as QR payload or direct fabric code
    const parsed = parseQrPayload(scan_value.trim().toUpperCase());

    let fabric = null;

    if (parsed) {
      // Look up by parsed fabric code
      fabric = await tenantReq.prisma.fabric.findUnique({
        where: { code: parsed.fabricCode },
        include: fabricInclude,
      });
    }

    // If not found, try direct qrPayload match
    if (!fabric) {
      fabric = await tenantReq.prisma.fabric.findFirst({
        where: {
          OR: [
            { qrPayload: scan_value.trim().toUpperCase() },
            { code: scan_value.trim().toUpperCase() },
          ],
        },
        include: fabricInclude,
      });
    }

    if (!fabric) {
      return res.status(404).json({
        error: 'Fabric not found',
        scan_value: scan_value,
      });
    }

    // Return fabric with status indicator for production workflow
    res.json({
      data: fabric,
      status: fabric.isActive ? 'active' : 'inactive',
      message: fabric.isActive ? 'Fabric found' : 'Fabric found but is INACTIVE',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Error looking up fabric:', error);
    res.status(500).json({ error: 'Failed to lookup fabric' });
  }
});
