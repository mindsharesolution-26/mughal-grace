'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { useToast } from '@/contexts/ToastContext';
import { usersApi } from '@/lib/api/users';
import {
  UserRole,
  assignableRoles,
  roleLabels,
  roleDescriptions,
} from '@/lib/types/user';

const createUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(8, 'Please confirm password'),
  username: z.string().min(3, 'Username must be at least 3 characters').max(50),
  fullName: z.string().min(2, 'Full name must be at least 2 characters').max(100),
  phone: z.string().max(20).optional(),
  role: z.enum(['MANAGER', 'SUPERVISOR', 'OPERATOR', 'ACCOUNTANT', 'VIEWER'] as const),
  isActive: z.boolean(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type CreateUserForm = z.infer<typeof createUserSchema>;

export default function NewUserPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CreateUserForm>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      username: '',
      fullName: '',
      phone: '',
      role: 'OPERATOR',
      isActive: true,
    },
  });

  const selectedRole = watch('role');

  const onSubmit = async (data: CreateUserForm) => {
    setIsLoading(true);
    try {
      await usersApi.create({
        email: data.email,
        password: data.password,
        username: data.username,
        fullName: data.fullName,
        phone: data.phone || undefined,
        role: data.role as UserRole,
        isActive: data.isActive,
      });
      showToast('success', 'User created successfully!');
      router.push('/users');
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to create user';
      showToast('error', message);
    } finally {
      setIsLoading(false);
    }
  };

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
            <span className="text-white">New</span>
          </div>
          <h1 className="text-2xl font-semibold text-white mt-2">Add New User</h1>
        </div>
        <Button variant="ghost" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Account Information */}
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-6">
          <h2 className="text-lg font-semibold text-white mb-4">
            Account Information
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Email *"
              type="email"
              placeholder="user@example.com"
              error={errors.email?.message}
              {...register('email')}
            />

            <Input
              label="Username *"
              placeholder="johndoe"
              error={errors.username?.message}
              {...register('username')}
            />

            <Input
              label="Password *"
              type="password"
              placeholder="Min 8 characters"
              error={errors.password?.message}
              {...register('password')}
            />

            <Input
              label="Confirm Password *"
              type="password"
              placeholder="Repeat password"
              error={errors.confirmPassword?.message}
              {...register('confirmPassword')}
            />
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
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Creating...' : 'Create User'}
          </Button>
        </div>
      </form>
    </div>
  );
}
