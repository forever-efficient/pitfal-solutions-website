'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { clientGallery, clientAuth, type GallerySection } from '@/lib/api';
import { getImageUrl } from '@/lib/utils';
import { ImageComment } from './ImageComment';
import { DownloadButton } from './DownloadButton';
import { useBulkDownload } from './useBulkDownload';
import { ClientSectionNav } from './ClientSectionNav';

interface GalleryImage {
  key: string;
  alt?: string;
}

interface Comment {
  id: string;
  imageKey: string;
  author: string;
  text: string;
  createdAt: string;
}

interface ClientGalleryViewProps {
  galleryId: string;
  initialTitle?: string;
  requiresPassword?: boolean;
}

export function ClientGalleryView({
  galleryId,
  initialTitle,
  requiresPassword = false,
}: ClientGalleryViewProps) {
  const [gallery, setGallery] = useState<{
    title: string;
    description?: string;
    images: GalleryImage[];
    heroImage?: string | null;
    sections?: GallerySection[];
    category: string;
    heroFocalPoint?: { x: number; y: number };
    heroZoom?: number;
    heroGradientOpacity?: number;
    heroHeight?: 'sm' | 'md' | 'lg';
    kanbanCounts?: { todo: number; inProgress: number; done: number };
  } | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const bulkDownload = useBulkDownload(galleryId);

  useEffect(() => {
    clientGallery
      .get(galleryId)
      .then((data) => {
        setGallery(data.gallery);
        setComments(data.comments);
      })
      .catch((err: unknown) => {
        const message =
          err instanceof Error ? err.message : 'Failed to load gallery';
        setError(message);
      })
      .finally(() => setLoading(false));
  }, [galleryId]);

  // Scroll spy for section navigation
  useEffect(() => {
    if (!gallery?.sections || gallery.sections.length === 0) return;

    const observerOptions = {
      root: null,
      rootMargin: '-10% 0px -80% 0px',
      threshold: 0,
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveSectionId(entry.target.id.replace('section-', ''));
        }
      });
    }, observerOptions);

    const sectionElements = document.querySelectorAll('[id^="section-"]');
    sectionElements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [gallery?.sections, loading]);

  const toggleSectionCollapse = (sectionId: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  const handleLogout = async () => {
    await clientAuth.logout();
    window.location.reload();
  };

  const handleCommentAdded = (comment: Comment) => {
    setComments((prev) => [...prev, comment]);
  };

  const closeLightbox = useCallback(() => setLightboxIndex(null), []);
  const goNext = useCallback(() => {
    if (!gallery) return;
    setLightboxIndex((prev) =>
      prev !== null ? (prev + 1) % gallery.images.length : null
    );
  }, [gallery]);
  const goPrev = useCallback(() => {
    if (!gallery) return;
    setLightboxIndex((prev) =>
      prev !== null
        ? (prev - 1 + gallery.images.length) % gallery.images.length
        : null
    );
  }, [gallery]);

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-neutral-400">Loading gallery...</div>
      </div>
    );
  }

  if (error || !gallery) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Gallery not found'}</p>
          <button
            onClick={handleLogout}
            className="text-primary-600 hover:text-primary-700 font-medium"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  const currentImage =
    lightboxIndex !== null ? gallery.images[lightboxIndex] : null;
  const currentComments = currentImage
    ? comments.filter((c) => c.imageKey === currentImage.key)
    : [];

  const hasSections = gallery.sections && gallery.sections.length > 0;
  const imageIndexMap = new Map(gallery.images.map((img, i) => [img.key, i]));

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <div className="bg-white border-b border-neutral-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-16 md:h-20">
          <div className="flex items-center gap-6">
            <Link href="/" className="shrink-0">
              <Image
                src="/pitfal-solution-logo.png"
                alt="Pitfal Solutions"
                width={220}
                height={64}
                className="h-14 md:h-16 w-auto object-contain"
                priority
              />
            </Link>
            <h1 className="font-display text-xl font-bold text-neutral-900">
              {initialTitle || gallery.title}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            {gallery.kanbanCounts && (
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium text-neutral-500">Work Status:</span>
                {gallery.kanbanCounts.todo > 0 && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-sm font-medium bg-blue-50 text-blue-600">
                    {gallery.kanbanCounts.todo} To Do
                  </span>
                )}
                {gallery.kanbanCounts.inProgress > 0 && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-sm font-medium bg-amber-50 text-amber-600">
                    {gallery.kanbanCounts.inProgress} In Progress
                  </span>
                )}
                {gallery.kanbanCounts.done > 0 && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-sm font-medium bg-emerald-50 text-emerald-600">
                    {gallery.kanbanCounts.done} Done
                  </span>
                )}
              </div>
            )}
            <span className="text-sm text-neutral-500">
              {gallery.images.length} photos
            </span>
            {requiresPassword && gallery.images.length > 0 && !gallery.heroImage && (
              <BulkDownloadButton
                label="Download All"
                isDownloading={bulkDownload.isDownloading}
                progress={bulkDownload.progress}
                error={bulkDownload.error}
                onClearError={bulkDownload.clearError}
                onDownload={(size) =>
                  bulkDownload.startBulkDownload(
                    gallery.images.map((img) => img.key),
                    size
                  )
                }
                variant="header"
              />
            )}
            {requiresPassword && (
              <button
                onClick={handleLogout}
                className="text-sm text-neutral-600 hover:text-neutral-900 font-medium"
              >
                Sign Out
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Dynamic Section Navigation (Scroll-spy) */}
      {hasSections && (
        <div className="sticky top-16 md:top-20 z-30 bg-white/80 backdrop-blur-md border-b border-neutral-200">
          <div className="max-w-7xl mx-auto px-4">
            <ClientSectionNav
              sections={[
                ...(gallery.sections || []),
                ...(gallery.images.some(img => !new Set(gallery.sections?.flatMap(s => s.images) || []).has(img.key))
                  ? [{ id: 'unassigned', title: 'Other Photos', images: [] }]
                  : [])
              ]}
              activeId={activeSectionId}
              onToggleCollapse={toggleSectionCollapse}
              collapsedSections={collapsedSections}
            />
          </div>
        </div>
      )}

      {/* Hero Image */}
      {gallery.heroImage && (() => {
        const focalX = gallery.heroFocalPoint?.x ?? 50;
        const focalY = gallery.heroFocalPoint?.y ?? 50;
        const zoom = gallery.heroZoom ?? 1.0;
        const gradientOpacity = gallery.heroGradientOpacity ?? 0.5;
        const heroHeight = gallery.heroHeight ?? 'md';
        const heightClass = heroHeight === 'sm' ? 'h-[35vh]' : heroHeight === 'lg' ? 'h-[75vh]' : 'h-[55vh]';
        return (
          <div className={`relative w-full overflow-hidden bg-neutral-900 ${heightClass}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={getImageUrl(gallery.heroImage!)}
              alt="Gallery Cover"
              className="absolute inset-0 w-full h-full"
              style={{
                objectFit: 'cover',
                objectPosition: `${focalX}% ${focalY}%`,
                opacity: 0.9,
                transform: zoom !== 1 ? `scale(${zoom})` : undefined,
                transformOrigin: `${focalX}% ${focalY}%`,
              }}
            />
            <div
              className="absolute inset-0 bg-gradient-to-t from-black to-transparent"
              style={{ opacity: gradientOpacity }}
            />
            <div className="absolute bottom-0 left-0 right-0 p-8 text-white max-w-7xl mx-auto flex items-end justify-between gap-4 flex-wrap">
              <div>
                <h2 className="text-4xl md:text-5xl font-display font-bold mb-2">
                  {gallery.title}
                </h2>
                {gallery.category && (
                  <p className="text-lg opacity-90 capitalize">
                    {gallery.category}
                  </p>
                )}
              </div>
              {gallery.description && (
                <p className="self-end text-base opacity-85 max-w-xs md:max-w-sm leading-relaxed">
                  {gallery.description}
                </p>
              )}
              {requiresPassword && gallery.images.length > 0 && (
                <BulkDownloadButton
                  label="Download All"
                  isDownloading={bulkDownload.isDownloading}
                  progress={bulkDownload.progress}
                  error={bulkDownload.error}
                  onClearError={bulkDownload.clearError}
                  onDownload={(size) =>
                    bulkDownload.startBulkDownload(
                      gallery.images.map((img) => img.key),
                      size
                    )
                  }
                  variant="hero"
                />
              )}
            </div>
          </div>
        );
      })()}

      {/* Gallery Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {hasSections ? (
          <div className="space-y-16">
            {gallery.sections?.map((section) => {
              // Find images belonging to this section, preserving order
              const sectionImages = section.images
                .map(key => gallery.images.find(img => img.key === key))
                .filter((img): img is GalleryImage => img !== undefined);

              if (sectionImages.length === 0) return null;
              const isCollapsed = collapsedSections.has(section.id);

              return (
                <div key={section.id} id={`section-${section.id}`} className="scroll-mt-40">
                  <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                    <button
                      onClick={() => toggleSectionCollapse(section.id)}
                      className="group flex items-start gap-4 text-left hover:opacity-80 transition-opacity"
                    >
                      <div className="mt-1 p-1 rounded-md bg-neutral-100 group-hover:bg-neutral-200 transition-colors">
                        <svg
                          className={`w-5 h-5 text-neutral-500 transition-transform duration-300 ${isCollapsed ? '-rotate-90' : ''}`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-2xl font-display font-semibold text-neutral-900">
                          {section.title}
                        </h3>
                        {section.description && (
                          <p className="text-neutral-500 mt-1 max-w-2xl">
                            {section.description}
                          </p>
                        )}
                        <span className="text-sm text-neutral-400 mt-1 block">
                          {sectionImages.length} {sectionImages.length === 1 ? 'photo' : 'photos'}
                        </span>
                      </div>
                    </button>
                    <div className="flex items-center gap-2">
                      {requiresPassword && (
                        <BulkDownloadButton
                          label="Download Section"
                          isDownloading={bulkDownload.isDownloading}
                          progress={bulkDownload.progress}
                          error={bulkDownload.error}
                          onClearError={bulkDownload.clearError}
                          onDownload={(size) =>
                            bulkDownload.startBulkDownload(section.images, size)
                          }
                          variant="section"
                        />
                      )}
                    </div>
                  </div>

                  <div className={`transition-all duration-500 ease-in-out overflow-hidden ${isCollapsed ? 'max-h-0 opacity-0' : 'max-h-[10000px] opacity-100'}`}>
                    <ImageGrid
                      images={sectionImages}
                      imageIndexMap={imageIndexMap}
                      onImageClick={setLightboxIndex}
                      comments={comments}
                      galleryId={galleryId}
                      requiresPassword={requiresPassword}
                    />
                  </div>
                </div>
              );
            })}

            {/* Show unassigned images if any */}
            {(() => {
              const assignedKeys = new Set(gallery.sections?.flatMap(s => s.images) || []);
              const unassignedImages = gallery.images.filter(img => !assignedKeys.has(img.key));

              const isCollapsed = collapsedSections.has('unassigned');
              return (
                <div id="section-unassigned" className="scroll-mt-40">
                  <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                    <button
                      onClick={() => toggleSectionCollapse('unassigned')}
                      className="group flex items-start gap-4 text-left hover:opacity-80 transition-opacity"
                    >
                      <div className="mt-1 p-1 rounded-md bg-neutral-100 group-hover:bg-neutral-200 transition-colors">
                        <svg
                          className={`w-5 h-5 text-neutral-500 transition-transform duration-300 ${isCollapsed ? '-rotate-90' : ''}`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-2xl font-display font-semibold text-neutral-900">
                          Other Photos
                        </h3>
                        <span className="text-sm text-neutral-400 mt-1 block">
                          {unassignedImages.length} {unassignedImages.length === 1 ? 'photo' : 'photos'}
                        </span>
                      </div>
                    </button>
                    {requiresPassword && (
                      <BulkDownloadButton
                        label="Download Section"
                        isDownloading={bulkDownload.isDownloading}
                        progress={bulkDownload.progress}
                        error={bulkDownload.error}
                        onClearError={bulkDownload.clearError}
                        onDownload={(size) =>
                          bulkDownload.startBulkDownload(
                            unassignedImages.map((img) => img.key),
                            size
                          )
                        }
                        variant="section"
                      />
                    )}
                  </div>
                  <div className={`transition-all duration-500 ease-in-out overflow-hidden ${isCollapsed ? 'max-h-0 opacity-0' : 'max-h-[10000px] opacity-100'}`}>
                    <ImageGrid
                      images={unassignedImages}
                      imageIndexMap={imageIndexMap}
                      onImageClick={setLightboxIndex}
                      comments={comments}
                      galleryId={galleryId}
                      requiresPassword={requiresPassword}
                    />
                  </div>
                </div>
              );
              return null;
            })()}
          </div>
        ) : (
          <ImageGrid
            images={gallery.images}
            imageIndexMap={imageIndexMap}
            onImageClick={setLightboxIndex}
            comments={comments}
            galleryId={galleryId}
            requiresPassword={requiresPassword}
          />
        )}
      </div>

      {/* Lightbox */}

      {/* Lightbox */}
      {lightboxIndex !== null && currentImage && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex"
          role="dialog"
          aria-modal="true"
          onClick={closeLightbox}
        >
          {/* Image area */}
          <div className="flex-1 flex items-center justify-center relative">
            <button
              onClick={closeLightbox}
              className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white"
              aria-label="Close"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>

            <div className="absolute top-4 left-4 text-white/70 text-sm">
              {lightboxIndex + 1} / {gallery.images.length}
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                goPrev();
              }}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white"
              aria-label="Previous"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>

            <div
              className="max-w-[70vw] max-h-[85vh] relative"
              onClick={(e) => e.stopPropagation()}
            >
              <Image
                src={getImageUrl(currentImage.key)}
                alt={currentImage.alt || `Photo ${lightboxIndex + 1}`}
                width={1920}
                height={1280}
                sizes="70vw"
                className="max-w-full max-h-[85vh] w-auto h-auto object-contain"
                priority
                unoptimized={true}
              />
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                goNext();
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white"
              aria-label="Next"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>

          {/* Side panel for comments + download */}
          <div
            className="w-80 bg-white flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-neutral-200">
              <h3 className="font-medium text-neutral-900">
                {currentImage.alt || `Photo ${lightboxIndex + 1}`}
              </h3>
              {requiresPassword && (
                <DownloadButton
                  galleryId={galleryId}
                  imageKey={currentImage.key}
                />
              )}
            </div>
            <div className="flex-1 overflow-y-auto">
              <ImageComment
                galleryId={galleryId}
                imageKey={currentImage.key}
                comments={currentComments}
                onCommentAdded={handleCommentAdded}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface BulkDownloadButtonProps {
  label: string;
  isDownloading: boolean;
  progress: { current: number; total: number } | null;
  error: string | null;
  onClearError: () => void;
  onDownload: (size: 'full' | 'web') => void;
  variant: 'header' | 'hero' | 'section';
}

function BulkDownloadButton({
  label,
  isDownloading,
  progress,
  error,
  onClearError,
  onDownload,
  variant,
}: BulkDownloadButtonProps) {
  const [showMenu, setShowMenu] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showMenu) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    }
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showMenu]);

  const progressText =
    progress && progress.total > 0
      ? `Downloading ${progress.current} of ${progress.total}`
      : 'Preparing…';

  const base =
    'inline-flex items-center gap-2 font-medium rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-70';
  const styles = {
    header:
      'text-sm px-3 py-2 text-neutral-700 bg-neutral-100 hover:bg-neutral-200 focus-visible:ring-neutral-500' as const,
    hero:
      'text-sm px-4 py-2.5 bg-white/20 hover:bg-white/30 text-white border border-white/40 focus-visible:ring-white' as const,
    section:
      'text-sm px-3 py-1.5 text-neutral-600 bg-neutral-100 hover:bg-neutral-200 focus-visible:ring-primary-500' as const,
  };

  const isHero = variant === 'hero';
  const menuContent = (
    <div
      className={`absolute right-0 z-50 min-w-[160px] rounded-lg border border-neutral-200 bg-white shadow-xl overflow-hidden ${isHero ? 'bottom-full mb-2 border-white/30 bg-neutral-900/95' : 'top-full mt-2'
        }`}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={() => {
          onDownload('full');
          setShowMenu(false);
        }}
        className={`w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 hover:bg-neutral-50 transition-colors ${isHero ? 'text-white hover:bg-white/10' : 'text-neutral-700'
          }`}
      >
        <BulkDownloadIcon className={`w-4 h-4 shrink-0 ${isHero ? 'text-white/80' : 'text-neutral-500'}`} />
        <span>Full Size</span>
      </button>
      <button
        type="button"
        onClick={() => {
          onDownload('web');
          setShowMenu(false);
        }}
        className={`w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 border-t transition-colors ${isHero
          ? 'border-white/20 text-white hover:bg-white/10'
          : 'border-neutral-100 text-neutral-700 hover:bg-neutral-50'
          }`}
      >
        <WebSizeIcon className={`w-4 h-4 shrink-0 ${isHero ? 'text-white/80' : 'text-neutral-500'}`} />
        <span>Web Size</span>
      </button>
    </div>
  );

  return (
    <div ref={containerRef} className="relative flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={() => {
          if (isDownloading) return;
          setShowMenu((prev) => !prev);
        }}
        disabled={isDownloading}
        className={`${base} ${styles[variant]}`}
        aria-busy={isDownloading}
        aria-expanded={showMenu}
        aria-haspopup="true"
        aria-live="polite"
        aria-label={label}
      >
        <BulkDownloadIcon className="w-4 h-4 shrink-0" />
        {isDownloading ? progressText : label}
      </button>
      {showMenu && !isDownloading && menuContent}
      {error && (
        <p className="text-xs text-red-600 flex items-center gap-1">
          {error}
          <button
            type="button"
            onClick={onClearError}
            className="underline hover:no-underline"
            aria-label="Dismiss error"
          >
            Dismiss
          </button>
        </p>
      )}
    </div>
  );
}

function WebSizeIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
      />
    </svg>
  );
}

function BulkDownloadIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
      />
    </svg>
  );
}

interface ImageGridProps {
  images: GalleryImage[];
  imageIndexMap: Map<string, number>;
  onImageClick: (index: number) => void;
  comments: Comment[];
  galleryId: string;
  requiresPassword: boolean;
}

function ImageGrid({ images, imageIndexMap, onImageClick, comments, galleryId, requiresPassword }: ImageGridProps) {
  return (
    <div className="columns-1 sm:columns-2 lg:columns-3 gap-4">
      {images.map((image) => {
        const globalIndex = imageIndexMap.get(image.key) ?? 0;
        return (
          <div
            key={image.key}
            className="relative group rounded-lg overflow-hidden break-inside-avoid mb-4"
          >
            <button
              onClick={() => onImageClick(globalIndex)}
              className="block w-full cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 rounded-lg overflow-hidden text-left relative"
            >
              <div className="relative bg-neutral-200 rounded-lg overflow-hidden min-h-[200px] z-0">
                {/* Using standard img tag with z-index fixes that resolved visibility issues */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={getImageUrl(image.key, 'lg')}
                  alt={image.alt || `Photo ${globalIndex + 1}`}
                  className="w-full h-auto object-cover group-hover:scale-[1.02] transition-transform duration-300 relative z-10"
                  loading="eager"
                />
              </div>
            </button>
            {/* Download icon overlay - bottom right */}
            {requiresPassword && (
              <div className="absolute bottom-2 right-2 z-30 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <DownloadButton
                  galleryId={galleryId}
                  imageKey={image.key}
                  variant="icon"
                />
              </div>
            )}
            {/* Comment badge - top right */}
            {comments.some((c) => c.imageKey === image.key) && (
              <div className="absolute top-2 right-2 bg-primary-600 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center z-20">
                {comments.filter((c) => c.imageKey === image.key).length}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

