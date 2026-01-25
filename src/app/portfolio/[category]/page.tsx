import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Container, Section } from '@/components/ui/Container';
import { GalleryGrid } from '@/components/gallery/GalleryGrid';
import { ContactCTA } from '@/components/sections';

// Category data
const categoryData: Record<
  string,
  {
    title: string;
    description: string;
    galleries: Array<{
      id: string;
      slug: string;
      title: string;
      thumbnail: string;
      imageCount: number;
    }>;
  }
> = {
  brands: {
    title: 'Brand Photography',
    description:
      'Professional brand imagery for businesses, entrepreneurs, and content creators. From product photography to lifestyle brand shoots.',
    galleries: [
      {
        id: '1',
        slug: 'tech-startup-rebrand',
        title: 'Tech Startup Rebrand',
        thumbnail: '/images/portfolio/brands/tech-startup.jpg',
        imageCount: 24,
      },
      {
        id: '2',
        slug: 'coffee-shop-launch',
        title: 'Coffee Shop Launch',
        thumbnail: '/images/portfolio/brands/coffee-shop.jpg',
        imageCount: 32,
      },
      {
        id: '3',
        slug: 'fitness-brand',
        title: 'Fitness Brand Campaign',
        thumbnail: '/images/portfolio/brands/fitness.jpg',
        imageCount: 28,
      },
    ],
  },
  portraits: {
    title: 'Portrait Photography',
    description:
      'From professional headshots to family portraits, capturing authentic moments and genuine expressions.',
    galleries: [
      {
        id: '1',
        slug: 'executive-headshots',
        title: 'Executive Headshots',
        thumbnail: '/images/portfolio/portraits/executive.jpg',
        imageCount: 15,
      },
      {
        id: '2',
        slug: 'family-session',
        title: 'Smith Family Session',
        thumbnail: '/images/portfolio/portraits/family.jpg',
        imageCount: 45,
      },
      {
        id: '3',
        slug: 'senior-portraits',
        title: 'Senior Portraits 2024',
        thumbnail: '/images/portfolio/portraits/senior.jpg',
        imageCount: 38,
      },
    ],
  },
  events: {
    title: 'Event Coverage',
    description:
      'Comprehensive documentation of weddings, corporate events, and special occasions.',
    galleries: [
      {
        id: '1',
        slug: 'johnson-wedding',
        title: 'Johnson Wedding',
        thumbnail: '/images/portfolio/events/wedding.jpg',
        imageCount: 250,
      },
      {
        id: '2',
        slug: 'tech-conference-2024',
        title: 'Tech Conference 2024',
        thumbnail: '/images/portfolio/events/conference.jpg',
        imageCount: 120,
      },
      {
        id: '3',
        slug: 'charity-gala',
        title: 'Annual Charity Gala',
        thumbnail: '/images/portfolio/events/gala.jpg',
        imageCount: 85,
      },
    ],
  },
};

interface PageProps {
  params: Promise<{ category: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { category } = await params;
  const data = categoryData[category];

  if (!data) {
    return {
      title: 'Portfolio',
    };
  }

  return {
    title: data.title,
    description: data.description,
  };
}

export async function generateStaticParams() {
  return Object.keys(categoryData).map((category) => ({
    category,
  }));
}

export default async function CategoryPage({ params }: PageProps) {
  const { category } = await params;
  const data = categoryData[category];

  if (!data) {
    notFound();
  }

  return (
    <>
      {/* Hero */}
      <Section size="lg" className="pt-32 bg-neutral-50">
        <Container>
          {/* Breadcrumb */}
          <nav className="mb-6">
            <ol className="flex items-center text-sm text-neutral-500">
              <li>
                <Link href="/portfolio" className="hover:text-primary-600">
                  Portfolio
                </Link>
              </li>
              <li className="mx-2">/</li>
              <li className="text-neutral-900">{data.title}</li>
            </ol>
          </nav>

          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-bold text-neutral-900 mb-6 font-display">
              {data.title}
            </h1>
            <p className="text-xl text-neutral-600">{data.description}</p>
          </div>
        </Container>
      </Section>

      {/* Galleries */}
      <Section size="lg" background="white">
        <Container>
          <GalleryGrid galleries={data.galleries} category={category} />
        </Container>
      </Section>

      <ContactCTA />
    </>
  );
}
