import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { AppError } from '../middleware/error-handler';
import { getAdminClient } from '../middleware/tenant';
import { getPermissionsForRole, UserRole } from '../middleware/rbac';
import { logger } from '../utils/logger';
import { TokenPayload } from '../middleware/auth';

const SALT_ROUNDS = 12;

// Generate JWT tokens
const generateTokens = (payload: Omit<TokenPayload, 'type'>) => {
  const accessToken = jwt.sign(
    { ...payload, type: 'access' },
    config.jwt.secret,
    { expiresIn: config.jwt.accessExpiry } as jwt.SignOptions
  );

  const refreshToken = jwt.sign(
    { userId: payload.userId, tenantId: payload.tenantId, type: 'refresh' },
    config.jwt.secret,
    { expiresIn: config.jwt.refreshExpiry } as jwt.SignOptions
  );

  return { accessToken, refreshToken };
};

// Set cookies with secure settings
const setAuthCookies = (res: Response, accessToken: string, refreshToken: string) => {
  // SECURITY: Use strict sameSite for auth cookies to prevent CSRF
  // secure: true should always be used (use HTTPS even in development)
  const cookieOptions = {
    httpOnly: true,
    secure: true, // Always secure - use HTTPS in development too
    sameSite: 'strict' as const, // Strict prevents CSRF attacks
  };

  res.cookie('access_token', accessToken, {
    ...cookieOptions,
    maxAge: 15 * 60 * 1000, // 15 minutes
  });

  res.cookie('refresh_token', refreshToken, {
    ...cookieOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
};

export const authController = {
  // Register new tenant and owner
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password, fullName, companyName, phone } = req.body;

      const prisma = getAdminClient();

      // Check if email already exists
      const existingUser = await prisma.$queryRaw<Array<{ id: number }>>`
        SELECT id FROM "public"."tenant_users" WHERE email = ${email} LIMIT 1
      `;

      if (existingUser.length > 0) {
        throw AppError.conflict('Email already registered');
      }

      // Generate tenant slug
      const slug = companyName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .substring(0, 50);

      const schemaName = `${config.tenant.schemaPrefix}${slug}_${Date.now()}`;

      // Hash password
      const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

      // Create tenant and user in transaction
      const result = await prisma.$transaction(async (tx) => {
        // Create tenant
        const tenant = await tx.$queryRaw<Array<{ id: number }>>`
          INSERT INTO "public"."tenants" (slug, name, schema_name, owner_name, owner_email, owner_phone, status, plan, created_at, updated_at)
          VALUES (${slug}, ${companyName}, ${schemaName}, ${fullName}, ${email}, ${phone || null}, 'ACTIVE', 'TRIAL', NOW(), NOW())
          RETURNING id
        `;

        const tenantId = tenant[0]!.id;

        // Create owner user
        const user = await tx.$queryRaw<Array<{ id: number }>>`
          INSERT INTO "public"."tenant_users" (tenant_id, email, username, hashed_password, full_name, phone, role, permissions, is_active, is_verified, created_at, updated_at)
          VALUES (${tenantId}, ${email}, ${email}, ${hashedPassword}, ${fullName}, ${phone || null}, 'FACTORY_OWNER', '[]'::jsonb, true, false, NOW(), NOW())
          RETURNING id
        `;

        return { tenantId, userId: user[0]!.id };
      });

      // Generate tokens
      const permissions = getPermissionsForRole('FACTORY_OWNER');
      const tokens = generateTokens({
        userId: result.userId,
        tenantId: result.tenantId,
        email,
        role: 'FACTORY_OWNER',
        permissions,
      });

      setAuthCookies(res, tokens.accessToken, tokens.refreshToken);

      logger.info(`New tenant registered: ${companyName} (${email})`);

      res.status(201).json({
        message: 'Registration successful',
        user: {
          id: result.userId,
          email,
          fullName,
          role: 'FACTORY_OWNER',
        },
        tenant: {
          id: result.tenantId,
          name: companyName,
        },
        accessToken: tokens.accessToken,
      });
    } catch (error) {
      next(error);
    }
  },

  // Login
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;

      const prisma = getAdminClient();

      // Find user
      const users = await prisma.$queryRaw<Array<{
        id: number;
        tenant_id: number;
        email: string;
        hashed_password: string;
        full_name: string;
        role: string;
        permissions: string[];
        is_active: boolean;
      }>>`
        SELECT u.id, u.tenant_id, u.email, u.hashed_password, u.full_name, u.role, u.permissions, u.is_active
        FROM "public"."tenant_users" u
        WHERE u.email = ${email}
        LIMIT 1
      `;

      if (users.length === 0) {
        throw AppError.unauthorized('Invalid email or password');
      }

      const user = users[0]!;

      if (!user.is_active) {
        throw AppError.forbidden('Your account has been deactivated');
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.hashed_password);
      if (!isValidPassword) {
        throw AppError.unauthorized('Invalid email or password');
      }

      // Check tenant status
      const tenants = await prisma.$queryRaw<Array<{ status: string }>>`
        SELECT status FROM "public"."tenants" WHERE id = ${user.tenant_id}
      `;

      if (tenants.length === 0 || tenants[0]!.status !== 'ACTIVE') {
        throw AppError.forbidden('Your organization is not active');
      }

      // Get role permissions
      const rolePermissions = getPermissionsForRole(user.role as UserRole);
      const allPermissions = [...new Set([...rolePermissions, ...user.permissions])];

      // Generate tokens
      const tokens = generateTokens({
        userId: user.id,
        tenantId: user.tenant_id,
        email: user.email,
        role: user.role,
        permissions: allPermissions,
      });

      setAuthCookies(res, tokens.accessToken, tokens.refreshToken);

      // Update last login
      await prisma.$executeRaw`
        UPDATE "public"."tenant_users" SET last_login = NOW() WHERE id = ${user.id}
      `;

      logger.info(`User logged in: ${email}`);

      res.json({
        message: 'Login successful',
        user: {
          id: user.id,
          email: user.email,
          fullName: user.full_name,
          role: user.role,
        },
        accessToken: tokens.accessToken,
      });
    } catch (error) {
      next(error);
    }
  },

  // Logout
  async logout(_req: Request, res: Response) {
    res.clearCookie('access_token');
    res.clearCookie('refresh_token');

    res.json({ message: 'Logged out successfully' });
  },

  // Refresh token
  async refreshToken(req: Request, res: Response, next: NextFunction) {
    try {
      const refreshToken = req.cookies?.refresh_token || req.body.refreshToken;

      if (!refreshToken) {
        throw AppError.unauthorized('Refresh token required');
      }

      // Verify refresh token
      const decoded = jwt.verify(refreshToken, config.jwt.secret) as {
        userId: number;
        tenantId: number;
        type: string;
      };

      if (decoded.type !== 'refresh') {
        throw AppError.unauthorized('Invalid token type');
      }

      const prisma = getAdminClient();

      // Get user info
      const users = await prisma.$queryRaw<Array<{
        id: number;
        tenant_id: number;
        email: string;
        role: string;
        permissions: string[];
        is_active: boolean;
      }>>`
        SELECT id, tenant_id, email, role, permissions, is_active
        FROM "public"."tenant_users"
        WHERE id = ${decoded.userId}
        LIMIT 1
      `;

      if (users.length === 0) {
        throw AppError.unauthorized('User not found');
      }

      const user = users[0]!;

      if (!user.is_active) {
        throw AppError.forbidden('Account deactivated');
      }

      // Generate new tokens
      const rolePermissions = getPermissionsForRole(user.role as UserRole);
      const allPermissions = [...new Set([...rolePermissions, ...user.permissions])];

      const tokens = generateTokens({
        userId: user.id,
        tenantId: user.tenant_id,
        email: user.email,
        role: user.role,
        permissions: allPermissions,
      });

      setAuthCookies(res, tokens.accessToken, tokens.refreshToken);

      res.json({
        message: 'Token refreshed',
        accessToken: tokens.accessToken,
      });
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw AppError.unauthorized('Invalid refresh token');
      }
      next(error);
    }
  },

  // Get current user
  async me(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user;

      if (!user) {
        throw AppError.unauthorized('Not authenticated');
      }

      const prisma = getAdminClient();

      const users = await prisma.$queryRaw<Array<{
        id: number;
        email: string;
        full_name: string;
        role: string;
        phone: string | null;
        tenant_name: string;
      }>>`
        SELECT u.id, u.email, u.full_name, u.role, u.phone, t.name as tenant_name
        FROM "public"."tenant_users" u
        JOIN "public"."tenants" t ON u.tenant_id = t.id
        WHERE u.id = ${user.userId}
        LIMIT 1
      `;

      if (users.length === 0) {
        throw AppError.notFound('User');
      }

      const userData = users[0]!;

      res.json({
        user: {
          id: userData.id,
          email: userData.email,
          fullName: userData.full_name,
          role: userData.role,
          phone: userData.phone,
          tenantName: userData.tenant_name,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  // Forgot password
  async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.body;

      // TODO: Implement email sending
      logger.info(`Password reset requested for: ${email}`);

      res.json({
        message: 'If the email exists, a password reset link has been sent',
      });
    } catch (error) {
      next(error);
    }
  },

  // Reset password
  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { token, password: _password } = req.body;

      // TODO: Implement password reset with token verification
      logger.info(`Password reset attempted with token: ${token.substring(0, 10)}...`);

      res.json({
        message: 'Password has been reset successfully',
      });
    } catch (error) {
      next(error);
    }
  },
};
