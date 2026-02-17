import fs from 'fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getAllGallerySlugs,
  getCategoryCounts,
  getFeaturedGalleries,
  getGalleriesByCategory,
  getGallery,
} from '@/lib/galleries';

describe('lib/galleries', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns galleries for a category in descending date order', () => {
    const galleries = getGalleriesByCategory('events');
    expect(galleries.length).toBeGreaterThan(0);

    for (let i = 1; i < galleries.length; i++) {
      const prev = new Date(galleries[i - 1]!.date).getTime();
      const next = new Date(galleries[i]!.date).getTime();
      expect(prev).toBeGreaterThanOrEqual(next);
    }
  });

  it('returns specific gallery by category and slug', () => {
    const gallery = getGallery('events', 'johnson-wedding');
    expect(gallery).not.toBeNull();
    expect(gallery?.slug).toBe('johnson-wedding');
    expect(gallery?.images.length).toBeGreaterThan(0);
  });

  it('returns null for missing gallery', () => {
    expect(getGallery('events', 'missing-gallery')).toBeNull();
  });

  it('returns all gallery slugs and category counts', () => {
    const slugs = getAllGallerySlugs();
    const counts = getCategoryCounts();

    expect(slugs.length).toBeGreaterThan(0);
    expect(slugs.some((s) => s.category === 'events')).toBe(true);
    expect(Object.keys(counts).length).toBeGreaterThan(0);
    expect(counts.events).toBeGreaterThan(0);
  });

  it('returns featured galleries with category and limit applied', () => {
    const featured = getFeaturedGalleries();

    expect(featured.length).toBeLessThanOrEqual(3);
    for (const gallery of featured) {
      expect(gallery.featured).toBe(true);
      expect(gallery.category).toEqual(expect.any(String));
    }
  });

  it('returns empty fallbacks when galleries directory is unavailable', () => {
    vi.spyOn(fs, 'existsSync').mockReturnValue(false);

    expect(getGalleriesByCategory('events')).toEqual([]);
    expect(getAllGallerySlugs()).toEqual([]);
    expect(getCategoryCounts()).toEqual({});
    expect(getFeaturedGalleries()).toEqual([]);
  });
});
