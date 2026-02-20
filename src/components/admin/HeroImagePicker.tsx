'use client';

import { useState } from 'react';
import { adminGalleries } from '@/lib/api';
import { getImageUrl } from '@/lib/utils';
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

const HERO_PAGE_SIZE = 48;

export function HeroImagePicker({ galleryId, images, heroImage, onUpdate }: HeroImagePickerProps) {
  const { showSuccess, showError } = useToast();
  const [saving, setSaving] = useState(false);
  const [heroPage, setHeroPage] = useState(0);

  const heroTotalPages = Math.ceil(images.length / HERO_PAGE_SIZE);
  const pagedHeroImages = images.slice(heroPage * HERO_PAGE_SIZE, (heroPage + 1) * HERO_PAGE_SIZE);

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
        {pagedHeroImages.map((image) => (
          <button
            key={image.key}
            onClick={() => handleSelect(image.key)}
            disabled={saving}
            className={`aspect-square rounded-lg overflow-hidden relative border-2 transition-colors disabled:opacity-50 bg-neutral-200 ${heroImage === image.key
              ? 'border-primary-600 ring-2 ring-primary-200'
              : 'border-transparent hover:border-neutral-300'
              }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={getImageUrl(image.key, 'sm')}
              alt={image.alt || ''}
              className="w-full h-full object-cover"
              onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = getImageUrl(image.key); }}
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

      {heroTotalPages > 1 && (
        <div className="flex items-center justify-between mt-3 text-xs text-neutral-500">
          <button
            disabled={heroPage === 0}
            onClick={() => setHeroPage(p => p - 1)}
            className="disabled:opacity-40 hover:text-neutral-700"
          >
            ← Prev
          </button>
          <span>{heroPage + 1} / {heroTotalPages}</span>
          <button
            disabled={heroPage >= heroTotalPages - 1}
            onClick={() => setHeroPage(p => p + 1)}
            className="disabled:opacity-40 hover:text-neutral-700"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
