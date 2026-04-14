'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { useToast } from '@/contexts/ToastContext';
import { stockCategoriesApi, unitsApi } from '@/lib/api/inventory';
import {
  StockCategory,
  StockCategoryFormData,
  StockCategoryTreeNode,
  Unit,
} from '@/lib/types/inventory';

export default function StockCategoriesPage() {
  const { showToast } = useToast();
  const [categories, setCategories] = useState<StockCategory[]>([]);
  const [treeData, setTreeData] = useState<StockCategoryTreeNode[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<StockCategory | null>(null);
  const [formData, setFormData] = useState<StockCategoryFormData>({
    code: '',
    name: '',
    description: '',
    trackBatches: false,
    sortOrder: 0,
    isActive: true,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [viewMode, setViewMode] = useState<'tree' | 'list'>('tree');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [categoriesData, treeDataResult, unitsData] = await Promise.all([
        stockCategoriesApi.getAll(),
        stockCategoriesApi.getTree(),
        unitsApi.getLookup(),
      ]);
      setCategories(categoriesData);
      setTreeData(treeDataResult);
      setUnits(unitsData);
    } catch (error: any) {
      showToast('error', 'Failed to load categories');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = (category?: StockCategory) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        code: category.code,
        name: category.name,
        description: category.description || '',
        parentId: category.parentId || undefined,
        defaultUnitId: category.defaultUnitId || undefined,
        trackBatches: category.trackBatches,
        sortOrder: category.sortOrder,
        isActive: category.isActive,
      });
    } else {
      setEditingCategory(null);
      setFormData({
        code: '',
        name: '',
        description: '',
        trackBatches: false,
        sortOrder: 0,
        isActive: true,
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingCategory(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code || !formData.name) {
      showToast('error', 'Code and name are required');
      return;
    }

    try {
      setIsSaving(true);
      if (editingCategory) {
        await stockCategoriesApi.update(editingCategory.id, formData);
        showToast('success', 'Category updated');
      } else {
        await stockCategoriesApi.create(formData);
        showToast('success', 'Category created');
      }
      handleCloseModal();
      fetchData();
    } catch (error: any) {
      showToast('error', error.response?.data?.error || 'Failed to save category');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (category: StockCategory) => {
    if (!confirm(`Are you sure you want to deactivate "${category.name}"?`)) return;

    try {
      await stockCategoriesApi.delete(category.id);
      showToast('success', 'Category deactivated');
      fetchData();
    } catch (error: any) {
      showToast('error', error.response?.data?.error || 'Failed to deactivate category');
    }
  };

  // Recursive tree renderer
  const renderTreeNode = (node: StockCategoryTreeNode, level: number = 0) => {
    return (
      <div key={node.id}>
        <div
          className={`flex items-center justify-between py-3 px-4 hover:bg-factory-gray rounded-xl transition-colors ${
            level > 0 ? 'ml-6 border-l border-factory-border' : ''
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="text-lg">
              {node.children.length > 0 ? '📂' : '📁'}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-white font-medium">{node.name}</span>
                <span className="text-xs text-primary-400 font-mono">{node.code}</span>
                {node.trackBatches && (
                  <span className="px-1.5 py-0.5 rounded text-xs bg-primary-500/20 text-primary-400">
                    Batch
                  </span>
                )}
              </div>
              <p className="text-sm text-neutral-500">
                {node._count?.items || 0} items
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const fullCategory = categories.find((c) => c.id === node.id);
                if (fullCategory) handleOpenModal(fullCategory);
              }}
            >
              Edit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleOpenModal({ parentId: node.id } as any)}
            >
              + Sub
            </Button>
          </div>
        </div>
        {node.children.length > 0 && (
          <div className="mt-1">
            {node.children.map((child) => renderTreeNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  // Get parent options (exclude self and descendants when editing)
  const getParentOptions = () => {
    if (!editingCategory) return categories.filter((c) => c.isActive);

    // Simple filter - just exclude self (proper descendant check would need recursion)
    return categories.filter((c) => c.isActive && c.id !== editingCategory.id);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Stock Categories</h1>
          <p className="text-neutral-400 mt-1">
            Organize stock items into hierarchical categories
          </p>
        </div>
        <div className="flex gap-3">
          <div className="flex gap-1 bg-factory-gray rounded-xl p-1">
            <Button
              variant={viewMode === 'tree' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('tree')}
            >
              Tree
            </Button>
            <Button
              variant={viewMode === 'list' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              List
            </Button>
          </div>
          <Button onClick={() => handleOpenModal()}>+ Add Category</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-4">
          <p className="text-neutral-400 text-sm">Total Categories</p>
          <p className="text-2xl font-semibold text-white">{categories.length}</p>
        </div>
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-4">
          <p className="text-neutral-400 text-sm">Root Categories</p>
          <p className="text-2xl font-semibold text-white">{treeData.length}</p>
        </div>
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-4">
          <p className="text-neutral-400 text-sm">Batch Tracking</p>
          <p className="text-2xl font-semibold text-white">
            {categories.filter((c) => c.trackBatches).length}
          </p>
        </div>
      </div>

      {/* Categories View */}
      <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
        {viewMode === 'tree' ? (
          // Tree View
          <div className="space-y-1">
            {treeData.length > 0 ? (
              treeData.map((node) => renderTreeNode(node))
            ) : (
              <div className="text-center py-8">
                <p className="text-neutral-400 mb-4">No categories yet</p>
                <Button onClick={() => handleOpenModal()}>+ Add First Category</Button>
              </div>
            )}
          </div>
        ) : (
          // List View
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-factory-border">
                  <th className="text-left px-4 py-3 text-sm font-medium text-neutral-400">Code</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-neutral-400">Name</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-neutral-400">Parent</th>
                  <th className="text-center px-4 py-3 text-sm font-medium text-neutral-400">Items</th>
                  <th className="text-center px-4 py-3 text-sm font-medium text-neutral-400">Batch</th>
                  <th className="text-center px-4 py-3 text-sm font-medium text-neutral-400">Status</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-neutral-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-factory-border">
                {categories.map((category) => (
                  <tr key={category.id} className="hover:bg-factory-gray transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm text-primary-400">{category.code}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-white">{category.name}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-neutral-400">{category.parent?.name || '-'}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-white">{category._count?.items || 0}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {category.trackBatches ? (
                        <span className="text-success">Yes</span>
                      ) : (
                        <span className="text-neutral-500">No</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          category.isActive
                            ? 'bg-success/20 text-success'
                            : 'bg-error/20 text-error'
                        }`}
                      >
                        {category.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleOpenModal(category)}>
                          Edit
                        </Button>
                        {category.isActive && (
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(category)}>
                            Deactivate
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-factory-dark rounded-2xl border border-factory-border w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-factory-border">
              <h2 className="text-xl font-semibold text-white">
                {editingCategory ? 'Edit Category' : 'Add Category'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">
                    Code *
                  </label>
                  <Input
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="CAT-001"
                    disabled={!!editingCategory}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">
                    Sort Order
                  </label>
                  <Input
                    type="number"
                    value={formData.sortOrder}
                    onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                    min="0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Name *
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Category name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Description..."
                  rows={2}
                  className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Parent Category
                </label>
                <select
                  value={formData.parentId || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, parentId: e.target.value ? Number(e.target.value) : undefined })
                  }
                  className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">None (Root Category)</option>
                  {getParentOptions().map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.parent ? `${cat.parent.name} > ` : ''}{cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Default Unit
                </label>
                <select
                  value={formData.defaultUnitId || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, defaultUnitId: e.target.value ? Number(e.target.value) : undefined })
                  }
                  className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">None</option>
                  {units.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.name} ({unit.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-wrap gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.trackBatches}
                    onChange={(e) => setFormData({ ...formData, trackBatches: e.target.checked })}
                    className="w-4 h-4 rounded bg-factory-gray border-factory-border text-primary-500 focus:ring-primary-500"
                  />
                  <span className="text-sm text-neutral-300">Enable Batch Tracking</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4 rounded bg-factory-gray border-factory-border text-primary-500 focus:ring-primary-500"
                  />
                  <span className="text-sm text-neutral-300">Active</span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-factory-border">
                <Button type="button" variant="secondary" onClick={handleCloseModal}>
                  Cancel
                </Button>
                <Button type="submit" isLoading={isSaving}>
                  {editingCategory ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
