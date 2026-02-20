import { GalleryPageClient } from './GalleryPageClient';

// At build time, fetch gallery slugs from the API to pre-render known pages.
// Newly created galleries are accessible via SPA routing (CloudFront SPA fallback).
export async function generateStaticParams() {
  const CATEGORIES = ['brands', 'portraits', 'events'];
  const baseUrl =
    process.env.NEXT_PUBLIC_API_URL ||
    'https://ei1btpxkmb.execute-api.us-west-2.amazonaws.com/prod';

  const results = await Promise.allSettled(
    CATEGORIES.map(async (category) => {
      const res = await fetch(`${baseUrl}/api/galleries/${category}`, {
        next: { revalidate: false },
      });
      if (!res.ok) return [{ category, gallery: '_' }];
      const json = await res.json();
      const galleries: Array<{ slug: string }> = json?.data?.galleries ?? [];
      if (galleries.length === 0) return [{ category, gallery: '_' }];
      return galleries.map((g) => ({ category, gallery: g.slug }));
    })
  );

  return results.flatMap((r) =>
    r.status === 'fulfilled' ? r.value : [{ category: 'brands', gallery: '_' }]
  );
}

interface PageProps {
  params: { category: string; gallery: string };
}

export default function GalleryPage({ params }: PageProps) {
  return <GalleryPageClient category={params.category} slug={params.gallery} />;
}
