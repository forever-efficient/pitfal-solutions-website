import Link from 'next/link';

interface BlogCardProps {
  slug: string;
  title: string;
  description: string;
  date: string;
  category: string;
}

export function BlogCard({ slug, title, description, date, category }: BlogCardProps) {
  return (
    <article className="group">
      <Link href={`/blog/${slug}`} className="block">
        <div className="border border-neutral-200 rounded-lg p-6 hover:border-primary-300 hover:shadow-md transition-all duration-200">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-xs font-medium uppercase tracking-wider text-primary-600 bg-primary-50 px-2.5 py-1 rounded-full">
              {category}
            </span>
            <time className="text-sm text-neutral-500" dateTime={date}>
              {new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </time>
          </div>
          <h2 className="text-xl font-semibold text-neutral-900 group-hover:text-primary-600 transition-colors mb-2">
            {title}
          </h2>
          <p className="text-neutral-600 line-clamp-2">{description}</p>
        </div>
      </Link>
    </article>
  );
}
