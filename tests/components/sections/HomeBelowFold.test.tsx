import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import HomeBelowFold from '@/components/sections/HomeBelowFold';

vi.mock('@/components/sections/ServicesOverview', () => ({
  ServicesOverview: () => <div data-testid="services-overview">services</div>,
}));

vi.mock('@/components/sections/FeaturedGallery', () => ({
  FeaturedGallery: () => <div data-testid="featured-gallery">featured</div>,
}));

vi.mock('@/components/sections/TestimonialsSection', () => ({
  TestimonialsSection: () => <div data-testid="testimonials">testimonials</div>,
}));

describe('HomeBelowFold', () => {
  it('renders homepage below-the-fold sections in order', () => {
    render(<HomeBelowFold />);
    expect(screen.getByTestId('services-overview')).toBeInTheDocument();
    expect(screen.getByTestId('featured-gallery')).toBeInTheDocument();
    expect(screen.getByTestId('testimonials')).toBeInTheDocument();
  });
});
