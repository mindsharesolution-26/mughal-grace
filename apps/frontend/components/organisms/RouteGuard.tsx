'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { hasRouteAccess } from '@/lib/config/roleAccess';
import { UserRole } from '@/lib/types/user';

interface RouteGuardProps {
  children: React.ReactNode;
}

export function RouteGuard({ children }: RouteGuardProps) {
  const { user, isLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Don't check while auth is loading
    if (isLoading) {
      setChecking(true);
      return;
    }

    // If no user, redirect to login
    if (!user) {
      setAuthorized(false);
      setChecking(false);
      router.push('/login');
      return;
    }

    // Check if user has access to this route
    const userRole = user.role as UserRole;
    const hasAccess = hasRouteAccess(userRole, pathname);

    if (!hasAccess) {
      setAuthorized(false);
      setChecking(false);
      router.push('/access-denied');
      return;
    }

    setAuthorized(true);
    setChecking(false);
  }, [user, isLoading, pathname, router]);

  // Show loading state
  if (isLoading || checking) {
    return (
      <div className="min-h-screen bg-factory-darker flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
          <p className="text-neutral-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Show nothing if not authorized (will redirect)
  if (!authorized) {
    return (
      <div className="min-h-screen bg-factory-darker flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
          <p className="text-neutral-400">Redirecting...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
