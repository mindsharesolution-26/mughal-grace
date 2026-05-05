import { api } from './client';

// Account type options
export const ACCOUNT_TYPES = [
  { value: 'CASH', label: 'Cash', group: 'ASSETS' },
  { value: 'BANK', label: 'Bank', group: 'ASSETS' },
  { value: 'ACCOUNTS_RECEIVABLE', label: 'Accounts Receivable', group: 'ASSETS' },
  { value: 'INVENTORY', label: 'Inventory', group: 'ASSETS' },
  { value: 'FIXED_ASSET', label: 'Fixed Asset', group: 'ASSETS' },
  { value: 'OTHER_ASSET', label: 'Other Asset', group: 'ASSETS' },
  { value: 'ACCOUNTS_PAYABLE', label: 'Accounts Payable', group: 'LIABILITIES' },
  { value: 'SHORT_TERM_LIABILITY', label: 'Short Term Liability', group: 'LIABILITIES' },
  { value: 'LONG_TERM_LIABILITY', label: 'Long Term Liability', group: 'LIABILITIES' },
  { value: 'EQUITY', label: 'Equity', group: 'EQUITY' },
  { value: 'REVENUE', label: 'Revenue', group: 'REVENUE' },
  { value: 'COST_OF_GOODS_SOLD', label: 'Cost of Goods Sold', group: 'EXPENSE' },
  { value: 'OPERATING_EXPENSE', label: 'Operating Expense', group: 'EXPENSE' },
  { value: 'OTHER_INCOME', label: 'Other Income', group: 'REVENUE' },
  { value: 'OTHER_EXPENSE', label: 'Other Expense', group: 'EXPENSE' },
] as const;

export const ACCOUNT_GROUPS = [
  { value: 'ASSETS', label: 'Assets', color: 'blue' },
  { value: 'LIABILITIES', label: 'Liabilities', color: 'red' },
  { value: 'EQUITY', label: 'Equity', color: 'purple' },
  { value: 'REVENUE', label: 'Revenue', color: 'green' },
  { value: 'EXPENSE', label: 'Expenses', color: 'orange' },
] as const;

export const CONTROLLED_ENTITIES = [
  { value: 'CUSTOMER', label: 'Customer' },
  { value: 'YARN_VENDOR', label: 'Yarn Vendor' },
  { value: 'DYEING_VENDOR', label: 'Dyeing Vendor' },
  { value: 'GENERAL_SUPPLIER', label: 'General Supplier' },
  { value: 'EMPLOYEE', label: 'Employee' },
  { value: 'BANK', label: 'Bank' },
] as const;

export type AccountType = typeof ACCOUNT_TYPES[number]['value'];
export type AccountGroup = typeof ACCOUNT_GROUPS[number]['value'];
export type NormalBalance = 'DEBIT' | 'CREDIT';
export type ControlledEntity = typeof CONTROLLED_ENTITIES[number]['value'];

// Lightweight lookup type for dropdowns
export interface AccountLookup {
  id: number;
  code: string;
  name: string;
  nameUrdu?: string;
  accountType: AccountType;
  accountGroup: AccountGroup;
  level: number;
  isHeader: boolean;
  normalBalance: NormalBalance;
}

// Full account type
export interface ChartOfAccount {
  id: number;
  code: string;
  name: string;
  nameUrdu: string | null;
  accountType: AccountType;
  accountGroup: AccountGroup;
  parentId: number | null;
  level: number;
  isHeader: boolean;
  isSystemAccount: boolean;
  normalBalance: NormalBalance;
  currency: string;
  isControlAccount: boolean;
  controlledEntity: ControlledEntity | null;
  openingBalance: number;
  currentBalance: number;
  isBankAccount: boolean;
  bankDetails: {
    bankName?: string;
    accountNumber?: string;
    accountTitle?: string;
    branchCode?: string;
    iban?: string;
  } | null;
  description: string | null;
  notes: string | null;
  tags: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  parent?: {
    id: number;
    code: string;
    name: string;
  } | null;
  children?: ChartOfAccount[];
  _count?: {
    children: number;
  };
}

// Tree node type for hierarchical display
export interface AccountTreeNode extends ChartOfAccount {
  children: AccountTreeNode[];
}

