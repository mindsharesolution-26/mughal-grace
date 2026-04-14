import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { LRUCache } from 'lru-cache';
import { AppError } from './error-handler';
import { logger } from '../utils/logger';
import { config } from '../config';

// LRU Cache for tenant Prisma clients
const clientCache = new LRUCache<string, { client: PrismaClient; lastAccessed: number }>({
  max: 50, // Max 50 tenant connections
  ttl: 30 * 60 * 1000, // 30 minutes
  dispose: (value) => {
    value.client.$disconnect();
    logger.debug(`Disconnected tenant client from cache`);
  },
});

// Admin Prisma client (public schema)
let adminClient: PrismaClient | null = null;

export const getAdminClient = (): PrismaClient => {
  if (!adminClient) {
    adminClient = new PrismaClient({
      datasources: {
        db: { url: config.database.url },
      },
    });
  }
  return adminClient;
};

export const getTenantClient = async (
  tenantId: number,
  schemaName: string
): Promise<PrismaClient> => {
  const cacheKey = `tenant_${tenantId}`;
  const cached = clientCache.get(cacheKey);

  if (cached) {
    cached.lastAccessed = Date.now();
    return cached.client;
  }

  // Create new client for tenant schema
  // Handle URLs that already have query parameters (e.g., Supabase with ?pgbouncer=true)
  const baseUrl = config.database.url;
  const separator = baseUrl.includes('?') ? '&' : '?';
  const tenantUrl = `${baseUrl}${separator}schema=${schemaName}`;

  const client = new PrismaClient({
    datasources: {
      db: { url: tenantUrl },
    },
  });

  await client.$connect();
  clientCache.set(cacheKey, { client, lastAccessed: Date.now() });

  logger.debug(`Created new Prisma client for tenant ${tenantId}`);

  return client;
};

declare global {
  namespace Express {
    interface Request {
      tenantId?: number;
      schemaName?: string;
      prisma?: PrismaClient;
    }
  }
}

export const tenantMiddleware = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    const user = req.user;

    if (!user?.tenantId) {
      throw AppError.unauthorized('Tenant context required');
    }

    const adminPrisma = getAdminClient();

    // Get tenant info from public schema
    const tenant = await adminPrisma.$queryRaw<Array<{
      id: number;
      schema_name: string;
      status: string;
    }>>`
      SELECT id, schema_name, status
      FROM "public"."tenants"
      WHERE id = ${user.tenantId}
    `;

    if (!tenant || tenant.length === 0) {
      throw AppError.notFound('Tenant');
    }

    const tenantData = tenant[0];

    if (tenantData.status !== 'ACTIVE') {
      throw AppError.forbidden(`Tenant is ${tenantData.status.toLowerCase()}`);
    }

    // Get tenant-specific Prisma client
    const tenantPrisma = await getTenantClient(tenantData.id, tenantData.schema_name);

    req.tenantId = tenantData.id;
    req.schemaName = tenantData.schema_name;
    req.prisma = tenantPrisma;

    next();
  } catch (error) {
    next(error);
  }
};

// Cleanup on process exit
process.on('beforeExit', async () => {
  logger.info('Cleaning up Prisma clients...');

  if (adminClient) {
    await adminClient.$disconnect();
  }

  // Clear cache (dispose will disconnect clients)
  clientCache.clear();
});
