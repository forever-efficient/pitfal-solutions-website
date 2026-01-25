import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface ContainerProps extends HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  padding?: boolean;
  center?: boolean;
}

const Container = forwardRef<HTMLDivElement, ContainerProps>(
  ({ className, size = 'lg', padding = true, center = true, ...props }, ref) => {
    const sizes = {
      sm: 'max-w-2xl',
      md: 'max-w-4xl',
      lg: 'max-w-6xl',
      xl: 'max-w-7xl',
      full: 'max-w-full',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'w-full',
          sizes[size],
          padding && 'px-4 sm:px-6 lg:px-8',
          center && 'mx-auto',
          className
        )}
        {...props}
      />
    );
  }
);

Container.displayName = 'Container';

// Section wrapper with vertical padding
export interface SectionProps extends HTMLAttributes<HTMLElement> {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  background?: 'white' | 'light' | 'dark' | 'primary' | 'transparent';
}

const Section = forwardRef<HTMLElement, SectionProps>(
  ({ className, size = 'md', background = 'transparent', children, ...props }, ref) => {
    const sizes = {
      sm: 'py-8 md:py-12',
      md: 'py-12 md:py-16',
      lg: 'py-16 md:py-24',
      xl: 'py-20 md:py-32',
    };

    const backgrounds = {
      white: 'bg-white',
      light: 'bg-neutral-50',
      dark: 'bg-neutral-900 text-white',
      primary: 'bg-primary-600 text-white',
      transparent: '',
    };

    return (
      <section
        ref={ref}
        className={cn(sizes[size], backgrounds[background], className)}
        {...props}
      >
        {children}
      </section>
    );
  }
);

Section.displayName = 'Section';

export { Container, Section };
