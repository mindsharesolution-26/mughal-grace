'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/atoms/Button';
import { useToast } from '@/contexts/ToastContext';
import { employeesApi, attendanceApi, leavesApi, salariesApi, Leave, Salary } from '@/lib/api/hr';
import { Users, Calendar, Clock, Wallet, AlertCircle, CheckCircle, XCircle, TrendingUp } from 'lucide-react';

export default function HRDashboardPage() {
  const [employeeStats, setEmployeeStats] = useState({ total: 0, active: 0, onLeave: 0, probation: 0, resigned: 0 });
  const [attendanceStats, setAttendanceStats] = useState({ total: 0, present: 0, absent: 0, leave: 0, late: 0, unmarked: 0 });
  const [pendingLeaves, setPendingLeaves] = useState<Leave[]>([]);
  const [salaryStats, setSalaryStats] = useState({ pending: 0, approved: 0, paid: 0, totalPending: 0, totalPaid: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      const [empStats, attData, leaves, salStats] = await Promise.all([
        employeesApi.getStats(),
        attendanceApi.getDaily(),
        leavesApi.getPending(),
        salariesApi.getStats(),
      ]);
      setEmployeeStats(empStats);
      setAttendanceStats(attData.stats);
      setPendingLeaves(leaves.slice(0, 5));
      setSalaryStats(salStats);
    } catch (error: any) {
      showToast('error', error.response?.data?.error || 'Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproveLeave = async (id: number) => {
    try {
      await leavesApi.approve(id);
      showToast('success', 'Leave approved successfully');
      fetchDashboardData();
    } catch (error: any) {
      showToast('error', error.response?.data?.error || 'Failed to approve leave');
    }
  };

  const handleRejectLeave = async (id: number) => {
    try {
      await leavesApi.reject(id);
      showToast('success', 'Leave rejected');
      fetchDashboardData();
    } catch (error: any) {
      showToast('error', error.response?.data?.error || 'Failed to reject leave');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
        <span className="ml-3 text-neutral-400">Loading HR dashboard...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">HR Dashboard</h1>
          <p className="text-neutral-400 mt-1">Overview of human resources and payroll</p>
        </div>
        <div className="flex gap-3">
          <Link href="/hr/employees">
            <Button variant="secondary">View Employees</Button>
          </Link>
          <Link href="/hr/attendance">
            <Button>Mark Attendance</Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Employee Stats */}
        <div className="bg-factory-dark rounded-xl border border-factory-border p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary-500/20 flex items-center justify-center">
              <Users className="w-6 h-6 text-primary-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{employeeStats.total}</p>
              <p className="text-sm text-neutral-400">Total Employees</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-success"></span>
              <span className="text-neutral-400">Active: {employeeStats.active}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-warning"></span>
              <span className="text-neutral-400">On Leave: {employeeStats.onLeave}</span>
            </div>
          </div>
        </div>

        {/* Today's Attendance */}
        <div className="bg-factory-dark rounded-xl border border-factory-border p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-success/20 flex items-center justify-center">
              <Clock className="w-6 h-6 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{attendanceStats.present}</p>
              <p className="text-sm text-neutral-400">Present Today</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-error"></span>
              <span className="text-neutral-400">Absent: {attendanceStats.absent}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-warning"></span>
              <span className="text-neutral-400">Leave: {attendanceStats.leave}</span>
            </div>
          </div>
        </div>

        {/* Pending Leave Requests */}
        <div className="bg-factory-dark rounded-xl border border-factory-border p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-warning/20 flex items-center justify-center">
              <Calendar className="w-6 h-6 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{pendingLeaves.length}</p>
              <p className="text-sm text-neutral-400">Pending Leaves</p>
            </div>
          </div>
          <div className="mt-4">
            <Link href="/hr/leaves">
              <Button variant="ghost" size="sm" className="w-full">
                View All Requests
              </Button>
            </Link>
          </div>
        </div>

        {/* Salary Stats */}
        <div className="bg-factory-dark rounded-xl border border-factory-border p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-info/20 flex items-center justify-center">
              <Wallet className="w-6 h-6 text-info" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{salaryStats.pending}</p>
              <p className="text-sm text-neutral-400">Pending Salaries</p>
            </div>
          </div>
          <div className="mt-4">
            <Link href="/hr/salaries">
              <Button variant="ghost" size="sm" className="w-full">
                Process Payroll
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Actions & Pending Leaves */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            <Link href="/hr/employees?new=true">
              <Button variant="secondary" className="w-full justify-start">
                <Users className="w-4 h-4 mr-2" /> Add Employee
              </Button>
            </Link>
            <Link href="/hr/attendance">
              <Button variant="secondary" className="w-full justify-start">
                <Clock className="w-4 h-4 mr-2" /> Daily Attendance
              </Button>
            </Link>
            <Link href="/hr/salaries/generate">
              <Button variant="secondary" className="w-full justify-start">
                <Wallet className="w-4 h-4 mr-2" /> Generate Payroll
              </Button>
            </Link>
            <Link href="/hr/designations">
              <Button variant="secondary" className="w-full justify-start">
                <TrendingUp className="w-4 h-4 mr-2" /> Designations
              </Button>
            </Link>
          </div>
        </div>

        {/* Pending Leave Requests */}
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Pending Leave Requests</h2>
            <Link href="/hr/leaves">
              <Button variant="ghost" size="sm">View All</Button>
            </Link>
          </div>
          {pendingLeaves.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-success mx-auto mb-2" />
              <p className="text-neutral-400">No pending leave requests</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingLeaves.map((leave) => (
                <div key={leave.id} className="flex items-center justify-between p-3 bg-factory-gray rounded-xl">
                  <div>
                    <p className="text-white font-medium">{leave.employee?.fullName}</p>
                    <p className="text-sm text-neutral-400">
                      {leave.leaveType?.name} - {leave.days} day(s)
                    </p>
                    <p className="text-xs text-neutral-500">
                      {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApproveLeave(leave.id)}
                      className="p-2 rounded-lg bg-success/20 text-success hover:bg-success/30 transition-colors"
                      title="Approve"
                    >
                      <CheckCircle className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleRejectLeave(leave.id)}
                      className="p-2 rounded-lg bg-error/20 text-error hover:bg-error/30 transition-colors"
                      title="Reject"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Attendance Unmarked Warning */}
      {attendanceStats.unmarked > 0 && (
        <div className="bg-warning/10 border border-warning/20 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-warning" />
            <div>
              <p className="text-white font-medium">{attendanceStats.unmarked} employees have unmarked attendance today</p>
              <p className="text-sm text-neutral-400">Please mark their attendance to keep records updated</p>
            </div>
          </div>
          <Link href="/hr/attendance">
            <Button>Mark Attendance</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
