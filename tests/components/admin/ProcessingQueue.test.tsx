import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProcessingQueue } from '@/components/admin/ProcessingQueue';

const mockListJobs = vi.hoisted(() => vi.fn());
const mockGetSettings = vi.hoisted(() => vi.fn());
const mockTriggerJob = vi.hoisted(() => vi.fn());

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
  return {
    ...actual,
    adminProcessing: {
      ...actual.adminProcessing,
      listJobs: mockListJobs,
      getSettings: mockGetSettings,
      triggerJob: mockTriggerJob,
    },
  };
});

describe('ProcessingQueue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSettings.mockResolvedValue({
      processingMode: 'manual',
      imagenProfileId: 'p1',
    });
    mockTriggerJob.mockResolvedValue({ jobId: 'j2' });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders null when queue has no jobs', async () => {
    mockListJobs.mockResolvedValue({ jobs: [] });
    const { container } = render(<ProcessingQueue galleryId="g1" />);

    await waitFor(() => {
      expect(mockListJobs).toHaveBeenCalledWith('g1');
    });

    expect(container).toBeEmptyDOMElement();
  });

  it('shows complete banner when all jobs are complete', async () => {
    mockListJobs.mockResolvedValue({
      jobs: [
        {
          jobId: 'j1',
          galleryId: 'g1',
          rawKeys: ['one'],
          status: 'complete',
          mode: 'auto',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    });

    render(<ProcessingQueue galleryId="g1" />);

    await waitFor(() => {
      expect(
        screen.getByText('All RAW files processed — JPEGs added to gallery.')
      ).toBeInTheDocument();
    });
  });

  it('allows manual trigger and retry actions', async () => {
    const user = userEvent.setup();
    mockListJobs.mockResolvedValue({
      jobs: [
        {
          jobId: 'queued-job',
          galleryId: 'g1',
          rawKeys: ['r1', 'r2'],
          status: 'queued',
          mode: 'manual',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          jobId: 'failed-job',
          galleryId: 'g1',
          rawKeys: ['r3'],
          status: 'failed',
          mode: 'manual',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          error: 'Processing crashed',
        },
      ],
    });

    render(<ProcessingQueue galleryId="g1" />);

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'Processing Queue (2)' })
      ).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Process Now' }));
    await waitFor(() => {
      expect(mockTriggerJob).toHaveBeenCalledWith('g1', ['r1', 'r2']);
    });

    await user.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() => {
      expect(mockTriggerJob).toHaveBeenCalledWith('g1', ['r3']);
      expect(screen.getByText('Processing crashed')).toBeInTheDocument();
      expect(screen.getByText('Failed')).toBeInTheDocument();
      expect(screen.getByText('In queue')).toBeInTheDocument();
    });
  });

  it('auto-refreshes while there are active jobs', async () => {
    vi.useFakeTimers();
    mockListJobs.mockResolvedValue({
      jobs: [
        {
          jobId: 'active-job',
          galleryId: 'g1',
          rawKeys: ['r1'],
          status: 'processing',
          mode: 'auto',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    });

    render(<ProcessingQueue galleryId="g1" />);

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockListJobs).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(30000);
    });

    expect(mockListJobs).toHaveBeenCalledTimes(2);
  });
});
