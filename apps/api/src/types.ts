import { Request } from 'express';
import { PrismaClient } from '@prisma/client';

export interface TenantRequest extends Request {
  tenantId?: number;
  schemaName?: string;
  prisma: PrismaClient;
  user?: {
    userId: number;
    tenantId: number;
    email: string;
    role: string;
    permissions: string[];
    type: string;
  };
}
