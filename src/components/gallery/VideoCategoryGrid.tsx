'use client';

import Link from 'next/link';
import { EyeIcon } from '@/components/icons';

interface VideoGallery {
  id: string;
  slug: string;
  title: string;
  previewVideo: string | null;
  poster: string | null;
  videoCount: number;
  description?: string;
}

interface VideoCategoryGridProps {
  galleries: VideoGallery[];
  category: string;
  fallbackPoster?: string;
}

export function VideoCategoryGrid({ galleries, category, fallbackPoster }: VideoCategoryGridProps) {
  if (galleries.length === 0) {
    return (
      <div className="text-center py-12" role="status">
        <p className="text-neutral-500">No video galleries found in this category yet.</p>
      </div>
    );
  }

  return (
    <div
      className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8"
      role="list"
      aria-label={`${category} galleries`}
    >
      {galleries.map((gallery) => {
        const poster = gallery.poster || fallbackPoster;
        return (
          <Link
            key={gallery.id}
            href={`/portfolio/${category}/${gallery.slug}/`}
            className="group block"
            role="listitem"
            aria-label={`View ${gallery.title} video gallery with ${gallery.videoCount} videos`}
          >
            <article
              className="aspect-[4/3] bg-neutral-200 rounded-xl overflow-hidden relative"
              aria-label={`Gallery: ${gallery.title}, ${gallery.videoCount} videos`}
            >
              {gallery.previewVideo ? (
                <video
                  src={gallery.previewVideo}
                  poster={poster || undefined}
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  className="absolute inset-0 w-full h-full object-cover"
                  aria-label={gallery.description || `${gallery.title} preview`}
                />
              ) : poster ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={poster}
                  alt={gallery.description || `${gallery.title} preview`}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <div
                  className="absolute inset-0 bg-gradient-to-br from-neutral-300 to-neutral-400"
                  role="img"
                  aria-label={`${gallery.title} preview`}
                />
              )}

              <div
                className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-300"
                aria-hidden="true"
              />

              <div className="absolute inset-x-0 bottom-0 p-4 flex flex-col justify-end bg-gradient-to-t from-black/60 to-transparent">
                <h3 className="text-white font-semibold text-lg">{gallery.title}</h3>
                <p className="text-white/80 text-sm">
                  {gallery.videoCount} {gallery.videoCount === 1 ? 'video' : 'videos'}
                </p>
              </div>

              <div
                className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                aria-hidden="true"
              >
                <EyeIcon size={20} className="text-neutral-900" />
              </div>
            </article>
          </Link>
        );
      })}
    </div>
  );
}
