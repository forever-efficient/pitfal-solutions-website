import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DashboardUploader } from '@/components/admin/DashboardUploader';
import { ToastProvider } from '@/components/admin/Toast';

const mockGetUploadUrl = vi.hoisted(() => vi.fn());

vi.mock('@/lib/api', () => ({
  adminImages: {
    getUploadUrl: mockGetUploadUrl,
  },
}));

// Mock fetch
global.fetch = vi.fn();

function renderUploader(onUploaded = vi.fn()) {
  return {
    onUploaded,
    ...render(
      <ToastProvider>
        <DashboardUploader onUploaded={onUploaded} />
      </ToastProvider>
    ),
  };
}

describe('DashboardUploader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response('OK', { status: 200 })
    );
    mockGetUploadUrl.mockResolvedValue({
      uploadUrl: 'https://s3.example.com/upload-url',
    });
  });

  it('renders upload section with heading', () => {
    renderUploader();
    expect(screen.getByText('Upload Images')).toBeInTheDocument();
    expect(screen.getByText(/Drag & drop JPG or PNG files/)).toBeInTheDocument();
  });

  it('renders file input with correct attributes', () => {
    const { container } = renderUploader();
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).toHaveAttribute('type', 'file');
    expect(input).toHaveAttribute('multiple');
    expect(input).toHaveAttribute('accept', '.jpg,.jpeg,.png,image/jpeg,image/png');
  });

  it('shows drag-over state when dragging files', () => {
    const { container } = renderUploader();

    const dropZone = container.querySelector('[class*="border-dashed"]');
    expect(dropZone).toBeInTheDocument();

    // Simulate drag over
    fireEvent.dragOver(dropZone!);
    expect(dropZone).toHaveClass('border-primary-400', 'bg-primary-50');

    // Simulate drag leave
    fireEvent.dragLeave(dropZone!);
    expect(dropZone).not.toHaveClass('border-primary-400');
  });

  it('filters files by extension - only accepts jpg/jpeg/png', async () => {
    const user = userEvent.setup();
    const onUploaded = vi.fn();
    renderUploader(onUploaded);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    // Create mock files with different extensions
    const validFiles = [
      new File([''], 'photo.jpg', { type: 'image/jpeg' }),
      new File([''], 'photo.jpeg', { type: 'image/jpeg' }),
      new File([''], 'photo.png', { type: 'image/png' }),
    ];

    const invalidFiles = [
      new File([''], 'document.pdf', { type: 'application/pdf' }),
      new File([''], 'image.gif', { type: 'image/gif' }),
      new File([''], 'image.webp', { type: 'image/webp' }),
    ];

    // Test invalid files first
    await user.upload(input, invalidFiles);
    expect(mockGetUploadUrl).not.toHaveBeenCalled();

    // Test valid files
    await user.upload(input, validFiles);
    expect(mockGetUploadUrl).toHaveBeenCalledTimes(3);
  });

  it('handles file selection via input', async () => {
    const user = userEvent.setup();
    const onUploaded = vi.fn();
    renderUploader(onUploaded);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    const files = [
      new File([''], 'photo1.jpg', { type: 'image/jpeg' }),
      new File([''], 'photo2.jpg', { type: 'image/jpeg' }),
    ];

    await user.upload(input, files);

    await waitFor(() => {
      expect(mockGetUploadUrl).toHaveBeenCalledTimes(2);
    });
  });

  it('shows uploading state for each file', async () => {
    const user = userEvent.setup();
    renderUploader();

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const files = [new File([''], 'photo.jpg', { type: 'image/jpeg' })];

    // Mock slow upload
    mockGetUploadUrl.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({ uploadUrl: 'https://s3.example.com/url' }), 100))
    );
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve(new Response('OK', { status: 200 })), 100))
    );

    await user.upload(input, files);

    // Check for spinner element (uploading state)
    await waitFor(() => {
      const spinners = document.querySelectorAll('.animate-spin');
      expect(spinners.length).toBeGreaterThan(0);
    });
  });

  it('shows success state when upload completes', async () => {
    const user = userEvent.setup();
    renderUploader();

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const files = [new File([''], 'photo.jpg', { type: 'image/jpeg' })];

    await user.upload(input, files);

    await waitFor(() => {
      // Look for success checkmark SVG
      const svgs = document.querySelectorAll('svg');
      let hasCheckmark = false;
      svgs.forEach(svg => {
        if (svg.querySelector('path[d*="M5 13l4 4L19 7"]')) {
          hasCheckmark = true;
        }
      });
      expect(hasCheckmark).toBe(true);
    });
  });

  it('shows error state when upload fails', async () => {
    const user = userEvent.setup();
    renderUploader();

    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Upload failed'));

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const files = [new File([''], 'photo.jpg', { type: 'image/jpeg' })];

    await user.upload(input, files);

    await waitFor(() => {
      // Look for error X SVG
      expect(screen.getByText('Failed')).toBeInTheDocument();
    });
  });

  it('shows filename and calls onUploaded on successful upload', async () => {
    const user = userEvent.setup();
    const onUploaded = vi.fn();
    renderUploader(onUploaded);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const files = [new File(['test content'], 'my-photo.jpg', { type: 'image/jpeg' })];

    await user.upload(input, files);

    await waitFor(() => {
      expect(screen.getByText('my-photo.jpg')).toBeInTheDocument();
      expect(onUploaded).toHaveBeenCalled();
    });
  });

  it('does not call onUploaded if all uploads fail', async () => {
    const user = userEvent.setup();
    const onUploaded = vi.fn();
    renderUploader(onUploaded);

    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Upload failed'));

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const files = [new File([''], 'photo.jpg', { type: 'image/jpeg' })];

    await user.upload(input, files);

    await waitFor(() => {
      expect(screen.getByText('Failed')).toBeInTheDocument();
    });

    expect(onUploaded).not.toHaveBeenCalled();
  });

  it('calls onUploaded if at least one upload succeeds', async () => {
    const user = userEvent.setup();
    const onUploaded = vi.fn();
    renderUploader(onUploaded);

    // First file succeeds, second fails
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(new Response('OK', { status: 200 }))
      .mockRejectedValueOnce(new Error('Upload failed'));

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const files = [
      new File([''], 'photo1.jpg', { type: 'image/jpeg' }),
      new File([''], 'photo2.jpg', { type: 'image/jpeg' }),
    ];

    await user.upload(input, files);

    await waitFor(() => {
      // Check for success indicator for first file
      const items = screen.getAllByRole('listitem');
      const photo1Item = items.find(item => item.textContent?.includes('photo1.jpg'));
      const photo2Item = items.find(item => item.textContent?.includes('photo2.jpg'));

      expect(photo1Item).toBeInTheDocument();
      expect(photo2Item).toBeInTheDocument();
      expect(photo2Item).toHaveTextContent('Failed');
      expect(onUploaded).toHaveBeenCalled();
    }, { timeout: 3000 });
  });

  it('sends correct headers during upload', async () => {
    const user = userEvent.setup();
    renderUploader();

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const pngFile = new File([''], 'photo.png', { type: 'image/png' });

    await user.upload(input, [pngFile]);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        'https://s3.example.com/upload-url',
        expect.objectContaining({
          method: 'PUT',
          headers: {
            'Content-Type': 'image/png',
          },
        })
      );
    });
  });

  it('uses default content-type for files without type', async () => {
    const user = userEvent.setup();
    renderUploader();

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File([''], 'photo.jpg');
    Object.defineProperty(file, 'type', { value: '', configurable: true });

    await user.upload(input, [file]);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: {
            'Content-Type': 'image/jpeg',
          },
        })
      );
    });
  });

  it('handles multiple files with mixed success/failure', async () => {
    const user = userEvent.setup();
    const onUploaded = vi.fn();
    renderUploader(onUploaded);

    let callCount = 0;
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(() => {
      callCount++;
      // Fail on second upload
      if (callCount === 2) {
        return Promise.reject(new Error('Upload failed'));
      }
      return Promise.resolve(new Response('OK', { status: 200 }));
    });

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const files = [
      new File([''], 'photo1.jpg', { type: 'image/jpeg' }),
      new File([''], 'photo2.jpg', { type: 'image/jpeg' }),
      new File([''], 'photo3.jpg', { type: 'image/jpeg' }),
    ];

    await user.upload(input, files);

    await waitFor(() => {
      expect(screen.getByText('photo1.jpg')).toBeInTheDocument();
      expect(screen.getByText('photo2.jpg')).toBeInTheDocument();
      expect(screen.getByText('Failed')).toBeInTheDocument();
      expect(onUploaded).toHaveBeenCalled();
    });
  });

  it('handles getUploadUrl errors gracefully', async () => {
    const user = userEvent.setup();
    renderUploader();

    mockGetUploadUrl.mockRejectedValueOnce(new Error('Failed to get upload URL'));

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const files = [new File([''], 'photo.jpg', { type: 'image/jpeg' })];

    await user.upload(input, files);

    await waitFor(() => {
      expect(screen.getByText('Failed')).toBeInTheDocument();
    });
  });

  it('displays multiple files in list with individual statuses', async () => {
    const user = userEvent.setup();
    renderUploader();

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const files = [
      new File([''], 'photo1.jpg', { type: 'image/jpeg' }),
      new File([''], 'photo2.jpg', { type: 'image/jpeg' }),
    ];

    await user.upload(input, files);

    await waitFor(() => {
      expect(screen.getByText('photo1.jpg')).toBeInTheDocument();
      expect(screen.getByText('photo2.jpg')).toBeInTheDocument();
    });
  });

  it('does not display file list when no files uploaded', () => {
    renderUploader();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('hides file list UI when no files', () => {
    const { rerender } = renderUploader();

    // Initially no files, so no list
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });
});
