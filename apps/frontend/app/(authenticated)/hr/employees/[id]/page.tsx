'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/atoms/Button';
import { useToast } from '@/contexts/ToastContext';
import {
  employeesApi,
  Employee,
  Attendance,
  Leave,
  Salary,
} from '@/lib/api/hr';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Briefcase,
  Banknote,
  CreditCard,
  Clock,
} from 'lucide-react';

type TabId = 'overview' | 'attendance' | 'leaves' | 'salaries';

type EmployeeWithRelations = Employee & {
  attendances?: Attendance[];
  leaves?: Leave[];
  salaries?: Salary[];
};

const statusColors: Record<string, { bg: string; text: string }> = {
  ACTIVE: { bg: 'bg-success/20', text: 'text-success' },
  ON_LEAVE: { bg: 'bg-warning/20', text: 'text-warning' },
  PROBATION: { bg: 'bg-info/20', text: 'text-info' },
  RESIGNED: { bg: 'bg-neutral-500/20', text: 'text-neutral-400' },
  TERMINATED: { bg: 'bg-error/20', text: 'text-error' },
};

const statusLabels: Record<string, string> = {
  ACTIVE: 'Active',
  ON_LEAVE: 'On Leave',
  PROBATION: 'Probation',
  RESIGNED: 'Resigned',
  TERMINATED: 'Terminated',
};

const attendanceColors: Record<string, { bg: string; text: string }> = {
  PRESENT: { bg: 'bg-success/20', text: 'text-success' },
  ABSENT: { bg: 'bg-error/20', text: 'text-error' },
  HALF_DAY: { bg: 'bg-warning/20', text: 'text-warning' },
  LEAVE: { bg: 'bg-info/20', text: 'text-info' },
  HOLIDAY: { bg: 'bg-neutral-500/20', text: 'text-neutral-400' },
  LATE: { bg: 'bg-warning/20', text: 'text-warning' },
};

const leaveStatusColors: Record<string, { bg: string; text: string }> = {
  PENDING: { bg: 'bg-warning/20', text: 'text-warning' },
  APPROVED: { bg: 'bg-success/20', text: 'text-success' },
  REJECTED: { bg: 'bg-error/20', text: 'text-error' },
  CANCELLED: { bg: 'bg-neutral-500/20', text: 'text-neutral-400' },
};

const salaryStatusColors: Record<string, { bg: string; text: string }> = {
  DRAFT: { bg: 'bg-neutral-500/20', text: 'text-neutral-400' },
  PENDING: { bg: 'bg-warning/20', text: 'text-warning' },
  APPROVED: { bg: 'bg-info/20', text: 'text-info' },
  PAID: { bg: 'bg-success/20', text: 'text-success' },
};

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const formatPKR = (amount: number) =>
  new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    maximumFractionDigits: 0,
  }).format(amount || 0);

const formatDate = (date?: string) =>
  date ? new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

const formatTime = (datetime?: string) => {
  if (!datetime) return '-';
  const d = new Date(datetime);
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
};

const calcTenure = (joiningDate: string) => {
  const start = new Date(joiningDate);
  const now = new Date();
  let years = now.getFullYear() - start.getFullYear();
  let months = now.getMonth() - start.getMonth();
  if (now.getDate() < start.getDate()) months -= 1;
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  if (years > 0 && months > 0) return `${years}y ${months}m`;
  if (years > 0) return `${years}y`;
  if (months > 0) return `${months}m`;
  const days = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return `${Math.max(days, 0)}d`;
};

