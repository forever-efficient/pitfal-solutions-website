'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { GalleryPageClient } from '../[category]/[gallery]/GalleryPageClient';

function ViewerContent() {
  const searchParams = useSearchParams();
  const category = searchParams.get('category') || '';
  const slug = searchParams.get('slug') || '';
  return <GalleryPageClient category={category} slug={slug} />;
}

export default function ViewerPage() {
  return (
    <Suspense>
      <ViewerContent />
    </Suspense>
  );
}
