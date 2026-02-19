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
  title: PAGE_META.servicesPhotography.title,
  description: PAGE_META.servicesPhotography.description,
};

const service = SERVICES.photography;

export default function PhotographyPage() {
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
                Every photography session is tailored to your goals. Whether you need
                polished brand imagery, authentic portraits, or dynamic event coverage,
                you get deliberate, story-driven photos delivered in a professional
                online gallery.
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
            <p className="text-neutral-600 mt-3">Portfolio images coming soon.</p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="aspect-square bg-neutral-200 rounded-xl overflow-hidden relative"
                role="img"
                aria-label="Portfolio placeholder"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary-500/10 to-primary-700/30" />
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <Button variant="outline" asChild>
              <Link href="/portfolio">View Full Portfolio</Link>
            </Button>
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
              Packages tailored to your project scope and budget.
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
