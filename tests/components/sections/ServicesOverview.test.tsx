import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ServicesOverview } from '@/components/sections/ServicesOverview';

const mockGetFeaturedImages = vi.hoisted(() => vi.fn());
const mockGetVideoPreviews = vi.hoisted(() => vi.fn());

// Mock the API to prevent real network calls
vi.mock('@/lib/api', () => ({
  publicGalleries: {
    getFeaturedImages: mockGetFeaturedImages,
    getVideoPreviews: mockGetVideoPreviews,
  },
}));

vi.mock('@/lib/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/utils')>();
  return {
    ...actual,
    getImageUrl: (key: string, size?: string) =>
      `https://cdn.example.com/${key}${size ? `?s=${size}` : ''}`,
  };
});

// Mock IntersectionObserver
beforeEach(() => {
  mockGetFeaturedImages.mockResolvedValue({ images: [] });
  mockGetVideoPreviews.mockResolvedValue({ previews: [] });
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined as unknown as Promise<void>);
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
  const mockObserver = vi.fn().mockImplementation((callback: IntersectionObserverCallback) => {
    // Immediately trigger visibility for all observed elements
    return {
      observe: (el: Element) => {
        callback(
          [{ isIntersecting: true, target: el } as IntersectionObserverEntry],
          {} as IntersectionObserver
        );
      },
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    };
  });
  vi.stubGlobal('IntersectionObserver', mockObserver);
});

afterEach(() => {
  vi.restoreAllMocks();
});

/** Wait for carousel hooks to finish async work (avoids act() warnings). */
async function renderServicesOverview() {
  const view = render(<ServicesOverview />);
  await waitFor(() => {
    expect(mockGetFeaturedImages).toHaveBeenCalled();
    expect(mockGetVideoPreviews).toHaveBeenCalled();
  });
  return view;
}

describe('ServicesOverview', () => {
  it('renders the section header', async () => {
    await renderServicesOverview();
    expect(screen.getByText('Find Your Solution')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Services Provided' })).toBeInTheDocument();
  });

  it('does not render the old subtitle', async () => {
    await renderServicesOverview();
    expect(
      screen.queryByText(/every project receives complete creative and technical attention/i)
    ).not.toBeInTheDocument();
  });

  it('renders all service titles', async () => {
    await renderServicesOverview();
    expect(screen.getByText('Photography')).toBeInTheDocument();
    expect(screen.getByText('Videography')).toBeInTheDocument();
    expect(screen.getByText('Commercial Drone')).toBeInTheDocument();
    expect(screen.getByText('AI & Software')).toBeInTheDocument();
    expect(screen.getByText('Colorado Notary')).toBeInTheDocument();
  });

  it('renders service descriptions', async () => {
    await renderServicesOverview();
    expect(screen.getByText(/From brand imagery to portraits and events/i)).toBeInTheDocument();
    expect(screen.getByText(/High-quality video content for brands/i)).toBeInTheDocument();
    expect(screen.getByText(/FAA-compliant aerial imagery/i)).toBeInTheDocument();
    expect(screen.getByText(/From AI strategy and custom model integration/i)).toBeInTheDocument();
    expect(screen.getByText(/Convenient in-person notary services/i)).toBeInTheDocument();
  });

  it('renders service links with correct hrefs', async () => {
    await renderServicesOverview();
    const links = screen.getAllByRole('link');
    const hrefs = links.map((l) => l.getAttribute('href'));
    expect(hrefs).toContain('/services/photography');
    expect(hrefs).toContain('/services/videography');
    expect(hrefs).toContain('/services/commercial-drone');
    expect(hrefs).toContain('/services/ai-software');
    expect(hrefs).toContain('/services/notary');
  });

  it('renders Explore CTA for each service', async () => {
    await renderServicesOverview();
    expect(screen.getByText(/Explore photography/i)).toBeInTheDocument();
    expect(screen.getByText(/Explore videography/i)).toBeInTheDocument();
    expect(screen.getByText(/Explore commercial drone/i)).toBeInTheDocument();
    expect(screen.getByText(/Explore ai & software/i)).toBeInTheDocument();
    expect(screen.getByText(/Explore colorado notary/i)).toBeInTheDocument();
  });

  it('renders View all services link', async () => {
    await renderServicesOverview();
    const viewAllLink = screen.getByRole('link', { name: /view all services/i });
    expect(viewAllLink).toBeInTheDocument();
    expect(viewAllLink).toHaveAttribute('href', '/services');
  });

  it('renders feature lists for services', async () => {
    await renderServicesOverview();
    // Check a few features from different services
    expect(screen.getByText('Brand & product photography')).toBeInTheDocument();
    expect(screen.getByText('Brand films')).toBeInTheDocument();
    expect(screen.getByText('Aerial photography')).toBeInTheDocument();
    expect(screen.getByText('AI consulting & strategy')).toBeInTheDocument();
  });

  it('renders inline video carousel when video previews are available', async () => {
    mockGetVideoPreviews.mockResolvedValue({
      previews: [
        {
          previewKey: 'video-previews/x.mp4',
          title: 'Client reel',
          galleryId: 'g1',
          category: 'brands',
          gallerySlug: 'reel',
        },
      ],
    });
    render(<ServicesOverview />);
    await waitFor(() => {
      expect(screen.getByText('Client reel')).toBeInTheDocument();
    });
    expect(document.querySelector('video')).toBeTruthy();
  });

  it('advances inline video carousel with next control', async () => {
    const user = userEvent.setup();
    mockGetVideoPreviews.mockResolvedValue({
      previews: [
        {
          previewKey: 'a.mp4',
          title: 'One',
          galleryId: 'g1',
          category: 'brands',
          gallerySlug: 'a',
        },
        {
          previewKey: 'b.mp4',
          title: 'Two',
          galleryId: 'g2',
          category: 'brands',
          gallerySlug: 'b',
        },
      ],
    });
    render(<ServicesOverview />);
    await waitFor(() => screen.getByText('One'));
    await user.click(screen.getByRole('button', { name: 'Next video' }));
    await waitFor(() => {
      expect(screen.getByText('Two')).toBeInTheDocument();
    });
  });

  it('uses previous control on inline video carousel', async () => {
    const user = userEvent.setup();
    mockGetVideoPreviews.mockResolvedValue({
      previews: [
        {
          previewKey: 'a.mp4',
          title: 'One',
          galleryId: 'g1',
          category: 'brands',
          gallerySlug: 'a',
        },
        {
          previewKey: 'b.mp4',
          title: 'Two',
          galleryId: 'g2',
          category: 'brands',
          gallerySlug: 'b',
        },
      ],
    });
    render(<ServicesOverview />);
    await waitFor(() => screen.getByText('One'));
    await user.click(screen.getByRole('button', { name: 'Previous video' }));
    await waitFor(() => {
      expect(screen.getByText('Two')).toBeInTheDocument();
    });
  });

  it('selects inline video via dot control', async () => {
    const user = userEvent.setup();
    mockGetVideoPreviews.mockResolvedValue({
      previews: [
        {
          previewKey: 'a.mp4',
          title: 'One',
          galleryId: 'g1',
          category: 'brands',
          gallerySlug: 'a',
        },
        {
          previewKey: 'b.mp4',
          title: 'Two',
          galleryId: 'g2',
          category: 'brands',
          gallerySlug: 'b',
        },
      ],
    });
    render(<ServicesOverview />);
    await waitFor(() => screen.getByText('One'));
    await user.click(screen.getByRole('button', { name: 'Video 2' }));
    await waitFor(() => {
      expect(screen.getByText('Two')).toBeInTheDocument();
    });
  });
});
