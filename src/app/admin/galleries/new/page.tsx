'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { adminGalleries, ApiError } from '@/lib/api';
import { useToast } from '@/components/admin/Toast';
import { PORTFOLIO_CATEGORIES } from '@/lib/constants';

export default function NewGalleryPage() {
    const router = useRouter();
    const { showError } = useToast();
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState<{
        title: string;
        category: string;
        type: string;
        slug: string;
        password?: string;
    }>({
        title: '',
        category: 'brands',
        type: 'client',
        slug: '',
        password: '',
    });

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);

        try {
            const { gallery } = await adminGalleries.create(form);
            router.push(`/admin/galleries/edit?id=${gallery.id}`);
        } catch (err) {
            if (err instanceof ApiError) {
                showError(err.message);
            } else {
                showError('Failed to create gallery');
            }
            setLoading(false);
        }
    }

    return (
        <div className="max-w-2xl mx-auto">
            <div className="mb-6">
                <Link
                    href="/admin/galleries"
                    className="text-sm text-neutral-500 hover:text-neutral-900"
                >
                    ← Back to Galleries
                </Link>
                <h1 className="text-2xl font-bold text-neutral-900 mt-2">
                    New Gallery
                </h1>
            </div>

            <form
                onSubmit={handleSubmit}
                className="bg-white rounded-xl border border-neutral-200 p-6 space-y-6"
            >
                <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                        Title
                    </label>
                    <input
                        type="text"
                        value={form.title}
                        onChange={(e) => setForm({ ...form, title: e.target.value })}
                        className="w-full px-3 py-2 border border-neutral-300 rounded-lg outline-none focus:ring-2 focus:ring-primary-500"
                        required
                        autoFocus
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">
                            Category
                        </label>
                        <select
                            value={form.category}
                            onChange={(e) => setForm({ ...form, category: e.target.value })}
                            className="w-full px-3 py-2 border border-neutral-300 rounded-lg outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                        >
                            {Object.entries(PORTFOLIO_CATEGORIES).map(([key, info]) => (
                                <option key={key} value={key}>
                                    {info.title}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">
                            Type
                        </label>
                        <select
                            value={form.type}
                            onChange={(e) => setForm({ ...form, type: e.target.value })}
                            className="w-full px-3 py-2 border border-neutral-300 rounded-lg outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                        >
                            <option value="client">Client Gallery (Private)</option>
                            <option value="portfolio">Portfolio (Public)</option>
                        </select>
                    </div>
                </div>

                {form.type === 'client' && (
                    <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">
                            Access Password
                        </label>
                        <input
                            type="text"
                            value={form.password}
                            onChange={(e) => setForm({ ...form, password: e.target.value })}
                            className="w-full px-3 py-2 border border-neutral-300 rounded-lg outline-none focus:ring-2 focus:ring-primary-500"
                            placeholder="Required for client galleries"
                            required
                        />
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                        Slug (URL path)
                    </label>
                    <input
                        type="text"
                        value={form.slug}
                        onChange={(e) => setForm({ ...form, slug: e.target.value })}
                        className="w-full px-3 py-2 border border-neutral-300 rounded-lg outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="e.g. smith-wedding"
                        required
                    />
                    <p className="mt-1 text-xs text-neutral-500">
                        Must be unique and URL-friendly (letters, numbers, hyphens).
                    </p>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-neutral-900 text-white py-2 px-4 rounded-lg font-medium hover:bg-neutral-800 disabled:opacity-50 transition-colors"
                >
                    {loading ? 'Creating...' : 'Create Gallery'}
                </button>
            </form>
        </div>
    );
}
