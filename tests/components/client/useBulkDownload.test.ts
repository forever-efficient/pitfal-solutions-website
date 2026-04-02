import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBulkDownload, partitionIntoBatches, getResumeState, clearResumeState } from '@/components/client/useBulkDownload';

const mockBulkDownload = vi.hoisted(() => vi.fn());
const mockSaveAs = vi.hoisted(() => vi.fn());
const mockFile = vi.hoisted(() => vi.fn());
const mockGenerateAsync = vi.hoisted(() =>
  vi.fn().mockResolvedValue(new Blob(['zip-content'], { type: 'application/zip' }))
);
const mockGetDownloadStrategy = vi.hoisted(() => vi.fn());
const mockShareFiles = vi.hoisted(() => vi.fn());

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

vi.mock('jszip', () => {
  const MockJSZip = vi.fn().mockImplementation(() => ({
    file: mockFile,
    generateAsync: mockGenerateAsync,
  }));
  return { default: MockJSZip, __esModule: true };
});

vi.mock('file-saver', () => ({
  saveAs: mockSaveAs,
}));

vi.mock('@/lib/platform', () => ({
  getDownloadStrategy: mockGetDownloadStrategy,
}));

vi.mock('@/lib/shareFiles', () => ({
  shareFiles: mockShareFiles,
}));

// Helper: create a standard bulk download response
function makeDownloads(keys: string[], sizeBytes?: number) {
  return {
    downloads: keys.map((key) => ({
      key,
      downloadUrl: `https://cdn.example.com/${key.split('/').pop()}`,
      ...(sizeBytes !== undefined ? { sizeBytes } : {}),
    })),
  };
}

