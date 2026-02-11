'use client';

import { useState } from 'react';
import { clientGallery } from '@/lib/api';

interface DownloadButtonProps {
  galleryId: string;
  imageKey: string;
}

export function DownloadButton({ galleryId, imageKey }: DownloadButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleDownload() {
    setLoading(true);
    try {
      const data = await clientGallery.getDownloadUrl(galleryId, imageKey);
      // Open download URL in new tab
      window.open(data.downloadUrl, '_blank');
    } catch {
      // Silently fail - download URL generation failed
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleDownload}
      disabled={loading}
      className="mt-2 inline-flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 font-medium disabled:opacity-50"
    >
      <svg
        className="w-4 h-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
      {loading ? 'Preparing...' : 'Download'}
    </button>
  );
}
