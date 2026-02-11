import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Container, Section } from '@/components/ui/Container';
import { GalleryGrid } from '@/components/gallery/GalleryGrid';
import { ContactCTA } from '@/components/sections';
import { getGalleriesByCategory } from '@/lib/galleries';
import { PORTFOLIO_CATEGORIES } from '@/lib/constants';
import { getImageUrl } from '@/lib/utils';

interface PageProps {
  params: Promise<{ category: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { category } = await params;
  const categoryInfo = PORTFOLIO_CATEGORIES[category as keyof typeof PORTFOLIO_CATEGORIES];

  if (!categoryInfo) {
    return { title: 'Portfolio' };
  }

  return {
    title: categoryInfo.title,
    description: categoryInfo.description,
  };
}

export async function generateStaticParams() {
  return Object.keys(PORTFOLIO_CATEGORIES).map((category) => ({
    category,
  }));
}

export default async function CategoryPage({ params }: PageProps) {
  const { category } = await params;
  const categoryInfo = PORTFOLIO_CATEGORIES[category as keyof typeof PORTFOLIO_CATEGORIES];

  if (!categoryInfo) {
    notFound();
  }

  const galleries = getGalleriesByCategory(category);

  // Map gallery manifest data to the shape GalleryGrid expects
  const galleryGridData = galleries.map((g) => ({
    id: g.slug,
    slug: g.slug,
    title: g.title,
    thumbnail: g.images[0]?.key ? getImageUrl(g.images[0].key) : '',
    imageCount: g.images.length,
    description: g.description,
  }));

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
              <li className="text-neutral-900">{categoryInfo.title}</li>
            </ol>
          </nav>

          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-bold text-neutral-900 mb-6 font-display">
              {categoryInfo.title}
            </h1>
            <p className="text-xl text-neutral-600">{categoryInfo.description}</p>
          </div>
        </Container>
      </Section>

      {/* Galleries */}
      <Section size="lg" background="white">
        <Container>
          <GalleryGrid galleries={galleryGridData} category={category} />
        </Container>
      </Section>

      <ContactCTA />
    </>
  );
}
