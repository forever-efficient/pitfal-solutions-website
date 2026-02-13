'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { clientGallery, clientAuth, type GallerySection } from '@/lib/api';
import { getImageUrl } from '@/lib/utils';
import { ImageComment } from './ImageComment';
import { DownloadButton } from './DownloadButton';

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
}

export function ClientGalleryView({
  galleryId,
  initialTitle,
}: ClientGalleryViewProps) {
  const [gallery, setGallery] = useState<{
    title: string;
    description?: string;
    images: GalleryImage[];
    heroImage?: string | null;
    sections?: GallerySection[];
    category: string;
  } | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <div className="bg-white border-b border-neutral-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-neutral-900">
              {initialTitle || gallery.title}
            </h1>
            {gallery.description && (
              <p className="text-sm text-neutral-500 mt-1">
                {gallery.description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-neutral-500">
              {gallery.images.length} photos
            </span>
            <button
              onClick={handleLogout}
              className="text-sm text-neutral-600 hover:text-neutral-900 font-medium"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Hero Image */}
      {gallery.heroImage && (
        <div className="relative w-full h-[40vh] md:h-[60vh] bg-neutral-900">
          <Image
            src={getImageUrl(gallery.heroImage)}
            alt="Gallery Cover"
            fill
            className="object-cover opacity-90"
            priority
            unoptimized={true}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-8 text-white max-w-7xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-display font-bold mb-2">
              {gallery.title}
            </h2>
            {gallery.category && (
              <p className="text-lg opacity-90 capitalize">{gallery.category}</p>
            )}
          </div>
        </div>
      )}

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

              // Calculate start index for lightbox by finding index of first image in main array
              // Note: This assumes images are unique across sections or we just find first occurrence
              // Use a map to track global indices to be precise
              const firstImageIndex = gallery.images.findIndex(img => img.key === sectionImages[0]?.key);

              return (
                <div key={section.id}>
                  <div className="mb-6">
                    <h3 className="text-2xl font-display font-semibold text-neutral-900">
                      {section.title}
                    </h3>
                    {section.description && (
                      <p className="text-neutral-500 mt-1">{section.description}</p>
                    )}
                  </div>
                  <ImageGrid
                    images={sectionImages}
                    startIndex={firstImageIndex}
                    onImageClick={setLightboxIndex}
                    comments={comments}
                    galleryId={galleryId}
                  />
                </div>
              );
            })}

            {/* Show unassigned images if any */}
            {(() => {
              const assignedKeys = new Set(gallery.sections?.flatMap(s => s.images) || []);
              const unassignedImages = gallery.images.filter(img => !assignedKeys.has(img.key));

              if (unassignedImages.length > 0) {
                // Find start index of first unassigned
                const firstIndex = gallery.images.findIndex(img => img.key === unassignedImages[0]?.key);
                return (
                  <div>
                    <div className="mb-6">
                      <h3 className="text-2xl font-display font-semibold text-neutral-900">
                        Other Photos
                      </h3>
                    </div>
                    <ImageGrid
                      images={unassignedImages}
                      startIndex={firstIndex}
                      onImageClick={setLightboxIndex}
                      comments={comments}
                      galleryId={galleryId}
                    />
                  </div>
                );
              }
              return null;
            })()}
          </div>
        ) : (
          <ImageGrid
            images={gallery.images}
            startIndex={0}
            onImageClick={setLightboxIndex}
            comments={comments}
            galleryId={galleryId}
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
              <DownloadButton
                galleryId={galleryId}
                imageKey={currentImage.key}
              />
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

interface ImageGridProps {
  images: GalleryImage[];
  startIndex: number;
  onImageClick: (index: number) => void;
  comments: Comment[];
  galleryId: string;
}

function ImageGrid({ images, startIndex, onImageClick, comments, galleryId }: ImageGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {images.map((image, index) => {
        const globalIndex = startIndex + index;
        return (
          <div
            key={image.key}
            className="relative group rounded-lg overflow-hidden"
          >
            <button
              onClick={() => onImageClick(globalIndex)}
              className="block w-full cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 rounded-lg overflow-hidden text-left relative"
            >
              <div className="relative bg-neutral-200 rounded-lg overflow-hidden aspect-video z-0">
                {/* Using standard img tag with z-index fixes that resolved visibility issues */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={getImageUrl(image.key)}
                  alt={image.alt || `Photo ${globalIndex + 1}`}
                  width={640}
                  height={480}
                  className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300 relative z-10"
                  loading="eager"
                />
              </div>
            </button>
            {/* Download icon overlay - bottom right */}
            <div className="absolute bottom-2 right-2 z-30 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <DownloadButton
                galleryId={galleryId}
                imageKey={image.key}
                variant="icon"
              />
            </div>
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

