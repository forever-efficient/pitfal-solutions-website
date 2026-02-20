import Link from 'next/link';
import Image from 'next/image';
import { Container, Section } from '@/components/ui/Container';
import { Card, CardContent } from '@/components/ui/Card';
import {
  ArrowRightIcon,
  BuildingIcon,
  EyeIcon,
  CalendarIcon,
  ArrowDownIcon,
  ChevronRightIcon,
} from '@/components/icons';
import { SERVICES } from '@/lib/constants';
import { getImageUrl } from '@/lib/utils';

const services = [
  {
    title: SERVICES.photography.title,
    description: SERVICES.photography.description,
    image: SERVICES.photography.image,
    icon: <EyeIcon size={32} strokeWidth={1.5} />,
    href: SERVICES.photography.href,
  },
  {
    title: SERVICES.videography.title,
    description: SERVICES.videography.description,
    image: SERVICES.videography.image,
    icon: <CalendarIcon size={32} strokeWidth={1.5} />,
    href: SERVICES.videography.href,
  },
  {
    title: SERVICES.drone.title,
    description: SERVICES.drone.description,
    image: SERVICES.drone.image,
    icon: <ArrowDownIcon size={32} strokeWidth={1.5} />,
    href: SERVICES.drone.href,
  },
  {
    title: SERVICES.ai.title,
    description: SERVICES.ai.description,
    image: SERVICES.ai.image,
    icon: <BuildingIcon size={32} strokeWidth={1.5} />,
    href: SERVICES.ai.href,
  },
];

export function ServicesOverview() {
  return (
    <Section size="lg" background="light">
      <Container>
        {/* Section header */}
        <div className="text-center max-w-3xl mx-auto mb-12 md:mb-16">
          <p className="text-primary-700 font-medium text-sm tracking-widest uppercase mb-3">
            Find Your Solution
          </p>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-neutral-900 mb-4 font-display">
            Services Provided
          </h2>
          <p className="text-lg text-neutral-600">
            From photography and videography to aerial imaging and AI solutions, 
            every project receives complete creative and technical attention.
          </p>
        </div>

        {/* Service cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-2">
          {services.map((service) => (
            <Link key={service.title} href={service.href} className="group">
              <Card hover padding="none" className="h-full overflow-hidden">
                <div className="h-[325px] bg-neutral-200 relative overflow-hidden">
                  <Image
                    src={getImageUrl(service.image)}
                    alt={service.title}
                    fill
                    priority
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                </div>

                <CardContent className="p-6">
                  <h3 className="text-xl sm:text-2xl font-semibold text-neutral-900 mb-3 group-hover:text-primary-600 transition-colors">
                    {service.title}
                  </h3>
                  <p className="text-neutral-600 text-base leading-relaxed">
                    {service.description}
                  </p>
                  <span className="inline-flex items-center text-primary-600 font-semibold text-base mt-4 group-hover:gap-2 transition-all">
                    Learn more
                    <ChevronRightIcon size={16} className="ml-1" />
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* View all CTA */}
        <div className="text-center mt-12">
          <Link
            href="/services"
            className="inline-flex items-center text-primary-600 hover:text-primary-700 font-medium"
          >
            View all services
            <ArrowRightIcon size={20} className="ml-2" />
          </Link>
        </div>
      </Container>
    </Section>
  );
}
