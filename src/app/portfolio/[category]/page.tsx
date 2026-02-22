import { CategoryPageClient } from './CategoryPageClient';

// Pre-render shells for the three known categories at build time.
// Content is fetched client-side from the API.
export function generateStaticParams() {
  return [
    { category: 'brands' },
    { category: 'portraits' },
    { category: 'events' },
    { category: 'videography' },
    { category: 'drone' },
    { category: 'ai' },
  ];
}

interface PageProps {
  params: { category: string };
}

export default function CategoryPage({ params }: PageProps) {
  return <CategoryPageClient category={params.category} />;
}
