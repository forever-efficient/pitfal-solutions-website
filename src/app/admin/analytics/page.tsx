'use client';

import { useState, useEffect } from 'react';
import { StatCard } from '@/components/admin/StatCard';
import { useToast } from '@/components/admin/Toast';
import { adminAnalytics } from '@/lib/api';
import type { AnalyticsGallery } from '@/lib/api';

type SortField = 'title' | 'category' | 'imageCount' | 'viewCount' | 'downloadCount';

export default function AnalyticsPage() {
  const { showError } = useToast();
  const [loading, setLoading] = useState(true);
  const [totalViews, setTotalViews] = useState(0);
  const [totalDownloads, setTotalDownloads] = useState(0);
  const [galleries, setGalleries] = useState<AnalyticsGallery[]>([]);
  const [sortField, setSortField] = useState<SortField>('viewCount');
  const [sortAsc, setSortAsc] = useState(false);

  useEffect(() => {
    adminAnalytics
      .get()
      .then((data) => {
        setTotalViews(data.totalViews);
        setTotalDownloads(data.totalDownloads);
        setGalleries(data.galleries);
      })
      .catch(() => {
        showError('Failed to load analytics');
      })
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(field === 'title' || field === 'category');
    }
  }

  const sorted = [...galleries].sort((a, b) => {
    const mult = sortAsc ? 1 : -1;
    const av = a[sortField];
    const bv = b[sortField];
    if (typeof av === 'string' && typeof bv === 'string') {
      return mult * av.localeCompare(bv);
    }
    return mult * ((av as number) - (bv as number));
  });

  const sortIcon = (field: SortField) => {
    if (sortField !== field) return '';
    return sortAsc ? ' \u2191' : ' \u2193';
  };

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-neutral-900">Client Gallery Analytics</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard label="Total Views" value={loading ? '...' : totalViews} />
        <StatCard label="Total Downloads" value={loading ? '...' : totalDownloads} />
      </div>

      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50">
                {([
                  ['title', 'Gallery Name'],
                  ['category', 'Category'],
                  ['imageCount', 'Images'],
                  ['viewCount', 'Views'],
                  ['downloadCount', 'Downloads'],
                ] as [SortField, string][]).map(([field, label]) => (
                  <th
                    key={field}
                    onClick={() => handleSort(field)}
                    className="px-4 py-3 text-left font-medium text-neutral-600 cursor-pointer hover:text-neutral-900 select-none"
                  >
                    {label}{sortIcon(field)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-neutral-500">
                    Loading...
                  </td>
                </tr>
              ) : sorted.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-neutral-500">
                    No client galleries found
                  </td>
                </tr>
              ) : (
                sorted.map((g) => (
                  <tr key={g.id} className="border-b border-neutral-100 hover:bg-neutral-50">
                    <td className="px-4 py-3 font-medium text-neutral-900">{g.title}</td>
                    <td className="px-4 py-3 text-neutral-600 capitalize">{g.category}</td>
                    <td className="px-4 py-3 text-neutral-600">{g.imageCount}</td>
                    <td className="px-4 py-3 text-neutral-900 font-medium">{g.viewCount}</td>
                    <td className="px-4 py-3 text-neutral-900 font-medium">{g.downloadCount}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
