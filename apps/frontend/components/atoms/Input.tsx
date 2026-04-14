'use client';

import { forwardRef, InputHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string | ReactNode;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, type = 'text', id, ...props }, ref) => {
    // Generate inputId only from string labels, otherwise use provided id or undefined
    const inputId = id || (typeof label === 'string' ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-neutral-300 mb-1.5"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          type={type}
          className={cn(
            'w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border',
            'text-white placeholder-neutral-500',
            'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
            'transition-colors',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            error && 'border-error focus:ring-error',
            className
          )}
          {...props}
        />
        {hint && !error && (
          <p className="mt-1.5 text-sm text-neutral-500">{hint}</p>
        )}
        {error && <p className="mt-1.5 text-sm text-error">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
