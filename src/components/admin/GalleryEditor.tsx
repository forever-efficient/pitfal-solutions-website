'use client';

import { useState } from 'react';
import { adminGalleries } from '@/lib/api';
import { useToast } from './Toast';

interface GalleryEditorProps {
  gallery: {
    title?: string;
    description?: string;
    category?: string;
    slug?: string;
    featured?: boolean;
    passwordEnabled?: boolean;
  };
  galleryId: string;
}

export function GalleryEditor({ gallery, galleryId }: GalleryEditorProps) {
  const { showSuccess, showError } = useToast();
  const [form, setForm] = useState({
    title: gallery.title || '',
    description: gallery.description || '',
    category: gallery.category || 'brands',
    slug: gallery.slug || '',
    featured: gallery.featured || false,
  });
  const [passwordEnabled, setPasswordEnabled] = useState(!!gallery.passwordEnabled);
  const [passwordInput, setPasswordInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    try {
      const payload: Parameters<typeof adminGalleries.update>[1] = { ...form };
      if (passwordEnabled) {
        if (passwordInput) payload.password = passwordInput;
      } else {
        payload.password = '';
      }
      await adminGalleries.update(galleryId, payload);
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
      <div className="grid grid-cols-2 gap-4">
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
      </div>

      <div className="border-t border-neutral-200 pt-4 mt-4">
        <h3 className="text-sm font-medium text-neutral-900 mb-3">Security</h3>
        <label className="flex items-center gap-2 text-sm mb-3 cursor-pointer">
          <input
            type="checkbox"
            checked={passwordEnabled}
            onChange={(e) => {
              setPasswordEnabled(e.target.checked);
              if (!e.target.checked) setPasswordInput('');
            }}
            className="rounded"
          />
          Require a password to view this gallery
        </label>
        {passwordEnabled && (
          <input
            type="text"
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm"
            placeholder={gallery.passwordEnabled ? 'Enter new password to change it' : 'Enter a password'}
          />
        )}
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
