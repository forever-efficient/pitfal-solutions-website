'use client';

import { useState, useCallback, useRef } from 'react';
import { clientGallery } from '@/lib/api';
import { getDownloadStrategy } from '@/lib/platform';
import { shareFiles } from '@/lib/shareFiles';

const CHUNK_SIZE = 100; // Max images per API request (Lambda limit)
const CONCURRENCY_LIMIT = 4; // Parallel fetches per group
const BATCH_MAX_BYTES = 200 * 1024 * 1024; // 200 MB per ZIP — safe for all browsers
const FALLBACK_BATCH_COUNT = 20; // Images per batch when sizes unknown (~500MB at 25MB/file)
const MAX_RETRIES = 2; // Retry failed fetches
const RETRY_DELAY_MS = 1000; // Delay between retries

export interface BulkDownloadProgress {
  current: number;
  total: number;
  phase: 'fetching' | 'zipping' | 'sharing' | 'saving';
  batchCurrent?: number;
  batchTotal?: number;
  overallCurrent?: number;
  overallTotal?: number;
  failedCount?: number;
}

export interface ResumeState {
  completedBatches: number[];
  totalBatches: number;
  imageCount: number;
}

export interface BulkDownloadState {
  isDownloading: boolean;
  progress: BulkDownloadProgress | null;
  error: string | null;
}

interface SizedDownload {
  key: string;
  downloadUrl: string;
  sizeBytes: number;
}

interface DownloadContext {
  galleryId: string;
  size: 'full' | 'web';
  signal: AbortSignal;
  setState: (updater: (s: BulkDownloadState) => BulkDownloadState) => void;
}

function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9\s-_]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
    .slice(0, 100);
}

export function partitionIntoBatches(
  downloads: SizedDownload[],
  maxBatchBytes: number
): SizedDownload[][] {
  const batches: SizedDownload[][] = [];
  let currentBatch: SizedDownload[] = [];
  let currentSize = 0;

  for (const dl of downloads) {
    const fileSize = dl.sizeBytes || 0;

    if (currentBatch.length > 0 && currentSize + fileSize > maxBatchBytes) {
      batches.push(currentBatch);
      currentBatch = [];
      currentSize = 0;
    }

    currentBatch.push(dl);
    currentSize += fileSize;
  }

  if (currentBatch.length > 0) {
    batches.push(currentBatch);
  }

  return batches;
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

/** Deduplicate filenames within a ZIP by appending a counter */
function deduplicateFilename(name: string, seen: Set<string>): string {
  if (!seen.has(name)) {
    seen.add(name);
    return name;
  }
  const dot = name.lastIndexOf('.');
  const base = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : '';
  let counter = 2;
  let candidate = `${base}-${counter}${ext}`;
  while (seen.has(candidate)) {
    counter++;
    candidate = `${base}-${counter}${ext}`;
  }
  seen.add(candidate);
  return candidate;
}

/** Fetch a blob with retry logic */
async function fetchBlobWithRetry(
  url: string,
  signal: AbortSignal,
  retries = MAX_RETRIES
): Promise<Blob> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, { signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.blob();
    } catch (err) {
      if (signal.aborted) throw err;
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * (attempt + 1)));
    }
  }
  throw new Error('Fetch failed'); // unreachable, satisfies TS
}

/** Fetch presigned URLs for a batch of image keys (handles chunking at 100) */
async function fetchPresignedUrls(
  galleryId: string,
  imageKeys: string[],
  size: 'full' | 'web'
): Promise<SizedDownload[]> {
  const chunks = chunkArray(imageKeys, CHUNK_SIZE);
  const downloads: SizedDownload[] = [];

  for (const chunk of chunks) {
    const result = await clientGallery.bulkDownload(galleryId, chunk, size);
    downloads.push(
      ...result.downloads.map((d) => ({
        key: d.key,
        downloadUrl: d.downloadUrl,
        sizeBytes: d.sizeBytes ?? 0,
      }))
    );
  }

  return downloads;
}

