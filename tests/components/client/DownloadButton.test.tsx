import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DownloadButton } from '@/components/client/DownloadButton';

const mockGetDownloadUrl = vi.hoisted(() => vi.fn());
const mockClick = vi.hoisted(() => vi.fn());

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
  return {
    ...actual,
    clientGallery: {
      ...actual.clientGallery,
      getDownloadUrl: mockGetDownloadUrl,
    },
  };
});

describe('DownloadButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDownloadUrl.mockResolvedValue({
      downloadUrl: 'https://downloads.example.com/file.jpg',
    });

    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(mockClick);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('downloads full size image from default variant', async () => {
    const user = userEvent.setup();
    render(<DownloadButton galleryId="g1" imageKey="img-key" />);

    await user.click(screen.getByRole('button', { name: 'Full Size' }));

    await waitFor(() => {
      expect(mockGetDownloadUrl).toHaveBeenCalledWith('g1', 'img-key', 'full');
      expect(mockClick).toHaveBeenCalledTimes(1);
    });
  });

  it('opens icon menu and downloads web size', async () => {
    const user = userEvent.setup();
    render(<DownloadButton galleryId="g1" imageKey="img-key" variant="icon" />);

    await user.click(screen.getByRole('button', { name: 'Download image' }));
    expect(screen.getByRole('button', { name: 'Web Size' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Web Size' }));
    await waitFor(() => {
      expect(mockGetDownloadUrl).toHaveBeenCalledWith('g1', 'img-key', 'web');
    });
  });

  it('silently handles download failures and recovers loading state', async () => {
    mockGetDownloadUrl.mockRejectedValueOnce(new Error('failed'));
    const user = userEvent.setup();
    render(<DownloadButton galleryId="g1" imageKey="img-key" />);

    await user.click(screen.getByRole('button', { name: 'Web Size' }));
    await waitFor(() => {
      expect(mockGetDownloadUrl).toHaveBeenCalledWith('g1', 'img-key', 'web');
    });

    expect(screen.getByRole('button', { name: 'Web Size' })).toBeEnabled();
  });
});
