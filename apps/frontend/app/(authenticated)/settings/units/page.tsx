'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useToast } from '@/contexts/ToastContext';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { unitsApi } from '@/lib/api/settings';
import { Unit, UnitFormData, unitCategoryOptions, UnitCategory } from '@/lib/types/settings';

export default function UnitsPage() {
  const { showToast } = useToast();
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('active');
  const [searchQuery, setSearchQuery] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Unit | null>(null);
  const [viewing, setViewing] = useState<Unit | null>(null);

  useEffect(() => {
    fetchUnits();
  }, []);

  const fetchUnits = async () => {
    setLoading(true);
    try {
      const data = await unitsApi.getAll();
      setUnits(data);
    } catch (error) {
      showToast('error', 'Failed to load units');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this unit?')) return;
    try {
      await unitsApi.delete(id);
      showToast('success', 'Unit deleted');
      fetchUnits();
    } catch (error: any) {
      showToast('error', error.response?.data?.error || 'Failed to delete unit');
    }
  };

  const handleSeedDefaults = async () => {
    try {
      const result = await unitsApi.seedDefaults();
      showToast('success', result.message);
      fetchUnits();
    } catch (error) {
      showToast('error', 'Failed to seed default units');
    }
  };

  const filteredUnits = units.filter((u) => {
    const matchesFilter =
      filter === 'all' ||
      (filter === 'active' && u.isActive) ||
      (filter === 'inactive' && !u.isActive);
    const matchesSearch =
      searchQuery === '' ||
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.symbol.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // Group by category
  const groupedUnits = unitCategoryOptions.reduce((acc, category) => {
    const categoryUnits = filteredUnits.filter((u) => u.category === category.value);
    if (categoryUnits.length > 0) {
      acc[category.value] = categoryUnits;
    }
    return acc;
  }, {} as Record<UnitCategory, Unit[]>);

  // View Modal Component
  const UnitViewModal = () => {
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
              <span className="text-2xl font-medium text-white">{viewing.symbol}</span>
              <div>
                <h2 className="text-xl font-semibold text-white">{viewing.name}</h2>
                <p className="text-sm text-neutral-400 mt-0.5">Code: {viewing.code}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {viewing.siUnit && (
                <span className="px-2 py-1 bg-primary-500/20 text-primary-400 text-xs rounded">
                  SI
                </span>
              )}
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                viewing.isActive
                  ? 'bg-success/20 text-success'
                  : 'bg-neutral-500/20 text-neutral-400'
              }`}>
                {viewing.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>

          <div className="p-6 space-y-6">
            <div>
              <h3 className="text-sm font-medium text-primary-400 mb-3">Unit Information</h3>
              <div className="bg-factory-gray/30 rounded-xl p-4">
                <DetailRow label="Code" value={viewing.code} />
                <DetailRow label="Symbol" value={viewing.symbol} />
                <DetailRow label="Name" value={viewing.name} />
                <DetailRow label="Category" value={unitCategoryOptions.find(c => c.value === viewing.category)?.label || viewing.category} />
                <DetailRow label="ISO Code" value={viewing.isoCode} />
                <DetailRow label="Base Unit" value={viewing.baseUnit} />
                <DetailRow label="Conversion Factor" value={viewing.conversionFactor?.toString()} />
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
  const UnitModal = () => {
    const [formData, setFormData] = useState<UnitFormData>({
      code: editing?.code || '',
      name: editing?.name || '',
      symbol: editing?.symbol || '',
      category: editing?.category || 'COUNT',
      description: editing?.description || '',
      baseUnit: editing?.baseUnit || '',
      conversionFactor: editing?.conversionFactor ? Number(editing.conversionFactor) : undefined,
      siUnit: editing?.siUnit ?? false,
      isoCode: editing?.isoCode || '',
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
          await unitsApi.update(editing.id, formData);
          showToast('success', 'Unit updated');
        } else {
          await unitsApi.create(formData);
          showToast('success', 'Unit created');
        }
        setShowModal(false);
        setEditing(null);
        fetchUnits();
      } catch (error: any) {
        showToast('error', error.response?.data?.error || 'Failed to save unit');
      } finally {
        setSaving(false);
      }
    };

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-factory-dark rounded-2xl border border-factory-border w-full max-w-lg max-h-[90vh] overflow-y-auto">
          <div className="p-6 border-b border-factory-border sticky top-0 bg-factory-dark">
            <h2 className="text-xl font-semibold text-white">
              {editing ? 'Edit Unit' : 'Add Unit'}
            </h2>
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Code *"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="KG"
                required
              />
              <Input
                label="Symbol *"
                value={formData.symbol}
                onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
                placeholder="kg"
                required
              />
            </div>
            <Input
              label="Name *"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Kilogram"
              required
            />
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                Category *
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as UnitCategory })}
                className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              >
                {unitCategoryOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Base Unit"
                value={formData.baseUnit || ''}
                onChange={(e) => setFormData({ ...formData, baseUnit: e.target.value || null })}
                placeholder="KG"
              />
              <Input
                label="Conversion Factor"
                type="number"
                step="any"
                value={formData.conversionFactor ?? ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    conversionFactor: e.target.value ? Number(e.target.value) : null,
                  })
                }
                placeholder="1"
              />
            </div>
            <Input
              label="ISO Code"
              value={formData.isoCode || ''}
              onChange={(e) => setFormData({ ...formData, isoCode: e.target.value || null })}
              placeholder="KGM"
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
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="unit-si"
                  checked={formData.siUnit}
                  onChange={(e) => setFormData({ ...formData, siUnit: e.target.checked })}
                  className="w-4 h-4"
                />
                <label htmlFor="unit-si" className="text-neutral-300">
                  SI Unit
                </label>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="unit-active"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4"
                />
                <label htmlFor="unit-active" className="text-neutral-300">
                  Active
                </label>
              </div>
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
        <span className="text-white">Units</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Units of Measurement</h1>
          <p className="text-neutral-400 mt-1">
            International standard units for measurement
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleSeedDefaults}>
            Seed Defaults
          </Button>
          <Button onClick={() => setShowModal(true)}>+ Add Unit</Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <Input
          placeholder="Search units..."
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

      {/* List grouped by category */}
      <div className="bg-factory-dark rounded-2xl border border-factory-border">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
          </div>
        ) : Object.keys(groupedUnits).length === 0 ? (
          <div className="text-center py-12 text-neutral-400">
            {units.length === 0 ? (
              <div>
                <p>No units yet. Click "Seed Defaults" to add international standard units.</p>
              </div>
            ) : (
              'No units match your filters.'
            )}
          </div>
        ) : (
          <div className="divide-y divide-factory-border">
            {unitCategoryOptions.map((category) => {
              const categoryUnits = groupedUnits[category.value];
              if (!categoryUnits) return null;
              return (
                <div key={category.value} className="p-4">
                  <h3 className="text-sm font-medium text-neutral-400 mb-3">{category.label}</h3>
                  <div className="space-y-2">
                    {categoryUnits.map((unit) => (
                      <div
                        key={unit.id}
                        className="flex items-center justify-between p-3 bg-factory-gray rounded-xl"
                      >
                        <div className="flex items-center gap-4">
                          <span className="text-lg font-medium text-white w-12">{unit.symbol}</span>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-white">{unit.name}</span>
                              <span className="text-neutral-500 font-mono text-xs">({unit.code})</span>
                              {unit.siUnit && (
                                <span className="px-1.5 py-0.5 bg-primary-500/20 text-primary-400 text-xs rounded">
                                  SI
                                </span>
                              )}
                              {!unit.isActive && (
                                <span className="px-1.5 py-0.5 bg-neutral-500/20 text-neutral-400 text-xs rounded">
                                  Inactive
                                </span>
                              )}
                            </div>
                            {unit.baseUnit && unit.conversionFactor && (
                              <p className="text-xs text-neutral-400">
                                1 {unit.code} = {unit.conversionFactor} {unit.baseUnit}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setViewing(unit)}
                          >
                            View
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditing(unit);
                              setShowModal(true);
                            }}
                          >
                            Edit
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(unit.id)}>
                            Delete
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* View Modal */}
      {viewing && <UnitViewModal />}

      {/* Edit Modal */}
      {showModal && <UnitModal />}
    </div>
  );
}
