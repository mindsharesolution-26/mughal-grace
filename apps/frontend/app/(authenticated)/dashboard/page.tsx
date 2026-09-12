'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { StatsCard } from '@/components/molecules/StatsCard';
import { api } from '@/lib/api/client';
import { rollsApi } from '@/lib/api/rolls';
import { machinesApi } from '@/lib/api/machines';
import type { RollStatsOverview } from '@/lib/types/roll';
import type { MachineStats, Machine } from '@/lib/types/machine';
import {
  Factory,
  Settings,
  Package,
  Palette,
  ScrollText,
  ShoppingCart,
  ArrowDownToLine,
  ArrowUpRight,
  AlertTriangle,
  AlertCircle,
  Info,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';

const kg = (value: number) =>
  value.toLocaleString(undefined, { maximumFractionDigits: 0 });

export default function DashboardPage() {
  const { user } = useAuth();
  const [rollStats, setRollStats] = useState<RollStatsOverview | null>(null);
  const [machineStats, setMachineStats] = useState<MachineStats | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([rollsApi.getStatsOverview(), machinesApi.getStats()]).then(
      ([rolls, machines]) => {
        if (cancelled) return;
        if (rolls.status === 'fulfilled') setRollStats(rolls.value);
        if (machines.status === 'fulfilled') setMachineStats(machines.value);
      }
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const countOf = (status: keyof RollStatsOverview['byStatus']) =>
    rollStats?.byStatus?.[status]?.count ?? 0;
  const weightOf = (status: keyof RollStatsOverview['byStatus']) =>
    rollStats?.byStatus?.[status]?.weight ?? 0;

  const pendingDyeingWeight = weightOf('SENT_FOR_DYEING') + weightOf('AT_DYEING');
  const pendingDyeingCount = countOf('SENT_FOR_DYEING') + countOf('AT_DYEING');
  const operational = machineStats?.byStatus?.operational ?? 0;
  const totalMachines = machineStats?.total ?? 0;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="space-y-6 animate-glass-rise">
      {/* Hero greeting */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <p className="text-[11px] tracking-[0.2em] uppercase text-neutral-500 font-medium mb-2">
            {today}
          </p>
          <h1 className="text-3xl md:text-4xl font-semibold text-white tracking-tight leading-none">
            {getGreeting()},{' '}
            <span className="text-primary-300">
              {user?.fullName?.split(' ')[0] || 'User'}
            </span>
          </h1>
          <p className="text-neutral-400 mt-3 text-sm max-w-xl">
            Here's how the factory is running today. Live numbers, machine telemetry, and money flow at a glance.
          </p>
        </div>

        {/* Mini KPI dot row — at-a-glance pulse */}
        <div className="flex items-center gap-4 glass-panel rounded-full px-4 py-2.5">
          <PulseChip color="success" label="Production" />
          <span className="w-px h-3 bg-white/10" />
          <PulseChip color="warning" label="Maintenance" />
          <span className="w-px h-3 bg-white/10" />
          <PulseChip color="primary" label="Live" />
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Today's Production"
          value={kg(rollStats?.today.weightProduced ?? 0)}
          change={`${(rollStats?.today.rollsProduced ?? 0).toLocaleString()} rolls today`}
          changeType="positive"
          icon={<Factory className="w-5 h-5" />}
        />
        <StatsCard
          title="Active Machines"
          value={`${operational} / ${totalMachines}`}
          change={`${machineStats?.operationalRate ?? 0}% utilization`}
          changeType="neutral"
          icon={<Settings className="w-5 h-5" />}
        />
        <StatsCard
          title="Grey Stock"
          value={kg(weightOf('GREY_STOCK'))}
          change={`${countOf('GREY_STOCK').toLocaleString()} rolls`}
          changeType="positive"
          icon={<Package className="w-5 h-5" />}
        />
        <StatsCard
          title="Pending Dyeing"
          value={kg(pendingDyeingWeight)}
          change={`${pendingDyeingCount.toLocaleString()} rolls`}
          changeType="neutral"
          icon={<Palette className="w-5 h-5" />}
        />
      </div>

      {/* Role-specific sections */}
      {user?.role === 'FACTORY_OWNER' && (
        <OwnerDashboard rollStats={rollStats} machineStats={machineStats} />
      )}
      {user?.role === 'SUPERVISOR' && <SupervisorDashboard />}
      {user?.role === 'ACCOUNTANT' && <AccountantDashboard />}

      {/* Quick Actions */}
      <div className="glass-panel rounded-2xl p-6">
        <div className="flex items-baseline justify-between mb-5">
          <h2 className="text-base font-semibold text-white">Quick Actions</h2>
          <span className="text-[11px] tracking-wider uppercase text-neutral-500">
            Most-used flows
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <QuickAction
            title="Yarn Inward"
            icon={<ArrowDownToLine className="w-4 h-4" />}
            href="/yarn/inward"
          />
          <QuickAction
            title="Daily Production"
            icon={<Factory className="w-4 h-4" />}
            href="/production/daily"
          />
          <QuickAction
            title="New Roll"
            icon={<ScrollText className="w-4 h-4" />}
            href="/rolls/new"
          />
          <QuickAction
            title="New Order"
            icon={<ShoppingCart className="w-4 h-4" />}
            href="/sales/orders/new"
          />
        </div>
      </div>
    </div>
  );
}

interface SalesOrderSummaryRow {
  orderDate: string;
  balanceAmount: string | number;
  paymentStatus: string;
}

const rupees = (value: number) =>
  `Rs. ${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

function OwnerDashboard({
  rollStats,
  machineStats,
}: {
  rollStats: RollStatsOverview | null;
  machineStats: MachineStats | null;
}) {
  const [receivables, setReceivables] = useState({ current: 0, overdue: 0 });

  // Receivables are derived from unsettled sales orders, split on the 30-day
  // mark. There is no payables endpoint yet, so that row is omitted rather
  // than shown with an invented figure.
  useEffect(() => {
    let cancelled = false;
    api
      .get<{ orders: SalesOrderSummaryRow[] }>('/sales/orders', { params: { limit: 200 } })
      .then(({ data }) => {
        if (cancelled) return;
        const cutoff = Date.now() - 30 * 86_400_000;
        let current = 0;
        let overdue = 0;
        for (const order of data.orders ?? []) {
          const balance = Number(order.balanceAmount) || 0;
          if (balance <= 0) continue;
          if (new Date(order.orderDate).getTime() < cutoff) overdue += balance;
          else current += balance;
        }
        setReceivables({ current, overdue });
      })
      .catch(() => {
        if (!cancelled) setReceivables({ current: 0, overdue: 0 });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const brokenMachines = machineStats?.byStatus?.breakdown ?? 0;
  const maintenanceDue = machineStats?.maintenanceDue ?? 0;
  const readyForDispatch = rollStats?.byStatus?.FINISHED_STOCK?.count ?? 0;

  const alerts: Array<{ type: 'warning' | 'error' | 'info'; message: string }> = [];
  if (brokenMachines > 0) {
    alerts.push({
      type: 'error',
      message: `${brokenMachines} machine${brokenMachines > 1 ? 's' : ''} reporting a breakdown`,
    });
  }
  if (maintenanceDue > 0) {
    alerts.push({
      type: 'warning',
      message: `${maintenanceDue} machine${maintenanceDue > 1 ? 's' : ''} due for maintenance`,
    });
  }
  if (readyForDispatch > 0) {
    alerts.push({
      type: 'info',
      message: `${readyForDispatch.toLocaleString()} rolls in finished stock, ready for dispatch`,
    });
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Outstanding Summary */}
      <div className="glass-panel rounded-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-white">
            Outstanding Summary
          </h2>
          <TrendingUp className="w-4 h-4 text-neutral-500" />
        </div>
        <div className="space-y-3">
          <LedgerRow
            label="Receivables · 0–30 days"
            value={rupees(receivables.current)}
            tone="default"
          />
          <LedgerRow
            label="Receivables · 30+ days"
            value={rupees(receivables.overdue)}
            tone="warning"
          />
          <div className="h-px bg-white/[0.06] my-2" />
          <LedgerRow
            label="Total Outstanding"
            value={rupees(receivables.current + receivables.overdue)}
            tone="default"
          />
        </div>
      </div>

      {/* Alerts */}
      <div className="glass-panel rounded-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-white">Alerts</h2>
          <span className="px-2 py-0.5 text-[10px] font-medium tracking-wider uppercase rounded-md bg-error/10 text-error border border-error/30">
            {alerts.length} Active
          </span>
        </div>
        <div className="space-y-2">
          {alerts.length === 0 ? (
            <p className="text-sm text-neutral-500">Nothing needs attention right now.</p>
          ) : (
            alerts.map((alert) => (
              <Alert key={alert.message} type={alert.type} message={alert.message} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

const MACHINE_TONE: Record<string, 'success' | 'warning' | 'error'> = {
  OPERATIONAL: 'success',
  IDLE: 'warning',
  MAINTENANCE: 'warning',
  BREAKDOWN: 'error',
  DECOMMISSIONED: 'error',
};

function SupervisorDashboard() {
  const [machines, setMachines] = useState<Machine[]>([]);

  useEffect(() => {
    let cancelled = false;
    machinesApi
      .getAll({ limit: 100, sortBy: 'machineNumber', sortOrder: 'asc' })
      .then((response) => {
        if (!cancelled) setMachines(response.machines ?? []);
      })
      .catch(() => {
        if (!cancelled) setMachines([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const running = machines.filter((m) => m.status === 'OPERATIONAL').length;
  const idle = machines.filter((m) => m.status === 'IDLE').length;
  const down = machines.filter(
    (m) => m.status === 'BREAKDOWN' || m.status === 'MAINTENANCE'
  ).length;

  const toneClasses: Record<string, string> = {
    success: 'bg-success/10 text-success border-success/30 hover:bg-success/15',
    warning: 'bg-warning/10 text-warning border-warning/30 hover:bg-warning/15',
    error: 'bg-error/10 text-error border-error/30 hover:bg-error/15',
  };

  return (
    <div className="glass-panel rounded-2xl p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-base font-semibold text-white">Machine Status</h2>
        <div className="flex gap-3 text-[10px] uppercase tracking-wider">
          <LegendDot tone="success" label={`Running ${running}`} />
          <LegendDot tone="warning" label={`Idle ${idle}`} />
          <LegendDot tone="error" label={`Down ${down}`} />
        </div>
      </div>
      {machines.length === 0 ? (
        <p className="text-sm text-neutral-500">No machines registered yet.</p>
      ) : (
        <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5">
          {machines.map((machine) => (
            <div
              key={machine.id}
              title={`${machine.machineNumber} · ${machine.name} · ${machine.status}`}
              className={`aspect-square rounded-lg flex items-center justify-center text-[11px] font-medium border tabular-nums transition-colors cursor-default ${
                toneClasses[MACHINE_TONE[machine.status] ?? 'warning']
              }`}
            >
              {machine.machineNumber.replace(/^\D+/, '')}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AccountantDashboard() {
  return (
    <div className="glass-panel rounded-2xl p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-base font-semibold text-white">
          Today's Transactions
        </h2>
        <span className="text-[11px] tracking-wider uppercase text-neutral-500">
          Live ledger
        </span>
      </div>
      <div className="space-y-1">
        <Transaction type="credit" party="ABC Textiles" amount={125000} />
        <Transaction type="debit" party="Yarn Vendor" amount={85000} />
        <Transaction type="credit" party="XYZ Fabrics" amount={95000} />
      </div>
    </div>
  );
}

function QuickAction({
  title,
  icon,
  href,
}: {
  title: string;
  icon: React.ReactNode;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group glass-subtle rounded-xl p-4 flex items-center gap-3 hover:bg-white/[0.06] hover:border-white/[0.12] transition-all"
    >
      <div className="w-9 h-9 rounded-lg bg-primary-500/10 border border-primary-500/20 flex items-center justify-center text-primary-300 group-hover:bg-primary-500/20 transition-colors">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{title}</p>
      </div>
      <ArrowUpRight className="w-3.5 h-3.5 text-neutral-600 group-hover:text-primary-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
    </Link>
  );
}

function PulseChip({
  color,
  label,
}: {
  color: 'success' | 'warning' | 'primary';
  label: string;
}) {
  const dotColor = {
    success: 'bg-success',
    warning: 'bg-warning',
    primary: 'bg-primary-400',
  }[color];
  return (
    <div className="flex items-center gap-2">
      <span className="relative flex h-1.5 w-1.5">
        <span
          className={`absolute inset-0 rounded-full ${dotColor} animate-ping opacity-60`}
        />
        <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${dotColor}`} />
      </span>
      <span className="text-[10px] font-medium tracking-wider uppercase text-neutral-300">
        {label}
      </span>
    </div>
  );
}

function LedgerRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'default' | 'warning' | 'success' | 'error';
}) {
  const valueColor = {
    default: 'text-white',
    warning: 'text-warning',
    success: 'text-success',
    error: 'text-error',
  }[tone];
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-neutral-400">{label}</span>
      <span className={`text-sm font-semibold tabular-nums ${valueColor}`}>
        {value}
      </span>
    </div>
  );
}

function Alert({
  type,
  message,
}: {
  type: 'warning' | 'error' | 'info';
  message: string;
}) {
  const tones = {
    warning: {
      bg: 'bg-warning/[0.06] border-warning/30',
      icon: <AlertTriangle className="w-3.5 h-3.5 text-warning" />,
      text: 'text-warning',
    },
    error: {
      bg: 'bg-error/[0.06] border-error/30',
      icon: <AlertCircle className="w-3.5 h-3.5 text-error" />,
      text: 'text-error',
    },
    info: {
      bg: 'bg-primary-500/[0.06] border-primary-500/30',
      icon: <Info className="w-3.5 h-3.5 text-primary-300" />,
      text: 'text-primary-200',
    },
  }[type];
  return (
    <div
      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border backdrop-blur-sm ${tones.bg}`}
    >
      {tones.icon}
      <span className={`text-xs ${tones.text}`}>{message}</span>
    </div>
  );
}

function LegendDot({
  tone,
  label,
}: {
  tone: 'success' | 'warning' | 'error';
  label: string;
}) {
  const c = {
    success: 'bg-success',
    warning: 'bg-warning',
    error: 'bg-error',
  }[tone];
  return (
    <span className="flex items-center gap-1.5 text-neutral-400">
      <span className={`w-1.5 h-1.5 rounded-full ${c}`} />
      <span>{label}</span>
    </span>
  );
}

function Transaction({
  type,
  party,
  amount,
}: {
  type: 'credit' | 'debit';
  party: string;
  amount: number;
}) {
  const isCredit = type === 'credit';
  return (
    <div className="flex justify-between items-center px-3 py-2.5 rounded-lg hover:bg-white/[0.03] transition-colors">
      <div className="flex items-center gap-3">
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center ${
            isCredit
              ? 'bg-success/10 text-success'
              : 'bg-error/10 text-error'
          }`}
        >
          {isCredit ? (
            <TrendingUp className="w-4 h-4" />
          ) : (
            <TrendingDown className="w-4 h-4" />
          )}
        </div>
        <div>
          <p className="text-sm text-white font-medium">{party}</p>
          <p className="text-[11px] text-neutral-500 uppercase tracking-wider">
            {isCredit ? 'Payment received' : 'Payment made'}
          </p>
        </div>
      </div>
      <span
        className={`text-sm font-semibold tabular-nums ${
          isCredit ? 'text-success' : 'text-error'
        }`}
      >
        {isCredit ? '+' : '−'} Rs. {amount.toLocaleString()}
      </span>
    </div>
  );
}
