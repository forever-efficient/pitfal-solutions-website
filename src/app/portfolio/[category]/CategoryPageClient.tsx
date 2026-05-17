'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Container, Section } from '@/components/ui/Container';
import { GalleryGrid } from '@/components/gallery/GalleryGrid';
import { VideoCategoryGrid } from '@/components/gallery/VideoCategoryGrid';
import { ContactCTA } from '@/components/sections';
import { PORTFOLIO_CATEGORIES, VIDEO_CATEGORY_SLUGS } from '@/lib/constants';
import { getImageUrl } from '@/lib/utils';
import { publicGalleries } from '@/lib/api';

interface GalleryItem {
  id: string;
  slug: string;
  title: string;
  thumbnail: string;
  imageCount: number;
  description: string;
}

interface VideoGalleryItem {
  id: string;
  slug: string;
  title: string;
  previewVideo: string | null;
  poster: string | null;
  videoCount: number;
  description: string;
}

export function CategoryPageClient({ category }: { category: string }) {
  const categoryInfo = PORTFOLIO_CATEGORIES[category as keyof typeof PORTFOLIO_CATEGORIES];
  const isVideoCategory = (VIDEO_CATEGORY_SLUGS as readonly string[]).includes(category);
  const [galleries, setGalleries] = useState<GalleryItem[]>([]);
  const [videoGalleries, setVideoGalleries] = useState<VideoGalleryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!categoryInfo) return;
    publicGalleries.getByCategory(category)
      .then(data => {
        if (isVideoCategory) {
          setVideoGalleries(data.galleries.map(g => ({
            id: g.id,
            slug: g.slug,
            title: g.title,
            previewVideo: g.coverVideo ? getImageUrl(g.coverVideo) : null,
            poster: g.coverImage ? getImageUrl(g.coverImage, 'md') : null,
            videoCount: g.videoCount ?? 0,
            description: g.description,
          })));
        } else {
          setGalleries(data.galleries.map(g => ({
            id: g.id,
            slug: g.slug,
            title: g.title,
            thumbnail: g.coverImage ? getImageUrl(g.coverImage, 'md') : '',
            imageCount: g.imageCount,
            description: g.description,
          })));
        }
      })
      .catch(() => {
        setGalleries([]);
        setVideoGalleries([]);
      })
      .finally(() => setLoading(false));
  }, [category, categoryInfo, isVideoCategory]);

  if (!categoryInfo) {
    notFound();
  }

  return (
    <>
      {/* Hero */}
      <Section size="lg" background="dark" className="pt-32">
        <Container>
          <nav className="mb-6">
            <ol className="flex items-center text-sm text-neutral-400">
              <li>
                <Link href="/portfolio" className="hover:text-primary-400">
                  Portfolio
                </Link>
              </li>
              <li className="mx-2">/</li>
              <li className="text-white">{categoryInfo.title}</li>
            </ol>
          </nav>
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 font-display">
              {categoryInfo.title}
            </h1>
            <p className="text-xl text-neutral-300">{categoryInfo.description}</p>
          </div>
        </Container>
      </Section>

      {/* Galleries */}
      <Section size="lg" background="white">
        <Container>
          {loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="aspect-[4/3] bg-neutral-200 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : isVideoCategory ? (
            <VideoCategoryGrid
              galleries={videoGalleries}
              category={category}
              fallbackPoster={getImageUrl(categoryInfo.image)}
            />
          ) : (
            <GalleryGrid galleries={galleries} category={category} />
          )}
        </Container>
      </Section>

      <ContactCTA />
    </>
  );
}
