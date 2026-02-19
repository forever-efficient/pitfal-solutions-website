import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ContactCTA } from '@/components/sections/ContactCTA';

describe('ContactCTA', () => {
  it('renders the heading', () => {
    render(<ContactCTA />);
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Ready to Plan Your Project?');
  });

  it('renders the description', () => {
    render(<ContactCTA />);
    expect(screen.getByText(/Whether you need a portrait session/i)).toBeInTheDocument();
  });

  it('renders Get in Touch button', () => {
    render(<ContactCTA />);
    const ctaButton = screen.getByRole('link', { name: /get in touch/i });
    expect(ctaButton).toBeInTheDocument();
    expect(ctaButton).toHaveAttribute('href', '/contact');
  });

  it('renders View Packages button', () => {
    render(<ContactCTA />);
    const packagesButton = screen.getByRole('link', { name: /view packages/i });
    expect(packagesButton).toBeInTheDocument();
    expect(packagesButton).toHaveAttribute('href', '/services');
  });

  it('renders email contact link', () => {
    render(<ContactCTA />);
    const emailLink = screen.getByRole('link', { name: /info@pitfal\.solutions/i });
    expect(emailLink).toBeInTheDocument();
    expect(emailLink).toHaveAttribute('href', 'mailto:info@pitfal.solutions');
  });

  it('renders location', () => {
    render(<ContactCTA />);
    expect(screen.getByText('Denver, Colorado')).toBeInTheDocument();
  });

  it('renders email icon', () => {
    render(<ContactCTA />);
    // EmailIcon should be in the email link
    const emailLink = screen.getByRole('link', { name: /info@pitfal\.solutions/i });
    expect(emailLink.querySelector('svg')).toBeInTheDocument();
  });

  it('renders location icon', () => {
    render(<ContactCTA />);
    // Location is in a span, not a link
    const locationSpan = screen.getByText('Denver, Colorado').parentElement;
    expect(locationSpan?.querySelector('svg')).toBeInTheDocument();
  });
});
