import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
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
    render(<Navigation />);

    const aboutLink = screen.getByRole('link', { name: 'About' });
    expect(aboutLink).toHaveClass('text-accent-600');
    expect(aboutLink).toHaveClass('bg-accent-50');
  });

  it('applies inactive style to non-current pages', () => {
    mockUsePathname.mockReturnValue('/about');
    render(<Navigation />);

    const portfolioLink = screen.getByRole('link', { name: 'Portfolio' });
    expect(portfolioLink).toHaveClass('text-neutral-600');
  });

  it('applies transparent active style when transparent', () => {
    mockUsePathname.mockReturnValue('/');
    render(<Navigation isTransparent={true} />);

    const homeLink = screen.getByRole('link', { name: 'Home' });
    expect(homeLink).toHaveClass('text-white');
    expect(homeLink).toHaveClass('bg-white/20');
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
    render(<Navigation />);

    const portfolioLink = screen.getByRole('link', { name: 'Portfolio' });
    expect(portfolioLink).toHaveClass('text-accent-600');
  });

  it('does not mark home as active for child paths', () => {
    mockUsePathname.mockReturnValue('/about');
    render(<Navigation />);

    const homeLink = screen.getByRole('link', { name: 'Home' });
    expect(homeLink).not.toHaveClass('text-accent-600');
  });

  it('applies transparent inactive style when transparent', () => {
    mockUsePathname.mockReturnValue('/about');
    render(<Navigation isTransparent={true} />);

    const homeLink = screen.getByRole('link', { name: 'Home' });
    expect(homeLink).toHaveClass('text-white/90');
  });

  it('opens and closes services dropdown on hover', () => {
    vi.useFakeTimers();
    render(<Navigation />);

    const servicesLink = screen.getByRole('link', { name: 'Services' });
    const dropdownContainer = servicesLink.parentElement as HTMLDivElement;
    const dropdownWrapper = dropdownContainer.querySelector('.absolute.top-full') as HTMLDivElement;
    const dropdownPanel = dropdownWrapper.querySelector('.bg-white') as HTMLDivElement;

    expect(dropdownPanel).toHaveClass('opacity-0');

    fireEvent.mouseEnter(dropdownContainer);
    expect(dropdownPanel).toHaveClass('opacity-100');

    act(() => {
      fireEvent.mouseLeave(dropdownContainer);
      vi.runAllTimers();
    });
    expect(dropdownPanel).toHaveClass('opacity-0');

    vi.useRealTimers();
  });

  it('marks active service child link in dropdown', () => {
    mockUsePathname.mockReturnValue('/services/videography');
    render(<Navigation />);

    const childLink = screen.getByRole('link', { name: 'Videography' });
    expect(childLink).toHaveClass('text-primary-600');
    expect(childLink).toHaveClass('bg-primary-50');
  });
});
