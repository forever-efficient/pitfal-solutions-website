'use client';

import { useState, useCallback, useEffect } from 'react';
import Image from 'next/image';
import { getImageUrl } from '@/lib/utils';

interface GalleryImage {
  key: string;
  alt?: string;
}

interface GalleryViewerProps {
  images: GalleryImage[];
  title: string;
}

export function GalleryViewer({ images, title }: GalleryViewerProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const openLightbox = useCallback((index: number) => {
    setLightboxIndex(index);
  }, []);

  const closeLightbox = useCallback(() => {
    setLightboxIndex(null);
  }, []);

  const goNext = useCallback(() => {
    setLightboxIndex((prev) => (prev !== null ? (prev + 1) % images.length : null));
  }, [images.length]);

  const goPrev = useCallback(() => {
    setLightboxIndex((prev) => (prev !== null ? (prev - 1 + images.length) % images.length : null));
  }, [images.length]);

  useEffect(() => {
    if (lightboxIndex === null) return;

    function handleKeyDown(e: KeyboardEvent) {
      switch (e.key) {
        case 'Escape':
          closeLightbox();
          break;
        case 'ArrowRight':
          goNext();
          break;
        case 'ArrowLeft':
          goPrev();
          break;
      }
    }

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [lightboxIndex, closeLightbox, goNext, goPrev]);

  return (
    <>
      {/* Image Grid */}
      <div
        className="columns-1 sm:columns-2 lg:columns-3 gap-4"
        role="list"
        aria-label={`${title} gallery images`}
      >
        {images.map((image, index) => (
          <button
            key={image.key}
            onClick={() => openLightbox(index)}
            className="block w-full mb-4 break-inside-avoid group cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 rounded-lg overflow-hidden"
            role="listitem"
            aria-label={image.alt || `Image ${index + 1} of ${images.length}`}
          >
            <div className="relative bg-neutral-200 rounded-lg overflow-hidden">
              <Image
                src={getImageUrl(image.key)}
                alt={image.alt || `${title} - Image ${index + 1}`}
                width={640}
                height={480}
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                className="w-full h-auto object-cover group-hover:scale-[1.02] transition-transform duration-300"
                loading="lazy"
              />
              <div
                className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 rounded-lg"
                aria-hidden="true"
              />
            </div>
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (() => {
        const current = images[lightboxIndex]!;
        return (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-label={`Viewing image ${lightboxIndex + 1} of ${images.length}`}
          onClick={closeLightbox}
        >
          {/* Close button */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white"
            aria-label="Close lightbox"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Counter */}
          <div className="absolute top-4 left-4 text-white/70 text-sm font-medium" aria-live="polite">
            {lightboxIndex + 1} / {images.length}
          </div>

          {/* Previous */}
          <button
            onClick={(e) => { e.stopPropagation(); goPrev(); }}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white"
            aria-label="Previous image"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Image */}
          <div
            className="max-w-[90vw] max-h-[85vh] relative"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={getImageUrl(current.key)}
              alt={current.alt || `${title} - Image ${lightboxIndex + 1}`}
              width={1920}
              height={1280}
              sizes="90vw"
              className="max-w-full max-h-[85vh] w-auto h-auto object-contain"
              priority
            />
          </div>

          {/* Next */}
          <button
            onClick={(e) => { e.stopPropagation(); goNext(); }}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white"
            aria-label="Next image"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* Caption */}
          {current.alt && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/80 text-sm text-center max-w-lg px-4">
              {current.alt}
            </div>
          )}
        </div>
        );
      })()}
    </>
  );
}
