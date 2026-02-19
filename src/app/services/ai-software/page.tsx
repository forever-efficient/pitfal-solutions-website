import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { Container, Section } from '@/components/ui/Container';
import { ContactCTA } from '@/components/sections';
import { Button } from '@/components/ui/Button';
import { CheckIcon } from '@/components/icons';
import { SERVICES, PAGE_META } from '@/lib/constants';
import { getImageUrl } from '@/lib/utils';

export const metadata: Metadata = {
  title: PAGE_META.servicesAI.title,
  description: PAGE_META.servicesAI.description,
};

const service = SERVICES.ai;

export default function AISoftwarePage() {
  return (
    <>
      {/* Hero */}
      <Section size="lg" className="pt-32 bg-neutral-50">
        <Container>
          <div className="max-w-3xl">
            <p className="text-primary-700 font-medium text-sm tracking-widest uppercase mb-3">
              Services
            </p>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-neutral-900 mb-6 font-display">
              {service.title}
            </h1>
            <p className="text-xl text-neutral-600 mb-8">
              {service.description}
            </p>
            <div className="flex flex-wrap gap-4">
              <Button asChild>
                <Link href="/contact">Start a Conversation</Link>
              </Button>
            </div>
          </div>
        </Container>
      </Section>

      {/* What's included */}
      <Section size="lg" background="white">
        <Container>
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="aspect-[4/3] bg-neutral-200 rounded-2xl overflow-hidden relative">
              <Image
                src={getImageUrl(service.image)}
                alt={service.title}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
                priority
              />
            </div>

            {/* Content */}
            <div>
              <h2 className="text-3xl font-bold text-neutral-900 mb-4 font-display">
                What&apos;s Included
              </h2>
              <p className="text-neutral-600 mb-8 leading-relaxed">
                Identifying where AI and custom software can create real leverage —
                whether that means integrating an LLM into a workflow, building a
                website from scratch, or prototyping an intelligent tool. Practical,
                production-ready solutions, delivered.
              </p>

              <ul className="space-y-3">
                {service.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-3">
                    <CheckIcon size={20} className="text-primary-600 flex-shrink-0" />
                    <span className="text-neutral-700">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Container>
      </Section>

      {/* Process */}
      <Section size="lg" background="light">
        <Container>
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-neutral-900 font-display">
              The Process
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                step: '01',
                title: 'Discovery',
                description: 'Starting with a conversation to understand the business, goals, and where technology can create the most impact.',
              },
              {
                step: '02',
                title: 'Design & Build',
                description: 'A solution tailored to specific needs — from a simple AI integration to a full custom application.',
              },
              {
                step: '03',
                title: 'Deliver & Support',
                description: 'Production-ready work delivered with documentation, with ongoing availability for questions and iterations.',
              },
            ].map((item) => (
              <div key={item.step} className="bg-white rounded-xl p-6 shadow-sm border border-neutral-100">
                <p className="text-primary-600 font-bold text-sm tracking-widest mb-2">{item.step}</p>
                <h3 className="text-lg font-semibold text-neutral-900 mb-2">{item.title}</h3>
                <p className="text-neutral-600 text-sm leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </Container>
      </Section>

      {/* Pricing placeholder */}
      <Section size="md" background="white">
        <Container size="sm">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-neutral-900 mb-4 font-display">
              Pricing
            </h2>
            <p className="text-neutral-600 mb-2">
              Every engagement is scoped and priced based on your specific needs.
            </p>
            <p className="text-neutral-500 text-sm mb-8">
              Detailed pricing coming soon — reach out to discuss your project.
            </p>
            <Button asChild>
              <Link href="/contact">Start a Conversation</Link>
            </Button>
          </div>
        </Container>
      </Section>

      <ContactCTA />
    </>
  );
}
