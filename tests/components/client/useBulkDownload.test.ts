import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBulkDownload } from '@/components/client/useBulkDownload';

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

describe('useBulkDownload', () => {
  let anchorClickSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGenerateAsync.mockClear();
    mockGenerateAsync.mockResolvedValue(new Blob(['zip-content'], { type: 'application/zip' }));
    mockGetDownloadStrategy.mockReturnValue('zip');
    mockShareFiles.mockResolvedValue(0);
    global.fetch = vi.fn();
    // jsdom throws "Not implemented: navigation" when programmatic anchor clicks run
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
    mockBulkDownload.mockResolvedValue({
      downloads: [
        { key: 'gallery/g1/photo1.jpg', downloadUrl: 'https://cdn.example.com/photo1.jpg' },
        { key: 'gallery/g1/photo2.jpg', downloadUrl: 'https://cdn.example.com/photo2.jpg' },
      ],
    });

    const mockBlob = new Blob(['image-data']);
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(mockBlob),
    });

    const { result } = renderHook(() => useBulkDownload('g1'));

    await act(async () => {
      await result.current.startBulkDownload(['k1', 'k2'], 'web', 'My Gallery');
    });

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
    mockBulkDownload.mockResolvedValue({
      downloads: [
        { key: 'gallery/g1/photo1.jpg', downloadUrl: 'https://cdn.example.com/photo1.jpg' },
      ],
    });

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

  it('skips failed fetches and still generates partial ZIP', async () => {
    mockBulkDownload.mockResolvedValue({
      downloads: [
        { key: 'gallery/g1/photo1.jpg', downloadUrl: 'https://cdn.example.com/photo1.jpg' },
        { key: 'gallery/g1/photo2.jpg', downloadUrl: 'https://cdn.example.com/photo2.jpg' },
      ],
    });

    const mockBlob = new Blob(['image-data']);
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ ok: true, blob: () => Promise.resolve(mockBlob) })
      .mockResolvedValueOnce({ ok: false });

    const { result } = renderHook(() => useBulkDownload('g1'));

    await act(async () => {
      await result.current.startBulkDownload(['k1', 'k2'], 'full', 'Test');
    });

    // Only the successful file should be added to the ZIP
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
    mockBulkDownload.mockResolvedValue({
      downloads: [
        { key: 'gallery/g1/img.jpg', downloadUrl: 'https://cdn.example.com/img.jpg' },
      ],
    });

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
    mockBulkDownload.mockResolvedValue({
      downloads: [
        { key: 'gallery/g1/photo1.jpg', downloadUrl: 'https://cdn.example.com/photo1.jpg' },
        { key: 'gallery/g1/photo2.jpg', downloadUrl: 'https://cdn.example.com/photo2.jpg' },
      ],
    });

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
    // Should NOT create a ZIP
    expect(mockSaveAs).not.toHaveBeenCalled();
    expect(result.current.isDownloading).toBe(false);
  });

  it('uses individual strategy when getDownloadStrategy returns individual', async () => {
    mockGetDownloadStrategy.mockReturnValue('individual');
    mockBulkDownload.mockResolvedValue({
      downloads: [
        { key: 'gallery/g1/photo1.jpg', downloadUrl: 'https://cdn.example.com/photo1.jpg' },
      ],
    });

    const mockBlob = new Blob(['image-data']);
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(mockBlob),
    });

    const mockClick = vi.fn();
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

    // Should NOT create a ZIP or use share
    expect(mockSaveAs).not.toHaveBeenCalled();
    expect(mockShareFiles).not.toHaveBeenCalled();
    expect(mockCreateObjectURL).toHaveBeenCalled();
    expect(mockRevokeObjectURL).toHaveBeenCalled();
    expect(result.current.isDownloading).toBe(false);

    mockCreateElement.mockRestore();
    mockAppendChild.mockRestore();
    mockRemoveChild.mockRestore();
  });
});
