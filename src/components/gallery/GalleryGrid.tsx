import Link from 'next/link';
import { ImageCard } from './ImageCard';

interface Gallery {
  id: string;
  slug: string;
  title: string;
  thumbnail: string;
  imageCount: number;
}

interface GalleryGridProps {
  galleries: Gallery[];
  category: string;
}

export function GalleryGrid({ galleries, category }: GalleryGridProps) {
  if (galleries.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-neutral-500">No galleries found in this category.</p>
      </div>
    );
  }

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
      {galleries.map((gallery) => (
        <Link
          key={gallery.id}
          href={`/portfolio/${category}/${gallery.slug}`}
          className="group block"
        >
          <ImageCard
            title={gallery.title}
            imageCount={gallery.imageCount}
          />
        </Link>
      ))}
    </div>
  );
}
