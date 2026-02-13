'use client';

import { useState } from 'react';
import { adminGalleries } from '@/lib/api';
import { useToast } from './Toast';

interface GalleryEditorProps {
  gallery: {
    title?: string;
    description?: string;
    category?: string;
    type?: string;
    slug?: string;
    featured?: boolean;
    password?: string;
  };
  galleryId: string;
}

export function GalleryEditor({ gallery, galleryId }: GalleryEditorProps) {
  const { showSuccess, showError } = useToast();
  const [form, setForm] = useState({
    title: gallery.title || '',
    description: gallery.description || '',
    category: gallery.category || 'brands',
    type: gallery.type || 'client',
    slug: gallery.slug || '',
    featured: gallery.featured || false,
    password: '',
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
      showSuccess('Gallery saved');
      setTimeout(() => setSaved(false), 3000);
    } catch {
      showError('Failed to save gallery');
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

      <div className="border-t border-neutral-200 pt-4 mt-4">
        <h3 className="text-sm font-medium text-neutral-900 mb-4">Security</h3>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">
            Access Password
          </label>
          <input
            type="text"
            value={form.password || ''}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm"
            placeholder="Set a new password to restrict access"
          />
          <p className="mt-1 text-xs text-neutral-500">
            Required for Client galleries. Leave blank to keep the current password.
          </p>
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
