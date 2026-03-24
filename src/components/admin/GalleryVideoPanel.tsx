'use client';

import { useState, useEffect, useRef } from 'react';
import { adminGalleries, adminVideos } from '@/lib/api';
import { getImageUrl } from '@/lib/utils';
import { useToast } from './Toast';

interface GalleryVideo {
  key: string;
  alt?: string;
  previewKey?: string;
  title?: string;
  youtubeUrl?: string;
}

interface GalleryVideoPanelProps {
  galleryId: string;
  videos: GalleryVideo[];
  onUpdate: () => void;
}

type RegenState = {
  status: 'idle' | 'generating' | 'complete' | 'error';
  jobId?: string;
  previewKey?: string;
  error?: string;
};

export function GalleryVideoPanel({ galleryId, videos, onUpdate }: GalleryVideoPanelProps) {
  const { showSuccess, showError } = useToast();
  const [removing, setRemoving] = useState<string | null>(null);
  const [regenOpen, setRegenOpen] = useState<string | null>(null);
  const [regenState, setRegenState] = useState<RegenState>({ status: 'idle' });
  const [startTime, setStartTime] = useState(0);
  const [duration, setDuration] = useState(5);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  async function handleRemove(videoKey: string) {
    if (!confirm('Remove this video from the gallery? It will be moved back to Video Management.')) return;
    setRemoving(videoKey);
    try {
      await adminVideos.unassign(videoKey, galleryId);
      showSuccess('Video removed and moved back to staging');
      onUpdate();
    } catch {
      showError('Failed to remove video');
    } finally {
      setRemoving(null);
    }
  }

  function toggleRegen(videoKey: string) {
    if (regenOpen === videoKey) {
      setRegenOpen(null);
      setRegenState({ status: 'idle' });
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    } else {
      setRegenOpen(videoKey);
      setRegenState({ status: 'idle' });
      setStartTime(0);
      setDuration(5);
    }
  }

  async function handleGeneratePreview(videoKey: string) {
    setRegenState({ status: 'generating' });
    try {
      const { jobId } = await adminVideos.generatePreview(videoKey, startTime, duration);
      setRegenState({ status: 'generating', jobId });

      // Poll for completion
      pollRef.current = setInterval(async () => {
        try {
          const result = await adminVideos.getPreviewStatus(jobId);
          if (result.status === 'complete' && result.previewKey) {
            if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
            setRegenState({ status: 'complete', previewKey: result.previewKey });

            // Save new previewKey to gallery
            const updatedVideos = videos.map(v =>
              v.key === videoKey ? { ...v, previewKey: result.previewKey } : v
            );
            await adminGalleries.update(galleryId, { videos: updatedVideos });
            showSuccess('Preview regenerated');
            onUpdate();
          } else if (result.status === 'error') {
            if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
            setRegenState({ status: 'error', error: result.error || 'Preview generation failed' });
          }
        } catch {
          if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
          setRegenState({ status: 'error', error: 'Failed to check status' });
        }
      }, 3000);
    } catch {
      setRegenState({ status: 'error', error: 'Failed to start preview generation' });
    }
  }

  if (videos.length === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-neutral-200 p-6">
      <h2 className="text-lg font-semibold text-neutral-900 mb-4">
        Videos
        <span className="text-sm font-normal text-neutral-400 ml-2">
          {videos.length} {videos.length === 1 ? 'video' : 'videos'}
        </span>
      </h2>
      <div className="space-y-4">
        {videos.map((video) => (
          <div
            key={video.key}
            className="border border-neutral-100 rounded-lg p-3"
          >
            <div className="flex gap-4 items-start">
              {/* Preview thumbnail */}
              <div className="w-40 shrink-0 aspect-video bg-neutral-900 rounded-lg overflow-hidden">
                {video.previewKey ? (
                  <video
                    src={getImageUrl(video.previewKey)}
                    muted
                    autoPlay
                    loop
                    playsInline
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-neutral-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-neutral-900 truncate">
                  {video.title || video.key.split('/').pop()}
                </p>
                <p className="text-xs text-neutral-400 truncate mt-0.5">{video.key}</p>
                {video.youtubeUrl && (
                  <a
                    href={video.youtubeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-700 mt-1"
                  >
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                    </svg>
                    YouTube
                  </a>
                )}
                {video.previewKey && (
                  <span className="inline-block text-xs text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded mt-1 ml-1">
                    Preview ready
                  </span>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => toggleRegen(video.key)}
                  className={`p-2 rounded-lg transition-colors ${
                    regenOpen === video.key
                      ? 'text-primary-700 bg-primary-50'
                      : 'text-neutral-400 hover:text-primary-600 hover:bg-primary-50'
                  }`}
                  title={video.previewKey ? 'Regenerate preview' : 'Generate preview'}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
                <button
                  onClick={() => handleRemove(video.key)}
                  disabled={removing === video.key}
                  className="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                  title="Remove from gallery"
                >
                  {removing === video.key ? (
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Regenerate Preview Panel */}
            {regenOpen === video.key && (
              <div className="mt-3 pt-3 border-t border-neutral-100">
                <div className="flex flex-wrap items-end gap-4">
                  <div>
                    <label className="block text-xs font-medium text-neutral-600 mb-1">Start time (seconds)</label>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={startTime}
                      onChange={e => setStartTime(Math.max(0, Number(e.target.value)))}
                      disabled={regenState.status === 'generating'}
                      className="w-24 px-2 py-1.5 border border-neutral-300 rounded text-sm disabled:opacity-50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-600 mb-1">Duration: {duration}s</label>
                    <input
                      type="range"
                      min={3}
                      max={15}
                      value={duration}
                      onChange={e => setDuration(Number(e.target.value))}
                      disabled={regenState.status === 'generating'}
                      className="w-32 disabled:opacity-50"
                    />
                  </div>
                  <button
                    onClick={() => handleGeneratePreview(video.key)}
                    disabled={regenState.status === 'generating'}
                    className="px-3 py-1.5 bg-primary-700 text-white rounded text-sm font-medium hover:bg-primary-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {regenState.status === 'generating' ? (
                      <span className="flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Generating...
                      </span>
                    ) : video.previewKey ? 'Regenerate Preview' : 'Generate Preview'}
                  </button>
                </div>
                {regenState.status === 'complete' && (
                  <p className="text-xs text-emerald-600 mt-2">Preview generated successfully.</p>
                )}
                {regenState.status === 'error' && (
                  <p className="text-xs text-red-600 mt-2">{regenState.error}</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
