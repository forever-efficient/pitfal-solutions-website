import { EyeIcon } from '@/components/icons';

interface ImageCardProps {
  title: string;
  imageCount?: number;
  showOverlay?: boolean;
  /** Optional image URL - if not provided, shows gradient placeholder */
  imageSrc?: string;
  /** Optional alt text - defaults to title if not provided */
  imageAlt?: string;
}

export function ImageCard({
  title,
  imageCount,
  showOverlay = true,
  imageSrc,
  imageAlt,
}: ImageCardProps) {
  const altText = imageAlt || `${title} gallery preview`;

  return (
    <article
      className="aspect-[4/3] bg-neutral-200 rounded-xl overflow-hidden relative"
      aria-label={`Gallery: ${title}${imageCount !== undefined ? `, ${imageCount} images` : ''}`}
    >
      {/* Image or gradient placeholder */}
      {imageSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageSrc}
          alt={altText}
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div
          className="absolute inset-0 bg-gradient-to-br from-neutral-300 to-neutral-400"
          role="img"
          aria-label={altText}
        />
      )}

      {/* Hover overlay */}
      {showOverlay && (
        <div
          className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-300"
          aria-hidden="true"
        />
      )}

      {/* Content - always visible with gradient, enhanced on hover */}
      <div className="absolute inset-x-0 bottom-0 p-4 flex flex-col justify-end bg-gradient-to-t from-black/60 to-transparent">
        <h3 className="text-white font-semibold text-lg">{title}</h3>
        {imageCount !== undefined && (
          <p className="text-white/80 text-sm">{imageCount} images</p>
        )}
      </div>

      {/* View icon */}
      <div
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        aria-hidden="true"
      >
        <EyeIcon size={20} className="text-neutral-900" />
      </div>
    </article>
  );
}
