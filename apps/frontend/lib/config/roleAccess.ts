import { UserRole } from '@/lib/types/user';

/**
 * Role-based access control configuration
 * Defines which roles can access which route patterns
 */

// Route patterns that each role can access
// Use '*' as wildcard for any path segment, '**' for any remaining path
export const roleRouteAccess: Record<UserRole, string[]> = {
  // Platform-level admin - full access to all routes
  SUPER_ADMIN: ['/**'],

  // Factory owner - full factory access, no platform admin
  FACTORY_OWNER: [
    '/dashboard',
    '/products/**',
    '/stock/**',
    '/inventory/**',
    '/yarn/**',
    '/production/**',
    '/rolls/**',
    '/dyeing/**',
    '/machines/**',
    '/needles/**',
    '/finance/**',
    '/receivables/**',
    '/payables/**',
    '/cheques/**',
    '/sales/**',
    '/reports/**',
    '/settings/**',
    '/users/**',
  ],

  // Manager - production, inventory, view finances
  MANAGER: [
    '/dashboard',
    '/products/**',
    '/stock/**',
    '/inventory/**',
    '/yarn/**',
    '/production/**',
    '/rolls/**',
    '/dyeing/**',
    '/machines/**',
    '/needles/**',
    '/finance',  // Overview only
    '/receivables',  // View only
    '/payables',  // View only
    '/reports/**',
    '/settings',  // Profile only
  ],

  // Supervisor - production and rolls
  SUPERVISOR: [
    '/dashboard',
    '/yarn',  // Overview only
    '/yarn/types',
    '/yarn/ledger',
    '/production/**',
    '/rolls/**',
    '/dyeing/**',
    '/machines/**',
    '/needles/**',
    '/reports/**',
    '/settings',  // Profile only
  ],

  // Operator - record production, view yarn
  OPERATOR: [
    '/dashboard',
    '/yarn',  // View only
    '/yarn/types',
    '/yarn/ledger',
    '/production',
    '/production/daily',
    '/rolls',
    '/machines',
    '/machines/list',
    '/needles',
    '/needles/stock',
    '/needles/machines',
    '/settings',  // Profile only
  ],

  // Accountant - full finance access
  ACCOUNTANT: [
    '/dashboard',
    '/finance/**',
    '/receivables/**',
    '/payables/**',
    '/cheques/**',
    '/sales/**',
    '/reports/**',
    '/settings',  // Profile only
  ],

  // Viewer - read-only access to most modules
  VIEWER: [
    '/dashboard',
    '/products',
    '/stock',
    '/inventory/items',
    '/yarn',
    '/yarn/types',
    '/yarn/ledger',
    '/production',
    '/rolls',
    '/dyeing',
    '/machines',
    '/machines/list',
    '/needles',
    '/finance',
    '/receivables',
    '/payables',
    '/reports/**',
    '/settings',  // Profile only
  ],
};

// Navigation items that each role can see (used for filtering sidebar)
export const roleNavigationAccess: Record<UserRole, string[]> = {
  // SUPER_ADMIN has full access to all navigation items
  SUPER_ADMIN: [
    'Dashboard',
    'Products',
    'Stock',
    'Yarn',
    'Production',
    'Machines',
    'Needles',
    'Finance',
    'Reports',
    'General',
    'Super Admin',
    'Settings',
  ],

  FACTORY_OWNER: [
    'Dashboard',
    'Products',
    'Stock',
    'Yarn',
    'Production',
    'Machines',
    'Needles',
    'Finance',
    'Reports',
    'General',
    'Settings',
  ],

  MANAGER: [
    'Dashboard',
    'Products',
    'Stock',
    'Yarn',
    'Production',
    'Machines',
    'Needles',
    'Finance',
    'Reports',
    'Settings',
  ],

  SUPERVISOR: [
    'Dashboard',
    'Yarn',
    'Production',
    'Machines',
    'Needles',
    'Reports',
    'Settings',
  ],

  OPERATOR: [
    'Dashboard',
    'Yarn',
    'Production',
    'Machines',
    'Needles',
    'Settings',
  ],

  ACCOUNTANT: [
    'Dashboard',
    'Finance',
    'Reports',
    'Settings',
  ],

  VIEWER: [
    'Dashboard',
    'Products',
    'Stock',
    'Yarn',
    'Production',
    'Machines',
    'Needles',
    'Finance',
    'Reports',
    'Settings',
  ],
};

/**
 * Check if a role has access to a specific route
 */
export function hasRouteAccess(role: UserRole | undefined, pathname: string): boolean {
  if (!role) return false;

  const allowedPatterns = roleRouteAccess[role] || [];

  return allowedPatterns.some(pattern => {
    // Convert pattern to regex
    // Use placeholder to prevent ** replacement from being affected by * replacement
    const regexPattern = pattern
      .replace(/\*\*/g, '<<GLOB>>')      // Temporary placeholder for **
      .replace(/\*/g, '[^/]+')            // * matches single segment
      .replace(/<<GLOB>>/g, '.*');        // ** matches anything (including /)

    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(pathname);
  });
}

/**
 * Check if a role can see a navigation item
 */
export function canSeeNavItem(role: UserRole | undefined, navLabel: string): boolean {
  if (!role) return false;

  const allowedNavItems = roleNavigationAccess[role] || [];
  return allowedNavItems.includes(navLabel);
}

/**
 * Get the default redirect path for a role after login
 */
export function getDefaultPathForRole(role: UserRole): string {
  return '/dashboard';  // All roles can access dashboard
}

/**
 * Get a list of routes that are write-only (can modify) for a role
 * This is used to show/hide action buttons
 */
export const roleWriteAccess: Partial<Record<UserRole, string[]>> = {
  SUPER_ADMIN: ['/**'],
  FACTORY_OWNER: ['/**'],
  MANAGER: [
    '/products/**',
    '/stock/**',
    '/inventory/**',
    '/yarn/**',
    '/production/**',
    '/rolls/**',
    '/dyeing/**',
    '/machines/**',
    '/needles/**',
  ],
  SUPERVISOR: [
    '/production/**',
    '/rolls/**',
    '/dyeing/**',
    '/machines/**',
    '/needles/**',
  ],
  OPERATOR: [
    '/production/daily',
    '/rolls',
    '/needles/stock',
  ],
  ACCOUNTANT: [
    '/finance/**',
    '/receivables/**',
    '/payables/**',
    '/cheques/**',
    '/sales/**',
  ],
  // VIEWER has no write access
};

/**
 * Check if a role can write/modify on a specific route
 */
export function hasWriteAccess(role: UserRole | undefined, pathname: string): boolean {
  if (!role) return false;
  if (role === 'VIEWER') return false;  // Viewers never have write access

  const writePatterns = roleWriteAccess[role] || [];

  return writePatterns.some(pattern => {
    // Use placeholder to prevent ** replacement from being affected by * replacement
    const regexPattern = pattern
      .replace(/\*\*/g, '<<GLOB>>')
      .replace(/\*/g, '[^/]+')
      .replace(/<<GLOB>>/g, '.*');

    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(pathname);
  });
}
