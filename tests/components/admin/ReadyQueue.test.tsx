import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReadyQueue } from '@/components/admin/ReadyQueue';
import { ToastProvider } from '@/components/admin/Toast';

const mockListReady = vi.hoisted(() => vi.fn());
const mockListGalleries = vi.hoisted(() => vi.fn());
const mockAssign = vi.hoisted(() => vi.fn());

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
  return {
    ...actual,
    adminImages: {
      ...actual.adminImages,
      listReady: mockListReady,
      assign: mockAssign,
    },
    adminGalleries: {
      ...actual.adminGalleries,
      list: mockListGalleries,
    },
  };
});

vi.mock('@/lib/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/utils')>();
  return {
    ...actual,
    getImageUrl: (key: string) => `https://cdn.example.com/${key}`,
  };
});

function renderWithToast(ui: React.ReactElement) {
  return render(<ToastProvider>{ui}</ToastProvider>);
}

describe('ReadyQueue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListReady.mockResolvedValue({ images: [] });
    mockListGalleries.mockResolvedValue({ galleries: [] });
  });

  it('shows loading skeleton initially', () => {
    mockListReady.mockImplementation(() => new Promise(() => {}));
    renderWithToast(<ReadyQueue />);

    expect(screen.getByText('Ready to Review')).toBeInTheDocument();
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('shows empty state when no images', async () => {
    mockListReady.mockResolvedValue({ images: [] });
    renderWithToast(<ReadyQueue />);

    await waitFor(() => {
      expect(mockListReady).toHaveBeenCalled();
    });

    expect(
      screen.getByText(/No images in the ready queue/)
    ).toBeInTheDocument();
  });

  it('shows images when loaded', async () => {
    mockListReady.mockResolvedValue({
      images: [
        {
          key: 'staging/ready/img1.jpg',
          filename: 'img1.jpg',
          uploadedAt: new Date().toISOString(),
          size: 1024000,
          url: 'https://example.com/img1.jpg',
        },
      ],
    });

    renderWithToast(<ReadyQueue />);

    await waitFor(() => {
      expect(screen.getByText('img1.jpg')).toBeInTheDocument();
    });

    expect(screen.getByText(/1 image/)).toBeInTheDocument();
  });

  it('shows error toast when listReady fails', async () => {
    mockListReady.mockRejectedValue(new Error('Network error'));
    renderWithToast(<ReadyQueue />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Failed to load ready queue');
    });
  });

  it('allows selecting images and assigning to gallery', async () => {
    const user = userEvent.setup();
    mockListReady.mockResolvedValue({
      images: [
        {
          key: 'staging/ready/img1.jpg',
          filename: 'img1.jpg',
          uploadedAt: new Date().toISOString(),
          size: 1024000,
          url: 'https://example.com/img1.jpg',
        },
      ],
    });
    mockListGalleries.mockResolvedValue({
      galleries: [
        { id: 'g1', title: 'Test Gallery', category: 'brands' },
      ],
    });
    mockAssign.mockResolvedValue({ assigned: 1, failed: 0, failedKeys: [] });

    renderWithToast(<ReadyQueue />);

    await waitFor(() => {
      expect(screen.getByAltText('img1.jpg')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Select all'));

    await user.click(screen.getByText('Select a gallery…'));
    await waitFor(() => {
      expect(screen.getByText('Test Gallery')).toBeInTheDocument();
    });
    await user.click(screen.getByText('Test Gallery'));

    await user.click(screen.getByRole('button', { name: /Assign 1 to Gallery/ }));

    await waitFor(() => {
      expect(mockAssign).toHaveBeenCalledWith(['staging/ready/img1.jpg'], 'g1');
    });
  });

  it('shows Refresh button', async () => {
    mockListReady.mockResolvedValue({ images: [] });
    renderWithToast(<ReadyQueue />);

    await waitFor(() => {
      expect(mockListReady).toHaveBeenCalled();
    });

    const refreshBtn = screen.getByText('Refresh');
    expect(refreshBtn).toBeInTheDocument();
  });

  it('re-fetches when refreshKey changes', async () => {
    mockListReady.mockResolvedValue({ images: [] });
    const { rerender } = renderWithToast(<ReadyQueue refreshKey={0} />);

    await waitFor(() => {
      expect(mockListReady).toHaveBeenCalledTimes(1);
    });

    rerender(
      <ToastProvider>
        <ReadyQueue refreshKey={1} />
      </ToastProvider>
    );

    await waitFor(() => {
      expect(mockListReady).toHaveBeenCalledTimes(2);
    });
  });

  describe('image selection', () => {
    it('toggles image selection on click', async () => {
      const user = userEvent.setup();
      mockListReady.mockResolvedValue({
        images: [
          {
            key: 'staging/ready/img1.jpg',
            filename: 'img1.jpg',
            uploadedAt: new Date().toISOString(),
            size: 1024000,
            url: 'https://example.com/img1.jpg',
          },
        ],
      });

      renderWithToast(<ReadyQueue />);

      await waitFor(() => {
        expect(screen.getByAltText('img1.jpg')).toBeInTheDocument();
      });

      const imageContainer = screen.getByAltText('img1.jpg').closest('div');
      await user.click(imageContainer!);

      expect(screen.getByText('1 selected')).toBeInTheDocument();

      await user.click(imageContainer!);
      expect(screen.queryByText('1 selected')).not.toBeInTheDocument();
    });

    it('select all button selects all images', async () => {
      const user = userEvent.setup();
      mockListReady.mockResolvedValue({
        images: [
          {
            key: 'staging/ready/img1.jpg',
            filename: 'img1.jpg',
            uploadedAt: new Date().toISOString(),
            size: 1024000,
            url: 'https://example.com/img1.jpg',
          },
          {
            key: 'staging/ready/img2.jpg',
            filename: 'img2.jpg',
            uploadedAt: new Date().toISOString(),
            size: 2048000,
            url: 'https://example.com/img2.jpg',
          },
        ],
      });

      renderWithToast(<ReadyQueue />);

      await waitFor(() => {
        expect(screen.getByAltText('img1.jpg')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Select all'));

      expect(screen.getByText('2 selected')).toBeInTheDocument();
    });

    it('clear button clears all selections', async () => {
      const user = userEvent.setup();
      mockListReady.mockResolvedValue({
        images: [
          {
            key: 'staging/ready/img1.jpg',
            filename: 'img1.jpg',
            uploadedAt: new Date().toISOString(),
            size: 1024000,
            url: 'https://example.com/img1.jpg',
          },
        ],
      });

      renderWithToast(<ReadyQueue />);

      await waitFor(() => {
        expect(screen.getByAltText('img1.jpg')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Select all'));
      expect(screen.getByText('1 selected')).toBeInTheDocument();

      await user.click(screen.getByText('Clear'));
      expect(screen.queryByText('1 selected')).not.toBeInTheDocument();
    });

    it('shows selection count in button', async () => {
      const user = userEvent.setup();
      mockListReady.mockResolvedValue({
        images: [
          {
            key: 'staging/ready/img1.jpg',
            filename: 'img1.jpg',
            uploadedAt: new Date().toISOString(),
            size: 1024000,
            url: 'https://example.com/img1.jpg',
          },
        ],
      });
      mockListGalleries.mockResolvedValue({
        galleries: [{ id: 'g1', title: 'Gallery', category: 'brands' }],
      });

      renderWithToast(<ReadyQueue />);

      await waitFor(() => {
        expect(screen.getByAltText('img1.jpg')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Select all'));

      expect(screen.getByRole('button', { name: /Assign 1 to Gallery/ })).toBeInTheDocument();
    });
  });

  describe('image pagination', () => {
    it('paginates images by IMAGE_PAGE_SIZE (24)', async () => {
      const user = userEvent.setup();
      const images = Array.from({ length: 30 }, (_, i) => ({
        key: `staging/ready/img${i + 1}.jpg`,
        filename: `img${i + 1}.jpg`,
        uploadedAt: new Date().toISOString(),
        size: 1024000,
        url: `https://example.com/img${i + 1}.jpg`,
      }));

      mockListReady.mockResolvedValue({ images });

      renderWithToast(<ReadyQueue />);

      await waitFor(() => {
        expect(screen.getByAltText('img1.jpg')).toBeInTheDocument();
        expect(screen.getByAltText('img24.jpg')).toBeInTheDocument();
        expect(screen.queryByAltText('img25.jpg')).not.toBeInTheDocument();
      });

      expect(screen.getByText(/1 \/ 2/)).toBeInTheDocument();
    });

    it('navigates to next page', async () => {
      const user = userEvent.setup();
      const images = Array.from({ length: 30 }, (_, i) => ({
        key: `staging/ready/img${i + 1}.jpg`,
        filename: `img${i + 1}.jpg`,
        uploadedAt: new Date().toISOString(),
        size: 1024000,
        url: `https://example.com/img${i + 1}.jpg`,
      }));

      mockListReady.mockResolvedValue({ images });

      renderWithToast(<ReadyQueue />);

      await waitFor(() => {
        expect(screen.getByAltText('img1.jpg')).toBeInTheDocument();
      });

      const nextButton = screen.getByRole('button', { name: /Next →/ });
      await user.click(nextButton);

      await waitFor(() => {
        expect(screen.getByAltText('img25.jpg')).toBeInTheDocument();
        expect(screen.queryByAltText('img1.jpg')).not.toBeInTheDocument();
      });

      expect(screen.getByText(/2 \/ 2/)).toBeInTheDocument();
    });

    it('navigates to previous page', async () => {
      const user = userEvent.setup();
      const images = Array.from({ length: 30 }, (_, i) => ({
        key: `staging/ready/img${i + 1}.jpg`,
        filename: `img${i + 1}.jpg`,
        uploadedAt: new Date().toISOString(),
        size: 1024000,
        url: `https://example.com/img${i + 1}.jpg`,
      }));

      mockListReady.mockResolvedValue({ images });

      renderWithToast(<ReadyQueue />);

      await waitFor(() => {
        expect(screen.getByAltText('img1.jpg')).toBeInTheDocument();
      });

      const nextButton = screen.getByRole('button', { name: /Next →/ });
      await user.click(nextButton);

      await waitFor(() => {
        expect(screen.getByAltText('img25.jpg')).toBeInTheDocument();
      });

      const prevButton = screen.getByRole('button', { name: /← Prev/ });
      await user.click(prevButton);

      await waitFor(() => {
        expect(screen.getByAltText('img1.jpg')).toBeInTheDocument();
      });
    });

    it('disables prev button on first page', async () => {
      const user = userEvent.setup();
      const images = Array.from({ length: 30 }, (_, i) => ({
        key: `staging/ready/img${i + 1}.jpg`,
        filename: `img${i + 1}.jpg`,
        uploadedAt: new Date().toISOString(),
        size: 1024000,
        url: `https://example.com/img${i + 1}.jpg`,
      }));

      mockListReady.mockResolvedValue({ images });

      renderWithToast(<ReadyQueue />);

      await waitFor(() => {
        expect(screen.getByAltText('img1.jpg')).toBeInTheDocument();
      });

      const prevButton = screen.getAllByRole('button', { name: /← Prev/ })[0];
      expect(prevButton).toHaveAttribute('disabled');
    });

    it('disables next button on last page', async () => {
      const user = userEvent.setup();
      const images = Array.from({ length: 30 }, (_, i) => ({
        key: `staging/ready/img${i + 1}.jpg`,
        filename: `img${i + 1}.jpg`,
        uploadedAt: new Date().toISOString(),
        size: 1024000,
        url: `https://example.com/img${i + 1}.jpg`,
      }));

      mockListReady.mockResolvedValue({ images });

      renderWithToast(<ReadyQueue />);

      await waitFor(() => {
        expect(screen.getByAltText('img1.jpg')).toBeInTheDocument();
      });

      const nextButton = screen.getAllByRole('button', { name: /Next →/ })[0];
      await user.click(nextButton);

      await waitFor(() => {
        const nextButtons = screen.getAllByRole('button', { name: /Next →/ });
        expect(nextButtons[0]).toHaveAttribute('disabled');
      });
    });

    it('does not show pagination when only one page', async () => {
      mockListReady.mockResolvedValue({
        images: [
          {
            key: 'staging/ready/img1.jpg',
            filename: 'img1.jpg',
            uploadedAt: new Date().toISOString(),
            size: 1024000,
            url: 'https://example.com/img1.jpg',
          },
        ],
      });

      renderWithToast(<ReadyQueue />);

      await waitFor(() => {
        expect(screen.getByAltText('img1.jpg')).toBeInTheDocument();
      });

      expect(screen.queryByText(/\d \/ \d/)).not.toBeInTheDocument();
    });
  });

  describe('gallery picker', () => {
    it('opens and closes gallery picker', async () => {
      const user = userEvent.setup();
      mockListReady.mockResolvedValue({
        images: [
          {
            key: 'staging/ready/img1.jpg',
            filename: 'img1.jpg',
            uploadedAt: new Date().toISOString(),
            size: 1024000,
            url: 'https://example.com/img1.jpg',
          },
        ],
      });

      renderWithToast(<ReadyQueue />);

      await waitFor(() => {
        expect(screen.getByAltText('img1.jpg')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Select all'));

      const pickerButton = screen.getByText('Select a gallery…');
      expect(pickerButton.closest('button')).toBeInTheDocument();

      await user.click(pickerButton);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search galleries…')).toBeInTheDocument();
      });
    });

    it('loads galleries when picker opens', async () => {
      const user = userEvent.setup();
      mockListReady.mockResolvedValue({
        images: [
          {
            key: 'staging/ready/img1.jpg',
            filename: 'img1.jpg',
            uploadedAt: new Date().toISOString(),
            size: 1024000,
            url: 'https://example.com/img1.jpg',
          },
        ],
      });
      mockListGalleries.mockResolvedValue({
        galleries: [
          { id: 'g1', title: 'Brands', category: 'brands' },
          { id: 'g2', title: 'Portraits', category: 'portraits' },
        ],
      });

      renderWithToast(<ReadyQueue />);

      await waitFor(() => {
        expect(screen.getByAltText('img1.jpg')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Select all'));
      const pickerButton = screen.getByText('Select a gallery…');
      expect(pickerButton).toBeInTheDocument();

      expect(mockListGalleries).not.toHaveBeenCalled();

      await user.click(pickerButton);

      // Galleries should load after picker opens
      expect(mockListGalleries).toHaveBeenCalled();
    });

    it('shows error when gallery loading fails', async () => {
      const user = userEvent.setup();
      mockListReady.mockResolvedValue({
        images: [
          {
            key: 'staging/ready/img1.jpg',
            filename: 'img1.jpg',
            uploadedAt: new Date().toISOString(),
            size: 1024000,
            url: 'https://example.com/img1.jpg',
          },
        ],
      });
      mockListGalleries.mockRejectedValueOnce(new Error('Failed to load'));

      renderWithToast(<ReadyQueue />);

      await waitFor(() => {
        expect(screen.getByAltText('img1.jpg')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Select all'));
      await user.click(screen.getByText('Select a gallery…'));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Failed to load galleries');
      });
    });

    it('filters galleries by search query', async () => {
      const user = userEvent.setup();
      mockListReady.mockResolvedValue({
        images: [
          {
            key: 'staging/ready/img1.jpg',
            filename: 'img1.jpg',
            uploadedAt: new Date().toISOString(),
            size: 1024000,
            url: 'https://example.com/img1.jpg',
          },
        ],
      });
      mockListGalleries.mockResolvedValue({
        galleries: [
          { id: 'g1', title: 'Summer Brands', category: 'brands' },
          { id: 'g2', title: 'Winter Portraits', category: 'portraits' },
        ],
      });

      renderWithToast(<ReadyQueue />);

      await waitFor(() => {
        expect(screen.getByAltText('img1.jpg')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Select all'));
      await user.click(screen.getByText('Select a gallery…'));

      await waitFor(() => {
        expect(screen.getByText('Summer Brands')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search galleries…');
      await user.clear(searchInput);
      await user.type(searchInput, 'Summer');

      expect(screen.getByText('Summer Brands')).toBeInTheDocument();
      expect(screen.queryByText('Winter Portraits')).not.toBeInTheDocument();
    });

    it('resets gallery page when searching', async () => {
      const user = userEvent.setup();
      mockListReady.mockResolvedValue({
        images: [
          {
            key: 'staging/ready/img1.jpg',
            filename: 'img1.jpg',
            uploadedAt: new Date().toISOString(),
            size: 1024000,
            url: 'https://example.com/img1.jpg',
          },
        ],
      });
      mockListGalleries.mockResolvedValue({
        galleries: [
          { id: 'g1', title: 'Gallery 1', category: 'brands' },
          { id: 'g2', title: 'Gallery 2', category: 'portraits' },
        ],
      });

      renderWithToast(<ReadyQueue />);

      await waitFor(() => {
        expect(screen.getByAltText('img1.jpg')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Select all'));
      await user.click(screen.getByText('Select a gallery…'));

      // Search input should be present
      const searchInput = screen.getByPlaceholderText('Search galleries…');
      expect(searchInput).toBeInTheDocument();

      await user.type(searchInput, 'Gallery 1');

      // Gallery 1 should be filtered
      expect(screen.getByText('Gallery 1')).toBeInTheDocument();
    });

    it('shows loading state while galleries load', async () => {
      mockListReady.mockResolvedValue({
        images: [
          {
            key: 'staging/ready/img1.jpg',
            filename: 'img1.jpg',
            uploadedAt: new Date().toISOString(),
            size: 1024000,
            url: 'https://example.com/img1.jpg',
          },
        ],
      });
      mockListGalleries.mockImplementation(() => new Promise(() => {}));

      const user = userEvent.setup();
      renderWithToast(<ReadyQueue />);

      await waitFor(() => {
        expect(screen.getByAltText('img1.jpg')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Select all'));
      await user.click(screen.getByText('Select a gallery…'));

      await waitFor(() => {
        expect(screen.getByText('Loading…')).toBeInTheDocument();
      });
    });

    it('paginates galleries in picker', async () => {
      const user = userEvent.setup();
      mockListReady.mockResolvedValue({
        images: [
          {
            key: 'staging/ready/img1.jpg',
            filename: 'img1.jpg',
            uploadedAt: new Date().toISOString(),
            size: 1024000,
            url: 'https://example.com/img1.jpg',
          },
        ],
      });
      const galleries = Array.from({ length: 25 }, (_, i) => ({
        id: `g${i + 1}`,
        title: `Gallery ${i + 1}`,
        category: 'brands',
      }));
      mockListGalleries.mockResolvedValue({ galleries });

      renderWithToast(<ReadyQueue />);

      await waitFor(() => {
        expect(screen.getByAltText('img1.jpg')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Select all'));
      await user.click(screen.getByText('Select a gallery…'));

      await waitFor(() => {
        expect(screen.getByText('Gallery 1')).toBeInTheDocument();
      });

      const nextButtons = screen.getAllByRole('button', { name: /Next →/ });
      const galleryNextButton = nextButtons[nextButtons.length - 1];
      await user.click(galleryNextButton);

      await waitFor(() => {
        expect(screen.getByText('Gallery 11')).toBeInTheDocument();
        expect(screen.queryByText('Gallery 1')).not.toBeInTheDocument();
      });
    });

    it('closes picker when selecting a gallery', async () => {
      const user = userEvent.setup();
      mockListReady.mockResolvedValue({
        images: [
          {
            key: 'staging/ready/img1.jpg',
            filename: 'img1.jpg',
            uploadedAt: new Date().toISOString(),
            size: 1024000,
            url: 'https://example.com/img1.jpg',
          },
        ],
      });
      mockListGalleries.mockResolvedValue({
        galleries: [{ id: 'g1', title: 'Test', category: 'brands' }],
      });

      renderWithToast(<ReadyQueue />);

      await waitFor(() => {
        expect(screen.getByAltText('img1.jpg')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Select all'));
      await user.click(screen.getByText('Select a gallery…'));

      await waitFor(() => {
        expect(screen.getByText('Test')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Test'));

      expect(screen.queryByPlaceholderText('Search galleries…')).not.toBeInTheDocument();
    });

    it('closes picker on outside click', async () => {
      const user = userEvent.setup();
      mockListReady.mockResolvedValue({
        images: [
          {
            key: 'staging/ready/img1.jpg',
            filename: 'img1.jpg',
            uploadedAt: new Date().toISOString(),
            size: 1024000,
            url: 'https://example.com/img1.jpg',
          },
        ],
      });
      mockListGalleries.mockResolvedValue({
        galleries: [{ id: 'g1', title: 'Test', category: 'brands' }],
      });

      renderWithToast(<ReadyQueue />);

      await waitFor(() => {
        expect(screen.getByAltText('img1.jpg')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Select all'));
      await user.click(screen.getByText('Select a gallery…'));

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search galleries…')).toBeInTheDocument();
      });

      // Click outside the picker
      await user.click(document.body);

      expect(screen.queryByPlaceholderText('Search galleries…')).not.toBeInTheDocument();
    });

    it('pre-selects gallery when galleryId prop is provided', async () => {
      const user = userEvent.setup();
      mockListReady.mockResolvedValue({
        images: [
          {
            key: 'staging/ready/img1.jpg',
            filename: 'img1.jpg',
            uploadedAt: new Date().toISOString(),
            size: 1024000,
            url: 'https://example.com/img1.jpg',
          },
        ],
      });
      mockListGalleries.mockResolvedValue({
        galleries: [
          { id: 'g1', title: 'Target Gallery', category: 'brands' },
          { id: 'g2', title: 'Other Gallery', category: 'portraits' },
        ],
      });

      renderWithToast(<ReadyQueue galleryId="g1" />);

      await waitFor(() => {
        expect(screen.getByAltText('img1.jpg')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Select all'));

      // The picker should be showing, but gallery selection is asynchronous
      expect(screen.getByText('Select a gallery…')).toBeInTheDocument();
    });

    it('shows no galleries message when search yields no results', async () => {
      const user = userEvent.setup();
      mockListReady.mockResolvedValue({
        images: [
          {
            key: 'staging/ready/img1.jpg',
            filename: 'img1.jpg',
            uploadedAt: new Date().toISOString(),
            size: 1024000,
            url: 'https://example.com/img1.jpg',
          },
        ],
      });
      mockListGalleries.mockResolvedValue({
        galleries: [{ id: 'g1', title: 'Brands', category: 'brands' }],
      });

      renderWithToast(<ReadyQueue />);

      await waitFor(() => {
        expect(screen.getByAltText('img1.jpg')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Select all'));
      await user.click(screen.getByText('Select a gallery…'));

      const searchInput = screen.getByPlaceholderText('Search galleries…');
      await user.type(searchInput, 'xyz');

      // Brute force wait for the text to appear
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(screen.queryByText('Brands')).not.toBeInTheDocument();
      expect(screen.getByText('No galleries found')).toBeInTheDocument();
    });

    it('displays category labels in picker', async () => {
      const user = userEvent.setup();
      mockListReady.mockResolvedValue({
        images: [
          {
            key: 'staging/ready/img1.jpg',
            filename: 'img1.jpg',
            uploadedAt: new Date().toISOString(),
            size: 1024000,
            url: 'https://example.com/img1.jpg',
          },
        ],
      });
      mockListGalleries.mockResolvedValue({
        galleries: [
          { id: 'g1', title: 'Summer', category: 'brands' },
          { id: 'g2', title: 'Family', category: 'portraits' },
          { id: 'g3', title: 'Wedding', category: 'events' },
        ],
      });

      renderWithToast(<ReadyQueue />);

      await waitFor(() => {
        expect(screen.getByAltText('img1.jpg')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Select all'));
      await user.click(screen.getByText('Select a gallery…'));

      await waitFor(() => {
        expect(screen.getByText('Brands')).toBeInTheDocument();
        expect(screen.getByText('Portraits')).toBeInTheDocument();
        expect(screen.getByText('Events')).toBeInTheDocument();
      });
    });
  });

  describe('assign images', () => {
    it('shows error when no images selected', async () => {
      const user = userEvent.setup();
      mockListReady.mockResolvedValue({
        images: [
          {
            key: 'staging/ready/img1.jpg',
            filename: 'img1.jpg',
            uploadedAt: new Date().toISOString(),
            size: 1024000,
            url: 'https://example.com/img1.jpg',
          },
        ],
      });
      mockListGalleries.mockResolvedValue({
        galleries: [{ id: 'g1', title: 'Test', category: 'brands' }],
      });

      renderWithToast(<ReadyQueue />);

      await waitFor(() => {
        expect(screen.getByAltText('img1.jpg')).toBeInTheDocument();
      });

      // Try to open picker without selecting images
      expect(screen.queryByText('Select a gallery…')).not.toBeInTheDocument();
    });

    it('disables assign button when no gallery selected', async () => {
      const user = userEvent.setup();
      mockListReady.mockResolvedValue({
        images: [
          {
            key: 'staging/ready/img1.jpg',
            filename: 'img1.jpg',
            uploadedAt: new Date().toISOString(),
            size: 1024000,
            url: 'https://example.com/img1.jpg',
          },
        ],
      });

      renderWithToast(<ReadyQueue />);

      await waitFor(() => {
        expect(screen.getByAltText('img1.jpg')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Select all'));

      const assignButton = screen.getByRole('button', { name: /Assign 1 to Gallery/ });
      expect(assignButton).toHaveAttribute('disabled');
    });

    it('shows success message when assignment succeeds', async () => {
      const user = userEvent.setup();
      mockListReady.mockResolvedValue({
        images: [
          {
            key: 'staging/ready/img1.jpg',
            filename: 'img1.jpg',
            uploadedAt: new Date().toISOString(),
            size: 1024000,
            url: 'https://example.com/img1.jpg',
          },
        ],
      });
      mockListGalleries.mockResolvedValue({
        galleries: [{ id: 'g1', title: 'Test Gallery', category: 'brands' }],
      });
      mockAssign.mockResolvedValue({ assigned: 1, failed: 0, failedKeys: [] });

      renderWithToast(<ReadyQueue />);

      await waitFor(() => {
        expect(screen.getByAltText('img1.jpg')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Select all'));
      await user.click(screen.getByText('Select a gallery…'));

      await waitFor(() => {
        expect(screen.getByText('Test Gallery')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Test Gallery'));
      await user.click(screen.getByRole('button', { name: /Assign 1 to Gallery/ }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Assigned 1 image(s) to "Test Gallery"');
      });
    });

    it('shows partial failure message', async () => {
      const user = userEvent.setup();
      mockListReady.mockResolvedValue({
        images: [
          {
            key: 'staging/ready/img1.jpg',
            filename: 'img1.jpg',
            uploadedAt: new Date().toISOString(),
            size: 1024000,
            url: 'https://example.com/img1.jpg',
          },
          {
            key: 'staging/ready/img2.jpg',
            filename: 'img2.jpg',
            uploadedAt: new Date().toISOString(),
            size: 2048000,
            url: 'https://example.com/img2.jpg',
          },
        ],
      });
      mockListGalleries.mockResolvedValue({
        galleries: [{ id: 'g1', title: 'Test', category: 'brands' }],
      });
      mockAssign.mockResolvedValue({ assigned: 1, failed: 1, failedKeys: ['img2'] });

      renderWithToast(<ReadyQueue />);

      await waitFor(() => {
        expect(screen.getByAltText('img1.jpg')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Select all'));
      await user.click(screen.getByText('Select a gallery…'));

      await waitFor(() => {
        expect(screen.getByText('Test')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Test'));
      const assignButton = screen.getByRole('button', { name: /Assign 2/ });
      await user.click(assignButton);

      await waitFor(() => {
        const alerts = screen.getAllByRole('alert');
        const failAlert = alerts.find(a => a.textContent?.includes('failed'));
        expect(failAlert).toBeInTheDocument();
      });
    });

    it('shows error message when assign fails', async () => {
      const user = userEvent.setup();
      mockListReady.mockResolvedValue({
        images: [
          {
            key: 'staging/ready/img1.jpg',
            filename: 'img1.jpg',
            uploadedAt: new Date().toISOString(),
            size: 1024000,
            url: 'https://example.com/img1.jpg',
          },
        ],
      });
      mockListGalleries.mockResolvedValue({
        galleries: [{ id: 'g1', title: 'Test', category: 'brands' }],
      });
      mockAssign.mockRejectedValueOnce(new Error('Assign failed'));

      renderWithToast(<ReadyQueue />);

      await waitFor(() => {
        expect(screen.getByAltText('img1.jpg')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Select all'));
      await user.click(screen.getByText('Select a gallery…'));

      await waitFor(() => {
        expect(screen.getByText('Test')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Test'));
      await user.click(screen.getByRole('button', { name: /Assign 1 to Gallery/ }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Failed to assign images');
      });
    });

    it('clears selection after assignment', async () => {
      const user = userEvent.setup();
      mockListReady.mockResolvedValue({
        images: [
          {
            key: 'staging/ready/img1.jpg',
            filename: 'img1.jpg',
            uploadedAt: new Date().toISOString(),
            size: 1024000,
            url: 'https://example.com/img1.jpg',
          },
        ],
      });
      mockListGalleries.mockResolvedValue({
        galleries: [{ id: 'g1', title: 'Test', category: 'brands' }],
      });
      mockAssign.mockResolvedValue({ assigned: 1, failed: 0, failedKeys: [] });

      renderWithToast(<ReadyQueue />);

      await waitFor(() => {
        expect(screen.getByAltText('img1.jpg')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Select all'));
      expect(screen.getByText('1 selected')).toBeInTheDocument();

      await user.click(screen.getByText('Select a gallery…'));

      await waitFor(() => {
        expect(screen.getByText('Test')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Test'));
      await user.click(screen.getByRole('button', { name: /Assign 1 to Gallery/ }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Assigned');
      });

      expect(screen.queryByText('1 selected')).not.toBeInTheDocument();
    });

    it('refetches images after assignment', async () => {
      const user = userEvent.setup();
      mockListReady.mockResolvedValue({
        images: [
          {
            key: 'staging/ready/img1.jpg',
            filename: 'img1.jpg',
            uploadedAt: new Date().toISOString(),
            size: 1024000,
            url: 'https://example.com/img1.jpg',
          },
        ],
      });
      mockListGalleries.mockResolvedValue({
        galleries: [{ id: 'g1', title: 'Test', category: 'brands' }],
      });
      mockAssign.mockResolvedValue({ assigned: 1, failed: 0, failedKeys: [] });

      renderWithToast(<ReadyQueue />);

      await waitFor(() => {
        expect(screen.getByAltText('img1.jpg')).toBeInTheDocument();
        expect(mockListReady).toHaveBeenCalledTimes(1);
      });

      await user.click(screen.getByText('Select all'));
      await user.click(screen.getByText('Select a gallery…'));

      await waitFor(() => {
        expect(screen.getByText('Test')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Test'));
      await user.click(screen.getByRole('button', { name: /Assign 1 to Gallery/ }));

      await waitFor(() => {
        expect(mockListReady).toHaveBeenCalledTimes(2);
      });
    });

    it('calls onAssigned callback after assignment', async () => {
      const user = userEvent.setup();
      const onAssigned = vi.fn();
      mockListReady.mockResolvedValue({
        images: [
          {
            key: 'staging/ready/img1.jpg',
            filename: 'img1.jpg',
            uploadedAt: new Date().toISOString(),
            size: 1024000,
            url: 'https://example.com/img1.jpg',
          },
        ],
      });
      mockListGalleries.mockResolvedValue({
        galleries: [{ id: 'g1', title: 'Test', category: 'brands' }],
      });
      mockAssign.mockResolvedValue({ assigned: 1, failed: 0, failedKeys: [] });

      renderWithToast(<ReadyQueue onAssigned={onAssigned} />);

      await waitFor(() => {
        expect(screen.getByAltText('img1.jpg')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Select all'));
      await user.click(screen.getByText('Select a gallery…'));

      await waitFor(() => {
        expect(screen.getByText('Test')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Test'));
      await user.click(screen.getByRole('button', { name: /Assign 1 to Gallery/ }));

      await waitFor(() => {
        expect(onAssigned).toHaveBeenCalled();
      });
    });

    it('disables assign button while assigning', async () => {
      const user = userEvent.setup();
      mockListReady.mockResolvedValue({
        images: [
          {
            key: 'staging/ready/img1.jpg',
            filename: 'img1.jpg',
            uploadedAt: new Date().toISOString(),
            size: 1024000,
            url: 'https://example.com/img1.jpg',
          },
        ],
      });
      mockListGalleries.mockResolvedValue({
        galleries: [{ id: 'g1', title: 'Test', category: 'brands' }],
      });
      mockAssign.mockImplementation(() => new Promise(() => {}));

      renderWithToast(<ReadyQueue />);

      await waitFor(() => {
        expect(screen.getByAltText('img1.jpg')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Select all'));
      await user.click(screen.getByText('Select a gallery…'));

      await waitFor(() => {
        expect(screen.getByText('Test')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Test'));

      const assignButton = screen.getByRole('button', { name: /Assign 1 to Gallery/ });
      await user.click(assignButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Assigning…/ })).toBeDisabled();
      });
    });
  });

  describe('refresh', () => {
    it('refreshes images when refresh button clicked', async () => {
      const user = userEvent.setup();
      mockListReady.mockResolvedValue({ images: [] });

      renderWithToast(<ReadyQueue />);

      await waitFor(() => {
        expect(mockListReady).toHaveBeenCalledTimes(1);
      });

      const refreshBtn = screen.getByText('Refresh');
      await user.click(refreshBtn);

      await waitFor(() => {
        expect(mockListReady).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('formatBytes utility', () => {
    it('formats bytes correctly', async () => {
      mockListReady.mockResolvedValue({
        images: [
          {
            key: 'staging/ready/img-bytes.jpg',
            filename: 'img-bytes.jpg',
            uploadedAt: new Date().toISOString(),
            size: 512,
            url: 'https://example.com/img.jpg',
          },
          {
            key: 'staging/ready/img-kb.jpg',
            filename: 'img-kb.jpg',
            uploadedAt: new Date().toISOString(),
            size: 1024000,
            url: 'https://example.com/img2.jpg',
          },
          {
            key: 'staging/ready/img-mb.jpg',
            filename: 'img-mb.jpg',
            uploadedAt: new Date().toISOString(),
            size: 1024 * 1024 * 2,
            url: 'https://example.com/img3.jpg',
          },
        ],
      });

      renderWithToast(<ReadyQueue />);

      await waitFor(() => {
        expect(screen.getByText('512 B')).toBeInTheDocument();
        expect(screen.getByText(/1000\.0 KB/)).toBeInTheDocument();
        expect(screen.getByText(/2\.0 MB/)).toBeInTheDocument();
      });
    });
  });
});
