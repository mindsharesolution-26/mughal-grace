'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import {
  departmentsApi,
  productGroupsApi,
  brandsApi,
  unitsApi,
} from '@/lib/api/settings';
import {
  Department,
  DepartmentFormData,
  ProductGroup,
  ProductGroupFormData,
  Brand,
  BrandFormData,
  Unit,
  UnitFormData,
  unitCategoryOptions,
  countryOptions,
} from '@/lib/types/settings';

type TabId =
  | 'profile'
  | 'factory'
  | 'departments'
  | 'product-groups'
  | 'brands'
  | 'units'
  | 'whatsapp'
  | 'notifications'
  | 'security'
  | 'data-management';

// WhatsApp settings interface
interface WhatsAppSettings {
  id?: number;
  isEnabled: boolean;
  phoneNumberId?: string;
  businessAccountId?: string;
  dailyReportEnabled: boolean;
  dailyReportTime: string;
  dailyReportRecipients: string[];
  orderNotifications: boolean;
  paymentReminders: boolean;
  queryBotEnabled: boolean;
}

export default function SettingsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<TabId>('profile');

  // Data states
  const [departments, setDepartments] = useState<Department[]>([]);
  const [productGroups, setProductGroups] = useState<ProductGroup[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);

  // Loading states
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const [loadingProductGroups, setLoadingProductGroups] = useState(false);
  const [loadingBrands, setLoadingBrands] = useState(false);
  const [loadingUnits, setLoadingUnits] = useState(false);

  // Modal states
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showBrandModal, setShowBrandModal] = useState(false);
  const [showUnitModal, setShowUnitModal] = useState(false);

  // WhatsApp states
  const [whatsappSettings, setWhatsappSettings] = useState<WhatsAppSettings>({
    isEnabled: false,
    dailyReportEnabled: false,
    dailyReportTime: '18:00',
    dailyReportRecipients: [],
    orderNotifications: true,
    paymentReminders: true,
    queryBotEnabled: true,
  });
  const [loadingWhatsapp, setLoadingWhatsapp] = useState(false);
  const [savingWhatsapp, setSavingWhatsapp] = useState(false);
  const [testPhoneNumber, setTestPhoneNumber] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const [newRecipient, setNewRecipient] = useState('');

  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [editingGroup, setEditingGroup] = useState<ProductGroup | null>(null);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);

  // Factory Reset states
  const [resetConfirmation, setResetConfirmation] = useState('');
  const [keepSettings, setKeepSettings] = useState(false);
  const [resettingFactory, setResettingFactory] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetResult, setResetResult] = useState<{ message: string; details: Record<string, number> } | null>(null);

  // Fetch data when tab changes
  useEffect(() => {
    if (activeTab === 'departments' && departments.length === 0) {
      fetchDepartments();
    } else if (activeTab === 'product-groups' && productGroups.length === 0) {
      fetchProductGroups();
    } else if (activeTab === 'brands' && brands.length === 0) {
      fetchBrands();
    } else if (activeTab === 'units' && units.length === 0) {
      fetchUnits();
    } else if (activeTab === 'whatsapp') {
      fetchWhatsappSettings();
    }
  }, [activeTab]);

  const fetchWhatsappSettings = async () => {
    setLoadingWhatsapp(true);
    try {
      const response = await fetch('/api/v1/whatsapp/settings');
      if (response.ok) {
        const data = await response.json();
        setWhatsappSettings(data);
      }
    } catch (error) {
      console.error('Failed to load WhatsApp settings');
    } finally {
      setLoadingWhatsapp(false);
    }
  };

  const saveWhatsappSettings = async () => {
    setSavingWhatsapp(true);
    try {
      const response = await fetch('/api/v1/whatsapp/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(whatsappSettings),
      });
      if (response.ok) {
        showToast('success', 'WhatsApp settings saved');
      } else {
        showToast('error', 'Failed to save settings');
      }
    } catch (error) {
      showToast('error', 'Failed to save settings');
    } finally {
      setSavingWhatsapp(false);
    }
  };

  const sendTestMessage = async () => {
    if (!testPhoneNumber) {
      showToast('error', 'Please enter a phone number');
      return;
    }
    setSendingTest(true);
    try {
      const response = await fetch('/api/v1/whatsapp/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: testPhoneNumber }),
      });
      if (response.ok) {
        showToast('success', 'Test message sent!');
      } else {
        const data = await response.json();
        showToast('error', data.error || 'Failed to send test message');
      }
    } catch (error) {
      showToast('error', 'Failed to send test message');
    } finally {
      setSendingTest(false);
    }
  };

  const addRecipient = () => {
    if (newRecipient && !whatsappSettings.dailyReportRecipients.includes(newRecipient)) {
      setWhatsappSettings({
        ...whatsappSettings,
        dailyReportRecipients: [...whatsappSettings.dailyReportRecipients, newRecipient],
      });
      setNewRecipient('');
    }
  };

  const removeRecipient = (phone: string) => {
    setWhatsappSettings({
      ...whatsappSettings,
      dailyReportRecipients: whatsappSettings.dailyReportRecipients.filter((r) => r !== phone),
    });
  };

  const fetchDepartments = async () => {
    setLoadingDepartments(true);
    try {
      const data = await departmentsApi.getAll();
      setDepartments(data);
    } catch (error) {
      showToast('error', 'Failed to load departments');
    } finally {
      setLoadingDepartments(false);
    }
  };

  const fetchProductGroups = async () => {
    setLoadingProductGroups(true);
    try {
      const data = await productGroupsApi.getAll();
      setProductGroups(data);
    } catch (error) {
      showToast('error', 'Failed to load product groups');
    } finally {
      setLoadingProductGroups(false);
    }
  };

  const fetchBrands = async () => {
    setLoadingBrands(true);
    try {
      const data = await brandsApi.getAll();
      setBrands(data);
    } catch (error) {
      showToast('error', 'Failed to load brands');
    } finally {
      setLoadingBrands(false);
    }
  };

  const fetchUnits = async () => {
    setLoadingUnits(true);
    try {
      const data = await unitsApi.getAll();
      setUnits(data);
    } catch (error) {
      showToast('error', 'Failed to load units');
    } finally {
      setLoadingUnits(false);
    }
  };

  const handleSeedUnits = async () => {
    try {
      const result = await unitsApi.seedDefaults();
      showToast('success', result.message);
      fetchUnits();
    } catch (error) {
      showToast('error', 'Failed to seed default units');
    }
  };

  // Department Modal Component
  const DepartmentModal = () => {
    const [formData, setFormData] = useState<DepartmentFormData>({
      name: editingDept?.name || '',
      description: editingDept?.description || '',
      parentId: editingDept?.parentId || null,
      managerName: editingDept?.managerName || '',
      contactPerson: editingDept?.contactPerson || '',
      employeeCount: editingDept?.employeeCount ?? 0,
      isActive: editingDept?.isActive ?? true,
    });
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setSaving(true);
      try {
        if (editingDept) {
          await departmentsApi.update(editingDept.id, formData);
          showToast('success', 'Department updated');
        } else {
          await departmentsApi.create(formData);
          showToast('success', 'Department created');
        }
        setShowDeptModal(false);
        setEditingDept(null);
        fetchDepartments();
      } catch (error: any) {
        showToast('error', error.response?.data?.error || 'Failed to save department');
      } finally {
        setSaving(false);
      }
    };

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-factory-dark rounded-2xl border border-factory-border w-full max-w-md">
          <div className="p-6 border-b border-factory-border">
            <h2 className="text-xl font-semibold text-white">
              {editingDept ? 'Edit Department' : 'Add Department'}
            </h2>
            {editingDept && (
              <p className="text-sm text-neutral-400 mt-1">Code: {editingDept.code}</p>
            )}
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <Input
              label="Name *"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Department name"
              required
            />
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                Parent Department
              </label>
              <select
                value={formData.parentId || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    parentId: e.target.value ? Number(e.target.value) : null,
                  })
                }
                className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">None (Top Level)</option>
                {departments
                  .filter((d) => d.id !== editingDept?.id)
                  .map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.code} - {dept.name}
                    </option>
                  ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Manager Name"
                value={formData.managerName || ''}
                onChange={(e) => setFormData({ ...formData, managerName: e.target.value || null })}
                placeholder="John Doe"
              />
              <Input
                label="Contact Person"
                value={formData.contactPerson || ''}
                onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value || null })}
                placeholder="Jane Smith"
              />
            </div>
            <Input
              label="Employee Count"
              type="number"
              min="0"
              value={formData.employeeCount ?? ''}
              onChange={(e) => setFormData({ ...formData, employeeCount: e.target.value ? Number(e.target.value) : null })}
              placeholder="0"
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
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="dept-active"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="w-4 h-4"
              />
              <label htmlFor="dept-active" className="text-neutral-300">
                Active
              </label>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowDeptModal(false);
                  setEditingDept(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : editingDept ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // Product Group Modal Component
  const ProductGroupModal = () => {
    const [formData, setFormData] = useState<ProductGroupFormData>({
      code: editingGroup?.code || '',
      name: editingGroup?.name || '',
      description: editingGroup?.description || '',
      parentId: editingGroup?.parentId || null,
      isActive: editingGroup?.isActive ?? true,
    });
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setSaving(true);
      try {
        if (editingGroup) {
          await productGroupsApi.update(editingGroup.id, formData);
          showToast('success', 'Product group updated');
        } else {
          await productGroupsApi.create(formData);
          showToast('success', 'Product group created');
        }
        setShowGroupModal(false);
        setEditingGroup(null);
        fetchProductGroups();
      } catch (error: any) {
        showToast('error', error.response?.data?.error || 'Failed to save product group');
      } finally {
        setSaving(false);
      }
    };

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-factory-dark rounded-2xl border border-factory-border w-full max-w-md">
          <div className="p-6 border-b border-factory-border">
            <h2 className="text-xl font-semibold text-white">
              {editingGroup ? 'Edit Product Group' : 'Add Product Group'}
            </h2>
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <Input
              label="Code *"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              placeholder="GRP-001"
              required
            />
            <Input
              label="Name *"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Group name"
              required
            />
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                Parent Group
              </label>
              <select
                value={formData.parentId || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    parentId: e.target.value ? Number(e.target.value) : null,
                  })
                }
                className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">None (Top Level)</option>
                {productGroups
                  .filter((g) => g.id !== editingGroup?.id)
                  .map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.code} - {group.name}
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
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="group-active"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="w-4 h-4"
              />
              <label htmlFor="group-active" className="text-neutral-300">
                Active
              </label>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowGroupModal(false);
                  setEditingGroup(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : editingGroup ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // Brand Modal Component
  const BrandModal = () => {
    const [formData, setFormData] = useState<BrandFormData>({
      name: editingBrand?.name || '',
      description: editingBrand?.description || '',
      phone: editingBrand?.phone || '',
      email: editingBrand?.email || '',
      contactPerson: editingBrand?.contactPerson || '',
      country: editingBrand?.country || '',
      website: editingBrand?.website || '',
      isActive: editingBrand?.isActive ?? true,
    });
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setSaving(true);
      try {
        if (editingBrand) {
          await brandsApi.update(editingBrand.id, formData);
          showToast('success', 'Brand updated');
        } else {
          await brandsApi.create(formData);
          showToast('success', 'Brand created');
        }
        setShowBrandModal(false);
        setEditingBrand(null);
        fetchBrands();
      } catch (error: any) {
        showToast('error', error.response?.data?.error || 'Failed to save brand');
      } finally {
        setSaving(false);
      }
    };

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-factory-dark rounded-2xl border border-factory-border w-full max-w-md max-h-[90vh] overflow-y-auto">
          <div className="p-6 border-b border-factory-border sticky top-0 bg-factory-dark z-10">
            <h2 className="text-xl font-semibold text-white">
              {editingBrand ? 'Edit Brand' : 'Add Brand'}
            </h2>
            {editingBrand && (
              <p className="text-sm text-neutral-400 mt-1">Code: {editingBrand.code}</p>
            )}
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <Input
              label="Name *"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Brand name"
              required
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Phone"
                type="tel"
                value={formData.phone || ''}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value || null })}
                placeholder="+92 300 1234567"
              />
              <Input
                label="Email"
                type="email"
                value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value || null })}
                placeholder="contact@brand.com"
              />
            </div>
            <Input
              label="Contact Person"
              value={formData.contactPerson || ''}
              onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value || null })}
              placeholder="John Doe"
            />
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                Country
              </label>
              <select
                value={formData.country || ''}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Select Country</option>
                {countryOptions.map((country) => (
                  <option key={country} value={country}>
                    {country}
                  </option>
                ))}
              </select>
            </div>
            <Input
              label="Website"
              type="url"
              value={formData.website || ''}
              onChange={(e) => setFormData({ ...formData, website: e.target.value || null })}
              placeholder="https://example.com"
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
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="brand-active"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="w-4 h-4"
              />
              <label htmlFor="brand-active" className="text-neutral-300">
                Active
              </label>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowBrandModal(false);
                  setEditingBrand(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : editingBrand ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // Unit Modal Component
  const UnitModal = () => {
    const [formData, setFormData] = useState<UnitFormData>({
      code: editingUnit?.code || '',
      name: editingUnit?.name || '',
      symbol: editingUnit?.symbol || '',
      category: editingUnit?.category || 'COUNT',
      description: editingUnit?.description || '',
      baseUnit: editingUnit?.baseUnit || '',
      conversionFactor: editingUnit?.conversionFactor
        ? Number(editingUnit.conversionFactor)
        : undefined,
      siUnit: editingUnit?.siUnit ?? false,
      isoCode: editingUnit?.isoCode || '',
      isActive: editingUnit?.isActive ?? true,
    });
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setSaving(true);
      try {
        if (editingUnit) {
          await unitsApi.update(editingUnit.id, formData);
          showToast('success', 'Unit updated');
        } else {
          await unitsApi.create(formData);
          showToast('success', 'Unit created');
        }
        setShowUnitModal(false);
        setEditingUnit(null);
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
              {editingUnit ? 'Edit Unit' : 'Add Unit'}
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
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value as any })
                }
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
                value={formData.conversionFactor || ''}
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
                  setShowUnitModal(false);
                  setEditingUnit(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : editingUnit ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // Delete handlers
  const handleDeleteDepartment = async (id: number) => {
    if (!confirm('Are you sure you want to delete this department?')) return;
    try {
      await departmentsApi.delete(id);
      showToast('success', 'Department deleted');
      fetchDepartments();
    } catch (error: any) {
      showToast('error', error.response?.data?.error || 'Failed to delete department');
    }
  };

  const handleDeleteProductGroup = async (id: number) => {
    if (!confirm('Are you sure you want to delete this product group?')) return;
    try {
      await productGroupsApi.delete(id);
      showToast('success', 'Product group deleted');
      fetchProductGroups();
    } catch (error: any) {
      showToast('error', error.response?.data?.error || 'Failed to delete product group');
    }
  };

  const handleDeleteBrand = async (id: number) => {
    if (!confirm('Are you sure you want to delete this brand?')) return;
    try {
      await brandsApi.delete(id);
      showToast('success', 'Brand deleted');
      fetchBrands();
    } catch (error: any) {
      showToast('error', error.response?.data?.error || 'Failed to delete brand');
    }
  };

  const handleDeleteUnit = async (id: number) => {
    if (!confirm('Are you sure you want to delete this unit?')) return;
    try {
      await unitsApi.delete(id);
      showToast('success', 'Unit deleted');
      fetchUnits();
    } catch (error: any) {
      showToast('error', error.response?.data?.error || 'Failed to delete unit');
    }
  };

  // Factory Reset handler
  const handleFactoryReset = async () => {
    if (resetConfirmation !== 'RESET_FACTORY_DATA') {
      showToast('error', 'Please type RESET_FACTORY_DATA to confirm');
      return;
    }

    setResettingFactory(true);
    try {
      const response = await fetch('/api/v1/settings/reset-factory-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confirmation: resetConfirmation,
          keepSettings,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setResetResult(data);
        showToast('success', data.message);
        setShowResetModal(false);
        setResetConfirmation('');
      } else {
        showToast('error', data.error || 'Failed to reset factory data');
      }
    } catch (error) {
      showToast('error', 'Failed to reset factory data');
    } finally {
      setResettingFactory(false);
    }
  };

  // Tab configuration
  const tabs = [
    { key: 'profile', label: 'Profile', icon: '👤' },
    { key: 'factory', label: 'Factory', icon: '🏭' },
    { key: 'departments', label: 'Departments', icon: '🏢' },
    { key: 'product-groups', label: 'Product Groups', icon: '📦' },
    { key: 'brands', label: 'Brands', icon: '🏷️' },
    { key: 'units', label: 'Units', icon: '📏' },
    { key: 'whatsapp', label: 'WhatsApp', icon: '💬' },
    { key: 'notifications', label: 'Notifications', icon: '🔔' },
    { key: 'security', label: 'Security', icon: '🔒' },
    { key: 'data-management', label: 'Data Management', icon: '🗃️' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-white">Settings</h1>
        <p className="text-neutral-400 mt-1">
          Manage your account and factory settings
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <div className="lg:w-64 shrink-0">
          <nav className="bg-factory-dark rounded-2xl border border-factory-border p-2 space-y-1">
            {tabs.map(({ key, label, icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key as TabId)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  activeTab === key
                    ? 'bg-primary-500/20 text-primary-400'
                    : 'text-neutral-400 hover:bg-factory-gray hover:text-white'
                }`}
              >
                <span>{icon}</span>
                {label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
              <h2 className="text-lg font-semibold text-white mb-6">Profile Settings</h2>
              <div className="flex items-center gap-6 mb-8">
                <div className="w-20 h-20 rounded-full bg-primary-500/20 flex items-center justify-center text-3xl text-primary-400">
                  {user?.fullName?.charAt(0) || 'U'}
                </div>
                <div>
                  <p className="text-white font-medium">{user?.fullName}</p>
                  <p className="text-sm text-neutral-400">{user?.role?.replace('_', ' ')}</p>
                  <Button variant="ghost" size="sm" className="mt-2">
                    Change Photo
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input label="Full Name" defaultValue={user?.fullName} />
                <Input label="Email" type="email" defaultValue={user?.email} disabled />
                <Input label="Phone" type="tel" placeholder="+92 300 1234567" />
                <Input label="Role" defaultValue={user?.role?.replace('_', ' ')} disabled />
              </div>
              <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-factory-border">
                <Button variant="secondary">Cancel</Button>
                <Button>Save Changes</Button>
              </div>
            </div>
          )}

          {/* Factory Tab */}
          {activeTab === 'factory' && (
            <div className="space-y-6">
              <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
                <h2 className="text-lg font-semibold text-white mb-6">Factory Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Input label="Factory Name" defaultValue="Mughal Grace Textiles" />
                  <Input label="Total Machines" type="number" defaultValue="50" />
                  <Input label="Address" placeholder="Factory address" />
                  <Input label="City" defaultValue="Faisalabad" />
                </div>
                <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-factory-border">
                  <Button variant="secondary">Cancel</Button>
                  <Button>Save Changes</Button>
                </div>
              </div>
              <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Shifts Configuration</h2>
                <div className="space-y-4">
                  {[
                    { name: 'Morning Shift (A)', time: '6:00 AM - 2:00 PM' },
                    { name: 'Afternoon Shift (B)', time: '2:00 PM - 10:00 PM' },
                    { name: 'Night Shift (C)', time: '10:00 PM - 6:00 AM' },
                  ].map((shift, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 bg-factory-gray rounded-xl"
                    >
                      <div>
                        <p className="text-white font-medium">{shift.name}</p>
                        <p className="text-sm text-neutral-400">{shift.time}</p>
                      </div>
                      <Button variant="ghost" size="sm">Edit</Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Departments Tab */}
          {activeTab === 'departments' && (
            <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-white">Departments</h2>
                  <p className="text-sm text-neutral-400 mt-1">Manage organizational departments</p>
                </div>
                <Button onClick={() => setShowDeptModal(true)}>+ Add Department</Button>
              </div>
              {loadingDepartments ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
                </div>
              ) : departments.length === 0 ? (
                <div className="text-center py-8 text-neutral-400">
                  No departments yet. Add your first department!
                </div>
              ) : (
                <div className="space-y-3">
                  {departments.map((dept) => (
                    <div
                      key={dept.id}
                      className="flex items-center justify-between p-4 bg-factory-gray rounded-xl"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-primary-400 font-mono text-sm">{dept.code}</span>
                          <span className="text-white font-medium">{dept.name}</span>
                          {!dept.isActive && (
                            <span className="px-2 py-0.5 bg-neutral-500/20 text-neutral-400 text-xs rounded">
                              Inactive
                            </span>
                          )}
                        </div>
                        {dept.parent && (
                          <p className="text-xs text-neutral-400 mt-1">
                            Parent: {dept.parent.name}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingDept(dept);
                            setShowDeptModal(true);
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteDepartment(dept.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Product Groups Tab */}
          {activeTab === 'product-groups' && (
            <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-white">Product Groups</h2>
                  <p className="text-sm text-neutral-400 mt-1">Categorize products into groups</p>
                </div>
                <Button onClick={() => setShowGroupModal(true)}>+ Add Group</Button>
              </div>
              {loadingProductGroups ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
                </div>
              ) : productGroups.length === 0 ? (
                <div className="text-center py-8 text-neutral-400">
                  No product groups yet. Add your first group!
                </div>
              ) : (
                <div className="space-y-3">
                  {productGroups.map((group) => (
                    <div
                      key={group.id}
                      className="flex items-center justify-between p-4 bg-factory-gray rounded-xl"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-primary-400 font-mono text-sm">{group.code}</span>
                          <span className="text-white font-medium">{group.name}</span>
                          {!group.isActive && (
                            <span className="px-2 py-0.5 bg-neutral-500/20 text-neutral-400 text-xs rounded">
                              Inactive
                            </span>
                          )}
                        </div>
                        {group.parent && (
                          <p className="text-xs text-neutral-400 mt-1">
                            Parent: {group.parent.name}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingGroup(group);
                            setShowGroupModal(true);
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteProductGroup(group.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Brands Tab */}
          {activeTab === 'brands' && (
            <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-white">Brands</h2>
                  <p className="text-sm text-neutral-400 mt-1">Manage product brands</p>
                </div>
                <Button onClick={() => setShowBrandModal(true)}>+ Add Brand</Button>
              </div>
              {loadingBrands ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
                </div>
              ) : brands.length === 0 ? (
                <div className="text-center py-8 text-neutral-400">
                  No brands yet. Add your first brand!
                </div>
              ) : (
                <div className="space-y-3">
                  {brands.map((brand) => (
                    <div
                      key={brand.id}
                      className="flex items-center justify-between p-4 bg-factory-gray rounded-xl"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-primary-400 font-mono text-sm">{brand.code}</span>
                          <span className="text-white font-medium">{brand.name}</span>
                          {brand.country && (
                            <span className="px-2 py-0.5 bg-factory-border text-neutral-300 text-xs rounded">
                              {brand.country}
                            </span>
                          )}
                          {!brand.isActive && (
                            <span className="px-2 py-0.5 bg-neutral-500/20 text-neutral-400 text-xs rounded">
                              Inactive
                            </span>
                          )}
                        </div>
                        {brand.website && (
                          <a
                            href={brand.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary-400 hover:underline mt-1 block"
                          >
                            {brand.website}
                          </a>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingBrand(brand);
                            setShowBrandModal(true);
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteBrand(brand.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Units Tab */}
          {activeTab === 'units' && (
            <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-white">Units of Measurement</h2>
                  <p className="text-sm text-neutral-400 mt-1">
                    International standard units for measurement
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={handleSeedUnits}>
                    Seed Defaults
                  </Button>
                  <Button onClick={() => setShowUnitModal(true)}>+ Add Unit</Button>
                </div>
              </div>
              {loadingUnits ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
                </div>
              ) : units.length === 0 ? (
                <div className="text-center py-8 text-neutral-400">
                  <p>No units yet. Click "Seed Defaults" to add international standard units.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {unitCategoryOptions.map((category) => {
                    const categoryUnits = units.filter((u) => u.category === category.value);
                    if (categoryUnits.length === 0) return null;
                    return (
                      <div key={category.value}>
                        <h3 className="text-sm font-medium text-neutral-400 mb-3">
                          {category.label}
                        </h3>
                        <div className="space-y-2">
                          {categoryUnits.map((unit) => (
                            <div
                              key={unit.id}
                              className="flex items-center justify-between p-3 bg-factory-gray rounded-xl"
                            >
                              <div className="flex items-center gap-4">
                                <span className="text-lg font-medium text-white w-12">
                                  {unit.symbol}
                                </span>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-white">{unit.name}</span>
                                    <span className="text-neutral-500 font-mono text-xs">
                                      ({unit.code})
                                    </span>
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
                                  onClick={() => {
                                    setEditingUnit(unit);
                                    setShowUnitModal(true);
                                  }}
                                >
                                  Edit
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteUnit(unit.id)}
                                >
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
          )}

          {/* WhatsApp Tab */}
          {activeTab === 'whatsapp' && (
            <div className="space-y-6">
              {/* Enable/Disable */}
              <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-semibold text-white">WhatsApp Integration</h2>
                    <p className="text-sm text-neutral-400 mt-1">
                      Connect your WhatsApp Business account for notifications and query bot
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={whatsappSettings.isEnabled}
                      onChange={(e) =>
                        setWhatsappSettings({ ...whatsappSettings, isEnabled: e.target.checked })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-factory-gray rounded-full peer peer-checked:bg-primary-500 peer-focus:ring-2 peer-focus:ring-primary-500/50 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
                  </label>
                </div>

                {loadingWhatsapp ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="p-4 bg-factory-gray rounded-xl">
                      <p className="text-sm text-neutral-400 mb-2">Status</p>
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-2 h-2 rounded-full ${whatsappSettings.isEnabled ? 'bg-success' : 'bg-neutral-500'}`}
                        />
                        <span className="text-white">
                          {whatsappSettings.isEnabled ? 'Connected' : 'Disconnected'}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-neutral-500">
                      Configure WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN in your
                      environment variables to enable WhatsApp integration.
                    </p>
                  </div>
                )}
              </div>

              {/* Notification Settings */}
              <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
                <h2 className="text-lg font-semibold text-white mb-6">Notification Settings</h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-3 border-b border-factory-border">
                    <div>
                      <p className="text-white font-medium">Order Notifications</p>
                      <p className="text-sm text-neutral-400">
                        Send updates when orders are confirmed, shipped, or delivered
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={whatsappSettings.orderNotifications}
                        onChange={(e) =>
                          setWhatsappSettings({
                            ...whatsappSettings,
                            orderNotifications: e.target.checked,
                          })
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-factory-gray rounded-full peer peer-checked:bg-primary-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
                    </label>
                  </div>

                  <div className="flex items-center justify-between py-3 border-b border-factory-border">
                    <div>
                      <p className="text-white font-medium">Payment Reminders</p>
                      <p className="text-sm text-neutral-400">
                        Send automatic payment reminders for outstanding balances
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={whatsappSettings.paymentReminders}
                        onChange={(e) =>
                          setWhatsappSettings({
                            ...whatsappSettings,
                            paymentReminders: e.target.checked,
                          })
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-factory-gray rounded-full peer peer-checked:bg-primary-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
                    </label>
                  </div>

                  <div className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-white font-medium">Query Bot</p>
                      <p className="text-sm text-neutral-400">
                        Enable AI-powered responses to stock/order queries (English & Urdu)
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={whatsappSettings.queryBotEnabled}
                        onChange={(e) =>
                          setWhatsappSettings({
                            ...whatsappSettings,
                            queryBotEnabled: e.target.checked,
                          })
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-factory-gray rounded-full peer peer-checked:bg-primary-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
                    </label>
                  </div>
                </div>
              </div>

              {/* Daily Report Settings */}
              <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-semibold text-white">Daily Reports</h2>
                    <p className="text-sm text-neutral-400 mt-1">
                      Send daily production and sales summaries via WhatsApp
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={whatsappSettings.dailyReportEnabled}
                      onChange={(e) =>
                        setWhatsappSettings({
                          ...whatsappSettings,
                          dailyReportEnabled: e.target.checked,
                        })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-factory-gray rounded-full peer peer-checked:bg-primary-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
                  </label>
                </div>

                {whatsappSettings.dailyReportEnabled && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                        Report Time
                      </label>
                      <input
                        type="time"
                        value={whatsappSettings.dailyReportTime}
                        onChange={(e) =>
                          setWhatsappSettings({
                            ...whatsappSettings,
                            dailyReportTime: e.target.value,
                          })
                        }
                        className="w-full max-w-xs px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                      <p className="text-xs text-neutral-500 mt-1">
                        Daily report will be sent at this time
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                        Recipients
                      </label>
                      <div className="flex gap-2 mb-2">
                        <input
                          type="tel"
                          value={newRecipient}
                          onChange={(e) => setNewRecipient(e.target.value)}
                          placeholder="+92 300 1234567"
                          className="flex-1 max-w-xs px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                        <Button onClick={addRecipient}>Add</Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {whatsappSettings.dailyReportRecipients.map((phone) => (
                          <div
                            key={phone}
                            className="flex items-center gap-2 px-3 py-1.5 bg-factory-gray rounded-lg"
                          >
                            <span className="text-sm text-white">{phone}</span>
                            <button
                              onClick={() => removeRecipient(phone)}
                              className="text-neutral-400 hover:text-error"
                            >
                              x
                            </button>
                          </div>
                        ))}
                        {whatsappSettings.dailyReportRecipients.length === 0 && (
                          <span className="text-sm text-neutral-500">No recipients added yet</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Test Message */}
              <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Test Connection</h2>
                <p className="text-sm text-neutral-400 mb-4">
                  Send a test message to verify your WhatsApp integration is working
                </p>
                <div className="flex gap-2">
                  <input
                    type="tel"
                    value={testPhoneNumber}
                    onChange={(e) => setTestPhoneNumber(e.target.value)}
                    placeholder="+92 300 1234567"
                    className="flex-1 max-w-xs px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <Button onClick={sendTestMessage} disabled={sendingTest}>
                    {sendingTest ? 'Sending...' : 'Send Test'}
                  </Button>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end">
                <Button onClick={saveWhatsappSettings} disabled={savingWhatsapp}>
                  {savingWhatsapp ? 'Saving...' : 'Save WhatsApp Settings'}
                </Button>
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
              <h2 className="text-lg font-semibold text-white mb-6">Notification Preferences</h2>
              <div className="space-y-6">
                {[
                  {
                    title: 'Production Alerts',
                    description: 'Get notified about production targets and machine status',
                    enabled: true,
                  },
                  {
                    title: 'Low Stock Alerts',
                    description: 'Receive alerts when yarn stock falls below threshold',
                    enabled: true,
                  },
                  {
                    title: 'Payment Reminders',
                    description: 'Reminders for pending payments and overdue invoices',
                    enabled: false,
                  },
                  {
                    title: 'Daily Summary',
                    description: 'Daily production and sales summary via WhatsApp',
                    enabled: true,
                  },
                  {
                    title: 'Weekly Reports',
                    description: 'Weekly performance reports via email',
                    enabled: true,
                  },
                ].map((notification, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-4 border-b border-factory-border last:border-0"
                  >
                    <div>
                      <p className="text-white font-medium">{notification.title}</p>
                      <p className="text-sm text-neutral-400">{notification.description}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        defaultChecked={notification.enabled}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-factory-gray rounded-full peer peer-checked:bg-primary-500 peer-focus:ring-2 peer-focus:ring-primary-500/50 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
                    </label>
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-factory-border">
                <Button>Save Preferences</Button>
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
                <h2 className="text-lg font-semibold text-white mb-6">Change Password</h2>
                <div className="space-y-4 max-w-md">
                  <Input label="Current Password" type="password" />
                  <Input label="New Password" type="password" />
                  <Input label="Confirm New Password" type="password" />
                </div>
                <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-factory-border">
                  <Button>Update Password</Button>
                </div>
              </div>
              <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Active Sessions</h2>
                <div className="space-y-4">
                  {[
                    { device: 'Chrome on Windows', location: 'Faisalabad, PK', current: true },
                    { device: 'Safari on iPhone', location: 'Lahore, PK', current: false },
                  ].map((session, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 bg-factory-gray rounded-xl"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-white font-medium">{session.device}</p>
                          {session.current && (
                            <span className="px-2 py-0.5 bg-success/20 text-success text-xs rounded">
                              Current
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-neutral-400">{session.location}</p>
                      </div>
                      {!session.current && (
                        <Button variant="ghost" size="sm">
                          Revoke
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-factory-dark rounded-2xl border border-error/30 p-6">
                <h2 className="text-lg font-semibold text-white mb-2">Danger Zone</h2>
                <p className="text-neutral-400 text-sm mb-4">
                  Once you delete your account, there is no going back. Please be certain.
                </p>
                <Button variant="danger">Delete Account</Button>
              </div>
            </div>
          )}

          {/* Data Management Tab */}
          {activeTab === 'data-management' && (
            <div className="space-y-6">
              {/* Reset Result */}
              {resetResult && (
                <div className="bg-factory-dark rounded-2xl border border-success/30 p-6">
                  <h2 className="text-lg font-semibold text-success mb-4">Reset Complete</h2>
                  <p className="text-neutral-300 mb-4">{resetResult.message}</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(resetResult.details).map(([key, value]) => (
                      <div key={key} className="bg-factory-gray rounded-lg p-3">
                        <p className="text-xs text-neutral-500 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                        <p className="text-lg font-semibold text-white">{value}</p>
                      </div>
                    ))}
                  </div>
                  <Button
                    variant="secondary"
                    onClick={() => setResetResult(null)}
                    className="mt-4"
                  >
                    Dismiss
                  </Button>
                </div>
              )}

              {/* Factory Data Reset */}
              <div className="bg-factory-dark rounded-2xl border border-error/30 p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-error/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-2xl">⚠️</span>
                  </div>
                  <div className="flex-1">
                    <h2 className="text-lg font-semibold text-white mb-2">Reset Factory Data</h2>
                    <p className="text-neutral-400 text-sm mb-4">
                      This will permanently delete all transactional data from your factory including:
                    </p>
                    <ul className="text-sm text-neutral-400 list-disc list-inside mb-4 space-y-1">
                      <li>Production records and daily logs</li>
                      <li>Yarn stock, inward/outward transactions, and ledger entries</li>
                      <li>Roll inventory and dyeing records</li>
                      <li>Sales, receivables, payables, and cheques</li>
                      <li>Needle stock, transactions, and damage reports</li>
                      <li>Stock movements and inventory transactions</li>
                    </ul>
                    <p className="text-error text-sm font-medium mb-4">
                      This action cannot be undone!
                    </p>

                    <div className="flex flex-wrap gap-4 items-center">
                      <Button
                        variant="danger"
                        onClick={() => setShowResetModal(true)}
                      >
                        Reset Factory Data
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Information */}
              <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
                <h2 className="text-lg font-semibold text-white mb-4">About Data Reset</h2>
                <div className="space-y-4 text-sm text-neutral-400">
                  <p>
                    <strong className="text-white">When to use this:</strong> Use the factory reset when you want to start fresh with a clean database. This is useful for testing, demo purposes, or when starting a new accounting period.
                  </p>
                  <p>
                    <strong className="text-white">Keep Settings option:</strong> When enabled, master data like products, fabrics, machines, yarn types, vendors, and parties will be preserved. Only transactional data will be deleted.
                  </p>
                  <p>
                    <strong className="text-white">What is preserved:</strong> User accounts, departments, units, colors, grades, fabric types, and other configuration settings are never deleted by this operation.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-factory-dark rounded-2xl border border-error/30 w-full max-w-md">
            <div className="p-6 border-b border-factory-border">
              <h2 className="text-xl font-semibold text-error">Confirm Factory Reset</h2>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-neutral-300">
                You are about to delete all transactional data. This action is irreversible.
              </p>

              <div className="flex items-center gap-3 p-3 bg-factory-gray rounded-lg">
                <input
                  type="checkbox"
                  id="keep-settings"
                  checked={keepSettings}
                  onChange={(e) => setKeepSettings(e.target.checked)}
                  className="w-4 h-4"
                />
                <label htmlFor="keep-settings" className="text-neutral-300 text-sm">
                  Keep master data (products, machines, vendors, parties)
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                  Type <span className="text-error font-mono">RESET_FACTORY_DATA</span> to confirm:
                </label>
                <input
                  type="text"
                  value={resetConfirmation}
                  onChange={(e) => setResetConfirmation(e.target.value)}
                  placeholder="RESET_FACTORY_DATA"
                  className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-error font-mono"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowResetModal(false);
                    setResetConfirmation('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  onClick={handleFactoryReset}
                  disabled={resettingFactory || resetConfirmation !== 'RESET_FACTORY_DATA'}
                >
                  {resettingFactory ? 'Resetting...' : 'Reset Factory Data'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {showDeptModal && <DepartmentModal />}
      {showGroupModal && <ProductGroupModal />}
      {showBrandModal && <BrandModal />}
      {showUnitModal && <UnitModal />}
    </div>
  );
}
