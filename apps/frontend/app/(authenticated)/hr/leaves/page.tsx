'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { useToast } from '@/contexts/ToastContext';
import { leavesApi, employeesApi, Leave, LeaveType, Employee } from '@/lib/api/hr';
import { Calendar, Check, X, Plus, Eye, Clock, FileText } from 'lucide-react';

const statusColors: Record<string, { bg: string; text: string }> = {
  PENDING: { bg: 'bg-warning/20', text: 'text-warning' },
  APPROVED: { bg: 'bg-success/20', text: 'text-success' },
  REJECTED: { bg: 'bg-error/20', text: 'text-error' },
  CANCELLED: { bg: 'bg-neutral-500/20', text: 'text-neutral-400' },
};

const statusLabels: Record<string, string> = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
};

export default function LeavesPage() {
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [employees, setEmployees] = useState<Pick<Employee, 'id' | 'code' | 'fullName'>[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [showModal, setShowModal] = useState(false);
  const [showTypesModal, setShowTypesModal] = useState(false);
  const [formData, setFormData] = useState({
    employeeId: 0,
    leaveTypeId: 0,
    startDate: '',
    endDate: '',
    reason: '',
  });
  const [newType, setNewType] = useState({ code: '', name: '', annualAllowance: 12, isPaid: true });
  const [isSaving, setIsSaving] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [leavesData, typesData, empData] = await Promise.all([
        leavesApi.getAll(),
        leavesApi.getTypes(),
        employeesApi.getLookup(),
      ]);
      setLeaves(leavesData);
      setLeaveTypes(typesData);
      setEmployees(empData);
    } catch (error: any) {
      showToast('error', error.response?.data?.error || 'Failed to load leaves');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredLeaves = useMemo(() => {
    if (filterStatus === 'ALL') return leaves;
    return leaves.filter((l) => l.status === filterStatus);
  }, [leaves, filterStatus]);

  const stats = useMemo(() => ({
    total: leaves.length,
    pending: leaves.filter((l) => l.status === 'PENDING').length,
    approved: leaves.filter((l) => l.status === 'APPROVED').length,
    rejected: leaves.filter((l) => l.status === 'REJECTED').length,
  }), [leaves]);

  const handleApprove = async (id: number) => {
    try {
      await leavesApi.approve(id);
      showToast('success', 'Leave approved');
      fetchData();
    } catch (error: any) {
      showToast('error', error.response?.data?.error || 'Failed to approve leave');
    }
  };

  const handleReject = async (id: number) => {
    try {
      await leavesApi.reject(id);
      showToast('success', 'Leave rejected');
      fetchData();
    } catch (error: any) {
      showToast('error', error.response?.data?.error || 'Failed to reject leave');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.employeeId || !formData.leaveTypeId || !formData.startDate || !formData.endDate) {
      showToast('error', 'Please fill in all required fields');
      return;
    }

    try {
      setIsSaving(true);
      await leavesApi.create(formData);
      showToast('success', 'Leave request submitted');
      setShowModal(false);
      setFormData({ employeeId: 0, leaveTypeId: 0, startDate: '', endDate: '', reason: '' });
      fetchData();
    } catch (error: any) {
      showToast('error', error.response?.data?.error || 'Failed to submit leave request');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newType.code || !newType.name) {
      showToast('error', 'Please fill in code and name');
      return;
    }

    try {
      setIsSaving(true);
      await leavesApi.createType(newType);
      showToast('success', 'Leave type created');
      setNewType({ code: '', name: '', annualAllowance: 12, isPaid: true });
      const types = await leavesApi.getTypes();
      setLeaveTypes(types);
    } catch (error: any) {
      showToast('error', error.response?.data?.error || 'Failed to create leave type');
    } finally {
      setIsSaving(false);
    }
  };

  const calculateDays = (start: string, end: string) => {
    if (!start || !end) return 0;
    const s = new Date(start);
    const e = new Date(end);
    return Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Leave Management</h1>
          <p className="text-neutral-400 mt-1">Manage employee leave requests</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => setShowTypesModal(true)}>
            <FileText className="w-4 h-4 mr-2" /> Leave Types
          </Button>
          <Button onClick={() => setShowModal(true)}>
            <Plus className="w-4 h-4 mr-2" /> New Request
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
          <span className="ml-3 text-neutral-400">Loading leaves...</span>
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-factory-dark rounded-xl border border-factory-border p-4">
              <p className="text-2xl font-bold text-white">{stats.total}</p>
              <p className="text-sm text-neutral-400">Total Requests</p>
            </div>
            <div className="bg-factory-dark rounded-xl border border-factory-border p-4">
              <p className="text-2xl font-bold text-warning">{stats.pending}</p>
              <p className="text-sm text-neutral-400">Pending</p>
            </div>
            <div className="bg-factory-dark rounded-xl border border-factory-border p-4">
              <p className="text-2xl font-bold text-success">{stats.approved}</p>
              <p className="text-sm text-neutral-400">Approved</p>
            </div>
            <div className="bg-factory-dark rounded-xl border border-factory-border p-4">
              <p className="text-2xl font-bold text-error">{stats.rejected}</p>
              <p className="text-sm text-neutral-400">Rejected</p>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-factory-dark rounded-2xl border border-factory-border p-4">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white"
            >
              <option value="ALL">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          {/* Table */}
          <div className="bg-factory-dark rounded-2xl border border-factory-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-factory-border">
                    <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">Employee</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">Leave Type</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">Duration</th>
                    <th className="text-center px-6 py-4 text-sm font-medium text-neutral-400">Days</th>
                    <th className="text-center px-6 py-4 text-sm font-medium text-neutral-400">Status</th>
                    <th className="text-right px-6 py-4 text-sm font-medium text-neutral-400">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-factory-border">
                  {filteredLeaves.map((leave) => {
                    const colors = statusColors[leave.status];
                    return (
                      <tr key={leave.id} className="hover:bg-factory-gray transition-colors">
                        <td className="px-6 py-4">
                          <p className="text-white font-medium">{leave.employee?.fullName}</p>
                          <p className="text-sm text-neutral-500">{leave.employee?.code}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded text-xs ${leave.leaveType?.isPaid ? 'bg-success/20 text-success' : 'bg-neutral-500/20 text-neutral-400'}`}>
                            {leave.leaveType?.name}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-neutral-300 text-sm">
                          {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-center text-white font-medium">{leave.days}</td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${colors.bg} ${colors.text}`}>
                            {statusLabels[leave.status]}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            {leave.status === 'PENDING' && (
                              <>
                                <Button variant="ghost" size="sm" onClick={() => handleApprove(leave.id)}>
                                  <Check className="w-4 h-4 text-success" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handleReject(leave.id)}>
                                  <X className="w-4 h-4 text-error" />
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {filteredLeaves.length === 0 && (
              <div className="text-center py-12">
                <Calendar className="w-12 h-12 text-neutral-600 mx-auto mb-3" />
                <p className="text-neutral-400">No leave requests found</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* New Leave Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowModal(false)} />
          <div className="relative bg-factory-dark border border-factory-border rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-white mb-4">New Leave Request</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">Employee *</label>
                <select
                  value={formData.employeeId}
                  onChange={(e) => setFormData({ ...formData, employeeId: Number(e.target.value) })}
                  className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white"
                  required
                >
                  <option value={0}>Select Employee</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>{e.fullName} ({e.code})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">Leave Type *</label>
                <select
                  value={formData.leaveTypeId}
                  onChange={(e) => setFormData({ ...formData, leaveTypeId: Number(e.target.value) })}
                  className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white"
                  required
                >
                  <option value={0}>Select Leave Type</option>
                  {leaveTypes.map((t) => (
                    <option key={t.id} value={t.id}>{t.name} ({t.isPaid ? 'Paid' : 'Unpaid'})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Start Date *"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  required
                />
                <Input
                  label="End Date *"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  required
                />
              </div>
              {formData.startDate && formData.endDate && (
                <p className="text-sm text-neutral-400">
                  Total: {calculateDays(formData.startDate, formData.endDate)} day(s)
                </p>
              )}
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">Reason</label>
                <textarea
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white resize-none"
                  placeholder="Reason for leave..."
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? 'Submitting...' : 'Submit'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Leave Types Modal */}
      {showTypesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowTypesModal(false)} />
          <div className="relative bg-factory-dark border border-factory-border rounded-2xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-white mb-4">Leave Types</h3>

            {/* Existing Types */}
            <div className="space-y-2 mb-6">
              {leaveTypes.map((type) => (
                <div key={type.id} className="flex items-center justify-between p-3 bg-factory-gray rounded-xl">
                  <div>
                    <p className="text-white font-medium">{type.name}</p>
                    <p className="text-sm text-neutral-400">{type.code} - {type.annualAllowance} days/year</p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs ${type.isPaid ? 'bg-success/20 text-success' : 'bg-neutral-500/20 text-neutral-400'}`}>
                    {type.isPaid ? 'Paid' : 'Unpaid'}
                  </span>
                </div>
              ))}
            </div>

            {/* Add New Type */}
            <form onSubmit={handleCreateType} className="border-t border-factory-border pt-4">
              <h4 className="text-sm font-medium text-neutral-300 mb-3">Add New Type</h4>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <Input
                  label="Code"
                  value={newType.code}
                  onChange={(e) => setNewType({ ...newType, code: e.target.value })}
                  placeholder="e.g., SICK"
                />
                <Input
                  label="Name"
                  value={newType.name}
                  onChange={(e) => setNewType({ ...newType, name: e.target.value })}
                  placeholder="e.g., Sick Leave"
                />
                <Input
                  label="Annual Allowance"
                  type="number"
                  value={newType.annualAllowance}
                  onChange={(e) => setNewType({ ...newType, annualAllowance: Number(e.target.value) })}
                />
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">Type</label>
                  <select
                    value={newType.isPaid ? 'paid' : 'unpaid'}
                    onChange={(e) => setNewType({ ...newType, isPaid: e.target.value === 'paid' })}
                    className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white"
                  >
                    <option value="paid">Paid</option>
                    <option value="unpaid">Unpaid</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="secondary" type="button" onClick={() => setShowTypesModal(false)}>
                  Close
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? 'Adding...' : 'Add Type'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
