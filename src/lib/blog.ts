import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { remark } from 'remark';
import html from 'remark-html';

const BLOG_DIR = path.join(process.cwd(), 'content/blog');

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string;
  category: string;
  featured: boolean;
  content: string; // HTML rendered from markdown
}

export interface BlogPostMeta {
  slug: string;
  title: string;
  description: string;
  date: string;
  category: string;
  featured: boolean;
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
      const { data } = matter(raw);
      return {
        slug,
        title: data.title || slug,
        description: data.description || '',
        date: data.date || '',
        category: data.category || 'general',
        featured: data.featured || false,
      };
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function getPost(slug: string): Promise<BlogPost | null> {
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
    category: data.category || 'general',
    featured: data.featured || false,
    content: result.toString(),
  };
}