export default function EmployeeProfilePage() {
  const params = useParams();
  const employeeId = params.id as string;
  const { showToast } = useToast();

  const [employee, setEmployee] = useState<EmployeeWithRelations | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await employeesApi.getById(parseInt(employeeId));
        setEmployee(data);
      } catch (err: any) {
        const msg = err.response?.data?.error || 'Failed to load employee';
        setError(msg);
        showToast('error', msg);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [employeeId]);

  const stats = useMemo(() => {
    if (!employee) return { tenure: '-', leavesTaken: 0, attendanceCount: 0, lastNet: 0 };
    const approvedLeaves = (employee.leaves || []).filter((l) => l.status === 'APPROVED');
    const leavesTaken = approvedLeaves.reduce((sum, l) => sum + (l.days || 0), 0);
    const sortedSalaries = [...(employee.salaries || [])].sort(
      (a, b) => (b.year - a.year) * 12 + (b.month - a.month),
    );
    return {
      tenure: calcTenure(employee.joiningDate),
      leavesTaken,
      attendanceCount: (employee.attendances || []).length,
      lastNet: sortedSalaries[0]?.netSalary || 0,
    };
  }, [employee]);

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-4 bg-factory-gray rounded w-48" />
        <div className="h-8 bg-factory-gray rounded w-1/3" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-factory-gray rounded-xl" />
          ))}
        </div>
        <div className="h-64 bg-factory-gray rounded-2xl" />
      </div>
    );
  }

  if (error || !employee) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-error mb-4">{error || 'Employee not found'}</p>
          <Link href="/hr/employees">
            <Button>Back to Employees</Button>
          </Link>
        </div>
      </div>
    );
  }

  const colors = statusColors[employee.status] || statusColors.ACTIVE;

  const tabs: { id: TabId; label: string; count?: number }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'attendance', label: 'Attendance', count: stats.attendanceCount },
    { id: 'leaves', label: 'Leaves', count: (employee.leaves || []).length },
    { id: 'salaries', label: 'Salaries', count: (employee.salaries || []).length },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm">
            <Link href="/hr" className="text-neutral-400 hover:text-white">HR</Link>
            <span className="text-neutral-600">/</span>
            <Link href="/hr/employees" className="text-neutral-400 hover:text-white">Employees</Link>
            <span className="text-neutral-600">/</span>
            <span className="text-white font-mono">{employee.code}</span>
          </div>
          <div className="flex items-center gap-4 mt-3">
            <div className="w-14 h-14 rounded-full bg-primary-500/20 flex items-center justify-center flex-shrink-0">
              <span className="text-primary-400 text-xl font-medium">
                {employee.fullName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-semibold text-white truncate">{employee.fullName}</h1>
                <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${colors.bg} ${colors.text}`}>
                  {statusLabels[employee.status]}
                </span>
              </div>
              <p className="text-neutral-400 mt-1">
                {employee.designation?.name || '-'}
                {employee.department ? ` · ${employee.department}` : ''}
              </p>
            </div>
          </div>
        </div>
        <div className="flex gap-3 flex-shrink-0">
          <Link href="/hr/employees">
            <Button variant="ghost">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-factory-dark rounded-xl border border-factory-border p-4">
          <p className="text-2xl font-bold text-white">{stats.tenure}</p>
          <p className="text-sm text-neutral-400">Tenure</p>
        </div>
        <div className="bg-factory-dark rounded-xl border border-factory-border p-4">
          <p className="text-2xl font-bold text-white">{formatPKR(employee.baseSalary)}</p>
          <p className="text-sm text-neutral-400">Base Salary</p>
        </div>
        <div className="bg-factory-dark rounded-xl border border-factory-border p-4">
          <p className="text-2xl font-bold text-warning">{stats.leavesTaken}</p>
          <p className="text-sm text-neutral-400">Leaves Taken</p>
        </div>
        <div className="bg-factory-dark rounded-xl border border-factory-border p-4">
          <p className="text-2xl font-bold text-success">{formatPKR(stats.lastNet)}</p>
          <p className="text-sm text-neutral-400">Last Net Salary</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-factory-border">
        <div className="flex gap-1 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors relative ${
                activeTab === tab.id ? 'text-primary-400' : 'text-neutral-400 hover:text-white'
              }`}
            >
              {tab.label}
              {typeof tab.count === 'number' && (
                <span className="ml-2 px-1.5 py-0.5 text-xs rounded-full bg-factory-gray text-neutral-300">
                  {tab.count}
                </span>
              )}
              {activeTab === tab.id && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && <OverviewTab employee={employee} />}
      {activeTab === 'attendance' && <AttendanceTab attendances={employee.attendances || []} />}
      {activeTab === 'leaves' && <LeavesTab leaves={employee.leaves || []} />}
      {activeTab === 'salaries' && <SalariesTab salaries={employee.salaries || []} />}
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value?: string | number | null }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="w-4 h-4 text-neutral-500 mt-1 flex-shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-neutral-400">{label}</p>
        <p className="text-sm text-white break-words">{value || '-'}</p>
      </div>
    </div>
  );
}