export interface AccountFormData {
  code: string;
  name: string;
  nameUrdu?: string;
  accountType: AccountType;
  accountGroup: AccountGroup;
  parentId?: number | null;
  isHeader?: boolean;
  normalBalance?: NormalBalance;
  currency?: string;
  isControlAccount?: boolean;
  controlledEntity?: ControlledEntity | null;
  openingBalance?: number;
  isBankAccount?: boolean;
  bankDetails?: {
    bankName?: string;
    accountNumber?: string;
    accountTitle?: string;
    branchCode?: string;
    iban?: string;
  } | null;
  description?: string;
  notes?: string;
  tags?: string[];
  isActive?: boolean;
}

export interface AccountsSummary {
  accountGroup: AccountGroup;
  _sum: {
    currentBalance: number | null;
  };
  _count: {
    id: number;
  };
}

export const accountsApi = {
  /**
   * Get all accounts (flat list)
   */
  async getAll(options?: {
    search?: string;
    accountGroup?: AccountGroup;
    accountType?: AccountType;
    isActive?: boolean;
    isHeader?: boolean;
  }): Promise<ChartOfAccount[]> {
    const params = new URLSearchParams();
    if (options?.search) params.append('search', options.search);
    if (options?.accountGroup) params.append('accountGroup', options.accountGroup);
    if (options?.accountType) params.append('accountType', options.accountType);
    if (options?.isActive !== undefined) params.append('isActive', String(options.isActive));
    if (options?.isHeader !== undefined) params.append('isHeader', String(options.isHeader));

    const response = await api.get<{ data: ChartOfAccount[] }>(`/accounts?${params}`);
    return response.data.data;
  },

  /**
   * Get accounts as a tree structure
   */
  async getTree(options?: {
    accountGroup?: AccountGroup;
    isActive?: boolean;
  }): Promise<AccountTreeNode[]> {
    const params = new URLSearchParams();
    params.append('tree', 'true');
    if (options?.accountGroup) params.append('accountGroup', options.accountGroup);
    if (options?.isActive !== undefined) params.append('isActive', String(options.isActive));

    const response = await api.get<{ data: AccountTreeNode[] }>(`/accounts?${params}`);
    return response.data.data;
  },

  /**
   * Get lightweight lookup data for dropdowns
   */
  async getLookup(options?: {
    accountGroup?: AccountGroup;
    accountType?: AccountType;
    excludeHeaders?: boolean;
  }): Promise<AccountLookup[]> {
    const params = new URLSearchParams();
    if (options?.accountGroup) params.append('accountGroup', options.accountGroup);
    if (options?.accountType) params.append('accountType', options.accountType);
    if (options?.excludeHeaders) params.append('excludeHeaders', 'true');

    const response = await api.get<{ data: AccountLookup[] }>(`/accounts/lookup?${params}`);
    return response.data.data;
  },

  /**
   * Get account balances summary by group
   */
  async getSummary(): Promise<AccountsSummary[]> {
    const response = await api.get<{ data: AccountsSummary[] }>('/accounts/summary');
    return response.data.data;
  },

  /**
   * Get a single account by ID
   */
  async getById(id: number): Promise<ChartOfAccount> {
    const response = await api.get<{ data: ChartOfAccount }>(`/accounts/${id}`);
    return response.data.data;
  },

  /**
   * Create a new account
   */
  async create(data: AccountFormData): Promise<ChartOfAccount> {
    const response = await api.post<{ message: string; data: ChartOfAccount }>(
      '/accounts',
      data
    );
    return response.data.data;
  },

  /**
   * Update an existing account
   */
  async update(id: number, data: Partial<AccountFormData>): Promise<ChartOfAccount> {
    const response = await api.put<{ message: string; data: ChartOfAccount }>(
      `/accounts/${id}`,
      data
    );
    return response.data.data;
  },

  /**
   * Delete (deactivate) an account
   */
  async delete(id: number): Promise<void> {
    await api.delete(`/accounts/${id}`);
  },
};

// Helper function to get account type label
export function getAccountTypeLabel(type: AccountType): string {
  return ACCOUNT_TYPES.find((t) => t.value === type)?.label || type;
}

// Helper function to get account group label
export function getAccountGroupLabel(group: AccountGroup): string {
  return ACCOUNT_GROUPS.find((g) => g.value === group)?.label || group;
}

// Helper function to get account group color
export function getAccountGroupColor(group: AccountGroup): string {
  return ACCOUNT_GROUPS.find((g) => g.value === group)?.color || 'gray';
}

// Helper to filter account types by group
export function getAccountTypesByGroup(group: AccountGroup) {
  return ACCOUNT_TYPES.filter((t) => t.group === group);
}
