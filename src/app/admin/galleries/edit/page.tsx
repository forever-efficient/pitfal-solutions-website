'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { GalleryEditor } from '@/components/admin/GalleryEditor';
import { ImageUploader } from '@/components/admin/ImageUploader';
import { adminGalleries } from '@/lib/api';

function GalleryEditContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const galleryId = searchParams.get('id');
  const [gallery, setGallery] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!galleryId) {
      router.push('/admin/galleries');
      return;
    }

    adminGalleries
      .get(galleryId)
      .then((data) => setGallery(data.gallery))
      .catch(() => router.push('/admin/galleries'))
      .finally(() => setLoading(false));
  }, [galleryId, router]);

  if (loading || !gallery || !galleryId) {
    return <div className="text-neutral-400">Loading...</div>;
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => router.push('/admin/galleries')}
          className="text-neutral-500 hover:text-neutral-700"
        >
          <svg
            className="w-5 h-5"
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
        <h1 className="text-2xl font-bold text-neutral-900">
          {gallery.title as string}
        </h1>
      </div>
      <div className="space-y-6">
        <GalleryEditor gallery={gallery} galleryId={galleryId} />
        <ImageUploader
          galleryId={galleryId}
          images={
            (gallery.images as Array<{ key: string; alt?: string }>) || []
          }
          onUpdate={(images) => setGallery({ ...gallery, images })}
        />
      </div>
    </div>
  );
}

export default function AdminGalleryEditPage() {
  return (
    <Suspense fallback={<div className="text-neutral-400">Loading...</div>}>
      <GalleryEditContent />
    </Suspense>
  );
}
