'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Container, Section } from '@/components/ui/Container';
import { GalleryGrid } from '@/components/gallery/GalleryGrid';
import { ContactCTA } from '@/components/sections';
import { PORTFOLIO_CATEGORIES } from '@/lib/constants';
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

export function CategoryPageClient({ category }: { category: string }) {
  const categoryInfo = PORTFOLIO_CATEGORIES[category as keyof typeof PORTFOLIO_CATEGORIES];
  const [galleries, setGalleries] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!categoryInfo) return;
    publicGalleries.getByCategory(category)
      .then(data => {
        setGalleries(data.galleries.map(g => ({
          id: g.id,
          slug: g.slug,
          title: g.title,
          thumbnail: g.coverImage ? getImageUrl(g.coverImage, 'md') : '',
          imageCount: g.imageCount,
          description: g.description,
        })));
      })
      .catch(() => {
        setGalleries([]);
      })
      .finally(() => setLoading(false));
  }, [category, categoryInfo]);

  if (!categoryInfo) {
    notFound();
  }

  return (
    <>
      {/* Hero */}
      <Section size="lg" className="pt-32 bg-neutral-50">
        <Container>
          <nav className="mb-6">
            <ol className="flex items-center text-sm text-neutral-500">
              <li>
                <Link href="/portfolio" className="hover:text-primary-600">
                  Portfolio
                </Link>
              </li>
              <li className="mx-2">/</li>
              <li className="text-neutral-900">{categoryInfo.title}</li>
            </ol>
          </nav>
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-bold text-neutral-900 mb-6 font-display">
              {categoryInfo.title}
            </h1>
            <p className="text-xl text-neutral-600">{categoryInfo.description}</p>
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
          ) : (
            <GalleryGrid galleries={galleries} category={category} />
          )}
        </Container>
      </Section>

      <ContactCTA />
    </>
  );
}
