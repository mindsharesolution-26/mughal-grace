'use client';

import { useState, ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils/cn';
import { canSeeNavItem } from '@/lib/config/roleAccess';
import { UserRole } from '@/lib/types/user';
import {
  LayoutDashboard,
  Package,
  Warehouse,
  Factory,
  ChevronDown,
  LogOut,
  Search,
  Bell,
  Menu,
  LucideIcon,
  Boxes,
  ArrowDownToLine,
  ArrowUpFromLine,
  FolderTree,
  Building2,
  ArrowLeftRight,
  AlertTriangle,
  ScrollText,
  Palette,
  Cog,
  Settings,
  Users,
  FileText,
  CreditCard,
  Receipt,
  Building,
  Layers,
  Ruler,
  Gem,
  Star,
  Drill,
  Wrench,
  ListChecks,
  Plus,
  CircleDashed,
  Shirt,
  FileSpreadsheet,
  ShoppingCart,
  Truck,
  Database,
  Award,
  User,
  List,
  Shield,
} from 'lucide-react';
import { ChatWidget } from '@/components/organisms/chat';

interface NavItem {
  label: string;
  href?: string;
  icon: LucideIcon;
  roles?: string[];
  children?: NavItem[];
}

const navigation: NavItem[] = [
  // 1. Dashboard
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },

  // 2. Products
  {
    label: 'Products',
    icon: Package,
    children: [
      { label: 'Products', href: '/products', icon: List },
      { label: 'Add Product', href: '/products/new', icon: Plus },
      { label: 'Product Ledger', href: '/products/ledger', icon: FileSpreadsheet },
    ],
  },

  // 3. Stock
  {
    label: 'Stock',
    icon: Warehouse,
    children: [
      { label: 'Overview', href: '/stock', icon: Warehouse },
      { label: 'Stock In', href: '/stock/in', icon: ArrowDownToLine },
      { label: 'Stock Out', href: '/stock/out', icon: ArrowUpFromLine },
      { label: 'Items', href: '/inventory/items', icon: Boxes },
      { label: 'Categories', href: '/inventory/categories', icon: FolderTree },
      { label: 'Warehouses', href: '/inventory/warehouses', icon: Building2 },
      { label: 'Transactions', href: '/inventory/transactions', icon: ArrowLeftRight },
      { label: 'Alerts', href: '/inventory/alerts', icon: AlertTriangle },
    ],
  },

  // 4. Yarn
  {
    label: 'Yarn',
    icon: CircleDashed,
    children: [
      { label: 'Overview', href: '/yarn', icon: CircleDashed },
      { label: 'Types', href: '/yarn/types', icon: Layers },
      { label: 'Purchase Orders', href: '/yarn/pay-orders', icon: FileText },
      { label: 'Inward', href: '/yarn/inward', icon: ArrowDownToLine },
      { label: 'Outward', href: '/yarn/outward', icon: ArrowUpFromLine },
      { label: 'Ledger', href: '/yarn/ledger', icon: FileSpreadsheet },
      { label: 'Vendors', href: '/yarn/vendors', icon: Truck },
    ],
  },

  // 5. Production
  {
    label: 'Production',
    icon: Factory,
    children: [
      { label: 'Overview', href: '/production', icon: Factory },
      { label: 'Daily Production', href: '/production/daily', icon: FileSpreadsheet },
      { label: 'Rolls', href: '/rolls', icon: ScrollText },
      { label: 'Dyeing', href: '/dyeing', icon: Palette },
    ],
  },

  // 6. Machines
  {
    label: 'Machines',
    icon: Cog,
    children: [
      { label: 'Overview', href: '/machines', icon: Cog },
      { label: 'All Machines', href: '/machines/list', icon: ListChecks },
      { label: 'Add Machine', href: '/machines/new', icon: Plus },
      { label: 'Maintenance', href: '/machines/maintenance', icon: Wrench },
    ],
  },

  // 7. Needles
  {
    label: 'Needles',
    icon: Drill,
    children: [
      { label: 'Overview', href: '/needles', icon: Drill },
      { label: 'Types', href: '/needles/types', icon: Layers },
      { label: 'Stock', href: '/needles/stock', icon: Boxes },
      { label: 'Machine Needles', href: '/needles/machines', icon: Cog },
      { label: 'Damage Reports', href: '/needles/damages', icon: AlertTriangle },
    ],
  },

  // 8. Finance
  {
    label: 'Finance',
    icon: CreditCard,
    children: [
      { label: 'Overview', href: '/finance', icon: CreditCard },
      { label: 'Receivables', href: '/receivables', icon: ArrowDownToLine },
      { label: 'Payables', href: '/payables', icon: ArrowUpFromLine },
      { label: 'Cheques', href: '/cheques', icon: FileSpreadsheet },
      { label: 'Sales', href: '/sales', icon: ShoppingCart },
    ],
  },

  // 9. Reports
  { label: 'Reports', href: '/reports', icon: FileText },

  // 10. General (Master Data - Core Factory Configuration)
  {
    label: 'General',
    icon: Database,
    children: [
      { label: 'Brands', href: '/settings/brands', icon: Award },
      { label: 'Departments', href: '/settings/departments', icon: Building },
      { label: 'Groups', href: '/settings/groups', icon: FolderTree },
      { label: 'Units', href: '/settings/units', icon: Ruler },
      { label: 'Materials', href: '/settings/materials', icon: Gem },
      { label: 'Colors', href: '/settings/colors', icon: Palette },
      { label: 'Grades', href: '/settings/grades', icon: Star },
      { label: 'Fabric Types', href: '/settings/fabric-types', icon: Layers },
      { label: 'Fabric Compositions', href: '/settings/fabric-compositions', icon: Layers },
      { label: 'Fabric Forms', href: '/settings/fabric-forms', icon: Layers },
      { label: 'Fabric Sizes', href: '/settings/fabric-sizes', icon: Ruler },
      { label: 'Machine Sizes', href: '/settings/machine-sizes', icon: Cog },
      { label: 'Fabrics', href: '/settings/fabrics', icon: Shirt },
      { label: 'Data Import', href: '/settings/import', icon: FileSpreadsheet },
    ],
  },

  // 11. Super Admin (Platform-Level Administration)
  {
    label: 'Super Admin',
    icon: Shield,
    roles: ['SUPER_ADMIN'],
    children: [
      { label: 'All Factories', href: '/admin/tenants', icon: Building2 },
      { label: 'All Users', href: '/admin/users', icon: Users },
    ],
  },

  // 12. Settings (System Configuration)
  {
    label: 'Settings',
    icon: Settings,
    roles: ['FACTORY_OWNER', 'MANAGER', 'SUPER_ADMIN'],
    children: [
      { label: 'Profile', href: '/settings', icon: User },
      { label: 'Users', href: '/users', icon: Users },
    ],
  },
];

