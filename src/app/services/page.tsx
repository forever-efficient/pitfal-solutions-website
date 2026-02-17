import { Metadata } from 'next';
import Link from 'next/link';
import { Container, Section } from '@/components/ui/Container';
import { Card, CardContent } from '@/components/ui/Card';
import { ContactCTA } from '@/components/sections';
import {
  ArrowRightIcon,
  BuildingIcon,
  EyeIcon,
  CalendarIcon,
  ArrowDownIcon,
  CheckIcon,
} from '@/components/icons';
import { SERVICES, PAGE_META } from '@/lib/constants';

export const metadata: Metadata = {
  title: PAGE_META.services.title,
  description: PAGE_META.services.description,
};

const serviceCards = [
  {
    service: SERVICES.photography,
    icon: <EyeIcon size={36} strokeWidth={1.5} />,
  },
  {
    service: SERVICES.videography,
    icon: <CalendarIcon size={36} strokeWidth={1.5} />,
  },
  {
    service: SERVICES.drone,
    icon: <ArrowDownIcon size={36} strokeWidth={1.5} />,
  },
  {
    service: SERVICES.ai,
    icon: <BuildingIcon size={36} strokeWidth={1.5} />,
  },
];

export default function ServicesPage() {
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
              Full Service Offerings
            </h1>
            <p className="text-xl text-neutral-600">
              From cinematic photography and video to aerial imaging and AI-powered
              solutions — creative and technical expertise applied to every project.
            </p>
          </div>
        </Container>
      </Section>

      {/* Service cards */}
      <Section size="lg" background="white">
        <Container>
          <div className="grid md:grid-cols-2 gap-8">
            {serviceCards.map(({ service, icon }) => (
              <Card key={service.id} hover className="overflow-hidden group">
                {/* Image placeholder */}
                <div className="h-48 bg-neutral-200 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary-500/20 to-primary-700/40" />
                  <div className="absolute inset-0 flex items-center justify-center text-primary-600 group-hover:scale-110 transition-transform duration-300">
                    {icon}
                  </div>
                </div>

                <CardContent className="p-8">
                  <h2 className="text-2xl font-bold text-neutral-900 mb-2 font-display group-hover:text-primary-600 transition-colors">
                    {service.title}
                  </h2>
                  <p className="text-neutral-500 text-sm font-medium mb-4">
                    {service.shortDescription}
                  </p>
                  <p className="text-neutral-600 mb-6 leading-relaxed">
                    {service.description}
                  </p>

                  <ul className="space-y-2 mb-8">
                    {service.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2">
                        <CheckIcon size={18} className="text-primary-600 flex-shrink-0" />
                        <span className="text-neutral-700 text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Link
                    href={service.href}
                    className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 font-semibold transition-colors"
                  >
                    Learn more
                    <ArrowRightIcon size={18} />
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </Container>
      </Section>

      <ContactCTA />
    </>
  );
}
