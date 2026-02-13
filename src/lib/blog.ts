import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { remark } from 'remark';
import html from 'remark-html';
import { BLOG_CATEGORIES } from '@/lib/constants';

const BLOG_DIR = path.join(process.cwd(), 'content/blog');

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string;
  category: string;
  featured: boolean;
  coverImage?: string;
  content: string; // HTML rendered from markdown
}

export interface BlogPostMeta {
  slug: string;
  title: string;
  description: string;
  date: string;
  category: string;
  featured: boolean;
  coverImage?: string;
  readingTime: number;
}

function estimateReadingTime(content: string): number {
  const words = content.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}

export function getPostSlugs(): string[] {
  if (!fs.existsSync(BLOG_DIR)) return [];
  return fs.readdirSync(BLOG_DIR)
    .filter(f => f.endsWith('.mdx') || f.endsWith('.md'))
    .map(f => f.replace(/\.mdx?$/, ''));
}

export function getAllPosts(): BlogPostMeta[] {
  return getPostSlugs()
    .map(slug => {
      const file = fs.readdirSync(BLOG_DIR).find(f => f.replace(/\.mdx?$/, '') === slug)!;
      const raw = fs.readFileSync(path.join(BLOG_DIR, file), 'utf-8');
      const { data, content } = matter(raw);
      return {
        slug,
        title: data.title || slug,
        description: data.description || '',
        date: data.date || '',
        category: data.category || 'guides',
        featured: data.featured || false,
        coverImage: data.coverImage || undefined,
        readingTime: estimateReadingTime(content),
      };
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function getCategories(): { slug: string; label: string; count: number }[] {
  const posts = getAllPosts();
  const categorySlugs = Object.keys(BLOG_CATEGORIES) as Array<keyof typeof BLOG_CATEGORIES>;

  return categorySlugs.map(slug => ({
    slug: BLOG_CATEGORIES[slug].slug,
    label: BLOG_CATEGORIES[slug].label,
    count: slug === 'all' ? posts.length : posts.filter(p => p.category === slug).length,
  }));
}

export async function getPost(slug: string): Promise<BlogPost | null> {
  if (!fs.existsSync(BLOG_DIR)) return null;
  const file = fs.readdirSync(BLOG_DIR).find(f => f.replace(/\.mdx?$/, '') === slug);
  if (!file) return null;

  const raw = fs.readFileSync(path.join(BLOG_DIR, file), 'utf-8');
  const { data, content: rawContent } = matter(raw);

  const result = await remark().use(html).process(rawContent);

  return {
    slug,
    title: data.title || slug,
    description: data.description || '',
    date: data.date || '',
    category: data.category || 'guides',
    featured: data.featured || false,
    coverImage: data.coverImage || undefined,
    content: result.toString(),
  };
}
