import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TestimonialsSection } from '@/components/sections/TestimonialsSection';

// Mock the testimonials data
vi.mock('@/../content/testimonials.json', () => ({
  default: {
    testimonials: [
      {
        id: '1',
        name: 'John Doe',
        role: 'CEO',
        company: 'Test Corp',
        content: 'Great photography service!',
        image: '/images/testimonials/john.jpg',
        rating: 5,
        featured: true,
      },
      {
        id: '2',
        name: 'Jane Smith',
        role: 'Marketing Director',
        company: 'Brand Co',
        content: 'Excellent work and professionalism.',
        image: '/images/testimonials/jane.jpg',
        rating: 4,
        featured: false,
      },
      {
        id: '3',
        name: 'Bob Wilson',
        role: 'Event Planner',
        company: 'Events Inc',
        content: 'Captured every moment perfectly.',
        image: '/images/testimonials/bob.jpg',
        rating: 5,
        featured: false,
      },
    ],
  },
}));

describe('TestimonialsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the section header', () => {
    render(<TestimonialsSection />);
    expect(screen.getByText('Testimonials')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'What Our Clients Say' })).toBeInTheDocument();
  });

  it('renders the first testimonial by default', () => {
    render(<TestimonialsSection />);
    expect(screen.getByText('"Great photography service!"')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText(/CEO, Test Corp/)).toBeInTheDocument();
  });

  it('shows next testimonial when clicking next button', () => {
    render(<TestimonialsSection />);

    const nextButton = screen.getByRole('button', { name: /next testimonial/i });
    fireEvent.click(nextButton);

    expect(screen.getByText('"Excellent work and professionalism."')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
  });

  it('shows previous testimonial when clicking prev button', () => {
    render(<TestimonialsSection />);

    // Go to second testimonial first
    const nextButton = screen.getByRole('button', { name: /next testimonial/i });
    fireEvent.click(nextButton);

    // Then go back
    const prevButton = screen.getByRole('button', { name: /previous testimonial/i });
    fireEvent.click(prevButton);

    expect(screen.getByText('"Great photography service!"')).toBeInTheDocument();
  });

  it('wraps around to last testimonial when going prev from first', () => {
    render(<TestimonialsSection />);

    const prevButton = screen.getByRole('button', { name: /previous testimonial/i });
    fireEvent.click(prevButton);

    expect(screen.getByText('"Captured every moment perfectly."')).toBeInTheDocument();
  });

  it('wraps around to first testimonial when going next from last', () => {
    render(<TestimonialsSection />);

    const nextButton = screen.getByRole('button', { name: /next testimonial/i });
    fireEvent.click(nextButton);
    fireEvent.click(nextButton);
    fireEvent.click(nextButton);

    expect(screen.getByText('"Great photography service!"')).toBeInTheDocument();
  });

  it('renders navigation dots for each testimonial', () => {
    render(<TestimonialsSection />);

    const dots = screen.getAllByRole('tab');
    expect(dots).toHaveLength(3);
  });

  it('changes testimonial when clicking navigation dot', () => {
    render(<TestimonialsSection />);

    const dots = screen.getAllByRole('tab');
    fireEvent.click(dots[1]);

    expect(screen.getByText('"Excellent work and professionalism."')).toBeInTheDocument();
  });

  it('renders star rating', () => {
    render(<TestimonialsSection />);

    // First testimonial has 5 stars
    const stars = document.querySelectorAll('.text-accent-500');
    expect(stars.length).toBeGreaterThanOrEqual(5);
  });

  it('renders author initial in avatar', () => {
    render(<TestimonialsSection />);

    // John Doe's initial
    expect(screen.getByText('J')).toBeInTheDocument();
  });

  it('renders QuoteIcon', () => {
    render(<TestimonialsSection />);

    // QuoteIcon should be present
    const quoteIcon = document.querySelector('.text-primary-100');
    expect(quoteIcon).toBeInTheDocument();
  });

  it('has proper aria labels for carousel', () => {
    render(<TestimonialsSection />);

    const carousel = screen.getByRole('region', { name: /client testimonials/i });
    expect(carousel).toBeInTheDocument();

    const slide = screen.getByRole('group');
    expect(slide).toHaveAttribute('aria-label', expect.stringContaining('Testimonial 1 of 3'));
  });

  it('navigates with ArrowRight key when carousel is focused', () => {
    render(<TestimonialsSection />);

    // Focus the carousel slide
    const slide = screen.getByRole('group');
    slide.focus();

    // Simulate ArrowRight
    fireEvent.keyDown(window, { key: 'ArrowRight' });

    expect(screen.getByText('"Excellent work and professionalism."')).toBeInTheDocument();
  });

  it('navigates with ArrowLeft key when carousel is focused', () => {
    render(<TestimonialsSection />);

    // Focus the carousel slide
    const slide = screen.getByRole('group');
    slide.focus();

    // ArrowLeft from first should wrap to last
    fireEvent.keyDown(window, { key: 'ArrowLeft' });

    expect(screen.getByText('"Captured every moment perfectly."')).toBeInTheDocument();
  });

  it('does not navigate with arrow keys when carousel is not focused', () => {
    render(<TestimonialsSection />);

    // Don't focus the carousel — fire event on window
    fireEvent.keyDown(window, { key: 'ArrowRight' });

    // Should still show first testimonial
    expect(screen.getByText('"Great photography service!"')).toBeInTheDocument();
  });

  it('updates slide aria-label when navigating', () => {
    render(<TestimonialsSection />);

    const nextButton = screen.getByRole('button', { name: /next testimonial/i });
    fireEvent.click(nextButton);

    const slide = screen.getByRole('group');
    expect(slide).toHaveAttribute('aria-label', expect.stringContaining('Testimonial 2 of 3'));
  });

  it('renders correct number of filled vs unfilled stars for rating', () => {
    render(<TestimonialsSection />);

    // Navigate to second testimonial (rating: 4)
    const nextButton = screen.getByRole('button', { name: /next testimonial/i });
    fireEvent.click(nextButton);

    const filledStars = document.querySelectorAll('.text-accent-500');
    const unfilledStars = document.querySelectorAll('.text-neutral-300');
    expect(filledStars.length).toBe(4);
    expect(unfilledStars.length).toBe(1);
  });

  it('navigation dots reflect active tab with aria-selected', () => {
    render(<TestimonialsSection />);

    const dots = screen.getAllByRole('tab');
    expect(dots[0]).toHaveAttribute('aria-selected', 'true');
    expect(dots[1]).toHaveAttribute('aria-selected', 'false');

    fireEvent.click(dots[2]);
    expect(dots[0]).toHaveAttribute('aria-selected', 'false');
    expect(dots[2]).toHaveAttribute('aria-selected', 'true');
  });
});
