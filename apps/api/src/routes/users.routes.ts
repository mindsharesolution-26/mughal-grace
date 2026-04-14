import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { authMiddleware } from '../middleware/auth';
import { tenantMiddleware, getAdminClient } from '../middleware/tenant';
import { requirePermission, PERMISSIONS, UserRole, ROLE_PERMISSIONS } from '../middleware/rbac';
import { validateBody, validateParams } from '../middleware/validate';
import { AppError } from '../middleware/error-handler';
import { logger } from '../utils/logger';

export const usersRouter: Router = Router();

// Apply authentication and tenant middleware to all routes
usersRouter.use(authMiddleware);
usersRouter.use(tenantMiddleware);

// ============================================
// VALIDATION SCHEMAS
// ============================================

// Roles that can be assigned (excluding SUPER_ADMIN and FACTORY_OWNER)
const assignableRoles: UserRole[] = ['MANAGER', 'SUPERVISOR', 'OPERATOR', 'ACCOUNTANT', 'VIEWER'];

const createUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  username: z.string().min(3, 'Username must be at least 3 characters').max(50),
  fullName: z.string().min(2, 'Full name must be at least 2 characters').max(100),
  phone: z.string().max(20).optional(),
  role: z.enum(['MANAGER', 'SUPERVISOR', 'OPERATOR', 'ACCOUNTANT', 'VIEWER'] as const),
  permissions: z.array(z.string()).optional(),
  isActive: z.boolean().default(true),
});

const updateUserSchema = z.object({
  fullName: z.string().min(2).max(100).optional(),
  phone: z.string().max(20).optional().nullable(),
  role: z.enum(['MANAGER', 'SUPERVISOR', 'OPERATOR', 'ACCOUNTANT', 'VIEWER'] as const).optional(),
  permissions: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

const updatePasswordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const idParamSchema = z.object({
  id: z.string().regex(/^\d+$/, 'Invalid ID format').transform(Number),
});

// ============================================
// ROUTES
// ============================================

// GET /users - List all users in tenant
usersRouter.get(
  '/',
  requirePermission(PERMISSIONS.USERS_MANAGE),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = req.user!.tenantId;
      const prisma = getAdminClient();

      const users = await prisma.$queryRaw<Array<{
        id: number;
        email: string;
        username: string;
        full_name: string;
        phone: string | null;
        role: string;
        permissions: string[];
        is_active: boolean;
        is_verified: boolean;
        last_login: Date | null;
        created_at: Date;
        updated_at: Date;
      }>>`
        SELECT id, email, username, full_name, phone, role, permissions,
               is_active, is_verified, last_login, created_at, updated_at
        FROM tenant_users
        WHERE tenant_id = ${tenantId}
        ORDER BY created_at DESC
      `;

      // Transform snake_case to camelCase
      const transformedUsers = users.map(user => ({
        id: user.id,
        email: user.email,
        username: user.username,
        fullName: user.full_name,
        phone: user.phone,
        role: user.role,
        permissions: user.permissions || [],
        isActive: user.is_active,
        isVerified: user.is_verified,
        lastLogin: user.last_login,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      }));

      res.json({ data: transformedUsers });
    } catch (error) {
      next(error);
    }
  }
);

// GET /users/roles - Get available roles with permissions
usersRouter.get(
  '/roles',
  requirePermission(PERMISSIONS.USERS_MANAGE),
  async (_req: Request, res: Response) => {
    const roles = assignableRoles.map(role => ({
      value: role,
      label: role.replace(/_/g, ' '),
      permissions: ROLE_PERMISSIONS[role] || [],
    }));
    res.json({ data: roles });
  }
);

