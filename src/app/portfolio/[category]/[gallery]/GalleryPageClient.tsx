'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Container, Section } from '@/components/ui/Container';
import { GalleryViewer, VideoGalleryViewer } from '@/components/gallery';
import { ContactCTA } from '@/components/sections';
import { PORTFOLIO_CATEGORIES, VIDEO_CATEGORY_SLUGS } from '@/lib/constants';
import { formatDate } from '@/lib/utils';
import { publicGalleries } from '@/lib/api';

interface GalleryVideo {
  key: string;
  alt?: string;
  previewKey?: string;
  previewStart?: number;
  previewDuration?: number;
  title?: string;
  youtubeUrl?: string;
}

interface GalleryData {
  id: string;
  title: string;
  description?: string;
  categories: string[];
  slug: string;
  images: Array<{ key: string; alt?: string }>;
  videos?: GalleryVideo[];
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
  const isVideoCategory = (VIDEO_CATEGORY_SLUGS as readonly string[]).includes(category);

  useEffect(() => {
    publicGalleries.getGallery(category, slug)
      .then(data => setGallery(data.gallery))
      .catch(() => setNotFoundError(true))
      .finally(() => setLoading(false));
  }, [category, slug]);

  if (notFoundError) {
    return (
      <Section size="lg" background="dark" className="pt-32">
        <Container>
          <div className="text-center py-24">
            <p className="text-neutral-400 text-lg mb-6">Gallery not found.</p>
            <Link href="/portfolio" className="text-primary-400 hover:text-primary-300 font-medium">
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
        <Section size="lg" background="dark" className="pt-32">
          <Container>
            <div className="h-8 bg-neutral-700/50 rounded animate-pulse w-48 mb-6" />
            <div className="h-12 bg-neutral-700/50 rounded animate-pulse w-96 mb-4" />
            <div className="h-6 bg-neutral-700/50 rounded animate-pulse w-64" />
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

  const videoCount = gallery.videos?.length ?? 0;
  const itemCountLabel = isVideoCategory
    ? `${videoCount} ${videoCount === 1 ? 'video' : 'videos'}`
    : `${gallery.images.length} images`;

  return (
    <>
      {/* Hero */}
      <Section size="lg" background="dark" className="pt-32">
        <Container>
          <nav className="mb-6" aria-label="Breadcrumb">
            <ol className="flex items-center text-sm text-neutral-400">
              <li>
                <Link href="/portfolio" className="hover:text-primary-400">
                  Portfolio
                </Link>
              </li>
              <li className="mx-2">/</li>
              <li>
                <Link href={`/portfolio/${category}`} className="hover:text-primary-400">
                  {categoryTitle}
                </Link>
              </li>
              <li className="mx-2">/</li>
              <li className="text-white">{gallery.title}</li>
            </ol>
          </nav>
          <div className="max-w-3xl">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 font-display">
              {gallery.title}
            </h1>
            <p className="text-lg text-neutral-300 mb-4">{gallery.description}</p>
            {gallery.kanbanCounts && (
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <span className="text-sm font-medium text-neutral-400">Work Status:</span>
                {gallery.kanbanCounts.todo > 0 && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-900/50 text-blue-300">
                    {gallery.kanbanCounts.todo} To Do
                  </span>
                )}
                {gallery.kanbanCounts.inProgress > 0 && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-900/50 text-amber-300">
                    {gallery.kanbanCounts.inProgress} In Progress
                  </span>
                )}
                {gallery.kanbanCounts.done > 0 && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-900/50 text-emerald-300">
                    {gallery.kanbanCounts.done} Done
                  </span>
                )}
              </div>
            )}
            <div className="flex items-center gap-4 text-sm text-neutral-400">
              <span>{formatDate(gallery.createdAt)}</span>
              <span aria-hidden="true">|</span>
              <span>{itemCountLabel}</span>
            </div>
          </div>
        </Container>
      </Section>

      {/* Gallery content — videos for video categories, images otherwise */}
      <Section size="lg" background="white">
        <Container>
          {isVideoCategory ? (
            <VideoGalleryViewer videos={gallery.videos ?? []} title={gallery.title} />
          ) : (
            <GalleryViewer images={gallery.images} title={gallery.title} />
          )}
        </Container>
      </Section>

      <ContactCTA />
    </>
  );
}
