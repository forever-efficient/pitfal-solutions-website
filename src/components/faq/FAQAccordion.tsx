'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { ChevronDownIcon } from '@/components/icons';

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQAccordionProps {
  items: FAQItem[];
}

const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;

function renderMarkdownLinks(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = linkRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push(
      <Link key={match.index} href={match[2]!} className="text-accent hover:underline">
        {match[1]}
      </Link>
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

export function FAQAccordion({ items }: FAQAccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleItem = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="space-y-4">
      {items.map((item, index) => (
        <div
          key={item.question}
          className="border border-neutral-200 rounded-lg overflow-hidden"
        >
          <button
            onClick={() => toggleItem(index)}
            className="w-full flex items-center justify-between p-4 text-left bg-white hover:bg-neutral-50 transition-colors"
            aria-expanded={openIndex === index}
          >
            <span className="font-medium text-neutral-900 pr-4">
              {item.question}
            </span>
            <ChevronDownIcon
              size={20}
              className={cn(
                'text-neutral-500 flex-shrink-0 transition-transform duration-200',
                openIndex === index && 'rotate-180'
              )}
            />
          </button>

          <div
            className={cn(
              'overflow-hidden transition-all duration-200',
              openIndex === index ? 'max-h-[1000px]' : 'max-h-0'
            )}
          >
            <div className="p-4 pt-0 text-neutral-600 prose prose-sm max-w-none">
              {item.answer.split('\n').map((paragraph, i) => (
                <p key={i} className={i > 0 ? 'mt-2' : ''}>
                  {renderMarkdownLinks(paragraph)}
                </p>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
