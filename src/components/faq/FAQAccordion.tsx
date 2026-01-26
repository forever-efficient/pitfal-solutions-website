'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDownIcon } from '@/components/icons';

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQAccordionProps {
  items: FAQItem[];
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
          key={index}
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
              openIndex === index ? 'max-h-96' : 'max-h-0'
            )}
          >
            <div className="p-4 pt-0 text-neutral-600 prose prose-sm max-w-none">
              {item.answer.split('\n').map((paragraph, i) => (
                <p key={i} className={i > 0 ? 'mt-2' : ''}>
                  {paragraph}
                </p>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
