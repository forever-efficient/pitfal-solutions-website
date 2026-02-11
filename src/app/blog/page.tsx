import type { Metadata } from 'next';
import { BlogCard } from '@/components/blog';
import { getAllPosts } from '@/lib/blog';
import { PAGE_META } from '@/lib/constants';

export const metadata: Metadata = {
  title: PAGE_META.blog.title,
  description: PAGE_META.blog.description,
};

export default function BlogPage() {
  const posts = getAllPosts();

  return (
    <div className="py-20 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="font-display text-4xl md:text-5xl font-bold text-neutral-900 mb-4">Blog</h1>
          <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
            Tips, guides, and stories from behind the lens.
          </p>
        </div>
        {posts.length > 0 ? (
          <div className="grid gap-6">
            {posts.map((post) => (
              <BlogCard key={post.slug} {...post} />
            ))}
          </div>
        ) : (
          <p className="text-center text-neutral-500">No posts yet. Check back soon!</p>
        )}
      </div>
    </div>
  );
}