// ============ Resume helpers (sessionStorage) ============

function getResumeKey(galleryId: string, size: 'full' | 'web'): string {
  return `bulkdl:${galleryId}:${size}`;
}

export function getResumeState(
  galleryId: string,
  size: 'full' | 'web',
  currentImageCount: number
): ResumeState | null {
  try {
    const raw = sessionStorage.getItem(getResumeKey(galleryId, size));
    if (!raw) return null;
    const state: ResumeState = JSON.parse(raw);
    if (state.imageCount !== currentImageCount) return null;
    if (state.completedBatches.length === 0) return null;
    if (state.completedBatches.length >= state.totalBatches) return null;
    return state;
  } catch {
    return null;
  }
}

function saveCompletedBatch(
  galleryId: string,
  size: 'full' | 'web',
  batchIdx: number,
  totalBatches: number,
  imageCount: number
): void {
  try {
    const key = getResumeKey(galleryId, size);
    const raw = sessionStorage.getItem(key);
    const state: ResumeState = raw
      ? JSON.parse(raw)
      : { completedBatches: [], totalBatches, imageCount };
    if (!state.completedBatches.includes(batchIdx)) {
      state.completedBatches.push(batchIdx);
    }
    state.totalBatches = totalBatches;
    state.imageCount = imageCount;
    sessionStorage.setItem(key, JSON.stringify(state));
  } catch {
    // sessionStorage full or unavailable — non-critical
  }
}

export function clearResumeState(galleryId: string, size: 'full' | 'web'): void {
  try {
    sessionStorage.removeItem(getResumeKey(galleryId, size));
  } catch {
    // non-critical
  }
}

export function useBulkDownload(galleryId: string) {
  const [state, setState] = useState<BulkDownloadState>({
    isDownloading: false,
    progress: null,
    error: null,
  });
  const abortRef = useRef<AbortController | null>(null);

  const startBulkDownload = useCallback(
    async (
      imageKeys: string[],
      size: 'full' | 'web' = 'full',
      galleryName?: string,
      options?: { resumeFrom?: number }
    ) => {
      if (imageKeys.length === 0) {
        setState((s) => ({ ...s, error: 'No images to download' }));
        return;
      }

      // Prevent double-starts
      if (abortRef.current) return;

      const abortController = new AbortController();
      abortRef.current = abortController;

      const strategy = getDownloadStrategy();

      setState({
        isDownloading: true,
        progress: { current: 0, total: imageKeys.length, phase: 'fetching' },
        error: null,
      });

      try {
        const ctx: DownloadContext = {
          galleryId,
          size,
          signal: abortController.signal,
          setState,
        };

        if (strategy === 'zip') {
          await handleZipDownload(imageKeys, galleryName, ctx, options?.resumeFrom);
        } else if (strategy === 'share') {
          await handleShareDownload(imageKeys, ctx);
        } else {
          await handleIndividualDownload(imageKeys, ctx);
        }

        // Clear resume state on successful full completion
        if (strategy === 'zip') {
          clearResumeState(galleryId, size);
        }

        setState({ isDownloading: false, progress: null, error: null });
      } catch (err) {
        if (abortController.signal.aborted) {
          setState({ isDownloading: false, progress: null, error: null });
          return;
        }
        if (err instanceof Error && err.name === 'AbortError') {
          setState({ isDownloading: false, progress: null, error: null });
          return;
        }
        const message =
          err instanceof Error ? err.message : 'Download failed';
        setState({
          isDownloading: false,
          progress: null,
          error: message,
        });
      } finally {
        abortRef.current = null;
      }
    },
    [galleryId]
  );

  const cancelDownload = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  }, []);

  const clearError = useCallback(() => {
    setState((s) => (s.error ? { ...s, error: null } : s));
  }, []);

  return { ...state, startBulkDownload, cancelDownload, clearError };
}

// ============ ZIP STRATEGY (Desktop) — Batched with per-batch URL fetching ============

