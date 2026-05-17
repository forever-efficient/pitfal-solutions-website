'use client';

import { useState } from 'react';
import { adminGalleries } from '@/lib/api';
import {
  PORTFOLIO_CATEGORIES,
  PORTFOLIO_ROW_SLUGS,
  FEATURED_CATEGORY_SLUGS,
} from '@/lib/constants';
import { useToast } from './Toast';

interface GalleryEditorProps {
  gallery: {
    title?: string;
    description?: string;
    categories?: string[];
    slug?: string;
    featuredIn?: string[];
    passwordEnabled?: boolean;
    allowDownloads?: boolean;
  };
  galleryId: string;
}

export function GalleryEditor({ gallery, galleryId }: GalleryEditorProps) {
  const { showSuccess, showError } = useToast();
  const [form, setForm] = useState({
    title: gallery.title || '',
    description: gallery.description || '',
    categories: gallery.categories && gallery.categories.length > 0 ? gallery.categories : [],
    slug: gallery.slug || '',
    featuredIn: gallery.featuredIn || [],
  });
  const [passwordEnabled, setPasswordEnabled] = useState(!!gallery.passwordEnabled);
  const [passwordInput, setPasswordInput] = useState('');
  const [allowDownloads, setAllowDownloads] = useState(!!gallery.allowDownloads);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const noCategorySelected = form.categories.length === 0;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (noCategorySelected) {
      showError('Select at least one category');
      return;
    }
    setSaving(true);
    setSaved(false);
    try {
      const payload: Parameters<typeof adminGalleries.update>[1] = { ...form };
      if (passwordEnabled && passwordInput) {
        payload.password = passwordInput;
      } else if (!passwordEnabled) {
        payload.password = '';
      }
      payload.allowDownloads = allowDownloads;
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
        <label className="block text-sm font-medium text-neutral-700 mb-2">
          Categories <span className="text-neutral-500 font-normal">(select one or more)</span>
        </label>
        <div className="grid grid-cols-2 gap-2">
          {PORTFOLIO_ROW_SLUGS.map((key) => {
            const info = PORTFOLIO_CATEGORIES[key];
            return (
              <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.categories.includes(key)}
                  onChange={(e) => {
                    const next = e.target.checked
                      ? [...form.categories, key]
                      : form.categories.filter(k => k !== key);
                    setForm({ ...form, categories: next });
                  }}
                  className="rounded"
                />
                {info.title}
              </label>
            );
          })}
        </div>
        {noCategorySelected && (
          <p className="mt-2 text-xs text-red-600">
            At least one category is required.
          </p>
        )}
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
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm mb-3"
            placeholder={gallery.passwordEnabled ? 'Enter new password to change it' : 'Enter a password'}
          />
        )}
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={allowDownloads}
            onChange={(e) => setAllowDownloads(e.target.checked)}
            className="rounded"
          />
          Allow Downloads
        </label>
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
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-2">
          Featured In
        </label>
        <div className="grid grid-cols-2 gap-2">
          {FEATURED_CATEGORY_SLUGS.map((key) => {
            const info = PORTFOLIO_CATEGORIES[key];
            return (
              <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.featuredIn.includes(key)}
                  onChange={(e) => {
                    const next = e.target.checked
                      ? [...form.featuredIn, key]
                      : form.featuredIn.filter(k => k !== key);
                    setForm({ ...form, featuredIn: next });
                  }}
                  className="rounded"
                />
                {info.title}
              </label>
            );
          })}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving || noCategorySelected}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
        {saved && <span className="text-sm text-green-600">Saved!</span>}
      </div>
    </form>
  );
}
