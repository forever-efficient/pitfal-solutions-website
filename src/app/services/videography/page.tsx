import { Metadata } from 'next';
import { Container, Section } from '@/components/ui/Container';
import { ContactCTA } from '@/components/sections';
import { VideoCarousel } from '@/components/sections/VideoCarousel';
import { CheckIcon } from '@/components/icons';
import { SERVICES, PAGE_META } from '@/lib/constants';

export const metadata: Metadata = {
  title: PAGE_META.servicesVideography.title,
  description: PAGE_META.servicesVideography.description,
  alternates: { canonical: '/services/videography/' },
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
            <p className="text-xl text-neutral-600">
              {service.description}
            </p>
          </div>
        </Container>
      </Section>

      {/* What's included */}
      <Section size="md" background="white">
        <Container>
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <VideoCarousel fallback={<div className="aspect-video bg-neutral-200 rounded-2xl" />} />

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
          </div>
        </Container>
      </Section>

      <ContactCTA />
    </>
  );
}
