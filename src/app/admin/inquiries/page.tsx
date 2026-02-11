'use client';

import { useState, useEffect } from 'react';
import { InquiryList } from '@/components/admin/InquiryList';
import { adminInquiries } from '@/lib/api';

export default function AdminInquiriesPage() {
  const [inquiries, setInquiries] = useState<Array<Record<string, unknown>>>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    setLoading(true);
    adminInquiries
      .list(filter || undefined)
      .then((data) => setInquiries(data.inquiries))
      .catch(() => {
        // Failed to load inquiries
      })
      .finally(() => setLoading(false));
  }, [filter]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-neutral-900">Inquiries</h1>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-3 py-2 border border-neutral-300 rounded-lg text-sm"
        >
          <option value="">All</option>
          <option value="new">New</option>
          <option value="read">Read</option>
          <option value="replied">Replied</option>
        </select>
      </div>
      {loading ? (
        <div className="text-neutral-400">Loading...</div>
      ) : (
        <InquiryList inquiries={inquiries} />
      )}
    </div>
  );
}
