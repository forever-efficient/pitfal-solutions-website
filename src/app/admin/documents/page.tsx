'use client';

import { useState } from 'react';
import { DocuSealToggle } from '@/components/admin/DocuSealToggle';
import type { DocuSealStatus } from '@/lib/api';

export default function DocumentsPage() {
  const [status, setStatus] = useState<DocuSealStatus>('off');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900">Documents</h1>
        <DocuSealToggle onStatusChange={setStatus} />
      </div>

      {status === 'running' && (
        <div className="bg-white rounded-xl border border-neutral-200 p-6">
          <p className="text-sm text-neutral-600 mb-4">
            Manage templates, send documents for signing, and view submissions directly in DocuSeal.
          </p>
          <a
            href="https://sign.pitfal.solutions"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Open DocuSeal
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      )}

      {status === 'off' && (
        <div className="bg-white rounded-xl border border-neutral-200 p-6">
          <p className="text-sm text-neutral-500">
            DocuSeal is offline. Enable it to manage document signing.
          </p>
        </div>
      )}

      {status === 'error' && (
        <div className="bg-red-50 rounded-xl border border-red-200 p-6">
          <p className="text-sm text-red-700">
            DocuSeal encountered an error. Try enabling it again.
          </p>
        </div>
      )}

      {(status === 'starting' || status === 'stopping') && (
        <div className="bg-white rounded-xl border border-neutral-200 p-6">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-neutral-600">
              {status === 'starting' ? 'Starting DocuSeal... This may take a few minutes.' : 'Creating backup and shutting down...'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
