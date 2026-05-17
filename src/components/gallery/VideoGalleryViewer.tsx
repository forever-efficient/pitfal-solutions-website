'use client';

import { useState, useCallback, useEffect } from 'react';
import { getImageUrl } from '@/lib/utils';

interface GalleryVideo {
  key: string;
  alt?: string;
  previewKey?: string;
  title?: string;
  youtubeUrl?: string;
}

interface VideoGalleryViewerProps {
  videos: GalleryVideo[];
  title: string;
}

function youtubeEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname === 'youtu.be') {
      const id = u.pathname.replace(/^\//, '');
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (u.hostname.endsWith('youtube.com')) {
      const id = u.searchParams.get('v');
      if (id) return `https://www.youtube.com/embed/${id}`;
      if (u.pathname.startsWith('/embed/')) return url;
    }
    return null;
  } catch {
    return null;
  }
}

export function VideoGalleryViewer({ videos, title }: VideoGalleryViewerProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const close = useCallback(() => setOpenIndex(null), []);

  useEffect(() => {
    if (openIndex === null) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') close();
    }
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKey);
    };
  }, [openIndex, close]);

  if (videos.length === 0) {
    return (
      <div className="text-center py-12" role="status">
        <p className="text-neutral-500">No videos in this gallery yet.</p>
      </div>
    );
  }

  return (
    <>
      <div
        className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8"
        role="list"
        aria-label={`${title} videos`}
      >
        {videos.map((video, index) => {
          const previewUrl = video.previewKey ? getImageUrl(video.previewKey) : null;
          return (
            <button
              key={video.key}
              onClick={() => setOpenIndex(index)}
              className="group block w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 rounded-xl overflow-hidden"
              role="listitem"
              aria-label={`Play ${video.title || `Video ${index + 1}`}`}
            >
              <article className="aspect-[16/9] bg-neutral-200 rounded-xl overflow-hidden relative">
                {previewUrl ? (
                  <video
                    src={previewUrl}
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload="metadata"
                    className="absolute inset-0 w-full h-full object-cover"
                    aria-hidden="true"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-neutral-300 to-neutral-400" />
                )}
                <div
                  className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors duration-300 flex items-center justify-center"
                  aria-hidden="true"
                >
                  <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                    <svg
                      className="w-8 h-8 text-neutral-900 ml-1"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </div>
                {video.title && (
                  <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/70 to-transparent">
                    <h3 className="text-white font-semibold text-base">{video.title}</h3>
                  </div>
                )}
              </article>
            </button>
          );
        })}
      </div>

      {openIndex !== null && (() => {
        const current = videos[openIndex]!;
        const embed = current.youtubeUrl ? youtubeEmbedUrl(current.youtubeUrl) : null;
        const fullVideoUrl = getImageUrl(current.key);
        return (
          <div
            className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-label={current.title || `Video ${openIndex + 1}`}
            onClick={close}
          >
            <button
              onClick={close}
              className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white"
              aria-label="Close video"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div
              className="w-full max-w-5xl aspect-[16/9] relative"
              onClick={(e) => e.stopPropagation()}
            >
              {embed ? (
                <iframe
                  src={`${embed}?autoplay=1`}
                  title={current.title || `Video ${openIndex + 1}`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="absolute inset-0 w-full h-full rounded-lg"
                />
              ) : (
                <video
                  src={fullVideoUrl}
                  controls
                  autoPlay
                  playsInline
                  className="absolute inset-0 w-full h-full object-contain bg-black rounded-lg"
                />
              )}
            </div>

            {current.title && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/80 text-sm text-center max-w-lg px-4">
                {current.title}
              </div>
            )}
          </div>
        );
      })()}
    </>
  );
}
