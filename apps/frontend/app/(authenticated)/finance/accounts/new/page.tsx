'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { useToast } from '@/contexts/ToastContext';
import {
  accountsApi,
  AccountLookup,
  ACCOUNT_TYPES,
  ACCOUNT_GROUPS,
  CONTROLLED_ENTITIES,
  AccountGroup,
  AccountType,
  getAccountTypesByGroup,
} from '@/lib/api/accounts';
import { Loader2 } from 'lucide-react';

// Form validation schema
const accountSchema = z.object({
  code: z.string().min(1, 'Account code is required'),
  name: z.string().min(2, 'Account name is required'),
  nameUrdu: z.string().optional(),
  accountType: z.string().min(1, 'Account type is required'),
  accountGroup: z.string().min(1, 'Account group is required'),
  parentId: z.coerce.number().optional().nullable(),
  isHeader: z.boolean().default(false),
  normalBalance: z.enum(['DEBIT', 'CREDIT']).optional(),
  currency: z.string().default('PKR'),
  isControlAccount: z.boolean().default(false),
  controlledEntity: z.string().optional().nullable(),
  openingBalance: z.coerce.number().default(0),
  isBankAccount: z.boolean().default(false),
  bankName: z.string().optional(),
  accountNumber: z.string().optional(),
  accountTitle: z.string().optional(),
  branchCode: z.string().optional(),
  iban: z.string().optional(),
  description: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().default(true),
});

type AccountForm = z.infer<typeof accountSchema>;