async function handleZipDownload(
  imageKeys: string[],
  galleryName: string | undefined,
  ctx: DownloadContext,
  startFromBatch?: number
) {
  const [{ default: JSZip }, fileSaverModule] = await Promise.all([
    import('jszip'),
    import('file-saver'),
  ]);
  // file-saver is CJS — saveAs may be default or named export depending on bundler
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fsm = fileSaverModule as any;
  const saveAs: (blob: Blob, filename: string) => void =
    typeof fsm.saveAs === 'function'
      ? fsm.saveAs
      : typeof fsm.default === 'function'
        ? fsm.default
        : fsm;

  if (typeof saveAs !== 'function') {
    throw new Error('File download is not supported in this browser');
  }

  // Step 1: Get sizes first for smart batching (single API call for all keys)
  const allDownloads = await fetchPresignedUrls(ctx.galleryId, imageKeys, ctx.size);
  if (ctx.signal.aborted) return;

  // Step 2: Plan batches based on file sizes
  const totalSizeKnown = allDownloads.some((d) => d.sizeBytes > 0);
  const keyBatches = totalSizeKnown
    ? partitionIntoBatches(allDownloads, BATCH_MAX_BYTES).map((b) => b.map((d) => d.key))
    : chunkArray(imageKeys, FALLBACK_BATCH_COUNT);

  const totalBatches = keyBatches.length;
  const totalImages = imageKeys.length;
  const safeName = galleryName ? sanitizeFilename(galleryName) : '';
  const baseName = safeName || 'gallery-photos';

  const firstBatch = startFromBatch ?? 0;
  // Estimate images already done when resuming (for progress display)
  const skippedImages = firstBatch > 0
    ? keyBatches.slice(0, firstBatch).reduce((sum, b) => sum + b.length, 0)
    : 0;

  let overallFetched = skippedImages;
  let totalFailed = 0;

  for (let batchIdx = firstBatch; batchIdx < totalBatches; batchIdx++) {
    if (ctx.signal.aborted) return;

    const batchKeys = keyBatches[batchIdx]!;

    // Fetch FRESH presigned URLs for this batch (avoids 1-hour expiration issue)
    const batchDownloads = await fetchPresignedUrls(ctx.galleryId, batchKeys, ctx.size);
    if (ctx.signal.aborted) return;

    // Fetch blobs for this batch
    const batchFiles: Array<{ filename: string; blob: Blob }> = [];
    const seenFilenames = new Set<string>();
    let batchFetched = 0;

    for (let i = 0; i < batchDownloads.length; i += CONCURRENCY_LIMIT) {
      if (ctx.signal.aborted) return;

      const group = batchDownloads.slice(i, i + CONCURRENCY_LIMIT);
      const results = await Promise.allSettled(
        group.map(async ({ key, downloadUrl }) => {
          const blob = await fetchBlobWithRetry(downloadUrl, ctx.signal);
          const rawName = key.split('/').pop() || `image-${batchFetched}.jpg`;
          const filename = deduplicateFilename(rawName, seenFilenames);
          return { filename, blob };
        })
      );

      for (const result of results) {
        if (result.status === 'fulfilled') {
          batchFiles.push(result.value);
        } else {
          totalFailed++;
        }
      }

      batchFetched += group.length;
      overallFetched += group.length;
      ctx.setState((s) => ({
        ...s,
        progress: {
          current: batchFetched,
          total: batchDownloads.length,
          phase: 'fetching',
          batchCurrent: batchIdx + 1,
          batchTotal: totalBatches,
          overallCurrent: overallFetched,
          overallTotal: totalImages,
          failedCount: totalFailed,
        },
      }));
    }

    if (ctx.signal.aborted) return;

    // Skip empty batches (all fetches failed)
    if (batchFiles.length === 0) continue;

    // Create ZIP
    ctx.setState((s) => ({
      ...s,
      progress: {
        ...s.progress!,
        phase: 'zipping',
      },
    }));

    const zip = new JSZip();
    for (const { filename, blob } of batchFiles) {
      zip.file(filename, blob);
    }
    const zipBlob = await zip.generateAsync({ type: 'blob' });

    // Explicitly release blob references before saving
    batchFiles.length = 0;

    if (ctx.signal.aborted) return;

    // Save ZIP
    ctx.setState((s) => ({
      ...s,
      progress: { ...s.progress!, phase: 'saving' },
    }));

    const zipFilename =
      totalBatches > 1
        ? `${baseName}-part-${batchIdx + 1}.zip`
        : `${baseName}.zip`;
    saveAs(zipBlob, zipFilename);

    // Track completed batch for resume capability
    saveCompletedBatch(ctx.galleryId, ctx.size, batchIdx, totalBatches, totalImages);

    // Delay between saves to let browser process and avoid popup blocker
    if (batchIdx < totalBatches - 1) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
  }
}

