'use client';

import { useState } from 'react';
import { adminGalleries } from '@/lib/api';
import type { GallerySection, ClientSort, ClientSortBy, ClientSortOrder } from '@/lib/api';
import { getImageUrl } from '@/lib/utils';
import { useToast } from './Toast';

interface GalleryImage {
  key: string;
  alt?: string;
}

interface SectionManagerProps {
  galleryId: string;
  images: GalleryImage[];
  initialSections: GallerySection[];
  initialClientSort?: ClientSort | null;
  onUpdate: (sections: GallerySection[], clientSort?: ClientSort | null) => void;
}

const SECTION_IMAGES_PAGE_SIZE = 24;
const AVAILABLE_PAGE_SIZE = 24;

function generateId(): string {
  return crypto.randomUUID();
}

const SORT_OPTIONS: { value: ClientSortBy; label: string }[] = [
  { value: 'date', label: 'Date (upload order)' },
  { value: 'name', label: 'Name (filename)' },
  { value: 'size', label: 'Size (file size)' },
  { value: 'random', label: 'Random' },
];

export function SectionManager({ galleryId, images, initialSections, initialClientSort, onUpdate }: SectionManagerProps) {
  const { showSuccess, showError } = useToast();
  const [sections, setSections] = useState<GallerySection[]>(initialSections);
  const [clientSort, setClientSort] = useState<ClientSort | null>(initialClientSort ?? null);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sectionPage, setSectionPage] = useState<Record<string, number>>({});
  const [availablePage, setAvailablePage] = useState(1);

  // Images not assigned to any section
  const assignedKeys = new Set(sections.flatMap(s => s.images));
  const unassignedImages = images.filter(img => !assignedKeys.has(img.key));
  const availableTotalPages = Math.max(1, Math.ceil(unassignedImages.length / AVAILABLE_PAGE_SIZE));
  const effectiveAvailablePage = Math.min(availablePage, availableTotalPages);
  const availableStart = (effectiveAvailablePage - 1) * AVAILABLE_PAGE_SIZE;
  const paginatedUnassigned = unassignedImages.slice(availableStart, availableStart + AVAILABLE_PAGE_SIZE);

  function addSection() {
    const newSection: GallerySection = {
      id: generateId(),
      title: '',
      images: [],
    };
    setSections(prev => [...prev, newSection]);
    setExpandedId(newSection.id);
  }

  function removeSection(id: string) {
    setSections(prev => prev.filter(s => s.id !== id));
  }

  function updateSection(id: string, updates: Partial<GallerySection>) {
    setSections(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  }

  function moveSection(index: number, direction: -1 | 1) {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= sections.length) return;
    const updated = [...sections];
    const [moved] = updated.splice(index, 1);
    updated.splice(newIndex, 0, moved!);
    setSections(updated);
  }

  function toggleImageInSection(sectionId: string, imageKey: string) {
    setSections(prev => prev.map(s => {
      if (s.id !== sectionId) return s;
      const has = s.images.includes(imageKey);
      return {
        ...s,
        images: has ? s.images.filter(k => k !== imageKey) : [...s.images, imageKey],
      };
    }));
  }

  function removeImageFromSection(sectionId: string, imageKey: string) {
    setSections(prev => prev.map(s => {
      if (s.id !== sectionId) return s;
      return { ...s, images: s.images.filter(k => k !== imageKey) };
    }));
  }

  async function handleSave() {
    // Validate: all sections must have a title
    const invalid = sections.find(s => !s.title.trim());
    if (invalid) {
      showError('All sections must have a title');
      setExpandedId(invalid.id);
      return;
    }

    setSaving(true);
    try {
      const sortToSave = clientSort ?? { by: 'date' as ClientSortBy, order: 'asc' as ClientSortOrder };
      await adminGalleries.update(galleryId, {
        sections,
        clientSort: sortToSave,
      });
      onUpdate(sections, sortToSave);
      showSuccess('Sections saved');
    } catch {
      showError('Failed to save sections');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-neutral-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900">Sections</h2>
          <p className="text-sm text-neutral-500 mt-1">
            Organize images into sections like &quot;Getting Ready&quot;, &quot;Ceremony&quot;, etc.
          </p>
        </div>
        <button
          onClick={addSection}
          className="bg-neutral-900 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-neutral-800 transition-colors"
        >
          + Add Section
        </button>
      </div>

      {/* Client view sort */}
      <div className="mb-4 pb-4 border-b border-neutral-200">
        <p className="text-xs font-medium text-neutral-500 mb-2">Client view sort</p>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={clientSort?.by ?? 'date'}
            onChange={(e) =>
              setClientSort((prev) => ({
                by: e.target.value as ClientSortBy,
                order: prev?.order ?? 'asc',
              }))
            }
            className="text-sm border border-neutral-200 rounded px-2 py-1.5 bg-white"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {clientSort?.by !== 'random' && (
            <select
              value={clientSort?.order ?? 'asc'}
              onChange={(e) =>
                setClientSort((prev) =>
                  prev ? { ...prev, order: e.target.value as ClientSortOrder } : null
                )
              }
              className="text-sm border border-neutral-200 rounded px-2 py-1.5 bg-white"
            >
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </select>
          )}
        </div>
        <p className="text-xs text-neutral-400 mt-1">
          How images appear in the client gallery. Random uses the same shuffle as the homepage carousel.
        </p>
      </div>

      {sections.length === 0 ? (
        <p className="text-sm text-neutral-400 py-4 text-center">
          No sections yet. Add a section to organize your gallery images.
        </p>
      ) : (
        <div className="space-y-3">
          {sections.map((section, index) => {
            const isExpanded = expandedId === section.id;
            const sectionImages = images.filter(img => section.images.includes(img.key));
            const sectionTotalPages = Math.max(1, Math.ceil(sectionImages.length / SECTION_IMAGES_PAGE_SIZE));
            const currentSectionPage = Math.min(sectionPage[section.id] ?? 1, sectionTotalPages);
            const sectionStart = (currentSectionPage - 1) * SECTION_IMAGES_PAGE_SIZE;
            const paginatedSectionImages = sectionImages.slice(sectionStart, sectionStart + SECTION_IMAGES_PAGE_SIZE);

            return (
              <div
                key={section.id}
                className="border border-neutral-200 rounded-lg overflow-hidden"
              >
                {/* Section header */}
                <div className="flex items-center gap-2 p-3 bg-neutral-50">
                  {/* Reorder buttons */}
                  <div className="flex flex-col gap-0.5">
                    <button
                      onClick={() => moveSection(index, -1)}
                      disabled={index === 0}
                      className="text-neutral-400 hover:text-neutral-600 disabled:opacity-30"
                      aria-label="Move up"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => moveSection(index, 1)}
                      disabled={index === sections.length - 1}
                      className="text-neutral-400 hover:text-neutral-600 disabled:opacity-30"
                      aria-label="Move down"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>

                  {/* Title input */}
                  <input
                    type="text"
                    value={section.title}
                    onChange={(e) => updateSection(section.id, { title: e.target.value })}
                    placeholder="Section title..."
                    className="flex-1 px-2 py-1 text-sm border border-neutral-200 rounded bg-white"
                  />

                  {/* Image count */}
                  <span className="text-xs text-neutral-400 whitespace-nowrap">
                    {sectionImages.length} photos
                  </span>

                  {/* Expand/collapse */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : section.id)}
                    className="text-neutral-400 hover:text-neutral-600 p-1"
                    aria-label={isExpanded ? 'Collapse' : 'Expand'}
                  >
                    <svg className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => removeSection(section.id)}
                    className="text-red-400 hover:text-red-600 p-1"
                    aria-label="Delete section"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="p-3 border-t border-neutral-200">
                    {/* Description */}
                    <div className="mb-3">
                      <input
                        type="text"
                        value={section.description || ''}
                        onChange={(e) => updateSection(section.id, { description: e.target.value || undefined })}
                        placeholder="Optional description..."
                        className="w-full px-2 py-1 text-sm border border-neutral-200 rounded"
                      />
                    </div>

                    {/* Current section images */}
                    {sectionImages.length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs font-medium text-neutral-500 mb-2">In this section ({sectionImages.length}):</p>
                        <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-1.5">
                          {paginatedSectionImages.map(img => (
                            <div key={img.key} className="aspect-square relative group rounded overflow-hidden">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={getImageUrl(img.key, 'sm')}
                                alt={img.alt || ''}
                                className="w-full h-full object-cover"
                                onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = getImageUrl(img.key); }}
                              />
                              <button
                                onClick={() => removeImageFromSection(section.id, img.key)}
                                className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                aria-label="Remove from section"
                              >
                                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          ))}
                        </div>
                        {sectionTotalPages > 1 && (
                          <div className="mt-2 flex items-center justify-between text-xs text-neutral-500">
                            <button
                              type="button"
                              onClick={() => setSectionPage(prev => ({ ...prev, [section.id]: Math.max(1, (prev[section.id] ?? 1) - 1) }))}
                              disabled={currentSectionPage <= 1}
                              className="hover:text-neutral-700 disabled:opacity-50"
                            >
                              Previous
                            </button>
                            <span>Page {currentSectionPage} of {sectionTotalPages}</span>
                            <button
                              type="button"
                              onClick={() => setSectionPage(prev => ({ ...prev, [section.id]: Math.min(sectionTotalPages, (prev[section.id] ?? 1) + 1) }))}
                              disabled={currentSectionPage >= sectionTotalPages}
                              className="hover:text-neutral-700 disabled:opacity-50"
                            >
                              Next
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Unassigned images to add */}
                    {unassignedImages.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-neutral-500 mb-2">
                          Available ({unassignedImages.length}):
                        </p>
                        <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-1.5">
                          {paginatedUnassigned.map(img => (
                            <button
                              key={img.key}
                              onClick={() => toggleImageInSection(section.id, img.key)}
                              className="aspect-square rounded overflow-hidden border-2 border-dashed border-neutral-200 hover:border-primary-400 transition-colors"
                              aria-label={`Add ${img.alt || 'image'} to section`}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={getImageUrl(img.key, 'sm')}
                                alt={img.alt || ''}
                                className="w-full h-full object-cover opacity-60 hover:opacity-100 transition-opacity"
                                onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = getImageUrl(img.key); }}
                              />
                            </button>
                          ))}
                        </div>
                        {availableTotalPages > 1 && (
                          <div className="mt-2 flex items-center justify-between text-xs text-neutral-500">
                            <button
                              type="button"
                              onClick={() => setAvailablePage(p => Math.max(1, p - 1))}
                              disabled={effectiveAvailablePage <= 1}
                              className="hover:text-neutral-700 disabled:opacity-50"
                            >
                              Previous
                            </button>
                            <span>Page {effectiveAvailablePage} of {availableTotalPages}</span>
                            <button
                              type="button"
                              onClick={() => setAvailablePage(p => Math.min(availableTotalPages, p + 1))}
                              disabled={effectiveAvailablePage >= availableTotalPages}
                              className="hover:text-neutral-700 disabled:opacity-50"
                            >
                              Next
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {unassignedImages.length === 0 && sectionImages.length === 0 && (
                      <p className="text-xs text-neutral-400 text-center py-2">
                        All images are assigned to sections. Remove images from other sections to add them here.
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Save button - always show so deleting all sections can be persisted */}
      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving...' : 'Save Sections'}
        </button>
        <span className="text-xs text-neutral-400">
          {unassignedImages.length} unassigned {unassignedImages.length === 1 ? 'image' : 'images'}
        </span>
      </div>
    </div>
  );
}
