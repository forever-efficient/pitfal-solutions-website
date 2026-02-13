'use client';

interface SectionNavProps {
  sections: Array<{ id: string; title: string }>;
  activeId?: string;
}

export function SectionNav({ sections, activeId }: SectionNavProps) {
  if (sections.length === 0) return null;

  return (
    <nav aria-label="Gallery sections" className="mb-8">
      <div className="flex flex-wrap gap-2">
        {sections.map((section) => (
          <a
            key={section.id}
            href={`#section-${section.id}`}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors duration-200 ${
              activeId === section.id
                ? 'bg-neutral-900 text-white'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 hover:text-neutral-900'
            }`}
          >
            {section.title}
          </a>
        ))}
      </div>
    </nav>
  );
}
