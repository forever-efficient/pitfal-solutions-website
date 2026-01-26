import { Metadata } from 'next';
import Link from 'next/link';
import { Container, Section } from '@/components/ui/Container';
import { Button } from '@/components/ui/Button';
import { ContactCTA } from '@/components/sections';

export const metadata: Metadata = {
  title: 'About',
  description:
    'Learn about Pitfal Solutions - Professional photography and videography services in Denver, Colorado. Our story, philosophy, and approach to capturing moments.',
};

export default function AboutPage() {
  return (
    <>
      {/* Hero */}
      <Section size="lg" className="pt-32 bg-neutral-50">
        <Container>
          <div className="max-w-3xl">
            <p className="text-primary-700 font-medium text-sm tracking-widest uppercase mb-3">
              About Us
            </p>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-neutral-900 mb-6 font-display">
              The Story Behind the Lens
            </h1>
            <p className="text-xl text-neutral-600">
              At Pitfal Solutions, we believe every image tells a story. We&apos;re
              passionate about capturing authentic moments that resonate and
              inspire.
            </p>
          </div>
        </Container>
      </Section>

      {/* Main content */}
      <Section size="lg" background="white">
        <Container>
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Image placeholder */}
            <figure
              className="aspect-[4/5] bg-neutral-200 rounded-2xl overflow-hidden relative"
              role="img"
              aria-label="Portrait of the Pitfal Solutions photographer"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary-500/20 to-primary-700/40" aria-hidden="true" />
              <div className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
                <span className="text-neutral-400 text-lg">Photographer Portrait</span>
              </div>
            </figure>

            {/* Content */}
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-6 font-display">
                Our Philosophy
              </h2>
              <div className="prose prose-lg text-neutral-600">
                <p>
                  Photography is more than just capturing images—it&apos;s about
                  preserving emotions, telling stories, and creating visual
                  narratives that stand the test of time.
                </p>
                <p>
                  Based in Aurora, Colorado, Pitfal Solutions brings a unique
                  perspective to every project. Our approach combines technical
                  excellence with creative vision, ensuring that every shot
                  captures the essence of the moment.
                </p>
                <p>
                  Whether it&apos;s a corporate brand shoot, an intimate portrait
                  session, or documenting a special event, we bring the same
                  level of dedication and artistry to every project.
                </p>
              </div>

              <div className="mt-8">
                <Button asChild>
                  <Link href="/contact">Work With Us</Link>
                </Button>
              </div>
            </div>
          </div>
        </Container>
      </Section>

      {/* Values */}
      <Section size="lg" background="light">
        <Container>
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-4 font-display">
              What Drives Us
            </h2>
            <p className="text-lg text-neutral-600">
              Our values guide everything we do, from the first consultation to
              the final delivery.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: 'Authenticity',
                description:
                  'We capture real moments and genuine emotions. No forced poses, no fake smiles—just authentic imagery that tells your true story.',
                icon: (
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                ),
              },
              {
                title: 'Excellence',
                description:
                  'We never compromise on quality. Every image is carefully crafted, edited, and delivered to meet the highest professional standards.',
                icon: (
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                ),
              },
              {
                title: 'Connection',
                description:
                  'We build relationships with our clients, understanding their vision and creating a comfortable environment for the best results.',
                icon: (
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                ),
              },
            ].map((value) => (
              <div key={value.title} className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-100 text-primary-600 mb-4">
                  {value.icon}
                </div>
                <h3 className="text-xl font-semibold text-neutral-900 mb-2">
                  {value.title}
                </h3>
                <p className="text-neutral-600">{value.description}</p>
              </div>
            ))}
          </div>
        </Container>
      </Section>

      {/* Tagline section */}
      <Section size="md" background="white">
        <Container>
          <div className="text-center">
            <p className="text-2xl md:text-3xl font-display italic text-neutral-700">
              &quot;Swing the Gap&quot;
            </p>
            <p className="mt-4 text-neutral-500">
              Our motto reminds us to bridge the gap between vision and reality,
              between the moment and its preservation.
            </p>
          </div>
        </Container>
      </Section>

      <ContactCTA />
    </>
  );
}
