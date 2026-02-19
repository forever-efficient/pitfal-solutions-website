import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Header } from '@/components/layout/Header';

const mockUsePathname = vi.fn();
vi.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
}));

describe('Header', () => {
  beforeEach(() => {
    mockUsePathname.mockReturnValue('/');
    Object.defineProperty(window, 'scrollY', { value: 0, writable: true });
  });

  it('renders the logo', () => {
    render(<Header />);
    expect(screen.getByAltText('Pitfal Solutions')).toBeInTheDocument();
  });

  it('renders the logo link to homepage', () => {
    render(<Header />);
    const logoLink = screen.getByRole('link', { name: /pitfal solutions/i });
    expect(logoLink).toHaveAttribute('href', '/');
  });

  it('renders Book Now button on desktop', () => {
    render(<Header />);
    const bookButton = screen.getByRole('link', { name: /book now/i });
    expect(bookButton).toBeInTheDocument();
    expect(bookButton).toHaveAttribute('href', '/contact');
  });

  it('renders mobile menu button', () => {
    render(<Header />);
    const menuButton = screen.getByRole('button', { name: /open menu/i });
    expect(menuButton).toBeInTheDocument();
  });

  it('opens mobile menu when menu button is clicked', () => {
    render(<Header />);
    const menuButton = screen.getByRole('button', { name: /open menu/i });

    fireEvent.click(menuButton);

    expect(screen.getByRole('button', { name: /close menu/i })).toBeInTheDocument();
  });

  it('has transparent background on homepage without scroll', () => {
    mockUsePathname.mockReturnValue('/');
    render(<Header />);

    const header = document.querySelector('header');
    expect(header).toHaveClass('bg-transparent');
  });

  it('has opaque background on non-homepage', () => {
    mockUsePathname.mockReturnValue('/about');
    render(<Header />);

    const header = document.querySelector('header');
    expect(header).toHaveClass('bg-white/95');
  });

  it('changes to opaque style on scroll from homepage', () => {
    mockUsePathname.mockReturnValue('/');
    render(<Header />);

    Object.defineProperty(window, 'scrollY', { value: 50, writable: true });
    fireEvent.scroll(window);

    const header = document.querySelector('header');
    expect(header).toHaveClass('bg-white/95');
  });

  it('prevents body scroll when mobile menu is open', () => {
    render(<Header />);
    const menuButton = screen.getByRole('button', { name: /open menu/i });

    fireEvent.click(menuButton);

    expect(document.body.style.overflow).toBe('hidden');
  });

  it('restores body scroll when mobile menu is closed', () => {
    render(<Header />);
    const menuButton = screen.getByRole('button', { name: /open menu/i });

    fireEvent.click(menuButton);
    expect(document.body.style.overflow).toBe('hidden');

    const closeButton = screen.getByRole('button', { name: /close menu/i });
    fireEvent.click(closeButton);

    expect(document.body.style.overflow).toBe('');
  });
});
