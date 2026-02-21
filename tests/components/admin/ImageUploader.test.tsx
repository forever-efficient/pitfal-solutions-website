import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ImageUploader } from '@/components/admin/ImageUploader';
import { ToastProvider } from '@/components/admin/Toast';

const mockGetUploadUrl = vi.hoisted(() => vi.fn());
const mockDeleteImage = vi.hoisted(() => vi.fn());
const mockGalleryUpdate = vi.hoisted(() => vi.fn());

vi.mock('@/lib/api', () => ({
  adminImages: {
    getUploadUrl: mockGetUploadUrl,
    delete: mockDeleteImage,
  },
  adminGalleries: {
    update: mockGalleryUpdate,
  },
}));

const mockImages = [
  { key: 'finished/gal-123/photo1.jpg', alt: 'Photo 1' },
  { key: 'finished/gal-123/photo2.jpg', alt: '' },
];

function renderUploader(
  images = mockImages,
  onUpdate = vi.fn(),
  galleryId = 'gal-123',
  heroImage?: string | null,
  onHeroChange = vi.fn()
) {
  return {
    onUpdate,
    onHeroChange,
    ...render(
      <ToastProvider>
        <ImageUploader
          galleryId={galleryId}
          images={images}
          heroImage={heroImage}
          onUpdate={onUpdate}
          onHeroChange={onHeroChange}
        />
      </ToastProvider>
    ),
  };
}

describe('ImageUploader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDeleteImage.mockImplementation(() =>
      Promise.resolve({ deleted: true })
    );
    mockGalleryUpdate.mockImplementation(() =>
      Promise.resolve({ updated: true })
    );
    global.confirm = vi.fn(() => true);
  });

  it('renders heading with image count', () => {
    renderUploader();
    expect(
      screen.getByRole('heading', { name: 'Gallery Images (2)' })
    ).toBeInTheDocument();
  });

  it('renders heading with zero count', () => {
    renderUploader([]);
    expect(
      screen.getByRole('heading', { name: 'Gallery Images (0)' })
    ).toBeInTheDocument();
  });

  it('renders image grid with existing images', () => {
    renderUploader();
    const images = screen.getAllByRole('img');
    expect(images).toHaveLength(2);
    expect(images[0]).toHaveAttribute('alt', 'Photo 1');
    expect(images[1]).toHaveAttribute('alt', 'Gallery image');
  });

  it('renders images with correct thumbnail src', () => {
    renderUploader();
    const images = screen.getAllByRole('img');
    // getImageUrl with 'sm' returns processed WebP thumbnail
    expect(images[0]).toHaveAttribute(
      'src',
      'https://media.pitfal.solutions/processed/finished/gal-123/photo1/600w.webp'
    );
  });

  it('renders delete button for each image', () => {
    renderUploader();
    const deleteButtons = screen.getAllByLabelText('Delete image');
    expect(deleteButtons).toHaveLength(2);
  });

  it('does not render image grid when no images', () => {
    renderUploader([]);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });


  describe('image deletion', () => {
    it('calls confirm before deleting', async () => {
      const user = userEvent.setup();
      renderUploader();

      const deleteButtons = screen.getAllByLabelText('Delete image');
      await user.click(deleteButtons[0]);

      expect(global.confirm).toHaveBeenCalledWith('Delete this image?');
    });

    it('deletes image and calls onUpdate when confirmed', async () => {
      const user = userEvent.setup();
      const onUpdate = vi.fn();
      renderUploader(mockImages, onUpdate);

      const deleteButtons = screen.getAllByLabelText('Delete image');
      await user.click(deleteButtons[0]);

      await waitFor(() => {
        expect(mockDeleteImage).toHaveBeenCalledWith(
          'finished/gal-123/photo1.jpg',
          'gal-123'
        );
      });

      await waitFor(() => {
        expect(onUpdate).toHaveBeenCalledWith([
          { key: 'finished/gal-123/photo2.jpg', alt: '' },
        ]);
      });
    });

    it('does not delete when confirm is cancelled', async () => {
      (global.confirm as ReturnType<typeof vi.fn>).mockReturnValue(false);

      const user = userEvent.setup();
      renderUploader();

      const deleteButtons = screen.getAllByLabelText('Delete image');
      await user.click(deleteButtons[0]);

      expect(mockDeleteImage).not.toHaveBeenCalled();
    });

    it('shows error toast when delete fails', async () => {
      mockDeleteImage.mockImplementation(() =>
        Promise.reject(new Error('Delete failed'))
      );

      const user = userEvent.setup();
      renderUploader();

      const deleteButtons = screen.getAllByLabelText('Delete image');
      await user.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(
          'Failed to delete image'
        );
      });
    });
  });

  describe('cover image controls', () => {
    it('sets selected image as cover', async () => {
      const user = userEvent.setup();
      const onHeroChange = vi.fn();
      renderUploader(mockImages, vi.fn(), 'gal-123', null, onHeroChange);

      await user.click(screen.getAllByRole('button', { name: 'Set as cover' })[0]);

      await waitFor(() => {
        expect(mockGalleryUpdate).toHaveBeenCalledWith('gal-123', {
          heroImage: 'finished/gal-123/photo1.jpg',
        });
      });

      expect(onHeroChange).toHaveBeenCalled();
      expect(screen.getByRole('alert')).toHaveTextContent('Cover image set');
    });

    it('removes current cover image', async () => {
      const user = userEvent.setup();
      renderUploader(
        mockImages,
        vi.fn(),
        'gal-123',
        'finished/gal-123/photo1.jpg',
        vi.fn()
      );

      await user.click(screen.getByRole('button', { name: 'Remove cover' }));

      await waitFor(() => {
        expect(mockGalleryUpdate).toHaveBeenCalledWith('gal-123', {
          heroImage: null,
        });
      });

      expect(screen.getByText('Cover')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toHaveTextContent('Cover image removed');
    });

    it('shows error toast when cover update fails', async () => {
      mockGalleryUpdate.mockImplementationOnce(() =>
        Promise.reject(new Error('update failed'))
      );

      const user = userEvent.setup();
      renderUploader(mockImages, vi.fn(), 'gal-123', null, vi.fn());

      await user.click(screen.getAllByRole('button', { name: 'Set as cover' })[0]);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(
          'Failed to update cover image'
        );
      });
    });
  });

  describe('pagination', () => {
    it('renders next page and previous page controls', async () => {
      const user = userEvent.setup();
      const manyImages = Array.from({ length: 25 }, (_, i) => ({
        key: `finished/gal-123/photo-${i + 1}.jpg`,
        alt: `Photo ${i + 1}`,
      }));

      renderUploader(manyImages);

      expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
      expect(screen.queryByAltText('Photo 25')).not.toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Next' }));

      expect(screen.getByText('Page 2 of 2')).toBeInTheDocument();
      expect(screen.getByAltText('Photo 25')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Previous' }));

      expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
      expect(screen.getByAltText('Photo 1')).toBeInTheDocument();
    });
  });
});
