import { getAdminClient } from '../middleware/tenant';
import { AppError } from '../middleware/error-handler';
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

export interface TenantListItem {
  id: number;
  name: string;
  slug: string;
  ownerName: string;
  ownerEmail: string;
  status: string;
  plan: string;
  userCount: number;
  createdAt: Date;
}

export interface UserListItem {
  id: number;
  email: string;
  username: string;
  fullName: string | null;
  role: string;
  isActive: boolean;
  lastLogin: Date | null;
  createdAt: Date;
  tenantId: number;
  tenantName: string;
}

export interface UserFilters {
  tenantId?: number;
  role?: string;
  isActive?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export interface UpdateUserData {
  fullName?: string;
  role?: string;
  isActive?: boolean;
  phone?: string;
}

export interface CreateSuperAdminData {
  email: string;
  username: string;
  password: string;
  fullName: string;
}

export interface CreateUserData {
  email: string;
  username: string;
  password: string;
  fullName: string;
  role: string;
  tenantId: number;
}

class SuperAdminService {
  /**
   * Get all tenants with user counts
   */
  async getAllTenants(): Promise<TenantListItem[]> {
    const prisma = getAdminClient();

    const tenants = await prisma.$queryRaw<TenantListItem[]>`
      SELECT
        t.id,
        t.name,
        t.slug,
        t.owner_name as "ownerName",
        t.owner_email as "ownerEmail",
        t.status,
        t.plan,
        t.created_at as "createdAt",
        (SELECT COUNT(*) FROM "public"."tenant_users" WHERE tenant_id = t.id)::int as "userCount"
      FROM "public"."tenants" t
      ORDER BY t.created_at DESC
    `;

    return tenants;
  }

  /**
   * Get tenant by ID with details
   */
  async getTenantById(tenantId: number): Promise<TenantListItem | null> {
    const prisma = getAdminClient();

    const tenants = await prisma.$queryRaw<TenantListItem[]>`
      SELECT
        t.id,
        t.name,
        t.slug,
        t.owner_name as "ownerName",
        t.owner_email as "ownerEmail",
        t.status,
        t.plan,
        t.created_at as "createdAt",
        (SELECT COUNT(*) FROM "public"."tenant_users" WHERE tenant_id = t.id)::int as "userCount"
      FROM "public"."tenants" t
      WHERE t.id = ${tenantId}
    `;

    return tenants[0] || null;
  }

