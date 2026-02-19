'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { SERVICES } from '@/lib/constants';
import { ChevronDownIcon } from '@/components/icons';

export interface NavItem {
  label: string;
  href: string;
  children?: NavItem[];
}

export const navigationItems: NavItem[] = [
  { label: 'Home', href: '/' },
  { label: 'Portfolio', href: '/portfolio' },
  {
    label: 'Services',
    href: '/services',
    children: [
      { label: SERVICES.photography.title, href: SERVICES.photography.href },
      { label: SERVICES.videography.title, href: SERVICES.videography.href },
      { label: SERVICES.drone.title, href: SERVICES.drone.href },
      { label: SERVICES.ai.title, href: SERVICES.ai.href },
    ],
  },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
];

export interface NavigationProps {
  items?: NavItem[];
  className?: string;
  isTransparent?: boolean;
}

export function Navigation({ items = navigationItems, className, isTransparent = false }: NavigationProps) {
  const pathname = usePathname();
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = (label: string) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpenDropdown(label);
  };

  const handleMouseLeave = () => {
    closeTimer.current = setTimeout(() => setOpenDropdown(null), 120);
  };

  return (
    <nav className={cn('hidden md:flex items-center gap-1', className)}>
      {items.map((item) => {
        const isActive =
          pathname === item.href ||
          (item.href !== '/' && pathname.startsWith(item.href));

        if (item.children) {
          const isOpen = openDropdown === item.label;

          return (
            <div
              key={item.href}
              className="relative"
              onMouseEnter={() => handleMouseEnter(item.label)}
              onMouseLeave={handleMouseLeave}
            >
              {/* Trigger — clicking navigates to the overview page */}
              <Link
                href={item.href}
                className={cn(
                  'inline-flex items-center gap-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200',
                  isTransparent
                    ? isActive
                      ? 'text-white bg-white/20'
                      : 'text-white/90 hover:text-white hover:bg-white/10'
                    : isActive
                      ? 'text-accent-600 bg-accent-50'
                      : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
                )}
              >
                {item.label}
                <ChevronDownIcon
                  size={14}
                  className={cn(
                    'transition-transform duration-200',
                    isOpen ? 'rotate-180' : 'rotate-0'
                  )}
                />
              </Link>

              {/* Dropdown panel — pt-2 bridges the gap; pointer-events on outer keeps hover alive */}
              <div
                className={cn(
                  'absolute top-full left-0 w-52 pt-2 z-50',
                  isOpen ? 'pointer-events-auto' : 'pointer-events-none'
                )}
              >
                <div
                  className={cn(
                    'bg-white rounded-xl shadow-lg border border-neutral-100 py-2 transition-all duration-150',
                    isOpen
                      ? 'opacity-100 translate-y-0'
                      : 'opacity-0 translate-y-1'
                  )}
                >
                  {item.children.map((child) => {
                    const isChildActive = pathname === child.href || pathname.startsWith(child.href);
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={cn(
                          'block px-4 py-2.5 text-sm font-medium transition-colors duration-150',
                          isChildActive
                            ? 'text-primary-600 bg-primary-50'
                            : 'text-neutral-700 hover:text-neutral-900 hover:bg-neutral-50'
                        )}
                      >
                        {child.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200',
              isTransparent
                ? isActive
                  ? 'text-white bg-white/20'
                  : 'text-white/90 hover:text-white hover:bg-white/10'
                : isActive
                  ? 'text-accent-600 bg-accent-50'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
