import { Metadata } from 'next';
import Link from 'next/link';
import { Container, Section } from '@/components/ui/Container';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ContactCTA } from '@/components/sections';
import { CheckIcon } from '@/components/icons';

export const metadata: Metadata = {
  title: 'Services',
  description:
    'Professional photography and videography services including brand photography, portrait sessions, and event coverage. View our packages and pricing.',
};

const services = [
  {
    id: 'brand',
    title: 'Brand Photography',
    description:
      'Elevate your brand with professional imagery that tells your story. Perfect for businesses, entrepreneurs, and content creators looking to make a lasting impression.',
    features: [
      'Product photography',
      'Lifestyle brand shots',
      'Social media content',
      'Website imagery',
      'Marketing materials',
    ],
    startingAt: '$500',
    image: '/images/services/brand.jpg',
  },
  {
    id: 'portraits',
    title: 'Portrait Sessions',
    description:
      'From professional headshots to family portraits, we capture authentic moments and genuine expressions that you will treasure for years to come.',
    features: [
      'Professional headshots',
      'Family portraits',
      'Couples photography',
      'Senior portraits',
      'Personal branding',
    ],
    startingAt: '$300',
    image: '/images/services/portraits.jpg',
  },
  {
    id: 'events',
    title: 'Event Coverage',
    description:
      'Comprehensive documentation of your special occasions. From corporate events to weddings, we ensure every important moment is captured beautifully.',
    features: [
      'Corporate events',
      'Weddings',
      'Conferences',
      'Private parties',
      'Live performances',
    ],
    startingAt: '$1,000',
    image: '/images/services/events.jpg',
  },
  {
    id: 'commercial',
    title: 'Commercial Projects',
    description:
      'Full-service commercial photography and videography for advertising, marketing campaigns, and editorial content that demands attention.',
    features: [
      'Advertising campaigns',
      'Editorial photography',
      'Real estate',
      'Food & beverage',
      'Video production',
    ],
    startingAt: 'Custom Quote',
    image: '/images/services/commercial.jpg',
  },
];

const packages = [
  {
    name: 'Starter',
    price: '$300',
    description: 'Perfect for individuals needing professional headshots or portraits.',
    features: [
      '1-hour session',
      '1 location',
      '15 edited images',
      'Online gallery',
      'Digital download',
    ],
    cta: 'Book Now',
    popular: false,
  },
  {
    name: 'Professional',
    price: '$650',
    description: 'Ideal for entrepreneurs and small businesses building their brand.',
    features: [
      '2-hour session',
      'Up to 2 locations',
      '40 edited images',
      'Online gallery',
      'Digital download',
      'Print release',
    ],
    cta: 'Book Now',
    popular: true,
  },
  {
    name: 'Premium',
    price: '$1,200',
    description: 'Comprehensive coverage for brands and special occasions.',
    features: [
      '4-hour session',
      'Multiple locations',
      '80+ edited images',
      'Online gallery',
      'Digital download',
      'Print release',
      'Rush delivery available',
    ],
    cta: 'Book Now',
    popular: false,
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
              Services Provided
            </p>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-neutral-900 mb-6 font-display">
              Professional Photography & Videography
            </h1>
            <p className="text-xl text-neutral-600">
              From brand photography to event coverage, we offer comprehensive
              services tailored to your unique needs.
            </p>
          </div>
        </Container>
      </Section>

      {/* Services */}
      <Section size="lg" background="white">
        <Container>
          <div className="space-y-16">
            {services.map((service, index) => (
              <div
                key={service.id}
                id={service.id}
                className={`grid lg:grid-cols-2 gap-8 lg:gap-12 items-center ${
                  index % 2 === 1 ? 'lg:flex-row-reverse' : ''
                }`}
              >
                {/* Image placeholder */}
                <div
                  className={`aspect-[4/3] bg-neutral-200 rounded-2xl overflow-hidden relative ${
                    index % 2 === 1 ? 'lg:order-2' : ''
                  }`}
                  role="img"
                  aria-label={`${service.title} service preview image`}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-primary-500/20 to-primary-700/40" aria-hidden="true" />
                </div>

                {/* Content */}
                <div className={index % 2 === 1 ? 'lg:order-1' : ''}>
                  <h2 className="text-3xl font-bold text-neutral-900 mb-4 font-display">
                    {service.title}
                  </h2>
                  <p className="text-lg text-neutral-600 mb-6">
                    {service.description}
                  </p>

                  <ul className="space-y-2 mb-6">
                    {service.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2">
                        <CheckIcon size={20} className="text-primary-600 flex-shrink-0" />
                        <span className="text-neutral-700">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <p className="text-sm text-neutral-500 mb-4">
                    Starting at{' '}
                    <span className="text-2xl font-bold text-neutral-900">
                      {service.startingAt}
                    </span>
                  </p>

                  <Button asChild>
                    <Link href="/contact">Get a Quote</Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Container>
      </Section>

      {/* Pricing packages */}
      <Section size="lg" background="light" id="packages">
        <Container>
          <div className="text-center max-w-3xl mx-auto mb-12">
            <p className="text-primary-700 font-medium text-sm tracking-widest uppercase mb-3">
              Packages
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-4 font-display">
              Simple, Transparent Pricing
            </h2>
            <p className="text-lg text-neutral-600">
              Choose a package that fits your needs, or reach out for a custom quote.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
            {packages.map((pkg) => (
              <Card
                key={pkg.name}
                variant={pkg.popular ? 'elevated' : 'outlined'}
                className={`relative ${pkg.popular ? 'border-2 border-primary-500' : ''}`}
              >
                {pkg.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-primary-600 text-white text-xs font-medium px-3 py-1 rounded-full">
                      Most Popular
                    </span>
                  </div>
                )}
                <CardContent className="p-6 pt-8">
                  <h3 className="text-xl font-semibold text-neutral-900 mb-1">
                    {pkg.name}
                  </h3>
                  <p className="text-3xl font-bold text-neutral-900 mb-2">
                    {pkg.price}
                  </p>
                  <p className="text-sm text-neutral-600 mb-6">
                    {pkg.description}
                  </p>

                  <ul className="space-y-3 mb-8">
                    {pkg.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm">
                        <CheckIcon size={20} className="text-primary-600 flex-shrink-0" />
                        <span className="text-neutral-700">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    variant={pkg.popular ? 'primary' : 'outline'}
                    className="w-full"
                    asChild
                  >
                    <Link href="/contact">{pkg.cta}</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          <p className="text-center text-neutral-500 mt-8">
            Need something different?{' '}
            <Link href="/contact" className="text-primary-600 hover:underline">
              Reach out for a custom quote
            </Link>
          </p>
        </Container>
      </Section>

      <ContactCTA />
    </>
  );
}
