'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { clientGallery, clientAuth, type GallerySection } from '@/lib/api';
import { getImageUrl, isRawFile, getRawFormatLabel } from '@/lib/utils';
import { ImageComment } from './ImageComment';
import { DownloadButton } from './DownloadButton';
import { useBulkDownload, clearResumeState, getResumeState, type BulkDownloadProgress, type ResumeState } from './useBulkDownload';
import { ClientSectionNav } from './ClientSectionNav';

interface GalleryImage {
  key: string;
  alt?: string;
}

interface GalleryVideo {
  key: string;
  alt?: string;
  previewKey?: string;
  title?: string;
  youtubeUrl?: string;
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
    allowDownloads?: boolean;
    kanbanCounts?: { todo: number; inProgress: number; done: number };
    videos?: GalleryVideo[];
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
    const count = gallery.images.filter(img => !isRawFile(img.key)).length;
    setLightboxIndex((prev) =>
      prev !== null ? (prev + 1) % count : null
    );
  }, [gallery]);
  const goPrev = useCallback(() => {
    if (!gallery) return;
    const count = gallery.images.filter(img => !isRawFile(img.key)).length;
    setLightboxIndex((prev) =>
      prev !== null
        ? (prev - 1 + count) % count
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

  // Viewable images exclude RAW files (RAW can't render in lightbox)
  const viewableImages = gallery.images.filter(img => !isRawFile(img.key));
  const currentImage =
    lightboxIndex !== null ? viewableImages[lightboxIndex] : null;
  const currentComments = currentImage
    ? comments.filter((c) => c.imageKey === currentImage.key)
    : [];

  const hasSections = gallery.sections && gallery.sections.length > 0;
  // Map viewable image keys to their lightbox index
  const viewableIndexMap = new Map(viewableImages.map((img, i) => [img.key, i]));
  const allowDownloads = !!gallery.allowDownloads;
  const rawCount = gallery.images.length - viewableImages.length;

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <div className="bg-white border-b border-neutral-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-16 md:h-20">
          <div className="flex items-center gap-3 md:gap-6 min-w-0 flex-1">
            <Link href="/" className="shrink-0">
              <Image
                src="/pitfal-solution-logo.png"
                alt="Pitfal Solutions"
                width={220}
                height={64}
                className="h-10 md:h-16 w-auto object-contain"
                priority
              />
            </Link>
            <h1 className="font-display text-base md:text-xl font-bold text-neutral-900 truncate">
              {gallery.title || initialTitle}
            </h1>
          </div>
          <div className="flex items-center gap-2 md:gap-4 shrink-0">
            {gallery.kanbanCounts && (
              <div className="hidden md:flex items-center gap-1.5">
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
              {viewableImages.length} {viewableImages.length === 1 ? 'photo' : 'photos'}
              {rawCount > 0 && `, ${rawCount} raw ${rawCount === 1 ? 'file' : 'files'}`}
              {gallery.videos && gallery.videos.length > 0 && `, ${gallery.videos.length} ${gallery.videos.length === 1 ? 'video' : 'videos'}`}
            </span>
            {allowDownloads && gallery.images.length > 0 && !gallery.heroImage && (
              <BulkDownloadButton
                label="Download All"
                isDownloading={bulkDownload.isDownloading}
                progress={bulkDownload.progress}
                error={bulkDownload.error}
                onClearError={bulkDownload.clearError}
                onCancel={bulkDownload.cancelDownload}
                galleryId={galleryId}
                imageCount={gallery.images.length}
                onResume={(size, resumeFrom) =>
                  bulkDownload.startBulkDownload(
                    gallery.images.map((img) => img.key),
                    size,
                    gallery.title,
                    { resumeFrom }
                  )
                }
                onClearResume={(size) => clearResumeState(galleryId, size)}
                onDownload={(size) =>
                  bulkDownload.startBulkDownload(
                    gallery.images.map((img) => img.key),
                    size,
                    gallery.title
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
              {allowDownloads && gallery.images.length > 0 && (
                <BulkDownloadButton
                  label="Download All"
                  isDownloading={bulkDownload.isDownloading}
                  progress={bulkDownload.progress}
                  error={bulkDownload.error}
                  onClearError={bulkDownload.clearError}
                  onCancel={bulkDownload.cancelDownload}
                  galleryId={galleryId}
                  imageCount={gallery.images.length}
                  onResume={(size, resumeFrom) =>
                    bulkDownload.startBulkDownload(
                      gallery.images.map((img) => img.key),
                      size,
                      gallery.title,
                      { resumeFrom }
                    )
                  }
                  onClearResume={(size) => clearResumeState(galleryId, size)}
                  onDownload={(size) =>
                    bulkDownload.startBulkDownload(
                      gallery.images.map((img) => img.key),
                      size,
                      gallery.title
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
                      {allowDownloads && (
                        <BulkDownloadButton
                          label="Download Section"
                          isDownloading={bulkDownload.isDownloading}
                          progress={bulkDownload.progress}
                          error={bulkDownload.error}
                          onClearError={bulkDownload.clearError}
                          onCancel={bulkDownload.cancelDownload}
                          onDownload={(size) =>
                            bulkDownload.startBulkDownload(section.images, size, section.title)
                          }
                          variant="section"
                        />
                      )}
                    </div>
                  </div>

                  <div className={`transition-all duration-500 ease-in-out overflow-hidden ${isCollapsed ? 'max-h-0 opacity-0' : 'max-h-[10000px] opacity-100'}`}>
                    <ImageGrid
                      images={sectionImages}
                      viewableIndexMap={viewableIndexMap}
                      onImageClick={setLightboxIndex}
                      comments={comments}
                      galleryId={galleryId}
                      allowDownloads={allowDownloads}
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
                    {allowDownloads && (
                      <BulkDownloadButton
                        label="Download Section"
                        isDownloading={bulkDownload.isDownloading}
                        progress={bulkDownload.progress}
                        error={bulkDownload.error}
                        onClearError={bulkDownload.clearError}
                        onCancel={bulkDownload.cancelDownload}
                        onDownload={(size) =>
                          bulkDownload.startBulkDownload(
                            unassignedImages.map((img) => img.key),
                            size,
                            'Other Photos'
                          )
                        }
                        variant="section"
                      />
                    )}
                  </div>
                  <div className={`transition-all duration-500 ease-in-out overflow-hidden ${isCollapsed ? 'max-h-0 opacity-0' : 'max-h-[10000px] opacity-100'}`}>
                    <ImageGrid
                      images={unassignedImages}
                      viewableIndexMap={viewableIndexMap}
                      onImageClick={setLightboxIndex}
                      comments={comments}
                      galleryId={galleryId}
                      allowDownloads={allowDownloads}
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
            viewableIndexMap={viewableIndexMap}
            onImageClick={setLightboxIndex}
            comments={comments}
            galleryId={galleryId}
            allowDownloads={allowDownloads}
          />
        )}
      </div>

      {/* Videos Section */}
      {gallery.videos && gallery.videos.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 pb-8">
          <div className="border-t border-neutral-200 pt-8">
            <h2 className="text-2xl font-display font-semibold text-neutral-900 mb-6">
              Videos
              <span className="text-sm font-normal text-neutral-400 ml-2">
                {gallery.videos.length} {gallery.videos.length === 1 ? 'video' : 'videos'}
              </span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {gallery.videos.map((video) => (
                <div key={video.key} className="bg-white rounded-xl overflow-hidden shadow-sm border border-neutral-200">
                  {/* Preview clip or placeholder */}
                  <div className="relative aspect-video bg-neutral-900">
                    {video.previewKey ? (
                      <video
                        src={getImageUrl(video.previewKey)}
                        muted
                        autoPlay
                        loop
                        playsInline
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg className="w-16 h-16 text-neutral-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  {/* Video info */}
                  <div className="p-4">
                    {video.title && (
                      <h3 className="font-medium text-neutral-900 mb-2">{video.title}</h3>
                    )}
                    <div className="flex items-center gap-3">
                      {video.youtubeUrl && (
                        <a
                          href={video.youtubeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-sm font-medium text-red-600 hover:text-red-700 transition-colors"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                          </svg>
                          Watch Full Video
                        </a>
                      )}
                      {allowDownloads && (
                        <DownloadButton
                          galleryId={galleryId}
                          imageKey={video.key}
                          variant="icon"
                        />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxIndex !== null && currentImage && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex flex-col md:flex-row"
          role="dialog"
          aria-modal="true"
          onClick={closeLightbox}
        >
          {/* Image area */}
          <div className="flex-1 flex items-center justify-center relative min-h-0">
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
              {lightboxIndex + 1} / {viewableImages.length}
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
              className="max-w-[90vw] max-h-[60vh] md:max-w-[70vw] md:max-h-[85vh] relative"
              onClick={(e) => e.stopPropagation()}
            >
              <Image
                src={getImageUrl(currentImage.key)}
                alt={currentImage.alt || `Photo ${lightboxIndex + 1}`}
                width={1920}
                height={1280}
                sizes="70vw"
                className="max-w-full max-h-[60vh] md:max-h-[85vh] w-auto h-auto object-contain"
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
            className="w-full md:w-80 bg-white flex flex-col max-h-[40vh] md:max-h-full overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-neutral-200">
              <h3 className="font-medium text-neutral-900">
                {currentImage.alt || `Photo ${lightboxIndex + 1}`}
              </h3>
              {allowDownloads && (
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
  progress: BulkDownloadProgress | null;
  error: string | null;
  onClearError: () => void;
  onCancel?: () => void;
  onDownload: (size: 'full' | 'web') => void;
  onResume?: (size: 'full' | 'web', resumeFrom: number) => void;
  onClearResume?: (size: 'full' | 'web') => void;
  galleryId?: string;
  imageCount?: number;
  variant: 'header' | 'hero' | 'section';
}

function BulkDownloadButton({
  label,
  isDownloading,
  progress,
  error,
  onClearError,
  onCancel,
  onDownload,
  onResume,
  onClearResume,
  galleryId,
  imageCount,
  variant,
}: BulkDownloadButtonProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [resumePrompt, setResumePrompt] = useState<{ size: 'full' | 'web'; state: ResumeState } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showMenu && !resumePrompt) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowMenu(false);
        setResumePrompt(null);
      }
    }
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showMenu, resumePrompt]);

  const hasBatches = progress?.batchTotal && progress.batchTotal > 1;
  const failedInfo = progress?.failedCount ? ` (${progress.failedCount} failed)` : '';
  const progressText = progress
    ? progress.phase === 'sharing'
      ? progress.batchTotal && progress.batchTotal > 1
        ? `Sharing batch ${progress.batchCurrent} of ${progress.batchTotal}…`
        : 'Saving to device…'
      : progress.phase === 'zipping'
        ? hasBatches
          ? `Creating ZIP (Part ${progress.batchCurrent} of ${progress.batchTotal})…`
          : 'Creating ZIP…'
        : progress.phase === 'saving'
          ? hasBatches
            ? `Saving Part ${progress.batchCurrent} of ${progress.batchTotal}…`
            : 'Saving…'
          : progress.total > 0
            ? hasBatches
              ? `Part ${progress.batchCurrent}/${progress.batchTotal} — ${progress.current}/${progress.total}${failedInfo}`
              : `Fetching ${progress.current} of ${progress.total}${failedInfo}`
            : 'Preparing…'
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
      className={`absolute z-50 min-w-[160px] rounded-lg border shadow-xl overflow-hidden ${
        isHero
          ? 'bottom-full mb-2 right-0 border-white/30 bg-neutral-900/95 backdrop-blur-sm'
          : 'top-full mt-2 right-0 border-neutral-200 bg-white'
      }`}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={() => {
          if (galleryId && imageCount && onResume) {
            const resume = getResumeState(galleryId, 'full', imageCount);
            if (resume) {
              setShowMenu(false);
              setResumePrompt({ size: 'full', state: resume });
              return;
            }
          }
          onDownload('full');
          setShowMenu(false);
        }}
        className={`w-full px-4 py-3 text-left text-sm flex items-center gap-3 transition-colors ${
          isHero ? 'text-white hover:bg-white/10' : 'text-neutral-700 hover:bg-neutral-50'
        }`}
      >
        <BulkDownloadIcon className={`w-4 h-4 shrink-0 ${isHero ? 'text-white/80' : 'text-neutral-500'}`} />
        <span>Full Size</span>
      </button>
      <button
        type="button"
        onClick={() => {
          if (galleryId && imageCount && onResume) {
            const resume = getResumeState(galleryId, 'web', imageCount);
            if (resume) {
              setShowMenu(false);
              setResumePrompt({ size: 'web', state: resume });
              return;
            }
          }
          onDownload('web');
          setShowMenu(false);
        }}
        className={`w-full px-4 py-3 text-left text-sm flex items-center gap-3 border-t transition-colors ${
          isHero
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
      <div className="flex items-center gap-1.5">
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
        {isDownloading && onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className={`text-xs px-2 py-1 rounded transition-colors ${
              isHero
                ? 'text-white/80 hover:text-white hover:bg-white/10'
                : 'text-neutral-500 hover:text-neutral-700 hover:bg-neutral-200'
            }`}
            aria-label="Cancel download"
          >
            Cancel
          </button>
        )}
      </div>
      {showMenu && !isDownloading && !resumePrompt && menuContent}
      {resumePrompt && !isDownloading && onResume && onClearResume && (
        <div
          className={`absolute z-50 min-w-[220px] rounded-lg border shadow-xl overflow-hidden ${
            isHero
              ? 'bottom-full mb-2 right-0 border-white/30 bg-neutral-900/95 backdrop-blur-sm'
              : 'top-full mt-2 right-0 border-neutral-200 bg-white'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className={`px-4 py-3 text-sm ${isHero ? 'text-white/90' : 'text-neutral-600'}`}>
            {resumePrompt.state.completedBatches.length} of {resumePrompt.state.totalBatches} parts already downloaded
          </div>
          <button
            type="button"
            onClick={() => {
              const nextBatch = resumePrompt.state.completedBatches.length;
              onResume(resumePrompt.size, nextBatch);
              setResumePrompt(null);
            }}
            className={`w-full px-4 py-3 text-left text-sm font-medium flex items-center gap-3 border-t transition-colors ${
              isHero
                ? 'border-white/20 text-white hover:bg-white/10'
                : 'border-neutral-100 text-neutral-700 hover:bg-neutral-50'
            }`}
          >
            Resume from Part {resumePrompt.state.completedBatches.length + 1}
          </button>
          <button
            type="button"
            onClick={() => {
              onClearResume(resumePrompt.size);
              onDownload(resumePrompt.size);
              setResumePrompt(null);
            }}
            className={`w-full px-4 py-3 text-left text-sm flex items-center gap-3 border-t transition-colors ${
              isHero
                ? 'border-white/20 text-white/70 hover:bg-white/10'
                : 'border-neutral-100 text-neutral-500 hover:bg-neutral-50'
            }`}
          >
            Start Over
          </button>
        </div>
      )}
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
  viewableIndexMap: Map<string, number>;
  onImageClick: (index: number) => void;
  comments: Comment[];
  galleryId: string;
  allowDownloads: boolean;
}

function ImageGrid({ images, viewableIndexMap, onImageClick, comments, galleryId, allowDownloads }: ImageGridProps) {
  return (
    <div className="columns-1 sm:columns-2 lg:columns-3 gap-4">
      {images.map((image) => {
        const raw = isRawFile(image.key);
        const filename = image.key.split('/').pop() || '';

        if (raw) {
          return (
            <div
              key={image.key}
              className="relative group rounded-lg overflow-hidden break-inside-avoid mb-4"
            >
              <div className="relative bg-neutral-900 rounded-lg overflow-hidden aspect-[4/3]">
                <div className="w-full h-full flex flex-col items-center justify-center text-white">
                  <svg className="w-12 h-12 mb-3 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
                  </svg>
                  <span className="text-sm font-bold tracking-wider text-amber-400 bg-amber-400/10 px-3 py-1 rounded-md mb-2">
                    {getRawFormatLabel(image.key)}
                  </span>
                  <p className="text-xs text-neutral-400 truncate max-w-[80%] text-center">
                    {filename}
                  </p>
                </div>
              </div>
              {allowDownloads && (
                <div className="absolute bottom-2 right-2 z-30 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <DownloadButton
                    galleryId={galleryId}
                    imageKey={image.key}
                    variant="icon"
                    rawOnly
                  />
                </div>
              )}
            </div>
          );
        }

        const viewableIndex = viewableIndexMap.get(image.key) ?? 0;
        return (
          <div
            key={image.key}
            className="relative group rounded-lg overflow-hidden break-inside-avoid mb-4"
          >
            <button
              onClick={() => onImageClick(viewableIndex)}
              className="block w-full cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 rounded-lg overflow-hidden text-left relative"
            >
              <div className="relative bg-neutral-200 rounded-lg overflow-hidden min-h-[200px] z-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={getImageUrl(image.key, 'lg')}
                  alt={image.alt || `Photo ${viewableIndex + 1}`}
                  className="w-full h-auto object-cover group-hover:scale-[1.02] transition-transform duration-300 relative z-10"
                  loading="eager"
                />
              </div>
            </button>
            {allowDownloads && (
              <div className="absolute bottom-2 right-2 z-30 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <DownloadButton
                  galleryId={galleryId}
                  imageKey={image.key}
                  variant="icon"
                />
              </div>
            )}
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
