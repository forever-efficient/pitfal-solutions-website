'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Section } from '@/components/ui/Container';
import { ArrowRightIcon, ChevronRightIcon } from '@/components/icons';
import { SERVICES } from '@/lib/constants';
import { publicGalleries, type VideoPreviewInfo } from '@/lib/api';
import { getImageUrl } from '@/lib/utils';

interface ServiceRowData {
  title: string;
  description: string;
  features: readonly string[];
  image: string;
  href: string;
  useCarousel?: boolean;
  useVideoCarousel?: boolean;
}

const services: ServiceRowData[] = [
  {
    title: SERVICES.photography.title,
    description: SERVICES.photography.description,
    features: SERVICES.photography.features,
    image: SERVICES.photography.image,
    href: SERVICES.photography.href,
    useCarousel: true,
  },
  {
    title: SERVICES.videography.title,
    description: SERVICES.videography.description,
    features: SERVICES.videography.features,
    image: SERVICES.videography.image,
    href: SERVICES.videography.href,
    useVideoCarousel: true,
  },
  {
    title: SERVICES.drone.title,
    description: SERVICES.drone.description,
    features: SERVICES.drone.features,
    image: SERVICES.drone.image,
    href: SERVICES.drone.href,
  },
  {
    title: SERVICES.ai.title,
    description: SERVICES.ai.description,
    features: SERVICES.ai.features,
    image: SERVICES.ai.image,
    href: SERVICES.ai.href,
  },
  {
    title: SERVICES.notary.title,
    description: SERVICES.notary.description,
    features: SERVICES.notary.features,
    image: SERVICES.notary.image,
    href: SERVICES.notary.href,
  },
];

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, isVisible };
}