describe('useBulkDownload', () => {
  let anchorClickSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGenerateAsync.mockClear();
    mockGenerateAsync.mockResolvedValue(new Blob(['zip-content'], { type: 'application/zip' }));
    mockGetDownloadStrategy.mockReturnValue('zip');
    mockShareFiles.mockResolvedValue(0);
    global.fetch = vi.fn();
    anchorClickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  });

  afterEach(() => {
    anchorClickSpy.mockRestore();
    (global.fetch as ReturnType<typeof vi.fn>).mockRestore?.();
  });

  it('sets error when no image keys are provided', async () => {
    const { result } = renderHook(() => useBulkDownload('g1'));

    await act(async () => {
      await result.current.startBulkDownload([]);
    });

    expect(result.current.error).toBe('No images to download');
    expect(result.current.isDownloading).toBe(false);
  });

  it('creates a ZIP and triggers saveAs on success', async () => {
    const keys = ['gallery/g1/photo1.jpg', 'gallery/g1/photo2.jpg'];
    // Called twice: once for size planning, once for fresh batch URLs
    mockBulkDownload.mockResolvedValue(makeDownloads(keys, 10 * 1024 * 1024));

    const mockBlob = new Blob(['image-data']);
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(mockBlob),
    });

    const { result } = renderHook(() => useBulkDownload('g1'));

    await act(async () => {
      await result.current.startBulkDownload(['k1', 'k2'], 'web', 'My Gallery');
    });

    // Called at least twice: upfront sizes + per-batch fresh URLs
    expect(mockBulkDownload).toHaveBeenCalledWith('g1', ['k1', 'k2'], 'web');
    expect(mockFile).toHaveBeenCalledTimes(2);
    expect(mockFile).toHaveBeenCalledWith('photo1.jpg', mockBlob);
    expect(mockFile).toHaveBeenCalledWith('photo2.jpg', mockBlob);
    expect(mockGenerateAsync).toHaveBeenCalledWith({ type: 'blob' });
    expect(mockSaveAs).toHaveBeenCalledTimes(1);
    expect(mockSaveAs).toHaveBeenCalledWith(expect.any(Blob), 'my-gallery.zip');
    expect(result.current.isDownloading).toBe(false);
    expect(result.current.progress).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('uses fallback filename when no gallery name provided', async () => {
    const keys = ['gallery/g1/photo1.jpg'];
    mockBulkDownload.mockResolvedValue(makeDownloads(keys, 5 * 1024 * 1024));

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(new Blob(['data'])),
    });

    const { result } = renderHook(() => useBulkDownload('g1'));

    await act(async () => {
      await result.current.startBulkDownload(['k1'], 'full');
    });

    expect(mockSaveAs).toHaveBeenCalledWith(expect.any(Blob), 'gallery-photos.zip');
  });

  it('skips failed fetches after retries and still generates partial ZIP', async () => {
    const keys = ['gallery/g1/photo1.jpg', 'gallery/g1/photo2.jpg'];
    mockBulkDownload.mockResolvedValue(makeDownloads(keys, 5 * 1024 * 1024));

    const mockBlob = new Blob(['image-data']);
    // photo1 succeeds on first try; photo2 fails all retries (3 total: 1 + 2 retries)
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ ok: true, blob: () => Promise.resolve(mockBlob) })
      .mockResolvedValueOnce({ ok: false }) // photo2 attempt 1
      .mockResolvedValueOnce({ ok: false }) // photo2 retry 1
      .mockResolvedValueOnce({ ok: false }); // photo2 retry 2

    const { result } = renderHook(() => useBulkDownload('g1'));

    await act(async () => {
      await result.current.startBulkDownload(['k1', 'k2'], 'full', 'Test');
    });

    expect(mockFile).toHaveBeenCalledTimes(1);
    expect(mockFile).toHaveBeenCalledWith('photo1.jpg', mockBlob);
    expect(mockSaveAs).toHaveBeenCalledTimes(1);
    expect(result.current.isDownloading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('captures API failure and can clear error', async () => {
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

  it('sanitizes gallery name for ZIP filename', async () => {
    const keys = ['gallery/g1/img.jpg'];
    mockBulkDownload.mockResolvedValue(makeDownloads(keys, 5 * 1024 * 1024));

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(new Blob(['data'])),
    });

    const { result } = renderHook(() => useBulkDownload('g1'));

    await act(async () => {
      await result.current.startBulkDownload(['k1'], 'full', 'Smith & Jones — Wedding!!');
    });

    expect(mockSaveAs).toHaveBeenCalledWith(expect.any(Blob), 'smith-jones-wedding.zip');
  });

  it('uses share strategy when getDownloadStrategy returns share', async () => {
    mockGetDownloadStrategy.mockReturnValue('share');
    mockShareFiles.mockResolvedValue(2);

    const keys = ['gallery/g1/photo1.jpg', 'gallery/g1/photo2.jpg'];
    mockBulkDownload.mockResolvedValue(makeDownloads(keys, 5 * 1024 * 1024));

    const mockBlob = new Blob(['image-data'], { type: 'image/jpeg' });
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(mockBlob),
    });

    const { result } = renderHook(() => useBulkDownload('g1'));

    await act(async () => {
      await result.current.startBulkDownload(['k1', 'k2'], 'full', 'Test Gallery');
    });

    expect(mockShareFiles).toHaveBeenCalledTimes(1);
    const sharedFiles = mockShareFiles.mock.calls[0]![0] as File[];
    expect(sharedFiles).toHaveLength(2);
    expect(sharedFiles[0]!.name).toBe('photo1.jpg');
    expect(sharedFiles[1]!.name).toBe('photo2.jpg');
    expect(mockSaveAs).not.toHaveBeenCalled();
    expect(result.current.isDownloading).toBe(false);
  });

  it('uses individual strategy when getDownloadStrategy returns individual', async () => {
    mockGetDownloadStrategy.mockReturnValue('individual');

    // Individual strategy fetches URLs per-image
    mockBulkDownload.mockResolvedValue(
      makeDownloads(['gallery/g1/photo1.jpg'], 5 * 1024 * 1024)
    );

    const mockBlob = new Blob(['image-data']);
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(mockBlob),
    });

    const mockCreateElement = vi.spyOn(document, 'createElement');
    const mockAppendChild = vi.spyOn(document.body, 'appendChild').mockImplementation((node) => node);
    const mockRemoveChild = vi.spyOn(document.body, 'removeChild').mockImplementation((node) => node);
    const mockCreateObjectURL = vi.fn().mockReturnValue('blob:test-url');
    const mockRevokeObjectURL = vi.fn();
    global.URL.createObjectURL = mockCreateObjectURL;
    global.URL.revokeObjectURL = mockRevokeObjectURL;

    const { result } = renderHook(() => useBulkDownload('g1'));

    await act(async () => {
      await result.current.startBulkDownload(['k1'], 'full', 'Test');
    });

    expect(mockSaveAs).not.toHaveBeenCalled();
    expect(mockShareFiles).not.toHaveBeenCalled();
    expect(mockCreateObjectURL).toHaveBeenCalled();
    expect(mockRevokeObjectURL).toHaveBeenCalled();
    expect(result.current.isDownloading).toBe(false);

    mockCreateElement.mockRestore();
    mockAppendChild.mockRestore();
    mockRemoveChild.mockRestore();
  });

  it('exposes cancelDownload that resets state', async () => {
    // Use a controllable promise so we can cancel mid-flight then resolve to unblock
    let resolveDownload!: (v: ReturnType<typeof makeDownloads>) => void;
    mockBulkDownload.mockImplementation(
      () => new Promise((resolve) => { resolveDownload = resolve; })
    );

    const { result } = renderHook(() => useBulkDownload('g1'));

    // Start download (don't await — it will hang on mockBulkDownload)
    let downloadPromise: Promise<void>;
    act(() => {
      downloadPromise = result.current.startBulkDownload(['k1'], 'full', 'Test');
    });

    // Give it a tick to enter the downloading state
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    expect(result.current.isDownloading).toBe(true);

    // Cancel, then resolve the pending mock so the async function can finish
    act(() => {
      result.current.cancelDownload();
    });
    resolveDownload(makeDownloads(['gallery/g1/img.jpg'], 5 * 1024 * 1024));

    // Wait for the startBulkDownload promise to settle
    await act(async () => {
      await downloadPromise!;
    });

    expect(result.current.isDownloading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('deduplicates filenames within a ZIP batch', async () => {
    // Two images with the same filename from different paths
    const keys = ['gallery/g1/folder1/photo.jpg', 'gallery/g1/folder2/photo.jpg'];
    mockBulkDownload.mockResolvedValue({
      downloads: keys.map((key) => ({
        key,
        downloadUrl: `https://cdn.example.com/${key}`,
        sizeBytes: 5 * 1024 * 1024,
      })),
    });

    const mockBlob = new Blob(['image-data']);
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(mockBlob),
    });

    const { result } = renderHook(() => useBulkDownload('g1'));

    await act(async () => {
      await result.current.startBulkDownload(['k1', 'k2'], 'full', 'Dedup Test');
    });

    expect(mockFile).toHaveBeenCalledTimes(2);
    // First gets original name, second gets deduplicated name
    expect(mockFile).toHaveBeenCalledWith('photo.jpg', mockBlob);
    expect(mockFile).toHaveBeenCalledWith('photo-2.jpg', mockBlob);
  });

  describe('batched ZIP downloads', () => {
    it('creates multiple ZIPs when total size exceeds 200MB batch limit', async () => {
      // 3 images at 150MB each = 450MB. At 200MB limit: batch1=[img1], batch2=[img2], batch3=[img3]
      // (150MB fits in batch, adding second 150MB=300MB > 200MB → new batch)
      const keys = ['gallery/g1/photo1.jpg', 'gallery/g1/photo2.jpg', 'gallery/g1/photo3.jpg'];
      mockBulkDownload.mockResolvedValue(makeDownloads(keys, 150 * 1024 * 1024));

      const mockBlob = new Blob(['image-data']);
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(mockBlob),
      });

      const { result } = renderHook(() => useBulkDownload('g1'));

      await act(async () => {
        await result.current.startBulkDownload(['k1', 'k2', 'k3'], 'full', 'Big Gallery');
      });

      // Each 150MB image gets its own batch (150+150=300>200)
      expect(mockSaveAs).toHaveBeenCalledTimes(3);
      expect(mockSaveAs).toHaveBeenCalledWith(expect.any(Blob), 'big-gallery-part-1.zip');
      expect(mockSaveAs).toHaveBeenCalledWith(expect.any(Blob), 'big-gallery-part-2.zip');
      expect(mockSaveAs).toHaveBeenCalledWith(expect.any(Blob), 'big-gallery-part-3.zip');
      expect(result.current.isDownloading).toBe(false);
    });

    it('groups small files into one batch', async () => {
      const keys = ['gallery/g1/photo1.jpg', 'gallery/g1/photo2.jpg'];
      mockBulkDownload.mockResolvedValue(makeDownloads(keys, 50 * 1024 * 1024)); // 50MB each, 100MB total < 200MB

      const mockBlob = new Blob(['image-data']);
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(mockBlob),
      });

      const { result } = renderHook(() => useBulkDownload('g1'));

      await act(async () => {
        await result.current.startBulkDownload(['k1', 'k2'], 'full', 'Small Gallery');
      });

      expect(mockSaveAs).toHaveBeenCalledTimes(1);
      expect(mockSaveAs).toHaveBeenCalledWith(expect.any(Blob), 'small-gallery.zip');
    });

    it('falls back to count-based batching when no sizes provided', async () => {
      // 30 images with no sizeBytes → FALLBACK_BATCH_COUNT=20 → 2 batches (20+10)
      const allKeys = Array.from({ length: 30 }, (_, i) => `gallery/g1/photo${i}.jpg`);
      mockBulkDownload.mockResolvedValue(makeDownloads(allKeys));

      const mockBlob = new Blob(['image-data']);
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(mockBlob),
      });

      const imageKeys = Array.from({ length: 30 }, (_, i) => `k${i}`);
      const { result } = renderHook(() => useBulkDownload('g1'));

      await act(async () => {
        await result.current.startBulkDownload(imageKeys, 'full', 'Fallback Gallery');
      });

      // 30 images / 20 per batch = 2 batches
      expect(mockSaveAs).toHaveBeenCalledTimes(2);
      expect(mockSaveAs).toHaveBeenCalledWith(expect.any(Blob), 'fallback-gallery-part-1.zip');
      expect(mockSaveAs).toHaveBeenCalledWith(expect.any(Blob), 'fallback-gallery-part-2.zip');
    });
  });
});

