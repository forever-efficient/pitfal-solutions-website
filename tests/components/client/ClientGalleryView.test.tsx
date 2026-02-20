import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ClientGalleryView } from '@/components/client/ClientGalleryView';

const mockClientGalleryGet = vi.hoisted(() => vi.fn());
const mockClientLogout = vi.hoisted(() => vi.fn());
const mockUseBulkDownload = vi.hoisted(() => vi.fn());
const mockStartBulkDownload = vi.hoisted(() => vi.fn());
const mockClearBulkError = vi.hoisted(() => vi.fn());

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
  return {
    ...actual,
    clientGallery: {
      ...actual.clientGallery,
      get: mockClientGalleryGet,
    },
    clientAuth: {
      ...actual.clientAuth,
      logout: mockClientLogout,
    },
  };
});

vi.mock('@/components/client/useBulkDownload', () => ({
  useBulkDownload: (galleryId: string) => mockUseBulkDownload(galleryId),
}));

vi.mock('@/components/client/DownloadButton', () => ({
  DownloadButton: ({ imageKey }: { imageKey: string }) => (
    <button type="button">Download {imageKey}</button>
  ),
}));

vi.mock('@/components/client/ImageComment', () => ({
  ImageComment: ({
    imageKey,
    onCommentAdded,
  }: {
    imageKey: string;
    onCommentAdded: (comment: {
      id: string;
      imageKey: string;
      author: string;
      text: string;
      createdAt: string;
    }) => void;
  }) => (
    <button
      type="button"
      onClick={() =>
        onCommentAdded({
          id: 'new-comment',
          imageKey,
          author: 'Tester',
          text: 'Looks good',
          createdAt: '2025-01-01T00:00:00.000Z',
        })
      }
    >
      Add Mock Comment
    </button>
  ),
}));

const galleryResponse = {
  gallery: {
    title: 'Client Wedding',
    description: 'A full wedding day story',
    images: [
      { key: 'finished/g1/one.jpg', alt: 'One' },
      { key: 'finished/g1/two.jpg', alt: 'Two' },
      { key: 'finished/g1/three.jpg', alt: 'Three' },
      { key: 'finished/g1/four.jpg', alt: 'Four' },
    ],
    heroImage: 'finished/g1/hero.jpg',
    sections: [
      {
        id: 's1',
        title: 'Ceremony',
        description: 'Main event',
        images: ['finished/g1/one.jpg', 'finished/g1/two.jpg'],
      },
      {
        id: 's2',
        title: 'Reception',
        description: 'Party',
        images: ['finished/g1/three.jpg'],
      },
    ],
    category: 'events',
    heroFocalPoint: { x: 45, y: 35 },
    heroZoom: 1.15,
    heroGradientOpacity: 0.4,
    heroHeight: 'lg' as const,
  },
  comments: [
    {
      id: 'c1',
      imageKey: 'finished/g1/two.jpg',
      author: 'Alex',
      text: 'Beautiful',
      createdAt: '2025-01-01T00:00:00.000Z',
    },
  ],
};

function setBulkState(
  state: Partial<{
    isDownloading: boolean;
    progress: { current: number; total: number } | null;
    error: string | null;
  }> = {}
) {
  mockUseBulkDownload.mockReturnValue({
    isDownloading: false,
    progress: null,
    error: null,
    clearError: mockClearBulkError,
    startBulkDownload: mockStartBulkDownload,
    ...state,
  });
}

describe('ClientGalleryView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClientLogout.mockResolvedValue({ authenticated: false });
    mockClientGalleryGet.mockResolvedValue(galleryResponse);
    setBulkState();
  });

  it('shows loading state before gallery fetch resolves', () => {
    mockClientGalleryGet.mockReturnValue(new Promise(() => {}));
    render(<ClientGalleryView galleryId="g1" />);
    expect(screen.getByText('Loading gallery...')).toBeInTheDocument();
  });

  it('renders error state and supports logout action', async () => {
    const user = userEvent.setup();
    mockClientGalleryGet.mockRejectedValueOnce(new Error('Failed to load gallery'));

    render(<ClientGalleryView galleryId="g1" />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load gallery')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Back to Login' }));
    await waitFor(() => {
      expect(mockClientLogout).toHaveBeenCalledTimes(1);
    });
  });

  it('renders sectioned gallery with hero and lightbox navigation', async () => {
    const user = userEvent.setup();
    render(<ClientGalleryView galleryId="g1" initialTitle="Preview Title" />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Preview Title' })).toBeInTheDocument();
    });

    expect(screen.getByAltText('Gallery Cover')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Ceremony' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Reception' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Other Photos' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'One' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('1 / 4')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('2 / 4')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(screen.getByText('3 / 4')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(screen.getByText('2 / 4')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('triggers hero and section bulk downloads via menu actions', async () => {
    const user = userEvent.setup();
    render(<ClientGalleryView galleryId="g1" requiresPassword={true} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Download All (4 images)' })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Download All (4 images)' }));
    await user.click(screen.getByRole('button', { name: 'Full Size' }));

    expect(mockStartBulkDownload).toHaveBeenCalledWith(
      [
        'finished/g1/one.jpg',
        'finished/g1/two.jpg',
        'finished/g1/three.jpg',
        'finished/g1/four.jpg',
      ],
      'full'
    );

    const sectionButtons = screen.getAllByRole('button', {
      name: 'Download section (2 images)',
    });
    await user.click(sectionButtons[0]!);
    await user.click(screen.getByRole('button', { name: 'Web Size' }));

    expect(mockStartBulkDownload).toHaveBeenCalledWith(
      ['finished/g1/one.jpg', 'finished/g1/two.jpg'],
      'web'
    );
  });

  it('opens lightbox with requiresPassword and supports adding a comment', async () => {
    const user = userEvent.setup();

    render(<ClientGalleryView galleryId="g1" requiresPassword={true} />);
    await waitFor(() => expect(screen.getByAltText('Gallery Cover')).toBeInTheDocument());

    // Sign Out visible when requiresPassword=true
    expect(screen.getByRole('button', { name: 'Sign Out' })).toBeInTheDocument();

    // Open lightbox — exercises the requiresPassword && <DownloadButton> branch
    await user.click(screen.getByRole('button', { name: 'One' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('1 / 4')).toBeInTheDocument();

    // Add a comment — covers handleCommentAdded
    await user.click(screen.getByRole('button', { name: 'Add Mock Comment' }));

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('hides sign out and download buttons when requiresPassword is false', async () => {
    render(<ClientGalleryView galleryId="g1" requiresPassword={false} />);
    await waitFor(() => expect(screen.getByAltText('Gallery Cover')).toBeInTheDocument());

    expect(screen.queryByRole('button', { name: 'Sign Out' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Download All/ })).not.toBeInTheDocument();
  });

  it('renders header bulk download variant and dismisses hook error', async () => {
    setBulkState({
      isDownloading: true,
      progress: { current: 1, total: 2 },
      error: 'Bulk failed',
    });
    mockClientGalleryGet.mockResolvedValueOnce({
      ...galleryResponse,
      gallery: {
        ...galleryResponse.gallery,
        heroImage: null,
        sections: [],
      },
    });

    const user = userEvent.setup();
    render(<ClientGalleryView galleryId="g1" requiresPassword={true} />);

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Download All (4 images)' })
      ).toHaveTextContent('Downloading 1 of 2');
    });

    expect(screen.getByText('Bulk failed')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Dismiss error' }));
    expect(mockClearBulkError).toHaveBeenCalledTimes(1);
  });
});
