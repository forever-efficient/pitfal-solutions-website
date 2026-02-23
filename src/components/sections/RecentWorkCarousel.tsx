'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Container, Section } from '@/components/ui/Container';
import { Button } from '@/components/ui/Button';
import { publicGalleries } from '@/lib/api';
import { cn, getImageUrl } from '@/lib/utils';

export function RecentWorkCarousel({ className, showHeader = true, showCta = true }: { className?: string; showHeader?: boolean; showCta?: boolean }) {
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    // Server returns pre-shuffled images already capped at the carousel limit.
    publicGalleries.getFeaturedImages(20)
      .then(({ images }) => setImages(images))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  // Each item is 240px wide + 16px gap = 256px. Ensure one "set" is always
  // wider than the widest screen (~2560px) so the duplicate copy stays off-screen.
  const ITEM_WIDTH = 256;
  const MIN_ITEMS = Math.ceil(2600 / ITEM_WIDTH); // ~11
  const paddedImages = images.length > 0
    ? Array.from({ length: Math.max(MIN_ITEMS, images.length) }, (_, i) => images[i % images.length] as string)
    : images;
  const strip = [...paddedImages, ...paddedImages];

  return (
    <Section size="lg" background="light" className={cn('pt-4 md:pt-6', className)}>
      <style>{`
        @keyframes carousel-scroll {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>

      {showHeader && (
        <Container>
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-neutral-900 font-display">Recent Work</h2>
          </div>
        </Container>
      )}

      <Container>
        <p className="text-center text-neutral-700 text-xl md:text-2xl font-accent font-medium italic tracking-wide pt-1 pb-6 md:pt-2 md:pb-8 mb-4 md:mb-6">
          Refresh your browser for a new photo experience...
        </p>
      </Container>

      <div className="overflow-hidden">
        {loading ? (
          <div className="flex gap-4 px-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-[300px] w-[240px] flex-shrink-0 rounded-xl bg-neutral-200 animate-pulse"
              />
            ))}
          </div>
        ) : error ? (
          <div className="flex gap-4 px-4 items-center justify-center min-h-[300px]">
            <p className="text-neutral-500 text-sm">Unable to load images</p>
          </div>
        ) : images.length === 0 ? (
          <div className="flex gap-4 px-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-[300px] w-[240px] flex-shrink-0 rounded-xl bg-neutral-200 overflow-hidden relative"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary-500/10 to-primary-700/30" />
              </div>
            ))}
          </div>
        ) : (
          <div
            className="flex gap-4"
            style={{
              width: 'max-content',
              animation: `carousel-scroll ${paddedImages.length * 2}s linear infinite`,
            }}
          >
            {strip.map((key, i) => (
              <div
                key={i}
                className="h-[300px] w-[240px] flex-shrink-0 rounded-xl overflow-hidden"
              >
                <Image
                  src={getImageUrl(key, 'sm')}
                  alt="Recent work"
                  width={240}
                  height={300}
                  className="w-full h-full object-cover"
                  unoptimized // External media keys
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {showCta && (
        <Container>
          <div className="text-center mt-8">
            <Button variant="outline" asChild>
              <Link href="/portfolio">View Full Portfolio</Link>
            </Button>
          </div>
        </Container>
      )}
    </Section>
  );
}
