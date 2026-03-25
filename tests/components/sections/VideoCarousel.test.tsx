import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VideoCarousel } from '@/components/sections/VideoCarousel';

const mockGetVideoPreviews = vi.hoisted(() => vi.fn());

vi.mock('@/lib/api', () => ({
  publicGalleries: {
    getVideoPreviews: mockGetVideoPreviews,
  },
}));

vi.mock('@/lib/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/utils')>();
  return {
    ...actual,
    getImageUrl: (key: string) => `https://cdn.example.com/${key}`,
  };
});

describe('VideoCarousel', () => {
  let playSpy: ReturnType<typeof vi.spyOn>;
  let pauseSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    // jsdom: play() is not fully implemented and does not return a Promise
    playSpy = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(
      undefined as unknown as Promise<void>
    );
    pauseSpy = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
    const mockObserver = vi.fn().mockImplementation((callback: IntersectionObserverCallback) => ({
      observe: (el: Element) => {
        callback([{ isIntersecting: true, target: el } as IntersectionObserverEntry], {} as IntersectionObserver);
      },
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    }));
    vi.stubGlobal('IntersectionObserver', mockObserver);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows loading skeleton until previews resolve', () => {
    mockGetVideoPreviews.mockImplementation(() => new Promise(() => {}));
    render(<VideoCarousel fallback={<span>Fallback</span>} />);
    expect(document.querySelector('.animate-pulse')).toBeTruthy();
  });

  it('renders fallback when there are no previews', async () => {
    mockGetVideoPreviews.mockResolvedValue({ previews: [] });
    render(<VideoCarousel fallback={<span>Fallback card</span>} />);
    await waitFor(() => {
      expect(screen.getByText('Fallback card')).toBeInTheDocument();
    });
  });

  it('renders preview title and videography label when previews load', async () => {
    mockGetVideoPreviews.mockResolvedValue({
      previews: [
        {
          previewKey: 'video-previews/a-preview.mp4',
          title: 'Brand Film',
          galleryId: 'g1',
          category: 'brands',
          gallerySlug: 'brand-film',
        },
      ],
    });
    render(<VideoCarousel fallback={<span>FB</span>} />);
    await waitFor(() => {
      expect(screen.getByText('videography')).toBeInTheDocument();
      expect(screen.getByText('Brand Film')).toBeInTheDocument();
    });
    expect(document.querySelector('video')).toBeTruthy();
  });

  it('cycles to next preview when Next is clicked', async () => {
    const user = userEvent.setup();
    mockGetVideoPreviews.mockResolvedValue({
      previews: [
        {
          previewKey: 'p1.mp4',
          title: 'First',
          galleryId: 'g1',
          category: 'brands',
          gallerySlug: 'a',
        },
        {
          previewKey: 'p2.mp4',
          title: 'Second',
          galleryId: 'g2',
          category: 'brands',
          gallerySlug: 'b',
        },
      ],
    });
    render(<VideoCarousel fallback={<span>FB</span>} />);
    await waitFor(() => screen.getByText('First'));

    await user.click(screen.getByRole('button', { name: 'Next video' }));
    await waitFor(() => {
      expect(screen.getByText('Second')).toBeInTheDocument();
    });
  });

  it('cycles to previous preview when Previous is clicked', async () => {
    const user = userEvent.setup();
    mockGetVideoPreviews.mockResolvedValue({
      previews: [
        {
          previewKey: 'p1.mp4',
          title: 'First',
          galleryId: 'g1',
          category: 'brands',
          gallerySlug: 'a',
        },
        {
          previewKey: 'p2.mp4',
          title: 'Second',
          galleryId: 'g2',
          category: 'brands',
          gallerySlug: 'b',
        },
      ],
    });
    render(<VideoCarousel fallback={<span>FB</span>} />);
    await waitFor(() => screen.getByText('First'));
    await user.click(screen.getByRole('button', { name: 'Previous video' }));
    await waitFor(() => {
      expect(screen.getByText('Second')).toBeInTheDocument();
    });
  });

  it('advances when the current video fires ended', async () => {
    mockGetVideoPreviews.mockResolvedValue({
      previews: [
        {
          previewKey: 'p1.mp4',
          title: 'First',
          galleryId: 'g1',
          category: 'brands',
          gallerySlug: 'a',
        },
        {
          previewKey: 'p2.mp4',
          title: 'Second',
          galleryId: 'g2',
          category: 'brands',
          gallerySlug: 'b',
        },
      ],
    });
    render(<VideoCarousel fallback={<span>FB</span>} />);
    await waitFor(() => screen.getByText('First'));
    const video = document.querySelector('video');
    expect(video).toBeTruthy();
    fireEvent.ended(video!);
    await waitFor(() => {
      expect(screen.getByText('Second')).toBeInTheDocument();
    });
  });

  it('restarts a single preview when video ends', async () => {
    mockGetVideoPreviews.mockResolvedValue({
      previews: [
        {
          previewKey: 'solo.mp4',
          title: 'Solo',
          galleryId: 'g1',
          category: 'brands',
          gallerySlug: 'a',
        },
      ],
    });
    render(<VideoCarousel fallback={<span>FB</span>} />);
    await waitFor(() => screen.getByText('Solo'));
    playSpy.mockClear();
    const video = document.querySelector('video');
    fireEvent.ended(video!);
    expect(playSpy).toHaveBeenCalled();
  });

  it('links to portfolio videography when preview has no youtubeUrl', async () => {
    mockGetVideoPreviews.mockResolvedValue({
      previews: [
        {
          previewKey: 'local.mp4',
          title: 'Local reel',
          galleryId: 'g1',
          category: 'brands',
          gallerySlug: 'a',
        },
      ],
    });
    render(<VideoCarousel fallback={<span>FB</span>} />);
    await waitFor(() => {
      const link = screen.getByRole('link', { name: /view local reel/i });
      expect(link).toHaveAttribute('href', '/portfolio/videography');
      expect(link).not.toHaveAttribute('target');
    });
  });

  it('links to YouTube when preview provides youtubeUrl', async () => {
    mockGetVideoPreviews.mockResolvedValue({
      previews: [
        {
          previewKey: 'yt.mp4',
          title: 'Promo',
          youtubeUrl: 'https://www.youtube.com/watch?v=abc',
          galleryId: 'g1',
          category: 'brands',
          gallerySlug: 'a',
        },
      ],
    });
    render(<VideoCarousel fallback={<span>FB</span>} />);
    await waitFor(() => {
      const link = screen.getByRole('link', { name: /view promo/i });
      expect(link).toHaveAttribute('href', 'https://www.youtube.com/watch?v=abc');
      expect(link).toHaveAttribute('target', '_blank');
    });
  });

  it('selects preview via dot indicator', async () => {
    const user = userEvent.setup();
    mockGetVideoPreviews.mockResolvedValue({
      previews: [
        {
          previewKey: 'p1.mp4',
          title: 'First',
          galleryId: 'g1',
          category: 'brands',
          gallerySlug: 'a',
        },
        {
          previewKey: 'p2.mp4',
          title: 'Second',
          galleryId: 'g2',
          category: 'brands',
          gallerySlug: 'b',
        },
      ],
    });
    render(<VideoCarousel fallback={<span>FB</span>} />);
    await waitFor(() => screen.getByText('First'));
    await user.click(screen.getByRole('button', { name: 'Go to video 2' }));
    await waitFor(() => {
      expect(screen.getByText('Second')).toBeInTheDocument();
    });
  });

  it('pauses on hover and resumes on unhover', async () => {
    const user = userEvent.setup();
    mockGetVideoPreviews.mockResolvedValue({
      previews: [
        {
          previewKey: 'h.mp4',
          title: 'Hover me',
          galleryId: 'g1',
          category: 'brands',
          gallerySlug: 'a',
        },
      ],
    });
    render(<VideoCarousel fallback={<span>FB</span>} />);
    await waitFor(() => screen.getByText('Hover me'));
    const region = screen.getByText('Hover me').closest('div.group');
    expect(region).toBeTruthy();
    pauseSpy.mockClear();
    await user.hover(region!);
    expect(pauseSpy).toHaveBeenCalled();
    playSpy.mockClear();
    await user.unhover(region!);
    expect(playSpy).toHaveBeenCalled();
  });

  it('handles touch start and end on the carousel surface', async () => {
    mockGetVideoPreviews.mockResolvedValue({
      previews: [
        {
          previewKey: 't.mp4',
          title: 'Touch',
          galleryId: 'g1',
          category: 'brands',
          gallerySlug: 'a',
        },
      ],
    });
    render(<VideoCarousel fallback={<span>FB</span>} />);
    await waitFor(() => screen.getByText('Touch'));
    const region = screen.getByText('Touch').closest('div.group');
    expect(region).toBeTruthy();
    pauseSpy.mockClear();
    fireEvent.touchStart(region!);
    expect(pauseSpy).toHaveBeenCalled();
    playSpy.mockClear();
    fireEvent.touchEnd(region!);
    expect(playSpy).toHaveBeenCalled();
  });
});