export default function NewAccountPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [parentAccounts, setParentAccounts] = useState<AccountLookup[]>([]);
  const [loadingParents, setLoadingParents] = useState(true);

  const presetParentId = searchParams.get('parentId');

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<AccountForm>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      code: '',
      name: '',
      nameUrdu: '',
      accountType: '',
      accountGroup: 'ASSETS',
      parentId: presetParentId ? parseInt(presetParentId) : null,
      isHeader: false,
      normalBalance: 'DEBIT',
      currency: 'PKR',
      isControlAccount: false,
      controlledEntity: null,
      openingBalance: 0,
      isBankAccount: false,
      bankName: '',
      accountNumber: '',
      accountTitle: '',
      branchCode: '',
      iban: '',
      description: '',
      notes: '',
      isActive: true,
    },
  });

  const watchedGroup = watch('accountGroup') as AccountGroup;
  const watchedIsHeader = watch('isHeader');
  const watchedIsControlAccount = watch('isControlAccount');
  const watchedIsBankAccount = watch('isBankAccount');
  const watchedAccountType = watch('accountType');

  // Load parent accounts (header accounts only)
  useEffect(() => {
    const loadParentAccounts = async () => {
      try {
        const data = await accountsApi.getLookup({ excludeHeaders: false });
        // Filter only header accounts
        setParentAccounts(data.filter((a) => a.isHeader));
      } catch (err) {
        console.error('Failed to load parent accounts', err);
      } finally {
        setLoadingParents(false);
      }
    };
    loadParentAccounts();
  }, []);

  // Set default normal balance based on account group
  useEffect(() => {
    if (watchedGroup) {
      const defaultBalance =
        watchedGroup === 'ASSETS' || watchedGroup === 'EXPENSE' ? 'DEBIT' : 'CREDIT';
      setValue('normalBalance', defaultBalance);

      // Reset account type when group changes
      setValue('accountType', '');
    }
  }, [watchedGroup, setValue]);

  // Auto-set isBankAccount when BANK type is selected
  useEffect(() => {
    if (watchedAccountType === 'BANK') {
      setValue('isBankAccount', true);
    }
  }, [watchedAccountType, setValue]);

  // Filter parent accounts by selected group
  const filteredParentAccounts = parentAccounts.filter(
    (a) => a.accountGroup === watchedGroup
  );

  // Get account types for selected group
  const availableAccountTypes = getAccountTypesByGroup(watchedGroup);

  const onSubmit = async (data: AccountForm) => {
    setIsLoading(true);
    try {
      // Build bank details if bank account
      const bankDetails =
        data.isBankAccount &&
        (data.bankName || data.accountNumber || data.iban)
          ? {
              bankName: data.bankName || undefined,
              accountNumber: data.accountNumber || undefined,
              accountTitle: data.accountTitle || undefined,
              branchCode: data.branchCode || undefined,
              iban: data.iban || undefined,
            }
          : null;

      await accountsApi.create({
        code: data.code,
        name: data.name,
        nameUrdu: data.nameUrdu || undefined,
        accountType: data.accountType as AccountType,
        accountGroup: data.accountGroup as AccountGroup,
        parentId: data.parentId || null,
        isHeader: data.isHeader,
        normalBalance: data.normalBalance,
        currency: data.currency,
        isControlAccount: data.isControlAccount,
        controlledEntity: data.isControlAccount && data.controlledEntity
          ? (data.controlledEntity as any)
          : null,
        openingBalance: data.openingBalance,
        isBankAccount: data.isBankAccount,
        bankDetails,
        description: data.description || undefined,
        notes: data.notes || undefined,
        isActive: data.isActive,
      });

      showToast('success', `Account "${data.name}" created successfully!`);
      router.push('/finance/accounts');
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to create account';
      showToast('error', message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm">
            <Link href="/finance" className="text-neutral-400 hover:text-white">
              Finance
            </Link>
            <span className="text-neutral-600">/</span>
            <Link href="/finance/accounts" className="text-neutral-400 hover:text-white">
              Chart of Accounts
            </Link>
            <span className="text-neutral-600">/</span>
            <span className="text-white">New</span>
          </div>
          <h1 className="text-2xl font-semibold text-white mt-2">Add New Account</h1>
          <p className="text-neutral-400 mt-1">
            Create a new account in your chart of accounts
          </p>
        </div>
        <Button variant="ghost" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Account Group & Type */}
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Account Classification</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Account Group */}
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                Account Group *
              </label>
              <select
                {...register('accountGroup')}
                className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {ACCOUNT_GROUPS.map((group) => (
                  <option key={group.value} value={group.value}>
                    {group.label}
                  </option>
                ))}
              </select>
              {errors.accountGroup && (
                <p className="text-error text-sm mt-1">{errors.accountGroup.message}</p>
              )}
            </div>

            {/* Account Type */}
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                Account Type *
              </label>
              <select
                {...register('accountType')}
                className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Select type...</option>
                {availableAccountTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              {errors.accountType && (
                <p className="text-error text-sm mt-1">{errors.accountType.message}</p>
              )}
            </div>

            {/* Parent Account */}
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                Parent Account (Optional)
              </label>
              <select
                {...register('parentId')}
                disabled={loadingParents}
                className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
              >
                <option value="">No Parent (Root Level)</option>
                {filteredParentAccounts.map((parent) => (
                  <option key={parent.id} value={parent.id}>
                    {parent.code} - {parent.name}
                  </option>
                ))}
              </select>
              <p className="text-sm text-neutral-500 mt-1">
                Select a header account to nest this under
              </p>
            </div>

            {/* Normal Balance */}
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                Normal Balance
              </label>
              <select
                {...register('normalBalance')}
                className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="DEBIT">Debit</option>
                <option value="CREDIT">Credit</option>
              </select>
              <p className="text-sm text-neutral-500 mt-1">
                Auto-set based on account group
              </p>
            </div>
          </div>

          {/* Is Header Toggle */}
          <div className="mt-4 pt-4 border-t border-factory-border">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="w-5 h-5 rounded border-factory-border bg-factory-gray text-primary-500 focus:ring-primary-500"
                {...register('isHeader')}
              />
              <div>
                <span className="text-white font-medium">This is a Header Account</span>
                <p className="text-sm text-neutral-500">
                  Header accounts are group headings that cannot have transactions
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Basic Information */}
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Account Information</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Account Code */}
            <Input
              label="Account Code *"
              placeholder="e.g., 1100, 2100-001"
              error={errors.code?.message}
              {...register('code')}
            />

            {/* Account Name */}
            <Input
              label="Account Name *"
              placeholder="e.g., Cash in Hand"
              error={errors.name?.message}
              {...register('name')}
            />

            {/* Account Name (Urdu) */}
            <Input
              label="Account Name (Urdu)"
              placeholder="e.g., نقد رقم"
              className="text-right"
              dir="rtl"
              {...register('nameUrdu')}
            />

            {/* Currency */}
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                Currency
              </label>
              <select
                {...register('currency')}
                className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="PKR">PKR - Pakistani Rupee</option>
                <option value="USD">USD - US Dollar</option>
                <option value="EUR">EUR - Euro</option>
                <option value="GBP">GBP - British Pound</option>
              </select>
            </div>

            {/* Opening Balance (only for non-header accounts) */}
            {!watchedIsHeader && (
              <Input
                label="Opening Balance"
                type="number"
                placeholder="0"
                error={errors.openingBalance?.message}
                {...register('openingBalance')}
              />
            )}
          </div>
        </div>

        {/* Control Account Settings */}
        {!watchedIsHeader && (
          <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Control Account Settings</h2>

            <div className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-5 h-5 rounded border-factory-border bg-factory-gray text-primary-500 focus:ring-primary-500"
                  {...register('isControlAccount')}
                />
                <div>
                  <span className="text-white font-medium">This is a Control Account</span>
                  <p className="text-sm text-neutral-500">
                    Control accounts link to entities like customers or vendors
                  </p>
                </div>
              </label>

              {watchedIsControlAccount && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                    Controlled Entity
                  </label>
                  <select
                    {...register('controlledEntity')}
                    className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Select entity...</option>
                    {CONTROLLED_ENTITIES.map((entity) => (
                      <option key={entity.value} value={entity.value}>
                        {entity.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Bank Account Details */}
        {!watchedIsHeader && (
          <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Bank Account Details</h2>

            <div className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-5 h-5 rounded border-factory-border bg-factory-gray text-primary-500 focus:ring-primary-500"
                  {...register('isBankAccount')}
                />
                <div>
                  <span className="text-white font-medium">This is a Bank Account</span>
                  <p className="text-sm text-neutral-500">
                    Enable to add bank-specific information
                  </p>
                </div>
              </label>

              {watchedIsBankAccount && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-factory-border">
                  <Input
                    label="Bank Name"
                    placeholder="e.g., HBL, MCB, UBL"
                    {...register('bankName')}
                  />
                  <Input
                    label="Account Number"
                    placeholder="Account number"
                    {...register('accountNumber')}
                  />
                  <Input
                    label="Account Title"
                    placeholder="Name on account"
                    {...register('accountTitle')}
                  />
                  <Input
                    label="Branch Code"
                    placeholder="Branch code"
                    {...register('branchCode')}
                  />
                  <div className="md:col-span-2">
                    <Input
                      label="IBAN"
                      placeholder="PK00XXXX0000000000000000"
                      {...register('iban')}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Additional Information */}
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Additional Information</h2>

          <div className="space-y-4">
            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                Description
              </label>
              <textarea
                {...register('description')}
                rows={2}
                className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Brief description of this account's purpose..."
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                Notes
              </label>
              <textarea
                {...register('notes')}
                rows={2}
                className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Any additional notes..."
              />
            </div>

            {/* Active Status */}
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="w-5 h-5 rounded border-factory-border bg-factory-gray text-primary-500 focus:ring-primary-500"
                {...register('isActive')}
              />
              <span className="text-white">Account is Active</span>
            </label>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Account'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
