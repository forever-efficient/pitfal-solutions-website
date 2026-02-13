'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { adminGalleries } from '@/lib/api';
import { GalleryList } from '@/components/admin/GalleryList';
import { useToast } from '@/components/admin/Toast';

export default function GalleriesPage() {
  const { showSuccess, showError } = useToast();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [galleries, setGalleries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  function loadGalleries() {
    setLoading(true);
    adminGalleries
      .list()
      .then((data) => {
        setGalleries(data.galleries);
      })
      .catch(() => {
        showError('Failed to load galleries');
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadGalleries();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleDelete(id: string) {
    try {
      await adminGalleries.delete(id);
      showSuccess('Gallery deleted');
      loadGalleries();
    } catch {
      showError('Failed to delete gallery');
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-neutral-200 rounded w-1/4"></div>
        <div className="h-64 bg-neutral-200 rounded"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-neutral-900">Galleries</h1>
        <Link
          href="/admin/galleries/new"
          className="bg-neutral-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-neutral-800 transition-colors"
        >
          New Gallery
        </Link>
      </div>

      <GalleryList galleries={galleries} onDelete={handleDelete} />
    </div>
  );
}
