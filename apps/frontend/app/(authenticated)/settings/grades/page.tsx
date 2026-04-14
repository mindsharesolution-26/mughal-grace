'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useToast } from '@/contexts/ToastContext';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { gradesApi } from '@/lib/api/settings';
import { Grade, GradeFormData } from '@/lib/types/settings';

export default function GradesPage() {
  const { showToast } = useToast();
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('active');
  const [searchQuery, setSearchQuery] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Grade | null>(null);
  const [viewing, setViewing] = useState<Grade | null>(null);

  useEffect(() => {
    fetchGrades();
  }, []);

  const fetchGrades = async () => {
    setLoading(true);
    try {
      const data = await gradesApi.getAll();
      setGrades(data);
    } catch (error) {
      showToast('error', 'Failed to load grades');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this grade?')) return;
    try {
      await gradesApi.delete(id);
      showToast('success', 'Grade deleted');
      fetchGrades();
    } catch (error: any) {
      showToast('error', error.response?.data?.error || 'Failed to delete grade');
    }
  };

  const handleSeedDefaults = async () => {
    try {
      const result = await gradesApi.seedDefaults();
      showToast('success', result.message);
      fetchGrades();
    } catch (error) {
      showToast('error', 'Failed to seed default grades');
    }
  };

  const filteredGrades = grades.filter((g) => {
    const matchesFilter =
      filter === 'all' ||
      (filter === 'active' && g.isActive) ||
      (filter === 'inactive' && !g.isActive);
    const matchesSearch =
      searchQuery === '' ||
      g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.code.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // View Modal Component
  const GradeViewModal = () => {
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
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg ${
                  viewing.level === 1
                    ? 'bg-success/20 text-success'
                    : viewing.level === 2
                    ? 'bg-primary-500/20 text-primary-400'
                    : viewing.level === 3
                    ? 'bg-warning/20 text-warning'
                    : viewing.level >= 99
                    ? 'bg-error/20 text-error'
                    : 'bg-factory-gray text-neutral-400'
                }`}
              >
                {viewing.code}
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">Grade Details</h2>
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
              <h3 className="text-sm font-medium text-primary-400 mb-3">Grade Information</h3>
              <div className="bg-factory-gray/30 rounded-xl p-4">
                <DetailRow label="Code" value={viewing.code} />
                <DetailRow label="Name" value={viewing.name} />
                <DetailRow label="Level (Priority)" value={viewing.level} />
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
  const GradeModal = () => {
    const [formData, setFormData] = useState<GradeFormData>({
      code: editing?.code || '',
      name: editing?.name || '',
      level: editing?.level ?? 0,
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
          await gradesApi.update(editing.id, formData);
          showToast('success', 'Grade updated');
        } else {
          await gradesApi.create(formData);
          showToast('success', 'Grade created');
        }
        setShowModal(false);
        setEditing(null);
        fetchGrades();
      } catch (error: any) {
        showToast('error', error.response?.data?.error || 'Failed to save grade');
      } finally {
        setSaving(false);
      }
    };

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-factory-dark rounded-2xl border border-factory-border w-full max-w-lg max-h-[90vh] overflow-y-auto">
          <div className="p-6 border-b border-factory-border sticky top-0 bg-factory-dark">
            <h2 className="text-xl font-semibold text-white">
              {editing ? 'Edit Grade' : 'Add Grade'}
            </h2>
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Code *"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="A"
                required
              />
              <Input
                label="Name *"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="A Grade"
                required
              />
            </div>
            <Input
              label="Level (Priority)"
              type="number"
              min="0"
              value={formData.level ?? 0}
              onChange={(e) => setFormData({ ...formData, level: Number(e.target.value) })}
            />
            <p className="text-xs text-neutral-500 -mt-2">
              Lower number = higher quality. E.g., 1 for best quality, 99 for rejected.
            </p>
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                Description
              </label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Quality criteria for this grade..."
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
                id="grade-active"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="w-4 h-4"
              />
              <label htmlFor="grade-active" className="text-neutral-300">
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
        <span className="text-white">Grades</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Grades</h1>
          <p className="text-neutral-400 mt-1">
            Quality grades for products and materials
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleSeedDefaults}>
            Seed Defaults
          </Button>
          <Button onClick={() => setShowModal(true)}>+ Add Grade</Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <Input
          placeholder="Search grades..."
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
        ) : filteredGrades.length === 0 ? (
          <div className="text-center py-12 text-neutral-400">
            {grades.length === 0 ? (
              <div>
                <p>No grades yet. Click "Seed Defaults" to add standard quality grades.</p>
              </div>
            ) : (
              'No grades match your filters.'
            )}
          </div>
        ) : (
          <div className="divide-y divide-factory-border">
            {filteredGrades.map((grade) => (
              <div
                key={grade.id}
                className="flex items-center justify-between p-4 hover:bg-factory-gray/50"
              >
                <div className="flex items-center gap-4 flex-1">
                  {/* Level indicator */}
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg ${
                      grade.level === 1
                        ? 'bg-success/20 text-success'
                        : grade.level === 2
                        ? 'bg-primary-500/20 text-primary-400'
                        : grade.level === 3
                        ? 'bg-warning/20 text-warning'
                        : grade.level >= 99
                        ? 'bg-error/20 text-error'
                        : 'bg-factory-gray text-neutral-400'
                    }`}
                  >
                    {grade.code}
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="text-white font-medium">{grade.name}</span>
                      <span className="px-2 py-0.5 bg-factory-border text-neutral-300 text-xs rounded">
                        Level {grade.level}
                      </span>
                      {!grade.isActive && (
                        <span className="px-2 py-0.5 bg-neutral-500/20 text-neutral-400 text-xs rounded">
                          Inactive
                        </span>
                      )}
                    </div>
                    {grade.description && (
                      <p className="text-sm text-neutral-400 mt-0.5">{grade.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setViewing(grade)}
                  >
                    View
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditing(grade);
                      setShowModal(true);
                    }}
                  >
                    Edit
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(grade.id)}>
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* View Modal */}
      {viewing && <GradeViewModal />}

      {/* Edit Modal */}
      {showModal && <GradeModal />}
    </div>
  );
}
