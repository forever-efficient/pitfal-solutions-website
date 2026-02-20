'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { getImageUrl } from '@/lib/utils';
import { SectionDivider } from './SectionDivider';
import { SectionNav } from './SectionNav';
import type { GallerySection } from '@/lib/api';

interface GalleryImage {
  key: string;
  alt?: string;
}

interface GalleryViewerProps {
  images: GalleryImage[];
  title: string;
  sections?: GallerySection[];
}

export function GalleryViewer({ images, title, sections }: GalleryViewerProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Build a flat ordered list: if sections exist, show sectioned images first,
  // then any unsectioned images. If no sections, just show all images.
  const { orderedImages, sectionBreaks } = useMemo(() => {
    if (!sections || sections.length === 0) {
      return { orderedImages: images, sectionBreaks: [] as Array<{ index: number; section: GallerySection }> };
    }

    const ordered: GalleryImage[] = [];
    const breaks: Array<{ index: number; section: GallerySection }> = [];
    const sectionedKeys = new Set<string>();

    for (const section of sections) {
      breaks.push({ index: ordered.length, section });
      for (const imageKey of section.images) {
        const img = images.find(i => i.key === imageKey);
        if (img) {
          ordered.push(img);
          sectionedKeys.add(imageKey);
        }
      }
    }

    // Add unsectioned images at the end
    const unsectioned = images.filter(i => !sectionedKeys.has(i.key));
    if (unsectioned.length > 0) {
      ordered.push(...unsectioned);
    }

    return { orderedImages: ordered, sectionBreaks: breaks };
  }, [images, sections]);

  // Map from flat index to section title for lightbox display
  const getSectionForIndex = useCallback((index: number): string | null => {
    if (sectionBreaks.length === 0) return null;
    let current: string | null = null;
    for (const brk of sectionBreaks) {
      if (brk.index <= index) {
        current = brk.section.title;
      } else {
        break;
      }
    }
    return current;
  }, [sectionBreaks]);

  const openLightbox = useCallback((index: number) => {
    setLightboxIndex(index);
  }, []);

  const closeLightbox = useCallback(() => {
    setLightboxIndex(null);
  }, []);

  const goNext = useCallback(() => {
    setLightboxIndex((prev) => (prev !== null ? (prev + 1) % orderedImages.length : null));
  }, [orderedImages.length]);

  const goPrev = useCallback(() => {
    setLightboxIndex((prev) => (prev !== null ? (prev - 1 + orderedImages.length) % orderedImages.length : null));
  }, [orderedImages.length]);

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

  // Render images grouped by sections
  function renderImages() {
    if (sectionBreaks.length === 0) {
      return renderImageGrid(orderedImages, 0);
    }

    const groups: React.ReactNode[] = [];
    const sectionedKeys = new Set<string>();

    for (let i = 0; i < sectionBreaks.length; i++) {
      const brk = sectionBreaks[i]!;
      const nextBreak = sectionBreaks[i + 1];
      const endIndex = nextBreak ? nextBreak.index : orderedImages.length;

      // Only include images that belong to this section
      const sectionImages = orderedImages.slice(brk.index, endIndex);
      // Track which images are in sections vs unsectioned trailing ones
      for (const img of sectionImages) {
        if (brk.section.images.includes(img.key)) {
          sectionedKeys.add(img.key);
        }
      }
      const actualSectionImages = sectionImages.filter(img => brk.section.images.includes(img.key));

      if (actualSectionImages.length === 0) continue;

      groups.push(
        <div key={brk.section.id} id={`section-${brk.section.id}`}>
          <SectionDivider
            title={brk.section.title}
            description={brk.section.description}
            imageCount={actualSectionImages.length}
          />
          {renderImageGrid(actualSectionImages, brk.index)}
        </div>
      );
    }

    // Unsectioned images
    const unsectioned = orderedImages.filter(img => !sectionedKeys.has(img.key));
    if (unsectioned.length > 0) {
      const startIdx = orderedImages.length - unsectioned.length;
      groups.push(
        <div key="unsectioned">
          <SectionDivider title="More Photos" imageCount={unsectioned.length} />
          {renderImageGrid(unsectioned, startIdx)}
        </div>
      );
    }

    return <>{groups}</>;
  }

  function renderImageGrid(imgs: GalleryImage[], startIndex: number) {
    return (
      <div
        className="columns-1 sm:columns-2 lg:columns-3 gap-4"
        role="list"
        aria-label={`${title} gallery images`}
      >
        {imgs.map((image, i) => {
          const flatIndex = startIndex + i;
          return (
            <button
              key={image.key}
              onClick={() => openLightbox(flatIndex)}
              className="block w-full mb-4 break-inside-avoid group cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 rounded-lg overflow-hidden"
              role="listitem"
              aria-label={image.alt || `Image ${flatIndex + 1} of ${orderedImages.length}`}
            >
              <div className="relative bg-neutral-200 rounded-lg overflow-hidden min-h-[200px]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={getImageUrl(image.key, 'lg')}
                  alt={image.alt || `${title} - Image ${flatIndex + 1}`}
                  className="w-full h-auto object-cover group-hover:scale-[1.02] transition-transform duration-300"
                  onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = getImageUrl(image.key); }}
                />
                <div
                  className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 rounded-lg"
                  aria-hidden="true"
                />
              </div>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <>
      {/* Section navigation */}
      {sections && sections.length > 0 && (
        <SectionNav sections={sections} />
      )}

      {/* Image Grid */}
      {renderImages()}

      {/* Lightbox */}
      {lightboxIndex !== null && (() => {
        const current = orderedImages[lightboxIndex]!;
        const sectionTitle = getSectionForIndex(lightboxIndex);
        return (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-label={`Viewing image ${lightboxIndex + 1} of ${orderedImages.length}`}
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

          {/* Counter + section context */}
          <div className="absolute top-4 left-4 text-white/70 text-sm font-medium" aria-live="polite">
            <span>{lightboxIndex + 1} / {orderedImages.length}</span>
            {sectionTitle && (
              <span className="ml-3 text-white/50">{sectionTitle}</span>
            )}
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
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={getImageUrl(current.key)}
              alt={current.alt || `${title} - Image ${lightboxIndex + 1}`}
              className="max-w-full max-h-[85vh] w-auto h-auto object-contain"
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
