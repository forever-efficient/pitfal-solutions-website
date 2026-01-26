import Link from 'next/link';
import { Container, Section } from '@/components/ui/Container';
import { ArrowRightIcon, EyeIcon } from '@/components/icons';

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
];

export function FeaturedGallery() {
  return (
    <Section size="lg" background="white">
      <Container>
        {/* Section header */}
        <div className="text-center max-w-3xl mx-auto mb-12 md:mb-16">
          <p className="text-primary-700 font-medium text-sm tracking-widest uppercase mb-3">
            Our Work
          </p>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-neutral-900 mb-4 font-display">
            Featured Projects
          </h2>
          <p className="text-lg text-neutral-600">
            A selection of recent work showcasing the quality and creativity
            brought to every project.
          </p>
        </div>

        {/* Gallery grid - 3 columns on desktop, 1 on mobile */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {featuredWork.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className="group relative aspect-[4/3] overflow-hidden rounded-2xl bg-neutral-200 shadow-lg hover:shadow-xl transition-shadow duration-300"
            >
              {/* Placeholder gradient - will be replaced with actual images */}
              <div className="absolute inset-0 bg-gradient-to-br from-neutral-400 to-neutral-500" />

              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent group-hover:from-black/90 transition-colors duration-300" />

              {/* Content - always visible */}
              <div className="absolute inset-0 p-6 flex flex-col justify-end">
                <span className="text-accent-400 text-sm font-semibold uppercase tracking-wider mb-2">
                  {item.category}
                </span>
                <h3 className="text-white font-bold text-xl lg:text-2xl leading-tight">
                  {item.title}
                </h3>
              </div>

              {/* View icon */}
              <div className="absolute top-4 right-4 w-12 h-12 rounded-full bg-white/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-md">
                <EyeIcon size={24} className="text-neutral-900" />
              </div>
            </Link>
          ))}
        </div>

        {/* View all CTA */}
        <div className="text-center mt-12">
          <Link
            href="/portfolio"
            className="inline-flex items-center justify-center font-medium text-lg px-8 py-4 rounded-lg bg-primary-600 hover:bg-primary-700 text-white shadow-sm hover:shadow-md transition-all duration-200 min-w-[220px]"
          >
            View Full Portfolio
            <ArrowRightIcon size={20} className="ml-2" />
          </Link>
        </div>
      </Container>
    </Section>
  );
}
