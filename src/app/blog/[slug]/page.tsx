import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { BlogPost } from '@/components/blog';
import { getPost, getPostSlugs } from '@/lib/blog';
import { BUSINESS } from '@/lib/constants';
import { Container, Section } from '@/components/ui/Container';

interface BlogPostPageProps {
  params: { slug: string };
}

export async function generateStaticParams() {
  return getPostSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const post = await getPost(params.slug);
  if (!post) return { title: 'Not Found' };
  return {
    title: post.title,
    description: post.description,
    openGraph: {
      title: post.title,
      description: post.description,
      type: 'article',
      publishedTime: post.date,
      authors: [BUSINESS.name],
    },
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const post = await getPost(params.slug);
  if (!post) notFound();

  return (
    <Section size="lg" className="pt-32">
      <Container size="md">
        <nav className="mb-8">
          <Link href="/blog" className="text-primary-700 hover:text-primary-800 text-sm font-medium inline-flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Blog
          </Link>
        </nav>
        <BlogPost
          title={post.title}
          date={post.date}
          category={post.category}
          coverImage={post.coverImage}
          content={post.content}
        />
      </Container>
    </Section>
  );
}
