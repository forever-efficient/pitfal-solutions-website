import Link from 'next/link';
import { ImageCard } from './ImageCard';

interface Gallery {
  id: string;
  slug: string;
  title: string;
  thumbnail: string;
  imageCount: number;
  /** Optional description for alt text */
  description?: string;
}

interface GalleryGridProps {
  galleries: Gallery[];
  category: string;
}

export function GalleryGrid({ galleries, category }: GalleryGridProps) {
  if (galleries.length === 0) {
    return (
      <div className="text-center py-12" role="status">
        <p className="text-neutral-500">No galleries found in this category.</p>
      </div>
    );
  }

  return (
    <div
      className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8"
      role="list"
      aria-label={`${category} galleries`}
    >
      {galleries.map((gallery) => (
        <Link
          key={gallery.id}
          href={`/portfolio/viewer?category=${category}&slug=${gallery.slug}`}
          className="group block"
          role="listitem"
          aria-label={`View ${gallery.title} gallery with ${gallery.imageCount} images`}
        >
          <ImageCard
            title={gallery.title}
            imageCount={gallery.imageCount}
            imageSrc={gallery.thumbnail}
            imageAlt={gallery.description || `${gallery.title} - ${category} photography`}
          />
        </Link>
      ))}
    </div>
  );
}
