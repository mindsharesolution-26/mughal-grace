'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/atoms/Button';
import { ShieldX, ArrowLeft, Home } from 'lucide-react';

export default function AccessDeniedPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-factory-darker flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        {/* Icon */}
        <div className="mx-auto w-20 h-20 rounded-full bg-error/20 flex items-center justify-center mb-6">
          <ShieldX className="w-10 h-10 text-error" />
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-white mb-2">Access Denied</h1>

        {/* Error Code */}
        <p className="text-6xl font-bold text-error/30 mb-4">403</p>

        {/* Message */}
        <p className="text-neutral-400 mb-8">
          You don't have permission to access this page. Please contact your
          administrator if you believe this is an error.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </Button>
          <Button
            variant="primary"
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-2"
          >
            <Home className="w-4 h-4" />
            Go to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
