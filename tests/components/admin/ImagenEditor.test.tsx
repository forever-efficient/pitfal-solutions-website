import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ImagenEditor } from '@/components/admin/ImagenEditor';
import { ToastProvider } from '@/components/admin/Toast';

const mockListUploads = vi.hoisted(() => vi.fn());
const mockListJobs = vi.hoisted(() => vi.fn());
const mockListEdited = vi.hoisted(() => vi.fn());
const mockGetUploadUrl = vi.hoisted(() => vi.fn());
const mockProcess = vi.hoisted(() => vi.fn());
const mockApprove = vi.hoisted(() => vi.fn());
const mockDeleteEdited = vi.hoisted(() => vi.fn());
const mockDeleteJobs = vi.hoisted(() => vi.fn());

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
  return {
    ...actual,
    adminImagen: {
      ...actual.adminImagen,
      listUploads: mockListUploads,
      listJobs: mockListJobs,
      listEdited: mockListEdited,
      getUploadUrl: mockGetUploadUrl,
      process: mockProcess,
      approve: mockApprove,
      deleteEdited: mockDeleteEdited,
      deleteJobs: mockDeleteJobs,
    },
  };
});

const uploadedFiles = [
  {
    key: 'raw/input-1.cr3',
    filename: 'input-1.cr3',
    size: 5242880,
    lastModified: '2026-01-01T00:00:00.000Z',
    url: 'https://example.com/input-1.cr3',
  },
];

const jobs = [
  {
    jobId: 'job-complete',
    rawKeys: ['raw/input-1.cr3'],
    status: 'complete' as const,
    source: 'imagen' as const,
    createdAt: '2026-01-02T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
  },
  {
    jobId: 'job-failed',
    rawKeys: ['raw/input-2.cr3'],
    status: 'failed' as const,
    source: 'imagen' as const,
    createdAt: '2026-01-03T00:00:00.000Z',
    updatedAt: '2026-01-03T00:00:00.000Z',
    error: 'Upload failed',
  },
];

const editedFiles = [
  {
    key: 'edited/final-1.jpg',
    filename: 'final-1.jpg',
    size: 102400,
    lastModified: '2026-01-04T00:00:00.000Z',
    url: 'https://example.com/final-1.jpg',
  },
  {
    key: 'edited/final-2.jpg',
    filename: 'final-2.jpg',
    size: 204800,
    lastModified: '2026-01-04T00:00:00.000Z',
    url: 'https://example.com/final-2.jpg',
  },
];

function renderEditor() {
  return render(
    <ToastProvider>
      <ImagenEditor />
    </ToastProvider>
  );
}

describe('ImagenEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockListUploads.mockResolvedValue({ files: uploadedFiles });
    mockListJobs.mockResolvedValue({ jobs });
    mockListEdited.mockResolvedValue({ files: editedFiles });
    mockGetUploadUrl.mockResolvedValue({
      uploadUrl: 'https://upload.example.com/presigned',
      key: 'raw/uploaded-new.cr3',
    });
    mockProcess.mockResolvedValue({ jobIds: ['job-123'] });
    mockApprove.mockResolvedValue({ approved: 2 });
    mockDeleteEdited.mockResolvedValue({ deleted: 2 });
    mockDeleteJobs.mockResolvedValue({ deleted: 2 });

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
  });

  it('loads and renders uploads, jobs, and edited images', async () => {
    renderEditor();

    await waitFor(() => {
      expect(mockListUploads).toHaveBeenCalledTimes(1);
      expect(mockListJobs).toHaveBeenCalledTimes(1);
      expect(mockListEdited).toHaveBeenCalledTimes(1);
    });

    expect(screen.getByText('Uploaded Files (1)')).toBeInTheDocument();
    expect(screen.getByText('Edited Images (2)')).toBeInTheDocument();
    expect(screen.getByText('complete')).toBeInTheDocument();
    expect(screen.getByText('failed')).toBeInTheDocument();
  });

  it('shows an error when only unsupported files are selected', async () => {
    const user = userEvent.setup({ applyAccept: false });
    const { container } = renderEditor();
    const uploadInput = container.querySelector('#imagen-upload') as HTMLInputElement;

    await waitFor(() => {
      expect(uploadInput).toBeInTheDocument();
    });

    const badFile = new File(['csv'], 'records.csv', { type: 'text/csv' });
    await user.upload(uploadInput, badFile);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'No supported files selected (JPG, PNG, or RAW)'
      );
    });

    expect(mockGetUploadUrl).not.toHaveBeenCalled();
  });

  it('uploads a RAW file and refreshes uploaded files', async () => {
    const user = userEvent.setup();
    const { container } = renderEditor();
    const uploadInput = container.querySelector('#imagen-upload') as HTMLInputElement;

    await waitFor(() => {
      expect(uploadInput).toBeInTheDocument();
    });

    const rawFile = new File(['raw-data'], 'new-photo.cr3', {
      type: 'application/octet-stream',
    });
    await user.upload(uploadInput, rawFile);

    await waitFor(() => {
      expect(mockGetUploadUrl).toHaveBeenCalledWith(
        'new-photo.cr3',
        'application/octet-stream'
      );
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        'https://upload.example.com/presigned',
        expect.objectContaining({
          method: 'PUT',
          headers: { 'Content-Type': 'application/octet-stream' },
        })
      );
    });

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Files uploaded successfully'
      );
    });

    // Initial load + post-upload refresh.
    expect(mockListUploads).toHaveBeenCalledTimes(2);
  });

  it('processes all uploaded files', async () => {
    const user = userEvent.setup();
    renderEditor();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Process All with AI' })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Process All with AI' }));

    await waitFor(() => {
      expect(mockProcess).toHaveBeenCalledWith(['raw/input-1.cr3']);
      expect(screen.getByRole('alert')).toHaveTextContent('AI processing job started');
    });
  });

  it('clears finished jobs', async () => {
    const user = userEvent.setup();
    renderEditor();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Clear Finished' })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Clear Finished' }));

    await waitFor(() => {
      expect(mockDeleteJobs).toHaveBeenCalledWith(['job-complete', 'job-failed']);
      expect(screen.getByRole('alert')).toHaveTextContent('Cleared 2 job(s)');
    });

    expect(screen.queryByText('failed')).not.toBeInTheDocument();
  });

  it('selects all edited images and approves them', async () => {
    const user = userEvent.setup();
    renderEditor();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Select All' })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Select All' }));
    await user.click(screen.getByRole('button', { name: 'Move to Ready Queue (2)' }));

    await waitFor(() => {
      expect(mockApprove).toHaveBeenCalledWith(['edited/final-1.jpg', 'edited/final-2.jpg']);
      expect(screen.getByRole('alert')).toHaveTextContent('2 image(s) moved to Ready Queue');
    });
  });

  it('selects all edited images and deletes them', async () => {
    const user = userEvent.setup();
    renderEditor();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Select All' })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Select All' }));
    await user.click(screen.getByRole('button', { name: 'Delete Selected (2)' }));

    await waitFor(() => {
      expect(mockDeleteEdited).toHaveBeenCalledWith([
        'edited/final-1.jpg',
        'edited/final-2.jpg',
      ]);
      expect(screen.getByRole('alert')).toHaveTextContent('2 image(s) deleted');
    });
  });
});
