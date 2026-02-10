import Image from 'next/image';
import Link from 'next/link';
import { ArrowDownIcon } from '@/components/icons';
import { COPY } from '@/lib/constants';

export interface HeroSectionProps {
  title?: string;
  subtitle?: string;
  tagline?: string;
  ctaText?: string;
  ctaHref?: string;
  secondaryCtaText?: string;
  secondaryCtaHref?: string;
  backgroundImage?: string;
}

export function HeroSection({
  title = COPY.hero.title,
  subtitle = COPY.hero.subtitle,
  tagline = COPY.hero.tagline,
  ctaText = 'Book a Session',
  ctaHref = '/contact',
  secondaryCtaText = COPY.hero.cta,
  secondaryCtaHref = '/portfolio',
  backgroundImage = '/images/hero-bg.jpg',
}: HeroSectionProps) {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <Image
          src={backgroundImage}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70" />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Tagline */}
        <p className="text-accent-400 font-medium text-sm sm:text-base tracking-widest uppercase mb-4 animate-fade-in">
          {tagline}
        </p>

        {/* Title */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 animate-fade-in-up font-display">
          {title}
        </h1>

        {/* Subtitle */}
        <p className="text-lg sm:text-xl md:text-2xl text-white/90 mb-8 max-w-2xl mx-auto animate-fade-in-up animation-delay-200">
          {subtitle}
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up animation-delay-400">
          <Link
            href={ctaHref}
            className="inline-flex items-center justify-center font-medium text-lg px-8 py-4 rounded-lg bg-accent-700 hover:bg-accent-800 text-white shadow-lg hover:shadow-xl transition-all duration-200 min-w-[200px]"
          >
            {ctaText}
          </Link>
          <Link
            href={secondaryCtaHref}
            className="inline-flex items-center justify-center font-medium text-lg px-8 py-4 rounded-lg border-2 border-white text-white hover:bg-white hover:text-neutral-900 transition-all duration-200 min-w-[200px]"
          >
            {secondaryCtaText}
          </Link>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <ArrowDownIcon size={24} className="text-white/70" />
      </div>
    </section>
  );
}
