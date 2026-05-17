import type { Metadata } from 'next';
import { CategoryPageClient } from './CategoryPageClient';
import {
  PORTFOLIO_CATEGORIES,
  PORTFOLIO_ROW_SLUGS,
  PortfolioCategorySlug,
} from '@/lib/constants';

export function generateMetadata({ params }: { params: { category: string } }): Metadata {
  const cat = PORTFOLIO_CATEGORIES[params.category as PortfolioCategorySlug];
  const title = cat ? cat.title : 'Portfolio';
  return {
    title,
    alternates: { canonical: `/portfolio/${params.category}/` },
  };
}

// Pre-render shells for the seven public portfolio categories at build time.
// Content is fetched client-side from the API.
export function generateStaticParams() {
  return PORTFOLIO_ROW_SLUGS.map((category) => ({ category }));
}

interface PageProps {
  params: { category: string };
}

export default function CategoryPage({ params }: PageProps) {
  return <CategoryPageClient category={params.category} />;
}
