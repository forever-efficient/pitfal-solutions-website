'use client';

import { useState, useEffect } from 'react';
import { StatCard } from '@/components/admin/StatCard';
import { useToast } from '@/components/admin/Toast';
import { adminGalleries, adminInquiries } from '@/lib/api';

export default function AdminDashboardPage() {
  const { showError } = useToast();
  const [stats, setStats] = useState({
    galleries: 0,
    images: 0,
    inquiries: 0,
    newInquiries: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      adminGalleries.list(),
      adminInquiries.list(),
      adminInquiries.list('new'),
    ])
      .then(([galleriesData, inquiriesData, newInquiriesData]) => {
        const totalImages = galleriesData.galleries.reduce(
          (sum, g) => sum + g.imageCount,
          0
        );
        setStats({
          galleries: galleriesData.galleries.length,
          images: totalImages,
          inquiries: inquiriesData.inquiries.length,
          newInquiries: newInquiriesData.inquiries.length,
        });
      })
      .catch(() => {
        showError('Failed to load dashboard stats');
      })
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
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
  );
}
