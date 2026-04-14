'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useToast } from '@/contexts/ToastContext';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { colorsApi } from '@/lib/api/settings';
import { Color, ColorFormData } from '@/lib/types/settings';
import { X } from 'lucide-react';

export default function ColorsPage() {
  const { showToast } = useToast();
  const [colors, setColors] = useState<Color[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('active');
  const [searchQuery, setSearchQuery] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Color | null>(null);
  const [selectedColor, setSelectedColor] = useState<Color | null>(null);
  const [viewing, setViewing] = useState<Color | null>(null);

  useEffect(() => {
    fetchColors();
  }, []);

  const fetchColors = async () => {
    setLoading(true);
    try {
      const data = await colorsApi.getAll();
      setColors(data);
    } catch (error) {
      showToast('error', 'Failed to load colors');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this color?')) return;
    try {
      await colorsApi.delete(id);
      showToast('success', 'Color deleted');
      if (selectedColor?.id === id) setSelectedColor(null);
      fetchColors();
    } catch (error: any) {
      showToast('error', error.response?.data?.error || 'Failed to delete color');
    }
  };

  const filteredColors = colors.filter((c) => {
    const matchesFilter =
      filter === 'all' ||
      (filter === 'active' && c.isActive) ||
      (filter === 'inactive' && !c.isActive);
    const matchesSearch =
      searchQuery === '' ||
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.code.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // View Modal Component
  const ColorViewModal = () => {
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
              <h2 className="text-xl font-semibold text-white">Color Details</h2>
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
            {/* Color Swatch */}
            <div
              className="w-full h-32 rounded-xl border border-factory-border"
              style={{ backgroundColor: viewing.hexCode || '#333' }}
            />

            {/* Basic Info */}
            <div>
              <h3 className="text-sm font-medium text-primary-400 mb-3">Color Information</h3>
              <div className="bg-factory-gray/30 rounded-xl p-4">
                <DetailRow label="Color Name" value={viewing.name} />
                <DetailRow label="Hex Code" value={viewing.hexCode} />
                <DetailRow label="Pantone Code" value={viewing.pantoneCode} />
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

  // Modal Component - Simplified form with only name required
  const ColorModal = () => {
    const [formData, setFormData] = useState<ColorFormData>({
      name: editing?.name || '',
      hexCode: editing?.hexCode || '',
      pantoneCode: editing?.pantoneCode || '',
      description: editing?.description || '',
      notes: editing?.notes || '',
      isActive: editing?.isActive ?? true,
      sortOrder: editing?.sortOrder ?? 0,
    });
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!formData.name.trim()) {
        showToast('error', 'Color name is required');
        return;
      }
      setSaving(true);
      try {
        if (editing) {
          await colorsApi.update(editing.id, formData);
          showToast('success', 'Color updated');
        } else {
          await colorsApi.create(formData);
          showToast('success', 'Color created');
        }
        setShowModal(false);
        setEditing(null);
        fetchColors();
      } catch (error: any) {
        showToast('error', error.response?.data?.error || 'Failed to save color');
      } finally {
        setSaving(false);
      }
    };

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-factory-dark rounded-2xl border border-factory-border w-full max-w-lg max-h-[90vh] overflow-y-auto">
          <div className="p-6 border-b border-factory-border sticky top-0 bg-factory-dark">
            <h2 className="text-xl font-semibold text-white">
              {editing ? 'Edit Color' : 'Add Color'}
            </h2>
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Name - Only required field */}
            <Input
              label="Color Name *"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Ruby Red, Navy Blue"
              required
            />

            {/* Optional: Hex Code with color picker */}
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                Hex Code <span className="text-neutral-500">(optional)</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={formData.hexCode || '#888888'}
                  onChange={(e) => setFormData({ ...formData, hexCode: e.target.value })}
                  className="w-12 h-10 rounded-lg border border-factory-border cursor-pointer bg-factory-gray"
                />
                <input
                  type="text"
                  value={formData.hexCode || ''}
                  onChange={(e) => setFormData({ ...formData, hexCode: e.target.value })}
                  placeholder="#FF0000"
                  className="flex-1 px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            {/* Optional: Pantone Code */}
            <Input
              label={<>Pantone Code <span className="text-neutral-500">(optional)</span></>}
              value={formData.pantoneCode || ''}
              onChange={(e) => setFormData({ ...formData, pantoneCode: e.target.value })}
              placeholder="e.g., 18-1664 TCX"
            />

            {/* Optional: Description */}
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                Description <span className="text-neutral-500">(optional)</span>
              </label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Optional description..."
              />
            </div>

            {/* Optional: Notes */}
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                Notes <span className="text-neutral-500">(optional)</span>
              </label>
              <textarea
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
                className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Internal notes..."
              />
            </div>

            {/* Active checkbox */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="color-active"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="w-4 h-4"
              />
              <label htmlFor="color-active" className="text-neutral-300">
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

  // Color Detail Panel - Shows when a color is selected from palette
  const ColorDetailPanel = ({ color }: { color: Color }) => (
    <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Color Details</h3>
        <button
          onClick={() => setSelectedColor(null)}
          className="text-neutral-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Large color swatch */}
      <div
        className="w-full h-32 rounded-xl border border-factory-border mb-4"
        style={{ backgroundColor: color.hexCode || '#333' }}
      />

      <div className="space-y-3">
        <div>
          <p className="text-xs text-neutral-500 uppercase tracking-wider">Name</p>
          <p className="text-lg font-medium text-white">{color.name}</p>
        </div>

        <div>
          <p className="text-xs text-neutral-500 uppercase tracking-wider">Code</p>
          <p className="text-white font-mono">{color.code}</p>
        </div>

        {color.hexCode && (
          <div>
            <p className="text-xs text-neutral-500 uppercase tracking-wider">Hex Code</p>
            <p className="text-white font-mono">{color.hexCode}</p>
          </div>
        )}

        {color.pantoneCode && (
          <div>
            <p className="text-xs text-neutral-500 uppercase tracking-wider">Pantone Code</p>
            <p className="text-white">{color.pantoneCode}</p>
          </div>
        )}

        {color.description && (
          <div>
            <p className="text-xs text-neutral-500 uppercase tracking-wider">Description</p>
            <p className="text-neutral-300 text-sm">{color.description}</p>
          </div>
        )}

        <div className="pt-3 flex gap-2">
          <Button
            size="sm"
            onClick={() => {
              setEditing(color);
              setShowModal(true);
            }}
          >
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(color.id)}
          >
            Delete
          </Button>
        </div>
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
        <span className="text-white">Colors</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Colors</h1>
          <p className="text-neutral-400 mt-1">Manage color palette for products and materials</p>
        </div>
        <Button onClick={() => setShowModal(true)}>+ Add Color</Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <Input
          placeholder="Search colors..."
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

      {/* Main content - Color Palette + Detail Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Color Palette - Visual grid of colors */}
        <div className="lg:col-span-2 bg-factory-dark rounded-2xl border border-factory-border p-6">
          <h3 className="text-sm font-medium text-neutral-400 mb-4">
            Color Palette ({filteredColors.length} colors)
          </h3>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
            </div>
          ) : filteredColors.length === 0 ? (
            <div className="text-center py-12 text-neutral-400">
              {colors.length === 0
                ? 'No colors yet. Add your first color!'
                : 'No colors match your filters.'}
            </div>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
              {filteredColors.map((color) => (
                <button
                  key={color.id}
                  onClick={() => setSelectedColor(color)}
                  className={`group relative aspect-square rounded-xl border-2 transition-all ${
                    selectedColor?.id === color.id
                      ? 'border-primary-500 ring-2 ring-primary-500/30'
                      : 'border-factory-border hover:border-neutral-500'
                  }`}
                  style={{ backgroundColor: color.hexCode || '#444' }}
                  title={color.name}
                >
                  {/* Color name tooltip on hover */}
                  <div className="absolute inset-x-0 bottom-0 bg-black/70 text-white text-xs px-1 py-0.5 rounded-b-lg opacity-0 group-hover:opacity-100 transition-opacity truncate">
                    {color.name}
                  </div>
                  {/* Inactive indicator */}
                  {!color.isActive && (
                    <div className="absolute top-1 right-1 w-2 h-2 bg-neutral-500 rounded-full" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Detail Panel - Shows selected color info */}
        <div className="lg:col-span-1">
          {selectedColor ? (
            <ColorDetailPanel color={selectedColor} />
          ) : (
            <div className="bg-factory-dark rounded-2xl border border-factory-border p-6 text-center">
              <p className="text-neutral-400">
                Click on a color in the palette to view its details
              </p>
            </div>
          )}
        </div>
      </div>

      {/* List View - Traditional table */}
      <div className="bg-factory-dark rounded-2xl border border-factory-border">
        <div className="p-4 border-b border-factory-border">
          <h3 className="text-sm font-medium text-neutral-400">All Colors (List View)</h3>
        </div>
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
          </div>
        ) : filteredColors.length === 0 ? (
          <div className="text-center py-12 text-neutral-400">
            {colors.length === 0
              ? 'No colors yet. Add your first color!'
              : 'No colors match your filters.'}
          </div>
        ) : (
          <div className="divide-y divide-factory-border">
            {filteredColors.map((color) => (
              <div
                key={color.id}
                className={`flex items-center justify-between p-4 hover:bg-factory-gray/50 cursor-pointer ${
                  selectedColor?.id === color.id ? 'bg-factory-gray/50' : ''
                }`}
                onClick={() => setSelectedColor(color)}
              >
                <div className="flex items-center gap-4 flex-1">
                  {/* Color swatch */}
                  <div
                    className="w-10 h-10 rounded-lg border border-factory-border"
                    style={{ backgroundColor: color.hexCode || '#333' }}
                  />
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="text-white font-medium">{color.name}</span>
                      <span className="text-neutral-500 font-mono text-xs">({color.code})</span>
                      {color.pantoneCode && (
                        <span className="px-2 py-0.5 bg-factory-border text-neutral-300 text-xs rounded">
                          {color.pantoneCode}
                        </span>
                      )}
                      {!color.isActive && (
                        <span className="px-2 py-0.5 bg-neutral-500/20 text-neutral-400 text-xs rounded">
                          Inactive
                        </span>
                      )}
                    </div>
                    {color.hexCode && (
                      <p className="text-sm text-neutral-400 mt-0.5 font-mono">{color.hexCode}</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setViewing(color);
                    }}
                  >
                    View
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditing(color);
                      setShowModal(true);
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(color.id);
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* View Modal */}
      {viewing && <ColorViewModal />}

      {/* Edit Modal */}
      {showModal && <ColorModal />}
    </div>
  );
}
