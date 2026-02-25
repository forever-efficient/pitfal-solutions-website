'use client';

import { useState, useEffect, useCallback } from 'react';
import { adminProcessing, ProcessingJob } from '@/lib/api';

interface ProcessingQueueProps {
  galleryId: string;
}

function StatusBadge({ status }: { status: ProcessingJob['status'] }) {
  const config = {
    queued:      { label: 'In queue',   classes: 'bg-yellow-100 text-yellow-800' },
    uploading:   { label: 'Uploading',  classes: 'bg-blue-100 text-blue-700' },
    processing:  { label: 'Editing…',   classes: 'bg-blue-100 text-blue-700' },
    exporting:   { label: 'Exporting…', classes: 'bg-cyan-100 text-cyan-700' },
    downloading: { label: 'Saving…',    classes: 'bg-blue-100 text-blue-700' },
    complete:    { label: 'Complete',   classes: 'bg-green-100 text-green-700' },
    failed:      { label: 'Failed',     classes: 'bg-red-100 text-red-700' },
  }[status];

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${config.classes}`}>
      {status === 'processing' || status === 'uploading' || status === 'exporting' || status === 'downloading' ? (
        <svg className="animate-spin -ml-0.5 mr-1.5 h-3 w-3" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : null}
      {config.label}
    </span>
  );
}

function elapsed(createdAt: string): string {
  const ms = Date.now() - new Date(createdAt).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return 'just now';
  if (min === 1) return '1 min ago';
  if (min < 60) return `${min} mins ago`;
  const hr = Math.floor(min / 60);
  return hr === 1 ? '1 hr ago' : `${hr} hrs ago`;
}

export function ProcessingQueue({ galleryId }: ProcessingQueueProps) {
  const [jobs, setJobs] = useState<ProcessingJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<{ processingMode: 'auto' | 'manual' }>({ processingMode: 'auto' });
  const [triggering, setTriggering] = useState<string | null>(null);

  const loadJobs = useCallback(async () => {
    try {
      const data = await adminProcessing.listJobs(galleryId);
      setJobs(data.jobs);
    } catch {
      // silently ignore load errors
    } finally {
      setLoading(false);
    }
  }, [galleryId]);

  useEffect(() => {
    loadJobs();
    adminProcessing.getSettings().then(s => setSettings({ processingMode: s.processingMode })).catch(() => {});
  }, [loadJobs]);

  // Auto-refresh while any job is in progress
  const hasActiveJobs = jobs.some(j => ['queued', 'uploading', 'processing', 'downloading'].includes(j.status));
  useEffect(() => {
    if (!hasActiveJobs) return;
    const interval = setInterval(loadJobs, 30000);
    return () => clearInterval(interval);
  }, [hasActiveJobs, loadJobs]);

  async function handleTrigger(job: ProcessingJob) {
    setTriggering(job.jobId);
    try {
      await adminProcessing.triggerJob(galleryId, job.rawKeys);
      await loadJobs();
    } catch {
      // ignore
    } finally {
      setTriggering(null);
    }
  }

  async function handleRetry(job: ProcessingJob) {
    setTriggering(job.jobId);
    try {
      await adminProcessing.triggerJob(galleryId, job.rawKeys);
      await loadJobs();
    } catch {
      // ignore
    } finally {
      setTriggering(null);
    }
  }

  if (loading || jobs.length === 0) return null;

  const allDone = jobs.every(j => j.status === 'complete' || j.status === 'failed');
  if (allDone && jobs.every(j => j.status === 'complete')) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
        <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        <span className="text-sm text-green-800">All RAW files processed — JPEGs added to gallery.</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-neutral-200 p-6">
      <h2 className="text-lg font-semibold text-neutral-900 mb-4">
        Processing Queue ({jobs.length})
      </h2>
      <ul className="space-y-3">
        {jobs.map(job => (
          <li key={job.jobId} className="flex items-center justify-between gap-4 border border-neutral-100 rounded-lg p-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-neutral-800 truncate">
                {job.rawKeys.length} RAW file{job.rawKeys.length !== 1 ? 's' : ''}
              </p>
              <p className="text-xs text-neutral-500 mt-0.5">{elapsed(job.createdAt)}</p>
              {job.error && (
                <p className="text-xs text-red-600 mt-1 truncate">{job.error}</p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <StatusBadge status={job.status} />
              {job.status === 'queued' && settings.processingMode === 'manual' && (
                <button
                  onClick={() => handleTrigger(job)}
                  disabled={triggering === job.jobId}
                  className="text-xs px-2 py-1 bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50"
                >
                  Process Now
                </button>
              )}
              {job.status === 'failed' && (
                <button
                  onClick={() => handleRetry(job)}
                  disabled={triggering === job.jobId}
                  className="text-xs px-2 py-1 border border-neutral-300 rounded hover:bg-neutral-50 disabled:opacity-50"
                >
                  Retry
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
