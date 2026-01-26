'use client';

import { useState, useCallback, useEffect } from 'react';
import { Container, Section } from '@/components/ui/Container';
import { cn } from '@/lib/utils';
import testimonialsData from '@/../content/testimonials.json';

interface Testimonial {
  id: string;
  name: string;
  role: string;
  company: string;
  content: string;
  image: string;
  rating: number;
  featured?: boolean;
}

const testimonials: Testimonial[] = testimonialsData.testimonials;

export function TestimonialsSection() {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeTestimonial = testimonials[activeIndex] ?? testimonials[0]!;

  const goToNext = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % testimonials.length);
  }, []);

  const goToPrev = useCallback(() => {
    setActiveIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if the carousel or its children are focused
      const carousel = document.getElementById('testimonials-carousel');
      if (!carousel?.contains(document.activeElement)) return;

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        goToNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goToPrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToNext, goToPrev]);

  return (
    <Section size="lg" background="light">
      <Container>
        {/* Section header */}
        <div className="text-center max-w-3xl mx-auto mb-12 md:mb-16">
          <p className="text-primary-700 font-medium text-sm tracking-widest uppercase mb-3">
            Testimonials
          </p>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-neutral-900 mb-4 font-display">
            What Our Clients Say
          </h2>
        </div>

        {/* Testimonials carousel */}
        <div
          id="testimonials-carousel"
          className="max-w-4xl mx-auto"
          role="region"
          aria-roledescription="carousel"
          aria-label="Client testimonials"
        >
          {/* Active testimonial */}
          <div
            className="bg-white rounded-2xl shadow-lg p-8 md:p-12 relative"
            role="group"
            aria-roledescription="slide"
            aria-label={`Testimonial ${activeIndex + 1} of ${testimonials.length}`}
            aria-live="polite"
            tabIndex={0}
          >
            {/* Quote icon */}
            <svg
              className="absolute top-6 left-6 w-12 h-12 text-primary-100"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
            </svg>

            <div className="relative">
              {/* Content */}
              <blockquote className="text-xl md:text-2xl text-neutral-700 leading-relaxed mb-8">
                &quot;{activeTestimonial.content}&quot;
              </blockquote>

              {/* Author */}
              <div className="flex items-center gap-4">
                {/* Avatar placeholder */}
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-xl font-semibold">
                  {activeTestimonial.name.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-neutral-900">
                    {activeTestimonial.name}
                  </p>
                  <p className="text-neutral-600 text-sm">
                    {activeTestimonial.role}
                    {activeTestimonial.company &&
                      `, ${activeTestimonial.company}`}
                  </p>
                </div>

                {/* Rating */}
                <div className="ml-auto flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <svg
                      key={i}
                      className={cn(
                        'w-5 h-5',
                        i < activeTestimonial.rating
                          ? 'text-accent-500'
                          : 'text-neutral-300'
                      )}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Navigation controls */}
          <div className="flex justify-center items-center gap-4 mt-8">
            <button
              onClick={goToPrev}
              className="p-2 rounded-full bg-neutral-100 hover:bg-neutral-200 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
              aria-label="Previous testimonial"
            >
              <svg className="w-5 h-5 text-neutral-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            {/* Navigation dots */}
            <div className="flex gap-2" role="tablist" aria-label="Testimonial navigation">
              {testimonials.map((testimonial, index) => (
                <button
                  key={testimonial.id}
                  role="tab"
                  aria-selected={index === activeIndex}
                  aria-controls="testimonials-carousel"
                  onClick={() => setActiveIndex(index)}
                  className={cn(
                    'w-3 h-3 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
                    index === activeIndex
                      ? 'bg-primary-600 w-8'
                      : 'bg-neutral-300 hover:bg-neutral-400'
                  )}
                  aria-label={`Go to testimonial from ${testimonial.name}`}
                />
              ))}
            </div>

            <button
              onClick={goToNext}
              className="p-2 rounded-full bg-neutral-100 hover:bg-neutral-200 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
              aria-label="Next testimonial"
            >
              <svg className="w-5 h-5 text-neutral-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </Container>
    </Section>
  );
}
