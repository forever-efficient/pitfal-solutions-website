'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Container, Section } from '@/components/ui/Container';
import { ContactCTA } from '@/components/sections';
import { ArrowRightIcon } from '@/components/icons';
import { PORTFOLIO_CATEGORIES, PortfolioCategorySlug } from '@/lib/constants';
import { getImageUrl } from '@/lib/utils';
import { publicGalleries } from '@/lib/api';

interface Row {
  heading: string;
  background: 'white' | 'light';
  cols: 2 | 3;
  slugs: PortfolioCategorySlug[];
}

const ROWS: Row[] = [
  {
    heading: 'Photography',
    background: 'white',
    cols: 3,
    slugs: ['brands', 'portraits', 'events'],
  },
  {
    heading: 'Videography',
    background: 'light',
    cols: 2,
    slugs: ['corporate-videography', 'event-videography'],
  },
  {
    heading: 'Everything Else',
    background: 'white',
    cols: 2,
    slugs: ['drone', 'ai'],
  },
];

const ALL_SLUGS: PortfolioCategorySlug[] = ROWS.flatMap((r) => r.slugs);

export default function PortfolioPage() {
  const [counts, setCounts] = useState<Record<string, number>>(() =>
    Object.fromEntries(ALL_SLUGS.map((s) => [s, 0]))
  );

  useEffect(() => {
    Promise.all(ALL_SLUGS.map((slug) => publicGalleries.getByCategory(slug)))
      .then((results) => {
        const next: Record<string, number> = {};
        ALL_SLUGS.forEach((slug, i) => {
          next[slug] = results[i]?.galleries.length ?? 0;
        });
        setCounts(next);
      })
      .catch(() => {
        // Counts stay at 0 on error
      });
  }, []);

  return (
    <>
      {/* Hero */}
      <Section size="lg" background="dark" className="pt-32">
        <Container>
          <div className="max-w-3xl">
            <p className="text-primary-400 font-medium text-sm tracking-widest uppercase mb-3">
              Portfolio
            </p>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 font-display">
              Featured Projects
            </h1>
            <p className="text-xl text-neutral-300">
              Past projects, future possibilities.
            </p>
          </div>
        </Container>
      </Section>

      {ROWS.map((row) => {
        const gridCols = row.cols === 3 ? 'md:grid-cols-3' : 'md:grid-cols-2';
        return (
          <Section key={row.heading} size="lg" background={row.background}>
            <Container>
              <div className="mb-12">
                <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-2 font-display">
                  {row.heading}
                </h2>
              </div>
              <div
                className={`grid ${gridCols} gap-6 lg:gap-8`}
                role="list"
                aria-label={`${row.heading} categories`}
              >
                {row.slugs.map((slug) => {
                  const category = PORTFOLIO_CATEGORIES[slug];
                  const count = counts[slug] ?? 0;
                  return (
                    <Link
                      key={slug}
                      href={`/portfolio/${slug}`}
                      className="group block"
                      role="listitem"
                      aria-label={`View ${category.title} portfolio - ${count} galleries`}
                    >
                      <div className="bg-neutral-800 rounded-2xl overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5">
                        <div className="aspect-[4/5] relative">
                          <Image
                            src={getImageUrl(category.image)}
                            alt={`${category.title} category preview`}
                            fill
                            sizes={row.cols === 3
                              ? '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'
                              : '(max-width: 768px) 100vw, 50vw'}
                            className="object-cover"
                          />
                          <div
                            className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-300"
                            aria-hidden="true"
                          />
                          <div className="absolute top-4 left-4">
                            <span className="bg-white/90 backdrop-blur-sm text-neutral-900 text-xs font-medium px-3 py-1 rounded-full">
                              {count} {count === 1 ? 'gallery' : 'galleries'}
                            </span>
                          </div>
                          <div
                            className="absolute bottom-4 right-4 w-10 h-10 bg-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform group-hover:scale-100 scale-90"
                            aria-hidden="true"
                          >
                            <ArrowRightIcon size={20} className="text-neutral-900" />
                          </div>
                        </div>
                        <div className="px-5 py-4">
                          <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-primary-400 transition-colors">
                            {category.title}
                          </h3>
                          <p className="text-neutral-300 text-sm line-clamp-1">{category.description}</p>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </Container>
          </Section>
        );
      })}

      <ContactCTA />
    </>
  );
}
