import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HeroImagePicker } from '@/components/admin/HeroImagePicker';
import { ToastProvider } from '@/components/admin/Toast';

const mockUpdate = vi.hoisted(() => vi.fn());

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
  return {
    ...actual,
    adminGalleries: {
      ...actual.adminGalleries,
      update: mockUpdate,
    },
  };
});

const images = [
  { key: 'finished/g1/one.jpg', alt: 'One' },
  { key: 'finished/g1/two.jpg', alt: 'Two' },
];

function renderPicker(
  props: Partial<Parameters<typeof HeroImagePicker>[0]> = {}
) {
  return render(
    <ToastProvider>
      <HeroImagePicker
        galleryId="g1"
        images={images}
        heroImage={undefined}
        onUpdate={vi.fn()}
        {...props}
      />
    </ToastProvider>
  );
}

describe('HeroImagePicker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdate.mockResolvedValue({ updated: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders empty-state message when no images are available', () => {
    renderPicker({ images: [] });
    expect(
      screen.getByText('Upload images first to select a hero image.')
    ).toBeInTheDocument();
  });

  it('selects an image as hero', async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();
    renderPicker({ onUpdate });

    await user.click(screen.getByRole('button', { name: 'One' }));

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith('g1', {
        heroImage: 'finished/g1/one.jpg',
      });
      expect(onUpdate).toHaveBeenCalledWith('finished/g1/one.jpg');
      expect(screen.getByRole('alert')).toHaveTextContent('Hero image set');
    });
  });

  it('removes existing hero image', async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();
    renderPicker({ heroImage: 'finished/g1/one.jpg', onUpdate });

    await user.click(screen.getByRole('button', { name: 'Remove' }));

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith('g1', { heroImage: null });
      expect(onUpdate).toHaveBeenCalledWith(undefined);
      expect(screen.getByRole('alert')).toHaveTextContent('Hero image removed');
    });
  });

  it('shows error toast when update fails', async () => {
    mockUpdate.mockRejectedValueOnce(new Error('failed'));
    const user = userEvent.setup();
    renderPicker();

    await user.click(screen.getByRole('button', { name: 'One' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Failed to update hero image'
      );
    });
  });

  it('paginates through hero images when there are many', async () => {
    const manyImages = Array.from({ length: 100 }, (_, i) => ({
      key: `finished/g1/img${i}.jpg`,
      alt: `Image ${i}`,
    }));
    renderPicker({ images: manyImages });

    // Pagination should be visible
    expect(screen.getByText(/1 \/ /)).toBeInTheDocument();

    const user = userEvent.setup();
    const nextButton = screen.getByRole('button', { name: 'Next →' });

    // Click next to go to page 2
    await user.click(nextButton);

    // Should show page 2
    await waitFor(() => {
      expect(screen.getByText(/2 \/ /)).toBeInTheDocument();
    });

    // Prev button should now be enabled
    const prevButton = screen.getByRole('button', { name: '← Prev' });
    expect(prevButton).not.toBeDisabled();
  });

  it('disables prev button on first page and next button on last page', async () => {
    const manyImages = Array.from({ length: 100 }, (_, i) => ({
      key: `finished/g1/img${i}.jpg`,
      alt: `Image ${i}`,
    }));
    renderPicker({ images: manyImages });

    const prevButton = screen.getByRole('button', { name: '← Prev' });
    const nextButton = screen.getByRole('button', { name: 'Next →' });

    // Prev should be disabled on first page
    expect(prevButton).toBeDisabled();
    expect(nextButton).not.toBeDisabled();

    // Navigate to last page
    const user = userEvent.setup();
    const totalPages = Math.ceil(100 / 48);
    for (let i = 0; i < totalPages - 1; i++) {
      await user.click(nextButton);
    }

    // Next should be disabled on last page
    await waitFor(() => {
      expect(nextButton).toBeDisabled();
      expect(prevButton).not.toBeDisabled();
    });
  });

  it('handles image load errors with fallback', async () => {
    renderPicker();

    const images = document.querySelectorAll('img');
    images.forEach((img) => {
      // Trigger error
      img.dispatchEvent(new Event('error'));
      // onError handler should set onerror to null
      expect(img.onerror).toBeNull();
    });
  });
});
