'use client';

import { useState } from 'react';
import { adminNotify } from '@/lib/api';
import { useToast } from './Toast';

interface NotifyClientProps {
  galleryId: string;
  galleryTitle: string;
}

export function NotifyClient({ galleryId, galleryTitle }: NotifyClientProps) {
  const { showSuccess, showError } = useToast();
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({
    clientName: '',
    clientEmail: '',
    expirationDays: '30',
  });

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    try {
      await adminNotify.sendGalleryReady(
        galleryId,
        form.clientEmail,
        form.clientName,
        parseInt(form.expirationDays, 10)
      );
      showSuccess(`Notification sent to ${form.clientEmail}`);
      setOpen(false);
      setForm({ clientName: '', clientEmail: '', expirationDays: '30' });
    } catch {
      showError('Failed to send notification. Is the email verified in SES?');
    } finally {
      setSending(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        Send to Client
      </button>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-neutral-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-neutral-900">
          Notify Client
        </h2>
        <button
          onClick={() => setOpen(false)}
          className="text-neutral-400 hover:text-neutral-600"
        >
          &times;
        </button>
      </div>
      <p className="text-sm text-neutral-500 mb-4">
        Send a &ldquo;Gallery Ready&rdquo; email for <strong>{galleryTitle}</strong> with the gallery link and access instructions.
      </p>
      <form onSubmit={handleSend} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Client Name
            </label>
            <input
              type="text"
              value={form.clientName}
              onChange={(e) => setForm({ ...form, clientName: e.target.value })}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm"
              placeholder="Jane Doe"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Client Email
            </label>
            <input
              type="email"
              value={form.clientEmail}
              onChange={(e) => setForm({ ...form, clientEmail: e.target.value })}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm"
              placeholder="jane@example.com"
              required
            />
          </div>
        </div>
        <div className="max-w-xs">
          <label className="block text-sm font-medium text-neutral-700 mb-1">
            Gallery Available For (days)
          </label>
          <input
            type="number"
            value={form.expirationDays}
            onChange={(e) => setForm({ ...form, expirationDays: e.target.value })}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm"
            min="1"
            max="365"
          />
        </div>
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={sending}
            className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {sending ? 'Sending...' : 'Send Notification'}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-sm text-neutral-500 hover:text-neutral-700"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
