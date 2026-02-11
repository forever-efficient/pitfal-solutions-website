'use client';

import { useState } from 'react';
import { adminGalleries } from '@/lib/api';

interface GalleryEditorProps {
  gallery: Record<string, unknown>;
  galleryId: string;
}

export function GalleryEditor({ gallery, galleryId }: GalleryEditorProps) {
  const [form, setForm] = useState({
    title: (gallery.title as string) || '',
    description: (gallery.description as string) || '',
    category: (gallery.category as string) || 'brands',
    type: (gallery.type as string) || 'client',
    slug: (gallery.slug as string) || '',
    featured: (gallery.featured as boolean) || false,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    try {
      await adminGalleries.update(galleryId, form);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      // Save failed silently
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSave}
      className="bg-white rounded-xl border border-neutral-200 p-6 space-y-4"
    >
      <h2 className="text-lg font-semibold text-neutral-900">
        Gallery Details
      </h2>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">
            Title
          </label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">
            Slug
          </label>
          <input
            type="text"
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">
            Category
          </label>
          <select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm"
          >
            <option value="brands">Brands</option>
            <option value="portraits">Portraits</option>
            <option value="events">Events</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">
            Type
          </label>
          <select
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm"
          >
            <option value="portfolio">Portfolio</option>
            <option value="client">Client</option>
          </select>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-1">
          Description
        </label>
        <textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm"
          rows={3}
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.featured}
          onChange={(e) => setForm({ ...form, featured: e.target.checked })}
          className="rounded"
        />
        Featured gallery
      </label>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
        {saved && <span className="text-sm text-green-600">Saved!</span>}
      </div>
    </form>
  );
}
