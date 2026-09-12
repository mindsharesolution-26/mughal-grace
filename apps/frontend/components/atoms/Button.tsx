'use client';

import { forwardRef, ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils/cn';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium rounded-xl transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50 disabled:opacity-50 disabled:cursor-not-allowed select-none';

    const variants = {
      // Primary — gradient cyan with glass-edge highlight on top
      primary:
        'bg-gradient-to-b from-primary-400 to-primary-600 text-white shadow-lg shadow-primary-500/20 hover:from-primary-300 hover:to-primary-500 active:from-primary-500 active:to-primary-700 ring-1 ring-inset ring-white/10',
      // Secondary — frosted-glass surface with subtle border
      secondary:
        'glass-panel text-white hover:bg-white/[0.07] hover:border-white/[0.12]',
      // Ghost — fully transparent, glass on hover
      ghost:
        'bg-transparent text-neutral-300 hover:bg-white/[0.05] hover:text-white',
      // Danger — semantic red on glass
      danger:
        'bg-error/90 text-white shadow-lg shadow-error/20 hover:bg-error ring-1 ring-inset ring-white/10',
      // Success — semantic green on glass
      success:
        'bg-success/90 text-white shadow-lg shadow-success/20 hover:bg-success ring-1 ring-inset ring-white/10',
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-xs',
      md: 'px-4 py-2 text-sm',
      lg: 'px-6 py-3 text-sm',
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <>
            <svg
              className="animate-spin -ml-1 mr-2 h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Loading...
          </>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
