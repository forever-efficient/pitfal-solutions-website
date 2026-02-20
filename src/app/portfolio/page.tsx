'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Container, Section } from '@/components/ui/Container';
import { ContactCTA } from '@/components/sections';
import { ArrowRightIcon } from '@/components/icons';
import { PORTFOLIO_CATEGORIES } from '@/lib/constants';
import { getImageUrl } from '@/lib/utils';
import { publicGalleries } from '@/lib/api';

interface CategoryWithCount {
  slug: string;
  title: string;
  description: string;
  image: string;
  count: number;
}

export default function PortfolioPage() {
  const [categories, setCategories] = useState<CategoryWithCount[]>([
    {
      slug: PORTFOLIO_CATEGORIES.brands.slug,
      title: PORTFOLIO_CATEGORIES.brands.title,
      description: 'Professional brand imagery for businesses and entrepreneurs',
      image: PORTFOLIO_CATEGORIES.brands.image,
      count: 0,
    },
    {
      slug: PORTFOLIO_CATEGORIES.portraits.slug,
      title: PORTFOLIO_CATEGORIES.portraits.title,
      description: PORTFOLIO_CATEGORIES.portraits.description,
      image: PORTFOLIO_CATEGORIES.portraits.image,
      count: 0,
    },
    {
      slug: PORTFOLIO_CATEGORIES.events.slug,
      title: PORTFOLIO_CATEGORIES.events.title,
      description: 'Weddings, corporate events, and special occasions',
      image: PORTFOLIO_CATEGORIES.events.image,
      count: 0,
    },
  ]);

  useEffect(() => {
    // Fetch counts for each category in parallel
    Promise.all([
      publicGalleries.getByCategory('brands'),
      publicGalleries.getByCategory('portraits'),
      publicGalleries.getByCategory('events'),
    ]).then(([brands, portraits, events]) => {
      setCategories(prev => prev.map(cat => {
        if (cat.slug === 'brands') return { ...cat, count: brands.galleries.length };
        if (cat.slug === 'portraits') return { ...cat, count: portraits.galleries.length };
        if (cat.slug === 'events') return { ...cat, count: events.galleries.length };
        return cat;
      }));
    }).catch(() => {
      // Counts stay at 0 on error
    });
  }, []);

  return (
    <>
      {/* Hero */}
      <Section size="lg" className="pt-32 bg-neutral-50">
        <Container>
          <div className="max-w-3xl">
            <p className="text-primary-700 font-medium text-sm tracking-widest uppercase mb-3">
              Portfolio
            </p>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-neutral-900 mb-6 font-display">
              Featured Projects
            </h1>
            <p className="text-xl text-neutral-600">
              Explore past collection of photography and videography projects to see what the future can bring you.
              Each gallery showcases the commitment to quality and creativity you will receive.
            </p>
          </div>
        </Container>
      </Section>

      {/* Category grid */}
      <Section size="lg" background="white">
        <Container>
          <div
            className="grid md:grid-cols-3 gap-6 lg:gap-8"
            role="list"
            aria-label="Portfolio categories"
          >
            {categories.map((category) => (
              <Link
                key={category.slug}
                href={`/portfolio/${category.slug}`}
                className="group block"
                role="listitem"
                aria-label={`View ${category.title} portfolio - ${category.count} galleries`}
              >
                <article className="aspect-[4/5] bg-neutral-200 rounded-2xl overflow-hidden relative mb-4">
                  <Image
                    src={getImageUrl(category.image)}
                    alt={`${category.title} category preview`}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover"
                  />
                  <div
                    className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-300"
                    aria-hidden="true"
                  />
                  <div className="absolute top-4 left-4">
                    <span className="bg-white/90 backdrop-blur-sm text-neutral-900 text-xs font-medium px-3 py-1 rounded-full">
                      {category.count} {category.count === 1 ? 'gallery' : 'galleries'}
                    </span>
                  </div>
                  <div
                    className="absolute bottom-4 right-4 w-10 h-10 bg-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform group-hover:scale-100 scale-90"
                    aria-hidden="true"
                  >
                    <ArrowRightIcon size={20} className="text-neutral-900" />
                  </div>
                </article>
                <h2 className="text-xl font-semibold text-neutral-900 mb-1 group-hover:text-primary-600 transition-colors">
                  {category.title}
                </h2>
                <p className="text-neutral-600 text-sm">{category.description}</p>
              </Link>
            ))}
          </div>
        </Container>
      </Section>

      <ContactCTA />
    </>
  );
}
