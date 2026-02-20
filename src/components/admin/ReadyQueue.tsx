'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { adminImages, adminGalleries } from '@/lib/api';
import { getImageUrl } from '@/lib/utils';
import { useToast } from '@/components/admin/Toast';

interface ReadyImage {
  key: string;
  filename: string;
  uploadedAt: string;
  size: number;
  url: string;
}

interface GalleryOption {
  id: string;
  title: string;
  category: string;
}

interface ReadyQueueProps {
  galleryId?: string;
  onAssigned?: () => void;
}

const PAGE_SIZE = 10;
const IMAGE_PAGE_SIZE = 24;

const CATEGORY_LABELS: Record<string, string> = {
  brands: 'Brands',
  portraits: 'Portraits',
  events: 'Events',
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function ReadyQueue({ galleryId, onAssigned }: ReadyQueueProps) {
  const { showError, showSuccess } = useToast();
  const [images, setImages] = useState<ReadyImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [assigning, setAssigning] = useState(false);

  const [imagePage, setImagePage] = useState(0);

  // Gallery picker state
  const [galleries, setGalleries] = useState<GalleryOption[]>([]);
  const [galleriesLoading, setGalleriesLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedGallery, setSelectedGallery] = useState<GalleryOption | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  const fetchReady = useCallback(() => {
    setLoading(true);
    adminImages.listReady()
      .then(data => setImages(data.images))
      .catch(() => showError('Failed to load ready queue'))
      .finally(() => setLoading(false));
  }, [showError]);

  useEffect(() => {
    fetchReady();
  }, [fetchReady]);

  // Pre-select gallery if provided via prop
  useEffect(() => {
    if (galleryId && galleries.length > 0) {
      const match = galleries.find(g => g.id === galleryId);
      if (match) setSelectedGallery(match);
    }
  }, [galleryId, galleries]);

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

  // Filtered + paginated galleries
  const filtered = galleries.filter(g => {
    const q = search.toLowerCase();
    return (
      g.title.toLowerCase().includes(q) ||
      g.category.toLowerCase().includes(q)
    );
  });
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  function handleSearch(q: string) {
    setSearch(q);
    setPage(0);
  }

  function selectGallery(g: GalleryOption) {
    setSelectedGallery(g);
    setPickerOpen(false);
    setSearch('');
    setPage(0);
  }

  function toggleSelect(key: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const imageTotalPages = Math.ceil(images.length / IMAGE_PAGE_SIZE);
  const pagedImages = images.slice(imagePage * IMAGE_PAGE_SIZE, (imagePage + 1) * IMAGE_PAGE_SIZE);

  function selectAll() { setSelected(new Set(images.map(i => i.key))); }
  function clearSelection() { setSelected(new Set()); }

  async function handleAssign() {
    if (selected.size === 0) { showError('Select at least one image'); return; }
    if (!selectedGallery) { showError('Select a gallery to assign to'); return; }

    setAssigning(true);
    try {
      const result = await adminImages.assign(Array.from(selected), selectedGallery.id);
      showSuccess(`Assigned ${result.assigned} image(s) to "${selectedGallery.title}"`);
      if (result.failed > 0) showError(`${result.failed} image(s) failed to assign`);
      setSelected(new Set());
      fetchReady();
      onAssigned?.();
    } catch {
      showError('Failed to assign images');
    } finally {
      setAssigning(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-neutral-900">Ready to Review</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="aspect-square bg-neutral-200 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-neutral-900">
          Ready to Review
          {images.length > 0 && (
            <span className="ml-2 text-sm font-normal text-neutral-500">
              ({images.length} image{images.length !== 1 ? 's' : ''})
            </span>
          )}
        </h2>
        <button onClick={fetchReady} className="text-sm text-primary-600 hover:text-primary-700">
          Refresh
        </button>
      </div>

      {images.length === 0 ? (
        <p className="text-neutral-500 text-sm py-8 text-center">
          No images in the ready queue. Upload images to get started.
        </p>
      ) : (
        <>
          {/* Selection controls */}
          <div className="flex items-center gap-3 text-sm">
            <button onClick={selectAll} className="text-primary-600 hover:text-primary-700">Select all</button>
            <span className="text-neutral-300">|</span>
            <button onClick={clearSelection} className="text-neutral-500 hover:text-neutral-700">Clear</button>
            {selected.size > 0 && (
              <span className="text-neutral-600">{selected.size} selected</span>
            )}
          </div>

          {/* Image grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {pagedImages.map(img => (
              <div
                key={img.key}
                onClick={() => toggleSelect(img.key)}
                className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-colors bg-neutral-200 ${
                  selected.has(img.key)
                    ? 'border-primary-500'
                    : 'border-transparent hover:border-neutral-300'
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={getImageUrl(img.key)} alt={img.filename} className="w-full h-full object-cover" />
                {selected.has(img.key) && (
                  <div className="absolute inset-0 bg-primary-500/20 flex items-center justify-center">
                    <div className="w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1">
                  <p className="text-white text-xs truncate">{img.filename}</p>
                  <p className="text-neutral-300 text-xs">{formatBytes(img.size)}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Image pagination */}
          {imageTotalPages > 1 && (
            <div className="flex items-center justify-between text-xs text-neutral-500 pt-1">
              <button
                disabled={imagePage === 0}
                onClick={() => setImagePage(p => p - 1)}
                className="disabled:opacity-40 hover:text-neutral-700"
              >
                ← Prev
              </button>
              <span>{imagePage + 1} / {imageTotalPages}</span>
              <button
                disabled={imagePage >= imageTotalPages - 1}
                onClick={() => setImagePage(p => p + 1)}
                className="disabled:opacity-40 hover:text-neutral-700"
              >
                Next →
              </button>
            </div>
          )}

          {/* Assign controls */}
          {selected.size > 0 && (
            <div className="flex items-start gap-3 pt-2">
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
                      <span className="ml-1.5 text-neutral-400 text-xs">
                        {CATEGORY_LABELS[selectedGallery.category] ?? selectedGallery.category}
                      </span>
                    </span>
                  ) : (
                    <span className="text-neutral-400">Select a gallery…</span>
                  )}
                  <svg className="w-4 h-4 text-neutral-400 shrink-0 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {pickerOpen && (
                  <div className="absolute z-20 mt-1 w-full bg-white border border-neutral-200 rounded-lg shadow-lg">
                    {/* Search */}
                    <div className="p-2 border-b border-neutral-100">
                      <input
                        autoFocus
                        type="text"
                        placeholder="Search galleries…"
                        value={search}
                        onChange={e => handleSearch(e.target.value)}
                        className="w-full px-2 py-1.5 text-sm border border-neutral-200 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                      />
                    </div>

                    {/* List */}
                    <ul className="max-h-48 overflow-y-auto divide-y divide-neutral-50">
                      {galleriesLoading ? (
                        <li className="px-3 py-4 text-sm text-neutral-400 text-center">Loading…</li>
                      ) : paginated.length === 0 ? (
                        <li className="px-3 py-4 text-sm text-neutral-400 text-center">No galleries found</li>
                      ) : (
                        paginated.map(g => (
                          <li key={g.id}>
                            <button
                              type="button"
                              onClick={() => selectGallery(g)}
                              className={`w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-neutral-50 text-left ${
                                selectedGallery?.id === g.id ? 'bg-primary-50 text-primary-700' : 'text-neutral-900'
                              }`}
                            >
                              <span className="truncate">{g.title}</span>
                              <span className="ml-2 shrink-0 text-xs text-neutral-400">
                                {CATEGORY_LABELS[g.category] ?? g.category}
                              </span>
                            </button>
                          </li>
                        ))
                      )}
                    </ul>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between px-3 py-2 border-t border-neutral-100 text-xs text-neutral-500">
                        <button
                          disabled={page === 0}
                          onClick={() => setPage(p => p - 1)}
                          className="disabled:opacity-40 hover:text-neutral-700"
                        >
                          ← Prev
                        </button>
                        <span>{page + 1} / {totalPages}</span>
                        <button
                          disabled={page >= totalPages - 1}
                          onClick={() => setPage(p => p + 1)}
                          className="disabled:opacity-40 hover:text-neutral-700"
                        >
                          Next →
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <button
                onClick={handleAssign}
                disabled={assigning || !selectedGallery}
                className="px-4 py-2 bg-primary-700 text-white rounded-lg text-sm font-medium hover:bg-primary-800 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {assigning ? 'Assigning…' : `Assign ${selected.size} to Gallery`}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
