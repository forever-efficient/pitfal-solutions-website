'use client';

import { Fragment, useEffect, useCallback, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { navigationItems, NavItem } from './Navigation';
import { CloseIcon, ChevronDownIcon } from '@/components/icons';

export interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  items?: NavItem[];
}

export function MobileMenu({ isOpen, onClose, items = navigationItems }: MobileMenuProps) {
  const pathname = usePathname();
  const menuRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Auto-focus close button when opened
  useEffect(() => {
    if (isOpen) {
      closeButtonRef.current?.focus();
    }
  }, [isOpen]);

  // Reset expanded state when menu closes
  useEffect(() => {
    if (!isOpen) setExpandedItem(null);
  }, [isOpen]);

  // Focus trap
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key !== 'Tab' || !menuRef.current) return;

    const focusableElements = menuRef.current.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0]!;
    const lastElement = focusableElements[focusableElements.length - 1]!;

    if (e.shiftKey && document.activeElement === firstElement) {
      e.preventDefault();
      lastElement.focus();
    } else if (!e.shiftKey && document.activeElement === lastElement) {
      e.preventDefault();
      firstElement.focus();
    }
  }, []);

  return (
    <Fragment>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 md:hidden',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-out menu */}
      <div
        ref={menuRef}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        onKeyDown={handleKeyDown}
        className={cn(
          'fixed top-0 right-0 h-full w-80 max-w-[85vw] bg-white shadow-xl z-50 transition-transform duration-300 ease-out md:hidden',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Close button */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-200">
          <span className="text-lg font-semibold text-neutral-900">Menu</span>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="p-2 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors"
            aria-label="Close menu"
          >
            <CloseIcon size={24} />
          </button>
        </div>

        {/* Navigation links */}
        <nav className="p-4">
          <ul className="space-y-1">
            {items.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== '/' && pathname.startsWith(item.href));

              if (item.children) {
                const isExpanded = expandedItem === item.label;

                return (
                  <li key={item.href}>
                    {/* Accordion toggle */}
                    <button
                      onClick={() => setExpandedItem(isExpanded ? null : item.label)}
                      className={cn(
                        'w-full flex items-center justify-between px-4 py-3 text-base font-medium rounded-lg transition-colors duration-200',
                        isActive
                          ? 'text-primary-600 bg-primary-50'
                          : 'text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100'
                      )}
                      aria-expanded={isExpanded}
                    >
                      {item.label}
                      <ChevronDownIcon
                        size={16}
                        className={cn(
                          'transition-transform duration-200',
                          isExpanded ? 'rotate-180' : 'rotate-0'
                        )}
                      />
                    </button>

                    {/* Child links */}
                    {isExpanded && (
                      <ul className="mt-1 ml-4 space-y-1 border-l-2 border-neutral-100 pl-3">
                        {item.children.map((child) => {
                          const isChildActive = pathname === child.href || pathname.startsWith(child.href);
                          return (
                            <li key={child.href}>
                              <Link
                                href={child.href}
                                onClick={onClose}
                                className={cn(
                                  'block px-3 py-2.5 text-sm font-medium rounded-lg transition-colors duration-200',
                                  isChildActive
                                    ? 'text-primary-600 bg-primary-50'
                                    : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
                                )}
                              >
                                {child.label}
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </li>
                );
              }

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onClose}
                    className={cn(
                      'block px-4 py-3 text-base font-medium rounded-lg transition-colors duration-200',
                      isActive
                        ? 'text-primary-600 bg-primary-50'
                        : 'text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100'
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* CTA */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-neutral-200 bg-neutral-50">
          <Link
            href="/contact"
            onClick={onClose}
            className="block w-full px-4 py-3 text-center text-white bg-primary-700 hover:bg-primary-800 rounded-lg font-medium transition-colors"
          >
            Book a Session
          </Link>
        </div>
      </div>
    </Fragment>
  );
}
