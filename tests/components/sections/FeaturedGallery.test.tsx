import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FeaturedGallery } from '@/components/sections/FeaturedGallery';

describe('FeaturedGallery', () => {
  it('renders the section header', () => {
    render(<FeaturedGallery />);
    expect(screen.getByText('Our Work')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Featured Projects' })).toBeInTheDocument();
  });

  it('renders section description', () => {
    render(<FeaturedGallery />);
    expect(screen.getByText(/A selection of recent work/i)).toBeInTheDocument();
  });

  it('renders all three featured projects', () => {
    render(<FeaturedGallery />);
    expect(screen.getByText('Urban Portrait Session')).toBeInTheDocument();
    expect(screen.getByText('Corporate Brand Shoot')).toBeInTheDocument();
    expect(screen.getByText('Wedding Celebration')).toBeInTheDocument();
  });

  it('renders category labels', () => {
    render(<FeaturedGallery />);
    expect(screen.getByText('Portraits')).toBeInTheDocument();
    expect(screen.getByText('Brand')).toBeInTheDocument();
    expect(screen.getByText('Events')).toBeInTheDocument();
  });

  it('renders project links with correct hrefs', () => {
    render(<FeaturedGallery />);
    const links = screen.getAllByRole('link');

    // Find project links (specific project paths)
    const projectLinks = links.filter(
      (link) => {
        const href = link.getAttribute('href');
        return href?.includes('/portfolio/') && href !== '/portfolio';
      }
    );

    expect(projectLinks).toHaveLength(3);
    expect(projectLinks[0]).toHaveAttribute('href', '/portfolio/portraits/urban-session');
    expect(projectLinks[1]).toHaveAttribute('href', '/portfolio/brands/corporate-shoot');
    expect(projectLinks[2]).toHaveAttribute('href', '/portfolio/events/wedding');
  });

  it('renders View Full Portfolio CTA', () => {
    render(<FeaturedGallery />);
    const viewAllLink = screen.getByRole('link', { name: /view full portfolio/i });
    expect(viewAllLink).toBeInTheDocument();
    expect(viewAllLink).toHaveAttribute('href', '/portfolio');
  });

  it('renders EyeIcon for hover state', () => {
    render(<FeaturedGallery />);
    // EyeIcon should be in each project card
    const projectCards = document.querySelectorAll('.group');
    expect(projectCards).toHaveLength(3);
    projectCards.forEach((card) => {
      expect(card.querySelector('svg')).toBeInTheDocument();
    });
  });
});
