import fs from 'fs';
import path from 'path';

const GALLERIES_DIR = path.join(process.cwd(), 'content/galleries');

export interface GalleryManifest {
  slug: string;
  title: string;
  description: string;
  date: string;
  featured?: boolean;
  coverImage: string;
  images: GalleryImageEntry[];
}

export interface GalleryImageEntry {
  key: string;
  alt?: string;
}

export function getGalleriesByCategory(category: string): GalleryManifest[] {
  const dir = path.join(GALLERIES_DIR, category);
  if (!fs.existsSync(dir)) return [];

  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf-8')) as GalleryManifest)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function getGallery(category: string, slug: string): GalleryManifest | null {
  const file = path.join(GALLERIES_DIR, category, `${slug}.json`);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf-8')) as GalleryManifest;
}

export function getAllGallerySlugs(): { category: string; gallery: string }[] {
  if (!fs.existsSync(GALLERIES_DIR)) return [];

  const categories = fs
    .readdirSync(GALLERIES_DIR)
    .filter((f) => fs.statSync(path.join(GALLERIES_DIR, f)).isDirectory());

  return categories.flatMap((cat) =>
    getGalleriesByCategory(cat).map((g) => ({ category: cat, gallery: g.slug }))
  );
}

export function getCategoryCounts(): Record<string, number> {
  if (!fs.existsSync(GALLERIES_DIR)) return {};

  const categories = fs
    .readdirSync(GALLERIES_DIR)
    .filter((f) => fs.statSync(path.join(GALLERIES_DIR, f)).isDirectory());

  const counts: Record<string, number> = {};
  for (const cat of categories) {
    counts[cat] = getGalleriesByCategory(cat).length;
  }
  return counts;
}

export function getFeaturedGalleries(): (GalleryManifest & { category: string })[] {
  if (!fs.existsSync(GALLERIES_DIR)) return [];

  const categories = fs
    .readdirSync(GALLERIES_DIR)
    .filter((f) => fs.statSync(path.join(GALLERIES_DIR, f)).isDirectory());

  return categories
    .flatMap((cat) =>
      getGalleriesByCategory(cat)
        .filter((g) => g.featured)
        .map((g) => ({ ...g, category: cat }))
    )
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 3);
}
