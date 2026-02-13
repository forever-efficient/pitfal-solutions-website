interface SectionDividerProps {
  title: string;
  description?: string;
  imageCount?: number;
}

export function SectionDivider({ title, description, imageCount }: SectionDividerProps) {
  return (
    <div className="py-8 md:py-12 first:pt-0">
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <h2 className="font-display text-2xl md:text-3xl font-bold text-neutral-900">
            {title}
          </h2>
          {description && (
            <p className="text-neutral-600 mt-1 max-w-2xl">{description}</p>
          )}
        </div>
        {imageCount !== undefined && (
          <span className="text-sm text-neutral-400 whitespace-nowrap">
            {imageCount} {imageCount === 1 ? 'photo' : 'photos'}
          </span>
        )}
      </div>
      <div className="border-b border-neutral-200" aria-hidden="true" />
    </div>
  );
}
