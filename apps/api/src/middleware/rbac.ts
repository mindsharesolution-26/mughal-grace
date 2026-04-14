import { Request, Response, NextFunction } from 'express';
import { AppError } from './error-handler';

// User roles
export type UserRole =
  | 'SUPER_ADMIN'
  | 'FACTORY_OWNER'
  | 'MANAGER'
  | 'SUPERVISOR'
  | 'OPERATOR'
  | 'ACCOUNTANT'
  | 'VIEWER';

// Permission definitions
export const PERMISSIONS = {
  // Yarn module
  YARN_READ: 'yarn:read',
  YARN_WRITE: 'yarn:write',

  // Production module
  PRODUCTION_READ: 'production:read',
  PRODUCTION_WRITE: 'production:write',

  // Rolls module
  ROLLS_READ: 'rolls:read',
  ROLLS_WRITE: 'rolls:write',

  // Dyeing module
  DYEING_READ: 'dyeing:read',
  DYEING_WRITE: 'dyeing:write',

  // Sales module
  SALES_READ: 'sales:read',
  SALES_WRITE: 'sales:write',

  // Finance module
  FINANCE_READ: 'finance:read',
  FINANCE_WRITE: 'finance:write',

  // Payables module
  PAYABLES_READ: 'payables:read',
  PAYABLES_WRITE: 'payables:write',

  // Receivables module
  RECEIVABLES_READ: 'receivables:read',
  RECEIVABLES_WRITE: 'receivables:write',

  // Cheques module
  CHEQUES_READ: 'cheques:read',
  CHEQUES_WRITE: 'cheques:write',

  // Inventory module
  INVENTORY_READ: 'inventory:read',
  INVENTORY_WRITE: 'inventory:write',

  // Products module
  PRODUCTS_READ: 'products:read',
  PRODUCTS_WRITE: 'products:write',

  // Reports module
  REPORTS_READ: 'reports:read',

  // User management
  USERS_MANAGE: 'users:manage',

  // Settings
  SETTINGS_MANAGE: 'settings:manage',
  SETTINGS_READ: 'settings:read',
  SETTINGS_WRITE: 'settings:write',
} as const;

// Role to permissions mapping
export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  SUPER_ADMIN: Object.values(PERMISSIONS),

  FACTORY_OWNER: Object.values(PERMISSIONS),

  MANAGER: [
    PERMISSIONS.YARN_READ,
    PERMISSIONS.YARN_WRITE,
    PERMISSIONS.PRODUCTION_READ,
    PERMISSIONS.PRODUCTION_WRITE,
    PERMISSIONS.ROLLS_READ,
    PERMISSIONS.ROLLS_WRITE,
    PERMISSIONS.DYEING_READ,
    PERMISSIONS.DYEING_WRITE,
    PERMISSIONS.SALES_READ,
    PERMISSIONS.FINANCE_READ,
    PERMISSIONS.PAYABLES_READ,
    PERMISSIONS.RECEIVABLES_READ,
    PERMISSIONS.CHEQUES_READ,
    PERMISSIONS.INVENTORY_READ,
    PERMISSIONS.INVENTORY_WRITE,
    PERMISSIONS.PRODUCTS_READ,
    PERMISSIONS.PRODUCTS_WRITE,
    PERMISSIONS.REPORTS_READ,
  ],

  SUPERVISOR: [
    PERMISSIONS.YARN_READ,
    PERMISSIONS.PRODUCTION_READ,
    PERMISSIONS.PRODUCTION_WRITE,
    PERMISSIONS.ROLLS_READ,
    PERMISSIONS.ROLLS_WRITE,
    PERMISSIONS.INVENTORY_READ,
    PERMISSIONS.INVENTORY_WRITE,
    PERMISSIONS.PRODUCTS_READ,
  ],

  OPERATOR: [
    PERMISSIONS.YARN_READ,
    PERMISSIONS.PRODUCTION_READ,
    PERMISSIONS.PRODUCTION_WRITE,
    PERMISSIONS.ROLLS_READ,
    PERMISSIONS.INVENTORY_READ,
    PERMISSIONS.PRODUCTS_READ,
  ],

  ACCOUNTANT: [
    PERMISSIONS.SALES_READ,
    PERMISSIONS.SALES_WRITE,
    PERMISSIONS.FINANCE_READ,
    PERMISSIONS.FINANCE_WRITE,
    PERMISSIONS.PAYABLES_READ,
    PERMISSIONS.PAYABLES_WRITE,
    PERMISSIONS.RECEIVABLES_READ,
    PERMISSIONS.RECEIVABLES_WRITE,
    PERMISSIONS.CHEQUES_READ,
    PERMISSIONS.CHEQUES_WRITE,
    PERMISSIONS.INVENTORY_READ,
    PERMISSIONS.PRODUCTS_READ,
    PERMISSIONS.REPORTS_READ,
  ],

  VIEWER: [
    PERMISSIONS.YARN_READ,
    PERMISSIONS.PRODUCTION_READ,
    PERMISSIONS.ROLLS_READ,
    PERMISSIONS.DYEING_READ,
    PERMISSIONS.SALES_READ,
    PERMISSIONS.FINANCE_READ,
    PERMISSIONS.PAYABLES_READ,
    PERMISSIONS.RECEIVABLES_READ,
    PERMISSIONS.CHEQUES_READ,
    PERMISSIONS.INVENTORY_READ,
    PERMISSIONS.PRODUCTS_READ,
    PERMISSIONS.REPORTS_READ,
  ],
};

// Get permissions for a role
export const getPermissionsForRole = (role: UserRole): string[] => {
  return ROLE_PERMISSIONS[role] || [];
};

// Check if user has specific permission
export const hasPermission = (
  userRole: string,
  userPermissions: string[],
  requiredPermission: string
): boolean => {
  // Check explicit permissions first
  if (userPermissions.includes(requiredPermission)) {
    return true;
  }

  // Check role-based permissions
  const rolePermissions = ROLE_PERMISSIONS[userRole as UserRole] || [];
  return rolePermissions.includes(requiredPermission);
};

// Middleware: Require specific role(s)
export const requireRole = (...roles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const user = req.user;

    if (!user) {
      throw AppError.unauthorized('Authentication required');
    }

    if (!roles.includes(user.role as UserRole)) {
      throw AppError.forbidden(
        `This action requires one of these roles: ${roles.join(', ')}`
      );
    }

    next();
  };
};

// Middleware: Require specific permission(s)
export const requirePermission = (...permissions: string[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const user = req.user;

    if (!user) {
      throw AppError.unauthorized('Authentication required');
    }

    const hasRequired = permissions.some((perm) =>
      hasPermission(user.role, user.permissions, perm)
    );

    if (!hasRequired) {
      throw AppError.forbidden(
        `Required permission: ${permissions.join(' or ')}`
      );
    }

    next();
  };
};
