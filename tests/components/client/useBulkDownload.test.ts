import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBulkDownload } from '@/components/client/useBulkDownload';

const mockBulkDownload = vi.hoisted(() => vi.fn());
const mockClick = vi.hoisted(() => vi.fn());

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
  return {
    ...actual,
    clientGallery: {
      ...actual.clientGallery,
      bulkDownload: mockBulkDownload,
    },
  };
});

describe('useBulkDownload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(mockClick);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('sets error when no image keys are provided', async () => {
    const { result } = renderHook(() => useBulkDownload('g1'));

    await act(async () => {
      await result.current.startBulkDownload([]);
    });

    expect(result.current.error).toBe('No images to download');
    expect(result.current.isDownloading).toBe(false);
  });

  it('downloads files and clears state on success', async () => {
    vi.useFakeTimers();
    mockBulkDownload.mockResolvedValue({
      downloads: [
        { key: 'k1', downloadUrl: 'https://downloads.example.com/k1.jpg' },
        { key: 'k2', downloadUrl: 'https://downloads.example.com/k2.jpg' },
      ],
    });

    const { result } = renderHook(() => useBulkDownload('g1'));

    await act(async () => {
      const promise = result.current.startBulkDownload(['k1', 'k2'], 'web');
      await vi.runAllTimersAsync();
      await promise;
    });

    expect(mockBulkDownload).toHaveBeenCalledWith('g1', ['k1', 'k2'], 'web');
    expect(mockClick).toHaveBeenCalledTimes(2);
    expect(result.current.isDownloading).toBe(false);
    expect(result.current.progress).toBeNull();
    expect(result.current.error).toBeNull();
    vi.useRealTimers();
  });

  it('captures download failure and can clear error', async () => {
    mockBulkDownload.mockRejectedValueOnce(new Error('Bulk failed'));
    const { result } = renderHook(() => useBulkDownload('g1'));

    await act(async () => {
      await result.current.startBulkDownload(['k1']);
    });

    expect(result.current.error).toBe('Bulk failed');
    expect(result.current.isDownloading).toBe(false);

    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBeNull();
  });
});
