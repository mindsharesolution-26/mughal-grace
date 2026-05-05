'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { StatsCard } from '@/components/molecules/StatsCard';
import {
  accountsApi,
  AccountTreeNode,
  ChartOfAccount,
  ACCOUNT_GROUPS,
  AccountGroup,
  getAccountGroupLabel,
  getAccountGroupColor,
  getAccountTypeLabel,
} from '@/lib/api/accounts';
import { formatPKR } from '@/lib/types/vendor';
import { Loader2, Search, ChevronRight, ChevronDown, FolderOpen, FileText, Plus, Minus } from 'lucide-react';

// Tree Node Component
function AccountTreeItem({
  account,
  level = 0,
  expandedIds,
  toggleExpand,
  onSelect,
  selectedId,
}: {
  account: AccountTreeNode;
  level?: number;
  expandedIds: Set<number>;
  toggleExpand: (id: number) => void;
  onSelect: (account: AccountTreeNode) => void;
  selectedId: number | null;
}) {
  const hasChildren = account.children && account.children.length > 0;
  const isExpanded = expandedIds.has(account.id);
  const isSelected = selectedId === account.id;

  return (
    <div>
      <div
        className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
          isSelected
            ? 'bg-primary-500/20 border border-primary-500/30'
            : 'hover:bg-factory-gray'
        }`}
        style={{ paddingLeft: `${level * 20 + 12}px` }}
        onClick={() => onSelect(account)}
      >
        {/* Expand/Collapse button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (hasChildren) toggleExpand(account.id);
          }}
          className={`w-5 h-5 flex items-center justify-center ${
            hasChildren ? 'text-neutral-400 hover:text-white' : 'text-transparent'
          }`}
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )
          ) : null}
        </button>

        {/* Icon */}
        <span className="text-neutral-400">
          {account.isHeader ? (
            <FolderOpen className="w-4 h-4" />
          ) : (
            <FileText className="w-4 h-4" />
          )}
        </span>

        {/* Account code */}
        <span className="font-mono text-xs text-neutral-500 w-20 flex-shrink-0">
          {account.code}
        </span>

        {/* Account name */}
        <span
          className={`flex-1 ${
            account.isHeader ? 'font-semibold text-white' : 'text-neutral-300'
          }`}
        >
          {account.name}
          {account.nameUrdu && (
            <span className="text-neutral-500 mr-2 text-sm"> ({account.nameUrdu})</span>
          )}
        </span>

        {/* Balance (only for non-header accounts) */}
        {!account.isHeader && (
          <span
            className={`text-sm font-mono ${
              account.currentBalance >= 0 ? 'text-success' : 'text-error'
            }`}
          >
            {formatPKR(Math.abs(account.currentBalance))}
            {account.currentBalance < 0 && ' Cr'}
          </span>
        )}

        {/* Status indicator */}
        {!account.isActive && (
          <span className="px-2 py-0.5 text-xs bg-neutral-500/20 text-neutral-400 rounded">
            Inactive
          </span>
        )}
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div>
          {account.children.map((child) => (
            <AccountTreeItem
              key={child.id}
              account={child}
              level={level + 1}
              expandedIds={expandedIds}
              toggleExpand={toggleExpand}
              onSelect={onSelect}
              selectedId={selectedId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Account Detail Panel
function AccountDetailPanel({
  account,
  onClose,
}: {
  account: ChartOfAccount;
  onClose: () => void;
}) {
  const groupColor = getAccountGroupColor(account.accountGroup);

  return (
    <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span
              className={`px-2 py-1 text-xs font-medium rounded bg-${groupColor}-500/20 text-${groupColor}-400`}
              style={{
                backgroundColor:
                  groupColor === 'blue'
                    ? 'rgba(59, 130, 246, 0.2)'
                    : groupColor === 'red'
                      ? 'rgba(239, 68, 68, 0.2)'
                      : groupColor === 'purple'
                        ? 'rgba(168, 85, 247, 0.2)'
                        : groupColor === 'green'
                          ? 'rgba(34, 197, 94, 0.2)'
                          : 'rgba(249, 115, 22, 0.2)',
                color:
                  groupColor === 'blue'
                    ? 'rgb(96, 165, 250)'
                    : groupColor === 'red'
                      ? 'rgb(248, 113, 113)'
                      : groupColor === 'purple'
                        ? 'rgb(192, 132, 252)'
                        : groupColor === 'green'
                          ? 'rgb(74, 222, 128)'
                          : 'rgb(251, 146, 60)',
              }}
            >
              {getAccountGroupLabel(account.accountGroup)}
            </span>
            <span className="text-xs text-neutral-500">
              {getAccountTypeLabel(account.accountType)}
            </span>
          </div>
          <h3 className="text-xl font-semibold text-white">{account.name}</h3>
          {account.nameUrdu && (
            <p className="text-neutral-400 mt-1">{account.nameUrdu}</p>
          )}
          <p className="text-neutral-500 font-mono text-sm mt-1">{account.code}</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/finance/accounts/${account.id}/edit`}>
            <Button variant="secondary" size="sm">
              Edit
            </Button>
          </Link>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-factory-gray rounded-xl p-4">
          <p className="text-sm text-neutral-400 mb-1">Current Balance</p>
          <p
            className={`text-2xl font-semibold ${
              account.currentBalance >= 0 ? 'text-success' : 'text-error'
            }`}
          >
            {formatPKR(Math.abs(account.currentBalance))}
            {account.currentBalance < 0 && ' Cr'}
          </p>
        </div>
        <div className="bg-factory-gray rounded-xl p-4">
          <p className="text-sm text-neutral-400 mb-1">Opening Balance</p>
          <p className="text-2xl font-semibold text-white">
            {formatPKR(account.openingBalance)}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-neutral-500">Normal Balance</p>
            <p className="text-white">{account.normalBalance}</p>
          </div>
          <div>
            <p className="text-neutral-500">Currency</p>
            <p className="text-white">{account.currency}</p>
          </div>
          <div>
            <p className="text-neutral-500">Level</p>
            <p className="text-white">{account.level}</p>
          </div>
          <div>
            <p className="text-neutral-500">Status</p>
            <p className={account.isActive ? 'text-success' : 'text-error'}>
              {account.isActive ? 'Active' : 'Inactive'}
            </p>
          </div>
        </div>

        {account.isHeader && (
          <div className="pt-4 border-t border-factory-border">
            <p className="text-sm text-neutral-400 flex items-center gap-2">
              <FolderOpen className="w-4 h-4" />
              This is a header account (group heading)
            </p>
          </div>
        )}

        {account.isControlAccount && account.controlledEntity && (
          <div className="pt-4 border-t border-factory-border">
            <p className="text-sm text-neutral-400">
              Control Account for: <span className="text-white">{account.controlledEntity}</span>
            </p>
          </div>
        )}

        {account.isBankAccount && account.bankDetails && (
          <div className="pt-4 border-t border-factory-border">
            <p className="text-sm font-medium text-white mb-2">Bank Details</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {account.bankDetails.bankName && (
                <div>
                  <p className="text-neutral-500">Bank</p>
                  <p className="text-white">{account.bankDetails.bankName}</p>
                </div>
              )}
              {account.bankDetails.accountNumber && (
                <div>
                  <p className="text-neutral-500">Account #</p>
                  <p className="text-white font-mono">{account.bankDetails.accountNumber}</p>
                </div>
              )}
              {account.bankDetails.iban && (
                <div className="col-span-2">
                  <p className="text-neutral-500">IBAN</p>
                  <p className="text-white font-mono text-xs">{account.bankDetails.iban}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {account.description && (
          <div className="pt-4 border-t border-factory-border">
            <p className="text-sm text-neutral-500">Description</p>
            <p className="text-white mt-1">{account.description}</p>
          </div>
        )}

        {account.notes && (
          <div className="pt-4 border-t border-factory-border">
            <p className="text-sm text-neutral-500">Notes</p>
            <p className="text-neutral-300 mt-1">{account.notes}</p>
          </div>
        )}
      </div>

      <div className="mt-6 pt-4 border-t border-factory-border flex gap-2">
        <Link href={`/finance/accounts/${account.id}/ledger`} className="flex-1">
          <Button variant="secondary" className="w-full">
            View Ledger
          </Button>
        </Link>
        <Link href={`/finance/accounts/new?parentId=${account.id}`}>
          <Button variant="ghost">
            <Plus className="w-4 h-4 mr-1" />
            Add Child
          </Button>
        </Link>
      </div>
    </div>
  );
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<AccountTreeNode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<AccountGroup | 'ALL'>('ALL');
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [selectedAccount, setSelectedAccount] = useState<ChartOfAccount | null>(null);
  const [viewMode, setViewMode] = useState<'tree' | 'flat'>('tree');

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await accountsApi.getTree();
      setAccounts(data);
      // Auto-expand first level
      const firstLevelIds = data.map((a) => a.id);
      setExpandedIds(new Set(firstLevelIds));
    } catch (err: any) {
      setError(err.message || 'Failed to load accounts');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleExpand = (id: number) => {
    setExpandedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const expandAll = () => {
    const allIds = new Set<number>();
    const collectIds = (accts: AccountTreeNode[]) => {
      accts.forEach((a) => {
        if (a.children && a.children.length > 0) {
          allIds.add(a.id);
          collectIds(a.children);
        }
      });
    };
    collectIds(accounts);
    setExpandedIds(allIds);
  };

  const collapseAll = () => {
    setExpandedIds(new Set());
  };

  // Filter accounts by group
  const filteredAccounts = useMemo(() => {
    if (selectedGroup === 'ALL') return accounts;
    return accounts.filter((a) => a.accountGroup === selectedGroup);
  }, [accounts, selectedGroup]);

  // Search in accounts (flatten and filter)
  const searchedAccounts = useMemo(() => {
    if (!searchQuery) return filteredAccounts;

    const flattenAndFilter = (accts: AccountTreeNode[]): AccountTreeNode[] => {
      const result: AccountTreeNode[] = [];
      const search = (items: AccountTreeNode[]) => {
        items.forEach((item) => {
          const matches =
            item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (item.nameUrdu?.toLowerCase() || '').includes(searchQuery.toLowerCase());

          if (matches) {
            result.push({ ...item, children: [] });
          }

          if (item.children) {
            search(item.children);
          }
        });
      };
      search(accts);
      return result;
    };

    return flattenAndFilter(filteredAccounts);
  }, [filteredAccounts, searchQuery]);

  // Calculate summary stats
  const stats = useMemo(() => {
    const flatten = (accts: AccountTreeNode[]): AccountTreeNode[] => {
      const result: AccountTreeNode[] = [];
      const collect = (items: AccountTreeNode[]) => {
        items.forEach((item) => {
          result.push(item);
          if (item.children) collect(item.children);
        });
      };
      collect(accts);
      return result;
    };

    const allAccounts = flatten(accounts);
    const totalAccounts = allAccounts.length;
    const headerAccounts = allAccounts.filter((a) => a.isHeader).length;
    const activeAccounts = allAccounts.filter((a) => a.isActive && !a.isHeader).length;

    // Calculate totals by group (non-header accounts only)
    const assetTotal = allAccounts
      .filter((a) => a.accountGroup === 'ASSETS' && !a.isHeader)
      .reduce((sum, a) => sum + a.currentBalance, 0);

    const liabilityTotal = allAccounts
      .filter((a) => a.accountGroup === 'LIABILITIES' && !a.isHeader)
      .reduce((sum, a) => sum + a.currentBalance, 0);

    const equityTotal = allAccounts
      .filter((a) => a.accountGroup === 'EQUITY' && !a.isHeader)
      .reduce((sum, a) => sum + a.currentBalance, 0);

    return {
      totalAccounts,
      headerAccounts,
      activeAccounts,
      assetTotal,
      liabilityTotal,
      equityTotal,
    };
  }, [accounts]);

  const handleSelectAccount = async (account: AccountTreeNode) => {
    try {
      const fullAccount = await accountsApi.getById(account.id);
      setSelectedAccount(fullAccount);
    } catch (err) {
      console.error('Failed to load account details', err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm">
            <Link href="/finance" className="text-neutral-400 hover:text-white">
              Finance
            </Link>
            <span className="text-neutral-600">/</span>
            <span className="text-white">Chart of Accounts</span>
          </div>
          <h1 className="text-2xl font-semibold text-white mt-2">Chart of Accounts</h1>
          <p className="text-neutral-400 mt-1">
            Manage your accounting structure and account hierarchy
          </p>
        </div>
        <Link href="/finance/accounts/new">
          <Button>+ Add Account</Button>
        </Link>
      </div>

      {error && (
        <div className="bg-error/10 border border-error/20 rounded-xl p-4 text-error">
          {error}
          <Button variant="ghost" size="sm" onClick={loadAccounts} className="ml-4">
            Retry
          </Button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Accounts"
          value={stats.totalAccounts}
          icon="📊"
          change={`${stats.headerAccounts} headers`}
          changeType="neutral"
        />
        <StatsCard
          title="Total Assets"
          value={formatPKR(stats.assetTotal)}
          icon="💰"
        />
        <StatsCard
          title="Total Liabilities"
          value={formatPKR(stats.liabilityTotal)}
          icon="📉"
        />
        <StatsCard
          title="Total Equity"
          value={formatPKR(stats.equityTotal)}
          icon="🏦"
        />
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-factory-border overflow-x-auto">
        <button
          onClick={() => setSelectedGroup('ALL')}
          className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap ${
            selectedGroup === 'ALL'
              ? 'border-primary-500 text-primary-400'
              : 'border-transparent text-neutral-400 hover:text-white'
          }`}
        >
          All Groups
        </button>
        {ACCOUNT_GROUPS.map((group) => (
          <button
            key={group.value}
            onClick={() => setSelectedGroup(group.value)}
            className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap ${
              selectedGroup === group.value
                ? 'border-primary-500 text-primary-400'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            {group.label}
          </button>
        ))}
      </div>

      {/* Search and Controls */}
      <div className="bg-factory-dark rounded-2xl border border-factory-border p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
            <Input
              placeholder="Search by name, code, or Urdu name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={expandAll}>
              <Plus className="w-4 h-4 mr-1" />
              Expand All
            </Button>
            <Button variant="ghost" size="sm" onClick={collapseAll}>
              <Minus className="w-4 h-4 mr-1" />
              Collapse All
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content - Tree and Detail Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Account Tree */}
        <div className="lg:col-span-2 bg-factory-dark rounded-2xl border border-factory-border overflow-hidden">
          <div className="p-4 border-b border-factory-border">
            <h2 className="text-lg font-semibold text-white">Account Structure</h2>
            <p className="text-sm text-neutral-400 mt-1">
              {searchQuery
                ? `${searchedAccounts.length} accounts found`
                : `${stats.totalAccounts} accounts in ${stats.headerAccounts} groups`}
            </p>
          </div>

          <div className="p-2 max-h-[600px] overflow-y-auto">
            {searchedAccounts.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-neutral-400">
                  {searchQuery ? 'No accounts match your search.' : 'No accounts found.'}
                </p>
                <Link href="/finance/accounts/new">
                  <Button className="mt-4">Add Your First Account</Button>
                </Link>
              </div>
            ) : searchQuery ? (
              // Flat list for search results
              <div className="space-y-1">
                {searchedAccounts.map((account) => (
                  <div
                    key={account.id}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                      selectedAccount?.id === account.id
                        ? 'bg-primary-500/20 border border-primary-500/30'
                        : 'hover:bg-factory-gray'
                    }`}
                    onClick={() => handleSelectAccount(account)}
                  >
                    <span className="text-neutral-400">
                      {account.isHeader ? (
                        <FolderOpen className="w-4 h-4" />
                      ) : (
                        <FileText className="w-4 h-4" />
                      )}
                    </span>
                    <span className="font-mono text-xs text-neutral-500 w-20 flex-shrink-0">
                      {account.code}
                    </span>
                    <span className="flex-1 text-white">{account.name}</span>
                    {!account.isHeader && (
                      <span
                        className={`text-sm font-mono ${
                          account.currentBalance >= 0 ? 'text-success' : 'text-error'
                        }`}
                      >
                        {formatPKR(Math.abs(account.currentBalance))}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              // Tree view
              <div className="space-y-1">
                {searchedAccounts.map((account) => (
                  <AccountTreeItem
                    key={account.id}
                    account={account}
                    expandedIds={expandedIds}
                    toggleExpand={toggleExpand}
                    onSelect={handleSelectAccount}
                    selectedId={selectedAccount?.id ?? null}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Detail Panel */}
        <div className="lg:col-span-1">
          {selectedAccount ? (
            <AccountDetailPanel
              account={selectedAccount}
              onClose={() => setSelectedAccount(null)}
            />
          ) : (
            <div className="bg-factory-dark rounded-2xl border border-factory-border p-6 text-center">
              <div className="text-4xl mb-4">📋</div>
              <h3 className="text-lg font-medium text-white mb-2">Select an Account</h3>
              <p className="text-neutral-400 text-sm">
                Click on any account in the tree to view its details, balance, and options.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Tips */}
      <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
        <h3 className="text-lg font-semibold text-white mb-3">Chart of Accounts Tips</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="flex items-start gap-3">
            <span className="text-lg">📁</span>
            <p className="text-neutral-400">
              <strong className="text-white">Header accounts</strong> are group headings that organize sub-accounts. They don&apos;t have transactions.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-lg">🔗</span>
            <p className="text-neutral-400">
              <strong className="text-white">Control accounts</strong> link to entities like customers and vendors for automatic balance tracking.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-lg">⚖️</span>
            <p className="text-neutral-400">
              Assets and Expenses have <strong className="text-white">Debit</strong> normal balance. Liabilities, Equity, and Revenue have <strong className="text-white">Credit</strong>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
