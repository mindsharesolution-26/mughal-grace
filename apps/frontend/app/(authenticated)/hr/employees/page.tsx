'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { useToast } from '@/contexts/ToastContext';
import { employeesApi, designationsApi, Employee, Designation } from '@/lib/api/hr';
import { Users, Plus, Eye, Edit, Search, X } from 'lucide-react';

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

export default function EmployeesPage() {
  const searchParams = useSearchParams();
  const showNewModal = searchParams.get('new') === 'true';

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterDepartment, setFilterDepartment] = useState<string>('ALL');
  const [showModal, setShowModal] = useState(showNewModal);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState<Partial<Employee>>({});
  const [isSaving, setIsSaving] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [empData, desData] = await Promise.all([
        employeesApi.getAll(),
        designationsApi.getLookup(),
      ]);
      setEmployees(empData);
      setDesignations(desData as Designation[]);
    } catch (error: any) {
      showToast('error', error.response?.data?.error || 'Failed to load employees');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const matchesSearch =
        emp.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (emp.cnic && emp.cnic.includes(searchQuery)) ||
        (emp.phone && emp.phone.includes(searchQuery));

      const matchesStatus = filterStatus === 'ALL' || emp.status === filterStatus;
      const matchesDepartment = filterDepartment === 'ALL' || emp.department === filterDepartment;

      return matchesSearch && matchesStatus && matchesDepartment;
    });
  }, [employees, searchQuery, filterStatus, filterDepartment]);

  const departments = useMemo(() => {
    const depts = new Set(employees.map((e) => e.department).filter(Boolean));
    return Array.from(depts) as string[];
  }, [employees]);

  const stats = useMemo(() => ({
    total: employees.length,
    active: employees.filter((e) => e.status === 'ACTIVE').length,
    onLeave: employees.filter((e) => e.status === 'ON_LEAVE').length,
    probation: employees.filter((e) => e.status === 'PROBATION').length,
  }), [employees]);

  const openCreateModal = () => {
    setEditingEmployee(null);
    setFormData({
      fullName: '',
      fullNameUrdu: '',
      fatherName: '',
      cnic: '',
      phone: '',
      emergencyPhone: '',
      email: '',
      address: '',
      city: '',
      department: '',
      designationId: undefined,
      joiningDate: new Date().toISOString().split('T')[0],
      salaryType: 'MONTHLY',
      baseSalary: 0,
      status: 'ACTIVE',
    });
    setShowModal(true);
  };

  const openEditModal = (employee: Employee) => {
    setEditingEmployee(employee);
    setFormData({
      ...employee,
      joiningDate: employee.joiningDate?.split('T')[0],
      probationEndDate: employee.probationEndDate?.split('T')[0],
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName || !formData.joiningDate) {
      showToast('error', 'Please fill in required fields');
      return;
    }

    try {
      setIsSaving(true);
      if (editingEmployee) {
        await employeesApi.update(editingEmployee.id, formData);
        showToast('success', 'Employee updated successfully');
      } else {
        await employeesApi.create(formData);
        showToast('success', 'Employee created successfully');
      }
      setShowModal(false);
      fetchData();
    } catch (error: any) {
      showToast('error', error.response?.data?.error || 'Failed to save employee');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Employees</h1>
          <p className="text-neutral-400 mt-1">Manage employee records and information</p>
        </div>
        <Button onClick={openCreateModal}>
          <Plus className="w-4 h-4 mr-2" /> Add Employee
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
          <span className="ml-3 text-neutral-400">Loading employees...</span>
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-factory-dark rounded-xl border border-factory-border p-4">
              <p className="text-2xl font-bold text-white">{stats.total}</p>
              <p className="text-sm text-neutral-400">Total</p>
            </div>
            <div className="bg-factory-dark rounded-xl border border-factory-border p-4">
              <p className="text-2xl font-bold text-success">{stats.active}</p>
              <p className="text-sm text-neutral-400">Active</p>
            </div>
            <div className="bg-factory-dark rounded-xl border border-factory-border p-4">
              <p className="text-2xl font-bold text-warning">{stats.onLeave}</p>
              <p className="text-sm text-neutral-400">On Leave</p>
            </div>
            <div className="bg-factory-dark rounded-xl border border-factory-border p-4">
              <p className="text-2xl font-bold text-info">{stats.probation}</p>
              <p className="text-sm text-neutral-400">Probation</p>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-factory-dark rounded-2xl border border-factory-border p-4">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                <input
                  type="text"
                  placeholder="Search by name, code, CNIC, or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white placeholder-neutral-500"
                />
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white"
              >
                <option value="ALL">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="ON_LEAVE">On Leave</option>
                <option value="PROBATION">Probation</option>
                <option value="RESIGNED">Resigned</option>
                <option value="TERMINATED">Terminated</option>
              </select>
              <select
                value={filterDepartment}
                onChange={(e) => setFilterDepartment(e.target.value)}
                className="px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white"
              >
                <option value="ALL">All Departments</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="bg-factory-dark rounded-2xl border border-factory-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-factory-border">
                    <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">Employee</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">Department</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">Designation</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">Status</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">Joining Date</th>
                    <th className="text-right px-6 py-4 text-sm font-medium text-neutral-400">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-factory-border">
                  {filteredEmployees.map((emp) => {
                    const colors = statusColors[emp.status] || statusColors.ACTIVE;
                    return (
                      <tr key={emp.id} className="hover:bg-factory-gray transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary-500/20 flex items-center justify-center">
                              <span className="text-primary-400 font-medium">
                                {emp.fullName.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="text-white font-medium">{emp.fullName}</p>
                              <p className="text-sm text-neutral-400">{emp.code}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-neutral-300">{emp.department || '-'}</td>
                        <td className="px-6 py-4 text-neutral-300">{emp.designation?.name || '-'}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${colors.bg} ${colors.text}`}>
                            {statusLabels[emp.status]}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-neutral-300">
                          {new Date(emp.joiningDate).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <Link href={`/hr/employees/${emp.id}`}>
                              <Button variant="ghost" size="sm">
                                <Eye className="w-4 h-4" />
                              </Button>
                            </Link>
                            <Button variant="ghost" size="sm" onClick={() => openEditModal(emp)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {filteredEmployees.length === 0 && (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-neutral-600 mx-auto mb-3" />
                <p className="text-neutral-400">No employees found</p>
                <Button onClick={openCreateModal} variant="secondary" className="mt-4">
                  Add First Employee
                </Button>
              </div>
            )}
          </div>
        </>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowModal(false)} />
          <div className="relative bg-factory-dark border border-factory-border rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white">
                {editingEmployee ? 'Edit Employee' : 'Add New Employee'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-neutral-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Full Name *"
                  value={formData.fullName || ''}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  required
                />
                <Input
                  label="Full Name (Urdu)"
                  value={formData.fullNameUrdu || ''}
                  onChange={(e) => setFormData({ ...formData, fullNameUrdu: e.target.value })}
                  dir="rtl"
                />
                <Input
                  label="Father Name"
                  value={formData.fatherName || ''}
                  onChange={(e) => setFormData({ ...formData, fatherName: e.target.value })}
                />
                <Input
                  label="CNIC"
                  placeholder="12345-1234567-1"
                  value={formData.cnic || ''}
                  onChange={(e) => setFormData({ ...formData, cnic: e.target.value })}
                />
                <Input
                  label="Phone"
                  value={formData.phone || ''}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
                <Input
                  label="Emergency Phone"
                  value={formData.emergencyPhone || ''}
                  onChange={(e) => setFormData({ ...formData, emergencyPhone: e.target.value })}
                />
                <Input
                  label="Email"
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
                <Input
                  label="City"
                  value={formData.city || ''}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
              </div>

              <Input
                label="Address"
                value={formData.address || ''}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">Department</label>
                  <input
                    type="text"
                    list="departments"
                    value={formData.department || ''}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white"
                  />
                  <datalist id="departments">
                    {departments.map((d) => <option key={d} value={d} />)}
                  </datalist>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">Designation</label>
                  <select
                    value={formData.designationId || ''}
                    onChange={(e) => setFormData({ ...formData, designationId: Number(e.target.value) || undefined })}
                    className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white"
                  >
                    <option value="">Select Designation</option>
                    {designations.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <Input
                  label="Joining Date *"
                  type="date"
                  value={formData.joiningDate || ''}
                  onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
                  required
                />
                <Input
                  label="Probation End Date"
                  type="date"
                  value={formData.probationEndDate || ''}
                  onChange={(e) => setFormData({ ...formData, probationEndDate: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">Salary Type</label>
                  <select
                    value={formData.salaryType || 'MONTHLY'}
                    onChange={(e) => setFormData({ ...formData, salaryType: e.target.value as any })}
                    className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white"
                  >
                    <option value="MONTHLY">Monthly</option>
                    <option value="DAILY">Daily</option>
                    <option value="HOURLY">Hourly</option>
                    <option value="PIECE_RATE">Piece Rate</option>
                  </select>
                </div>
                <Input
                  label="Base Salary"
                  type="number"
                  value={formData.baseSalary || ''}
                  onChange={(e) => setFormData({ ...formData, baseSalary: Number(e.target.value) })}
                />
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">Status</label>
                  <select
                    value={formData.status || 'ACTIVE'}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="PROBATION">Probation</option>
                    <option value="ON_LEAVE">On Leave</option>
                    <option value="RESIGNED">Resigned</option>
                    <option value="TERMINATED">Terminated</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? 'Saving...' : editingEmployee ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
