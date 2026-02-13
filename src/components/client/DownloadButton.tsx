'use client';

import { useState } from 'react';
import { clientGallery } from '@/lib/api';

interface DownloadButtonProps {
  galleryId: string;
  imageKey: string;
  /** Render as compact icon-only button for grid overlay */
  variant?: 'default' | 'icon';
}

export function DownloadButton({ galleryId, imageKey, variant = 'default' }: DownloadButtonProps) {
  const [loading, setLoading] = useState<'full' | 'web' | null>(null);
  const [showMenu, setShowMenu] = useState(false);

  async function handleDownload(size: 'full' | 'web') {
    setLoading(size);
    try {
      const data = await clientGallery.getDownloadUrl(galleryId, imageKey, size);
      // Use an anchor element with download attribute to force download
      const a = document.createElement('a');
      a.href = data.downloadUrl;
      a.download = ''; // Browser will use Content-Disposition filename
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      // Silently fail - download URL generation failed
    } finally {
      setLoading(null);
      setShowMenu(false);
    }
  }

  if (variant === 'icon') {
    return (
      <div className="relative">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(!showMenu);
          }}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-black/40 hover:bg-black/60 text-white/80 hover:text-white transition-all backdrop-blur-sm"
          aria-label="Download image"
        >
          <DownloadIcon className="w-4 h-4" />
        </button>
        {showMenu && (
          <div
            className="absolute bottom-full right-0 mb-2 bg-white rounded-lg shadow-xl border border-neutral-200 overflow-hidden min-w-[160px] z-50"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => handleDownload('full')}
              disabled={loading !== null}
              className="w-full px-4 py-2.5 text-left text-sm hover:bg-neutral-50 flex items-center gap-2 disabled:opacity-50"
            >
              <DownloadIcon className="w-4 h-4 text-neutral-500" />
              <span>{loading === 'full' ? 'Preparing...' : 'Full Size'}</span>
            </button>
            <button
              onClick={() => handleDownload('web')}
              disabled={loading !== null}
              className="w-full px-4 py-2.5 text-left text-sm hover:bg-neutral-50 flex items-center gap-2 border-t border-neutral-100 disabled:opacity-50"
            >
              <WebIcon className="w-4 h-4 text-neutral-500" />
              <span>{loading === 'web' ? 'Preparing...' : 'Web Size'}</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  // Default variant - used in lightbox sidebar
  return (
    <div className="mt-3 space-y-2">
      <p className="text-xs text-neutral-500 font-medium uppercase tracking-wide">Download</p>
      <div className="flex gap-2">
        <button
          onClick={() => handleDownload('full')}
          disabled={loading !== null}
          className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors disabled:opacity-50"
        >
          <DownloadIcon className="w-4 h-4" />
          {loading === 'full' ? 'Preparing...' : 'Full Size'}
        </button>
        <button
          onClick={() => handleDownload('web')}
          disabled={loading !== null}
          className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors disabled:opacity-50"
        >
          <WebIcon className="w-4 h-4" />
          {loading === 'web' ? 'Preparing...' : 'Web Size'}
        </button>
      </div>
    </div>
  );
}

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  );
}

function WebIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
    </svg>
  );
}
