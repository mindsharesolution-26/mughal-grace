import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import * as XLSX from 'xlsx';
import { authMiddleware } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenant';
import { requirePermission } from '../middleware/rbac';
import { z } from 'zod';

export const importRouter: Router = Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
      'application/vnd.ms-excel', // xls
      'text/csv',
      'application/csv',
    ];
    if (allowedTypes.includes(file.mimetype) || file.originalname.match(/\.(xlsx|xls|csv)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel (.xlsx, .xls) and CSV files are allowed'));
    }
  },
});

importRouter.use(authMiddleware);
importRouter.use(tenantMiddleware);

// Entity type configurations
const ENTITY_CONFIGS: Record<string, {
  requiredFields: string[];
  optionalFields: string[];
  fieldMappings: Record<string, string[]>; // system field -> possible Excel column names
  validator: z.ZodSchema;
}> = {
  products: {
    requiredFields: ['name', 'articleNumber'],
    optionalFields: ['description', 'fabricType', 'gsm', 'width', 'color', 'minStock', 'maxStock', 'reorderLevel', 'unit', 'notes'],
    fieldMappings: {
      name: ['name', 'product name', 'product_name', 'productname', 'item', 'item name'],
      articleNumber: ['article', 'article number', 'article_number', 'articlenumber', 'article no', 'article_no', 'sku', 'code', 'product code'],
      description: ['description', 'desc', 'details'],
      fabricType: ['fabric type', 'fabric_type', 'fabrictype', 'type', 'material'],
      gsm: ['gsm', 'weight', 'grams'],
      width: ['width', 'size'],
      color: ['color', 'colour'],
      minStock: ['min stock', 'min_stock', 'minimum stock', 'min'],
      maxStock: ['max stock', 'max_stock', 'maximum stock', 'max'],
      reorderLevel: ['reorder level', 'reorder_level', 'reorderlevel', 'reorder'],
      unit: ['unit', 'uom', 'unit of measure'],
      notes: ['notes', 'remarks', 'comments'],
    },
    validator: z.object({
      name: z.string().min(1),
      articleNumber: z.string().min(1),
      description: z.string().optional(),
      fabricType: z.string().optional(),
      gsm: z.coerce.number().optional(),
      width: z.coerce.number().optional(),
      color: z.string().optional(),
      minStock: z.coerce.number().optional(),
      maxStock: z.coerce.number().optional(),
      reorderLevel: z.coerce.number().optional(),
      unit: z.string().optional(),
      notes: z.string().optional(),
    }),
  },
  customers: {
    requiredFields: ['name'],
    optionalFields: ['code', 'businessName', 'contactPerson', 'phone', 'email', 'address', 'city', 'ntn', 'strn', 'creditLimit', 'paymentTerms', 'notes'],
    fieldMappings: {
      name: ['name', 'customer name', 'customer_name', 'customername', 'party', 'party name'],
      code: ['code', 'customer code', 'customer_code', 'id'],
      businessName: ['business name', 'business_name', 'businessname', 'company', 'company name'],
      contactPerson: ['contact', 'contact person', 'contact_person', 'contactperson'],
      phone: ['phone', 'mobile', 'contact number', 'phone number', 'tel'],
      email: ['email', 'email address', 'e-mail'],
      address: ['address', 'street', 'location'],
      city: ['city', 'town'],
      ntn: ['ntn', 'ntn number', 'tax id'],
      strn: ['strn', 'strn number', 'sales tax'],
      creditLimit: ['credit limit', 'credit_limit', 'creditlimit', 'limit'],
      paymentTerms: ['payment terms', 'payment_terms', 'terms', 'days'],
      notes: ['notes', 'remarks', 'comments'],
    },
    validator: z.object({
      name: z.string().min(1),
      code: z.string().optional(),
      businessName: z.string().optional(),
      contactPerson: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().email().optional().or(z.literal('')),
      address: z.string().optional(),
      city: z.string().optional(),
      ntn: z.string().optional(),
      strn: z.string().optional(),
      creditLimit: z.coerce.number().optional(),
      paymentTerms: z.coerce.number().optional(),
      notes: z.string().optional(),
    }),
  },
  yarn_vendors: {
    requiredFields: ['name'],
    optionalFields: ['code', 'contactPerson', 'phone', 'email', 'address', 'city', 'ntn', 'strn', 'creditLimit', 'paymentTerms', 'yarnTypes', 'notes'],
    fieldMappings: {
      name: ['name', 'vendor name', 'vendor_name', 'vendorname', 'supplier', 'party'],
      code: ['code', 'vendor code', 'vendor_code', 'id'],
      contactPerson: ['contact', 'contact person', 'contact_person'],
      phone: ['phone', 'mobile', 'contact number'],
      email: ['email', 'email address'],
      address: ['address', 'location'],
      city: ['city', 'town'],
      ntn: ['ntn', 'ntn number'],
      strn: ['strn', 'strn number'],
      creditLimit: ['credit limit', 'credit_limit', 'limit'],
      paymentTerms: ['payment terms', 'payment_terms', 'terms'],
      yarnTypes: ['yarn types', 'yarn_types', 'types', 'products'],
      notes: ['notes', 'remarks'],
    },
    validator: z.object({
      name: z.string().min(1),
      code: z.string().optional(),
      contactPerson: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().email().optional().or(z.literal('')),
      address: z.string().optional(),
      city: z.string().optional(),
      ntn: z.string().optional(),
      strn: z.string().optional(),
      creditLimit: z.coerce.number().optional(),
      paymentTerms: z.coerce.number().optional(),
      yarnTypes: z.string().optional(),
      notes: z.string().optional(),
    }),
  },
  dyeing_vendors: {
    requiredFields: ['name'],
    optionalFields: ['code', 'contactPerson', 'phone', 'email', 'address', 'city', 'ntn', 'strn', 'creditLimit', 'paymentTerms', 'services', 'notes'],
    fieldMappings: {
      name: ['name', 'vendor name', 'dyeing name', 'party'],
      code: ['code', 'vendor code', 'id'],
      contactPerson: ['contact', 'contact person'],
      phone: ['phone', 'mobile'],
      email: ['email'],
      address: ['address'],
      city: ['city'],
      ntn: ['ntn'],
      strn: ['strn'],
      creditLimit: ['credit limit', 'limit'],
      paymentTerms: ['payment terms', 'terms'],
      services: ['services', 'dyeing types', 'processes'],
      notes: ['notes', 'remarks'],
    },
    validator: z.object({
      name: z.string().min(1),
      code: z.string().optional(),
      contactPerson: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().email().optional().or(z.literal('')),
      address: z.string().optional(),
      city: z.string().optional(),
      ntn: z.string().optional(),
      strn: z.string().optional(),
      creditLimit: z.coerce.number().optional(),
      paymentTerms: z.coerce.number().optional(),
      services: z.string().optional(),
      notes: z.string().optional(),
    }),
  },
  general_suppliers: {
    requiredFields: ['name'],
    optionalFields: ['code', 'supplierType', 'contactPerson', 'phone', 'email', 'address', 'city', 'ntn', 'strn', 'creditLimit', 'paymentTerms', 'notes'],
    fieldMappings: {
      name: ['name', 'supplier name', 'vendor name', 'party'],
      code: ['code', 'supplier code', 'id'],
      supplierType: ['type', 'supplier type', 'category'],
      contactPerson: ['contact', 'contact person'],
      phone: ['phone', 'mobile'],
      email: ['email'],
      address: ['address'],
      city: ['city'],
      ntn: ['ntn'],
      strn: ['strn'],
      creditLimit: ['credit limit', 'limit'],
      paymentTerms: ['payment terms', 'terms'],
      notes: ['notes', 'remarks'],
    },
    validator: z.object({
      name: z.string().min(1),
      code: z.string().optional(),
      supplierType: z.string().optional(),
      contactPerson: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().email().optional().or(z.literal('')),
      address: z.string().optional(),
      city: z.string().optional(),
      ntn: z.string().optional(),
      strn: z.string().optional(),
      creditLimit: z.coerce.number().optional(),
      paymentTerms: z.coerce.number().optional(),
      notes: z.string().optional(),
    }),
  },
  opening_balances: {
    requiredFields: ['entityType', 'entityName', 'balance'],
    optionalFields: ['entityCode', 'balanceDate', 'notes'],
    fieldMappings: {
      entityType: ['type', 'entity type', 'party type', 'account type'],
      entityName: ['name', 'party name', 'account name', 'entity name'],
      entityCode: ['code', 'party code', 'account code'],
      balance: ['balance', 'opening balance', 'amount', 'opening'],
      balanceDate: ['date', 'balance date', 'as of'],
      notes: ['notes', 'remarks'],
    },
    validator: z.object({
      entityType: z.enum(['customer', 'yarn_vendor', 'dyeing_vendor', 'general_supplier']),
      entityName: z.string().min(1),
      entityCode: z.string().optional(),
      balance: z.coerce.number(),
      balanceDate: z.string().optional(),
      notes: z.string().optional(),
    }),
  },
};

