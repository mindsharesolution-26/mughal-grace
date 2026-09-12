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
            className="block text-xs font-medium text-neutral-300 mb-1.5 tracking-wide"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          type={type}
          className={cn(
            'glass-input w-full px-4 py-2.5 rounded-xl',
            'text-sm text-white placeholder-neutral-500',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            error && '!border-error/50 focus:!border-error/60 focus:!shadow-[0_0_0_3px_rgba(239,68,68,0.15)]',
            className
          )}
          {...props}
        />
        {hint && !error && (
          <p className="mt-1.5 text-xs text-neutral-500">{hint}</p>
        )}
        {error && <p className="mt-1.5 text-xs text-error">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
