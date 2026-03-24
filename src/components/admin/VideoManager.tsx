'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { adminVideos, adminGalleries, type VideoFile } from '@/lib/api';
import { useToast } from '@/components/admin/Toast';

interface GalleryOption {
  id: string;
  title: string;
  category: string;
}

type PreviewState = {
  status: 'idle' | 'generating' | 'complete' | 'error';
  jobId?: string;
  previewKey?: string;
  error?: string;
};

const PAGE_SIZE = 10;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function getMediaUrl(key: string): string {
  const base = process.env.NEXT_PUBLIC_MEDIA_URL || 'https://media.pitfal.solutions';
  return `${base}/${key}`;
}

export function VideoManager() {
  const { showError, showSuccess } = useToast();
  const [videos, setVideos] = useState<VideoFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<VideoFile | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Preview generation state
  const [startTime, setStartTime] = useState(0);
  const [duration, setDuration] = useState(5);
  const [preview, setPreview] = useState<PreviewState>({ status: 'idle' });
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Assignment state
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [videoTitle, setVideoTitle] = useState('');
  const [assigning, setAssigning] = useState(false);

  // Gallery picker
  const [galleries, setGalleries] = useState<GalleryOption[]>([]);
  const [galleriesLoading, setGalleriesLoading] = useState(false);
  const [selectedGallery, setSelectedGallery] = useState<GalleryOption | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const pickerRef = useRef<HTMLDivElement>(null);

  const fetchVideos = useCallback(() => {
    setLoading(true);
    adminVideos.listReady()
      .then(data => setVideos(data.videos))
      .catch(() => showError('Failed to load staged videos'))
      .finally(() => setLoading(false));
  }, [showError]);

  useEffect(() => { fetchVideos(); }, [fetchVideos]);

  // Load galleries when picker opens
  useEffect(() => {
    if (!pickerOpen || galleries.length > 0) return;
    setGalleriesLoading(true);
    adminGalleries.list()
      .then(data => setGalleries(data.galleries))
      .catch(() => showError('Failed to load galleries'))
      .finally(() => setGalleriesLoading(false));
  }, [pickerOpen, galleries.length, showError]);

  // Close picker on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
      }
    }
    if (pickerOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [pickerOpen]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  // Gallery picker filter + pagination
  const filtered = galleries.filter(g => {
    const q = search.toLowerCase();
    return g.title.toLowerCase().includes(q) || g.category.toLowerCase().includes(q);
  });
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  function selectVideo(video: VideoFile) {
    setSelected(video);
    setStartTime(0);
    setDuration(5);
    setPreview({ status: 'idle' });
    setYoutubeUrl('');
    setVideoTitle(video.filename.replace(/\.[^.]+$/, ''));
    setSelectedGallery(null);
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }

  function closeDetail() {
    setSelected(null);
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }

  async function handleGeneratePreview() {
    if (!selected) return;
    setPreview({ status: 'generating' });
    try {
      const result = await adminVideos.generatePreview(selected.key, startTime, duration);
      setPreview({ status: 'generating', jobId: result.jobId });
      // Start polling
      pollRef.current = setInterval(async () => {
        try {
          const status = await adminVideos.getPreviewStatus(result.jobId);
          if (status.status === 'complete' && status.previewKey) {
            setPreview({ status: 'complete', previewKey: status.previewKey, jobId: result.jobId });
            if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
          } else if (status.status === 'error') {
            setPreview({ status: 'error', error: status.error || 'Preview generation failed', jobId: result.jobId });
            if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
          }
        } catch {
          // Keep polling on transient errors
        }
      }, 3000);
    } catch {
      setPreview({ status: 'error', error: 'Failed to start preview generation' });
    }
  }

  async function handleAssign() {
    if (!selected || !selectedGallery) return;
    setAssigning(true);
    try {
      await adminVideos.assign({
        videoKey: selected.key,
        previewKey: preview.previewKey,
        galleryId: selectedGallery.id,
        youtubeUrl: youtubeUrl || undefined,
        title: videoTitle || undefined,
      });
      showSuccess(`Video assigned to "${selectedGallery.title}"`);
      closeDetail();
      fetchVideos();
    } catch {
      showError('Failed to assign video');
    } finally {
      setAssigning(false);
    }
  }

  async function handleDelete(keys: string[]) {
    setDeleting(true);
    try {
      const result = await adminVideos.deleteFromReady(keys);
      showSuccess(`Deleted ${result.deleted} video(s)`);
      if (selected && keys.includes(selected.key)) closeDetail();
      fetchVideos();
    } catch {
      showError('Failed to delete video(s)');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Video Management</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Discover staged videos, generate preview clips, and assign to galleries.
          </p>
        </div>
        <button onClick={fetchVideos} className="text-sm text-primary-600 hover:text-primary-700">
          Refresh
        </button>
      </div>

      {/* Upload instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-800">
        <strong>Upload videos via CLI:</strong>{' '}
        <code className="bg-blue-100 px-1.5 py-0.5 rounded text-xs">
          aws s3 cp video.mp4 s3://pitfal-prod-media/staging/videos/ --profile pitfal
        </code>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 bg-neutral-200 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : videos.length === 0 ? (
        <p className="text-neutral-500 text-sm py-12 text-center">
          No staged videos found. Upload videos via the AWS CLI to get started.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {videos.map(video => (
            <div
              key={video.key}
              onClick={() => selectVideo(video)}
              className={`relative rounded-lg border-2 overflow-hidden cursor-pointer transition-colors ${
                selected?.key === video.key
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-neutral-200 hover:border-neutral-300 bg-white'
              }`}
            >
              <div className="flex items-center gap-3 p-4">
                <div className="w-12 h-12 bg-neutral-800 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-neutral-900 truncate">{video.filename}</p>
                  <p className="text-xs text-neutral-500">{formatBytes(video.size)}</p>
                  <p className="text-xs text-neutral-400">
                    {new Date(video.uploadedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail panel */}
      {selected && (
        <div className="bg-white border border-neutral-200 rounded-xl p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-neutral-900">{selected.filename}</h2>
            <button onClick={closeDetail} className="text-neutral-400 hover:text-neutral-600">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Video player */}
          <div className="bg-black rounded-lg overflow-hidden">
            <video
              key={selected.key}
              controls
              className="w-full max-h-[400px]"
              preload="metadata"
            >
              <source src={getMediaUrl(selected.key)} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>

          {/* Preview generation */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-neutral-700">Preview Clip</h3>
            <div className="flex flex-wrap gap-4">
              <div>
                <label className="block text-xs text-neutral-500 mb-1">Start Time (seconds)</label>
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  value={startTime}
                  onChange={e => setStartTime(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-28 px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-xs text-neutral-500 mb-1">Duration (3-15 sec)</label>
                <input
                  type="range"
                  min={3}
                  max={15}
                  step={1}
                  value={duration}
                  onChange={e => setDuration(parseInt(e.target.value))}
                  className="w-40 mt-2"
                />
                <span className="ml-2 text-sm text-neutral-600">{duration}s</span>
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleGeneratePreview}
                  disabled={preview.status === 'generating'}
                  className="px-4 py-2 bg-primary-700 text-white rounded-lg text-sm font-medium hover:bg-primary-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {preview.status === 'generating' ? 'Generating...' : 'Generate Preview'}
                </button>
              </div>
            </div>

            {/* Preview status */}
            {preview.status === 'generating' && (
              <div className="flex items-center gap-2 text-sm text-amber-600">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Generating preview clip... This may take a minute.
              </div>
            )}
            {preview.status === 'error' && (
              <p className="text-sm text-red-600">{preview.error}</p>
            )}
            {preview.status === 'complete' && preview.previewKey && (
              <div className="space-y-2">
                <p className="text-sm text-green-600 font-medium">Preview ready!</p>
                <div className="bg-black rounded-lg overflow-hidden max-w-sm">
                  <video
                    key={preview.previewKey}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full"
                  >
                    <source src={getMediaUrl(preview.previewKey)} type="video/mp4" />
                  </video>
                </div>
              </div>
            )}
          </div>

          {/* Video metadata */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-neutral-700">Video Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-neutral-500 mb-1">Title</label>
                <input
                  type="text"
                  value={videoTitle}
                  onChange={e => setVideoTitle(e.target.value)}
                  placeholder="Video title"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-xs text-neutral-500 mb-1">YouTube URL (full playback)</label>
                <input
                  type="url"
                  value={youtubeUrl}
                  onChange={e => setYoutubeUrl(e.target.value)}
                  placeholder="https://youtube.com/watch?v=..."
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
          </div>

          {/* Assignment */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-neutral-700">Assign to Gallery</h3>
            <div className="flex items-start gap-3">
              {/* Gallery picker */}
              <div className="relative flex-1 max-w-sm" ref={pickerRef}>
                <button
                  type="button"
                  onClick={() => setPickerOpen(o => !o)}
                  className="w-full flex items-center justify-between px-3 py-2 border border-neutral-300 rounded-lg text-sm bg-white hover:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 text-left"
                >
                  {selectedGallery ? (
                    <span className="text-neutral-900">
                      {selectedGallery.title}
                      <span className="ml-1.5 text-neutral-400 text-xs">{selectedGallery.category}</span>
                    </span>
                  ) : (
                    <span className="text-neutral-400">Select a gallery...</span>
                  )}
                  <svg className="w-4 h-4 text-neutral-400 shrink-0 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {pickerOpen && (
                  <div className="absolute z-20 mt-1 w-full bg-white border border-neutral-200 rounded-lg shadow-lg">
                    <div className="p-2 border-b border-neutral-100">
                      <input
                        autoFocus
                        type="text"
                        placeholder="Search galleries..."
                        value={search}
                        onChange={e => { setSearch(e.target.value); setPage(0); }}
                        className="w-full px-2 py-1.5 text-sm border border-neutral-200 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                      />
                    </div>
                    <ul className="max-h-48 overflow-y-auto divide-y divide-neutral-50">
                      {galleriesLoading ? (
                        <li className="px-3 py-4 text-sm text-neutral-400 text-center">Loading...</li>
                      ) : paginated.length === 0 ? (
                        <li className="px-3 py-4 text-sm text-neutral-400 text-center">No galleries found</li>
                      ) : (
                        paginated.map(g => (
                          <li key={g.id}>
                            <button
                              type="button"
                              onClick={() => { setSelectedGallery(g); setPickerOpen(false); setSearch(''); setPage(0); }}
                              className={`w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-neutral-50 text-left ${
                                selectedGallery?.id === g.id ? 'bg-primary-50 text-primary-700' : 'text-neutral-900'
                              }`}
                            >
                              <span className="truncate">{g.title}</span>
                              <span className="ml-2 shrink-0 text-xs text-neutral-400">{g.category}</span>
                            </button>
                          </li>
                        ))
                      )}
                    </ul>
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between px-3 py-2 border-t border-neutral-100 text-xs text-neutral-500">
                        <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="disabled:opacity-40 hover:text-neutral-700">
                          Prev
                        </button>
                        <span>{page + 1} / {totalPages}</span>
                        <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} className="disabled:opacity-40 hover:text-neutral-700">
                          Next
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <button
                onClick={handleAssign}
                disabled={assigning || !selectedGallery || preview.status !== 'complete'}
                className="px-4 py-2 bg-primary-700 text-white rounded-lg text-sm font-medium hover:bg-primary-800 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {assigning ? 'Assigning...' : preview.status !== 'complete' ? 'Generate Preview First' : 'Assign to Gallery'}
              </button>
            </div>
          </div>

          {/* Delete */}
          <div className="pt-4 border-t border-neutral-200">
            <button
              onClick={() => handleDelete([selected.key])}
              disabled={deleting}
              className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {deleting ? 'Deleting...' : 'Delete This Video'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
