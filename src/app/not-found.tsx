'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Container } from '@/components/ui/Container';
import { Button } from '@/components/ui/Button';
import { GalleryPageClient } from './portfolio/[category]/[gallery]/GalleryPageClient';
import { PORTFOLIO_CATEGORIES } from '@/lib/constants';

// Matches /portfolio/{category}/{slug} with optional trailing slash.
const GALLERY_PATH = /^\/portfolio\/([^/]+)\/([^/]+)\/?$/;

export default function NotFound() {
  const [galleryParams, setGalleryParams] = useState<
    { category: string; slug: string } | null
  >(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const match = window.location.pathname.match(GALLERY_PATH);
    const category = match?.[1];
    const slug = match?.[2];
    // Only treat this as a gallery fallback if the category is a known
    // portfolio category — otherwise fall through to the 404 UI.
    if (category && slug && category in PORTFOLIO_CATEGORIES) {
      setGalleryParams({ category, slug });
    }
    setChecked(true);
  }, []);

  // Render nothing on the initial pass so the hydrated client decides what
  // to show. This avoids a flash of 404 before the gallery loads.
  if (!checked) return null;

  if (galleryParams) {
    return (
      <GalleryPageClient
        category={galleryParams.category}
        slug={galleryParams.slug}
      />
    );
  }

  return (
    <Container className="flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
      <h1 className="font-display text-6xl font-bold text-neutral-900 sm:text-8xl">
        404
      </h1>
      <h2 className="mt-4 font-display text-2xl font-semibold text-neutral-700 sm:text-3xl">
        Page Not Found
      </h2>
      <p className="mt-4 max-w-md text-neutral-600">
        Sorry, that page couldn&apos;t be found. It may have been moved or
        no longer exists.
      </p>
      <div className="mt-8 flex flex-col gap-4 sm:flex-row">
        <Button asChild>
          <Link href="/">Return Home</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/contact">Contact Info</Link>
        </Button>
      </div>
    </Container>
  );
}
