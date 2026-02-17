import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MobileMenu } from '@/components/layout/MobileMenu';
import { navigationItems } from '@/components/layout/Navigation';

// Mock usePathname
const mockUsePathname = vi.fn();
vi.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
}));

describe('MobileMenu', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    mockUsePathname.mockReturnValue('/');
    mockOnClose.mockClear();
  });

  it('renders all navigation items when open', () => {
    render(<MobileMenu isOpen={true} onClose={mockOnClose} />);

    navigationItems.forEach((item) => {
      if (item.children) {
        // Items with children are accordion toggles (buttons), not links
        expect(screen.getByRole('button', { name: item.label })).toBeInTheDocument();
      } else {
        expect(screen.getByRole('link', { name: item.label })).toBeInTheDocument();
      }
    });
  });

  it('renders close button', () => {
    render(<MobileMenu isOpen={true} onClose={mockOnClose} />);

    expect(screen.getByRole('button', { name: /close menu/i })).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    render(<MobileMenu isOpen={true} onClose={mockOnClose} />);

    const closeButton = screen.getByRole('button', { name: /close menu/i });
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when backdrop is clicked', () => {
    render(<MobileMenu isOpen={true} onClose={mockOnClose} />);

    // The backdrop is the first div with opacity that can be clicked
    const backdrop = document.querySelector('.fixed.inset-0.bg-black\\/50');
    fireEvent.click(backdrop!);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when a navigation link is clicked', () => {
    render(<MobileMenu isOpen={true} onClose={mockOnClose} />);

    const aboutLink = screen.getByRole('link', { name: 'About' });
    fireEvent.click(aboutLink);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('renders Book a Session CTA', () => {
    render(<MobileMenu isOpen={true} onClose={mockOnClose} />);

    const ctaButton = screen.getByRole('link', { name: /book a session/i });
    expect(ctaButton).toBeInTheDocument();
    expect(ctaButton).toHaveAttribute('href', '/contact');
  });

  it('calls onClose when CTA is clicked', () => {
    render(<MobileMenu isOpen={true} onClose={mockOnClose} />);

    const ctaButton = screen.getByRole('link', { name: /book a session/i });
    fireEvent.click(ctaButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('applies active style to current page', () => {
    mockUsePathname.mockReturnValue('/about');
    render(<MobileMenu isOpen={true} onClose={mockOnClose} />);

    const aboutLink = screen.getByRole('link', { name: 'About' });
    expect(aboutLink).toHaveClass('text-primary-600');
    expect(aboutLink).toHaveClass('bg-primary-50');
  });

  it('has visible state when open', () => {
    render(<MobileMenu isOpen={true} onClose={mockOnClose} />);

    const menu = document.querySelector('.translate-x-0');
    expect(menu).toBeInTheDocument();
  });

  it('has hidden state when closed', () => {
    render(<MobileMenu isOpen={false} onClose={mockOnClose} />);

    const menu = document.querySelector('.translate-x-full');
    expect(menu).toBeInTheDocument();
  });

  it('accepts custom items', () => {
    const customItems = [
      { label: 'Custom Link', href: '/custom' },
    ];

    render(<MobileMenu isOpen={true} onClose={mockOnClose} items={customItems} />);

    expect(screen.getByRole('link', { name: 'Custom Link' })).toBeInTheDocument();
  });

  it('shows Menu title', () => {
    render(<MobileMenu isOpen={true} onClose={mockOnClose} />);

    expect(screen.getByText('Menu')).toBeInTheDocument();
  });
});