// GET /users/:id - Get single user
usersRouter.get(
  '/:id',
  requirePermission(PERMISSIONS.USERS_MANAGE),
  validateParams(idParamSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id as string);
      const tenantId = req.user!.tenantId;
      const prisma = getAdminClient();

      const users = await prisma.$queryRaw<Array<{
        id: number;
        email: string;
        username: string;
        full_name: string;
        phone: string | null;
        role: string;
        permissions: string[];
        is_active: boolean;
        is_verified: boolean;
        last_login: Date | null;
        created_at: Date;
        updated_at: Date;
      }>>`
        SELECT id, email, username, full_name, phone, role, permissions,
               is_active, is_verified, last_login, created_at, updated_at
        FROM tenant_users
        WHERE id = ${id} AND tenant_id = ${tenantId}
        LIMIT 1
      `;

      if (users.length === 0) {
        throw AppError.notFound('User');
      }

      const user = users[0];
      res.json({
        data: {
          id: user.id,
          email: user.email,
          username: user.username,
          fullName: user.full_name,
          phone: user.phone,
          role: user.role,
          permissions: user.permissions || [],
          isActive: user.is_active,
          isVerified: user.is_verified,
          lastLogin: user.last_login,
          createdAt: user.created_at,
          updatedAt: user.updated_at,
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /users - Create new user
usersRouter.post(
  '/',
  requirePermission(PERMISSIONS.USERS_MANAGE),
  validateBody(createUserSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = req.user!.tenantId;
      const prisma = getAdminClient();
      const { email, password, username, fullName, phone, role, permissions, isActive } = req.body;

      // Check if email already exists within this tenant
      // SECURITY: Include tenant_id to prevent cross-tenant email enumeration
      const existingEmail = await prisma.$queryRaw<Array<{ id: number }>>`
        SELECT id FROM tenant_users WHERE email = ${email} AND tenant_id = ${tenantId} LIMIT 1
      `;
      if (existingEmail.length > 0) {
        throw AppError.conflict('Email already registered');
      }

      // Check if username exists in this tenant
      const existingUsername = await prisma.$queryRaw<Array<{ id: number }>>`
        SELECT id FROM tenant_users WHERE tenant_id = ${tenantId} AND username = ${username} LIMIT 1
      `;
      if (existingUsername.length > 0) {
        throw AppError.conflict('Username already exists in this organization');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12);

      // Create user
      const permissionsJson = JSON.stringify(permissions || []);
      const result = await prisma.$queryRaw<Array<{ id: number }>>`
        INSERT INTO tenant_users (
          tenant_id, email, username, hashed_password, full_name, phone,
          role, permissions, is_active, is_verified, created_at, updated_at
        )
        VALUES (
          ${tenantId}, ${email}, ${username}, ${hashedPassword}, ${fullName},
          ${phone || null}, ${role}::"UserRole", ${permissionsJson}::jsonb,
          ${isActive}, false, NOW(), NOW()
        )
        RETURNING id
      `;

      logger.info(`User created: ${email} by ${req.user!.email}`);

      res.status(201).json({
        message: 'User created successfully',
        data: { id: result[0].id }
      });
    } catch (error) {
      next(error);
    }
  }
);

// PUT /users/:id - Update user
usersRouter.put(
  '/:id',
  requirePermission(PERMISSIONS.USERS_MANAGE),
  validateParams(idParamSchema),
  validateBody(updateUserSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id as string);
      const tenantId = req.user!.tenantId;
      const currentUserId = req.user!.userId;
      const prisma = getAdminClient();

      // Check if user exists and belongs to tenant
      const existing = await prisma.$queryRaw<Array<{ id: number; role: string }>>`
        SELECT id, role FROM tenant_users
        WHERE id = ${id} AND tenant_id = ${tenantId}
        LIMIT 1
      `;

      if (existing.length === 0) {
        throw AppError.notFound('User');
      }

      // Prevent modifying FACTORY_OWNER role (unless it's the owner themselves)
      if (existing[0].role === 'FACTORY_OWNER' && id !== currentUserId) {
        throw AppError.forbidden('Cannot modify factory owner');
      }

      // Build update fields
      const { fullName, phone, role, permissions, isActive } = req.body;

      // Update user with only provided fields
      if (fullName !== undefined) {
        await prisma.$executeRaw`
          UPDATE tenant_users SET full_name = ${fullName}, updated_at = NOW()
          WHERE id = ${id} AND tenant_id = ${tenantId}
        `;
      }

      if (phone !== undefined) {
        await prisma.$executeRaw`
          UPDATE tenant_users SET phone = ${phone}, updated_at = NOW()
          WHERE id = ${id} AND tenant_id = ${tenantId}
        `;
      }

      if (role !== undefined && existing[0].role !== 'FACTORY_OWNER') {
        await prisma.$executeRaw`
          UPDATE tenant_users SET role = ${role}::"UserRole", updated_at = NOW()
          WHERE id = ${id} AND tenant_id = ${tenantId}
        `;
      }

      if (permissions !== undefined) {
        const permissionsJson = JSON.stringify(permissions);
        await prisma.$executeRaw`
          UPDATE tenant_users SET permissions = ${permissionsJson}::jsonb, updated_at = NOW()
          WHERE id = ${id} AND tenant_id = ${tenantId}
        `;
      }

      if (isActive !== undefined) {
        await prisma.$executeRaw`
          UPDATE tenant_users SET is_active = ${isActive}, updated_at = NOW()
          WHERE id = ${id} AND tenant_id = ${tenantId}
        `;
      }

      logger.info(`User ${id} updated by ${req.user!.email}`);

      res.json({ message: 'User updated successfully' });
    } catch (error) {
      next(error);
    }
  }
);

// PUT /users/:id/password - Reset user password (admin action)
usersRouter.put(
  '/:id/password',
  requirePermission(PERMISSIONS.USERS_MANAGE),
  validateParams(idParamSchema),
  validateBody(updatePasswordSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id as string);
      const tenantId = req.user!.tenantId;
      const prisma = getAdminClient();
      const { password } = req.body;

      // Check user exists in tenant
      const existing = await prisma.$queryRaw<Array<{ id: number }>>`
        SELECT id FROM tenant_users
        WHERE id = ${id} AND tenant_id = ${tenantId}
        LIMIT 1
      `;

      if (existing.length === 0) {
        throw AppError.notFound('User');
      }

      const hashedPassword = await bcrypt.hash(password, 12);

      await prisma.$executeRaw`
        UPDATE tenant_users
        SET hashed_password = ${hashedPassword}, updated_at = NOW()
        WHERE id = ${id} AND tenant_id = ${tenantId}
      `;

      logger.info(`Password reset for user ${id} by ${req.user!.email}`);

      res.json({ message: 'Password updated successfully' });
    } catch (error) {
      next(error);
    }
  }
);