function OverviewTab({ employee }: { employee: EmployeeWithRelations }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Personal Info */}
      <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Personal Information</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InfoRow icon={User} label="Full Name" value={employee.fullName} />
          {employee.fullNameUrdu && (
            <div className="flex items-start gap-3">
              <User className="w-4 h-4 text-neutral-500 mt-1 flex-shrink-0" />
              <div>
                <p className="text-xs text-neutral-400">Urdu Name</p>
                <p className="text-sm text-white" dir="rtl">{employee.fullNameUrdu}</p>
              </div>
            </div>
          )}
          <InfoRow icon={User} label="Father Name" value={employee.fatherName} />
          <InfoRow icon={CreditCard} label="CNIC" value={employee.cnic} />
          <InfoRow icon={Phone} label="Phone" value={employee.phone} />
          <InfoRow icon={Phone} label="Emergency Phone" value={employee.emergencyPhone} />
          <InfoRow icon={Mail} label="Email" value={employee.email} />
          <InfoRow icon={MapPin} label="City" value={employee.city} />
          {employee.address && (
            <div className="sm:col-span-2">
              <InfoRow icon={MapPin} label="Address" value={employee.address} />
            </div>
          )}
        </div>
      </div>

      {/* Employment Info */}
      <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Employment</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InfoRow icon={Briefcase} label="Employee Code" value={employee.code} />
          <InfoRow icon={Briefcase} label="Designation" value={employee.designation?.name} />
          <InfoRow icon={Briefcase} label="Department" value={employee.department} />
          <InfoRow icon={Calendar} label="Joining Date" value={formatDate(employee.joiningDate)} />
          <InfoRow icon={Calendar} label="Probation End" value={formatDate(employee.probationEndDate)} />
          <InfoRow icon={Calendar} label="Confirmation Date" value={formatDate(employee.confirmationDate)} />
          {employee.resignationDate && (
            <InfoRow icon={Calendar} label="Resignation Date" value={formatDate(employee.resignationDate)} />
          )}
          {employee.lastWorkingDate && (
            <InfoRow icon={Calendar} label="Last Working Date" value={formatDate(employee.lastWorkingDate)} />
          )}
        </div>
      </div>

      {/* Salary Info */}
      <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Compensation</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InfoRow icon={Banknote} label="Salary Type" value={employee.salaryType} />
          <InfoRow icon={Banknote} label="Base Salary" value={formatPKR(employee.baseSalary)} />
          {employee.hourlyRate ? (
            <InfoRow icon={Clock} label="Hourly Rate" value={formatPKR(employee.hourlyRate)} />
          ) : null}
          {employee.dailyRate ? (
            <InfoRow icon={Clock} label="Daily Rate" value={formatPKR(employee.dailyRate)} />
          ) : null}
          {employee.overtimeRate ? (
            <InfoRow icon={Clock} label="Overtime Rate" value={formatPKR(employee.overtimeRate)} />
          ) : null}
        </div>
      </div>

      {/* Bank Info */}
      <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Bank Details</h3>
        {employee.bankName || employee.bankAccountNo || employee.bankBranch ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InfoRow icon={Banknote} label="Bank Name" value={employee.bankName} />
            <InfoRow icon={CreditCard} label="Account Number" value={employee.bankAccountNo} />
            <InfoRow icon={Banknote} label="Branch" value={employee.bankBranch} />
          </div>
        ) : (
          <p className="text-sm text-neutral-400">No bank details on record.</p>
        )}
      </div>
    </div>
  );
}

