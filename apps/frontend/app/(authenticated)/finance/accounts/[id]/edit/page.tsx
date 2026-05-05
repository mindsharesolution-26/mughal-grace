'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { useToast } from '@/contexts/ToastContext';
import {
  accountsApi,
  ChartOfAccount,
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

export default function EditAccountPage() {
  const router = useRouter();
  const params = useParams();
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [account, setAccount] = useState<ChartOfAccount | null>(null);
  const [parentAccounts, setParentAccounts] = useState<AccountLookup[]>([]);

  const accountId = parseInt(params.id as string);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<AccountForm>({
    resolver: zodResolver(accountSchema),
  });

  const watchedGroup = watch('accountGroup') as AccountGroup;
  const watchedIsHeader = watch('isHeader');
  const watchedIsControlAccount = watch('isControlAccount');
  const watchedIsBankAccount = watch('isBankAccount');

  // Load account and parent accounts
  useEffect(() => {
    const loadData = async () => {
      try {
        const [accountData, parentData] = await Promise.all([
          accountsApi.getById(accountId),
          accountsApi.getLookup({ excludeHeaders: false }),
        ]);

        setAccount(accountData);
        // Filter only header accounts, excluding current account
        setParentAccounts(parentData.filter((a) => a.isHeader && a.id !== accountId));

        // Set form values
        reset({
          code: accountData.code,
          name: accountData.name,
          nameUrdu: accountData.nameUrdu || '',
          accountType: accountData.accountType,
          accountGroup: accountData.accountGroup,
          parentId: accountData.parentId,
          isHeader: accountData.isHeader,
          normalBalance: accountData.normalBalance,
          currency: accountData.currency,
          isControlAccount: accountData.isControlAccount,
          controlledEntity: accountData.controlledEntity,
          isBankAccount: accountData.isBankAccount,
          bankName: accountData.bankDetails?.bankName || '',
          accountNumber: accountData.bankDetails?.accountNumber || '',
          accountTitle: accountData.bankDetails?.accountTitle || '',
          branchCode: accountData.bankDetails?.branchCode || '',
          iban: accountData.bankDetails?.iban || '',
          description: accountData.description || '',
          notes: accountData.notes || '',
          isActive: accountData.isActive,
        });
      } catch (err: any) {
        showToast('error', 'Failed to load account');
        router.push('/finance/accounts');
      } finally {
        setIsFetching(false);
      }
    };
    loadData();
  }, [accountId, reset, router, showToast]);

  // Filter parent accounts by selected group
  const filteredParentAccounts = parentAccounts.filter(
    (a) => a.accountGroup === watchedGroup
  );

  // Get account types for selected group
  const availableAccountTypes = watchedGroup ? getAccountTypesByGroup(watchedGroup) : [];

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

      await accountsApi.update(accountId, {
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
        isBankAccount: data.isBankAccount,
        bankDetails,
        description: data.description || undefined,
        notes: data.notes || undefined,
        isActive: data.isActive,
      });

      showToast('success', `Account "${data.name}" updated successfully!`);
      router.push('/finance/accounts');
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to update account';
      showToast('error', message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
      </div>
    );
  }

  if (!account) {
    return (
      <div className="text-center py-12">
        <p className="text-neutral-400">Account not found</p>
        <Link href="/finance/accounts">
          <Button className="mt-4">Back to Accounts</Button>
        </Link>
      </div>
    );
  }

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
            <span className="text-white">Edit</span>
          </div>
          <h1 className="text-2xl font-semibold text-white mt-2">Edit Account</h1>
          <p className="text-neutral-400 mt-1">
            {account.code} - {account.name}
          </p>
        </div>
        <Button variant="ghost" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>

      {/* System Account Warning */}
      {account.isSystemAccount && (
        <div className="bg-warning/10 border border-warning/20 rounded-xl p-4 text-warning">
          This is a system account and has limited editing capabilities.
        </div>
      )}

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
                disabled={account.isSystemAccount}
                className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
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
                disabled={account.isSystemAccount}
                className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
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
                className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
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
            </div>
          </div>

          {/* Is Header Toggle */}
          <div className="mt-4 pt-4 border-t border-factory-border">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                disabled={account.isSystemAccount}
                className="w-5 h-5 rounded border-factory-border bg-factory-gray text-primary-500 focus:ring-primary-500 disabled:opacity-50"
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
              disabled={account.isSystemAccount}
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
          </div>

          {/* Balance Display (Read-only) */}
          <div className="mt-4 pt-4 border-t border-factory-border grid grid-cols-2 gap-4">
            <div className="bg-factory-gray rounded-xl p-4">
              <p className="text-sm text-neutral-400 mb-1">Opening Balance</p>
              <p className="text-xl font-semibold text-white">
                {account.currency} {account.openingBalance.toLocaleString()}
              </p>
            </div>
            <div className="bg-factory-gray rounded-xl p-4">
              <p className="text-sm text-neutral-400 mb-1">Current Balance</p>
              <p
                className={`text-xl font-semibold ${
                  account.currentBalance >= 0 ? 'text-success' : 'text-error'
                }`}
              >
                {account.currency} {Math.abs(account.currentBalance).toLocaleString()}
                {account.currentBalance < 0 && ' Cr'}
              </p>
            </div>
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
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
