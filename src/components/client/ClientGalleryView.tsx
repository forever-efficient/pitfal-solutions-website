'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { clientGallery, clientAuth } from '@/lib/api';
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

const MEDIA_URL = process.env.NEXT_PUBLIC_MEDIA_URL || '';

function getImageUrl(key: string): string {
  return `${MEDIA_URL}/${key}`;
}

export function ClientGalleryView({
  galleryId,
  initialTitle,
}: ClientGalleryViewProps) {
  const [gallery, setGallery] = useState<{
    title: string;
    description?: string;
    images: GalleryImage[];
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

      {/* Gallery Grid */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4">
          {gallery.images.map((image, index) => (
            <button
              key={image.key}
              onClick={() => setLightboxIndex(index)}
              className="block w-full mb-4 break-inside-avoid group cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 rounded-lg overflow-hidden"
            >
              <div className="relative bg-neutral-200 rounded-lg overflow-hidden">
                <Image
                  src={getImageUrl(image.key)}
                  alt={image.alt || `Photo ${index + 1}`}
                  width={640}
                  height={480}
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="w-full h-auto object-cover group-hover:scale-[1.02] transition-transform duration-300"
                  loading="lazy"
                />
                {comments.some((c) => c.imageKey === image.key) && (
                  <div className="absolute top-2 right-2 bg-primary-600 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center">
                    {comments.filter((c) => c.imageKey === image.key).length}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

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
