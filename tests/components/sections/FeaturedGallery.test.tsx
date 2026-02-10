import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FeaturedGallery } from '@/components/sections/FeaturedGallery';

describe('FeaturedGallery', () => {
  it('renders the section header', () => {
    render(<FeaturedGallery />);
    expect(screen.getByText('Past Solutions')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Featured Projects' })).toBeInTheDocument();
  });

  it('renders section description', () => {
    render(<FeaturedGallery />);
    expect(screen.getByText(/A selection of recent work/i)).toBeInTheDocument();
  });

  it('renders all three featured projects from gallery manifests', () => {
    render(<FeaturedGallery />);
    // Featured galleries sorted by date desc: tech-startup (2026-01), johnson-wedding (2025-10-25), family-session (2025-10-18)
    expect(screen.getByText('Tech Startup Rebrand')).toBeInTheDocument();
    expect(screen.getByText('Johnson Wedding')).toBeInTheDocument();
    expect(screen.getByText('Smith Family Session')).toBeInTheDocument();
  });

  it('renders category labels from gallery data', () => {
    render(<FeaturedGallery />);
    expect(screen.getByText('Brand Photography')).toBeInTheDocument();
    expect(screen.getByText('Portraits')).toBeInTheDocument();
    expect(screen.getByText('Events')).toBeInTheDocument();
  });

  it('renders project links with correct hrefs', () => {
    render(<FeaturedGallery />);
    const links = screen.getAllByRole('link');

    const projectLinks = links.filter(
      (link) => {
        const href = link.getAttribute('href');
        return href?.includes('/portfolio/') && href !== '/portfolio';
      }
    );

    expect(projectLinks).toHaveLength(3);
    // Sorted by date desc
    expect(projectLinks[0]).toHaveAttribute('href', '/portfolio/brands/tech-startup-rebrand');
    expect(projectLinks[1]).toHaveAttribute('href', '/portfolio/events/johnson-wedding');
    expect(projectLinks[2]).toHaveAttribute('href', '/portfolio/portraits/family-session');
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
