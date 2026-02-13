'use client';

import { useState, useCallback, useEffect } from 'react';
import { adminImages, adminGalleries } from '@/lib/api';
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

const MEDIA_URL = process.env.NEXT_PUBLIC_MEDIA_URL || '';

export function ImageUploader({
  galleryId,
  images,
  heroImage,
  onUpdate,
  onHeroChange,
}: ImageUploaderProps) {
  const { showSuccess, showError } = useToast();
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(images.length / PAGE_SIZE));
  const start = (page - 1) * PAGE_SIZE;
  const paginatedImages = images.slice(start, start + PAGE_SIZE);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  const handleFiles = useCallback(
    async (files: FileList) => {
      setUploading(true);
      const newImages: GalleryImage[] = [...images];

      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) continue;

        try {
          // Get presigned upload URL
          const { uploadUrl, key } = await adminImages.getUploadUrl(
            galleryId,
            file.name,
            file.type
          );

          // Upload directly to S3
          await fetch(uploadUrl, {
            method: 'PUT',
            body: file,
            headers: { 'Content-Type': file.type },
          });

          newImages.push({ key, alt: '' });
        } catch {
          showError(`Failed to upload ${file.name}`);
        }
      }

      // Update gallery with new images
      if (newImages.length > images.length) {
        await adminGalleries.update(galleryId, { images: newImages });
        onUpdate(newImages);
      }

      setUploading(false);
    },
    [galleryId, images, onUpdate, showError]
  );

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
        Images ({images.length})
      </h2>

      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={`border-2 border-dashed rounded-lg p-8 text-center mb-6 transition-colors ${dragOver ? 'border-primary-400 bg-primary-50' : 'border-neutral-300'
          }`}
      >
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
          className="hidden"
          id="image-upload"
        />
        <label htmlFor="image-upload" className="cursor-pointer">
          <svg
            className="w-10 h-10 mx-auto text-neutral-400 mb-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          <p className="text-sm text-neutral-600">
            {uploading
              ? 'Uploading...'
              : 'Drag & drop images or click to browse'}
          </p>
        </label>
      </div>

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
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`${MEDIA_URL}/${image.key}`}
                    alt={image.alt || 'Gallery image'}
                    className="w-full h-32 object-cover"
                  />
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
