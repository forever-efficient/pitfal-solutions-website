'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Navigation } from './Navigation';
import { MobileMenu } from './MobileMenu';

export function Header() {
  const pathname = usePathname();
  const isHomepage = pathname === '/';
  const [isScrolled, setIsScrolled] = useState(!isHomepage);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    // On non-homepage, always use scrolled style
    if (!isHomepage) {
      setIsScrolled(true);
      return;
    }

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    // Check initial scroll position
    handleScroll();

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isHomepage]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  return (
    <>
      <header
        className={cn(
          'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
          isScrolled
            ? 'bg-white/95 backdrop-blur-sm shadow-sm'
            : 'bg-transparent'
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-20">
            {/* Logo */}
            <Link
              href="/"
              className="flex items-center gap-2 group"
            >
              <span
                className="text-xl md:text-2xl font-bold text-accent-500 transition-colors group-hover:text-accent-400"
              >
                Pitfal
              </span>
              <span
                className={cn(
                  'text-xl md:text-2xl font-light transition-colors',
                  isScrolled
                    ? 'text-neutral-700'
                    : 'text-white/90'
                )}
              >
                Solutions
              </span>
            </Link>

            {/* Desktop Navigation */}
            <Navigation isScrolled={isScrolled} />

            {/* Desktop CTA */}
            <div className="hidden md:flex items-center gap-4">
              <Link
                href="/contact"
                className="inline-flex items-center justify-center text-sm font-medium px-4 py-2 rounded-lg bg-accent-500 text-white hover:bg-accent-400 transition-colors shadow-sm hover:shadow-md"
              >
                Book Now
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className={cn(
                'md:hidden p-2 rounded-lg transition-colors',
                isScrolled
                  ? 'text-neutral-700 hover:bg-neutral-100'
                  : 'text-white hover:bg-white/10'
              )}
              aria-label="Open menu"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      <MobileMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />
    </>
  );
}
