'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useToast } from '@/contexts/ToastContext';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { departmentsApi } from '@/lib/api/settings';
import { Department, DepartmentFormData } from '@/lib/types/settings';

export default function DepartmentsPage() {
  const { showToast } = useToast();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('active');
  const [searchQuery, setSearchQuery] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);
  const [viewing, setViewing] = useState<Department | null>(null);

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    setLoading(true);
    try {
      const data = await departmentsApi.getAll();
      setDepartments(data);
    } catch (error) {
      showToast('error', 'Failed to load departments');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this department?')) return;
    try {
      await departmentsApi.delete(id);
      showToast('success', 'Department deleted');
      fetchDepartments();
    } catch (error: any) {
      showToast('error', error.response?.data?.error || 'Failed to delete department');
    }
  };

  const filteredDepartments = departments.filter((d) => {
    const matchesFilter =
      filter === 'all' ||
      (filter === 'active' && d.isActive) ||
      (filter === 'inactive' && !d.isActive);
    const matchesSearch =
      searchQuery === '' ||
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.code.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // View Modal Component
  const DepartmentViewModal = () => {
    if (!viewing) return null;

    const DetailRow = ({ label, value }: { label: string; value: string | number | null | undefined }) => {
      if (value === null || value === undefined || value === '') return null;
      return (
        <div className="flex justify-between py-2 border-b border-factory-border/50">
          <span className="text-neutral-400 text-sm">{label}</span>
          <span className="text-white text-sm">{value}</span>
        </div>
      );
    };

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-factory-dark rounded-2xl border border-factory-border w-full max-w-lg max-h-[90vh] overflow-y-auto">
          <div className="p-6 border-b border-factory-border sticky top-0 bg-factory-dark z-10 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">Department Details</h2>
              <p className="text-sm text-neutral-400 mt-1">Code: {viewing.code}</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              viewing.isActive
                ? 'bg-success/20 text-success'
                : 'bg-neutral-500/20 text-neutral-400'
            }`}>
              {viewing.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>

          <div className="p-6 space-y-6">
            {/* Basic Info */}
            <div>
              <h3 className="text-sm font-medium text-primary-400 mb-3">Basic Information</h3>
              <div className="bg-factory-gray/30 rounded-xl p-4">
                <DetailRow label="Department Name" value={viewing.name} />
                <DetailRow label="Parent Department" value={viewing.parent?.name} />
                <DetailRow label="Description" value={viewing.description} />
              </div>
            </div>

            {/* Personnel */}
            {(viewing.managerName || viewing.contactPerson || (viewing.employeeCount !== null && viewing.employeeCount > 0)) && (
              <div>
                <h3 className="text-sm font-medium text-primary-400 mb-3">Personnel</h3>
                <div className="bg-factory-gray/30 rounded-xl p-4">
                  <DetailRow label="Manager Name" value={viewing.managerName} />
                  <DetailRow label="Contact Person" value={viewing.contactPerson} />
                  <DetailRow label="Employee Count" value={viewing.employeeCount} />
                </div>
              </div>
            )}

            {/* Notes */}
            {viewing.notes && (
              <div>
                <h3 className="text-sm font-medium text-primary-400 mb-3">Notes</h3>
                <div className="bg-factory-gray/30 rounded-xl p-4">
                  <p className="text-white text-sm whitespace-pre-wrap">{viewing.notes}</p>
                </div>
              </div>
            )}

            {/* Metadata */}
            <div>
              <h3 className="text-sm font-medium text-primary-400 mb-3">Record Information</h3>
              <div className="bg-factory-gray/30 rounded-xl p-4">
                <DetailRow label="Sort Order" value={viewing.sortOrder} />
                <DetailRow
                  label="Created At"
                  value={viewing.createdAt ? new Date(viewing.createdAt).toLocaleString() : undefined}
                />
                <DetailRow
                  label="Updated At"
                  value={viewing.updatedAt ? new Date(viewing.updatedAt).toLocaleString() : undefined}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 p-6 border-t border-factory-border">
            <Button variant="secondary" onClick={() => setViewing(null)}>
              Close
            </Button>
            <Button onClick={() => {
              setEditing(viewing);
              setViewing(null);
              setShowModal(true);
            }}>
              Edit
            </Button>
          </div>
        </div>
      </div>
    );
  };

  // Modal Component
  const DepartmentModal = () => {
    const [formData, setFormData] = useState<DepartmentFormData>({
      name: editing?.name || '',
      description: editing?.description || '',
      parentId: editing?.parentId ?? null,
      // Personnel Information
      managerName: editing?.managerName || '',
      contactPerson: editing?.contactPerson || '',
      employeeCount: editing?.employeeCount ?? 0,
      notes: editing?.notes || '',
      isActive: editing?.isActive ?? true,
      sortOrder: editing?.sortOrder ?? 0,
    });
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setSaving(true);
      try {
        if (editing) {
          await departmentsApi.update(editing.id, formData);
          showToast('success', 'Department updated');
        } else {
          await departmentsApi.create(formData);
          showToast('success', 'Department created');
        }
        setShowModal(false);
        setEditing(null);
        fetchDepartments();
      } catch (error: any) {
        showToast('error', error.response?.data?.error || 'Failed to save department');
      } finally {
        setSaving(false);
      }
    };

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-factory-dark rounded-2xl border border-factory-border w-full max-w-lg max-h-[90vh] overflow-y-auto">
          <div className="p-6 border-b border-factory-border sticky top-0 bg-factory-dark z-10">
            <h2 className="text-xl font-semibold text-white">
              {editing ? 'Edit Department' : 'Add Department'}
            </h2>
            {editing && (
              <p className="text-sm text-neutral-400 mt-1">Code: {editing.code}</p>
            )}
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Basic Info */}
            <div>
              <h3 className="text-sm font-medium text-primary-400 mb-3">Basic Information</h3>
              <div className="space-y-4">
                <Input
                  label="Department Name *"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Department name"
                  required
                />
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                    Parent Department
                  </label>
                  <select
                    value={formData.parentId || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        parentId: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                    className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">None (Top Level)</option>
                    {departments
                      .filter((d) => d.id !== editing?.id)
                      .map((dept) => (
                        <option key={dept.id} value={dept.id}>
                          {dept.code} - {dept.name}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                    Description
                  </label>
                  <textarea
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={2}
                    className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Optional description..."
                  />
                </div>
              </div>
            </div>

            {/* Personnel Information */}
            <div>
              <h3 className="text-sm font-medium text-primary-400 mb-3">Personnel</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Manager Name"
                    value={formData.managerName || ''}
                    onChange={(e) => setFormData({ ...formData, managerName: e.target.value || null })}
                    placeholder="John Doe"
                  />
                  <Input
                    label="Contact Person"
                    value={formData.contactPerson || ''}
                    onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value || null })}
                    placeholder="Jane Smith"
                  />
                </div>
                <Input
                  label="Employee Count (Headcount)"
                  type="number"
                  min="0"
                  value={formData.employeeCount ?? ''}
                  onChange={(e) => setFormData({ ...formData, employeeCount: e.target.value ? Number(e.target.value) : null })}
                  placeholder="0"
                />
              </div>
            </div>

            {/* Notes & Status */}
            <div>
              <h3 className="text-sm font-medium text-primary-400 mb-3">Notes & Status</h3>
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                  Notes
                </label>
                <textarea
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Internal notes..."
                />
              </div>
              <div className="flex items-center gap-3 mt-4">
                <input
                  type="checkbox"
                  id="dept-active"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4"
                />
                <label htmlFor="dept-active" className="text-neutral-300">
                  Active
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-factory-border">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowModal(false);
                  setEditing(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-neutral-400">
        <Link href="/settings" className="hover:text-white">
          Settings
        </Link>
        <span>/</span>
        <span className="text-white">Departments</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Departments</h1>
          <p className="text-neutral-400 mt-1">Manage organizational departments</p>
        </div>
        <Button onClick={() => setShowModal(true)}>+ Add Department</Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <Input
          placeholder="Search departments..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-xs"
        />
        <div className="flex gap-2">
          {(['active', 'inactive', 'all'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm capitalize ${
                filter === f
                  ? 'bg-primary-500 text-white'
                  : 'bg-factory-gray text-neutral-400 hover:text-white'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="bg-factory-dark rounded-2xl border border-factory-border">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
          </div>
        ) : filteredDepartments.length === 0 ? (
          <div className="text-center py-12 text-neutral-400">
            {departments.length === 0
              ? 'No departments yet. Add your first department!'
              : 'No departments match your filters.'}
          </div>
        ) : (
          <div className="divide-y divide-factory-border">
            {filteredDepartments.map((dept) => (
              <div
                key={dept.id}
                className="flex items-center justify-between p-4 hover:bg-factory-gray/50"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className="text-primary-400 font-mono text-sm">{dept.code}</span>
                    <span className="text-white font-medium">{dept.name}</span>
                    {dept.employeeCount !== null && dept.employeeCount > 0 && (
                      <span className="px-2 py-0.5 bg-primary-500/20 text-primary-400 text-xs rounded">
                        {dept.employeeCount} employee{dept.employeeCount !== 1 ? 's' : ''}
                      </span>
                    )}
                    {!dept.isActive && (
                      <span className="px-2 py-0.5 bg-neutral-500/20 text-neutral-400 text-xs rounded">
                        Inactive
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-1">
                    {dept.parent && (
                      <span className="text-xs text-neutral-400">Parent: {dept.parent.name}</span>
                    )}
                    {dept.managerName && (
                      <span className="text-xs text-neutral-400">Manager: {dept.managerName}</span>
                    )}
                    {dept.contactPerson && (
                      <span className="text-xs text-neutral-400">Contact: {dept.contactPerson}</span>
                    )}
                  </div>
                  {dept.description && (
                    <p className="text-sm text-neutral-400 mt-1">{dept.description}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setViewing(dept)}
                  >
                    View
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditing(dept);
                      setShowModal(true);
                    }}
                  >
                    Edit
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(dept.id)}>
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* View Modal */}
      {viewing && <DepartmentViewModal />}

      {/* Edit Modal */}
      {showModal && <DepartmentModal />}
    </div>
  );
}
