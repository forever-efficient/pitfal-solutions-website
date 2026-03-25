'use client';

import { useState, useCallback } from 'react';
import { clientGallery } from '@/lib/api';
import { getDownloadStrategy } from '@/lib/platform';
import { shareFiles } from '@/lib/shareFiles';

const CHUNK_SIZE = 100;
const CONCURRENCY_LIMIT = 4;

export interface BulkDownloadProgress {
  current: number;
  total: number;
  phase: 'fetching' | 'zipping' | 'sharing';
  batchCurrent?: number;
  batchTotal?: number;
}

export interface BulkDownloadState {
  isDownloading: boolean;
  progress: BulkDownloadProgress | null;
  error: string | null;
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

export function useBulkDownload(galleryId: string) {
  const [state, setState] = useState<BulkDownloadState>({
    isDownloading: false,
    progress: null,
    error: null,
  });

  const startBulkDownload = useCallback(
    async (imageKeys: string[], size: 'full' | 'web' = 'full', galleryName?: string) => {
      if (imageKeys.length === 0) {
        setState((s) => ({ ...s, error: 'No images to download' }));
        return;
      }

      const strategy = getDownloadStrategy();

      setState({
        isDownloading: true,
        progress: { current: 0, total: imageKeys.length, phase: 'fetching' },
        error: null,
      });

      try {
        // Step 1: Get presigned URLs (chunked for large galleries)
        const chunks: string[][] = [];
        for (let i = 0; i < imageKeys.length; i += CHUNK_SIZE) {
          chunks.push(imageKeys.slice(i, i + CHUNK_SIZE));
        }

        const allDownloads: Array<{ key: string; downloadUrl: string }> = [];
        for (const chunk of chunks) {
          const result = await clientGallery.bulkDownload(galleryId, chunk, size);
          allDownloads.push(...result.downloads);
        }

        // Step 2: Fetch image blobs with concurrency limit
        const fetchedFiles: Array<{ filename: string; blob: Blob }> = [];
        let fetched = 0;

        for (let i = 0; i < allDownloads.length; i += CONCURRENCY_LIMIT) {
          const batch = allDownloads.slice(i, i + CONCURRENCY_LIMIT);
          const results = await Promise.allSettled(
            batch.map(async ({ key, downloadUrl }) => {
              const response = await fetch(downloadUrl);
              if (!response.ok) throw new Error(`Failed to fetch ${key}`);
              const blob = await response.blob();
              const filename = key.split('/').pop() || `image-${fetched}.jpg`;
              return { filename, blob };
            })
          );

          for (const result of results) {
            if (result.status === 'fulfilled') {
              fetchedFiles.push(result.value);
            }
          }

          fetched += batch.length;
          setState((s) => ({
            ...s,
            progress: { current: fetched, total: allDownloads.length, phase: 'fetching' },
          }));
        }

        // Step 3: Deliver files based on strategy
        if (strategy === 'share') {
          // Convert blobs to File objects for Web Share API
          const files = fetchedFiles.map(
            ({ filename, blob }) => new File([blob], filename, { type: blob.type || 'image/jpeg' })
          );

          setState((s) => ({
            ...s,
            progress: { current: 0, total: files.length, phase: 'sharing', batchCurrent: 1, batchTotal: Math.ceil(files.length / 20) },
          }));

          await shareFiles(files, (shareProgress) => {
            setState((s) => ({
              ...s,
              progress: {
                current: shareProgress.current,
                total: shareProgress.total,
                phase: 'sharing',
                batchCurrent: shareProgress.batchCurrent,
                batchTotal: shareProgress.batchTotal,
              },
            }));
          });
        } else if (strategy === 'individual') {
          // Download files one-by-one on mobile without share support
          for (let i = 0; i < fetchedFiles.length; i++) {
            const { filename, blob } = fetchedFiles[i]!;
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            setState((s) => ({
              ...s,
              progress: { current: i + 1, total: fetchedFiles.length, phase: 'fetching' },
            }));

            // Small delay between downloads to avoid browser throttling
            if (i < fetchedFiles.length - 1) {
              await new Promise((resolve) => setTimeout(resolve, 300));
            }
          }
        } else {
          // Desktop: ZIP download — lazy-load JSZip + file-saver (large deps, zip path only)
          const [{ default: JSZip }, { saveAs }] = await Promise.all([
            import('jszip'),
            import('file-saver'),
          ]);
          const zip = new JSZip();
          for (const { filename, blob } of fetchedFiles) {
            zip.file(filename, blob);
          }

          setState((s) => ({
            ...s,
            progress: { current: 0, total: 0, phase: 'zipping' },
          }));

          const zipBlob = await zip.generateAsync({ type: 'blob' });
          const safeName = galleryName ? sanitizeFilename(galleryName) : '';
          const zipFilename = safeName ? `${safeName}.zip` : 'gallery-photos.zip';
          saveAs(zipBlob, zipFilename);
        }

        setState({ isDownloading: false, progress: null, error: null });
      } catch (err) {
        // Don't show error for user-cancelled share
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
      }
    },
    [galleryId]
  );

  const clearError = useCallback(() => {
    setState((s) => (s.error ? { ...s, error: null } : s));
  }, []);

  return { ...state, startBulkDownload, clearError };
}
