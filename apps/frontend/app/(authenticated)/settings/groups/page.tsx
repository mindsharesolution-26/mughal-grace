'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useToast } from '@/contexts/ToastContext';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { groupsApi, departmentsApi } from '@/lib/api/settings';
import { Group, GroupFormData, Department } from '@/lib/types/settings';

export default function GroupsPage() {
  const { showToast } = useToast();
  const [groups, setGroups] = useState<Group[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('active');
  const [departmentFilter, setDepartmentFilter] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Group | null>(null);
  const [viewing, setViewing] = useState<Group | null>(null);

  useEffect(() => {
    fetchDepartments();
    fetchGroups();
  }, []);

  const fetchDepartments = async () => {
    try {
      const data = await departmentsApi.getAll();
      setDepartments(data);
    } catch (error) {
      console.error('Failed to load departments:', error);
    }
  };

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const data = await groupsApi.getAll();
      setGroups(data);
    } catch (error) {
      showToast('error', 'Failed to load groups');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this group?')) return;
    try {
      await groupsApi.delete(id);
      showToast('success', 'Group deleted');
      fetchGroups();
    } catch (error: any) {
      showToast('error', error.response?.data?.error || 'Failed to delete group');
    }
  };

  // Only show active departments for selection
  const activeDepartments = departments.filter((d) => d.isActive);

  const filteredGroups = groups.filter((g) => {
    const matchesFilter =
      filter === 'all' ||
      (filter === 'active' && g.isActive) ||
      (filter === 'inactive' && !g.isActive);
    const matchesDepartment =
      departmentFilter === null || g.departmentId === departmentFilter;
    const matchesSearch =
      searchQuery === '' ||
      g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.code.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesDepartment && matchesSearch;
  });

  // View Modal Component
  const GroupViewModal = () => {
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
              <h2 className="text-xl font-semibold text-white">Group Details</h2>
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
                <DetailRow label="Group Name" value={viewing.name} />
                <DetailRow label="Department" value={viewing.department?.name} />
                <DetailRow label="Description" value={viewing.description} />
              </div>
            </div>

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
  const GroupModal = () => {
    const [formData, setFormData] = useState<GroupFormData>({
      name: editing?.name || '',
      departmentId: editing?.departmentId || (activeDepartments.length > 0 ? activeDepartments[0].id : 0),
      description: editing?.description || '',
      notes: editing?.notes || '',
      isActive: editing?.isActive ?? true,
      sortOrder: editing?.sortOrder ?? 0,
    });
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();

      if (!formData.departmentId) {
        showToast('error', 'Please select a department');
        return;
      }

      setSaving(true);
      try {
        if (editing) {
          await groupsApi.update(editing.id, formData);
          showToast('success', 'Group updated');
        } else {
          await groupsApi.create(formData);
          showToast('success', 'Group created');
        }
        setShowModal(false);
        setEditing(null);
        fetchGroups();
      } catch (error: any) {
        showToast('error', error.response?.data?.error || 'Failed to save group');
      } finally {
        setSaving(false);
      }
    };

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-factory-dark rounded-2xl border border-factory-border w-full max-w-lg max-h-[90vh] overflow-y-auto">
          <div className="p-6 border-b border-factory-border sticky top-0 bg-factory-dark z-10">
            <h2 className="text-xl font-semibold text-white">
              {editing ? 'Edit Group' : 'Add Group'}
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
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                    Department *
                  </label>
                  <select
                    value={formData.departmentId || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        departmentId: Number(e.target.value),
                      })
                    }
                    required
                    className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="" disabled>Select Department</option>
                    {activeDepartments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.code} - {dept.name}
                      </option>
                    ))}
                  </select>
                </div>
                <Input
                  label="Group Name *"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter group name"
                  required
                />
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
                  id="group-active"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4"
                />
                <label htmlFor="group-active" className="text-neutral-300">
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
        <span className="text-white">Groups</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Groups</h1>
          <p className="text-neutral-400 mt-1">
            Manage groups within departments
          </p>
        </div>
        <Button onClick={() => setShowModal(true)}>+ Add Group</Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <Input
          placeholder="Search groups..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-xs"
        />
        <select
          value={departmentFilter || ''}
          onChange={(e) => setDepartmentFilter(e.target.value ? Number(e.target.value) : null)}
          className="px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">All Departments</option>
          {departments.map((dept) => (
            <option key={dept.id} value={dept.id}>
              {dept.code} - {dept.name}
            </option>
          ))}
        </select>
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
        ) : filteredGroups.length === 0 ? (
          <div className="text-center py-12 text-neutral-400">
            {groups.length === 0
              ? 'No groups yet. Add your first group!'
              : 'No groups match your filters.'}
          </div>
        ) : (
          <div className="divide-y divide-factory-border">
            {filteredGroups.map((group) => (
              <div
                key={group.id}
                className="flex items-center justify-between p-4 hover:bg-factory-gray/50"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className="text-primary-400 font-mono text-sm">{group.code}</span>
                    <span className="text-white font-medium">{group.name}</span>
                    {group.department && (
                      <span className="px-2 py-0.5 bg-primary-500/20 text-primary-400 text-xs rounded">
                        {group.department.name}
                      </span>
                    )}
                    {!group.isActive && (
                      <span className="px-2 py-0.5 bg-neutral-500/20 text-neutral-400 text-xs rounded">
                        Inactive
                      </span>
                    )}
                  </div>
                  {group.description && (
                    <p className="text-sm text-neutral-400 mt-1">{group.description}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setViewing(group)}
                  >
                    View
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditing(group);
                      setShowModal(true);
                    }}
                  >
                    Edit
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(group.id)}>
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* View Modal */}
      {viewing && <GroupViewModal />}

      {/* Edit Modal */}
      {showModal && <GroupModal />}
    </div>
  );
}
