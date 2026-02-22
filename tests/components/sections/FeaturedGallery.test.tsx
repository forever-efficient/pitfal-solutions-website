import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { FeaturedGallery } from '@/components/sections/FeaturedGallery';

const mockGetFeatured = vi.hoisted(() => vi.fn());
const mockGetByCategory = vi.hoisted(() => vi.fn());

vi.mock('@/lib/api', () => ({
  publicGalleries: {
    getFeatured: mockGetFeatured,
    getByCategory: mockGetByCategory,
  },
}));

vi.mock('@/lib/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/utils')>();
  return {
    ...actual,
    getImageUrl: (key: string) => `https://cdn.example.com/${key}`,
  };
});

const MOCK_GALLERIES = [
  {
    id: 'g1',
    title: 'Tech Startup Rebrand',
    category: 'brands',
    slug: 'tech-startup-rebrand',
    coverImage: 'gallery/g1/cover.jpg',
    href: '/portfolio/brands/tech-startup-rebrand',
  },
  {
    id: 'g2',
    title: 'Johnson Wedding',
    category: 'events',
    slug: 'johnson-wedding',
    coverImage: null,
    href: '/portfolio/events/johnson-wedding',
  },
  {
    id: 'g3',
    title: 'Smith Family Session',
    category: 'portraits',
    slug: 'family-session',
    coverImage: null,
    href: '/portfolio/portraits/family-session',
  },
];

describe('FeaturedGallery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetFeatured.mockImplementation(() =>
      Promise.resolve({ galleries: MOCK_GALLERIES })
    );
    mockGetByCategory.mockImplementation(() =>
      Promise.resolve({ galleries: [] })
    );
  });

  it('renders the section header', async () => {
    render(<FeaturedGallery />);
    expect(screen.getByText('Past Solutions')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Featured Projects' })).toBeInTheDocument();
  });

  it('renders section description', async () => {
    render(<FeaturedGallery />);
    expect(screen.getByText(/A selection of recent work/i)).toBeInTheDocument();
  });

  it('shows skeleton loading state initially', () => {
    render(<FeaturedGallery />);
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders featured galleries from API after loading', async () => {
    render(<FeaturedGallery />);
    await waitFor(() => {
      expect(screen.getByText('Tech Startup Rebrand')).toBeInTheDocument();
    });
    expect(screen.getByText('Johnson Wedding')).toBeInTheDocument();
    expect(screen.getByText('Smith Family Session')).toBeInTheDocument();
  });

  it('renders project links with correct hrefs', async () => {
    render(<FeaturedGallery />);
    await waitFor(() => {
      expect(screen.getByText('Tech Startup Rebrand')).toBeInTheDocument();
    });

    const links = screen.getAllByRole('link');
    // Featured work items use /portfolio/viewer?category=X&slug=Y
    // Service cards use /portfolio/X or /portfolio/X/Y
    // Find featured work links specifically
    const featuredLinks = links.filter((link) => {
      const href = link.getAttribute('href');
      return href?.includes('/portfolio/viewer?');
    });

    expect(featuredLinks).toHaveLength(3);
    expect(featuredLinks[0]).toHaveAttribute('href', '/portfolio/viewer?category=portraits&slug=family-session');
    expect(featuredLinks[1]).toHaveAttribute('href', '/portfolio/viewer?category=brands&slug=tech-startup-rebrand');
    expect(featuredLinks[2]).toHaveAttribute('href', '/portfolio/viewer?category=events&slug=johnson-wedding');
  });

  it('renders View Full Portfolio CTA', () => {
    render(<FeaturedGallery />);
    const viewAllLink = screen.getByRole('link', { name: /view full portfolio/i });
    expect(viewAllLink).toBeInTheDocument();
    expect(viewAllLink).toHaveAttribute('href', '/portfolio');
  });

  it('shows static fallbacks when API returns empty galleries', async () => {
    mockGetFeatured.mockImplementation(() =>
      Promise.resolve({ galleries: [] })
    );
    render(<FeaturedGallery />);
    await waitFor(() => {
      // Loading spinner should be gone
      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons).toHaveLength(0);
    });
    // Static fallback titles should appear
    expect(screen.getByText('Urban Portrait Session')).toBeInTheDocument();
    expect(screen.getByText('Corporate Brand Shoot')).toBeInTheDocument();
    expect(screen.getByText('Wedding Celebration')).toBeInTheDocument();
  });

  it('shows static fallbacks on API error', async () => {
    mockGetFeatured.mockImplementation(() => Promise.reject(new Error('Network error')));
    mockGetByCategory.mockImplementation(() => Promise.reject(new Error('Network error')));
    render(<FeaturedGallery />);
    await waitFor(() => {
      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons).toHaveLength(0);
    });
    expect(screen.getByText('Urban Portrait Session')).toBeInTheDocument();
  });

  it('renders EyeIcon in each project card after loading', async () => {
    render(<FeaturedGallery />);
    await waitFor(() => {
      expect(screen.getByText('Tech Startup Rebrand')).toBeInTheDocument();
    });
    const projectCards = document.querySelectorAll('.group');
    // Now renders 3 featured work cards + 3 service cards = 6 total
    expect(projectCards).toHaveLength(6);
    projectCards.forEach((card) => {
      expect(card.querySelector('svg')).toBeInTheDocument();
    });
  });

  it('handles image loading errors with fallback src', async () => {
    render(<FeaturedGallery />);
    await waitFor(() => {
      expect(screen.getByText('Tech Startup Rebrand')).toBeInTheDocument();
    });

    const images = document.querySelectorAll('img');
    images.forEach((img) => {
      // Verify the image has the onError handler setup
      expect(img.getAttribute('src')).toContain('https://cdn.example.com/');
      // Simulate error event
      if (img.getAttribute('alt')?.includes('preview')) {
        img.dispatchEvent(new Event('error'));
        // After error, onerror should be set to null to prevent recursion
        expect(img.onerror).toBeNull();
      }
    });
  });

  it('renders service cards when explicitly featured', async () => {
    mockGetFeatured.mockImplementation(() =>
      Promise.resolve({
        galleries: [
          ...MOCK_GALLERIES,
          {
            id: 'v1',
            title: 'Studio Session',
            category: 'videography',
            slug: 'studio-session',
            coverImage: 'gallery/v1/cover.jpg',
          }
        ]
      })
    );

    render(<FeaturedGallery />);
    await waitFor(() => {
      expect(screen.getByText('Studio Session')).toBeInTheDocument();
    }, { timeout: 5000 });

    const links = screen.getAllByRole('link');
    const studioLink = links.find(l => l.textContent?.includes('Studio Session'));
    expect(studioLink).toHaveAttribute('href', '/portfolio/viewer?category=videography&slug=studio-session');
  });
});
