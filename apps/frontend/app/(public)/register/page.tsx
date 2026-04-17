'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/contexts/ToastContext';
import { api } from '@/lib/api/client';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';

const registerSchema = z
  .object({
    factoryName: z.string().min(3, 'Factory name must be at least 3 characters'),
    fullName: z.string().min(2, 'Full name is required'),
    email: z.string().email('Invalid email address'),
    phone: z.string().min(11, 'Phone number must be at least 11 digits'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
    totalMachines: z.coerce.number().min(1, 'Must have at least 1 machine'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      totalMachines: 50,
    },
  });

  const onSubmit = async (data: RegisterForm) => {
    setIsLoading(true);
    try {
      await api.post('/auth/register', {
        email: data.email,
        password: data.password,
        fullName: data.fullName,
        companyName: data.factoryName,
        phone: data.phone,
      });
      showToast('success', 'Account created! Please check your email to verify.');
      router.push('/login');
    } catch (error: any) {
      showToast('error', error.response?.data?.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-factory-black flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white">Mughal Grace</h1>
          <p className="text-neutral-400 mt-1">Start your 14-day free trial</p>
        </div>

        {/* Register Card */}
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-8">
          <h2 className="text-xl font-semibold text-white mb-6">
            Create Your Factory Account
          </h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <Input
              label="Factory Name"
              placeholder="e.g. Mughal Textiles"
              error={errors.factoryName?.message}
              {...register('factoryName')}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Your Full Name"
                placeholder="Muhammad Ahmad"
                error={errors.fullName?.message}
                {...register('fullName')}
              />

              <Input
                label="Total Machines"
                type="number"
                placeholder="50"
                error={errors.totalMachines?.message}
                {...register('totalMachines')}
              />
            </div>

            <Input
              label="Email"
              type="email"
              placeholder="your@email.com"
              error={errors.email?.message}
              {...register('email')}
            />

            <Input
              label="Phone Number"
              type="tel"
              placeholder="0300-1234567"
              error={errors.phone?.message}
              {...register('phone')}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Password"
                type="password"
                placeholder="Min 8 characters"
                error={errors.password?.message}
                {...register('password')}
              />

              <Input
                label="Confirm Password"
                type="password"
                placeholder="Re-enter password"
                error={errors.confirmPassword?.message}
                {...register('confirmPassword')}
              />
            </div>

            <div className="text-sm text-neutral-400">
              By registering, you agree to our{' '}
              <a href="#" className="text-primary-400 hover:text-primary-300">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="#" className="text-primary-400 hover:text-primary-300">
                Privacy Policy
              </a>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Creating Account...' : 'Start Free Trial'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-neutral-400">
            Already have an account?{' '}
            <Link
              href="/login"
              className="text-primary-400 hover:text-primary-300 font-medium"
            >
              Sign in
            </Link>
          </p>
        </div>

        {/* Features */}
        <div className="mt-8 grid grid-cols-3 gap-4 text-center">
          <div>
            <span className="text-2xl">🏭</span>
            <p className="text-sm text-neutral-400 mt-1">Machine Tracking</p>
          </div>
          <div>
            <span className="text-2xl">📊</span>
            <p className="text-sm text-neutral-400 mt-1">Production Reports</p>
          </div>
          <div>
            <span className="text-2xl">💬</span>
            <p className="text-sm text-neutral-400 mt-1">WhatsApp Updates</p>
          </div>
        </div>
      </div>
    </main>
  );
}
