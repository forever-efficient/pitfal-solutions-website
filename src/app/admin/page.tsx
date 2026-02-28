'use client';

import { useState, useEffect } from 'react';
import { StatCard } from '@/components/admin/StatCard';
import { ReadyQueue } from '@/components/admin/ReadyQueue';
import { DashboardUploader } from '@/components/admin/DashboardUploader';
import { useToast } from '@/components/admin/Toast';
import { adminGalleries, adminInquiries, adminAnalytics } from '@/lib/api';
import Link from 'next/link';

export default function AdminDashboardPage() {
  const { showError } = useToast();
  const [stats, setStats] = useState({
    galleries: 0,
    images: 0,
    inquiries: 0,
    newInquiries: 0,
    clientViews: 0,
    clientDownloads: 0,
  });
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      adminGalleries.list(),
      adminInquiries.list(),
      adminInquiries.list('new'),
      adminAnalytics.get().catch(() => ({ totalViews: 0, totalDownloads: 0, galleries: [] })),
    ])
      .then(([galleriesData, inquiriesData, newInquiriesData, analyticsData]) => {
        const totalImages = galleriesData.galleries.reduce(
          (sum, g) => sum + g.imageCount,
          0
        );
        setStats({
          galleries: galleriesData.galleries.length,
          images: totalImages,
          inquiries: inquiriesData.inquiries.length,
          newInquiries: newInquiriesData.inquiries.length,
          clientViews: analyticsData.totalViews,
          clientDownloads: analyticsData.totalDownloads,
        });
      })
      .catch(() => {
        showError('Failed to load dashboard stats');
      })
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 mb-6">Dashboard</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Galleries"
            value={loading ? '...' : stats.galleries}
          />
          <StatCard
            label="Total Images"
            value={loading ? '...' : stats.images}
          />
          <StatCard
            label="Inquiries"
            value={loading ? '...' : stats.inquiries}
          />
          <StatCard
            label="New Inquiries"
            value={loading ? '...' : stats.newInquiries}
            highlight
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-neutral-900">Client Analytics</h2>
          <Link
            href="/admin/analytics"
            className="text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            View detailed analytics &rarr;
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <StatCard
            label="Client Gallery Views"
            value={loading ? '...' : stats.clientViews}
          />
          <StatCard
            label="Client Downloads"
            value={loading ? '...' : stats.clientDownloads}
          />
        </div>
      </div>

      <DashboardUploader onUploaded={() => setRefreshKey(k => k + 1)} />

      <div className="bg-white rounded-xl border border-neutral-200 p-6">
        <ReadyQueue refreshKey={refreshKey} />
      </div>
    </div>
  );
}