function AttendanceTab({ attendances }: { attendances: Attendance[] }) {
  const sorted = [...attendances].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (sorted.length === 0) {
    return (
      <div className="bg-factory-dark rounded-2xl border border-factory-border p-12 text-center">
        <p className="text-neutral-400">No attendance records yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-factory-dark rounded-2xl border border-factory-border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-factory-border">
              <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">Date</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">Check In</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">Check Out</th>
              <th className="text-right px-6 py-4 text-sm font-medium text-neutral-400">Hours</th>
              <th className="text-right px-6 py-4 text-sm font-medium text-neutral-400">Overtime</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-factory-border">
            {sorted.map((a) => {
              const c = attendanceColors[a.status] || attendanceColors.PRESENT;
              return (
                <tr key={a.id} className="hover:bg-factory-gray transition-colors">
                  <td className="px-6 py-4 text-white">{formatDate(a.date)}</td>
                  <td className="px-6 py-4 text-neutral-300">{formatTime(a.checkIn)}</td>
                  <td className="px-6 py-4 text-neutral-300">{formatTime(a.checkOut)}</td>
                  <td className="px-6 py-4 text-right text-white">{a.hoursWorked?.toFixed(2) ?? '-'}</td>
                  <td className="px-6 py-4 text-right text-neutral-300">{a.overtimeHours?.toFixed(2) ?? '-'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${c.bg} ${c.text}`}>
                      {a.status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LeavesTab({ leaves }: { leaves: Leave[] }) {
  const sorted = [...leaves].sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());

  if (sorted.length === 0) {
    return (
      <div className="bg-factory-dark rounded-2xl border border-factory-border p-12 text-center">
        <p className="text-neutral-400">No leave records yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-factory-dark rounded-2xl border border-factory-border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-factory-border">
              <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">Type</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">Start</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">End</th>
              <th className="text-right px-6 py-4 text-sm font-medium text-neutral-400">Days</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">Reason</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-factory-border">
            {sorted.map((l) => {
              const c = leaveStatusColors[l.status] || leaveStatusColors.PENDING;
              return (
                <tr key={l.id} className="hover:bg-factory-gray transition-colors">
                  <td className="px-6 py-4 text-white">{l.leaveType?.name || '-'}</td>
                  <td className="px-6 py-4 text-neutral-300">{formatDate(l.startDate)}</td>
                  <td className="px-6 py-4 text-neutral-300">{formatDate(l.endDate)}</td>
                  <td className="px-6 py-4 text-right text-white">{l.days}</td>
                  <td className="px-6 py-4 text-neutral-300 max-w-xs truncate" title={l.reason}>
                    {l.reason || '-'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${c.bg} ${c.text}`}>
                      {l.status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SalariesTab({ salaries }: { salaries: Salary[] }) {
  const sorted = [...salaries].sort(
    (a, b) => (b.year - a.year) * 12 + (b.month - a.month),
  );

  if (sorted.length === 0) {
    return (
      <div className="bg-factory-dark rounded-2xl border border-factory-border p-12 text-center">
        <p className="text-neutral-400">No salary records yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-factory-dark rounded-2xl border border-factory-border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-factory-border">
              <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">Period</th>
              <th className="text-right px-6 py-4 text-sm font-medium text-neutral-400">Base</th>
              <th className="text-right px-6 py-4 text-sm font-medium text-neutral-400">Gross</th>
              <th className="text-right px-6 py-4 text-sm font-medium text-neutral-400">Deductions</th>
              <th className="text-right px-6 py-4 text-sm font-medium text-neutral-400">Net</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-factory-border">
            {sorted.map((s) => {
              const c = salaryStatusColors[s.status] || salaryStatusColors.DRAFT;
              return (
                <tr key={s.id} className="hover:bg-factory-gray transition-colors">
                  <td className="px-6 py-4 text-white">
                    {MONTH_NAMES[s.month - 1] || s.month} {s.year}
                  </td>
                  <td className="px-6 py-4 text-right text-neutral-300">{formatPKR(s.baseSalary)}</td>
                  <td className="px-6 py-4 text-right text-white">{formatPKR(s.grossSalary)}</td>
                  <td className="px-6 py-4 text-right text-error">-{formatPKR(s.totalDeductions)}</td>
                  <td className="px-6 py-4 text-right text-success font-medium">{formatPKR(s.netSalary)}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${c.bg} ${c.text}`}>
                      {s.status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
