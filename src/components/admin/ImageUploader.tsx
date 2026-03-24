'use client';

import { useState, useEffect } from 'react';
import { adminImages, adminGalleries } from '@/lib/api';
import { getImageUrl, isRawFile, getRawFormatLabel } from '@/lib/utils';
import { useToast } from './Toast';

interface GalleryImage {
  key: string;
  alt?: string;
}

const PAGE_SIZE = 24;

interface ImageUploaderProps {
  galleryId: string;
  images: GalleryImage[];
  heroImage?: string | null;
  onUpdate: (images: GalleryImage[]) => void;
  onHeroChange?: () => void;
}

export function ImageUploader({
  galleryId,
  images,
  heroImage,
  onUpdate,
  onHeroChange,
}: ImageUploaderProps) {
  const { showSuccess, showError } = useToast();
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(images.length / PAGE_SIZE));
  const start = (page - 1) * PAGE_SIZE;
  const paginatedImages = images.slice(start, start + PAGE_SIZE);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  async function handleDelete(imageKey: string) {
    if (!confirm('Delete this image?')) return;
    try {
      await adminImages.delete(imageKey, galleryId);
      const updated = images.filter((img) => img.key !== imageKey);
      onUpdate(updated);
      setPage((p) => {
        const newTotalPages = Math.max(1, Math.ceil(updated.length / PAGE_SIZE));
        return p > newTotalPages ? newTotalPages : p;
      });
    } catch {
      showError('Failed to delete image');
    }
  }

  const [savingHero, setSavingHero] = useState(false);
  async function handleSetCover(imageKey: string | null) {
    setSavingHero(true);
    try {
      await adminGalleries.update(galleryId, { heroImage: imageKey || null });
      onHeroChange?.();
      showSuccess(imageKey ? 'Cover image set' : 'Cover image removed');
    } catch {
      showError('Failed to update cover image');
    } finally {
      setSavingHero(false);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-neutral-200 p-6">
      <h2 className="text-lg font-semibold text-neutral-900 mb-4">
        Gallery Images ({images.length})
      </h2>

      {/* Image grid */}
      {images.length > 0 && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {paginatedImages.map((image) => {
              const isCover = heroImage === image.key;
              return (
                <div
                  key={image.key}
                  className={`group relative rounded-lg overflow-hidden bg-neutral-100 ${isCover ? 'ring-2 ring-primary-600 ring-offset-2' : ''}`}
                >
                  {isRawFile(image.key) ? (
                    <div className="w-full h-32 flex flex-col items-center justify-center bg-gradient-to-br from-neutral-800 to-neutral-900 text-white">
                      <svg className="w-6 h-6 mb-1 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
                      </svg>
                      <span className="text-xs font-bold tracking-wider text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded">
                        {getRawFormatLabel(image.key)}
                      </span>
                    </div>
                  ) : (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={getImageUrl(image.key, 'sm')}
                        alt={image.alt || 'Gallery image'}
                        className="w-full h-32 object-cover"
                        onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = getImageUrl(image.key); }}
                      />
                    </>
                  )}
                  {isCover && (
                    <span className="absolute top-1 left-1 px-1.5 py-0.5 bg-primary-600 text-white text-xs font-medium rounded">
                      Cover
                    </span>
                  )}
                  <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleDelete(image.key)}
                      className="w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center text-xs"
                      aria-label="Delete image"
                    >
                      &times;
                    </button>
                  </div>
                  {!isRawFile(image.key) && (
                    <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                      {isCover ? (
                        <button
                          type="button"
                          onClick={() => handleSetCover(null)}
                          disabled={savingHero}
                          className="w-full text-xs text-white hover:underline disabled:opacity-50"
                        >
                          Remove cover
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSetCover(image.key)}
                          disabled={savingHero}
                          className="w-full text-xs text-white hover:underline disabled:opacity-50"
                        >
                          Set as cover
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between border-t border-neutral-200 pt-4">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="text-sm font-medium text-neutral-600 hover:text-neutral-900 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-sm text-neutral-500">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="text-sm font-medium text-neutral-600 hover:text-neutral-900 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
