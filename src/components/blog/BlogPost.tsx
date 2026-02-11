interface BlogPostProps {
  title: string;
  date: string;
  category: string;
  content: string;
}

export function BlogPost({ title, date, category, content }: BlogPostProps) {
  return (
    <article className="max-w-3xl mx-auto">
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-sm font-medium uppercase tracking-wider text-primary-600 bg-primary-50 px-3 py-1 rounded-full">
            {category}
          </span>
          <time className="text-sm text-neutral-500" dateTime={date}>
            {new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </time>
        </div>
        <h1 className="font-display text-4xl md:text-5xl font-bold text-neutral-900">{title}</h1>
      </header>
      <div
        className="prose prose-lg prose-neutral max-w-none prose-headings:font-display prose-a:text-primary-600 prose-a:no-underline hover:prose-a:underline"
        dangerouslySetInnerHTML={{ __html: content }}
      />
    </article>
  );
}
