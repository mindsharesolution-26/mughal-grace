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
import { usersApi } from '@/lib/api/users';
import {
  User,
  UserRole,
  assignableRoles,
  roleLabels,
  roleDescriptions,
} from '@/lib/types/user';

const updateUserSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters').max(100),
  phone: z.string().max(20).optional(),
  role: z.enum(['MANAGER', 'SUPERVISOR', 'OPERATOR', 'ACCOUNTANT', 'VIEWER'] as const),
  isActive: z.boolean(),
});

type UpdateUserForm = z.infer<typeof updateUserSchema>;

export default function EditUserPage() {
  const router = useRouter();
  const params = useParams();
  const userId = Number(params.id);
  const { showToast } = useToast();

  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<UpdateUserForm>({
    resolver: zodResolver(updateUserSchema),
  });

  const selectedRole = watch('role');

  useEffect(() => {
    fetchUser();
  }, [userId]);

  const fetchUser = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await usersApi.getById(userId);
      setUser(data);

      // Pre-populate form
      reset({
        fullName: data.fullName,
        phone: data.phone || '',
        role: data.role as UpdateUserForm['role'],
        isActive: data.isActive,
      });
    } catch (err: any) {
      const message = err.response?.data?.error || 'Failed to load user';
      setError(message);
      showToast('error', message);
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: UpdateUserForm) => {
    setIsSaving(true);
    try {
      await usersApi.update(userId, {
        fullName: data.fullName,
        phone: data.phone || null,
        role: data.role as UserRole,
        isActive: data.isActive,
      });
      showToast('success', 'User updated successfully!');
      router.push(`/users/${userId}`);
    } catch (err: any) {
      const message = err.response?.data?.error || 'Failed to update user';
      showToast('error', message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
        <span className="ml-3 text-neutral-400">Loading user...</span>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="space-y-6">
        <div className="bg-error/10 border border-error/20 rounded-xl p-6 text-center">
          <span className="text-error text-4xl block mb-3">!</span>
          <p className="text-error mb-4">{error || 'User not found'}</p>
          <Button variant="secondary" onClick={() => router.push('/users')}>
            Back to Users
          </Button>
        </div>
      </div>
    );
  }

  const isFactoryOwner = user.role === 'FACTORY_OWNER';

  // Factory Owner cannot be edited
  if (isFactoryOwner) {
    return (
      <div className="space-y-6 max-w-2xl">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm">
              <Link href="/users" className="text-neutral-400 hover:text-white">
                Users
              </Link>
              <span className="text-neutral-600">/</span>
              <Link href={`/users/${userId}`} className="text-neutral-400 hover:text-white">
                {user.fullName}
              </Link>
              <span className="text-neutral-600">/</span>
              <span className="text-white">Edit</span>
            </div>
            <h1 className="text-2xl font-semibold text-white mt-2">Edit User</h1>
          </div>
        </div>

        <div className="bg-warning/10 border border-warning/20 rounded-xl p-6 text-center">
          <span className="text-warning text-4xl block mb-3">!</span>
          <p className="text-warning mb-4">Factory Owner accounts cannot be modified.</p>
          <Button variant="secondary" onClick={() => router.push(`/users/${userId}`)}>
            View User
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm">
            <Link href="/users" className="text-neutral-400 hover:text-white">
              Users
            </Link>
            <span className="text-neutral-600">/</span>
            <Link href={`/users/${userId}`} className="text-neutral-400 hover:text-white">
              {user.fullName}
            </Link>
            <span className="text-neutral-600">/</span>
            <span className="text-white">Edit</span>
          </div>
          <h1 className="text-2xl font-semibold text-white mt-2">Edit User</h1>
        </div>
        <Button variant="ghost" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Account Information (Read-only) */}
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
          <h2 className="text-lg font-semibold text-white mb-4">
            Account Information
            <span className="text-sm font-normal text-neutral-500 ml-2">(Read-only)</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                Email
              </label>
              <div className="px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-neutral-400">
                {user.email}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                Username
              </label>
              <div className="px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-neutral-400">
                {user.username}
              </div>
            </div>
          </div>
        </div>

        {/* Personal Information */}
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
          <h2 className="text-lg font-semibold text-white mb-4">
            Personal Information
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Full Name *"
              placeholder="John Doe"
              error={errors.fullName?.message}
              {...register('fullName')}
            />

            <Input
              label="Phone"
              placeholder="+92 300 1234567"
              error={errors.phone?.message}
              {...register('phone')}
            />
          </div>
        </div>

        {/* Role Selection */}
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Role & Access</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-3">
                Select Role *
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {assignableRoles.map((role) => (
                  <label
                    key={role}
                    className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-colors ${
                      selectedRole === role
                        ? 'border-primary-500 bg-primary-500/10'
                        : 'border-factory-border bg-factory-gray hover:border-neutral-500'
                    }`}
                  >
                    <input
                      type="radio"
                      value={role}
                      {...register('role')}
                      className="mt-1"
                    />
                    <div>
                      <p className="text-white font-medium">{roleLabels[role]}</p>
                      <p className="text-sm text-neutral-400 mt-0.5">
                        {roleDescriptions[role]}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
              {errors.role && (
                <p className="text-sm text-error mt-2">{errors.role.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Status */}
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Status</h2>
              <p className="text-sm text-neutral-400">
                Active users can log in and access the system
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                {...register('isActive')}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-factory-gray rounded-full peer peer-checked:bg-primary-500 peer-focus:ring-2 peer-focus:ring-primary-500/50 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
            </label>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  );
}
