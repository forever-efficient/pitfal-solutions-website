import type { Metadata } from 'next';
import { BlogCategoryFilter } from '@/components/blog';
import { getAllPosts, getCategories } from '@/lib/blog';
import { PAGE_META } from '@/lib/constants';
import { Container, Section } from '@/components/ui/Container';

export const metadata: Metadata = {
  title: PAGE_META.blog.title,
  description: PAGE_META.blog.description,
};

export default function BlogPage() {
  const posts = getAllPosts();
  const categories = getCategories();

  return (
    <>
      {/* Hero */}
      <Section size="lg" className="pt-32 bg-neutral-50">
        <Container>
          <div className="max-w-3xl">
            <p className="text-primary-700 font-medium text-sm tracking-widest uppercase mb-3">
              Blog
            </p>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-neutral-900 mb-6 font-display">
              From Behind the Lens
            </h1>
            <p className="text-xl text-neutral-600">
              Tips, session guides, and stories from the field. Everything you need to prepare for your shoot and get inspired.
            </p>
          </div>
        </Container>
      </Section>

      {/* Posts */}
      <Section size="lg" background="white">
        <Container>
          {posts.length > 0 ? (
            <BlogCategoryFilter posts={posts} categories={categories} />
          ) : (
            <p className="text-center text-neutral-500 py-12">No posts yet. Check back soon!</p>
          )}
        </Container>
      </Section>
    </>
  );
}
