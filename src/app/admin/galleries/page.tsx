'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useToast } from '@/components/admin/Toast';
import { adminGalleries } from '@/lib/api';

interface GallerySummary {
  id: string;
  title: string;
  category: string;
  type: string;
  slug: string;
  imageCount: number;
  featured: boolean;
  createdAt: string;
}

export default function AdminGalleriesPage() {
  const { showSuccess, showError } = useToast();
  const [galleries, setGalleries] = useState<GallerySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'brands',
    type: 'client',
    slug: '',
    password: '',
    featured: false,
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadGalleries();
  }, []);

  async function loadGalleries() {
    try {
      const data = await adminGalleries.list();
      setGalleries(data.galleries);
    } catch {
      showError('Failed to load galleries');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      await adminGalleries.create({
        title: form.title,
        description: form.description || undefined,
        category: form.category,
        type: form.type,
        slug: form.slug,
        password: form.password || undefined,
        featured: form.featured,
      });
      setShowCreate(false);
      setForm({
        title: '',
        description: '',
        category: 'brands',
        type: 'client',
        slug: '',
        password: '',
        featured: false,
      });
      showSuccess('Gallery created');
      loadGalleries();
    } catch {
      showError('Failed to create gallery');
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this gallery?')) return;
    try {
      await adminGalleries.delete(id);
      setGalleries((prev) => prev.filter((g) => g.id !== id));
      showSuccess('Gallery deleted');
    } catch {
      showError('Failed to delete gallery');
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-neutral-900">Galleries</h1>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
        >
          {showCreate ? 'Cancel' : 'New Gallery'}
        </button>
      </div>

      {showCreate && (
        <form
          onSubmit={handleCreate}
          className="bg-white rounded-xl border border-neutral-200 p-6 mb-6 space-y-4"
        >
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
                required
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
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Category
              </label>
              <select
                value={form.category}
                onChange={(e) =>
                  setForm({ ...form, category: e.target.value })
                }
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
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm"
              rows={2}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Password (for client galleries)
              </label>
              <input
                type="text"
                value={form.password}
                onChange={(e) =>
                  setForm({ ...form, password: e.target.value })
                }
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm"
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.featured}
                  onChange={(e) =>
                    setForm({ ...form, featured: e.target.checked })
                  }
                  className="rounded"
                />
                Featured gallery
              </label>
            </div>
          </div>
          <button
            type="submit"
            disabled={creating}
            className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors"
          >
            {creating ? 'Creating...' : 'Create Gallery'}
          </button>
        </form>
      )}

      {loading ? (
        <div className="text-neutral-400">Loading...</div>
      ) : galleries.length === 0 ? (
        <div className="text-center py-12 text-neutral-500">
          No galleries yet. Create one to get started.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 border-b border-neutral-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-neutral-600">
                  Title
                </th>
                <th className="text-left px-4 py-3 font-medium text-neutral-600">
                  Category
                </th>
                <th className="text-left px-4 py-3 font-medium text-neutral-600">
                  Type
                </th>
                <th className="text-left px-4 py-3 font-medium text-neutral-600">
                  Images
                </th>
                <th className="text-left px-4 py-3 font-medium text-neutral-600">
                  Created
                </th>
                <th className="text-right px-4 py-3 font-medium text-neutral-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {galleries.map((gallery) => (
                <tr key={gallery.id} className="hover:bg-neutral-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/galleries/edit?id=${gallery.id}`}
                      className="text-primary-600 hover:text-primary-700 font-medium"
                    >
                      {gallery.title}
                    </Link>
                    {gallery.featured && (
                      <span className="ml-2 text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
                        Featured
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-neutral-600 capitalize">
                    {gallery.category}
                  </td>
                  <td className="px-4 py-3 text-neutral-600 capitalize">
                    {gallery.type}
                  </td>
                  <td className="px-4 py-3 text-neutral-600">
                    {gallery.imageCount}
                  </td>
                  <td className="px-4 py-3 text-neutral-500">
                    {new Date(gallery.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDelete(gallery.id)}
                      className="text-red-600 hover:text-red-700 text-sm font-medium"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