function InlineCarousel() {
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    publicGalleries
      .getFeaturedImages(20)
      .then(({ images: imgs }) => setImages(imgs ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Pad images to fill at least one full screen width, then duplicate for seamless loop
  const ITEM_W = 200;
  const GAP = 12;
  const SLOT = ITEM_W + GAP;
  const MIN_ITEMS = Math.ceil(2600 / SLOT);
  const padded =
    images.length > 0
      ? Array.from({ length: Math.max(MIN_ITEMS, images.length) }, (_, i) => images[i % images.length] as string)
      : [];
  const strip = [...padded, ...padded];

  // Loading skeleton — visible against dark bg
  if (loading || images.length === 0) {
    return (
      <div className="flex gap-3 w-full px-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-[300px] w-[200px] flex-shrink-0 rounded-lg bg-neutral-700/50 animate-pulse"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="w-full">
      <style>{`
        @keyframes service-carousel {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>
      <div
        className="flex gap-3"
        style={{
          width: 'max-content',
          animation: `service-carousel ${padded.length * 2.5}s linear infinite`,
        }}
      >
        {strip.map((key, i) => (
          <div key={i} className="h-[300px] w-[200px] flex-shrink-0 rounded-lg overflow-hidden">
            <img
              src={getImageUrl(key, 'sm')}
              alt="Photography work"
              className="w-full h-full object-cover"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function InlineVideoCarousel({ fallbackImage }: { fallbackImage: string }) {
  const [previews, setPreviews] = useState<VideoPreviewInfo[]>([]);
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    publicGalleries.getVideoPreviews()
      .then(data => setPreviews(data.previews))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // When current video ends, advance to next (or loop if only one)
  const handleEnded = () => {
    if (previews.length <= 1) {
      // Only one video — restart it
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.play().catch(() => {});
      }
    } else {
      setCurrent(c => (c + 1) % previews.length);
    }
  };

  // Play current video when it changes
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    }
  }, [current]);

  if (loading) {
    return <div className="absolute inset-0 bg-neutral-800 animate-pulse" />;
  }

  if (previews.length === 0) {
    return (
      <>
        <img
          src={getImageUrl(fallbackImage)}
          alt="Videography"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-neutral-900/30 to-transparent lg:hidden" />
      </>
    );
  }

  const preview = previews[current];
  if (!preview) return null;

  return (
    <>
      <video
        ref={videoRef}
        key={preview.previewKey}
        src={getImageUrl(preview.previewKey)}
        muted
        autoPlay
        playsInline
        onEnded={handleEnded}
        className="absolute inset-0 w-full h-full object-cover"
      />
      {/* Title overlay */}
      <div className="absolute bottom-4 left-4 right-4 z-10">
        <p className="text-white/80 text-sm font-medium drop-shadow-lg">
          {preview.title}
        </p>
      </div>
      {/* Dot indicators */}
      {previews.length > 1 && (
        <div className="absolute bottom-4 right-4 z-10 flex gap-1.5">
          {previews.map((_, i) => (
            <button
              key={i}
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setCurrent(i); }}
              className={`w-2 h-2 rounded-full transition-colors ${
                i === current ? 'bg-white' : 'bg-white/40'
              }`}
              aria-label={`Video ${i + 1}`}
            />
          ))}
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-neutral-900/30 to-transparent lg:hidden" />
    </>
  );
}

function ServiceRow({ service, index }: { service: ServiceRowData; index: number }) {
  const { ref, isVisible } = useInView(0.1);
  const isReversed = index % 2 !== 0;

  return (
    <div
      ref={ref}
      className={`
        transition-all duration-700 ease-out
        ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}
      `}
    >
      <Link href={service.href} className="group block">
        <div
          className={`
            grid grid-cols-1 lg:grid-cols-2 items-stretch
            min-h-[400px] lg:min-h-[450px]
            overflow-hidden rounded-2xl bg-neutral-900
          `}
        >
          {/* Media side */}
          <div
            className={`
              relative overflow-hidden min-h-[300px] lg:min-h-full
              ${isReversed ? 'lg:order-2' : ''}
            `}
          >
            {service.useCarousel ? (
              <div className="absolute inset-0 flex items-center overflow-hidden">
                <InlineCarousel />
              </div>
            ) : service.useVideoCarousel ? (
              <InlineVideoCarousel fallbackImage={service.image} />
            ) : (
              <>
                <img
                  src={getImageUrl(service.image)}
                  alt={service.title}
                  className="absolute inset-0 w-full h-full object-cover
                    group-hover:scale-105 transition-transform duration-700 ease-out"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-neutral-900/30 to-transparent lg:hidden" />
              </>
            )}
          </div>

          {/* Text side */}
          <div
            className={`
              relative flex flex-col justify-center p-8 md:p-12 lg:p-16
              ${isReversed ? 'lg:order-1' : ''}
            `}
          >
            {/* Subtle accent line */}
            <div className="w-12 h-0.5 bg-primary-500 mb-6 group-hover:w-20 transition-all duration-500" />

            <h3 className="text-3xl md:text-4xl font-bold text-white mb-4 font-display
              group-hover:text-primary-400 transition-colors duration-300">
              {service.title}
            </h3>

            <p className="text-neutral-300 text-lg leading-relaxed mb-6 max-w-lg">
              {service.description}
            </p>

            {/* Feature list */}
            <ul className="space-y-2 mb-8">
              {service.features.slice(0, 4).map((feature) => (
                <li key={feature} className="flex items-center gap-3 text-neutral-400 text-sm">
                  <span className="w-1 h-1 rounded-full bg-primary-500 flex-shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>

            <span className="inline-flex items-center text-primary-400 font-semibold text-base
              group-hover:gap-3 gap-1 transition-all duration-300">
              Explore {service.title.toLowerCase()}
              <ChevronRightIcon size={18} className="group-hover:translate-x-1 transition-transform duration-300" />
            </span>
          </div>
        </div>
      </Link>
    </div>
  );
}

export function ServicesOverview() {
  return (
    <Section size="lg" background="light">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center max-w-3xl mx-auto mb-12 md:mb-16">
          <p className="text-primary-700 font-medium text-sm tracking-widest uppercase mb-3">
            Find Your Solution
          </p>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-neutral-900 mb-4 font-display">
            Services Provided
          </h2>
        </div>

        {/* Service rows */}
        <div className="space-y-6">
          {services.map((service, i) => (
            <ServiceRow key={service.title} service={service} index={i} />
          ))}
        </div>

        {/* View all CTA */}
        <div className="text-center mt-16">
          <Link
            href="/services"
            className="inline-flex items-center text-primary-600 hover:text-primary-700 font-medium text-lg
              hover:gap-3 gap-2 transition-all duration-300"
          >
            View all services
            <ArrowRightIcon size={20} />
          </Link>
        </div>
      </div>
    </Section>
  );
}
