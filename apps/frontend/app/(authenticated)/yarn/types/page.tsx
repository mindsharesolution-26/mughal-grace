'use client';

import { useState, useEffect, useMemo } from 'react';
import { useToast } from '@/contexts/ToastContext';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { yarnTypesApi, knittingYarnsApi } from '@/lib/api/yarn-types';
import {
  YarnType,
  YarnTypeFormData,
  KnittingYarn,
  KnittingYarnFormData,
  FiberComposition,
  FiberType,
  CountSystem,
  FIBER_TYPES,
  COUNT_SYSTEMS,
  YARN_CATEGORIES,
  YarnCategory,
} from '@/lib/types/yarn';
import {
  Plus,
  Pencil,
  Trash2,
  Eye,
  X,
  Search,
  Layers,
  CircleDashed,
  Percent,
  Tag,
  Info,
} from 'lucide-react';

type TabType = 'types' | 'blends';

export default function YarnTypesPage() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<TabType>('types');

  // Yarn Types State
  const [yarnTypes, setYarnTypes] = useState<YarnType[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(true);
  const [filterTypes, setFilterTypes] = useState<'all' | 'active' | 'inactive'>('active');
  const [searchTypes, setSearchTypes] = useState('');
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [editingType, setEditingType] = useState<YarnType | null>(null);
  const [viewingType, setViewingType] = useState<YarnType | null>(null);

  // Blends State
  const [blends, setBlends] = useState<KnittingYarn[]>([]);
  const [loadingBlends, setLoadingBlends] = useState(true);
  const [filterBlends, setFilterBlends] = useState<'all' | 'active' | 'inactive'>('active');
  const [searchBlends, setSearchBlends] = useState('');
  const [showBlendModal, setShowBlendModal] = useState(false);
  const [editingBlend, setEditingBlend] = useState<KnittingYarn | null>(null);
  const [viewingBlend, setViewingBlend] = useState<KnittingYarn | null>(null);

  useEffect(() => {
    fetchYarnTypes();
    fetchBlends();
  }, []);

  const fetchYarnTypes = async () => {
    setLoadingTypes(true);
    try {
      const data = await yarnTypesApi.getAll();
      setYarnTypes(data);
    } catch (error) {
      showToast('error', 'Failed to load yarn types');
    } finally {
      setLoadingTypes(false);
    }
  };

  const fetchBlends = async () => {
    setLoadingBlends(true);
    try {
      const data = await knittingYarnsApi.getAll();
      setBlends(data);
    } catch (error) {
      showToast('error', 'Failed to load blends');
    } finally {
      setLoadingBlends(false);
    }
  };

  const handleDeleteType = async (id: number) => {
    if (!confirm('Are you sure you want to deactivate this yarn type?')) return;
    try {
      await yarnTypesApi.delete(id);
      showToast('success', 'Yarn type deactivated');
      fetchYarnTypes();
    } catch (error: any) {
      showToast('error', error.response?.data?.error || 'Failed to delete yarn type');
    }
  };

  const handleDeleteBlend = async (id: number) => {
    if (!confirm('Are you sure you want to deactivate this blend?')) return;
    try {
      await knittingYarnsApi.delete(id);
      showToast('success', 'Blend deactivated');
      fetchBlends();
    } catch (error: any) {
      showToast('error', error.response?.data?.error || 'Failed to delete blend');
    }
  };

  const filteredTypes = useMemo(() => {
    return yarnTypes.filter((y) => {
      const matchesFilter =
        filterTypes === 'all' ||
        (filterTypes === 'active' && y.isActive) ||
        (filterTypes === 'inactive' && !y.isActive);
      const matchesSearch =
        searchTypes === '' ||
        y.name.toLowerCase().includes(searchTypes.toLowerCase()) ||
        y.code.toLowerCase().includes(searchTypes.toLowerCase()) ||
        y.brandName.toLowerCase().includes(searchTypes.toLowerCase()) ||
        y.color.toLowerCase().includes(searchTypes.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [yarnTypes, filterTypes, searchTypes]);

  const filteredBlends = useMemo(() => {
    return blends.filter((b) => {
      const matchesFilter =
        filterBlends === 'all' ||
        (filterBlends === 'active' && b.isActive) ||
        (filterBlends === 'inactive' && !b.isActive);
      const matchesSearch =
        searchBlends === '' ||
        b.name.toLowerCase().includes(searchBlends.toLowerCase()) ||
        b.code.toLowerCase().includes(searchBlends.toLowerCase()) ||
        (b.blendSummary && b.blendSummary.toLowerCase().includes(searchBlends.toLowerCase()));
      return matchesFilter && matchesSearch;
    });
  }, [blends, filterBlends, searchBlends]);

  // ============================================
  // YARN TYPE MODAL
  // ============================================
  const YarnTypeModal = () => {
    const [formData, setFormData] = useState<YarnTypeFormData>({
      code: editingType?.code || '',
      name: editingType?.name || '',
      brandName: editingType?.brandName || '',
      color: editingType?.color || '',
      grade: editingType?.grade || 'A',
      description: editingType?.description || '',
      composition: editingType?.composition || [],
      countValue: editingType?.countValue || undefined,
      countSystem: editingType?.countSystem || undefined,
      defaultPricePerKg: editingType?.defaultPricePerKg || undefined,
      priceUnit: editingType?.priceUnit || 'KG',
      currency: editingType?.currency || 'PKR',
      category: editingType?.category || undefined,
      tags: editingType?.tags || [],
      certifications: editingType?.certifications || [],
      isActive: editingType?.isActive ?? true,
    });
    const [saving, setSaving] = useState(false);
    const [newTag, setNewTag] = useState('');

    const addComposition = () => {
      setFormData({
        ...formData,
        composition: [...(formData.composition || []), { fiberType: 'COTTON' as FiberType, percentage: 100 }],
      });
    };

    const updateComposition = (index: number, field: keyof FiberComposition, value: any) => {
      const updated = [...(formData.composition || [])];
      updated[index] = { ...updated[index], [field]: value };
      setFormData({ ...formData, composition: updated });
    };

    const removeComposition = (index: number) => {
      const updated = [...(formData.composition || [])];
      updated.splice(index, 1);
      setFormData({ ...formData, composition: updated });
    };

    const addTag = () => {
      if (newTag.trim() && !formData.tags?.includes(newTag.trim())) {
        setFormData({ ...formData, tags: [...(formData.tags || []), newTag.trim()] });
        setNewTag('');
      }
    };

    const removeTag = (tag: string) => {
      setFormData({ ...formData, tags: formData.tags?.filter((t) => t !== tag) });
    };

    const compositionTotal = useMemo(() => {
      return (formData.composition || []).reduce((sum, c) => sum + (c.percentage || 0), 0);
    }, [formData.composition]);

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();

      if (!formData.name.trim()) {
        showToast('error', 'Please enter a yarn name');
        return;
      }
      if (!formData.brandName.trim()) {
        showToast('error', 'Please enter a brand name');
        return;
      }
      if (!formData.color.trim()) {
        showToast('error', 'Please enter a color');
        return;
      }

      // Validate composition total if provided
      if (formData.composition && formData.composition.length > 0 && Math.abs(compositionTotal - 100) > 0.01) {
        showToast('error', 'Composition percentages must total 100%');
        return;
      }

      setSaving(true);
      try {
        if (editingType) {
          await yarnTypesApi.update(editingType.id, formData);
          showToast('success', 'Yarn type updated');
        } else {
          await yarnTypesApi.create(formData);
          showToast('success', 'Yarn type created');
        }
        setShowTypeModal(false);
        setEditingType(null);
        fetchYarnTypes();
      } catch (error: any) {
        showToast('error', error.response?.data?.error || 'Failed to save yarn type');
      } finally {
        setSaving(false);
      }
    };

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-factory-dark rounded-2xl border border-factory-border w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="p-6 border-b border-factory-border sticky top-0 bg-factory-dark z-10 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">
              {editingType ? 'Edit Yarn Type' : 'Add Yarn Type'}
            </h2>
            <button
              onClick={() => {
                setShowTypeModal(false);
                setEditingType(null);
              }}
              className="text-neutral-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Basic Info Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-neutral-300 uppercase tracking-wide flex items-center gap-2">
                <Info className="w-4 h-4" /> Basic Information
              </h3>
              {editingType && (
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                    Code (auto-generated)
                  </label>
                  <div className="px-4 py-2.5 rounded-xl bg-factory-gray/50 border border-factory-border text-primary-400 font-mono">
                    {editingType.code}
                  </div>
                </div>
              )}
              <Input
                label="Yarn Name *"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Cotton 40s White"
                required
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Brand Name *"
                  value={formData.brandName}
                  onChange={(e) => setFormData({ ...formData, brandName: e.target.value })}
                  placeholder="e.g., Premium Mills"
                  required
                />
                <Input
                  label="Color *"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  placeholder="e.g., White"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Grade"
                  value={formData.grade}
                  onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                  placeholder="e.g., A, B, C"
                />
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1.5">Category</label>
                  <select
                    value={formData.category || ''}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value || undefined })}
                    className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Select Category</option>
                    {Object.values(YARN_CATEGORIES).map((cat) => (
                      <option key={cat.code} value={cat.code}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Composition Section */}
            <div className="space-y-4 border-t border-factory-border pt-6">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-neutral-300 uppercase tracking-wide flex items-center gap-2">
                  <Percent className="w-4 h-4" /> Fiber Composition
                </h3>
                <Button type="button" variant="secondary" size="sm" onClick={addComposition}>
                  <Plus className="w-4 h-4 mr-1" /> Add Fiber
                </Button>
              </div>
              {formData.composition && formData.composition.length > 0 ? (
                <div className="space-y-2">
                  {formData.composition.map((comp, index) => (
                    <div key={index} className="flex items-center gap-3 bg-factory-gray rounded-xl p-3">
                      <select
                        value={comp.fiberType}
                        onChange={(e) => updateComposition(index, 'fiberType', e.target.value)}
                        className="flex-1 px-3 py-2 rounded-lg bg-factory-dark border border-factory-border text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        {Object.values(FIBER_TYPES).map((fiber) => (
                          <option key={fiber.code} value={fiber.code}>
                            {fiber.name}
                          </option>
                        ))}
                      </select>
                      <div className="w-24">
                        <Input
                          type="number"
                          value={comp.percentage}
                          onChange={(e) => updateComposition(index, 'percentage', Number(e.target.value))}
                          min={0}
                          max={100}
                          step={0.1}
                        />
                      </div>
                      <span className="text-neutral-400">%</span>
                      <button
                        type="button"
                        onClick={() => removeComposition(index)}
                        className="p-2 text-neutral-400 hover:text-error hover:bg-error/10 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <div
                    className={`text-sm ${
                      Math.abs(compositionTotal - 100) < 0.01 ? 'text-success' : 'text-warning'
                    }`}
                  >
                    Total: {compositionTotal.toFixed(1)}%{' '}
                    {Math.abs(compositionTotal - 100) < 0.01 ? '✓' : '(must equal 100%)'}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-neutral-500">No composition added. Click "Add Fiber" to specify.</p>
              )}
            </div>

            {/* Count/Thickness Section */}
            <div className="space-y-4 border-t border-factory-border pt-6">
              <h3 className="text-sm font-medium text-neutral-300 uppercase tracking-wide flex items-center gap-2">
                <CircleDashed className="w-4 h-4" /> Count / Thickness
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Count Value"
                  type="number"
                  value={formData.countValue || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      countValue: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  placeholder="e.g., 40"
                />
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1.5">Count System</label>
                  <select
                    value={formData.countSystem || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        countSystem: (e.target.value || undefined) as CountSystem | undefined,
                      })
                    }
                    className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Select System</option>
                    {Object.values(COUNT_SYSTEMS).map((sys) => (
                      <option key={sys.code} value={sys.code}>
                        {sys.name} - {sys.description}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Pricing Section */}
            <div className="space-y-4 border-t border-factory-border pt-6">
              <h3 className="text-sm font-medium text-neutral-300 uppercase tracking-wide">Pricing</h3>
              <div className="grid grid-cols-3 gap-4">
                <Input
                  label="Default Price"
                  type="number"
                  value={formData.defaultPricePerKg || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      defaultPricePerKg: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  placeholder="e.g., 850"
                />
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1.5">Price Unit</label>
                  <select
                    value={formData.priceUnit || 'KG'}
                    onChange={(e) => setFormData({ ...formData, priceUnit: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="KG">KG</option>
                    <option value="LB">LB</option>
                    <option value="CONE">Cone</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1.5">Currency</label>
                  <select
                    value={formData.currency || 'PKR'}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="PKR">PKR</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Tags Section */}
            <div className="space-y-4 border-t border-factory-border pt-6">
              <h3 className="text-sm font-medium text-neutral-300 uppercase tracking-wide flex items-center gap-2">
                <Tag className="w-4 h-4" /> Tags
              </h3>
              <div className="flex gap-2 flex-wrap">
                {formData.tags?.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary-500/20 text-primary-400 text-sm"
                  >
                    {tag}
                    <button type="button" onClick={() => removeTag(tag)} className="hover:text-white">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Add a tag..."
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                />
                <Button type="button" variant="secondary" onClick={addTag}>
                  Add
                </Button>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-4 border-t border-factory-border pt-6">
              <label className="block text-sm font-medium text-neutral-300">Description</label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description"
                rows={2}
                className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {/* Status */}
            <div className="flex items-center gap-3 border-t border-factory-border pt-6">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="w-4 h-4 rounded border-factory-border bg-factory-gray text-primary-500 focus:ring-primary-500"
              />
              <label htmlFor="isActive" className="text-sm text-neutral-300">
                Active
              </label>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowTypeModal(false);
                  setEditingType(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" isLoading={saving}>
                {editingType ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // ============================================
  // BLEND MODAL
  // ============================================
  const BlendModal = () => {
    const [formData, setFormData] = useState<KnittingYarnFormData>({
      code: editingBlend?.code || '',
      name: editingBlend?.name || '',
      description: editingBlend?.description || '',
      defaultPricePerKg: editingBlend?.defaultPricePerKg || undefined,
      yarnTypes:
        editingBlend?.yarnTypes?.map((yt) => ({
          yarnTypeId: yt.yarnTypeId,
          percentage: Number(yt.percentage),
        })) || [],
      isActive: editingBlend?.isActive ?? true,
    });
    const [saving, setSaving] = useState(false);

    const addYarnType = () => {
      const firstAvailable = yarnTypes.find((yt) => yt.isActive);
      if (firstAvailable) {
        setFormData({
          ...formData,
          yarnTypes: [...formData.yarnTypes, { yarnTypeId: firstAvailable.id, percentage: 0 }],
        });
      }
    };

    const updateYarnType = (index: number, field: 'yarnTypeId' | 'percentage', value: any) => {
      const updated = [...formData.yarnTypes];
      updated[index] = { ...updated[index], [field]: field === 'yarnTypeId' ? Number(value) : Number(value) };
      setFormData({ ...formData, yarnTypes: updated });
    };

    const removeYarnType = (index: number) => {
      const updated = [...formData.yarnTypes];
      updated.splice(index, 1);
      setFormData({ ...formData, yarnTypes: updated });
    };

    const blendTotal = useMemo(() => {
      return formData.yarnTypes.reduce((sum, yt) => sum + (yt.percentage || 0), 0);
    }, [formData.yarnTypes]);

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();

      if (!formData.name.trim()) {
        showToast('error', 'Please enter a blend name');
        return;
      }
      if (formData.yarnTypes.length === 0) {
        showToast('error', 'Please add at least one yarn type');
        return;
      }
      if (Math.abs(blendTotal - 100) > 0.01) {
        showToast('error', 'Yarn type percentages must total 100%');
        return;
      }

      setSaving(true);
      try {
        if (editingBlend) {
          await knittingYarnsApi.update(editingBlend.id, formData);
          showToast('success', 'Blend updated');
        } else {
          await knittingYarnsApi.create(formData);
          showToast('success', 'Blend created');
        }
        setShowBlendModal(false);
        setEditingBlend(null);
        fetchBlends();
      } catch (error: any) {
        showToast('error', error.response?.data?.error || 'Failed to save blend');
      } finally {
        setSaving(false);
      }
    };

    const activeYarnTypes = yarnTypes.filter((yt) => yt.isActive);

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-factory-dark rounded-2xl border border-factory-border w-full max-w-xl max-h-[90vh] overflow-y-auto">
          <div className="p-6 border-b border-factory-border sticky top-0 bg-factory-dark z-10 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">
              {editingBlend ? 'Edit Blend' : 'Create Blend'}
            </h2>
            <button
              onClick={() => {
                setShowBlendModal(false);
                setEditingBlend(null);
              }}
              className="text-neutral-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {editingBlend && (
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                  Code (auto-generated)
                </label>
                <div className="px-4 py-2.5 rounded-xl bg-factory-gray/50 border border-factory-border text-primary-400 font-mono">
                  {editingBlend.code}
                </div>
              </div>
            )}

            <Input
              label="Blend Name *"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., PC 52/48"
              required
            />

            <Input
              label="Default Price per KG"
              type="number"
              value={formData.defaultPricePerKg || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  defaultPricePerKg: e.target.value ? Number(e.target.value) : undefined,
                })
              }
              placeholder="Leave blank to auto-calculate"
            />

            {/* Yarn Types Composition */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-neutral-300">Yarn Types *</h3>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={addYarnType}
                  disabled={activeYarnTypes.length === 0}
                >
                  <Plus className="w-4 h-4 mr-1" /> Add Yarn
                </Button>
              </div>
              {formData.yarnTypes.length > 0 ? (
                <div className="space-y-2">
                  {formData.yarnTypes.map((item, index) => {
                    const selectedType = yarnTypes.find((yt) => yt.id === item.yarnTypeId);
                    return (
                      <div key={index} className="flex items-center gap-3 bg-factory-gray rounded-xl p-3">
                        <select
                          value={item.yarnTypeId}
                          onChange={(e) => updateYarnType(index, 'yarnTypeId', e.target.value)}
                          className="flex-1 px-3 py-2 rounded-lg bg-factory-dark border border-factory-border text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                          {activeYarnTypes.map((yt) => (
                            <option key={yt.id} value={yt.id}>
                              {yt.code} - {yt.name} ({yt.brandName}, {yt.color})
                            </option>
                          ))}
                        </select>
                        <div className="w-20">
                          <Input
                            type="number"
                            value={item.percentage}
                            onChange={(e) => updateYarnType(index, 'percentage', e.target.value)}
                            min={0}
                            max={100}
                            step={0.1}
                          />
                        </div>
                        <span className="text-neutral-400">%</span>
                        <button
                          type="button"
                          onClick={() => removeYarnType(index)}
                          className="p-2 text-neutral-400 hover:text-error hover:bg-error/10 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                  <div
                    className={`text-sm ${
                      Math.abs(blendTotal - 100) < 0.01 ? 'text-success' : 'text-warning'
                    }`}
                  >
                    Total: {blendTotal.toFixed(1)}%{' '}
                    {Math.abs(blendTotal - 100) < 0.01 ? '✓' : '(must equal 100%)'}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-neutral-500">
                  No yarn types added. Click "Add Yarn" to create a blend.
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1.5">Description</label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description"
                rows={2}
                className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="blendIsActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="w-4 h-4 rounded border-factory-border bg-factory-gray text-primary-500 focus:ring-primary-500"
              />
              <label htmlFor="blendIsActive" className="text-sm text-neutral-300">
                Active
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowBlendModal(false);
                  setEditingBlend(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" isLoading={saving}>
                {editingBlend ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // ============================================
  // VIEW MODALS
  // ============================================
  const ViewTypeModal = () => {
    if (!viewingType) return null;

    const DetailRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
      <div className="flex justify-between py-2 border-b border-factory-border/50">
        <span className="text-neutral-400">{label}</span>
        <span className="text-white text-right">{value || '-'}</span>
      </div>
    );

    const compositionText =
      viewingType.composition && viewingType.composition.length > 0
        ? viewingType.composition.map((c) => `${c.percentage}% ${FIBER_TYPES[c.fiberType]?.name || c.fiberType}`).join(', ')
        : null;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-factory-dark rounded-2xl border border-factory-border w-full max-w-md max-h-[90vh] overflow-y-auto">
          <div className="p-6 border-b border-factory-border sticky top-0 bg-factory-dark flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Yarn Type Details</h2>
            <button onClick={() => setViewingType(null)} className="text-neutral-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-primary-400 font-mono text-lg">{viewingType.code}</span>
              <span
                className={`px-2 py-1 text-xs rounded-full ${
                  viewingType.isActive ? 'bg-success/20 text-success' : 'bg-error/20 text-error'
                }`}
              >
                {viewingType.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>

            <div className="space-y-1">
              <DetailRow label="Yarn Name" value={viewingType.name} />
              <DetailRow label="Brand" value={viewingType.brandName} />
              <DetailRow label="Color" value={viewingType.color} />
              <DetailRow label="Grade" value={viewingType.grade} />
              {compositionText && <DetailRow label="Composition" value={compositionText} />}
              {viewingType.countValue && (
                <DetailRow
                  label="Count"
                  value={`${viewingType.countValue} ${viewingType.countSystem || ''}`}
                />
              )}
              {viewingType.category && (
                <DetailRow
                  label="Category"
                  value={YARN_CATEGORIES[viewingType.category as YarnCategory]?.name || viewingType.category}
                />
              )}
              {viewingType.defaultPricePerKg && (
                <DetailRow
                  label="Price"
                  value={`${viewingType.currency || 'Rs.'} ${viewingType.defaultPricePerKg.toLocaleString()} / ${viewingType.priceUnit || 'KG'}`}
                />
              )}
              {viewingType.tags && viewingType.tags.length > 0 && (
                <DetailRow
                  label="Tags"
                  value={viewingType.tags.map((t) => (
                    <span key={t} className="inline-block px-2 py-0.5 bg-primary-500/20 text-primary-400 text-xs rounded-full mr-1">
                      {t}
                    </span>
                  ))}
                />
              )}
              {viewingType.description && <DetailRow label="Description" value={viewingType.description} />}
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="secondary" onClick={() => setViewingType(null)}>
                Close
              </Button>
              <Button
                onClick={() => {
                  setViewingType(null);
                  setEditingType(viewingType);
                  setShowTypeModal(true);
                }}
              >
                Edit
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const ViewBlendModal = () => {
    if (!viewingBlend) return null;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-factory-dark rounded-2xl border border-factory-border w-full max-w-md max-h-[90vh] overflow-y-auto">
          <div className="p-6 border-b border-factory-border sticky top-0 bg-factory-dark flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Blend Details</h2>
            <button onClick={() => setViewingBlend(null)} className="text-neutral-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-primary-400 font-mono text-lg">{viewingBlend.code}</span>
              <span
                className={`px-2 py-1 text-xs rounded-full ${
                  viewingBlend.isActive ? 'bg-success/20 text-success' : 'bg-error/20 text-error'
                }`}
              >
                {viewingBlend.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>

            <div>
              <h3 className="text-white font-medium">{viewingBlend.name}</h3>
              {viewingBlend.blendSummary && (
                <p className="text-sm text-neutral-400 mt-1">{viewingBlend.blendSummary}</p>
              )}
            </div>

            {viewingBlend.defaultPricePerKg && (
              <div className="py-2 border-b border-factory-border/50 flex justify-between">
                <span className="text-neutral-400">Price</span>
                <span className="text-white">Rs. {Number(viewingBlend.defaultPricePerKg).toLocaleString()} / KG</span>
              </div>
            )}

            {viewingBlend.yarnTypes && viewingBlend.yarnTypes.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-neutral-300 mb-2">Composition</h4>
                <div className="space-y-2">
                  {viewingBlend.yarnTypes.map((yt) => (
                    <div
                      key={yt.id}
                      className="flex items-center justify-between p-3 bg-factory-gray rounded-xl"
                    >
                      <div>
                        <p className="text-white text-sm">{yt.yarnType?.name}</p>
                        <p className="text-xs text-neutral-400">
                          {yt.yarnType?.brandName} - {yt.yarnType?.color}
                        </p>
                      </div>
                      <span className="text-primary-400 font-medium">{Number(yt.percentage)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {viewingBlend.description && (
              <div>
                <h4 className="text-sm font-medium text-neutral-300 mb-1">Description</h4>
                <p className="text-neutral-400">{viewingBlend.description}</p>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="secondary" onClick={() => setViewingBlend(null)}>
                Close
              </Button>
              <Button
                onClick={() => {
                  setViewingBlend(null);
                  setEditingBlend(viewingBlend);
                  setShowBlendModal(true);
                }}
              >
                Edit
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ============================================
  // MAIN RENDER
  // ============================================
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-500/20 flex items-center justify-center">
            <Layers className="w-5 h-5 text-primary-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Yarn Types & Blends</h1>
            <p className="text-sm text-neutral-400">Manage yarn types and create blends</p>
          </div>
        </div>
        <Button onClick={() => (activeTab === 'types' ? setShowTypeModal(true) : setShowBlendModal(true))}>
          <Plus className="w-4 h-4 mr-2" />
          {activeTab === 'types' ? 'Add Yarn Type' : 'Create Blend'}
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-factory-border">
        <button
          onClick={() => setActiveTab('types')}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'types'
              ? 'border-primary-500 text-primary-400'
              : 'border-transparent text-neutral-400 hover:text-white'
          }`}
        >
          <Layers className="w-4 h-4 inline-block mr-2" />
          Yarn Types ({yarnTypes.filter((y) => y.isActive).length})
        </button>
        <button
          onClick={() => setActiveTab('blends')}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'blends'
              ? 'border-primary-500 text-primary-400'
              : 'border-transparent text-neutral-400 hover:text-white'
          }`}
        >
          <CircleDashed className="w-4 h-4 inline-block mr-2" />
          Blends ({blends.filter((b) => b.isActive).length})
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'types' ? (
        <>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
              <input
                type="text"
                placeholder="Search by name, code, brand, or color..."
                value={searchTypes}
                onChange={(e) => setSearchTypes(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="flex gap-2">
              {(['active', 'inactive', 'all'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilterTypes(f)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                    filterTypes === f
                      ? 'bg-primary-500/20 text-primary-400'
                      : 'bg-factory-gray text-neutral-400 hover:text-white'
                  }`}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Types Table */}
          <div className="bg-factory-dark rounded-2xl border border-factory-border overflow-hidden">
            {loadingTypes ? (
              <div className="p-8 text-center text-neutral-400">Loading...</div>
            ) : filteredTypes.length === 0 ? (
              <div className="p-8 text-center text-neutral-400">
                {searchTypes || filterTypes !== 'active'
                  ? 'No yarn types found matching your criteria'
                  : 'No yarn types yet. Add your first yarn type to get started.'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-factory-border">
                      <th className="text-left text-sm font-medium text-neutral-400 px-6 py-4">Code</th>
                      <th className="text-left text-sm font-medium text-neutral-400 px-6 py-4">Name</th>
                      <th className="text-left text-sm font-medium text-neutral-400 px-6 py-4">Brand</th>
                      <th className="text-left text-sm font-medium text-neutral-400 px-6 py-4">Composition</th>
                      <th className="text-left text-sm font-medium text-neutral-400 px-6 py-4">Count</th>
                      <th className="text-right text-sm font-medium text-neutral-400 px-6 py-4">Price/KG</th>
                      <th className="text-left text-sm font-medium text-neutral-400 px-6 py-4">Status</th>
                      <th className="text-right text-sm font-medium text-neutral-400 px-6 py-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTypes.map((yarn) => {
                      const compositionShort =
                        yarn.composition && yarn.composition.length > 0
                          ? yarn.composition.map((c) => `${c.percentage}% ${c.fiberType}`).join(', ')
                          : '-';
                      return (
                        <tr
                          key={yarn.id}
                          className="border-b border-factory-border/50 hover:bg-factory-gray/30"
                        >
                          <td className="px-6 py-4">
                            <span className="text-primary-400 font-mono">{yarn.code}</span>
                          </td>
                          <td className="px-6 py-4">
                            <div>
                              <p className="text-white">{yarn.name}</p>
                              <p className="text-xs text-neutral-400">{yarn.color}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-neutral-300">{yarn.brandName}</td>
                          <td className="px-6 py-4 text-neutral-300 text-sm max-w-[200px] truncate">
                            {compositionShort}
                          </td>
                          <td className="px-6 py-4 text-neutral-300">
                            {yarn.countValue ? `${yarn.countValue} ${yarn.countSystem || ''}` : '-'}
                          </td>
                          <td className="px-6 py-4 text-right text-neutral-300">
                            {yarn.defaultPricePerKg
                              ? `${yarn.currency || 'Rs.'} ${Number(yarn.defaultPricePerKg).toLocaleString()}`
                              : '-'}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`px-2 py-1 text-xs rounded-full ${
                                yarn.isActive ? 'bg-success/20 text-success' : 'bg-error/20 text-error'
                              }`}
                            >
                              {yarn.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => setViewingType(yarn)}
                                className="p-2 text-neutral-400 hover:text-white hover:bg-factory-gray rounded-lg"
                                title="View"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setEditingType(yarn);
                                  setShowTypeModal(true);
                                }}
                                className="p-2 text-neutral-400 hover:text-white hover:bg-factory-gray rounded-lg"
                                title="Edit"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteType(yarn.id)}
                                className="p-2 text-neutral-400 hover:text-error hover:bg-error/10 rounded-lg"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          {/* Blends Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
              <input
                type="text"
                placeholder="Search blends..."
                value={searchBlends}
                onChange={(e) => setSearchBlends(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="flex gap-2">
              {(['active', 'inactive', 'all'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilterBlends(f)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                    filterBlends === f
                      ? 'bg-primary-500/20 text-primary-400'
                      : 'bg-factory-gray text-neutral-400 hover:text-white'
                  }`}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Blends Grid */}
          <div className="bg-factory-dark rounded-2xl border border-factory-border overflow-hidden">
            {loadingBlends ? (
              <div className="p-8 text-center text-neutral-400">Loading...</div>
            ) : filteredBlends.length === 0 ? (
              <div className="p-8 text-center text-neutral-400">
                {searchBlends || filterBlends !== 'active'
                  ? 'No blends found matching your criteria'
                  : 'No blends yet. Create your first blend to combine yarn types.'}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                {filteredBlends.map((blend) => (
                  <div
                    key={blend.id}
                    className="bg-factory-gray rounded-xl p-4 border border-factory-border/50 hover:border-primary-500/50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <span className="text-primary-400 font-mono text-sm">{blend.code}</span>
                        <h3 className="text-white font-medium mt-1">{blend.name}</h3>
                      </div>
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          blend.isActive ? 'bg-success/20 text-success' : 'bg-error/20 text-error'
                        }`}
                      >
                        {blend.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    {blend.blendSummary && (
                      <p className="text-sm text-neutral-400 mb-3 line-clamp-2">{blend.blendSummary}</p>
                    )}
                    {blend.defaultPricePerKg && (
                      <p className="text-sm text-neutral-300 mb-3">
                        Rs. {Number(blend.defaultPricePerKg).toLocaleString()} / KG
                      </p>
                    )}
                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-factory-border/50">
                      <button
                        onClick={() => setViewingBlend(blend)}
                        className="p-2 text-neutral-400 hover:text-white hover:bg-factory-dark rounded-lg"
                        title="View"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setEditingBlend(blend);
                          setShowBlendModal(true);
                        }}
                        className="p-2 text-neutral-400 hover:text-white hover:bg-factory-dark rounded-lg"
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteBlend(blend.id)}
                        className="p-2 text-neutral-400 hover:text-error hover:bg-error/10 rounded-lg"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Modals */}
      {showTypeModal && <YarnTypeModal />}
      {showBlendModal && <BlendModal />}
      {viewingType && <ViewTypeModal />}
      {viewingBlend && <ViewBlendModal />}
    </div>
  );
}
