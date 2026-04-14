'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { login } = useAuth();
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    try {
      await login(data.email, data.password);
      showToast('success', 'Welcome back!');
    } catch (error: any) {
      showToast('error', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-factory-black flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white">Mughal Grace</h1>
          <p className="text-neutral-400 mt-1">Factory Intelligence System</p>
        </div>

        {/* Login Card */}
        <div className="bg-factory-dark rounded-2xl border border-factory-border p-8">
          <h2 className="text-xl font-semibold text-white mb-6">Sign In</h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <Input
              label="Email"
              type="email"
              placeholder="your@email.com"
              error={errors.email?.message}
              {...register('email')}
            />

            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              error={errors.password?.message}
              {...register('password')}
            />

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-neutral-400">
                <input type="checkbox" className="rounded" />
                Remember me
              </label>
              <Link
                href="/forgot-password"
                className="text-primary-400 hover:text-primary-300"
              >
                Forgot password?
              </Link>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-neutral-400">
            Don't have an account?{' '}
            <Link
              href="/register"
              className="text-primary-400 hover:text-primary-300 font-medium"
            >
              Start free trial
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
