'use client';

import { useAuth } from '@/contexts/AuthContext';
import { StatsCard } from '@/components/molecules/StatsCard';

export default function DashboardPage() {
  const { user } = useAuth();

  // Get greeting based on time
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-white">
          {getGreeting()}, {user?.fullName?.split(' ')[0] || 'User'}
        </h1>
        <p className="text-neutral-400 mt-1">
          Here's what's happening at your factory today
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Today's Production"
          value="2,450 kg"
          change="+12%"
          changeType="positive"
          icon="🏭"
        />
        <StatsCard
          title="Active Machines"
          value="42 / 50"
          change="84%"
          changeType="neutral"
          icon="⚙️"
        />
        <StatsCard
          title="Grey Stock"
          value="12,350 kg"
          change="+850 kg"
          changeType="positive"
          icon="📦"
        />
        <StatsCard
          title="Pending Dyeing"
          value="3,200 kg"
          change="8 batches"
          changeType="neutral"
          icon="🎨"
        />
      </div>

      {/* Role-specific sections */}
      {user?.role === 'FACTORY_OWNER' && <OwnerDashboard />}
      {user?.role === 'SUPERVISOR' && <SupervisorDashboard />}
      {user?.role === 'ACCOUNTANT' && <AccountantDashboard />}

      {/* Quick Actions */}
      <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <QuickAction title="Yarn Inward" icon="📦" href="/yarn/inward" />
          <QuickAction title="Production Log" icon="📝" href="/production/logs" />
          <QuickAction title="Create Roll" icon="🧵" href="/rolls/new" />
          <QuickAction title="New Order" icon="🛒" href="/sales/orders/new" />
        </div>
      </div>
    </div>
  );
}

function OwnerDashboard() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Outstanding Summary */}
      <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Outstanding Summary</h2>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-neutral-400">Receivables (0-30 days)</span>
            <span className="text-white font-medium">Rs. 2,450,000</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-neutral-400">Receivables (30+ days)</span>
            <span className="text-warning font-medium">Rs. 1,250,000</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-neutral-400">Vendor Payables</span>
            <span className="text-white font-medium">Rs. 3,100,000</span>
          </div>
        </div>
      </div>

      {/* Alerts */}
      <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Alerts</h2>
        <div className="space-y-3">
          <Alert type="warning" message="Low stock: Cotton 40s (250 kg remaining)" />
          <Alert type="error" message="Machine #12 breakdown reported" />
          <Alert type="info" message="5 rolls ready for dispatch" />
        </div>
      </div>
    </div>
  );
}

function SupervisorDashboard() {
  return (
    <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
      <h2 className="text-lg font-semibold text-white mb-4">Machine Status</h2>
      <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
        {Array.from({ length: 50 }, (_, i) => (
          <div
            key={i}
            className={`aspect-square rounded-lg flex items-center justify-center text-xs font-medium ${
              i < 42
                ? 'bg-success/20 text-success'
                : i < 45
                ? 'bg-warning/20 text-warning'
                : 'bg-error/20 text-error'
            }`}
          >
            {i + 1}
          </div>
        ))}
      </div>
      <div className="flex gap-4 mt-4 text-sm">
        <span className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-success"></span>
          Running (42)
        </span>
        <span className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-warning"></span>
          Idle (3)
        </span>
        <span className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-error"></span>
          Down (5)
        </span>
      </div>
    </div>
  );
}

function AccountantDashboard() {
  return (
    <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
      <h2 className="text-lg font-semibold text-white mb-4">Today's Transactions</h2>
      <div className="space-y-3">
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
  icon: string;
  href: string;
}) {
  return (
    <a
      href={href}
      className="flex flex-col items-center gap-2 p-4 rounded-xl bg-factory-gray hover:bg-factory-light transition-colors border border-factory-border"
    >
      <span className="text-2xl">{icon}</span>
      <span className="text-sm text-neutral-300">{title}</span>
    </a>
  );
}

function Alert({
  type,
  message,
}: {
  type: 'warning' | 'error' | 'info';
  message: string;
}) {
  const colors = {
    warning: 'border-warning/50 bg-warning/10 text-warning',
    error: 'border-error/50 bg-error/10 text-error',
    info: 'border-primary-500/50 bg-primary-500/10 text-primary-400',
  };

  return (
    <div className={`px-4 py-2 rounded-lg border ${colors[type]}`}>
      {message}
    </div>
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
  return (
    <div className="flex justify-between items-center">
      <div>
        <p className="text-white">{party}</p>
        <p className="text-sm text-neutral-400">
          {type === 'credit' ? 'Payment received' : 'Payment made'}
        </p>
      </div>
      <span
        className={`font-medium ${
          type === 'credit' ? 'text-success' : 'text-error'
        }`}
      >
        {type === 'credit' ? '+' : '-'} Rs. {amount.toLocaleString()}
      </span>
    </div>
  );
}
