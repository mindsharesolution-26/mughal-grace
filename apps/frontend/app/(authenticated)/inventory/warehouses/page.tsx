'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { useToast } from '@/contexts/ToastContext';
import { warehousesApi } from '@/lib/api/inventory';
import {
  Warehouse,
  WarehouseFormData,
  WarehouseLookup,
  locationTypeOptions,
  LocationType,
} from '@/lib/types/inventory';

export default function WarehousesPage() {
  const { showToast } = useToast();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);
  const [formData, setFormData] = useState<WarehouseFormData>({
    code: '',
    name: '',
    description: '',
    address: '',
    city: '',
    locationType: 'WAREHOUSE',
    isDefault: false,
    allowNegative: false,
    isActive: true,
  });
  const [isSaving, setIsSaving] = useState(false);

  // Fetch warehouses
  useEffect(() => {
    fetchWarehouses();
  }, []);

  const fetchWarehouses = async () => {
    try {
      setIsLoading(true);
      const data = await warehousesApi.getAll();
      setWarehouses(data);
    } catch (error: any) {
      showToast('error', 'Failed to load warehouses');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = (warehouse?: Warehouse) => {
    if (warehouse) {
      setEditingWarehouse(warehouse);
      setFormData({
        code: warehouse.code,
        name: warehouse.name,
        description: warehouse.description || '',
        address: warehouse.address || '',
        city: warehouse.city || '',
        parentId: warehouse.parentId || undefined,
        locationType: warehouse.locationType,
        isDefault: warehouse.isDefault,
        allowNegative: warehouse.allowNegative,
        isActive: warehouse.isActive,
      });
    } else {
      setEditingWarehouse(null);
      setFormData({
        code: '',
        name: '',
        description: '',
        address: '',
        city: '',
        locationType: 'WAREHOUSE',
        isDefault: false,
        allowNegative: false,
        isActive: true,
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingWarehouse(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code || !formData.name) {
      showToast('error', 'Code and name are required');
      return;
    }

    try {
      setIsSaving(true);
      if (editingWarehouse) {
        await warehousesApi.update(editingWarehouse.id, formData);
        showToast('success', 'Warehouse updated');
      } else {
        await warehousesApi.create(formData);
        showToast('success', 'Warehouse created');
      }
      handleCloseModal();
      fetchWarehouses();
    } catch (error: any) {
      showToast('error', error.response?.data?.error || 'Failed to save warehouse');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (warehouse: Warehouse) => {
    if (!confirm(`Are you sure you want to deactivate "${warehouse.name}"?`)) return;

    try {
      await warehousesApi.delete(warehouse.id);
      showToast('success', 'Warehouse deactivated');
      fetchWarehouses();
    } catch (error: any) {
      showToast('error', error.response?.data?.error || 'Failed to deactivate warehouse');
    }
  };

  // Get parent warehouses for dropdown (only main warehouses)
  const parentOptions = warehouses.filter(
    (w) => w.locationType === 'WAREHOUSE' && w.id !== editingWarehouse?.id
  );

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
          <h1 className="text-2xl font-semibold text-white">Warehouses & Locations</h1>
          <p className="text-neutral-400 mt-1">
            Manage storage locations, zones, and bins
          </p>
        </div>
        <Button onClick={() => handleOpenModal()}>+ Add Warehouse</Button>
      </div>

      {/* Warehouses Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {warehouses.map((warehouse) => (
          <div
            key={warehouse.id}
            className={`bg-factory-dark rounded-2xl border p-6 ${
              warehouse.isActive ? 'border-factory-border' : 'border-factory-border/50 opacity-60'
            }`}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">
                    {warehouse.locationType === 'WAREHOUSE' && '🏭'}
                    {warehouse.locationType === 'ZONE' && '📍'}
                    {warehouse.locationType === 'RACK' && '🗄️'}
                    {warehouse.locationType === 'BIN' && '📦'}
                    {warehouse.locationType === 'PRODUCTION' && '⚙️'}
                    {warehouse.locationType === 'QUALITY' && '✅'}
                    {warehouse.locationType === 'QUARANTINE' && '🔒'}
                  </span>
                  <h3 className="text-lg font-semibold text-white">{warehouse.name}</h3>
                </div>
                <p className="text-sm text-primary-400 font-mono mt-1">{warehouse.code}</p>
              </div>
              <div className="flex gap-1">
                {warehouse.isDefault && (
                  <span className="px-2 py-1 rounded-full text-xs bg-primary-500/20 text-primary-400">
                    Default
                  </span>
                )}
                {!warehouse.isActive && (
                  <span className="px-2 py-1 rounded-full text-xs bg-error/20 text-error">
                    Inactive
                  </span>
                )}
              </div>
            </div>

            {warehouse.description && (
              <p className="text-sm text-neutral-400 mb-3">{warehouse.description}</p>
            )}

            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-neutral-400">Type</span>
                <span className="text-white">
                  {locationTypeOptions.find((t) => t.value === warehouse.locationType)?.label}
                </span>
              </div>
              {warehouse.address && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-neutral-400">Location</span>
                  <span className="text-white">{warehouse.city || warehouse.address}</span>
                </div>
              )}
              {warehouse.parent && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-neutral-400">Parent</span>
                  <span className="text-white">{warehouse.parent.name}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-sm">
                <span className="text-neutral-400">Stock Items</span>
                <span className="text-white">{warehouse._count?.stockLevels || 0}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-neutral-400">Allow Negative</span>
                <span className={warehouse.allowNegative ? 'text-warning' : 'text-neutral-500'}>
                  {warehouse.allowNegative ? 'Yes' : 'No'}
                </span>
              </div>
            </div>

            {/* Sub-locations */}
            {warehouse.children && warehouse.children.length > 0 && (
              <div className="mb-4">
                <p className="text-xs text-neutral-500 mb-2">Sub-locations</p>
                <div className="flex flex-wrap gap-1">
                  {warehouse.children.map((child) => (
                    <span
                      key={child.id}
                      className="px-2 py-1 rounded text-xs bg-factory-gray text-neutral-300"
                    >
                      {child.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-4 border-t border-factory-border">
              <Button variant="ghost" size="sm" onClick={() => handleOpenModal(warehouse)}>
                Edit
              </Button>
              {warehouse.isActive && (
                <Button variant="ghost" size="sm" onClick={() => handleDelete(warehouse)}>
                  Deactivate
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {warehouses.length === 0 && (
        <div className="text-center py-12 bg-factory-dark rounded-2xl border border-factory-border">
          <p className="text-neutral-400 mb-4">No warehouses configured yet</p>
          <Button onClick={() => handleOpenModal()}>+ Add First Warehouse</Button>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-factory-dark rounded-2xl border border-factory-border w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-factory-border">
              <h2 className="text-xl font-semibold text-white">
                {editingWarehouse ? 'Edit Warehouse' : 'Add Warehouse'}
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
                    placeholder="WH-001"
                    disabled={!!editingWarehouse}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">
                    Type
                  </label>
                  <select
                    value={formData.locationType}
                    onChange={(e) => setFormData({ ...formData, locationType: e.target.value as LocationType })}
                    className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    {locationTypeOptions.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Name *
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Main Warehouse"
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

              {formData.locationType !== 'WAREHOUSE' && parentOptions.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">
                    Parent Location
                  </label>
                  <select
                    value={formData.parentId || ''}
                    onChange={(e) => setFormData({ ...formData, parentId: e.target.value ? Number(e.target.value) : undefined })}
                    className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">None</option>
                    {parentOptions.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">
                    Address
                  </label>
                  <Input
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Street address"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">
                    City
                  </label>
                  <Input
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="City"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isDefault}
                    onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                    className="w-4 h-4 rounded bg-factory-gray border-factory-border text-primary-500 focus:ring-primary-500"
                  />
                  <span className="text-sm text-neutral-300">Default Location</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.allowNegative}
                    onChange={(e) => setFormData({ ...formData, allowNegative: e.target.checked })}
                    className="w-4 h-4 rounded bg-factory-gray border-factory-border text-primary-500 focus:ring-primary-500"
                  />
                  <span className="text-sm text-neutral-300">Allow Negative Stock</span>
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
                  {editingWarehouse ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
