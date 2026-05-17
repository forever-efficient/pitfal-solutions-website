import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { getImageUrl } from '@/lib/utils';
import { Container, Section } from '@/components/ui/Container';
import { ContactCTA } from '@/components/sections';
import { RecentWorkCarousel } from '@/components/sections/RecentWorkCarousel';
import { VideoCarousel } from '@/components/sections/VideoCarousel';
import { ArrowRightIcon, CheckIcon } from '@/components/icons';
import { SERVICES, PAGE_META } from '@/lib/constants';

export const metadata: Metadata = {
  title: PAGE_META.services.title,
  description: PAGE_META.services.description,
  alternates: { canonical: '/services/' },
};

const serviceCards = [
  { service: SERVICES.photography },
  { service: SERVICES.videography },
  { service: SERVICES.drone },
  { service: SERVICES.ai },
  { service: SERVICES.notary },
];

export default function ServicesPage() {
  return (
    <>
      {/* Hero */}
      <Section size="lg" background="dark" className="pt-32">
        <Container>
          <div className="max-w-3xl">
            <p className="text-primary-400 font-medium text-sm tracking-widest uppercase mb-3">
              Services
            </p>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 font-display">
              Full Service Offerings
            </h1>
            <p className="text-xl text-neutral-300">
              Creative vision, technical precision. Every project.
            </p>
          </div>
        </Container>
      </Section>

      {/* Service cards */}
      <Section size="lg" background="light">
        <Container>
          <div className="grid md:grid-cols-2 gap-8">
            {serviceCards.map(({ service }) => (
              <Link key={service.id} href={service.href} className={`group min-w-0${service.id === 'notary' ? ' md:col-span-2' : ''}`}>
                <div className="overflow-hidden h-full bg-neutral-800 rounded-xl transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5">
                {service.id === 'photography' ? (
                  <div className="pt-5 px-5 bg-neutral-800">
                    <div className="h-64 overflow-hidden flex items-center [&>section]:!py-0 [&>section]:!pt-0 [&>section]:!pb-0">
                      <RecentWorkCarousel showHeader={false} showCta={false} />
                    </div>
                  </div>
                ) : service.id === 'videography' ? (
                  <div className="h-64 overflow-hidden pt-5 flex justify-center px-5">
                    <VideoCarousel fallback={<div className="h-full bg-neutral-700 rounded-xl" />} className="h-full rounded-xl w-full" />
                  </div>
                ) : (
                  <div className="h-64 bg-neutral-700 relative overflow-hidden">
                    <Image
                      src={getImageUrl(service.image)}
                      alt={service.title}
                      fill
                      priority
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                      sizes="(max-width: 768px) 100vw, 50vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                  </div>
                )}

                <div className="p-8">
                  <h2 className="text-2xl font-bold text-white mb-2 font-display group-hover:text-primary-400 transition-colors">
                    {service.title}
                  </h2>
                  <p className="text-neutral-400 text-sm font-medium mb-4">
                    {service.shortDescription}
                  </p>
                  <p className="text-neutral-300 mb-6 leading-relaxed">
                    {service.description}
                  </p>

                  <ul className="space-y-2 mb-8">
                    {service.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2">
                        <CheckIcon size={18} className="text-primary-400 flex-shrink-0" />
                        <span className="text-neutral-300 text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <span className="inline-flex items-center gap-2 text-primary-400 group-hover:text-primary-300 font-semibold transition-colors">
                    Learn more
                    <ArrowRightIcon size={18} />
                  </span>
                </div>
                </div>
              </Link>
            ))}
          </div>
        </Container>
      </Section>

      <ContactCTA />
    </>
  );
}
