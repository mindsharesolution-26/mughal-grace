'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function FinancePayablesRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/payables');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
    </div>
  );
}
