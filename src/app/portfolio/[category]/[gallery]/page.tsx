import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Container, Section } from '@/components/ui/Container';
import { GalleryViewer } from '@/components/gallery';
import { ContactCTA } from '@/components/sections';
import { getGallery, getAllGallerySlugs } from '@/lib/galleries';
import { PORTFOLIO_CATEGORIES } from '@/lib/constants';
import { formatDate } from '@/lib/utils';

interface PageProps {
  params: Promise<{ category: string; gallery: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { category, gallery: slug } = await params;
  const gallery = getGallery(category, slug);

  if (!gallery) {
    return { title: 'Gallery Not Found' };
  }

  return {
    title: gallery.title,
    description: gallery.description,
  };
}

export async function generateStaticParams() {
  return getAllGallerySlugs();
}

export default async function GalleryPage({ params }: PageProps) {
  const { category, gallery: slug } = await params;
  const gallery = getGallery(category, slug);

  if (!gallery) {
    notFound();
  }

  const categoryTitle =
    PORTFOLIO_CATEGORIES[category as keyof typeof PORTFOLIO_CATEGORIES]?.title || category;

  return (
    <>
      {/* Hero */}
      <Section size="lg" className="pt-32 bg-neutral-50">
        <Container>
          {/* Breadcrumb */}
          <nav className="mb-6" aria-label="Breadcrumb">
            <ol className="flex items-center text-sm text-neutral-500">
              <li>
                <Link href="/portfolio" className="hover:text-primary-600">
                  Portfolio
                </Link>
              </li>
              <li className="mx-2">/</li>
              <li>
                <Link href={`/portfolio/${category}`} className="hover:text-primary-600">
                  {categoryTitle}
                </Link>
              </li>
              <li className="mx-2">/</li>
              <li className="text-neutral-900">{gallery.title}</li>
            </ol>
          </nav>

          <div className="max-w-3xl">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-neutral-900 mb-4 font-display">
              {gallery.title}
            </h1>
            <p className="text-lg text-neutral-600 mb-4">{gallery.description}</p>
            <div className="flex items-center gap-4 text-sm text-neutral-500">
              <span>{formatDate(gallery.date)}</span>
              <span aria-hidden="true">|</span>
              <span>{gallery.images.length} images</span>
            </div>
          </div>
        </Container>
      </Section>

      {/* Gallery Images */}
      <Section size="lg" background="white">
        <Container>
          <GalleryViewer images={gallery.images} title={gallery.title} />
        </Container>
      </Section>

      <ContactCTA />
    </>
  );
}
