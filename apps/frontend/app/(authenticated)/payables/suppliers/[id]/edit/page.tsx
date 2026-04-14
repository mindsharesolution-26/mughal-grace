'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { useToast } from '@/contexts/ToastContext';
import { suppliersApi, SupplierFormData, GeneralSupplier } from '@/lib/api/suppliers';
import {
  SupplierType,
  SUPPLIER_TYPES,
} from '@/lib/types/supplier';

export default function EditSupplierPage() {
  const router = useRouter();
  const params = useParams();
  const { showToast } = useToast();
  const supplierId = params.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loadError, setLoadError] = useState<string | null>(null);

  const [formData, setFormData] = useState<SupplierFormData>({
    code: '',
    name: '',
    supplierType: 'MATERIALS',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    ntn: '',
    strn: '',
    creditLimit: 100000,
    paymentTerms: 30,
    bankDetails: {
      bankName: '',
      accountTitle: '',
      accountNumber: '',
      branchCode: '',
      iban: '',
    },
    rating: 3,
    isActive: true,
    notes: '',
  });

  // Load existing supplier data
  useEffect(() => {
    const loadSupplier = async () => {
      try {
        setIsLoading(true);
        setLoadError(null);
        const supplier = await suppliersApi.getById(parseInt(supplierId));

        // Convert API response to form data
        setFormData({
          code: supplier.code,
          name: supplier.name,
          supplierType: supplier.supplierType || 'MATERIALS',
          contactPerson: supplier.contactPerson || '',
          phone: supplier.phone || '',
          email: supplier.email || '',
          address: supplier.address || '',
          city: supplier.city || '',
          ntn: supplier.ntn || '',
          strn: supplier.strn || '',
          creditLimit: supplier.creditLimit ? (typeof supplier.creditLimit === 'string' ? parseFloat(supplier.creditLimit) : supplier.creditLimit) : 0,
          paymentTerms: supplier.paymentTerms || 30,
          bankDetails: supplier.bankDetails || {
            bankName: '',
            accountTitle: '',
            accountNumber: '',
            branchCode: '',
            iban: '',
          },
          rating: supplier.rating || 3,
          isActive: supplier.isActive,
          notes: supplier.notes || '',
        });
      } catch (err: any) {
        console.error('Failed to load supplier:', err);
        setLoadError(err.response?.data?.message || 'Failed to load supplier');
      } finally {
        setIsLoading(false);
      }
    };

    loadSupplier();
  }, [supplierId]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Supplier name is required';
    }
    if (formData.creditLimit !== undefined && formData.creditLimit < 0) {
      newErrors.creditLimit = 'Credit limit cannot be negative';
    }
    if (formData.paymentTerms !== undefined && formData.paymentTerms < 0) {
      newErrors.paymentTerms = 'Payment terms cannot be negative';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      // Prepare update data (exclude code since it can't be changed)
      const updateData: Partial<SupplierFormData> = {
        name: formData.name,
        supplierType: formData.supplierType,
        contactPerson: formData.contactPerson || undefined,
        phone: formData.phone || undefined,
        email: formData.email || undefined,
        address: formData.address || undefined,
        city: formData.city || undefined,
        ntn: formData.ntn || undefined,
        strn: formData.strn || undefined,
        creditLimit: formData.creditLimit,
        paymentTerms: formData.paymentTerms,
        bankDetails: formData.bankDetails?.bankName ? formData.bankDetails : undefined,
        rating: formData.rating,
        notes: formData.notes || undefined,
        isActive: formData.isActive,
      };

      await suppliersApi.update(parseInt(supplierId), updateData);
      showToast('success', 'Supplier updated successfully!');
      router.push(`/payables/suppliers/${supplierId}`);
    } catch (error: any) {
      console.error('Failed to update supplier:', error);
      const message = error.response?.data?.message || 'Failed to update supplier';
      showToast('error', message);

      // Handle validation errors from API
      if (error.response?.data?.errors) {
        const apiErrors: Record<string, string> = {};
        error.response.data.errors.forEach((err: any) => {
          if (err.path && err.path[0]) {
            apiErrors[err.path[0]] = err.message;
          }
        });
        setErrors(apiErrors);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderRating = () => (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => setFormData({ ...formData, rating: star })}
          className={`text-2xl ${star <= (formData.rating || 0) ? 'text-yellow-400' : 'text-neutral-600'} hover:text-yellow-400 transition-colors`}
        >
          ★
        </button>
      ))}
    </div>
  );

  // Loading state
  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-factory-gray rounded w-1/3 mb-4" />
          <div className="h-4 bg-factory-gray rounded w-1/2 mb-8" />
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-factory-dark rounded-2xl border border-factory-border p-6 mb-6">
              <div className="h-6 bg-factory-gray rounded w-1/4 mb-4" />
              <div className="grid grid-cols-2 gap-4">
                <div className="h-10 bg-factory-gray rounded" />
                <div className="h-10 bg-factory-gray rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (loadError) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-error mb-4">{loadError}</p>
          <Link href="/payables/suppliers">
            <Button>Back to Suppliers</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-sm">
          <Link href="/payables" className="text-neutral-400 hover:text-white">
            Payables
          </Link>
          <span className="text-neutral-600">/</span>
          <Link href="/payables/suppliers" className="text-neutral-400 hover:text-white">
            Suppliers
          </Link>
          <span className="text-neutral-600">/</span>
          <Link href={`/payables/suppliers/${supplierId}`} className="text-neutral-400 hover:text-white">
            {formData.code}
          </Link>
          <span className="text-neutral-600">/</span>
          <span className="text-white">Edit</span>
        </div>
        <h1 className="text-2xl font-semibold text-white mt-2">Edit Supplier</h1>
        <p className="text-neutral-400 mt-1">
          Update supplier details
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Input
                label="Supplier Code"
                value={formData.code}
                disabled
                className="opacity-50 cursor-not-allowed"
              />
              <p className="text-xs text-neutral-500 mt-1">Code cannot be changed</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                Supplier Type *
              </label>
              <select
                value={formData.supplierType}
                onChange={(e) => setFormData({ ...formData, supplierType: e.target.value as SupplierType })}
                className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {Object.values(SUPPLIER_TYPES).map((type) => (
                  <option key={type.code} value={type.code}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <Input
                label="Supplier Name *"
                placeholder="Enter supplier name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                error={errors.name}
              />
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Contact Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Input
                label="Contact Person"
                placeholder="Enter contact person name"
                value={formData.contactPerson}
                onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                error={errors.contactPerson}
              />
            </div>
            <div>
              <Input
                label="Phone"
                placeholder="e.g., 0300-1234567"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                error={errors.phone}
              />
            </div>
            <div>
              <Input
                label="Email"
                type="email"
                placeholder="supplier@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div>
              <Input
                label="City"
                placeholder="e.g., Faisalabad"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              />
            </div>
            <div className="md:col-span-2">
              <Input
                label="Address"
                placeholder="Enter full address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Financial Information */}
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Financial Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Input
                label="Credit Limit (PKR)"
                type="number"
                min="0"
                value={formData.creditLimit}
                onChange={(e) => setFormData({ ...formData, creditLimit: parseInt(e.target.value) || 0 })}
                error={errors.creditLimit}
              />
            </div>
            <div>
              <Input
                label="Payment Terms (Days)"
                type="number"
                min="0"
                value={formData.paymentTerms}
                onChange={(e) => setFormData({ ...formData, paymentTerms: parseInt(e.target.value) || 0 })}
                error={errors.paymentTerms}
              />
            </div>
          </div>
        </div>

        {/* Tax Information */}
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Tax Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Input
                label="NTN (National Tax Number)"
                placeholder="e.g., 1234567-8"
                value={formData.ntn}
                onChange={(e) => setFormData({ ...formData, ntn: e.target.value })}
              />
            </div>
            <div>
              <Input
                label="STRN (Sales Tax Registration)"
                placeholder="e.g., STR-9876543"
                value={formData.strn}
                onChange={(e) => setFormData({ ...formData, strn: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Bank Details */}
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Bank Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Input
                label="Bank Name"
                placeholder="e.g., HBL"
                value={formData.bankDetails?.bankName}
                onChange={(e) => setFormData({
                  ...formData,
                  bankDetails: { ...formData.bankDetails!, bankName: e.target.value }
                })}
              />
            </div>
            <div>
              <Input
                label="Account Title"
                placeholder="Account holder name"
                value={formData.bankDetails?.accountTitle}
                onChange={(e) => setFormData({
                  ...formData,
                  bankDetails: { ...formData.bankDetails!, accountTitle: e.target.value }
                })}
              />
            </div>
            <div>
              <Input
                label="Account Number"
                placeholder="Enter account number"
                value={formData.bankDetails?.accountNumber}
                onChange={(e) => setFormData({
                  ...formData,
                  bankDetails: { ...formData.bankDetails!, accountNumber: e.target.value }
                })}
              />
            </div>
            <div>
              <Input
                label="Branch Code"
                placeholder="e.g., 0045"
                value={formData.bankDetails?.branchCode}
                onChange={(e) => setFormData({
                  ...formData,
                  bankDetails: { ...formData.bankDetails!, branchCode: e.target.value }
                })}
              />
            </div>
            <div className="md:col-span-2">
              <Input
                label="IBAN"
                placeholder="e.g., PK36HABB0000000000000000"
                value={formData.bankDetails?.iban}
                onChange={(e) => setFormData({
                  ...formData,
                  bankDetails: { ...formData.bankDetails!, iban: e.target.value }
                })}
              />
            </div>
          </div>
        </div>

        {/* Additional Information */}
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Additional Information</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1.5">Rating</label>
              {renderRating()}
            </div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="w-4 h-4 rounded border-factory-border bg-factory-gray text-primary-500 focus:ring-primary-500"
              />
              <label htmlFor="isActive" className="text-sm text-neutral-300">
                Supplier is active
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1.5">Notes</label>
              <textarea
                rows={3}
                className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                placeholder="Additional notes about the supplier..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Link href={`/payables/suppliers/${supplierId}`}>
            <Button type="button" variant="secondary">Cancel</Button>
          </Link>
          <Button type="submit" isLoading={isSubmitting}>
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
}
