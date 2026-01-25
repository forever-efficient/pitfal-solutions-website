import Link from 'next/link';
import { Container, Section } from '@/components/ui/Container';
import { Button } from '@/components/ui/Button';

// Placeholder featured work - will be replaced with real data
const featuredWork = [
  {
    id: '1',
    title: 'Urban Portrait Session',
    category: 'Portraits',
    thumbnail: '/images/featured/portrait-1.jpg',
    href: '/portfolio/portraits/urban-session',
  },
  {
    id: '2',
    title: 'Corporate Brand Shoot',
    category: 'Brand',
    thumbnail: '/images/featured/brand-1.jpg',
    href: '/portfolio/brands/corporate-shoot',
  },
  {
    id: '3',
    title: 'Wedding Celebration',
    category: 'Events',
    thumbnail: '/images/featured/event-1.jpg',
    href: '/portfolio/events/wedding',
  },
  {
    id: '4',
    title: 'Product Photography',
    category: 'Brand',
    thumbnail: '/images/featured/brand-2.jpg',
    href: '/portfolio/brands/product',
  },
  {
    id: '5',
    title: 'Family Portraits',
    category: 'Portraits',
    thumbnail: '/images/featured/portrait-2.jpg',
    href: '/portfolio/portraits/family',
  },
  {
    id: '6',
    title: 'Conference Coverage',
    category: 'Events',
    thumbnail: '/images/featured/event-2.jpg',
    href: '/portfolio/events/conference',
  },
];

export function FeaturedGallery() {
  return (
    <Section size="lg" background="white">
      <Container>
        {/* Section header */}
        <div className="text-center max-w-3xl mx-auto mb-12 md:mb-16">
          <p className="text-primary-600 font-medium text-sm tracking-widest uppercase mb-3">
            Our Work
          </p>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-neutral-900 mb-4 font-display">
            Featured Projects
          </h2>
          <p className="text-lg text-neutral-600">
            A selection of our recent work showcasing the quality and creativity
            we bring to every project.
          </p>
        </div>

        {/* Gallery grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 lg:gap-6">
          {featuredWork.map((item, index) => (
            <Link
              key={item.id}
              href={item.href}
              className={`group relative aspect-square overflow-hidden rounded-xl bg-neutral-200 ${
                index === 0 || index === 3 ? 'md:row-span-2 md:aspect-auto' : ''
              }`}
            >
              {/* Placeholder gradient - will be replaced with actual images */}
              <div className="absolute inset-0 bg-gradient-to-br from-neutral-300 to-neutral-400" />

              {/* Overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-300" />

              {/* Content */}
              <div className="absolute inset-0 p-4 flex flex-col justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <span className="text-white/80 text-xs font-medium uppercase tracking-wider">
                  {item.category}
                </span>
                <h3 className="text-white font-semibold text-lg mt-1">
                  {item.title}
                </h3>
              </div>

              {/* View icon */}
              <div className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <svg
                  className="w-5 h-5 text-neutral-900"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
              </div>
            </Link>
          ))}
        </div>

        {/* View all CTA */}
        <div className="text-center mt-12">
          <Button variant="outline" size="lg" asChild>
            <Link href="/portfolio">
              View Full Portfolio
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
          </Button>
        </div>
      </Container>
    </Section>
  );
}
