'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/atoms/Button';
import { useToast } from '@/contexts/ToastContext';
import { salariesApi, Salary } from '@/lib/api/hr';
import { Wallet, FileText, Check, Clock, Eye, Plus, CheckCircle } from 'lucide-react';

const statusColors: Record<string, { bg: string; text: string }> = {
  DRAFT: { bg: 'bg-neutral-500/20', text: 'text-neutral-400' },
  PENDING: { bg: 'bg-warning/20', text: 'text-warning' },
  APPROVED: { bg: 'bg-info/20', text: 'text-info' },
  PAID: { bg: 'bg-success/20', text: 'text-success' },
};

const statusLabels: Record<string, string> = {
  DRAFT: 'Draft',
  PENDING: 'Pending',
  APPROVED: 'Approved',
  PAID: 'Paid',
};

const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function SalariesPage() {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [salaries, setSalaries] = useState<Salary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const { showToast } = useToast();

  useEffect(() => {
    fetchSalaries();
  }, [selectedMonth, selectedYear]);

  const fetchSalaries = async () => {
    try {
      setIsLoading(true);
      const data = await salariesApi.getAll({ month: selectedMonth, year: selectedYear });
      setSalaries(data);
      setSelectedIds([]);
    } catch (error: any) {
      showToast('error', error.response?.data?.error || 'Failed to load salaries');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredSalaries = useMemo(() => {
    if (filterStatus === 'ALL') return salaries;
    return salaries.filter((s) => s.status === filterStatus);
  }, [salaries, filterStatus]);

  const stats = useMemo(() => ({
    total: salaries.length,
    draft: salaries.filter((s) => s.status === 'DRAFT').length,
    pending: salaries.filter((s) => s.status === 'PENDING').length,
    approved: salaries.filter((s) => s.status === 'APPROVED').length,
    paid: salaries.filter((s) => s.status === 'PAID').length,
    totalAmount: salaries.reduce((sum, s) => sum + Number(s.netSalary), 0),
    paidAmount: salaries.filter((s) => s.status === 'PAID').reduce((sum, s) => sum + Number(s.netSalary), 0),
  }), [salaries]);

  const handleGenerate = async () => {
    try {
      setIsGenerating(true);
      const result = await salariesApi.generate(selectedMonth, selectedYear);
      showToast('success', `Generated ${result.generated} salaries, skipped ${result.skipped}`);
      setShowGenerateModal(false);
      fetchSalaries();
    } catch (error: any) {
      showToast('error', error.response?.data?.error || 'Failed to generate salaries');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleBulkApprove = async () => {
    if (selectedIds.length === 0) {
      showToast('info', 'Select salaries to approve');
      return;
    }

    try {
      const result = await salariesApi.bulkApprove(selectedIds);
      showToast('success', `Approved ${result.approved} salaries`);
      setSelectedIds([]);
      fetchSalaries();
    } catch (error: any) {
      showToast('error', error.response?.data?.error || 'Failed to approve salaries');
    }
  };

  const handleApprove = async (id: number) => {
    try {
      await salariesApi.approve(id);
      showToast('success', 'Salary approved');
      fetchSalaries();
    } catch (error: any) {
      showToast('error', error.response?.data?.error || 'Failed to approve salary');
    }
  };

  const handlePay = async (id: number) => {
    try {
      await salariesApi.pay(id, 'CASH');
      showToast('success', 'Salary marked as paid');
      fetchSalaries();
    } catch (error: any) {
      showToast('error', error.response?.data?.error || 'Failed to process payment');
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    const approvable = filteredSalaries.filter((s) => s.status === 'PENDING').map((s) => s.id);
    setSelectedIds(approvable);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const years = Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - 2 + i);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Salaries</h1>
          <p className="text-neutral-400 mt-1">Manage monthly payroll and payments</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white"
          >
            {months.map((m, i) => (
              <option key={i} value={i + 1}>{m}</option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white"
          >
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <Button onClick={() => setShowGenerateModal(true)}>
            <Plus className="w-4 h-4 mr-2" /> Generate
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
          <span className="ml-3 text-neutral-400">Loading salaries...</span>
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-factory-dark rounded-xl border border-factory-border p-4">
              <p className="text-2xl font-bold text-white">{stats.total}</p>
              <p className="text-sm text-neutral-400">Total Records</p>
            </div>
            <div className="bg-factory-dark rounded-xl border border-factory-border p-4">
              <p className="text-2xl font-bold text-warning">{stats.pending}</p>
              <p className="text-sm text-neutral-400">Pending Approval</p>
            </div>
            <div className="bg-factory-dark rounded-xl border border-factory-border p-4">
              <p className="text-2xl font-bold text-info">{stats.approved}</p>
              <p className="text-sm text-neutral-400">Approved</p>
            </div>
            <div className="bg-factory-dark rounded-xl border border-factory-border p-4">
              <p className="text-2xl font-bold text-success">{formatCurrency(stats.paidAmount)}</p>
              <p className="text-sm text-neutral-400">Total Paid</p>
            </div>
          </div>

          {/* Actions */}
          <div className="bg-factory-dark rounded-2xl border border-factory-border p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-4 py-2 rounded-xl bg-factory-gray border border-factory-border text-white text-sm"
                >
                  <option value="ALL">All Status</option>
                  <option value="DRAFT">Draft</option>
                  <option value="PENDING">Pending</option>
                  <option value="APPROVED">Approved</option>
                  <option value="PAID">Paid</option>
                </select>
                {selectedIds.length > 0 && (
                  <span className="text-sm text-neutral-400">{selectedIds.length} selected</span>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={selectAll}>
                  Select Pending
                </Button>
                <Button size="sm" onClick={handleBulkApprove} disabled={selectedIds.length === 0}>
                  <CheckCircle className="w-4 h-4 mr-2" /> Bulk Approve
                </Button>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-factory-dark rounded-2xl border border-factory-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-factory-border">
                    <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400 w-10">
                      <input
                        type="checkbox"
                        checked={selectedIds.length > 0 && selectedIds.length === filteredSalaries.filter(s => s.status === 'PENDING').length}
                        onChange={selectAll}
                        className="rounded"
                      />
                    </th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">Employee</th>
                    <th className="text-right px-6 py-4 text-sm font-medium text-neutral-400">Base Salary</th>
                    <th className="text-right px-6 py-4 text-sm font-medium text-neutral-400">Deductions</th>
                    <th className="text-right px-6 py-4 text-sm font-medium text-neutral-400">Net Salary</th>
                    <th className="text-center px-6 py-4 text-sm font-medium text-neutral-400">Status</th>
                    <th className="text-right px-6 py-4 text-sm font-medium text-neutral-400">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-factory-border">
                  {filteredSalaries.map((salary) => {
                    const colors = statusColors[salary.status];
                    return (
                      <tr key={salary.id} className="hover:bg-factory-gray transition-colors">
                        <td className="px-6 py-4">
                          {salary.status === 'PENDING' && (
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(salary.id)}
                              onChange={() => toggleSelect(salary.id)}
                              className="rounded"
                            />
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-white font-medium">{salary.employee?.fullName}</p>
                          <p className="text-sm text-neutral-500">{salary.employee?.code}</p>
                        </td>
                        <td className="px-6 py-4 text-right text-neutral-300">
                          {formatCurrency(Number(salary.baseSalary))}
                        </td>
                        <td className="px-6 py-4 text-right text-error">
                          -{formatCurrency(Number(salary.totalDeductions))}
                        </td>
                        <td className="px-6 py-4 text-right text-white font-medium">
                          {formatCurrency(Number(salary.netSalary))}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${colors.bg} ${colors.text}`}>
                            {statusLabels[salary.status]}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <Link href={`/hr/salaries/${salary.id}`}>
                              <Button variant="ghost" size="sm">
                                <Eye className="w-4 h-4" />
                              </Button>
                            </Link>
                            {salary.status === 'PENDING' && (
                              <Button variant="ghost" size="sm" onClick={() => handleApprove(salary.id)}>
                                <Check className="w-4 h-4" />
                              </Button>
                            )}
                            {salary.status === 'APPROVED' && (
                              <Button variant="ghost" size="sm" onClick={() => handlePay(salary.id)}>
                                <Wallet className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {filteredSalaries.length === 0 && (
              <div className="text-center py-12">
                <Wallet className="w-12 h-12 text-neutral-600 mx-auto mb-3" />
                <p className="text-neutral-400">No salary records found</p>
                <Button onClick={() => setShowGenerateModal(true)} variant="secondary" className="mt-4">
                  Generate Salaries
                </Button>
              </div>
            )}
          </div>
        </>
      )}

      {/* Generate Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowGenerateModal(false)} />
          <div className="relative bg-factory-dark border border-factory-border rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-white mb-4">Generate Monthly Salaries</h3>
            <p className="text-neutral-400 mb-6">
              This will generate salary records for all active employees for {months[selectedMonth - 1]} {selectedYear}.
              Existing records will be skipped.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setShowGenerateModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleGenerate} disabled={isGenerating}>
                {isGenerating ? 'Generating...' : 'Generate'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
