'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { customersApi } from '@/lib/api/customers';
import { Customer, CustomerFormData, CustomerType, customerTypeLabels } from '@/lib/types/customer';
import { Loader2, ArrowLeft } from 'lucide-react';

export default function EditCustomerPage() {
  const params = useParams();
  const router = useRouter();
  const customerId = Number(params.id);

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<CustomerFormData>({
    name: '',
    businessName: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    ntn: '',
    strn: '',
    creditLimit: undefined,
    paymentTerms: 30,
    customerType: 'REGULAR',
    isActive: true,
  });

  useEffect(() => {
    loadCustomer();
  }, [customerId]);

  const loadCustomer = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await customersApi.getById(customerId);
      setCustomer(data);
      setFormData({
        name: data.name,
        businessName: data.businessName || '',
        contactPerson: data.contactPerson || '',
        phone: data.phone || '',
        email: data.email || '',
        address: data.address || '',
        city: data.city || '',
        ntn: data.ntn || '',
        strn: data.strn || '',
        creditLimit: data.creditLimit ? parseFloat(data.creditLimit) : undefined,
        paymentTerms: data.paymentTerms,
        customerType: data.customerType,
        isActive: data.isActive,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to load customer');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'number' ? (value ? parseFloat(value) : undefined) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      await customersApi.update(customerId, formData);
      router.push(`/finance/customers/${customerId}`);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to update customer');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="text-center py-12">
        <p className="text-error mb-4">{error || 'Customer not found'}</p>
        <Link href="/finance/customers">
          <Button>Back to Customers</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-sm mb-4">
          <Link href="/finance" className="text-neutral-400 hover:text-white">
            Finance
          </Link>
          <span className="text-neutral-600">/</span>
          <Link href="/finance/customers" className="text-neutral-400 hover:text-white">
            Customers
          </Link>
          <span className="text-neutral-600">/</span>
          <Link href={`/finance/customers/${customerId}`} className="text-neutral-400 hover:text-white">
            {customer.code}
          </Link>
          <span className="text-neutral-600">/</span>
          <span className="text-white">Edit</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href={`/finance/customers/${customerId}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold text-white">Edit Customer</h1>
            <p className="text-neutral-400 mt-1">
              Update customer information for {customer.name}
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-error/10 border border-error/20 rounded-xl p-4 text-error">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-2">
                Customer Code
              </label>
              <Input
                value={customer.code}
                disabled
                className="bg-factory-gray/50 cursor-not-allowed"
              />
              <p className="text-xs text-neutral-500 mt-1">Code cannot be changed</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-2">
                Customer Name *
              </label>
              <Input
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter customer name"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-2">
                Business Name
              </label>
              <Input
                name="businessName"
                value={formData.businessName}
                onChange={handleChange}
                placeholder="Enter business/company name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-2">
                Customer Type
              </label>
              <select
                name="customerType"
                value={formData.customerType}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {Object.entries(customerTypeLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-2">
                Contact Person
              </label>
              <Input
                name="contactPerson"
                value={formData.contactPerson}
                onChange={handleChange}
                placeholder="Primary contact name"
              />
            </div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="isActive"
                name="isActive"
                checked={formData.isActive}
                onChange={handleChange}
                className="w-5 h-5 rounded border-factory-border bg-factory-gray text-primary-500 focus:ring-primary-500"
              />
              <label htmlFor="isActive" className="text-sm font-medium text-neutral-300">
                Customer is Active
              </label>
            </div>
          </div>
        </div>

        {/* Contact Details */}
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Contact Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-2">
                Phone Number
              </label>
              <Input
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="e.g., 0300-1234567"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-2">
                Email
              </label>
              <Input
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="customer@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-2">
                City
              </label>
              <Input
                name="city"
                value={formData.city}
                onChange={handleChange}
                placeholder="e.g., Lahore, Karachi"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-neutral-400 mb-2">
                Address
              </label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="Full address"
                rows={2}
                className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              />
            </div>
          </div>
        </div>

        {/* Financial Information */}
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Financial Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-2">
                Credit Limit (PKR)
              </label>
              <Input
                name="creditLimit"
                type="number"
                value={formData.creditLimit || ''}
                onChange={handleChange}
                placeholder="0"
                min={0}
              />
              <p className="text-xs text-neutral-500 mt-1">
                Maximum outstanding balance allowed
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-2">
                Payment Terms (Days)
              </label>
              <Input
                name="paymentTerms"
                type="number"
                value={formData.paymentTerms || ''}
                onChange={handleChange}
                placeholder="30"
                min={0}
              />
              <p className="text-xs text-neutral-500 mt-1">
                Days allowed for payment after sale
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-2">
                NTN (Tax Number)
              </label>
              <Input
                name="ntn"
                value={formData.ntn}
                onChange={handleChange}
                placeholder="National Tax Number"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-2">
                STRN (Sales Tax)
              </label>
              <Input
                name="strn"
                value={formData.strn}
                onChange={handleChange}
                placeholder="Sales Tax Registration Number"
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-4">
          <Link href={`/finance/customers/${customerId}`}>
            <Button variant="secondary" type="button">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Update Customer
          </Button>
        </div>
      </form>
    </div>
  );
}