// Helper to parse Excel/CSV file
function parseFile(buffer: Buffer, filename: string): { headers: string[]; rows: Record<string, any>[] } {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  // Convert to JSON with headers
  const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  if (jsonData.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = Object.keys(jsonData[0] as object);
  return { headers, rows: jsonData as Record<string, any>[] };
}

// Helper to auto-map columns
function autoMapColumns(
  headers: string[],
  fieldMappings: Record<string, string[]>
): Record<string, string> {
  const mapping: Record<string, string> = {};

  for (const [systemField, possibleNames] of Object.entries(fieldMappings)) {
    for (const header of headers) {
      const normalizedHeader = header.toLowerCase().trim();
      if (possibleNames.some(name => normalizedHeader === name.toLowerCase())) {
        mapping[systemField] = header;
        break;
      }
    }
  }

  return mapping;
}

// Helper to transform row data using mapping
function transformRow(
  row: Record<string, any>,
  mapping: Record<string, string>
): Record<string, any> {
  const transformed: Record<string, any> = {};

  for (const [systemField, excelColumn] of Object.entries(mapping)) {
    if (excelColumn && row[excelColumn] !== undefined) {
      let value = row[excelColumn];
      // Clean up string values
      if (typeof value === 'string') {
        value = value.trim();
        if (value === '') value = undefined;
      }
      transformed[systemField] = value;
    }
  }

  return transformed;
}

// GET /import/templates/:entityType - Download template
importRouter.get('/templates/:entityType', requirePermission('settings:read'), (req: Request, res: Response) => {
  const entityType = String(req.params.entityType);
  const config = ENTITY_CONFIGS[entityType];

  if (!config) {
    return res.status(400).json({ error: `Unknown entity type: ${entityType}` });
  }

  // Create template with all fields as headers
  const headers = [...config.requiredFields, ...config.optionalFields];
  const ws = XLSX.utils.aoa_to_sheet([
    headers,
    // Add example row
    headers.map(h => config.requiredFields.includes(h) ? `Example ${h} (Required)` : `Example ${h}`),
  ]);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Import Template');

  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=${entityType}_import_template.xlsx`);
  res.send(buffer);
});

// POST /import/preview - Upload file and get preview
importRouter.post('/preview', requirePermission('settings:write'), upload.single('file'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { entityType } = req.body;
    if (!entityType || !ENTITY_CONFIGS[entityType]) {
      return res.status(400).json({ error: `Invalid entity type: ${entityType}` });
    }

    const config = ENTITY_CONFIGS[entityType];
    const { headers, rows } = parseFile(req.file.buffer, req.file.originalname);

    if (rows.length === 0) {
      return res.status(400).json({ error: 'File is empty or has no data rows' });
    }

    // Auto-map columns
    const suggestedMapping = autoMapColumns(headers, config.fieldMappings);

    // Validate preview rows (first 5)
    const previewRows = rows.slice(0, 5).map((row, index) => {
      const transformed = transformRow(row, suggestedMapping);
      const validation = config.validator.safeParse(transformed);

      return {
        rowNumber: index + 2, // Excel row number (1-indexed + header)
        original: row,
        transformed,
        isValid: validation.success,
        errors: validation.success ? [] : validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
      };
    });

    res.json({
      data: {
        fileName: req.file.originalname,
        entityType,
        totalRows: rows.length,
        headers,
        requiredFields: config.requiredFields,
        optionalFields: config.optionalFields,
        suggestedMapping,
        previewRows,
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /import/validate - Validate all rows with custom mapping
importRouter.post('/validate', requirePermission('settings:write'), upload.single('file'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { entityType, mapping } = req.body;
    if (!entityType || !ENTITY_CONFIGS[entityType]) {
      return res.status(400).json({ error: `Invalid entity type: ${entityType}` });
    }

    const columnMapping = typeof mapping === 'string' ? JSON.parse(mapping) : mapping;
    const config = ENTITY_CONFIGS[entityType];
    const { rows } = parseFile(req.file.buffer, req.file.originalname);

    let validCount = 0;
    let invalidCount = 0;
    const errors: { row: number; errors: string[] }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const transformed = transformRow(rows[i], columnMapping);
      const validation = config.validator.safeParse(transformed);

      if (validation.success) {
        validCount++;
      } else {
        invalidCount++;
        if (errors.length < 50) { // Limit error reporting
          errors.push({
            row: i + 2,
            errors: validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
          });
        }
      }
    }

    res.json({
      data: {
        totalRows: rows.length,
        validCount,
        invalidCount,
        errors,
        canProceed: invalidCount === 0,
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /import/execute - Execute the import
importRouter.post('/execute', requirePermission('settings:write'), upload.single('file'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { entityType, mapping, skipInvalid } = req.body;
    if (!entityType || !ENTITY_CONFIGS[entityType]) {
      return res.status(400).json({ error: `Invalid entity type: ${entityType}` });
    }

    const columnMapping = typeof mapping === 'string' ? JSON.parse(mapping) : mapping;
    const config = ENTITY_CONFIGS[entityType];
    const { rows } = parseFile(req.file.buffer, req.file.originalname);

    let imported = 0;
    let skipped = 0;
    let failed = 0;
    const failedRows: { row: number; error: string }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const transformed = transformRow(rows[i], columnMapping);
      const validation = config.validator.safeParse(transformed);

      if (!validation.success) {
        if (skipInvalid === 'true' || skipInvalid === true) {
          skipped++;
          continue;
        }
        failed++;
        failedRows.push({
          row: i + 2,
          error: validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; '),
        });
        continue;
      }

      try {
        // Import based on entity type
        switch (entityType) {
          case 'products':
            await importProduct(req.prisma!, validation.data, req.tenantId!);
            break;
          case 'customers':
            await importCustomer(req.prisma!, validation.data, req.tenantId!);
            break;
          case 'yarn_vendors':
            await importYarnVendor(req.prisma!, validation.data, req.tenantId!);
            break;
          case 'dyeing_vendors':
            await importDyeingVendor(req.prisma!, validation.data, req.tenantId!);
            break;
          case 'general_suppliers':
            await importGeneralSupplier(req.prisma!, validation.data, req.tenantId!);
            break;
          case 'opening_balances':
            await importOpeningBalance(req.prisma!, validation.data, req.tenantId!);
            break;
        }
        imported++;
      } catch (error: any) {
        failed++;
        failedRows.push({
          row: i + 2,
          error: error.message || 'Unknown error',
        });
      }
    }

    res.json({
      message: `Import completed`,
      data: {
        totalRows: rows.length,
        imported,
        skipped,
        failed,
        failedRows: failedRows.slice(0, 20), // Limit response size
      },
    });
  } catch (error) {
    next(error);
  }
});

// Import helper functions
async function importProduct(prisma: any, data: any, tenantId: number) {
  // Check if product already exists
  const existing = await prisma.product.findFirst({
    where: { tenantId, articleNumber: data.articleNumber },
  });

  if (existing) {
    // Update existing
    await prisma.product.update({
      where: { id: existing.id },
      data: {
        name: data.name,
        description: data.description,
        fabricType: data.fabricType,
        gsm: data.gsm,
        width: data.width,
        color: data.color,
        minStock: data.minStock,
        maxStock: data.maxStock,
        reorderLevel: data.reorderLevel,
        unit: data.unit || 'KG',
        notes: data.notes,
      },
    });
  } else {
    // Create new
    await prisma.product.create({
      data: {
        tenantId,
        articleNumber: data.articleNumber,
        name: data.name,
        description: data.description,
        fabricType: data.fabricType,
        gsm: data.gsm,
        width: data.width,
        color: data.color,
        minStock: data.minStock || 0,
        maxStock: data.maxStock,
        reorderLevel: data.reorderLevel || 0,
        unit: data.unit || 'KG',
        notes: data.notes,
        isActive: true,
      },
    });
  }
}

async function importCustomer(prisma: any, data: any, tenantId: number) {
  const code = data.code || `CUST-${Date.now().toString(36).toUpperCase()}`;

  const existing = await prisma.customer.findFirst({
    where: { tenantId, OR: [{ code }, { name: data.name }] },
  });

  if (existing) {
    await prisma.customer.update({
      where: { id: existing.id },
      data: {
        name: data.name,
        businessName: data.businessName,
        contactPerson: data.contactPerson,
        phone: data.phone,
        email: data.email || null,
        address: data.address,
        city: data.city,
        ntn: data.ntn,
        strn: data.strn,
        creditLimit: data.creditLimit || 0,
        paymentTerms: data.paymentTerms || 30,
        notes: data.notes,
      },
    });
  } else {
    await prisma.customer.create({
      data: {
        tenantId,
        code,
        name: data.name,
        businessName: data.businessName,
        contactPerson: data.contactPerson,
        phone: data.phone,
        email: data.email || null,
        address: data.address,
        city: data.city,
        ntn: data.ntn,
        strn: data.strn,
        creditLimit: data.creditLimit || 0,
        paymentTerms: data.paymentTerms || 30,
        notes: data.notes,
        isActive: true,
      },
    });
  }
}

async function importYarnVendor(prisma: any, data: any, tenantId: number) {
  const code = data.code || `YV-${Date.now().toString(36).toUpperCase()}`;

  const existing = await prisma.yarnVendor.findFirst({
    where: { tenantId, OR: [{ code }, { name: data.name }] },
  });

  if (existing) {
    await prisma.yarnVendor.update({
      where: { id: existing.id },
      data: {
        name: data.name,
        contactPerson: data.contactPerson,
        phone: data.phone,
        email: data.email || null,
        address: data.address,
        city: data.city,
        ntn: data.ntn,
        strn: data.strn,
        creditLimit: data.creditLimit || 0,
        paymentTerms: data.paymentTerms || 30,
        notes: data.notes,
      },
    });
  } else {
    await prisma.yarnVendor.create({
      data: {
        tenantId,
        code,
        name: data.name,
        contactPerson: data.contactPerson,
        phone: data.phone,
        email: data.email || null,
        address: data.address,
        city: data.city,
        ntn: data.ntn,
        strn: data.strn,
        creditLimit: data.creditLimit || 0,
        paymentTerms: data.paymentTerms || 30,
        notes: data.notes,
        isActive: true,
      },
    });
  }
}

async function importDyeingVendor(prisma: any, data: any, tenantId: number) {
  const code = data.code || `DV-${Date.now().toString(36).toUpperCase()}`;

  const existing = await prisma.dyeingVendor.findFirst({
    where: { tenantId, OR: [{ code }, { name: data.name }] },
  });

  if (existing) {
    await prisma.dyeingVendor.update({
      where: { id: existing.id },
      data: {
        name: data.name,
        contactPerson: data.contactPerson,
        phone: data.phone,
        email: data.email || null,
        address: data.address,
        city: data.city,
        ntn: data.ntn,
        strn: data.strn,
        creditLimit: data.creditLimit || 0,
        paymentTerms: data.paymentTerms || 30,
        notes: data.notes,
      },
    });
  } else {
    await prisma.dyeingVendor.create({
      data: {
        tenantId,
        code,
        name: data.name,
        contactPerson: data.contactPerson,
        phone: data.phone,
        email: data.email || null,
        address: data.address,
        city: data.city,
        ntn: data.ntn,
        strn: data.strn,
        creditLimit: data.creditLimit || 0,
        paymentTerms: data.paymentTerms || 30,
        notes: data.notes,
        isActive: true,
      },
    });
  }
}

async function importGeneralSupplier(prisma: any, data: any, tenantId: number) {
  const code = data.code || `GS-${Date.now().toString(36).toUpperCase()}`;

  const existing = await prisma.generalSupplier.findFirst({
    where: { tenantId, OR: [{ code }, { name: data.name }] },
  });

  if (existing) {
    await prisma.generalSupplier.update({
      where: { id: existing.id },
      data: {
        name: data.name,
        supplierType: data.supplierType,
        contactPerson: data.contactPerson,
        phone: data.phone,
        email: data.email || null,
        address: data.address,
        city: data.city,
        ntn: data.ntn,
        strn: data.strn,
        creditLimit: data.creditLimit || 0,
        paymentTerms: data.paymentTerms || 30,
        notes: data.notes,
      },
    });
  } else {
    await prisma.generalSupplier.create({
      data: {
        tenantId,
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
        creditLimit: data.creditLimit || 0,
        paymentTerms: data.paymentTerms || 30,
        notes: data.notes,
        isActive: true,
      },
    });
  }
}

async function importOpeningBalance(prisma: any, data: any, tenantId: number) {
  // Find the entity
  let entityId: number | null = null;
  let entityType = data.entityType;

  switch (data.entityType) {
    case 'customer':
      const customer = await prisma.customer.findFirst({
        where: { tenantId, OR: [{ code: data.entityCode }, { name: data.entityName }] },
      });
      if (!customer) throw new Error(`Customer not found: ${data.entityName}`);
      entityId = customer.id;
      break;
    case 'yarn_vendor':
      const yarnVendor = await prisma.yarnVendor.findFirst({
        where: { tenantId, OR: [{ code: data.entityCode }, { name: data.entityName }] },
      });
      if (!yarnVendor) throw new Error(`Yarn vendor not found: ${data.entityName}`);
      entityId = yarnVendor.id;
      break;
    case 'dyeing_vendor':
      const dyeingVendor = await prisma.dyeingVendor.findFirst({
        where: { tenantId, OR: [{ code: data.entityCode }, { name: data.entityName }] },
      });
      if (!dyeingVendor) throw new Error(`Dyeing vendor not found: ${data.entityName}`);
      entityId = dyeingVendor.id;
      break;
    case 'general_supplier':
      const supplier = await prisma.generalSupplier.findFirst({
        where: { tenantId, OR: [{ code: data.entityCode }, { name: data.entityName }] },
      });
      if (!supplier) throw new Error(`Supplier not found: ${data.entityName}`);
      entityId = supplier.id;
      break;
  }

  if (!entityId) throw new Error('Entity not found');

  // Create or update outstanding balance
  const balance = Number(data.balance);
  const balanceDate = data.balanceDate ? new Date(data.balanceDate) : new Date();

  await prisma.outstandingBalance.upsert({
    where: {
      entityType_entityId: { entityType, entityId },
    },
    update: {
      openingBalance: balance,
      currentBalance: balance,
      totalDebit: balance > 0 ? balance : 0,
      totalCredit: balance < 0 ? Math.abs(balance) : 0,
    },
    create: {
      tenantId,
      entityType,
      entityId,
      openingBalance: balance,
      currentBalance: balance,
      totalDebit: balance > 0 ? balance : 0,
      totalCredit: balance < 0 ? Math.abs(balance) : 0,
    },
  });
}

// GET /import/entity-types - Get available entity types
importRouter.get('/entity-types', requirePermission('settings:read'), (_req: Request, res: Response) => {
  const entityTypes = Object.keys(ENTITY_CONFIGS).map(key => ({
    value: key,
    label: key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
    requiredFields: ENTITY_CONFIGS[key].requiredFields,
    optionalFields: ENTITY_CONFIGS[key].optionalFields,
  }));

  res.json({ data: entityTypes });
});
