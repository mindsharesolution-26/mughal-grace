'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useToast } from '@/contexts/ToastContext';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { knittingMachineSizesApi } from '@/lib/api/settings';
import {
  KnittingMachineSize,
  KnittingMachineSizeFormData,
  knittingMachineTypeOptions,
} from '@/lib/types/settings';

export default function MachineSizesPage() {
  const { showToast } = useToast();
  const [sizes, setSizes] = useState<KnittingMachineSize[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('active');
  const [searchQuery, setSearchQuery] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<KnittingMachineSize | null>(null);
  const [viewing, setViewing] = useState<KnittingMachineSize | null>(null);

  useEffect(() => {
    fetchSizes();
  }, []);

  const fetchSizes = async () => {
    setLoading(true);
    try {
      const data = await knittingMachineSizesApi.getAll();
      setSizes(data);
    } catch (error) {
      showToast('error', 'Failed to load machine sizes');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this machine size?')) return;
    try {
      await knittingMachineSizesApi.delete(id);
      showToast('success', 'Machine size deleted');
      fetchSizes();
    } catch (error: any) {
      showToast('error', error.response?.data?.error || 'Failed to delete machine size');
    }
  };

  const filteredSizes = sizes.filter((s) => {
    const matchesFilter =
      filter === 'all' ||
      (filter === 'active' && s.isActive) ||
      (filter === 'inactive' && !s.isActive);
    const matchesSearch =
      searchQuery === '' ||
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.code.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // View Modal Component
  const MachineSizeViewModal = () => {
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
                <span className="text-primary-400 font-bold text-sm">
                  {viewing.code}
                </span>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">Machine Size Details</h2>
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
                <DetailRow label="Machine Type" value={viewing.machineType} />
                <DetailRow label="Description" value={viewing.description} />
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-primary-400 mb-3">Specifications</h3>
              <div className="bg-factory-gray/30 rounded-xl p-4">
                <DetailRow label="Gauge" value={viewing.gauge} />
                <DetailRow label="Diameter (inches)" value={viewing.diameter} />
                <DetailRow label="Needle Count" value={viewing.needleCount} />
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
  const MachineSizeModal = () => {
    const [formData, setFormData] = useState<KnittingMachineSizeFormData>({
      code: editing?.code || '',
      name: editing?.name || '',
      gauge: editing?.gauge ?? null,
      diameter: editing?.diameter ?? null,
      needleCount: editing?.needleCount ?? null,
      machineType: editing?.machineType || '',
      description: editing?.description || '',
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
          await knittingMachineSizesApi.update(editing.id, formData);
          showToast('success', 'Machine size updated');
        } else {
          await knittingMachineSizesApi.create(formData);
          showToast('success', 'Machine size created');
        }
        setShowModal(false);
        setEditing(null);
        fetchSizes();
      } catch (error: any) {
        showToast('error', error.response?.data?.error || 'Failed to save machine size');
      } finally {
        setSaving(false);
      }
    };

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-factory-dark rounded-2xl border border-factory-border w-full max-w-lg max-h-[90vh] overflow-y-auto">
          <div className="p-6 border-b border-factory-border sticky top-0 bg-factory-dark">
            <h2 className="text-xl font-semibold text-white">
              {editing ? 'Edit Machine Size' : 'Add Machine Size'}
            </h2>
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Code *"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="G24-D30"
                required
              />
              <Input
                label="Name *"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="24 Gauge 30 Dia"
                required
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Input
                label="Gauge"
                type="number"
                value={formData.gauge ?? ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    gauge: e.target.value ? Number(e.target.value) : null,
                  })
                }
                placeholder="24"
              />
              <Input
                label="Diameter (inches)"
                type="number"
                value={formData.diameter ?? ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    diameter: e.target.value ? Number(e.target.value) : null,
                  })
                }
                placeholder="30"
              />
              <Input
                label="Needle Count"
                type="number"
                value={formData.needleCount ?? ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    needleCount: e.target.value ? Number(e.target.value) : null,
                  })
                }
                placeholder="2256"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                Machine Type
              </label>
              <select
                value={formData.machineType || ''}
                onChange={(e) => setFormData({ ...formData, machineType: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Select Type</option>
                {knittingMachineTypeOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
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
                id="size-active"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="w-4 h-4"
              />
              <label htmlFor="size-active" className="text-neutral-300">
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
        <span className="text-white">Machine Sizes</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Knitting Machine Sizes</h1>
          <p className="text-neutral-400 mt-1">
            Configure machine gauge, diameter, and needle count
          </p>
        </div>
        <Button onClick={() => setShowModal(true)}>+ Add Machine Size</Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <Input
          placeholder="Search machine sizes..."
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
        ) : filteredSizes.length === 0 ? (
          <div className="text-center py-12 text-neutral-400">
            {sizes.length === 0
              ? 'No machine sizes yet. Add your first machine size!'
              : 'No machine sizes match your filters.'}
          </div>
        ) : (
          <div className="divide-y divide-factory-border">
            {filteredSizes.map((size) => (
              <div
                key={size.id}
                className="flex items-center justify-between p-4 hover:bg-factory-gray/50"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className="text-primary-400 font-mono text-sm">{size.code}</span>
                    <span className="text-white font-medium">{size.name}</span>
                    {size.machineType && (
                      <span className="px-2 py-0.5 bg-factory-border text-neutral-300 text-xs rounded">
                        {size.machineType}
                      </span>
                    )}
                    {!size.isActive && (
                      <span className="px-2 py-0.5 bg-neutral-500/20 text-neutral-400 text-xs rounded">
                        Inactive
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-sm text-neutral-400">
                    {size.gauge && <span>Gauge: {size.gauge}</span>}
                    {size.diameter && <span>Diameter: {size.diameter}"</span>}
                    {size.needleCount && <span>Needles: {size.needleCount}</span>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setViewing(size)}
                  >
                    View
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditing(size);
                      setShowModal(true);
                    }}
                  >
                    Edit
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(size.id)}>
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* View Modal */}
      {viewing && <MachineSizeViewModal />}

      {/* Edit Modal */}
      {showModal && <MachineSizeModal />}
    </div>
  );
}
