import Link from 'next/link';
import { Container, Section } from '@/components/ui/Container';
import { Card, CardContent } from '@/components/ui/Card';

const services = [
  {
    title: 'Brand Photography',
    description:
      'Elevate your brand with professional imagery that tells your story. Perfect for businesses, entrepreneurs, and content creators.',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
        />
      </svg>
    ),
    href: '/services#brand',
    image: '/images/services/brand.jpg',
  },
  {
    title: 'Portrait Sessions',
    description:
      'From headshots to family portraits, we capture authentic moments and genuine expressions that you will treasure.',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
        />
      </svg>
    ),
    href: '/services#portraits',
    image: '/images/services/portraits.jpg',
  },
  {
    title: 'Event Coverage',
    description:
      'Comprehensive event documentation including corporate events, weddings, and special occasions. Never miss a moment.',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
    ),
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
            Our Services
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
                    <svg
                      className="w-4 h-4 ml-1"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
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
            <svg
              className="w-5 h-5 ml-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 8l4 4m0 0l-4 4m4-4H3"
              />
            </svg>
          </Link>
        </div>
      </Container>
    </Section>
  );
}
