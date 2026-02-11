'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { PasswordGate } from '@/components/client/PasswordGate';
import { ClientGalleryView } from '@/components/client/ClientGalleryView';
import { clientAuth } from '@/lib/api';

function ClientGalleryContent() {
  const searchParams = useSearchParams();
  const galleryId = searchParams.get('id');
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [galleryTitle, setGalleryTitle] = useState('');

  useEffect(() => {
    if (!galleryId) return;

    clientAuth
      .check()
      .then((data) => {
        if (data.authenticated && data.galleryId === galleryId) {
          setAuthenticated(true);
        } else {
          setAuthenticated(false);
        }
      })
      .catch(() => setAuthenticated(false));
  }, [galleryId]);

  if (!galleryId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-neutral-500">No gallery specified.</p>
      </div>
    );
  }

  if (authenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-neutral-400">Loading...</div>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <PasswordGate
        galleryId={galleryId}
        onAuthenticated={(title) => {
          setGalleryTitle(title);
          setAuthenticated(true);
        }}
      />
    );
  }

  return (
    <ClientGalleryView galleryId={galleryId} initialTitle={galleryTitle} />
  );
}

export default function ClientGalleryPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-pulse text-neutral-400">Loading...</div>
        </div>
      }
    >
      <ClientGalleryContent />
    </Suspense>
  );
}
