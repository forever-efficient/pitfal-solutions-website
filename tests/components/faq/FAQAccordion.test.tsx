import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FAQAccordion } from '@/components/faq/FAQAccordion';

const mockFAQItems = [
  {
    question: 'What is your pricing?',
    answer: 'Pricing varies based on the type of session.',
  },
  {
    question: 'How do I book a session?',
    answer: 'You can book through the contact form or by calling.',
  },
  {
    question: 'What should I wear?',
    answer: 'Wear something comfortable.\nAvoid busy patterns.',
  },
];

describe('FAQAccordion', () => {
  it('renders all FAQ questions', () => {
    render(<FAQAccordion items={mockFAQItems} />);

    mockFAQItems.forEach((item) => {
      expect(screen.getByText(item.question)).toBeInTheDocument();
    });
  });

  it('all items are collapsed by default', () => {
    render(<FAQAccordion items={mockFAQItems} />);

    const buttons = screen.getAllByRole('button');
    buttons.forEach((button) => {
      expect(button).toHaveAttribute('aria-expanded', 'false');
    });
  });

  it('expands an item when clicked', () => {
    render(<FAQAccordion items={mockFAQItems} />);

    const firstQuestion = screen.getByText('What is your pricing?');
    fireEvent.click(firstQuestion);

    expect(firstQuestion.closest('button')).toHaveAttribute('aria-expanded', 'true');
  });

  it('collapses an item when clicked again', () => {
    render(<FAQAccordion items={mockFAQItems} />);

    const firstButton = screen.getByText('What is your pricing?').closest('button')!;

    // Open
    fireEvent.click(firstButton);
    expect(firstButton).toHaveAttribute('aria-expanded', 'true');

    // Close
    fireEvent.click(firstButton);
    expect(firstButton).toHaveAttribute('aria-expanded', 'false');
  });

  it('only one item is expanded at a time', () => {
    render(<FAQAccordion items={mockFAQItems} />);

    const firstButton = screen.getByText('What is your pricing?').closest('button')!;
    const secondButton = screen.getByText('How do I book a session?').closest('button')!;

    // Open first
    fireEvent.click(firstButton);
    expect(firstButton).toHaveAttribute('aria-expanded', 'true');
    expect(secondButton).toHaveAttribute('aria-expanded', 'false');

    // Open second (first should close)
    fireEvent.click(secondButton);
    expect(firstButton).toHaveAttribute('aria-expanded', 'false');
    expect(secondButton).toHaveAttribute('aria-expanded', 'true');
  });

  it('handles multiline answers', () => {
    render(<FAQAccordion items={mockFAQItems} />);

    const thirdButton = screen.getByText('What should I wear?').closest('button')!;
    fireEvent.click(thirdButton);

    expect(screen.getByText('Wear something comfortable.')).toBeInTheDocument();
    expect(screen.getByText('Avoid busy patterns.')).toBeInTheDocument();
  });

  it('renders empty state when no items provided', () => {
    const { container } = render(<FAQAccordion items={[]} />);
    expect(container.querySelector('.space-y-4')).toBeEmptyDOMElement();
  });
});