// PUT /users/:id/toggle-status - Activate/Deactivate user
usersRouter.put(
  '/:id/toggle-status',
  requirePermission(PERMISSIONS.USERS_MANAGE),
  validateParams(idParamSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id as string);
      const tenantId = req.user!.tenantId;
      const currentUserId = req.user!.userId;
      const prisma = getAdminClient();

      // Cannot deactivate yourself
      if (id === currentUserId) {
        throw AppError.badRequest('Cannot deactivate your own account');
      }

      // Check user exists
      const existing = await prisma.$queryRaw<Array<{ id: number; role: string; is_active: boolean }>>`
        SELECT id, role, is_active FROM tenant_users
        WHERE id = ${id} AND tenant_id = ${tenantId}
        LIMIT 1
      `;

      if (existing.length === 0) {
        throw AppError.notFound('User');
      }

      // Cannot deactivate factory owner
      if (existing[0].role === 'FACTORY_OWNER') {
        throw AppError.forbidden('Cannot deactivate factory owner');
      }

      const newStatus = !existing[0].is_active;

      await prisma.$executeRaw`
        UPDATE tenant_users
        SET is_active = ${newStatus}, updated_at = NOW()
        WHERE id = ${id} AND tenant_id = ${tenantId}
      `;

      logger.info(`User ${id} ${newStatus ? 'activated' : 'deactivated'} by ${req.user!.email}`);

      res.json({
        message: `User ${newStatus ? 'activated' : 'deactivated'} successfully`,
        data: { isActive: newStatus }
      });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /users/:id - Delete user (soft delete by deactivating)
usersRouter.delete(
  '/:id',
  requirePermission(PERMISSIONS.USERS_MANAGE),
  validateParams(idParamSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id as string);
      const tenantId = req.user!.tenantId;
      const currentUserId = req.user!.userId;
      const prisma = getAdminClient();

      if (id === currentUserId) {
        throw AppError.badRequest('Cannot delete your own account');
      }

      const existing = await prisma.$queryRaw<Array<{ id: number; role: string }>>`
        SELECT id, role FROM tenant_users
        WHERE id = ${id} AND tenant_id = ${tenantId}
        LIMIT 1
      `;

      if (existing.length === 0) {
        throw AppError.notFound('User');
      }

      if (existing[0].role === 'FACTORY_OWNER') {
        throw AppError.forbidden('Cannot delete factory owner');
      }

      // Soft delete - set inactive
      await prisma.$executeRaw`
        UPDATE tenant_users
        SET is_active = false, updated_at = NOW()
        WHERE id = ${id} AND tenant_id = ${tenantId}
      `;

      logger.info(`User ${id} deleted (deactivated) by ${req.user!.email}`);

      res.json({ message: 'User deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
);
