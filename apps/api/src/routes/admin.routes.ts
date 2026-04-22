import { Router, Request, Response, NextFunction } from 'express';
import { authMiddleware } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { superAdminService, UserFilters, UpdateUserData, CreateSuperAdminData, CreateUserData } from '../services/superadmin.service';
import { AppError } from '../middleware/error-handler';
import { z } from 'zod';

export const adminRouter: Router = Router();

// Admin routes require SUPER_ADMIN role
adminRouter.use(authMiddleware);
adminRouter.use(requireRole('SUPER_ADMIN'));

// ==================== TENANT ROUTES ====================

/**
 * GET /admin/tenants - List all tenants
 */
adminRouter.get('/tenants', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const tenants = await superAdminService.getAllTenants();
    res.json({ data: tenants });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /admin/tenants/:id - Get tenant by ID
 */
adminRouter.get('/tenants/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = parseInt(String(req.params.id), 10);
    if (isNaN(tenantId)) {
      throw AppError.badRequest('Invalid tenant ID');
    }

    const tenant = await superAdminService.getTenantById(tenantId);
    if (!tenant) {
      throw AppError.notFound('Tenant');
    }

    res.json({ data: tenant });
  } catch (error) {
    next(error);
  }
});

// ==================== USER ROUTES ====================

/**
 * GET /admin/users - List all users across tenants
 * Query params: tenantId, role, isActive, search, page, limit
 */
adminRouter.get('/users', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filters: UserFilters = {
      tenantId: req.query.tenantId ? parseInt(req.query.tenantId as string, 10) : undefined,
      role: req.query.role as string | undefined,
      isActive: req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined,
      search: req.query.search as string | undefined,
      page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 50,
    };

    const result = await superAdminService.getAllUsers(filters);
    res.json({
      data: result.users,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / result.limit),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /admin/users/:id - Get user by ID
 */
adminRouter.get('/users/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = parseInt(String(req.params.id), 10);
    if (isNaN(userId)) {
      throw AppError.badRequest('Invalid user ID');
    }

    const user = await superAdminService.getUserById(userId);
    if (!user) {
      throw AppError.notFound('User');
    }

    res.json({ data: user });
  } catch (error) {
    next(error);
  }
});

// Validation schemas
const updateUserSchema = z.object({
  fullName: z.string().min(1).max(255).optional(),
  role: z.enum(['SUPER_ADMIN', 'FACTORY_OWNER', 'MANAGER', 'SUPERVISOR', 'OPERATOR', 'ACCOUNTANT', 'VIEWER']).optional(),
  isActive: z.boolean().optional(),
  phone: z.string().max(50).optional(),
});

/**
 * PUT /admin/users/:id - Update user
 */
adminRouter.put('/users/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = parseInt(String(req.params.id), 10);
    if (isNaN(userId)) {
      throw AppError.badRequest('Invalid user ID');
    }

    const validation = updateUserSchema.safeParse(req.body);
    if (!validation.success) {
      throw AppError.badRequest(validation.error.errors[0]?.message || 'Invalid input');
    }

    const data: UpdateUserData = validation.data;
    const currentUserId = req.user!.userId;

    const updatedUser = await superAdminService.updateUser(userId, data, currentUserId);
    res.json({ message: 'User updated successfully', data: updatedUser });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /admin/users/:id - Deactivate user (soft delete)
 */
adminRouter.delete('/users/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = parseInt(String(req.params.id), 10);
    if (isNaN(userId)) {
      throw AppError.badRequest('Invalid user ID');
    }

    const currentUserId = req.user!.userId;
    await superAdminService.deactivateUser(userId, currentUserId);

    res.json({ message: 'User deactivated successfully' });
  } catch (error) {
    next(error);
  }
});

// Create user validation schema
const createUserSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(100),
  password: z.string().min(8),
  fullName: z.string().min(1).max(255),
  role: z.enum(['SUPER_ADMIN', 'FACTORY_OWNER', 'MANAGER', 'SUPERVISOR', 'OPERATOR', 'ACCOUNTANT', 'VIEWER']),
  tenantId: z.number().int().positive(),
});

/**
 * POST /admin/users - Create new user with specified role and tenant
 */
adminRouter.post('/users', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validation = createUserSchema.safeParse(req.body);
    if (!validation.success) {
      throw AppError.badRequest(validation.error.errors[0]?.message || 'Invalid input');
    }

    const data = validation.data as CreateUserData;
    const newUser = await superAdminService.createUser(data);

    res.status(201).json({ message: 'User created successfully', data: newUser });
  } catch (error) {
    next(error);
  }
});

// Create super admin validation schema
const createSuperAdminSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(100),
  password: z.string().min(8),
  fullName: z.string().min(1).max(255),
});

/**
 * POST /admin/users/super-admin - Create new Super Admin
 */
adminRouter.post('/users/super-admin', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validation = createSuperAdminSchema.safeParse(req.body);
    if (!validation.success) {
      throw AppError.badRequest(validation.error.errors[0]?.message || 'Invalid input');
    }

    const data = validation.data as CreateSuperAdminData;
    const newUser = await superAdminService.createSuperAdmin(data);

    res.status(201).json({ message: 'Super Admin created successfully', data: newUser });
  } catch (error) {
    next(error);
  }
});

// ==================== STATS/DASHBOARD ====================

/**
 * GET /admin/stats - Get platform statistics
 */
adminRouter.get('/stats', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const tenants = await superAdminService.getAllTenants();
    const usersResult = await superAdminService.getAllUsers({ limit: 1 });

    const activeTenants = tenants.filter(t => t.status === 'ACTIVE').length;
    const totalUsers = usersResult.total;
    const superAdmins = (await superAdminService.getAllUsers({ role: 'SUPER_ADMIN', limit: 1000 })).total;

    res.json({
      data: {
        totalTenants: tenants.length,
        activeTenants,
        totalUsers,
        superAdmins,
      },
    });
  } catch (error) {
    next(error);
  }
});
