'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useToast } from '@/contexts/ToastContext';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { fabricSizesApi, fabricFormsApi } from '@/lib/api/settings';
import { FabricSize, FabricSizeFormData, FabricForm, WidthUnit, fabricWidthUnitOptions } from '@/lib/types/settings';

export default function FabricSizesPage() {
  const { showToast } = useToast();
  const [sizes, setSizes] = useState<FabricSize[]>([]);
  const [forms, setForms] = useState<FabricForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('active');
  const [searchQuery, setSearchQuery] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<FabricSize | null>(null);
  const [viewing, setViewing] = useState<FabricSize | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [sizesData, formsData] = await Promise.all([
        fabricSizesApi.getAll(),
        fabricFormsApi.getAll(),
      ]);
      setSizes(sizesData);
      setForms(formsData.filter(f => f.isActive));
    } catch (error) {
      showToast('error', 'Failed to load fabric sizes');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this fabric size?')) return;
    try {
      await fabricSizesApi.delete(id);
      showToast('success', 'Fabric size deleted');
      fetchData();
    } catch (error: any) {
      showToast('error', error.response?.data?.error || 'Failed to delete fabric size');
    }
  };

  const handleSeedDefaults = async () => {
    try {
      // First seed forms, then sizes
      await fabricFormsApi.seedDefaults();
      const result = await fabricSizesApi.seedDefaults();
      showToast('success', result.message);
      fetchData();
    } catch (error) {
      showToast('error', 'Failed to seed default fabric sizes');
    }
  };

  const filteredSizes = sizes.filter((s) => {
    const matchesFilter =
      filter === 'all' ||
      (filter === 'active' && s.isActive) ||
      (filter === 'inactive' && !s.isActive);
    const matchesSearch =
      searchQuery === '' ||
      s.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.form?.name && s.form.name.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  // Group by unit
  const groupedSizes = {
    INCHES: filteredSizes.filter((s) => s.unit === 'INCHES'),
    MM: filteredSizes.filter((s) => s.unit === 'MM'),
  };

  // View Modal Component
  const SizeViewModal = () => {
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
        <div className="bg-factory-dark rounded-2xl border border-factory-border w-full max-w-md max-h-[90vh] overflow-y-auto">
          <div className="p-6 border-b border-factory-border sticky top-0 bg-factory-dark z-10 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">Fabric Size Details</h2>
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
            <div>
              <h3 className="text-sm font-medium text-primary-400 mb-3">Size Information</h3>
              <div className="bg-factory-gray/30 rounded-xl p-4">
                <DetailRow label="Display Name" value={viewing.displayName} />
                <DetailRow label="Width Value" value={viewing.widthValue?.toString()} />
                <DetailRow label="Unit" value={viewing.unit === 'INCHES' ? 'Inches' : 'Millimeters'} />
                <DetailRow label="Fabric Form" value={viewing.form?.name} />
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
  const SizeModal = () => {
    const [formData, setFormData] = useState<FabricSizeFormData>({
      widthValue: editing ? Number(editing.widthValue) : 0,
      unit: editing?.unit || 'INCHES',
      formId: editing?.formId || null,
      description: editing?.description || '',
      notes: editing?.notes || '',
      isActive: editing?.isActive ?? true,
      sortOrder: editing?.sortOrder ?? 0,
    });
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!formData.widthValue || formData.widthValue <= 0) {
        showToast('error', 'Width value must be greater than 0');
        return;
      }
      setSaving(true);
      try {
        if (editing) {
          await fabricSizesApi.update(editing.id, formData);
          showToast('success', 'Fabric size updated');
        } else {
          await fabricSizesApi.create(formData);
          showToast('success', 'Fabric size created');
        }
        setShowModal(false);
        setEditing(null);
        fetchData();
      } catch (error: any) {
        showToast('error', error.response?.data?.error || 'Failed to save fabric size');
      } finally {
        setSaving(false);
      }
    };

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-factory-dark rounded-2xl border border-factory-border w-full max-w-md max-h-[90vh] overflow-y-auto">
          <div className="p-6 border-b border-factory-border sticky top-0 bg-factory-dark">
            <h2 className="text-xl font-semibold text-white">
              {editing ? 'Edit Fabric Size' : 'Add Fabric Size'}
            </h2>
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Width Value *"
                type="number"
                step="0.01"
                min="0.01"
                value={formData.widthValue || ''}
                onChange={(e) => setFormData({ ...formData, widthValue: Number(e.target.value) })}
                placeholder="36"
                required
              />
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                  Unit *
                </label>
                <select
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value as WidthUnit })}
                  className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                >
                  {fabricWidthUnitOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Fabric Form Dropdown (Open/Tube) */}
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                Fabric Form <span className="text-neutral-500">(Open/Tube)</span>
              </label>
              <select
                value={formData.formId || ''}
                onChange={(e) => setFormData({ ...formData, formId: e.target.value ? Number(e.target.value) : null })}
                className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Select form (optional)</option>
                {forms.map((form) => (
                  <option key={form.id} value={form.id}>
                    {form.name}
                  </option>
                ))}
              </select>
              {forms.length === 0 && (
                <p className="text-xs text-neutral-500 mt-1">
                  No forms available. Click &quot;Seed Defaults&quot; to add Open and Tube forms.
                </p>
              )}
            </div>

            <div className="p-3 bg-factory-gray/50 rounded-xl">
              <p className="text-sm text-neutral-400">
                Display Name (auto-generated):
              </p>
              <p className="text-white font-medium">
                {formData.widthValue || '0'} {formData.unit === 'INCHES' ? 'Inches' : 'mm'}
                {formData.formId && forms.find(f => f.id === formData.formId) && (
                  <span className="text-primary-400 ml-2">
                    ({forms.find(f => f.id === formData.formId)?.name})
                  </span>
                )}
              </p>
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

  const renderSizeRow = (size: FabricSize) => (
    <div
      key={size.id}
      className="flex items-center justify-between p-3 bg-factory-gray rounded-xl"
    >
      <div className="flex items-center gap-4">
        <span className="text-lg font-medium text-white w-28">{size.displayName}</span>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-neutral-500 font-mono text-xs">({size.code})</span>
            {size.form && (
              <span className="px-1.5 py-0.5 bg-primary-500/20 text-primary-400 text-xs rounded">
                {size.form.name}
              </span>
            )}
            {!size.isActive && (
              <span className="px-1.5 py-0.5 bg-neutral-500/20 text-neutral-400 text-xs rounded">
                Inactive
              </span>
            )}
          </div>
          {size.description && (
            <p className="text-xs text-neutral-400 mt-1">{size.description}</p>
          )}
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
  );

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-neutral-400">
        <Link href="/settings" className="hover:text-white">
          General
        </Link>
        <span>/</span>
        <span className="text-white">Fabric Sizes</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Fabric Sizes</h1>
          <p className="text-neutral-400 mt-1">
            Manage fabric width dimensions and form types (Open/Tube) for your products
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleSeedDefaults}>
            Seed Defaults
          </Button>
          <Button onClick={() => setShowModal(true)}>+ Add Size</Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <Input
          placeholder="Search sizes..."
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

      {/* List grouped by unit */}
      <div className="bg-factory-dark rounded-2xl border border-factory-border">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
          </div>
        ) : filteredSizes.length === 0 ? (
          <div className="text-center py-12 text-neutral-400">
            {sizes.length === 0 ? (
              <div>
                <p>No fabric sizes yet. Click &quot;Seed Defaults&quot; to add common sizes.</p>
              </div>
            ) : (
              'No fabric sizes match your filters.'
            )}
          </div>
        ) : (
          <div className="divide-y divide-factory-border">
            {/* Inches group */}
            {groupedSizes.INCHES.length > 0 && (
              <div className="p-4">
                <h3 className="text-sm font-medium text-neutral-400 mb-3">Inches</h3>
                <div className="space-y-2">
                  {groupedSizes.INCHES.map(renderSizeRow)}
                </div>
              </div>
            )}
            {/* MM group */}
            {groupedSizes.MM.length > 0 && (
              <div className="p-4">
                <h3 className="text-sm font-medium text-neutral-400 mb-3">Millimeters</h3>
                <div className="space-y-2">
                  {groupedSizes.MM.map(renderSizeRow)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* View Modal */}
      {viewing && <SizeViewModal />}

      {/* Edit Modal */}
      {showModal && <SizeModal />}
    </div>
  );
}
