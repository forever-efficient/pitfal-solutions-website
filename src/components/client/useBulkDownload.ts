'use client';

import { useState, useCallback } from 'react';
import { clientGallery } from '@/lib/api';

const CHUNK_SIZE = 100;
const DOWNLOAD_DELAY_MS = 400;

export interface BulkDownloadState {
  isDownloading: boolean;
  progress: { current: number; total: number } | null;
  error: string | null;
}

export function useBulkDownload(galleryId: string) {
  const [state, setState] = useState<BulkDownloadState>({
    isDownloading: false,
    progress: null,
    error: null,
  });

  const startBulkDownload = useCallback(
    async (imageKeys: string[], size: 'full' | 'web' = 'full') => {
      if (imageKeys.length === 0) {
        setState((s) => ({ ...s, error: 'No images to download' }));
        return;
      }

      setState({
        isDownloading: true,
        progress: { current: 0, total: imageKeys.length },
        error: null,
      });

      try {
        const chunks: string[][] = [];
        for (let i = 0; i < imageKeys.length; i += CHUNK_SIZE) {
          chunks.push(imageKeys.slice(i, i + CHUNK_SIZE));
        }

        const allDownloads: Array<{ key: string; downloadUrl: string }> = [];
        for (const chunk of chunks) {
          const result = await clientGallery.bulkDownload(galleryId, chunk, size);
          allDownloads.push(...result.downloads);
        }

        for (let i = 0; i < allDownloads.length; i++) {
          setState((s) =>
            s.progress
              ? { ...s, progress: { current: i + 1, total: allDownloads.length } }
              : s
          );
          const { downloadUrl } = allDownloads[i]!;
          const a = document.createElement('a');
          a.href = downloadUrl;
          a.download = '';
          a.rel = 'noopener noreferrer';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          if (i < allDownloads.length - 1) {
            await new Promise((r) => setTimeout(r, DOWNLOAD_DELAY_MS));
          }
        }

        setState({ isDownloading: false, progress: null, error: null });
      } catch (err) {
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
