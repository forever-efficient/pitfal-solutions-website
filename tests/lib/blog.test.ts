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

  it('handles missing featured property by defaulting to false', () => {
    // Create a temporary post file without featured property
    const testPostPath = '/test/blog/no-featured.mdx';
    const testPostContent = `---
title: No Featured Post
description: Test post without featured
date: 2024-01-01
category: guides
---
Test content`;

    vi.spyOn(fs, 'existsSync').mockReturnValue(true);
    vi.spyOn(fs, 'readdirSync').mockReturnValue(['no-featured.mdx']);
    vi.spyOn(fs, 'readFileSync').mockReturnValue(testPostContent);

    const posts = getAllPosts();
    expect(posts[0]?.featured).toBe(false);
  });

  it('handles missing coverImage property by setting undefined', () => {
    const testPostPath = '/test/blog/no-image.mdx';
    const testPostContent = `---
title: Post No Image
description: Test post without cover image
date: 2024-01-01
category: guides
featured: true
---
Test content`;

    vi.spyOn(fs, 'existsSync').mockReturnValue(true);
    vi.spyOn(fs, 'readdirSync').mockReturnValue(['no-image.mdx']);
    vi.spyOn(fs, 'readFileSync').mockReturnValue(testPostContent);

    const posts = getAllPosts();
    expect(posts[0]?.coverImage).toBeUndefined();
  });

  it('defaults to slug when post title is missing', () => {
    const testPostContent = `---
description: No title post
date: 2024-01-01
---
Test content`;

    vi.spyOn(fs, 'existsSync').mockReturnValue(true);
    vi.spyOn(fs, 'readdirSync').mockReturnValue(['no-title.mdx']);
    vi.spyOn(fs, 'readFileSync').mockReturnValue(testPostContent);

    const posts = getAllPosts();
    expect(posts[0]?.title).toBe('no-title');
  });

  it('defaults empty string for missing description', () => {
    const testPostContent = `---
title: No Description Post
date: 2024-01-01
---
Test content`;

    vi.spyOn(fs, 'existsSync').mockReturnValue(true);
    vi.spyOn(fs, 'readdirSync').mockReturnValue(['no-desc.mdx']);
    vi.spyOn(fs, 'readFileSync').mockReturnValue(testPostContent);

    const posts = getAllPosts();
    expect(posts[0]?.description).toBe('');
  });

  it('getPost defaults category to guides when missing', async () => {
    const testPostContent = `---
title: No Category Post
description: Missing category
date: 2024-01-01
---
Test content`;

    vi.spyOn(fs, 'existsSync').mockReturnValue(true);
    vi.spyOn(fs, 'readdirSync').mockReturnValue(['no-cat.mdx']);
    vi.spyOn(fs, 'readFileSync').mockReturnValue(testPostContent);

    const post = await getPost('no-cat');
    expect(post?.category).toBe('guides');
  });

  it('getPost defaults featured to false when missing', async () => {
    const testPostContent = `---
title: Missing Featured
description: Test
date: 2024-01-01
category: guides
---
Test content`;

    vi.spyOn(fs, 'existsSync').mockReturnValue(true);
    vi.spyOn(fs, 'readdirSync').mockReturnValue(['missing-featured.mdx']);
    vi.spyOn(fs, 'readFileSync').mockReturnValue(testPostContent);

    const post = await getPost('missing-featured');
    expect(post?.featured).toBe(false);
  });

  it('getPost defaults coverImage to undefined when missing', async () => {
    const testPostContent = `---
title: Missing Cover
description: Test
date: 2024-01-01
featured: true
---
Test content`;

    vi.spyOn(fs, 'existsSync').mockReturnValue(true);
    vi.spyOn(fs, 'readdirSync').mockReturnValue(['missing-cover.mdx']);
    vi.spyOn(fs, 'readFileSync').mockReturnValue(testPostContent);

    const post = await getPost('missing-cover');
    expect(post?.coverImage).toBeUndefined();
  });

  it('getPost defaults date to empty string when missing', async () => {
    const testPostContent = `---
title: Missing Date
description: Test
---
Test content`;

    vi.spyOn(fs, 'existsSync').mockReturnValue(true);
    vi.spyOn(fs, 'readdirSync').mockReturnValue(['missing-date.mdx']);
    vi.spyOn(fs, 'readFileSync').mockReturnValue(testPostContent);

    const post = await getPost('missing-date');
    expect(post?.date).toBe('');
  });
});
