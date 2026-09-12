'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { useToast } from '@/contexts/ToastContext';
import { designationsApi, Designation } from '@/lib/api/hr';
import { Award, Plus, Edit, Trash2, X } from 'lucide-react';

export default function DesignationsPage() {
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    nameUrdu: '',
    department: '',
    baseSalary: 0,
    level: 1,
    isActive: true,
  });
  const [isSaving, setIsSaving] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    fetchDesignations();
  }, []);

  const fetchDesignations = async () => {
    try {
      setIsLoading(true);
      const data = await designationsApi.getAll();
      setDesignations(data);
    } catch (error: any) {
      showToast('error', error.response?.data?.error || 'Failed to load designations');
    } finally {
      setIsLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingId(null);
    setFormData({
      code: '',
      name: '',
      nameUrdu: '',
      department: '',
      baseSalary: 0,
      level: 1,
      isActive: true,
    });
    setShowModal(true);
  };

  const openEditModal = (designation: Designation) => {
    setEditingId(designation.id);
    setFormData({
      code: designation.code,
      name: designation.name,
      nameUrdu: designation.nameUrdu || '',
      department: designation.department || '',
      baseSalary: Number(designation.baseSalary) || 0,
      level: designation.level,
      isActive: designation.isActive,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      showToast('error', 'Please enter designation name');
      return;
    }

    try {
      setIsSaving(true);
      if (editingId) {
        await designationsApi.update(editingId, formData);
        showToast('success', 'Designation updated');
      } else {
        await designationsApi.create(formData);
        showToast('success', 'Designation created');
      }
      setShowModal(false);
      fetchDesignations();
    } catch (error: any) {
      showToast('error', error.response?.data?.error || 'Failed to save designation');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this designation?')) return;

    try {
      await designationsApi.delete(id);
      showToast('success', 'Designation deleted');
      fetchDesignations();
    } catch (error: any) {
      showToast('error', error.response?.data?.error || 'Failed to delete designation');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const departments = [...new Set(designations.map((d) => d.department).filter(Boolean))];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Designations</h1>
          <p className="text-neutral-400 mt-1">Manage job titles and positions</p>
        </div>
        <Button onClick={openCreateModal}>
          <Plus className="w-4 h-4 mr-2" /> Add Designation
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
          <span className="ml-3 text-neutral-400">Loading designations...</span>
        </div>
      ) : (
        <div className="bg-factory-dark rounded-2xl border border-factory-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-factory-border">
                  <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">Code</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">Name</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-neutral-400">Department</th>
                  <th className="text-right px-6 py-4 text-sm font-medium text-neutral-400">Base Salary</th>
                  <th className="text-center px-6 py-4 text-sm font-medium text-neutral-400">Level</th>
                  <th className="text-center px-6 py-4 text-sm font-medium text-neutral-400">Status</th>
                  <th className="text-right px-6 py-4 text-sm font-medium text-neutral-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-factory-border">
                {designations.map((designation) => (
                  <tr key={designation.id} className="hover:bg-factory-gray transition-colors">
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 rounded bg-primary-500/20 text-primary-400 text-xs font-mono">
                        {designation.code}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-white font-medium">{designation.name}</p>
                      {designation.nameUrdu && (
                        <p className="text-sm text-neutral-500" dir="rtl">{designation.nameUrdu}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-neutral-300">{designation.department || '-'}</td>
                    <td className="px-6 py-4 text-right text-neutral-300">
                      {designation.baseSalary ? formatCurrency(Number(designation.baseSalary)) : '-'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="px-2 py-1 rounded bg-factory-gray text-neutral-300 text-xs">
                        Level {designation.level}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                        designation.isActive ? 'bg-success/20 text-success' : 'bg-neutral-500/20 text-neutral-400'
                      }`}>
                        {designation.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => openEditModal(designation)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(designation.id)}>
                          <Trash2 className="w-4 h-4 text-error" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {designations.length === 0 && (
            <div className="text-center py-12">
              <Award className="w-12 h-12 text-neutral-600 mx-auto mb-3" />
              <p className="text-neutral-400">No designations found</p>
              <Button onClick={openCreateModal} variant="secondary" className="mt-4">
                Add First Designation
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowModal(false)} />
          <div className="relative bg-factory-dark border border-factory-border rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white">
                {editingId ? 'Edit Designation' : 'Add Designation'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-neutral-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="e.g., MGR"
              />
              <Input
                label="Name *"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Manager"
                required
              />
              <Input
                label="Name (Urdu)"
                value={formData.nameUrdu}
                onChange={(e) => setFormData({ ...formData, nameUrdu: e.target.value })}
                dir="rtl"
              />
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">Department</label>
                <input
                  type="text"
                  list="departments"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white"
                  placeholder="e.g., Production"
                />
                <datalist id="departments">
                  {departments.map((d) => <option key={d} value={d} />)}
                </datalist>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Base Salary"
                  type="number"
                  value={formData.baseSalary || ''}
                  onChange={(e) => setFormData({ ...formData, baseSalary: Number(e.target.value) })}
                />
                <Input
                  label="Level"
                  type="number"
                  min={1}
                  max={10}
                  value={formData.level}
                  onChange={(e) => setFormData({ ...formData, level: Number(e.target.value) })}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="rounded"
                />
                <label htmlFor="isActive" className="text-sm text-neutral-300">Active</label>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? 'Saving...' : editingId ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
