'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Redirect to dashboard if already authenticated
    if (!isLoading && isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, isLoading, router]);

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen bg-factory-black flex items-center justify-center">
        <div className="text-neutral-400">Loading...</div>
      </div>
    );
  }

  // Don't render public pages if authenticated
  if (isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
