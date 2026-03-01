'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Container, Section } from '@/components/ui/Container';
import { GalleryViewer } from '@/components/gallery';
import { ContactCTA } from '@/components/sections';
import { PORTFOLIO_CATEGORIES } from '@/lib/constants';
import { formatDate } from '@/lib/utils';
import { publicGalleries } from '@/lib/api';

interface GalleryData {
  id: string;
  title: string;
  description?: string;
  category: string;
  slug: string;
  images: Array<{ key: string; alt?: string }>;
  heroImage?: string;
  createdAt: string;
  kanbanCounts?: { todo: number; inProgress: number; done: number };
}

export function GalleryPageClient({ category, slug }: { category: string; slug: string }) {
  const [gallery, setGallery] = useState<GalleryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFoundError, setNotFoundError] = useState(false);

  const categoryTitle =
    PORTFOLIO_CATEGORIES[category as keyof typeof PORTFOLIO_CATEGORIES]?.title || category;

  useEffect(() => {
    publicGalleries.getGallery(category, slug)
      .then(data => setGallery(data.gallery))
      .catch(() => setNotFoundError(true))
      .finally(() => setLoading(false));
  }, [category, slug]);

  if (notFoundError) {
    return (
      <Section size="lg" className="pt-32 bg-neutral-50">
        <Container>
          <div className="text-center py-24">
            <p className="text-neutral-500 text-lg mb-6">Gallery not found.</p>
            <Link href="/portfolio" className="text-primary-600 hover:text-primary-700 font-medium">
              ← Back to Portfolio
            </Link>
          </div>
        </Container>
      </Section>
    );
  }

  if (loading) {
    return (
      <>
        <Section size="lg" className="pt-32 bg-neutral-50">
          <Container>
            <div className="h-8 bg-neutral-200 rounded animate-pulse w-48 mb-6" />
            <div className="h-12 bg-neutral-200 rounded animate-pulse w-96 mb-4" />
            <div className="h-6 bg-neutral-200 rounded animate-pulse w-64" />
          </Container>
        </Section>
        <Section size="lg" background="white">
          <Container>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="aspect-square bg-neutral-200 rounded-xl animate-pulse" />
              ))}
            </div>
          </Container>
        </Section>
      </>
    );
  }

  if (!gallery) return null;

  return (
    <>
      {/* Hero */}
      <Section size="lg" className="pt-32 bg-neutral-50">
        <Container>
          <nav className="mb-6" aria-label="Breadcrumb">
            <ol className="flex items-center text-sm text-neutral-500">
              <li>
                <Link href="/portfolio" className="hover:text-primary-600">
                  Portfolio
                </Link>
              </li>
              <li className="mx-2">/</li>
              <li>
                <Link href={`/portfolio/${category}`} className="hover:text-primary-600">
                  {categoryTitle}
                </Link>
              </li>
              <li className="mx-2">/</li>
              <li className="text-neutral-900">{gallery.title}</li>
            </ol>
          </nav>
          <div className="max-w-3xl">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-neutral-900 mb-4 font-display">
              {gallery.title}
            </h1>
            <p className="text-lg text-neutral-600 mb-4">{gallery.description}</p>
            {gallery.kanbanCounts && (
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <span className="text-sm font-medium text-neutral-500">Work Status:</span>
                {gallery.kanbanCounts.todo > 0 && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-600">
                    {gallery.kanbanCounts.todo} To Do
                  </span>
                )}
                {gallery.kanbanCounts.inProgress > 0 && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-600">
                    {gallery.kanbanCounts.inProgress} In Progress
                  </span>
                )}
                {gallery.kanbanCounts.done > 0 && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-600">
                    {gallery.kanbanCounts.done} Done
                  </span>
                )}
              </div>
            )}
            <div className="flex items-center gap-4 text-sm text-neutral-500">
              <span>{formatDate(gallery.createdAt)}</span>
              <span aria-hidden="true">|</span>
              <span>{gallery.images.length} images</span>
            </div>
          </div>
        </Container>
      </Section>

      {/* Gallery Images */}
      <Section size="lg" background="white">
        <Container>
          <GalleryViewer images={gallery.images} title={gallery.title} />
        </Container>
      </Section>

      <ContactCTA />
    </>
  );
}