  /**
   * Get all users across all tenants
   */
  async getAllUsers(filters: UserFilters = {}): Promise<{
    users: UserListItem[];
    total: number;
    page: number;
    limit: number;
  }> {
    const prisma = getAdminClient();
    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const offset = (page - 1) * limit;

    // Build WHERE conditions
    const conditions: string[] = [];
    const params: any[] = [];

    if (filters.tenantId) {
      conditions.push(`u.tenant_id = $${params.length + 1}`);
      params.push(filters.tenantId);
    }

    if (filters.role) {
      conditions.push(`u.role::text = $${params.length + 1}`);
      params.push(filters.role);
    }

    if (filters.isActive !== undefined) {
      conditions.push(`u.is_active = $${params.length + 1}`);
      params.push(filters.isActive);
    }

    if (filters.search) {
      conditions.push(`(
        u.email ILIKE $${params.length + 1} OR
        u.full_name ILIKE $${params.length + 1} OR
        u.username ILIKE $${params.length + 1}
      )`);
      params.push(`%${filters.search}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countResult = await prisma.$queryRawUnsafe<[{ count: bigint }]>(`
      SELECT COUNT(*) as count
      FROM "public"."tenant_users" u
      ${whereClause}
    `, ...params);

    const total = Number(countResult[0]?.count || 0);

    // Get users
    const users = await prisma.$queryRawUnsafe<UserListItem[]>(`
      SELECT
        u.id,
        u.email,
        u.username,
        u.full_name as "fullName",
        u.role,
        u.is_active as "isActive",
        u.last_login as "lastLogin",
        u.created_at as "createdAt",
        u.tenant_id as "tenantId",
        t.name as "tenantName"
      FROM "public"."tenant_users" u
      JOIN "public"."tenants" t ON t.id = u.tenant_id
      ${whereClause}
      ORDER BY u.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `, ...params);

    return { users, total, page, limit };
  }

  /**
   * Get user by ID with tenant info
   */
  async getUserById(userId: number): Promise<UserListItem | null> {
    const prisma = getAdminClient();

    const users = await prisma.$queryRaw<UserListItem[]>`
      SELECT
        u.id,
        u.email,
        u.username,
        u.full_name as "fullName",
        u.role,
        u.is_active as "isActive",
        u.last_login as "lastLogin",
        u.created_at as "createdAt",
        u.tenant_id as "tenantId",
        t.name as "tenantName"
      FROM "public"."tenant_users" u
      JOIN "public"."tenants" t ON t.id = u.tenant_id
      WHERE u.id = ${userId}
    `;

    return users[0] || null;
  }

  /**
   * Update user (role, status, etc.)
   */
  async updateUser(
    userId: number,
    data: UpdateUserData,
    currentUserId: number
  ): Promise<UserListItem> {
    const prisma = getAdminClient();

    // Get current user data
    const currentUser = await this.getUserById(userId);
    if (!currentUser) {
      throw AppError.notFound('User');
    }

    // Prevent SUPER_ADMIN from demoting themselves
    if (userId === currentUserId && data.role && data.role !== 'SUPER_ADMIN') {
      throw AppError.badRequest('Cannot change your own role from SUPER_ADMIN');
    }

    // Prevent deactivating self
    if (userId === currentUserId && data.isActive === false) {
      throw AppError.badRequest('Cannot deactivate yourself');
    }

    // If demoting SUPER_ADMIN, check there's at least one other SUPER_ADMIN
    if (currentUser.role === 'SUPER_ADMIN' && data.role && data.role !== 'SUPER_ADMIN') {
      const superAdminCount = await prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(*) as count FROM "public"."tenant_users" WHERE role = 'SUPER_ADMIN' AND is_active = true
      `;
      if (Number(superAdminCount[0]?.count || 0) <= 1) {
        throw AppError.badRequest('Cannot demote the last SUPER_ADMIN');
      }
    }

    // Build update query
    const updates: string[] = ['updated_at = NOW()'];
    const params: any[] = [];

    if (data.fullName !== undefined) {
      params.push(data.fullName);
      updates.push(`full_name = $${params.length}`);
    }

    if (data.role !== undefined) {
      params.push(data.role);
      updates.push(`role = $${params.length}`);
    }

    if (data.isActive !== undefined) {
      params.push(data.isActive);
      updates.push(`is_active = $${params.length}`);
    }

    if (data.phone !== undefined) {
      params.push(data.phone);
      updates.push(`phone = $${params.length}`);
    }

    params.push(userId);

    await prisma.$executeRawUnsafe(`
      UPDATE "public"."tenant_users"
      SET ${updates.join(', ')}
      WHERE id = $${params.length}
    `, ...params);

    // Return updated user
    const updatedUser = await this.getUserById(userId);
    if (!updatedUser) {
      throw AppError.notFound('User');
    }

    return updatedUser;
  }

  /**
   * Deactivate user (soft delete)
   */
  async deactivateUser(userId: number, currentUserId: number): Promise<void> {
    // Prevent self-deactivation
    if (userId === currentUserId) {
      throw AppError.badRequest('Cannot deactivate yourself');
    }

    const user = await this.getUserById(userId);
    if (!user) {
      throw AppError.notFound('User');
    }

    // Prevent deactivating the last SUPER_ADMIN
    if (user.role === 'SUPER_ADMIN') {
      const prisma = getAdminClient();
      const superAdminCount = await prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(*) as count FROM "public"."tenant_users" WHERE role = 'SUPER_ADMIN' AND is_active = true
      `;
      if (Number(superAdminCount[0]?.count || 0) <= 1) {
        throw AppError.badRequest('Cannot deactivate the last SUPER_ADMIN');
      }
    }

    await this.updateUser(userId, { isActive: false }, currentUserId);
  }

  /**
   * Create a new SUPER_ADMIN user
   * Note: SUPER_ADMIN users are associated with a "platform" tenant (tenant_id = 1 or a special platform tenant)
   */
  async createSuperAdmin(data: CreateSuperAdminData): Promise<UserListItem> {
    const prisma = getAdminClient();

    // Check if email already exists
    const existingUser = await prisma.$queryRaw<[{ id: number }]>`
      SELECT id FROM "public"."tenant_users" WHERE email = ${data.email} LIMIT 1
    `;

    if (existingUser && existingUser.length > 0) {
      throw AppError.conflict('Email already registered');
    }

    // Get or create platform tenant (use first tenant or create a special one)
    let platformTenantId: number;

    const tenants = await prisma.$queryRaw<[{ id: number }]>`
      SELECT id FROM "public"."tenants" ORDER BY id ASC LIMIT 1
    `;

    if (tenants && tenants.length > 0) {
      platformTenantId = tenants[0]!.id;
    } else {
      // Create a platform tenant if none exists
      const newTenant = await prisma.$queryRaw<[{ id: number }]>`
        INSERT INTO "public"."tenants" (slug, name, schema_name, owner_name, owner_email, status, plan, created_at, updated_at)
        VALUES ('platform', 'Platform', 'tenant_platform', ${data.fullName}, ${data.email}, 'ACTIVE', 'PROFESSIONAL', NOW(), NOW())
        RETURNING id
      `;
      platformTenantId = newTenant[0]!.id;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS);

    // Create user
    const newUser = await prisma.$queryRaw<[{ id: number }]>`
      INSERT INTO "public"."tenant_users" (tenant_id, email, username, hashed_password, full_name, role, permissions, is_active, is_verified, created_at, updated_at)
      VALUES (${platformTenantId}, ${data.email}, ${data.username}, ${hashedPassword}, ${data.fullName}, 'SUPER_ADMIN', '[]'::jsonb, true, true, NOW(), NOW())
      RETURNING id
    `;

    const userId = newUser[0]!.id;

    // Return the created user
    const createdUser = await this.getUserById(userId);
    if (!createdUser) {
      throw AppError.internal('Failed to create user');
    }

    return createdUser;
  }

  /**
   * Create a new user with specified tenant and role
   */
  async createUser(data: CreateUserData): Promise<UserListItem> {
    const prisma = getAdminClient();

    // Check if email already exists
    const existingUser = await prisma.$queryRaw<[{ id: number }]>`
      SELECT id FROM "public"."tenant_users" WHERE email = ${data.email} LIMIT 1
    `;

    if (existingUser && existingUser.length > 0) {
      throw AppError.conflict('Email already registered');
    }

    // Check if username already exists
    const existingUsername = await prisma.$queryRaw<[{ id: number }]>`
      SELECT id FROM "public"."tenant_users" WHERE username = ${data.username} LIMIT 1
    `;

    if (existingUsername && existingUsername.length > 0) {
      throw AppError.conflict('Username already taken');
    }

    // Verify tenant exists
    const tenant = await this.getTenantById(data.tenantId);
    if (!tenant) {
      throw AppError.notFound('Tenant');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS);

    // Create user
    const newUser = await prisma.$queryRaw<[{ id: number }]>`
      INSERT INTO "public"."tenant_users" (tenant_id, email, username, hashed_password, full_name, role, permissions, is_active, is_verified, created_at, updated_at)
      VALUES (${data.tenantId}, ${data.email}, ${data.username}, ${hashedPassword}, ${data.fullName}, ${data.role}::"UserRole", '[]'::jsonb, true, true, NOW(), NOW())
      RETURNING id
    `;

    const userId = newUser[0]!.id;

    // Return the created user
    const createdUser = await this.getUserById(userId);
    if (!createdUser) {
      throw AppError.internal('Failed to create user');
    }

    return createdUser;
  }
}

export const superAdminService = new SuperAdminService();
