import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { Container, Section } from '@/components/ui/Container';
import { ContactCTA } from '@/components/sections';
import { Button } from '@/components/ui/Button';
import { CheckIcon } from '@/components/icons';
import { SERVICES, PAGE_META } from '@/lib/constants';
import { getImageUrl } from '@/lib/utils';

export const metadata: Metadata = {
  title: PAGE_META.servicesVideography.title,
  description: PAGE_META.servicesVideography.description,
};

const service = SERVICES.videography;

export default function VideographyPage() {
  return (
    <>
      {/* Hero */}
      <Section size="lg" className="pt-32 bg-neutral-50">
        <Container>
          <div className="max-w-3xl">
            <p className="text-primary-700 font-medium text-sm tracking-widest uppercase mb-3">
              Services
            </p>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-neutral-900 mb-6 font-display">
              {service.title}
            </h1>
            <p className="text-xl text-neutral-600 mb-8">
              {service.description}
            </p>
            <div className="flex flex-wrap gap-4">
              <Button asChild>
                <Link href="/contact">Get a Quote</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/portfolio">View Portfolio</Link>
              </Button>
            </div>
          </div>
        </Container>
      </Section>

      {/* What's included */}
      <Section size="lg" background="white">
        <Container>
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="aspect-[4/3] bg-neutral-200 rounded-2xl overflow-hidden relative">
              <Image
                src={getImageUrl(service.image)}
                alt={service.title}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
                priority
              />
            </div>

            {/* Content */}
            <div>
              <h2 className="text-3xl font-bold text-neutral-900 mb-4 font-display">
                What&apos;s Included
              </h2>
              <p className="text-neutral-600 mb-8 leading-relaxed">
                Every stage of video production covered — from pre-production planning
                and on-location filming to full post-production including color grading
                and sound design. The result is polished content that moves your audience.
              </p>

              <ul className="space-y-3">
                {service.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-3">
                    <CheckIcon size={20} className="text-primary-600 flex-shrink-0" />
                    <span className="text-neutral-700">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Container>
      </Section>

      {/* Sample work placeholders */}
      <Section size="lg" background="light">
        <Container>
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-neutral-900 font-display">
              Recent Work
            </h2>
            <p className="text-neutral-600 mt-3">Video portfolio coming soon.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="aspect-video bg-neutral-200 rounded-xl overflow-hidden relative"
                role="img"
                aria-label="Video portfolio placeholder"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary-500/10 to-primary-700/30" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-14 h-14 rounded-full bg-white/30 flex items-center justify-center">
                    <div className="w-0 h-0 border-t-[10px] border-t-transparent border-b-[10px] border-b-transparent border-l-[18px] border-l-white/70 ml-1" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Container>
      </Section>

      {/* Pricing placeholder */}
      <Section size="md" background="white">
        <Container size="sm">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-neutral-900 mb-4 font-display">
              Pricing
            </h2>
            <p className="text-neutral-600 mb-2">
              Every video project is scoped uniquely based on your needs.
            </p>
            <p className="text-neutral-500 text-sm mb-8">
              Detailed pricing coming soon — reach out for a custom quote.
            </p>
            <Button asChild>
              <Link href="/contact">Request a Quote</Link>
            </Button>
          </div>
        </Container>
      </Section>

      <ContactCTA />
    </>
  );
}
