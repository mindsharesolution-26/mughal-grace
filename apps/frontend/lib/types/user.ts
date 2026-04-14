// User roles matching backend UserRole enum
export type UserRole =
  | 'SUPER_ADMIN'
  | 'FACTORY_OWNER'
  | 'MANAGER'
  | 'SUPERVISOR'
  | 'OPERATOR'
  | 'ACCOUNTANT'
  | 'VIEWER';

// Roles that can be assigned by managers (excludes SUPER_ADMIN and FACTORY_OWNER)
export const assignableRoles: UserRole[] = [
  'MANAGER',
  'SUPERVISOR',
  'OPERATOR',
  'ACCOUNTANT',
  'VIEWER',
];

// Role display labels
export const roleLabels: Record<UserRole, string> = {
  SUPER_ADMIN: 'Super Admin',
  FACTORY_OWNER: 'Factory Owner',
  MANAGER: 'Manager',
  SUPERVISOR: 'Supervisor',
  OPERATOR: 'Operator',
  ACCOUNTANT: 'Accountant',
  VIEWER: 'Viewer',
};

// Role descriptions for UI
export const roleDescriptions: Record<UserRole, string> = {
  SUPER_ADMIN: 'Full system access',
  FACTORY_OWNER: 'Full access to all factory operations',
  MANAGER: 'Manage production, inventory, and view finances',
  SUPERVISOR: 'Manage production and rolls',
  OPERATOR: 'Record production and view yarn',
  ACCOUNTANT: 'Full access to financial modules',
  VIEWER: 'Read-only access to all modules',
};

// Role colors for badges
export const roleColors: Record<UserRole, { bg: string; text: string }> = {
  SUPER_ADMIN: { bg: 'bg-purple-500/20', text: 'text-purple-400' },
  FACTORY_OWNER: { bg: 'bg-primary-500/20', text: 'text-primary-400' },
  MANAGER: { bg: 'bg-blue-500/20', text: 'text-blue-400' },
  SUPERVISOR: { bg: 'bg-green-500/20', text: 'text-green-400' },
  OPERATOR: { bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
  ACCOUNTANT: { bg: 'bg-orange-500/20', text: 'text-orange-400' },
  VIEWER: { bg: 'bg-neutral-500/20', text: 'text-neutral-400' },
};

// User interface matching API response
export interface User {
  id: number;
  email: string;
  username: string;
  fullName: string;
  phone: string | null;
  role: UserRole;
  permissions: string[];
  isActive: boolean;
  isVerified: boolean;
  lastLogin: string | null;
  createdAt: string;
  updatedAt: string;
}

// Form data for creating a user
export interface CreateUserFormData {
  email: string;
  password: string;
  username: string;
  fullName: string;
  phone?: string;
  role: UserRole;
  permissions?: string[];
  isActive: boolean;
}

// Form data for updating a user
export interface UpdateUserFormData {
  fullName?: string;
  phone?: string | null;
  role?: UserRole;
  permissions?: string[];
  isActive?: boolean;
}

// Role info from API
export interface RoleInfo {
  value: UserRole;
  label: string;
  permissions: string[];
}
