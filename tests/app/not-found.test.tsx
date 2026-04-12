import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import NotFound from '@/app/not-found';

// Stub GalleryPageClient so we don't need to exercise publicGalleries.getGallery
// (which would otherwise fire a real fetch from useEffect on mount).
vi.mock('@/app/portfolio/[category]/[gallery]/GalleryPageClient', () => ({
  GalleryPageClient: ({ category, slug }: { category: string; slug: string }) => (
    <div data-testid="gallery-client">{category}/{slug}</div>
  ),
}));

describe('NotFound client fallback', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    // Replace window.location so each test can set pathname independently.
    // @ts-expect-error — test reassignment of read-only property
    delete window.location;
    // @ts-expect-error — test reassignment of read-only property
    window.location = { ...originalLocation, pathname: '/' } as Location;
  });

  afterAll(() => {
    // @ts-expect-error — restore
    window.location = originalLocation;
  });

  it('renders GalleryPageClient for a known portfolio category path (post-deploy gallery)', async () => {
    window.location.pathname = '/portfolio/brands/new-gallery-post-deploy/';
    render(<NotFound />);

    const client = await screen.findByTestId('gallery-client');
    expect(client).toHaveTextContent('brands/new-gallery-post-deploy');
    // The 404 UI should NOT be present when we matched a gallery path.
    expect(screen.queryByRole('heading', { name: /Page Not Found/i })).not.toBeInTheDocument();
  });

  it('renders the standard 404 UI for an unknown path', async () => {
    window.location.pathname = '/totally-unknown-page';
    render(<NotFound />);

    expect(await screen.findByRole('heading', { name: /Page Not Found/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Return Home/i })).toHaveAttribute('href', '/');
    expect(screen.queryByTestId('gallery-client')).not.toBeInTheDocument();
  });

  it('does NOT treat unknown categories as gallery paths', async () => {
    window.location.pathname = '/portfolio/notacategory/foo/';
    render(<NotFound />);

    expect(await screen.findByRole('heading', { name: /Page Not Found/i })).toBeInTheDocument();
    expect(screen.queryByTestId('gallery-client')).not.toBeInTheDocument();
  });

  it('does NOT treat /portfolio/{category} (single segment) as a gallery path', async () => {
    window.location.pathname = '/portfolio/brands/';
    render(<NotFound />);

    expect(await screen.findByRole('heading', { name: /Page Not Found/i })).toBeInTheDocument();
    expect(screen.queryByTestId('gallery-client')).not.toBeInTheDocument();
  });
});
