'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useToast } from '@/contexts/ToastContext';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { brandsApi } from '@/lib/api/settings';
import { Brand, BrandFormData, countryOptions } from '@/lib/types/settings';

// Brand View Modal Component - read-only display
interface BrandViewModalProps {
  brand: Brand;
  onClose: () => void;
  onEdit: () => void;
}

function BrandViewModal({ brand, onClose, onEdit }: BrandViewModalProps) {
  const DetailRow = ({ label, value }: { label: string; value: string | null | undefined }) => {
    if (!value) return null;
    return (
      <div className="flex justify-between py-2 border-b border-factory-border/50">
        <span className="text-neutral-400 text-sm">{label}</span>
        <span className="text-white text-sm">{value}</span>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-factory-dark rounded-2xl border border-factory-border w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-factory-border sticky top-0 bg-factory-dark z-10 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">Brand Details</h2>
            <p className="text-sm text-neutral-400 mt-1">Code: {brand.code}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
            brand.isActive
              ? 'bg-success/20 text-success'
              : 'bg-neutral-500/20 text-neutral-400'
          }`}>
            {brand.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>

        <div className="p-6 space-y-6">
          {/* Basic Info */}
          <div>
            <h3 className="text-sm font-medium text-primary-400 mb-3">Basic Information</h3>
            <div className="bg-factory-gray/30 rounded-xl p-4">
              <DetailRow label="Brand Name" value={brand.name} />
              <DetailRow label="Description" value={brand.description} />
            </div>
          </div>

          {/* Contact Information */}
          {(brand.phone || brand.email || brand.fax || brand.contactPerson) && (
            <div>
              <h3 className="text-sm font-medium text-primary-400 mb-3">Contact Information</h3>
              <div className="bg-factory-gray/30 rounded-xl p-4">
                <DetailRow label="Phone" value={brand.phone} />
                <DetailRow label="Email" value={brand.email} />
                <DetailRow label="Fax" value={brand.fax} />
                <DetailRow label="Contact Person" value={brand.contactPerson} />
              </div>
            </div>
          )}

          {/* Address */}
          {(brand.addressLine1 || brand.city || brand.country) && (
            <div>
              <h3 className="text-sm font-medium text-primary-400 mb-3">Address</h3>
              <div className="bg-factory-gray/30 rounded-xl p-4">
                <DetailRow label="Address Line 1" value={brand.addressLine1} />
                <DetailRow label="Address Line 2" value={brand.addressLine2} />
                <DetailRow label="City" value={brand.city} />
                <DetailRow label="State / Province" value={brand.stateProvince} />
                <DetailRow label="Postal Code" value={brand.postalCode} />
                <DetailRow label="Country" value={brand.country} />
              </div>
            </div>
          )}

          {/* Business Information */}
          {(brand.taxId || brand.registrationNumber || brand.website) && (
            <div>
              <h3 className="text-sm font-medium text-primary-400 mb-3">Business Information</h3>
              <div className="bg-factory-gray/30 rounded-xl p-4">
                <DetailRow label="Tax ID / VAT Number" value={brand.taxId} />
                <DetailRow label="Registration Number" value={brand.registrationNumber} />
                {brand.website && (
                  <div className="flex justify-between py-2 border-b border-factory-border/50">
                    <span className="text-neutral-400 text-sm">Website</span>
                    <a
                      href={brand.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-400 hover:underline text-sm"
                    >
                      {brand.website}
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Notes */}
          {brand.notes && (
            <div>
              <h3 className="text-sm font-medium text-primary-400 mb-3">Notes</h3>
              <div className="bg-factory-gray/30 rounded-xl p-4">
                <p className="text-white text-sm whitespace-pre-wrap">{brand.notes}</p>
              </div>
            </div>
          )}

          {/* Metadata */}
          <div>
            <h3 className="text-sm font-medium text-primary-400 mb-3">Record Information</h3>
            <div className="bg-factory-gray/30 rounded-xl p-4">
              <DetailRow label="Sort Order" value={brand.sortOrder?.toString()} />
              <DetailRow
                label="Created At"
                value={brand.createdAt ? new Date(brand.createdAt).toLocaleString() : undefined}
              />
              <DetailRow
                label="Updated At"
                value={brand.updatedAt ? new Date(brand.updatedAt).toLocaleString() : undefined}
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

// Brand Modal Component - moved outside to prevent recreation on every render
interface BrandModalProps {
  editing: Brand | null;
  onClose: () => void;
  onSave: () => void;
  showToast: (type: 'success' | 'error' | 'info', message: string) => void;
}

function BrandModal({ editing, onClose, onSave, showToast }: BrandModalProps) {
  const [formData, setFormData] = useState<BrandFormData>({
    name: editing?.name || '',
    description: editing?.description || '',
    // Contact Information
    phone: editing?.phone || '',
    email: editing?.email || '',
    fax: editing?.fax || '',
    contactPerson: editing?.contactPerson || '',
    // Address
    addressLine1: editing?.addressLine1 || '',
    addressLine2: editing?.addressLine2 || '',
    city: editing?.city || '',
    stateProvince: editing?.stateProvince || '',
    postalCode: editing?.postalCode || '',
    country: editing?.country || '',
    // Business
    taxId: editing?.taxId || '',
    registrationNumber: editing?.registrationNumber || '',
    website: editing?.website || '',
    // Other
    notes: editing?.notes || '',
    isActive: editing?.isActive ?? true,
    sortOrder: editing?.sortOrder ?? 0,
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate name is not empty
    if (!formData.name || formData.name.trim() === '') {
      showToast('error', 'Brand name is required');
      return;
    }

    setSaving(true);
    try {
      // Helper to convert empty strings to null
      const emptyToNull = (val: string | null | undefined): string | null => {
        if (val === undefined || val === null || val.trim() === '') return null;
        return val.trim();
      };
      // Helper for fields that don't accept null (only undefined)
      const emptyToUndefined = (val: string | null | undefined): string | undefined => {
        if (val === undefined || val === null || val.trim() === '') return undefined;
        return val.trim();
      };

      // Create clean payload - convert empty strings to null for optional fields
      const payload: BrandFormData = {
        name: formData.name.trim(),
        description: emptyToUndefined(formData.description),
        phone: emptyToNull(formData.phone),
        email: emptyToNull(formData.email),
        fax: emptyToNull(formData.fax),
        contactPerson: emptyToNull(formData.contactPerson),
        addressLine1: emptyToNull(formData.addressLine1),
        addressLine2: emptyToNull(formData.addressLine2),
        city: emptyToNull(formData.city),
        stateProvince: emptyToNull(formData.stateProvince),
        postalCode: emptyToNull(formData.postalCode),
        country: emptyToNull(formData.country) || undefined,
        taxId: emptyToNull(formData.taxId),
        registrationNumber: emptyToNull(formData.registrationNumber),
        website: emptyToNull(formData.website),
        notes: emptyToUndefined(formData.notes),
        isActive: formData.isActive,
        sortOrder: formData.sortOrder,
      };

      if (editing) {
        await brandsApi.update(editing.id, payload);
        showToast('success', 'Brand updated');
      } else {
        await brandsApi.create(payload);
        showToast('success', 'Brand created');
      }
      onSave();
    } catch (error: any) {
      showToast('error', error.response?.data?.error || 'Failed to save brand');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-factory-dark rounded-2xl border border-factory-border w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-factory-border sticky top-0 bg-factory-dark z-10">
          <h2 className="text-xl font-semibold text-white">
            {editing ? 'Edit Brand' : 'Add Brand'}
          </h2>
          {editing && (
            <p className="text-sm text-neutral-400 mt-1">Code: {editing.code}</p>
          )}
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Info */}
          <div>
            <h3 className="text-sm font-medium text-primary-400 mb-3">Basic Information</h3>
            <div className="space-y-4">
              <Input
                label="Brand Name *"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Brand name"
                required
              />
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                  Description
                </label>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={2}
                  className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Optional description..."
                />
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div>
            <h3 className="text-sm font-medium text-primary-400 mb-3">Contact Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Phone"
                type="tel"
                value={formData.phone || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value || null }))}
                placeholder="+92 300 1234567"
              />
              <Input
                label="Email"
                value={formData.email || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value || null }))}
                placeholder="contact@brand.com"
              />
              <Input
                label="Fax"
                value={formData.fax || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, fax: e.target.value || null }))}
                placeholder="+92 42 1234567"
              />
              <Input
                label="Contact Person"
                value={formData.contactPerson || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, contactPerson: e.target.value || null }))}
                placeholder="John Doe"
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <h3 className="text-sm font-medium text-primary-400 mb-3">Address</h3>
            <div className="space-y-4">
              <Input
                label="Address Line 1"
                value={formData.addressLine1 || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, addressLine1: e.target.value || null }))}
                placeholder="Street address"
              />
              <Input
                label="Address Line 2"
                value={formData.addressLine2 || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, addressLine2: e.target.value || null }))}
                placeholder="Suite, floor, building (optional)"
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="City"
                  value={formData.city || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value || null }))}
                  placeholder="Lahore"
                />
                <Input
                  label="State / Province"
                  value={formData.stateProvince || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, stateProvince: e.target.value || null }))}
                  placeholder="Punjab"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Postal Code"
                  value={formData.postalCode || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, postalCode: e.target.value || null }))}
                  placeholder="54000"
                />
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                    Country
                  </label>
                  <select
                    value={formData.country || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
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
              </div>
            </div>
          </div>

          {/* Business Information */}
          <div>
            <h3 className="text-sm font-medium text-primary-400 mb-3">Business Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Tax ID / VAT Number"
                value={formData.taxId || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, taxId: e.target.value || null }))}
                placeholder="NTN / GST Number"
              />
              <Input
                label="Registration Number"
                value={formData.registrationNumber || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, registrationNumber: e.target.value || null }))}
                placeholder="Business registration"
              />
            </div>
            <div className="mt-4">
              <Input
                label="Website"
                value={formData.website || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value || null }))}
                placeholder="https://example.com"
              />
            </div>
          </div>

          {/* Notes & Status */}
          <div>
            <h3 className="text-sm font-medium text-primary-400 mb-3">Notes & Status</h3>
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                Notes
              </label>
              <textarea
                value={formData.notes || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={2}
                className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Internal notes..."
              />
            </div>
            <div className="flex items-center gap-3 mt-4">
              <input
                type="checkbox"
                id="brand-active"
                checked={formData.isActive}
                onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                className="w-4 h-4"
              />
              <label htmlFor="brand-active" className="text-neutral-300">
                Active
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-factory-border">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
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
}

export default function BrandsPage() {
  const { showToast } = useToast();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('active');
  const [searchQuery, setSearchQuery] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Brand | null>(null);
  const [viewing, setViewing] = useState<Brand | null>(null);

  useEffect(() => {
    fetchBrands();
  }, []);

  const fetchBrands = async () => {
    setLoading(true);
    try {
      const data = await brandsApi.getAll();
      setBrands(data);
    } catch (error) {
      showToast('error', 'Failed to load brands');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this brand?')) return;
    try {
      await brandsApi.delete(id);
      showToast('success', 'Brand deleted');
      fetchBrands();
    } catch (error: any) {
      showToast('error', error.response?.data?.error || 'Failed to delete brand');
    }
  };

  const handleModalClose = () => {
    setShowModal(false);
    setEditing(null);
  };

  const handleModalSave = () => {
    setShowModal(false);
    setEditing(null);
    fetchBrands();
  };

  const filteredBrands = brands.filter((b) => {
    const matchesFilter =
      filter === 'all' ||
      (filter === 'active' && b.isActive) ||
      (filter === 'inactive' && !b.isActive);
    const matchesSearch =
      searchQuery === '' ||
      b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.code.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-neutral-400">
        <Link href="/settings" className="hover:text-white">
          Settings
        </Link>
        <span>/</span>
        <span className="text-white">Brands</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Brands</h1>
          <p className="text-neutral-400 mt-1">Manage product brands and manufacturers</p>
        </div>
        <Button onClick={() => setShowModal(true)}>+ Add Brand</Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <Input
          placeholder="Search brands..."
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
        ) : filteredBrands.length === 0 ? (
          <div className="text-center py-12 text-neutral-400">
            {brands.length === 0
              ? 'No brands yet. Add your first brand!'
              : 'No brands match your filters.'}
          </div>
        ) : (
          <div className="divide-y divide-factory-border">
            {filteredBrands.map((brand) => (
              <div
                key={brand.id}
                className="flex items-center justify-between p-4 hover:bg-factory-gray/50"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className="text-primary-400 font-mono text-sm">{brand.code}</span>
                    <span className="text-white font-medium">{brand.name}</span>
                    {brand.city && brand.country && (
                      <span className="px-2 py-0.5 bg-factory-border text-neutral-300 text-xs rounded">
                        {brand.city}, {brand.country}
                      </span>
                    )}
                    {!brand.city && brand.country && (
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
                  <div className="flex items-center gap-4 mt-1">
                    {brand.contactPerson && (
                      <span className="text-xs text-neutral-400">Contact: {brand.contactPerson}</span>
                    )}
                    {brand.phone && (
                      <span className="text-xs text-neutral-400">{brand.phone}</span>
                    )}
                    {brand.email && (
                      <span className="text-xs text-neutral-400">{brand.email}</span>
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
                    onClick={() => setViewing(brand)}
                  >
                    View
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditing(brand);
                      setShowModal(true);
                    }}
                  >
                    Edit
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(brand.id)}>
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* View Modal */}
      {viewing && (
        <BrandViewModal
          brand={viewing}
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
        <BrandModal
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