describe('resume helpers', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('getResumeState returns null when no saved state', () => {
    expect(getResumeState('g1', 'full', 10)).toBeNull();
  });

  it('getResumeState returns null when imageCount changed', () => {
    sessionStorage.setItem('bulkdl:g1:full', JSON.stringify({
      completedBatches: [0, 1],
      totalBatches: 5,
      imageCount: 100,
    }));
    // Gallery now has 105 images — batches shifted, discard
    expect(getResumeState('g1', 'full', 105)).toBeNull();
  });

  it('getResumeState returns null when all batches completed', () => {
    sessionStorage.setItem('bulkdl:g1:full', JSON.stringify({
      completedBatches: [0, 1, 2],
      totalBatches: 3,
      imageCount: 50,
    }));
    expect(getResumeState('g1', 'full', 50)).toBeNull();
  });

  it('getResumeState returns state when partially completed', () => {
    const state = {
      completedBatches: [0, 1],
      totalBatches: 5,
      imageCount: 100,
    };
    sessionStorage.setItem('bulkdl:g1:full', JSON.stringify(state));
    expect(getResumeState('g1', 'full', 100)).toEqual(state);
  });

  it('clearResumeState removes saved state', () => {
    sessionStorage.setItem('bulkdl:g1:full', JSON.stringify({
      completedBatches: [0],
      totalBatches: 3,
      imageCount: 50,
    }));
    clearResumeState('g1', 'full');
    expect(sessionStorage.getItem('bulkdl:g1:full')).toBeNull();
  });

  it('resume state is keyed by size', () => {
    sessionStorage.setItem('bulkdl:g1:full', JSON.stringify({
      completedBatches: [0],
      totalBatches: 3,
      imageCount: 50,
    }));
    // 'web' key has nothing saved
    expect(getResumeState('g1', 'web', 50)).toBeNull();
    // 'full' key has state
    expect(getResumeState('g1', 'full', 50)).not.toBeNull();
  });
});

