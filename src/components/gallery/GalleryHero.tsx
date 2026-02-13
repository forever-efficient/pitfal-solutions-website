import Image from 'next/image';
import { getImageUrl } from '@/lib/utils';

interface GalleryHeroProps {
  imageKey: string;
  title: string;
  alt?: string;
}

export function GalleryHero({ imageKey, title, alt }: GalleryHeroProps) {
  return (
    <div className="aspect-[21/9] sm:aspect-[3/1] lg:aspect-[3.5/1] bg-neutral-200 rounded-2xl overflow-hidden relative">
      <Image
        src={getImageUrl(imageKey)}
        alt={alt || `${title} hero image`}
        fill
        sizes="100vw"
        className="object-cover"
        priority
      />
      <div
        className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"
        aria-hidden="true"
      />
    </div>
  );
}
