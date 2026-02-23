'use client';

import { type GallerySection } from '@/lib/api';

interface ClientSectionNavProps {
    sections: GallerySection[];
    activeId: string | null;
    collapsedSections: Set<string>;
    onToggleCollapse: (id: string) => void;
}

export function ClientSectionNav({
    sections,
    activeId,
    collapsedSections,
    onToggleCollapse
}: ClientSectionNavProps) {
    if (sections.length === 0) return null;

    // Add "Other Photos" if there are any unassigned images 
    // (In ClientGalleryView, we check for unassigned, so we should probably pass it if it exists)
    // For now, let's just handle the sections passed.

    return (
        <nav aria-label="Gallery sections" className="flex items-center gap-1 overflow-x-auto py-3 scrollbar-hide">
            {sections.map((section) => {
                const isActive = activeId === section.id;
                const isCollapsed = collapsedSections.has(section.id);

                return (
                    <div key={section.id} className="flex items-center gap-1 shrink-0">
                        <a
                            href={`#section-${section.id}`}
                            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${isActive
                                ? 'bg-neutral-900 text-white shadow-md scale-105'
                                : 'bg-white/50 text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 border border-neutral-200'
                                }`}
                            onClick={(e) => {
                                e.preventDefault();
                                const el = document.getElementById(`section-${section.id}`);
                                if (el) {
                                    const yOffset = -120; // Accounting for sticky headers
                                    const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
                                    window.scrollTo({ top: y, behavior: 'smooth' });
                                }
                            }}
                        >
                            {section.title}
                        </a>
                        <button
                            onClick={() => onToggleCollapse(section.id)}
                            className={`p-1.5 rounded-full hover:bg-neutral-100 transition-colors ${isCollapsed ? 'text-primary-600 bg-neutral-100' : 'text-neutral-400'
                                }`}
                            title={isCollapsed ? "Expand section" : "Collapse section"}
                        >
                            <svg
                                className={`w-4 h-4 transition-transform duration-300 ${isCollapsed ? '-rotate-90' : ''}`}
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>
                        <div className="w-px h-4 bg-neutral-200 mx-1 last:hidden" />
                    </div>
                );
            })}
        </nav>
    );
}
