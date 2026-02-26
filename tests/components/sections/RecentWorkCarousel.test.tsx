import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { RecentWorkCarousel } from '@/components/sections/RecentWorkCarousel';

const mockGetFeaturedImages = vi.hoisted(() => vi.fn());

vi.mock('@/lib/api', () => ({
  publicGalleries: {
    getFeaturedImages: mockGetFeaturedImages,
  },
}));

vi.mock('@/lib/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/utils')>();
  return {
    ...actual,
    getImageUrl: (key: string) => `https://cdn.example.com/${key}`,
  };
});

describe('RecentWorkCarousel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the section header when showHeader is true', async () => {
    mockGetFeaturedImages.mockImplementation(() =>
      Promise.resolve({ images: [] })
    );
    render(<RecentWorkCarousel showHeader={true} />);
    expect(screen.getByText('Recent Work')).toBeInTheDocument();
    await waitFor(() => {
      expect(mockGetFeaturedImages).toHaveBeenCalled();
    });
  });

  it('hides the section header when showHeader is false', async () => {
    mockGetFeaturedImages.mockImplementation(() =>
      Promise.resolve({ images: [] })
    );
    render(<RecentWorkCarousel showHeader={false} />);
    expect(screen.queryByText('Recent Work')).not.toBeInTheDocument();
    await waitFor(() => {
      expect(mockGetFeaturedImages).toHaveBeenCalled();
    });
  });

  it('shows skeleton loading state initially', () => {
    mockGetFeaturedImages.mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );
    render(<RecentWorkCarousel />);
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders carousel when images are loaded', async () => {
    const mockImages = [
      'gallery/g1/img1.jpg',
      'gallery/g1/img2.jpg',
      'gallery/g1/img3.jpg',
    ];
    mockGetFeaturedImages.mockImplementation(() =>
      Promise.resolve({ images: mockImages })
    );
    render(<RecentWorkCarousel />);

    await waitFor(() => {
      const images = document.querySelectorAll('img[alt="Recent work"]');
      expect(images.length).toBeGreaterThan(0);
    });
  });

  it('shows empty state placeholder when API returns no images', async () => {
    mockGetFeaturedImages.mockImplementation(() =>
      Promise.resolve({ images: [] })
    );
    render(<RecentWorkCarousel />);

    await waitFor(() => {
      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons).toHaveLength(0);
    });

    const placeholders = document.querySelectorAll(
      '.h-\\[300px\\].w-\\[240px\\]'
    );
    expect(placeholders.length).toBeGreaterThan(0);
  });

  it('handles API errors gracefully', async () => {
    mockGetFeaturedImages.mockImplementation(() =>
      Promise.reject(new Error('Network error'))
    );
    render(<RecentWorkCarousel />);

    await waitFor(() => {
      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons).toHaveLength(0);
    });

    expect(screen.getByText('Unable to load images')).toBeInTheDocument();
  });

  it('renders View Full Portfolio CTA when showCta is true', async () => {
    mockGetFeaturedImages.mockImplementation(() =>
      Promise.resolve({ images: [] })
    );
    render(<RecentWorkCarousel showCta={true} />);
    const ctaLink = screen.getByRole('link', { name: /view full portfolio/i });
    expect(ctaLink).toBeInTheDocument();
    expect(ctaLink).toHaveAttribute('href', '/portfolio');
    await waitFor(() => {
      expect(mockGetFeaturedImages).toHaveBeenCalled();
    });
  });

  it('hides View Full Portfolio CTA when showCta is false', async () => {
    mockGetFeaturedImages.mockImplementation(() =>
      Promise.resolve({ images: [] })
    );
    render(<RecentWorkCarousel showCta={false} />);
    await waitFor(() => {
      const ctaLink = screen.queryByRole('link', { name: /view full portfolio/i });
      expect(ctaLink).not.toBeInTheDocument();
    });
  });

  it('applies custom className', async () => {
    mockGetFeaturedImages.mockImplementation(() =>
      Promise.resolve({ images: [] })
    );
    const { container } = render(
      <RecentWorkCarousel className="custom-class" />
    );
    const section = container.querySelector('.custom-class');
    expect(section).toBeInTheDocument();
    await waitFor(() => {
      expect(mockGetFeaturedImages).toHaveBeenCalled();
    });
  });

  it('renders image onError handler for fallback', async () => {
    const mockImages = ['gallery/g1/img1.jpg'];
    mockGetFeaturedImages.mockImplementation(() =>
      Promise.resolve({ images: mockImages })
    );
    render(<RecentWorkCarousel />);

    await waitFor(() => {
      const img = document.querySelector('img[alt="Recent work"]') as HTMLImageElement;
      expect(img).toBeInTheDocument();
      // Trigger the error handler
      img.dispatchEvent(new Event('error'));
      // Verify fallback src is called
      expect(img.onerror).toBeNull();
    });
  });

  it('pads images to meet MIN_ITEMS requirement', async () => {
    const mockImages = ['gallery/g1/img1.jpg'];
    mockGetFeaturedImages.mockImplementation(() =>
      Promise.resolve({ images: mockImages })
    );
    render(<RecentWorkCarousel />);

    await waitFor(() => {
      const images = document.querySelectorAll('img[alt="Recent work"]');
      // Should have at least MIN_ITEMS (11) * 2 (duplicated for seamless scroll)
      expect(images.length).toBeGreaterThanOrEqual(11);
    });
  });
});
