'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Container, Section } from '@/components/ui/Container';
import { Button } from '@/components/ui/Button';
import { publicGalleries } from '@/lib/api';
import { getImageUrl } from '@/lib/utils';

function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = result[i] as T;
    result[i] = result[j] as T;
    result[j] = tmp;
  }
  return result;
}

export function RecentWorkCarousel({ className, showHeader = true, showCta = true }: { className?: string; showHeader?: boolean; showCta?: boolean }) {
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    publicGalleries.getFeaturedImages()
      .then(({ images }) => setImages(shuffle(images).slice(0, 20)))
      .catch(() => {})
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
    <Section size="lg" background="light" className={className}>
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
                <img
                  src={getImageUrl(key)}
                  alt="Recent work"
                  className="w-full h-full object-cover"
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