export function AppShell({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const toggleMenu = (label: string) => {
    setExpandedMenus((prev) =>
      prev.includes(label)
        ? prev.filter((l) => l !== label)
        : [...prev, label]
    );
  };

  // Filter navigation based on role access
  const userRole = user?.role as UserRole | undefined;
  const filteredNav = navigation.filter((item) => {
    // First check role-based access from roleAccess config
    if (!canSeeNavItem(userRole, item.label)) {
      return false;
    }
    // Also check explicit roles if defined on the item
    if (item.roles && (!userRole || !item.roles.includes(userRole))) {
      return false;
    }
    return true;
  });

  const isChildActive = (item: NavItem) => {
    if (!item.children) return false;
    return item.children.some((child) => child.href && pathname.startsWith(child.href));
  };

  const renderNavItem = (item: NavItem, isChild = false) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedMenus.includes(item.label);
    const isActive = item.href ? pathname.startsWith(item.href) : isChildActive(item);
    const Icon = item.icon;

    if (hasChildren) {
      return (
        <div key={item.label}>
          <button
            onClick={() => toggleMenu(item.label)}
            className={cn(
              'w-full flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary-500/20 text-primary-400'
                : 'text-neutral-400 hover:bg-factory-gray hover:text-white'
            )}
          >
            <div className="flex items-center gap-3">
              <Icon className="w-5 h-5" />
              {item.label}
            </div>
            <ChevronDown
              className={cn(
                'w-4 h-4 transition-transform',
                isExpanded ? 'rotate-180' : ''
              )}
            />
          </button>
          {isExpanded && (
            <div className="ml-4 mt-1 space-y-1">
              {item.children!.map((child) => renderNavItem(child, true))}
            </div>
          )}
        </div>
      );
    }

    return (
      <Link
        key={item.href}
        href={item.href!}
        className={cn(
          'flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors',
          isChild && 'pl-6',
          isActive
            ? 'bg-primary-500/20 text-primary-400'
            : 'text-neutral-400 hover:bg-factory-gray hover:text-white'
        )}
        onClick={() => setSidebarOpen(false)}
      >
        <Icon className={cn('w-5 h-5', isChild && 'w-4 h-4')} />
        {item.label}
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-factory-black">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-full w-64 bg-factory-dark border-r border-factory-border transition-transform lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-factory-border">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center">
              <Factory className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-semibold text-white">
              Mughal Grace
            </span>
          </Link>
        </div>

        {/* Navigation */}
        <nav
          className="p-4 space-y-1 overflow-y-auto scrollbar-thin scrollbar-thumb-factory-border scrollbar-track-transparent"
          style={{ maxHeight: 'calc(100vh - 64px - 80px)' }}
        >
          {filteredNav.map((item) => renderNavItem(item))}
        </nav>

        {/* User section */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-factory-border bg-factory-dark">
          <div className="flex items-center gap-3 px-4 py-2">
            <div className="w-8 h-8 rounded-full bg-primary-500/20 flex items-center justify-center text-primary-400 text-sm font-medium">
              {user?.fullName?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {user?.fullName || 'User'}
              </p>
              <p className="text-xs text-neutral-500 truncate">
                {user?.role?.replace('_', ' ') || 'Role'}
              </p>
            </div>
            <button
              onClick={logout}
              className="p-2 text-neutral-400 hover:text-white hover:bg-factory-gray rounded-lg transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="h-16 bg-factory-dark border-b border-factory-border flex items-center justify-between px-4 lg:px-6">
          {/* Mobile menu button */}
          <button
            className="lg:hidden p-2 text-neutral-400 hover:text-white hover:bg-factory-gray rounded-lg"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-6 h-6" />
          </button>

          {/* Breadcrumb placeholder */}
          <div className="hidden lg:block" />

          {/* Search and actions */}
          <div className="flex items-center gap-4">
            {/* Search */}
            <div className="hidden md:flex items-center">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search..."
                  className="w-64 pl-10 pr-4 py-2 text-sm bg-factory-gray border border-factory-border rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
              </div>
            </div>

            {/* Notifications */}
            <button className="relative p-2 text-neutral-400 hover:text-white hover:bg-factory-gray rounded-lg">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-error rounded-full" />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-6">{children}</main>
      </div>

      {/* Chat Widget */}
      <ChatWidget />
    </div>
  );
}
