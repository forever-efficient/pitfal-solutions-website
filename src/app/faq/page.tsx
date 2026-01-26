import { Metadata } from 'next';
import Link from 'next/link';
import { Container, Section } from '@/components/ui/Container';
import { Button } from '@/components/ui/Button';
import { FAQAccordion } from '@/components/faq/FAQAccordion';
import faqData from '../../../content/faq.json';

export const metadata: Metadata = {
  title: 'FAQ',
  description:
    'Frequently asked questions about Pitfal Solutions photography and videography services. Learn about our process, pricing, and what to expect.',
};

export default function FAQPage() {
  return (
    <>
      {/* Hero */}
      <Section size="lg" className="pt-32 bg-neutral-50">
        <Container>
          <div className="max-w-3xl">
            <p className="text-primary-700 font-medium text-sm tracking-widest uppercase mb-3">
              FAQ
            </p>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-neutral-900 mb-6 font-display">
              Frequently Asked Questions
            </h1>
            <p className="text-xl text-neutral-600">
              Find answers to common questions about our services, booking
              process, and what to expect during your session.
            </p>
          </div>
        </Container>
      </Section>

      {/* FAQ Content */}
      <Section size="lg" background="white">
        <Container size="md">
          {faqData.categories.map((category) => (
            <div key={category.name} className="mb-12 last:mb-0">
              <h2 className="text-2xl font-bold text-neutral-900 mb-6 font-display">
                {category.name}
              </h2>
              <FAQAccordion items={category.questions} />
            </div>
          ))}
        </Container>
      </Section>

      {/* Still have questions */}
      <Section size="lg" background="light">
        <Container>
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 mb-4 font-display">
              Still Have Questions?
            </h2>
            <p className="text-lg text-neutral-600 mb-6">
              Can&apos;t find what you&apos;re looking for? We&apos;re here to help.
              Reach out and we&apos;ll get back to you as soon as possible.
            </p>
            <Button asChild>
              <Link href="/contact">Contact Us</Link>
            </Button>
          </div>
        </Container>
      </Section>
    </>
  );
}
