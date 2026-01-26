import Link from 'next/link';
import { Container, Section } from '@/components/ui/Container';
import { Card, CardContent } from '@/components/ui/Card';
import {
  ArrowRightIcon,
  BuildingIcon,
  UserIcon,
  CalendarIcon,
  ChevronRightIcon,
} from '@/components/icons';

const services = [
  {
    title: 'Brand Photography',
    description:
      'Elevate your brand with professional imagery that tells your story. Perfect for businesses, entrepreneurs, and content creators.',
    icon: <BuildingIcon size={32} strokeWidth={1.5} />,
    href: '/services#brand',
    image: '/images/services/brand.jpg',
  },
  {
    title: 'Portrait Sessions',
    description:
      'From headshots to family portraits, we capture authentic moments and genuine expressions that you will treasure.',
    icon: <UserIcon size={32} strokeWidth={1.5} />,
    href: '/services#portraits',
    image: '/images/services/portraits.jpg',
  },
  {
    title: 'Event Coverage',
    description:
      'Comprehensive event documentation including corporate events, weddings, and special occasions. Never miss a moment.',
    icon: <CalendarIcon size={32} strokeWidth={1.5} />,
    href: '/services#events',
    image: '/images/services/events.jpg',
  },
];

export function ServicesOverview() {
  return (
    <Section size="lg" background="light">
      <Container>
        {/* Section header */}
        <div className="text-center max-w-3xl mx-auto mb-12 md:mb-16">
          <p className="text-primary-700 font-medium text-sm tracking-widest uppercase mb-3">
            What We Offer
          </p>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-neutral-900 mb-4 font-display">
            Services Provided
          </h2>
          <p className="text-lg text-neutral-600">
            Professional photography and videography tailored to your unique needs.
            Every project receives our full creative attention.
          </p>
        </div>

        {/* Service cards */}
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {services.map((service) => (
            <Link key={service.title} href={service.href} className="group">
              <Card hover className="h-full overflow-hidden">
                {/* Image placeholder */}
                <div className="h-48 bg-neutral-200 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary-500/20 to-primary-700/40" />
                  <div className="absolute inset-0 flex items-center justify-center text-primary-600 group-hover:scale-110 transition-transform duration-300">
                    {service.icon}
                  </div>
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