describe('resume integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGenerateAsync.mockClear();
    mockGenerateAsync.mockResolvedValue(new Blob(['zip-content'], { type: 'application/zip' }));
    mockGetDownloadStrategy.mockReturnValue('zip');
    global.fetch = vi.fn();
    sessionStorage.clear();
  });

  afterEach(() => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRestore?.();
  });

  it('saves completed batch to sessionStorage after each ZIP', async () => {
    // 2 images, each 150MB → 2 batches (200MB limit)
    const keys = ['gallery/g1/a.jpg', 'gallery/g1/b.jpg'];
    mockBulkDownload.mockResolvedValue(makeDownloads(keys, 150 * 1024 * 1024));

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(new Blob(['data'])),
    });

    const { result } = renderHook(() => useBulkDownload('g1'));

    await act(async () => {
      await result.current.startBulkDownload(keys, 'full', 'Test');
    });

    // After successful completion, resume state should be cleared
    expect(sessionStorage.getItem('bulkdl:g1:full')).toBeNull();
  });

  it('preserves resume state on error', async () => {
    // Pre-seed resume state
    const resumeData = {
      completedBatches: [0],
      totalBatches: 3,
      imageCount: 3,
    };
    sessionStorage.setItem('bulkdl:g1:full', JSON.stringify(resumeData));

    // Start a download that fails immediately
    const keys = ['gallery/g1/a.jpg', 'gallery/g1/b.jpg', 'gallery/g1/c.jpg'];
    mockBulkDownload.mockRejectedValue(new Error('API error'));

    const { result } = renderHook(() => useBulkDownload('g1'));

    await act(async () => {
      await result.current.startBulkDownload(keys, 'full', 'Test');
    });

    // Resume state should still be there (errors don't clear it)
    expect(sessionStorage.getItem('bulkdl:g1:full')).not.toBeNull();
    const saved = JSON.parse(sessionStorage.getItem('bulkdl:g1:full')!);
    expect(saved.completedBatches).toEqual([0]);
    expect(result.current.error).toBe('API error');
  });

  it('skips completed batches when resuming', async () => {
    // 2 images, each 150MB → 2 batches
    const keys = ['gallery/g1/a.jpg', 'gallery/g1/b.jpg'];

    // Pre-seed resume state: batch 0 already done
    sessionStorage.setItem('bulkdl:g1:full', JSON.stringify({
      completedBatches: [0],
      totalBatches: 2,
      imageCount: 2,
    }));

    mockBulkDownload.mockResolvedValue(makeDownloads(keys, 150 * 1024 * 1024));

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(new Blob(['data'])),
    });

    const { result } = renderHook(() => useBulkDownload('g1'));

    await act(async () => {
      await result.current.startBulkDownload(keys, 'full', 'Test', { resumeFrom: 1 });
    });

    // Should only create 1 ZIP (batch 1), not 2
    expect(mockSaveAs).toHaveBeenCalledTimes(1);
    expect(mockSaveAs).toHaveBeenCalledWith(expect.any(Blob), 'test-part-2.zip');

    // After completion, resume state cleared
    expect(sessionStorage.getItem('bulkdl:g1:full')).toBeNull();
  });
});

