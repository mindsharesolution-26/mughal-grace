'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { useToast } from '@/contexts/ToastContext';
import { CustomerFormData } from '@/lib/types/receivables';

export default function NewCustomerPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState<CustomerFormData>({
    code: '',
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    ntn: '',
    strn: '',
    creditLimit: 500000,
    paymentTerms: 30,
    openingBalance: 0,
    rating: 3,
    isActive: true,
    notes: '',
  });

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.code.trim()) {
      newErrors.code = 'Customer code is required';
    }
    if (!formData.name.trim()) {
      newErrors.name = 'Customer name is required';
    }
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    }
    if (formData.creditLimit < 0) {
      newErrors.creditLimit = 'Credit limit cannot be negative';
    }
    if (formData.paymentTerms < 0) {
      newErrors.paymentTerms = 'Payment terms cannot be negative';
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      // TODO: API call would go here
      await new Promise((resolve) => setTimeout(resolve, 1000));
      showToast('success', 'Customer created successfully!');
      router.push('/receivables/customers');
    } catch (error) {
      showToast('error', 'Failed to create customer');
    } finally {
      setIsSubmitting(false);
    }
  };

  const generateCode = () => {
    const prefix = formData.name
      .replace(/[^a-zA-Z]/g, '')
      .substring(0, 3)
      .toUpperCase() || 'CUS';
    const randomNum = Math.floor(Math.random() * 900) + 100;
    setFormData({ ...formData, code: `${prefix}-${randomNum}` });
  };

  const renderRating = () => (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => setFormData({ ...formData, rating: star })}
          className={`text-2xl ${star <= formData.rating ? 'text-yellow-400' : 'text-neutral-600'} hover:text-yellow-400 transition-colors`}
        >
          ★
        </button>
      ))}
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-sm">
          <Link href="/receivables" className="text-neutral-400 hover:text-white">
            Receivables
          </Link>
          <span className="text-neutral-600">/</span>
          <Link href="/receivables/customers" className="text-neutral-400 hover:text-white">
            Customers
          </Link>
          <span className="text-neutral-600">/</span>
          <span className="text-white">New</span>
        </div>
        <h1 className="text-2xl font-semibold text-white mt-2">Add New Customer</h1>
        <p className="text-neutral-400 mt-1">
          Create a new customer to track sales and receivables
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                Customer Code *
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g., CUST-001"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  className={`flex-1 px-4 py-2.5 rounded-xl bg-factory-gray border text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                    errors.code ? 'border-error' : 'border-factory-border'
                  }`}
                />
                <Button type="button" variant="secondary" onClick={generateCode}>
                  Generate
                </Button>
              </div>
              {errors.code && <p className="mt-1 text-xs text-error">{errors.code}</p>}
            </div>
            <div>
              <Input
                label="Customer Name *"
                placeholder="Enter customer name"
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
                placeholder="Primary contact name"
                value={formData.contactPerson}
                onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
              />
            </div>
            <div>
              <Input
                label="Phone *"
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
                placeholder="customer@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                error={errors.email}
              />
            </div>
            <div>
              <Input
                label="City"
                placeholder="e.g., Lahore"
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Input
                label="Credit Limit (PKR)"
                type="number"
                min="0"
                step="10000"
                value={formData.creditLimit}
                onChange={(e) => setFormData({ ...formData, creditLimit: parseInt(e.target.value) || 0 })}
                error={errors.creditLimit}
              />
              <p className="mt-1 text-xs text-neutral-500">Maximum credit allowed for this customer</p>
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
              <p className="mt-1 text-xs text-neutral-500">Number of days allowed for payment</p>
            </div>
            <div>
              <Input
                label="Opening Balance (PKR)"
                type="number"
                min="0"
                value={formData.openingBalance}
                onChange={(e) => setFormData({ ...formData, openingBalance: parseInt(e.target.value) || 0 })}
              />
              <p className="mt-1 text-xs text-neutral-500">Starting balance (if any)</p>
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

        {/* Additional Information */}
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Additional Information</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1.5">Rating</label>
              {renderRating()}
              <p className="mt-1 text-xs text-neutral-500">Rate this customer based on payment history and reliability</p>
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
                Customer is active
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1.5">Notes</label>
              <textarea
                rows={3}
                className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                placeholder="Additional notes about the customer (e.g., preferred delivery days, special requirements)..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Quick Summary */}
        <div className="bg-factory-gray rounded-2xl border border-factory-border p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Summary</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-xs text-neutral-400 uppercase tracking-wider">Code</p>
              <p className="text-lg font-semibold text-primary-400">{formData.code || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-neutral-400 uppercase tracking-wider">Credit Limit</p>
              <p className="text-lg font-semibold text-white">
                {new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', minimumFractionDigits: 0 }).format(formData.creditLimit)}
              </p>
            </div>
            <div>
              <p className="text-xs text-neutral-400 uppercase tracking-wider">Payment Terms</p>
              <p className="text-lg font-semibold text-white">{formData.paymentTerms} days</p>
            </div>
            <div>
              <p className="text-xs text-neutral-400 uppercase tracking-wider">Opening Balance</p>
              <p className="text-lg font-semibold text-white">
                {new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', minimumFractionDigits: 0 }).format(formData.openingBalance || 0)}
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Link href="/receivables/customers">
            <Button type="button" variant="secondary">Cancel</Button>
          </Link>
          <Button type="submit" isLoading={isSubmitting}>
            Create Customer
          </Button>
        </div>
      </form>
    </div>
  );
}
