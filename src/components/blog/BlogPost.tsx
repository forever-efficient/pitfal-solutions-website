import Image from 'next/image';
import { getImageUrl } from '@/lib/utils';
import { BLOG_CATEGORIES } from '@/lib/constants';

interface BlogPostProps {
  title: string;
  date: string;
  category: string;
  coverImage?: string;
  content: string;
}

export function BlogPost({ title, date, category, coverImage, content }: BlogPostProps) {
  const categoryLabel = (BLOG_CATEGORIES as Record<string, { label: string }>)[category]?.label || category;

  return (
    <article className="max-w-3xl mx-auto">
      {/* Header */}
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-sm font-medium uppercase tracking-wider text-primary-700 bg-primary-50 px-3 py-1 rounded-full">
            {categoryLabel}
          </span>
          <time className="text-sm text-neutral-500" dateTime={date}>
            {new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </time>
        </div>
        <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-neutral-900 leading-tight">{title}</h1>
      </header>

      {/* Cover image */}
      {coverImage && (
        <div className="aspect-[21/9] bg-neutral-100 rounded-2xl overflow-hidden mb-10 relative">
          <Image
            src={getImageUrl(coverImage)}
            alt=""
            fill
            sizes="(max-width: 768px) 100vw, 768px"
            className="object-cover"
            priority
          />
        </div>
      )}

      {/* Content */}
      <div
        className="prose prose-lg prose-neutral max-w-none prose-headings:font-display prose-a:text-primary-700 prose-a:no-underline hover:prose-a:underline prose-img:rounded-xl"
        dangerouslySetInnerHTML={{ __html: content }}
      />
    </article>
  );
}
