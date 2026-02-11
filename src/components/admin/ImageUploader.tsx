'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import { adminImages, adminGalleries } from '@/lib/api';

interface GalleryImage {
  key: string;
  alt?: string;
}

interface ImageUploaderProps {
  galleryId: string;
  images: GalleryImage[];
  onUpdate: (images: GalleryImage[]) => void;
}

const MEDIA_URL = process.env.NEXT_PUBLIC_MEDIA_URL || '';

export function ImageUploader({
  galleryId,
  images,
  onUpdate,
}: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

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
          // Skip failed uploads
        }
      }

      // Update gallery with new images
      if (newImages.length > images.length) {
        await adminGalleries.update(galleryId, { images: newImages });
        onUpdate(newImages);
      }

      setUploading(false);
    },
    [galleryId, images, onUpdate]
  );

  async function handleDelete(imageKey: string) {
    if (!confirm('Delete this image?')) return;
    try {
      await adminImages.delete(imageKey, galleryId);
      const updated = images.filter((img) => img.key !== imageKey);
      onUpdate(updated);
    } catch {
      // Delete failed silently
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
        className={`border-2 border-dashed rounded-lg p-8 text-center mb-6 transition-colors ${
          dragOver ? 'border-primary-400 bg-primary-50' : 'border-neutral-300'
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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((image) => (
            <div
              key={image.key}
              className="group relative rounded-lg overflow-hidden bg-neutral-100"
            >
              <Image
                src={`${MEDIA_URL}/${image.key}`}
                alt={image.alt || 'Gallery image'}
                width={300}
                height={200}
                className="w-full h-32 object-cover"
              />
              <button
                onClick={() => handleDelete(image.key)}
                className="absolute top-1 right-1 w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                aria-label="Delete image"
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
