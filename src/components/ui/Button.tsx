'use client';

import { forwardRef, ButtonHTMLAttributes } from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '@/lib/utils';
import { SpinnerIcon } from '@/components/icons';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'link';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  asChild?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      children,
      asChild = false,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

    const variants = {
      primary:
        'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500 shadow-sm hover:shadow-md',
      secondary:
        'bg-neutral-100 text-neutral-900 hover:bg-neutral-200 focus:ring-neutral-500',
      outline:
        'border-2 border-primary-600 text-primary-600 hover:bg-primary-50 focus:ring-primary-500',
      ghost:
        'text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900 focus:ring-neutral-500',
      link: 'text-primary-600 hover:text-primary-700 underline-offset-4 hover:underline focus:ring-primary-500 p-0',
    };

    const sizes = {
      sm: 'text-sm px-3 py-1.5 rounded-md gap-1.5',
      md: 'text-base px-4 py-2 rounded-lg gap-2',
      lg: 'text-lg px-6 py-3 rounded-lg gap-2.5',
    };

    const Comp = asChild ? Slot : 'button';

    return (
      <Comp
        ref={ref}
        className={cn(
          baseStyles,
          variants[variant],
          variant !== 'link' && sizes[size],
          className
        )}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <>
            <SpinnerIcon size={16} className="-ml-1 mr-2" />
            Loading...
          </>
        ) : (
          <>
            {leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
          </>
        )}
      </Comp>
    );
  }
);

Button.displayName = 'Button';

export { Button };
