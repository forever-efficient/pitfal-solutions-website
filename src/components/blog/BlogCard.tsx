import Link from 'next/link';
import Image from 'next/image';
import { getImageUrl } from '@/lib/utils';
import { BLOG_CATEGORIES } from '@/lib/constants';

interface BlogCardProps {
  slug: string;
  title: string;
  description: string;
  date: string;
  category: string;
  coverImage?: string;
  readingTime: number;
}

export function BlogCard({ slug, title, description, date, category, coverImage, readingTime }: BlogCardProps) {
  const categoryLabel = (BLOG_CATEGORIES as Record<string, { label: string }>)[category]?.label || category;

  return (
    <article className="group">
      <Link href={`/blog/${slug}`} className="block">
        {/* Cover image */}
        {coverImage && (
          <div className="aspect-[16/10] bg-neutral-100 rounded-xl overflow-hidden mb-4 relative">
            <Image
              src={getImageUrl(coverImage)}
              alt=""
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover group-hover:scale-105 transition-transform duration-500"
            />
          </div>
        )}

        {/* Content */}
        <div className="flex items-center gap-3 mb-3">
          <span className="text-xs font-medium uppercase tracking-wider text-primary-700 bg-primary-50 px-2.5 py-1 rounded-full">
            {categoryLabel}
          </span>
          <span className="text-xs text-neutral-400" aria-hidden="true">&middot;</span>
          <time className="text-sm text-neutral-500" dateTime={date}>
            {new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
          </time>
        </div>

        <h2 className="text-lg font-semibold text-neutral-900 group-hover:text-primary-700 transition-colors mb-2 line-clamp-2">
          {title}
        </h2>

        <p className="text-neutral-600 text-sm line-clamp-2 mb-3">{description}</p>

        <span className="text-xs text-neutral-400">{readingTime} min read</span>
      </Link>
    </article>
  );
}
