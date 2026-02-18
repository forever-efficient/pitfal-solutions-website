import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HeroSection } from '@/components/sections/HeroSection';

describe('HeroSection', () => {
  it('renders default title', () => {
    render(<HeroSection />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Delivering Solutions That Matter');
  });

  it('renders custom title', () => {
    render(<HeroSection title="Custom Title" />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Custom Title');
  });

  it('renders default tagline', () => {
    render(<HeroSection />);
    expect(screen.getByText('Swing the Gap')).toBeInTheDocument();
  });

  it('renders custom tagline', () => {
    render(<HeroSection tagline="Custom Tagline" />);
    expect(screen.getByText('Custom Tagline')).toBeInTheDocument();
  });

  it('renders default subtitle', () => {
    render(<HeroSection />);
    expect(screen.getByText(/Professional Photography, Videography, Commercial Drone, and AI Services/i)).toBeInTheDocument();
  });

  it('renders custom subtitle', () => {
    render(<HeroSection subtitle="Custom subtitle text" />);
    expect(screen.getByText('Custom subtitle text')).toBeInTheDocument();
  });

  it('renders primary CTA button', () => {
    render(<HeroSection />);
    const ctaButton = screen.getByRole('link', { name: 'Book a Session' });
    expect(ctaButton).toBeInTheDocument();
    expect(ctaButton).toHaveAttribute('href', '/contact');
  });

  it('renders custom primary CTA', () => {
    render(<HeroSection ctaText="Get Started" ctaHref="/start" />);
    const ctaButton = screen.getByRole('link', { name: 'Get Started' });
    expect(ctaButton).toHaveAttribute('href', '/start');
  });

  it('renders secondary CTA button', () => {
    render(<HeroSection />);
    const secondaryCta = screen.getByRole('link', { name: 'View Portfolio' });
    expect(secondaryCta).toBeInTheDocument();
    expect(secondaryCta).toHaveAttribute('href', '/portfolio');
  });

  it('renders custom secondary CTA', () => {
    render(<HeroSection secondaryCtaText="Learn More" secondaryCtaHref="/about" />);
    const secondaryCta = screen.getByRole('link', { name: 'Learn More' });
    expect(secondaryCta).toHaveAttribute('href', '/about');
  });

  it('renders with custom background image', () => {
    render(<HeroSection backgroundImage="/custom-bg.jpg" />);
    const img = document.querySelector('img[src="/custom-bg.jpg"]');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('data-priority', 'true');
  });

  it('renders scroll indicator', () => {
    render(<HeroSection />);
    // ArrowDownIcon should be present
    const scrollIndicator = document.querySelector('.animate-bounce');
    expect(scrollIndicator).toBeInTheDocument();
  });

  it('has full screen height', () => {
    render(<HeroSection />);
    const section = document.querySelector('section');
    expect(section).toHaveClass('min-h-screen');
  });
});
