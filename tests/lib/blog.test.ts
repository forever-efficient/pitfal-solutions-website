import fs from 'fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getAllPosts,
  getCategories,
  getPost,
  getPostSlugs,
} from '@/lib/blog';

describe('lib/blog', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns blog slugs from content directory', () => {
    const slugs = getPostSlugs();
    expect(slugs.length).toBeGreaterThan(0);
    expect(slugs).toContain('style-guide');
  });

  it('returns sorted posts with computed reading time', () => {
    const posts = getAllPosts();

    expect(posts.length).toBeGreaterThan(0);
    expect(posts[0]).toMatchObject({
      slug: expect.any(String),
      title: expect.any(String),
      description: expect.any(String),
      category: expect.any(String),
      readingTime: expect.any(Number),
    });
    expect(posts[0]!.readingTime).toBeGreaterThanOrEqual(1);

    for (let i = 1; i < posts.length; i++) {
      const prev = new Date(posts[i - 1]!.date).getTime();
      const next = new Date(posts[i]!.date).getTime();
      expect(prev).toBeGreaterThanOrEqual(next);
    }
  });

  it('builds category counts including all posts bucket', () => {
    const categories = getCategories();
    const posts = getAllPosts();

    const all = categories.find((cat) => cat.slug === 'all');
    expect(all?.count).toBe(posts.length);
    expect(categories.some((cat) => cat.slug === 'guides')).toBe(true);
  });

  it('returns parsed post html for known slug', async () => {
    const post = await getPost('style-guide');

    expect(post).not.toBeNull();
    expect(post?.slug).toBe('style-guide');
    expect(post?.content).toContain('<');
    expect(post?.title.length).toBeGreaterThan(0);
  });

  it('returns null for unknown slug', async () => {
    const post = await getPost('does-not-exist');
    expect(post).toBeNull();
  });

  it('returns empty results when blog directory is unavailable', async () => {
    vi.spyOn(fs, 'existsSync').mockReturnValue(false);

    expect(getPostSlugs()).toEqual([]);
    expect(await getPost('style-guide')).toBeNull();
  });
});
