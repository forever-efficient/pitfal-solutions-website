'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { adminGalleries } from '@/lib/api';
import { GalleryEditor } from '@/components/admin/GalleryEditor';
import { ImageUploader } from '@/components/admin/ImageUploader';
import { SectionManager } from '@/components/admin/SectionManager';
import { HeroPositionEditor } from '@/components/admin/HeroPositionEditor';

function GalleryEditContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [gallery, setGallery] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadGallery = useCallback(() => {
    if (!id) return;
    adminGalleries
      .get(id)
      .then((data) => {
        setGallery(data.gallery);
      })
      .catch(() => {
        setError('Failed to load gallery');
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    loadGallery();
  }, [id, loadGallery]);

  if (!id) {
    return (
      <div className="text-center py-12">
        <p className="text-neutral-500">No gallery ID provided.</p>
        <Link
          href="/admin/galleries"
          className="text-primary-600 hover:text-primary-700"
        >
          ← Back to Galleries
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-8">
        <div className="h-8 bg-neutral-200 rounded w-1/3"></div>
        <div className="h-64 bg-neutral-200 rounded"></div>
        <div className="h-64 bg-neutral-200 rounded"></div>
      </div>
    );
  }

  if (error || !gallery) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">{error || 'Gallery not found'}</p>
        <Link
          href="/admin/galleries"
          className="text-primary-600 hover:text-primary-700"
        >
          ← Back to Galleries
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/admin/galleries"
            className="text-sm text-neutral-500 hover:text-neutral-900"
          >
            ← Back to Galleries
          </Link>
          <h1 className="text-2xl font-bold text-neutral-900 mt-2">
            Edit Gallery: {gallery.title}
          </h1>
        </div>
        <div className="flex gap-3">
          <Link
            href={`/client?id=${gallery.id}`}
            target="_blank"
            className="text-sm px-3 py-2 rounded border border-neutral-300 hover:bg-neutral-50"
          >
            View Live
          </Link>
        </div>
      </div>

      <GalleryEditor gallery={gallery} galleryId={id} />

      {gallery.heroImage && (
        <HeroPositionEditor
          galleryId={id}
          heroImage={gallery.heroImage}
          initialFocalPoint={gallery.heroFocalPoint}
          initialZoom={gallery.heroZoom}
          initialGradientOpacity={gallery.heroGradientOpacity}
          initialHeight={gallery.heroHeight}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <ImageUploader
            galleryId={id}
            images={gallery.images || []}
            heroImage={gallery.heroImage}
            onUpdate={() => loadGallery()}
            onHeroChange={() => loadGallery()}
          />
        </div>

        <div>
          <SectionManager
            galleryId={id}
            images={gallery.images || []}
            initialSections={gallery.sections || []}
            initialClientSort={gallery.clientSort}
            onUpdate={() => loadGallery()}
          />
        </div>
      </div>
    </div>
  );
}

export default function GalleryEditPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <GalleryEditContent />
    </Suspense>
  );
}
