'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export interface NavItem {
  label: string;
  href: string;
  children?: NavItem[];
}

export const navigationItems: NavItem[] = [
  { label: 'Home', href: '/' },
  { label: 'Portfolio', href: '/portfolio' },
  { label: 'Services', href: '/services' },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
];

export interface NavigationProps {
  items?: NavItem[];
  className?: string;
  isScrolled?: boolean;
}

export function Navigation({ items = navigationItems, className, isScrolled = true }: NavigationProps) {
  const pathname = usePathname();

  return (
    <nav className={cn('hidden md:flex items-center gap-1', className)}>
      {items.map((item) => {
        const isActive =
          pathname === item.href ||
          (item.href !== '/' && pathname.startsWith(item.href));

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200',
              isScrolled
                ? isActive
                  ? 'text-accent-600 bg-accent-50'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
                : isActive
                  ? 'text-accent-400 bg-white/10'
                  : 'text-white/90 hover:text-white hover:bg-white/10'
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
