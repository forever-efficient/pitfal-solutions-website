import { Metadata } from 'next';
import Link from 'next/link';
import { Container, Section } from '@/components/ui/Container';
import { ContactCTA } from '@/components/sections';
import { Button } from '@/components/ui/Button';
import { CheckIcon } from '@/components/icons';
import { SERVICES, PAGE_META } from '@/lib/constants';

export const metadata: Metadata = {
  title: PAGE_META.servicesDrone.title,
  description: PAGE_META.servicesDrone.description,
};

const service = SERVICES.drone;

export default function CommercialDronePage() {
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
            {/* Image placeholder */}
            <div
              className="aspect-[4/3] bg-neutral-200 rounded-2xl overflow-hidden relative"
              role="img"
              aria-label="Commercial drone service preview"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary-500/20 to-primary-700/40" aria-hidden="true" />
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-neutral-400 text-sm">Image coming soon</p>
              </div>
            </div>

            {/* Content */}
            <div>
              <h2 className="text-3xl font-bold text-neutral-900 mb-4 font-display">
                What&apos;s Included
              </h2>
              <p className="text-neutral-600 mb-8 leading-relaxed">
                FAA Part 107 certified aerial operations using commercial-grade drones
                for stunning imagery — safely, legally, and fully edited for immediate
                use. All airspace coordination is handled.
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

      {/* Use cases */}
      <Section size="lg" background="light">
        <Container>
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-neutral-900 font-display">
              Common Use Cases
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                title: 'Real Estate',
                description: 'Showcase properties with dramatic aerial perspectives that ground-level photography cannot achieve.',
              },
              {
                title: 'Construction & Progress',
                description: 'Document site progress, inspect structures, and create compelling before/after footage.',
              },
              {
                title: 'Events & Venues',
                description: 'Capture the full scale of large events, festivals, and venues from above.',
              },
            ].map((useCase) => (
              <div key={useCase.title} className="bg-white rounded-xl p-6 shadow-sm border border-neutral-100">
                <h3 className="text-lg font-semibold text-neutral-900 mb-2">{useCase.title}</h3>
                <p className="text-neutral-600 text-sm leading-relaxed">{useCase.description}</p>
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
              Drone pricing varies by project scope, location, and duration.
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
