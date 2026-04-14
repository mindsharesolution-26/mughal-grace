'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useToast } from '@/contexts/ToastContext';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { fabricFormsApi } from '@/lib/api/settings';
import { FabricForm, FabricFormFormData } from '@/lib/types/settings';

export default function FabricFormsPage() {
  const { showToast } = useToast();
  const [forms, setForms] = useState<FabricForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('active');
  const [searchQuery, setSearchQuery] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<FabricForm | null>(null);
  const [viewing, setViewing] = useState<FabricForm | null>(null);

  useEffect(() => {
    fetchForms();
  }, []);

  const fetchForms = async () => {
    setLoading(true);
    try {
      const data = await fabricFormsApi.getAll();
      setForms(data);
    } catch (error) {
      showToast('error', 'Failed to load fabric forms');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this fabric form?')) return;
    try {
      await fabricFormsApi.delete(id);
      showToast('success', 'Fabric form deleted');
      fetchForms();
    } catch (error: any) {
      showToast('error', error.response?.data?.error || 'Failed to delete fabric form');
    }
  };

  const handleSeedDefaults = async () => {
    try {
      const result = await fabricFormsApi.seedDefaults();
      showToast('success', result.message);
      fetchForms();
    } catch (error) {
      showToast('error', 'Failed to seed default fabric forms');
    }
  };

  const filteredForms = forms.filter((f) => {
    const matchesFilter =
      filter === 'all' ||
      (filter === 'active' && f.isActive) ||
      (filter === 'inactive' && !f.isActive);
    const matchesSearch =
      searchQuery === '' ||
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.code.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // View Modal Component
  const FabricFormViewModal = () => {
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
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center">
                <span className="text-primary-400 font-bold text-lg">
                  {viewing.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">Fabric Form Details</h2>
                <p className="text-sm text-neutral-400 mt-0.5">{viewing.name}</p>
              </div>
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
            <div>
              <h3 className="text-sm font-medium text-primary-400 mb-3">Basic Information</h3>
              <div className="bg-factory-gray/30 rounded-xl p-4">
                <DetailRow label="Code" value={viewing.code} />
                <DetailRow label="Name" value={viewing.name} />
                <DetailRow label="Description" value={viewing.description} />
              </div>
            </div>

            {viewing.notes && (
              <div>
                <h3 className="text-sm font-medium text-primary-400 mb-3">Notes</h3>
                <div className="bg-factory-gray/30 rounded-xl p-4">
                  <p className="text-white text-sm whitespace-pre-wrap">{viewing.notes}</p>
                </div>
              </div>
            )}

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
  const FormModal = () => {
    const [formData, setFormData] = useState<FabricFormFormData>({
      name: editing?.name || '',
      description: editing?.description || '',
      notes: editing?.notes || '',
      isActive: editing?.isActive ?? true,
      sortOrder: editing?.sortOrder ?? 0,
    });
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!formData.name.trim()) {
        showToast('error', 'Name is required');
        return;
      }
      setSaving(true);
      try {
        if (editing) {
          await fabricFormsApi.update(editing.id, formData);
          showToast('success', 'Fabric form updated');
        } else {
          await fabricFormsApi.create(formData);
          showToast('success', 'Fabric form created');
        }
        setShowModal(false);
        setEditing(null);
        fetchForms();
      } catch (error: any) {
        showToast('error', error.response?.data?.error || 'Failed to save fabric form');
      } finally {
        setSaving(false);
      }
    };

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-factory-dark rounded-2xl border border-factory-border w-full max-w-md max-h-[90vh] overflow-y-auto">
          <div className="p-6 border-b border-factory-border sticky top-0 bg-factory-dark">
            <h2 className="text-xl font-semibold text-white">
              {editing ? 'Edit Fabric Form' : 'Add Fabric Form'}
            </h2>
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <Input
              label="Name *"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Open, Tube"
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
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="form-active"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="w-4 h-4"
              />
              <label htmlFor="form-active" className="text-neutral-300">
                Active
              </label>
            </div>
            <div className="flex justify-end gap-3 pt-4">
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
        <span className="text-white">Fabric Forms</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Fabric Forms</h1>
          <p className="text-neutral-400 mt-1">
            Manage fabric form types (Open/Tube) for your products
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleSeedDefaults}>
            Seed Defaults
          </Button>
          <Button onClick={() => setShowModal(true)}>+ Add Form</Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <Input
          placeholder="Search forms..."
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
        ) : filteredForms.length === 0 ? (
          <div className="text-center py-12 text-neutral-400">
            {forms.length === 0 ? (
              <div>
                <p>No fabric forms yet. Click "Seed Defaults" to add Open and Tube forms.</p>
              </div>
            ) : (
              'No fabric forms match your filters.'
            )}
          </div>
        ) : (
          <div className="divide-y divide-factory-border">
            {filteredForms.map((form) => (
              <div
                key={form.id}
                className="flex items-center justify-between p-4"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary-500/20 flex items-center justify-center">
                    <span className="text-primary-400 font-bold text-lg">
                      {form.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium">{form.name}</span>
                      <span className="text-neutral-500 font-mono text-xs">({form.code})</span>
                      {!form.isActive && (
                        <span className="px-1.5 py-0.5 bg-neutral-500/20 text-neutral-400 text-xs rounded">
                          Inactive
                        </span>
                      )}
                    </div>
                    {form.description && (
                      <p className="text-sm text-neutral-400 mt-1">{form.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setViewing(form)}
                  >
                    View
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditing(form);
                      setShowModal(true);
                    }}
                  >
                    Edit
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(form.id)}>
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* View Modal */}
      {viewing && <FabricFormViewModal />}

      {/* Edit Modal */}
      {showModal && <FormModal />}
    </div>
  );
}
