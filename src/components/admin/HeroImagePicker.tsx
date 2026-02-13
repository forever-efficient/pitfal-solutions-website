'use client';

import { useState } from 'react';
import { adminGalleries } from '@/lib/api';
import { useToast } from './Toast';

interface GalleryImage {
  key: string;
  alt?: string;
}

interface HeroImagePickerProps {
  galleryId: string;
  images: GalleryImage[];
  heroImage?: string;
  onUpdate: (heroImage: string | null | undefined) => void;
}

const MEDIA_URL = process.env.NEXT_PUBLIC_MEDIA_URL || '';

export function HeroImagePicker({ galleryId, images, heroImage, onUpdate }: HeroImagePickerProps) {
  const { showSuccess, showError } = useToast();
  const [saving, setSaving] = useState(false);

  async function handleSelect(key: string | undefined) {
    setSaving(true);
    try {
      await adminGalleries.update(galleryId, { heroImage: key || null });
      onUpdate(key);
      showSuccess(key ? 'Hero image set' : 'Hero image removed');
    } catch {
      showError('Failed to update hero image');
    } finally {
      setSaving(false);
    }
  }

  if (images.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-neutral-200 p-6">
        <h2 className="text-lg font-semibold text-neutral-900 mb-2">Hero Image</h2>
        <p className="text-sm text-neutral-500">Upload images first to select a hero image.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-neutral-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-neutral-900">Hero Image</h2>
        {heroImage && (
          <button
            onClick={() => handleSelect(undefined)}
            disabled={saving}
            className="text-sm text-red-600 hover:text-red-700 font-medium disabled:opacity-50"
          >
            Remove
          </button>
        )}
      </div>
      <p className="text-sm text-neutral-500 mb-4">
        Select an image to display as the gallery hero banner.
      </p>
      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
        {images.map((image) => (
          <button
            key={image.key}
            onClick={() => handleSelect(image.key)}
            disabled={saving}
            className={`aspect-square rounded-lg overflow-hidden relative border-2 transition-colors disabled:opacity-50 ${heroImage === image.key
              ? 'border-primary-600 ring-2 ring-primary-200'
              : 'border-transparent hover:border-neutral-300'
              }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`${MEDIA_URL}/${image.key}`}
              alt={image.alt || ''}
              className="w-full h-full object-cover"
            />
            {heroImage === image.key && (
              <div className="absolute inset-0 bg-primary-600/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-white drop-shadow" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
