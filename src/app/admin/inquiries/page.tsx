'use client';

import { useState, useEffect } from 'react';
import { adminInquiries } from '@/lib/api';
import { InquiryList } from '@/components/admin/InquiryList';
import { useToast } from '@/components/admin/Toast';

export default function InquiriesPage() {
  const { showSuccess, showError } = useToast();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  function loadInquiries() {
    setLoading(true);
    adminInquiries
      .list()
      .then((data) => {
        setInquiries(data.inquiries);
      })
      .catch(() => {
        showError('Failed to load inquiries');
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadInquiries();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleStatusChange(id: string, status: string) {
    try {
      await adminInquiries.update(id, status);
      showSuccess('Status updated');
      loadInquiries();
    } catch {
      showError('Failed to update status');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this inquiry?')) return;
    try {
      await adminInquiries.delete(id);
      showSuccess('Inquiry deleted');
      loadInquiries();
    } catch {
      showError('Failed to delete inquiry');
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-neutral-200 rounded w-1/4"></div>
        <div className="h-64 bg-neutral-200 rounded"></div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-neutral-900 mb-6">Inquiries</h1>
      <InquiryList
        inquiries={inquiries}
        onStatusChange={handleStatusChange}
        onDelete={handleDelete}
      />
    </div>
  );
}