// ============ SHARE STRATEGY (Mobile with Web Share API) — Batched ============

async function handleShareDownload(
  imageKeys: string[],
  ctx: DownloadContext
) {
  // Process in small batches to avoid memory issues on mobile
  const SHARE_FETCH_BATCH = 20;
  const keyBatches = chunkArray(imageKeys, SHARE_FETCH_BATCH);
  let overallShared = 0;

  for (let batchIdx = 0; batchIdx < keyBatches.length; batchIdx++) {
    if (ctx.signal.aborted) return;

    const batchKeys = keyBatches[batchIdx]!;

    // Fetch fresh presigned URLs for this batch
    const batchDownloads = await fetchPresignedUrls(ctx.galleryId, batchKeys, ctx.size);
    if (ctx.signal.aborted) return;

    // Fetch blobs
    const files: File[] = [];
    for (let i = 0; i < batchDownloads.length; i += CONCURRENCY_LIMIT) {
      if (ctx.signal.aborted) return;
      const group = batchDownloads.slice(i, i + CONCURRENCY_LIMIT);
      const results = await Promise.allSettled(
        group.map(async ({ key, downloadUrl }) => {
          const blob = await fetchBlobWithRetry(downloadUrl, ctx.signal);
          const filename = key.split('/').pop() || 'photo.jpg';
          return new File([blob], filename, { type: blob.type || 'image/jpeg' });
        })
      );
      for (const result of results) {
        if (result.status === 'fulfilled') files.push(result.value);
      }
    }

    if (ctx.signal.aborted || files.length === 0) return;

    ctx.setState((s) => ({
      ...s,
      progress: {
        current: overallShared,
        total: imageKeys.length,
        phase: 'sharing',
        batchCurrent: batchIdx + 1,
        batchTotal: keyBatches.length,
      },
    }));

    await shareFiles(files, (shareProgress) => {
      ctx.setState((s) => ({
        ...s,
        progress: {
          current: overallShared + shareProgress.current,
          total: imageKeys.length,
          phase: 'sharing',
          batchCurrent: batchIdx + 1,
          batchTotal: keyBatches.length,
        },
      }));
    });

    overallShared += files.length;
  }
}

// ============ INDIVIDUAL STRATEGY (Mobile without share) — Stream one at a time ============

async function handleIndividualDownload(
  imageKeys: string[],
  ctx: DownloadContext
) {
  // Download one image at a time — no memory accumulation
  for (let i = 0; i < imageKeys.length; i++) {
    if (ctx.signal.aborted) return;

    // Fetch fresh presigned URL for this single image
    const [download] = await fetchPresignedUrls(ctx.galleryId, [imageKeys[i]!], ctx.size);
    if (ctx.signal.aborted || !download) continue;

    try {
      const blob = await fetchBlobWithRetry(download.downloadUrl, ctx.signal);
      const filename = download.key.split('/').pop() || `image-${i}.jpg`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // Skip failed individual downloads
    }

    ctx.setState((s) => ({
      ...s,
      progress: { current: i + 1, total: imageKeys.length, phase: 'saving' },
    }));

    // Delay between downloads to avoid browser throttling
    if (i < imageKeys.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }
}