describe('partitionIntoBatches', () => {
  it('returns empty array for empty input', () => {
    expect(partitionIntoBatches([], 500)).toEqual([]);
  });

  it('puts all items in one batch when under limit', () => {
    const items = [
      { key: 'a', downloadUrl: 'u', sizeBytes: 100 },
      { key: 'b', downloadUrl: 'u', sizeBytes: 200 },
    ];
    const result = partitionIntoBatches(items, 500);
    expect(result).toHaveLength(1);
    expect(result[0]).toHaveLength(2);
  });

  it('splits into multiple batches when exceeding limit', () => {
    const items = [
      { key: 'a', downloadUrl: 'u', sizeBytes: 200 },
      { key: 'b', downloadUrl: 'u', sizeBytes: 200 },
      { key: 'c', downloadUrl: 'u', sizeBytes: 200 },
    ];
    const result = partitionIntoBatches(items, 500);
    expect(result).toHaveLength(2);
    expect(result[0]!.map(d => d.key)).toEqual(['a', 'b']);
    expect(result[1]!.map(d => d.key)).toEqual(['c']);
  });

  it('gives oversized single item its own batch', () => {
    const items = [
      { key: 'small', downloadUrl: 'u', sizeBytes: 100 },
      { key: 'huge', downloadUrl: 'u', sizeBytes: 1000 },
      { key: 'small2', downloadUrl: 'u', sizeBytes: 100 },
    ];
    const result = partitionIntoBatches(items, 500);
    expect(result).toHaveLength(3);
    expect(result[0]!.map(d => d.key)).toEqual(['small']);
    expect(result[1]!.map(d => d.key)).toEqual(['huge']);
    expect(result[2]!.map(d => d.key)).toEqual(['small2']);
  });

  it('treats 0 size as 0 bytes', () => {
    const items = [
      { key: 'a', downloadUrl: 'u', sizeBytes: 0 },
      { key: 'b', downloadUrl: 'u', sizeBytes: 0 },
      { key: 'c', downloadUrl: 'u', sizeBytes: 0 },
    ];
    const result = partitionIntoBatches(items, 500);
    expect(result).toHaveLength(1);
    expect(result[0]).toHaveLength(3);
  });
});
