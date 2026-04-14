'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useToast } from '@/contexts/ToastContext';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { materialsApi } from '@/lib/api/settings';
import {
  Material,
  MaterialFormData,
  yarnGradeOptions,
} from '@/lib/types/settings';

// Material View Modal Component - read-only display
interface MaterialViewModalProps {
  material: Material;
  onClose: () => void;
  onEdit: () => void;
}

function MaterialViewModal({ material, onClose, onEdit }: MaterialViewModalProps) {
  const DetailRow = ({ label, value }: { label: string; value: string | number | null | undefined }) => {
    if (value === null || value === undefined || value === '') return null;
    return (
      <div className="flex justify-between py-2 border-b border-factory-border/50">
        <span className="text-neutral-400 text-sm">{label}</span>
        <span className="text-white text-sm">{value}</span>
      </div>
    );
  };

  const gradeBadgeClass = material.grade ? {
    'AAA': 'bg-emerald-500/20 text-emerald-400',
    'AA': 'bg-green-500/20 text-green-400',
    'A': 'bg-blue-500/20 text-blue-400',
    'B': 'bg-amber-500/20 text-amber-400',
    'C': 'bg-orange-500/20 text-orange-400',
  }[material.grade] || 'bg-factory-border text-neutral-300' : null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-factory-dark rounded-2xl border border-factory-border w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-factory-border sticky top-0 bg-factory-dark z-10 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">Yarn Spec Details</h2>
            <p className="text-sm text-neutral-400 mt-1">Code: {material.code}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
            material.isActive
              ? 'bg-success/20 text-success'
              : 'bg-neutral-500/20 text-neutral-400'
          }`}>
            {material.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>

        <div className="p-6 space-y-6">
          {/* Basic Info */}
          <div>
            <h3 className="text-sm font-medium text-primary-400 mb-3">Yarn Specification</h3>
            <div className="bg-factory-gray/30 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-lg font-medium text-white">{material.name}</span>
                {material.grade && gradeBadgeClass && (
                  <span className={`px-2 py-0.5 text-xs rounded font-semibold ${gradeBadgeClass}`}>
                    {material.grade}
                  </span>
                )}
                {material.gradeNumber && (
                  <span className="px-2 py-0.5 bg-factory-border text-neutral-200 text-xs rounded font-mono">
                    #{material.gradeNumber}
                  </span>
                )}
              </div>
              <DetailRow label="Description" value={material.description} />
            </div>
          </div>

          {/* Notes */}
          {material.notes && (
            <div>
              <h3 className="text-sm font-medium text-primary-400 mb-3">Notes</h3>
              <div className="bg-factory-gray/30 rounded-xl p-4">
                <p className="text-white text-sm whitespace-pre-wrap">{material.notes}</p>
              </div>
            </div>
          )}

          {/* Metadata */}
          <div>
            <h3 className="text-sm font-medium text-primary-400 mb-3">Record Information</h3>
            <div className="bg-factory-gray/30 rounded-xl p-4">
              <DetailRow label="Sort Order" value={material.sortOrder} />
              <DetailRow
                label="Created At"
                value={material.createdAt ? new Date(material.createdAt).toLocaleString() : undefined}
              />
              <DetailRow
                label="Updated At"
                value={material.updatedAt ? new Date(material.updatedAt).toLocaleString() : undefined}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 p-6 border-t border-factory-border">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button onClick={onEdit}>
            Edit
          </Button>
        </div>
      </div>
    </div>
  );
}

// Material Modal Component - moved outside to prevent recreation on every render
interface MaterialModalProps {
  editing: Material | null;
  onClose: () => void;
  onSave: () => void;
  showToast: (type: 'success' | 'error' | 'info', message: string) => void;
}

function MaterialModal({ editing, onClose, onSave, showToast }: MaterialModalProps) {
  const [formData, setFormData] = useState<MaterialFormData>({
    name: editing?.name || '',
    grade: editing?.grade || null,
    gradeNumber: editing?.gradeNumber || null,
    description: editing?.description || '',
    notes: editing?.notes || '',
    isActive: editing?.isActive ?? true,
    sortOrder: editing?.sortOrder ?? 0,
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate name is not empty
    if (!formData.name || formData.name.trim() === '') {
      showToast('error', 'Yarn specification is required');
      return;
    }

    setSaving(true);
    try {
      // Helper to convert empty strings to null
      const emptyToNull = (val: string | null | undefined): string | null => {
        if (val === undefined || val === null || val.trim() === '') return null;
        return val.trim();
      };

      // Create clean payload - convert empty strings to null for optional fields
      const payload: MaterialFormData = {
        name: formData.name.trim(),
        grade: emptyToNull(formData.grade),
        gradeNumber: emptyToNull(formData.gradeNumber),
        description: emptyToNull(formData.description),
        notes: emptyToNull(formData.notes),
        isActive: formData.isActive,
        sortOrder: formData.sortOrder,
      };

      if (editing) {
        await materialsApi.update(editing.id, payload);
        showToast('success', 'Yarn spec updated');
      } else {
        await materialsApi.create(payload);
        showToast('success', 'Yarn spec created');
      }
      onSave();
    } catch (error: any) {
      console.error('Material save error:', error);
      showToast('error', error.response?.data?.error || 'Failed to save yarn spec');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-factory-dark rounded-2xl border border-factory-border w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-factory-border sticky top-0 bg-factory-dark z-10">
          <h2 className="text-xl font-semibold text-white">
            {editing ? 'Edit Yarn Spec' : 'Add Yarn Spec'}
          </h2>
          {editing && (
            <p className="text-sm text-neutral-400 mt-1">Code: {editing.code}</p>
          )}
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Yarn Specification - Required */}
          <Input
            label="Yarn Specification *"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="e.g., 70/24/1 RW, 150/48/2 FD"
            required
          />
          <p className="text-xs text-neutral-500 -mt-3">
            Format: Count/Filaments/Ply + Type (RW=Raw White, FD=Full Dull, SD=Semi Dull, BR=Bright)
          </p>

          {/* Grade and Grade Number */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                Quality Grade
              </label>
              <select
                value={formData.grade || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  grade: e.target.value || null
                }))}
                className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Select Grade</option>
                {yarnGradeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <Input
              label="Grade Number"
              value={formData.gradeNumber || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, gradeNumber: e.target.value || null }))}
              placeholder="e.g., 001, A1"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1.5">
              Description
            </label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value || null }))}
              rows={2}
              className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Optional description..."
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1.5">
              Internal Notes
            </label>
            <textarea
              value={formData.notes || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value || null }))}
              rows={2}
              className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Internal notes..."
            />
          </div>

          {/* Active Status */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="material-active"
              checked={formData.isActive}
              onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
              className="w-4 h-4"
            />
            <label htmlFor="material-active" className="text-neutral-300">
              Active
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-factory-border">
            <Button type="button" variant="secondary" onClick={onClose}>
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
}

// Helper to get grade badge styling
function getGradeBadgeClass(grade: string | null) {
  if (!grade) return null;

  const colorMap: Record<string, string> = {
    'AAA': 'bg-emerald-500/20 text-emerald-400',
    'AA': 'bg-green-500/20 text-green-400',
    'A': 'bg-blue-500/20 text-blue-400',
    'B': 'bg-amber-500/20 text-amber-400',
    'C': 'bg-orange-500/20 text-orange-400',
  };

  return colorMap[grade] || 'bg-factory-border text-neutral-300';
}

export default function MaterialsPage() {
  const { showToast } = useToast();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('active');
  const [gradeFilter, setGradeFilter] = useState<string | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Material | null>(null);
  const [viewing, setViewing] = useState<Material | null>(null);

  useEffect(() => {
    fetchMaterials();
  }, []);

  const fetchMaterials = async () => {
    setLoading(true);
    try {
      const data = await materialsApi.getAll();
      setMaterials(data);
    } catch (error) {
      showToast('error', 'Failed to load yarn specs');
    } finally {
      setLoading(false);
    }
  };

  const handleSeedDefaults = async () => {
    if (!confirm('This will add common yarn specifications (70/24/1 RW, 150/48/2 FD, etc.) to your list. Continue?')) {
      return;
    }
    setSeeding(true);
    try {
      const result = await materialsApi.seedDefaults();
      showToast('success', result.message);
      fetchMaterials();
    } catch (error: any) {
      showToast('error', error.response?.data?.error || 'Failed to seed default yarn specs');
    } finally {
      setSeeding(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this yarn spec?')) return;
    try {
      await materialsApi.delete(id);
      showToast('success', 'Yarn spec deleted');
      fetchMaterials();
    } catch (error: any) {
      showToast('error', error.response?.data?.error || 'Failed to delete yarn spec');
    }
  };

  const handleModalClose = () => {
    setShowModal(false);
    setEditing(null);
  };

  const handleModalSave = () => {
    setShowModal(false);
    setEditing(null);
    fetchMaterials();
  };

  const filteredMaterials = materials.filter((m) => {
    const matchesStatus =
      filter === 'all' ||
      (filter === 'active' && m.isActive) ||
      (filter === 'inactive' && !m.isActive);
    const matchesGrade =
      gradeFilter === 'all' || m.grade === gradeFilter;
    const matchesSearch =
      searchQuery === '' ||
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.gradeNumber && m.gradeNumber.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesStatus && matchesGrade && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-neutral-400">
        <Link href="/settings" className="hover:text-white">
          Settings
        </Link>
        <span>/</span>
        <span className="text-white">Materials</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Yarn Specifications</h1>
          <p className="text-neutral-400 mt-1">
            Manage raw materials / yarn specs for knitting (e.g., 70/24/1 RW, 150/48/2 FD)
          </p>
        </div>
        <div className="flex gap-2">
          {materials.length === 0 && (
            <Button
              variant="secondary"
              onClick={handleSeedDefaults}
              disabled={seeding}
            >
              {seeding ? 'Seeding...' : 'Seed Default Yarns'}
            </Button>
          )}
          <Button onClick={() => setShowModal(true)}>+ Add Yarn Spec</Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <Input
          placeholder="Search by spec, code, or grade number..."
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
        <div className="h-6 w-px bg-factory-border" />
        <select
          value={gradeFilter}
          onChange={(e) => setGradeFilter(e.target.value)}
          className="px-3 py-1.5 rounded-lg text-sm bg-factory-gray border border-factory-border text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="all">All Grades</option>
          {yarnGradeOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.value}
            </option>
          ))}
        </select>
      </div>

      {/* List */}
      <div className="bg-factory-dark rounded-2xl border border-factory-border">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
          </div>
        ) : filteredMaterials.length === 0 ? (
          <div className="text-center py-12 text-neutral-400">
            {materials.length === 0 ? (
              <div className="space-y-3">
                <p>No yarn specifications yet.</p>
                <Button variant="secondary" onClick={handleSeedDefaults} disabled={seeding}>
                  {seeding ? 'Seeding...' : 'Seed Default Yarn Specs'}
                </Button>
              </div>
            ) : (
              'No yarn specs match your filters.'
            )}
          </div>
        ) : (
          <div className="divide-y divide-factory-border">
            {filteredMaterials.map((material) => {
              const gradeBadgeClass = getGradeBadgeClass(material.grade);
              return (
                <div
                  key={material.id}
                  className="flex items-center justify-between p-4 hover:bg-factory-gray/50"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-primary-400 font-mono text-sm">{material.code}</span>
                      <span className="text-white font-medium text-lg">{material.name}</span>
                      {material.grade && gradeBadgeClass && (
                        <span className={`px-2 py-0.5 text-xs rounded font-semibold ${gradeBadgeClass}`}>
                          {material.grade}
                        </span>
                      )}
                      {material.gradeNumber && (
                        <span className="px-2 py-0.5 bg-factory-border text-neutral-200 text-xs rounded font-mono">
                          #{material.gradeNumber}
                        </span>
                      )}
                      {!material.isActive && (
                        <span className="px-2 py-0.5 bg-neutral-500/20 text-neutral-400 text-xs rounded">
                          Inactive
                        </span>
                      )}
                    </div>
                    {material.description && (
                      <p className="text-sm text-neutral-400 mt-1 line-clamp-1">
                        {material.description}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setViewing(material)}
                    >
                      View
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditing(material);
                        setShowModal(true);
                      }}
                    >
                      Edit
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(material.id)}>
                      Delete
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* View Modal */}
      {viewing && (
        <MaterialViewModal
          material={viewing}
          onClose={() => setViewing(null)}
          onEdit={() => {
            setEditing(viewing);
            setViewing(null);
            setShowModal(true);
          }}
        />
      )}

      {/* Edit Modal */}
      {showModal && (
        <MaterialModal
          key={editing?.id ?? 'new'}
          editing={editing}
          onClose={handleModalClose}
          onSave={handleModalSave}
          showToast={showToast}
        />
      )}
    </div>
  );
}
