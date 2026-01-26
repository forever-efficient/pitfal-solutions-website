import { Metadata } from 'next';
import Link from 'next/link';
import { Container, Section } from '@/components/ui/Container';
import { ContactCTA } from '@/components/sections';

export const metadata: Metadata = {
  title: 'Portfolio',
  description:
    'View our photography and videography portfolio featuring brand photography, portrait sessions, and event coverage. Based in Denver, Colorado.',
};

const categories = [
  {
    slug: 'brands',
    title: 'Brand Photography',
    description: 'Professional brand imagery for businesses and entrepreneurs',
    count: 12,
    image: '/images/portfolio/brands-cover.jpg',
  },
  {
    slug: 'portraits',
    title: 'Portraits',
    description: 'Headshots, family portraits, and personal branding',
    count: 18,
    image: '/images/portfolio/portraits-cover.jpg',
  },
  {
    slug: 'events',
    title: 'Events',
    description: 'Weddings, corporate events, and special occasions',
    count: 8,
    image: '/images/portfolio/events-cover.jpg',
  },
];

export default function PortfolioPage() {
  return (
    <>
      {/* Hero */}
      <Section size="lg" className="pt-32 bg-neutral-50">
        <Container>
          <div className="max-w-3xl">
            <p className="text-primary-700 font-medium text-sm tracking-widest uppercase mb-3">
              Portfolio
            </p>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-neutral-900 mb-6 font-display">
              Our Work
            </h1>
            <p className="text-xl text-neutral-600">
              Explore past collection of photography and videography projects to see what the future can bring you.
              Each gallery showcases the commitment to quality and creativity you will receive.
            </p>
          </div>
        </Container>
      </Section>

      {/* Category grid */}
      <Section size="lg" background="white">
        <Container>
          <div
            className="grid md:grid-cols-3 gap-6 lg:gap-8"
            role="list"
            aria-label="Portfolio categories"
          >
            {categories.map((category) => (
              <Link
                key={category.slug}
                href={`/portfolio/${category.slug}`}
                className="group block"
                role="listitem"
                aria-label={`View ${category.title} portfolio - ${category.count} galleries`}
              >
                <article className="aspect-[4/5] bg-neutral-200 rounded-2xl overflow-hidden relative mb-4">
                  {/* Gradient placeholder */}
                  <div
                    className="absolute inset-0 bg-gradient-to-br from-neutral-300 to-neutral-400"
                    role="img"
                    aria-label={`${category.title} category preview image`}
                  />

                  {/* Overlay */}
                  <div
                    className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-300"
                    aria-hidden="true"
                  />

                  {/* Category badge */}
                  <div className="absolute top-4 left-4">
                    <span className="bg-white/90 backdrop-blur-sm text-neutral-900 text-xs font-medium px-3 py-1 rounded-full">
                      {category.count} galleries
                    </span>
                  </div>

                  {/* Arrow */}
                  <div
                    className="absolute bottom-4 right-4 w-10 h-10 bg-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform group-hover:scale-100 scale-90"
                    aria-hidden="true"
                  >
                    <svg
                      className="w-5 h-5 text-neutral-900"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 8l4 4m0 0l-4 4m4-4H3"
                      />
                    </svg>
                  </div>
                </article>

                <h2 className="text-xl font-semibold text-neutral-900 mb-1 group-hover:text-primary-600 transition-colors">
                  {category.title}
                </h2>
                <p className="text-neutral-600 text-sm">{category.description}</p>
              </Link>
            ))}
          </div>
        </Container>
      </Section>

      <ContactCTA />
    </>
  );
}
