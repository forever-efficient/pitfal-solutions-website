import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Navigation, navigationItems } from '@/components/layout/Navigation';

// Mock usePathname
const mockUsePathname = vi.fn();
vi.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
}));

describe('Navigation', () => {
  beforeEach(() => {
    mockUsePathname.mockReturnValue('/');
  });

  it('renders all navigation items', () => {
    render(<Navigation />);

    navigationItems.forEach((item) => {
      expect(screen.getByRole('link', { name: item.label })).toBeInTheDocument();
    });
  });

  it('renders correct href for each item', () => {
    render(<Navigation />);

    navigationItems.forEach((item) => {
      const link = screen.getByRole('link', { name: item.label });
      expect(link).toHaveAttribute('href', item.href);
    });
  });

  it('applies active style to current page', () => {
    mockUsePathname.mockReturnValue('/about');
    render(<Navigation isScrolled={true} />);

    const aboutLink = screen.getByRole('link', { name: 'About' });
    expect(aboutLink).toHaveClass('text-accent-600');
    expect(aboutLink).toHaveClass('bg-accent-50');
  });

  it('applies inactive style to non-current pages', () => {
    mockUsePathname.mockReturnValue('/about');
    render(<Navigation isScrolled={true} />);

    const portfolioLink = screen.getByRole('link', { name: 'Portfolio' });
    expect(portfolioLink).toHaveClass('text-neutral-600');
  });

  it('applies transparent style when not scrolled', () => {
    mockUsePathname.mockReturnValue('/');
    render(<Navigation isScrolled={false} />);

    const homeLink = screen.getByRole('link', { name: 'Home' });
    expect(homeLink).toHaveClass('text-accent-400');
  });

  it('accepts custom items', () => {
    const customItems = [
      { label: 'Custom 1', href: '/custom1' },
      { label: 'Custom 2', href: '/custom2' },
    ];

    render(<Navigation items={customItems} />);

    expect(screen.getByRole('link', { name: 'Custom 1' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Custom 2' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Home' })).not.toBeInTheDocument();
  });

  it('accepts custom className', () => {
    render(<Navigation className="custom-class" />);

    const nav = screen.getByRole('navigation');
    expect(nav).toHaveClass('custom-class');
  });

  it('marks child pages as active', () => {
    mockUsePathname.mockReturnValue('/portfolio/brands');
    render(<Navigation isScrolled={true} />);

    const portfolioLink = screen.getByRole('link', { name: 'Portfolio' });
    expect(portfolioLink).toHaveClass('text-accent-600');
  });

  it('does not mark home as active for child paths', () => {
    mockUsePathname.mockReturnValue('/about');
    render(<Navigation isScrolled={true} />);

    const homeLink = screen.getByRole('link', { name: 'Home' });
    expect(homeLink).not.toHaveClass('text-accent-600');
  });
});
