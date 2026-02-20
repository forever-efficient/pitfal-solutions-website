'use client';

import Link from 'next/link';
import { formatDate } from '@/lib/utils';

interface GalleryListProps {
    galleries: Array<{
        id: string;
        title: string;
        category: string;
        slug: string;
        imageCount: number;
        updatedAt: string;
    }>;
    onDelete: (id: string) => void;
}

export function GalleryList({ galleries, onDelete }: GalleryListProps) {
    if (galleries.length === 0) {
        return (
            <div className="text-center py-12 text-neutral-500">
                No galleries found. Create one to get started.
            </div>
        );
    }

    return (
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
                            Images
                        </th>
                        <th className="text-left px-4 py-3 font-medium text-neutral-600">
                            Last Updated
                        </th>
                        <th className="text-right px-4 py-3 font-medium text-neutral-600">
                            Actions
                        </th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                    {galleries.map((gallery) => (
                        <tr key={gallery.id} className="hover:bg-neutral-50">
                            <td className="px-4 py-3 font-medium text-neutral-900">
                                <Link
                                    href={`/admin/galleries/edit?id=${gallery.id}`}
                                    className="hover:text-primary-600 hover:underline"
                                >
                                    {gallery.title}
                                </Link>
                            </td>
                            <td className="px-4 py-3 text-neutral-600 capitalize">
                                {gallery.category}
                            </td>
                            <td className="px-4 py-3 text-neutral-600">
                                {gallery.imageCount}
                            </td>
                            <td className="px-4 py-3 text-neutral-500">
                                {formatDate(gallery.updatedAt)}
                            </td>
                            <td className="px-4 py-3 text-right">
                                <div className="flex items-center justify-end gap-2">
                                    <Link
                                        href={`/admin/galleries/edit?id=${gallery.id}`}
                                        className="text-xs px-2 py-1 rounded bg-neutral-100 text-neutral-600 hover:bg-neutral-200 transition-colors"
                                    >
                                        Edit
                                    </Link>
                                    <button
                                        onClick={() => {
                                            if (
                                                confirm(
                                                    'Are you sure you want to delete this gallery? This cannot be undone.'
                                                )
                                            ) {
                                                onDelete(gallery.id);
                                            }
                                        }}
                                        className="text-xs px-2 py-1 rounded bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
