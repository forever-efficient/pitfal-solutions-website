import { Metadata } from 'next';
import Link from 'next/link';
import { Container, Section } from '@/components/ui/Container';
import { ContactCTA } from '@/components/sections';
import { HeartIcon, ShieldCheckIcon, UsersIcon } from '@/components/icons';
import { BUSINESS, PAGE_META } from '@/lib/constants';

export const metadata: Metadata = {
  title: PAGE_META.about.title,
  description: PAGE_META.about.description,
};

export default function AboutPage() {
  return (
    <>
      {/* Hero */}
      <Section size="lg" className="pt-32 bg-neutral-50">
        <Container>
          <div className="max-w-3xl">
            <p className="text-primary-700 font-medium text-sm tracking-widest uppercase mb-3">
              About
            </p>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-neutral-900 mb-6 font-display">
              The Story Behind the Lens
            </h1>
            <p className="text-xl text-neutral-600">
              At Pitfal Solutions, story telling is a passion. Here, it&apos;s all 
              about capturing authentic moments that resonate and
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
                The Philosophy
              </h2>
              <div className="prose prose-lg text-neutral-600">
                <p>
                  Photography is more than just capturing images—it&apos;s about
                  preserving emotions, telling stories, and creating visual
                  narratives that stand the test of time.
                </p>
                <p>
                  Based in Denver, Colorado, Pitfal Solutions brings a unique
                  perspective to every project. Combining technical
                  excellence with creative vision ensures you get the highest quality
                  when those fleeting moments are on the line.
                </p>
                <p>
                  Whether it&apos;s a corporate brand shoot, an intimate portrait
                  session, or documenting a special event, the same
                  level of dedication and artistry is brought to every project.
                </p>
              </div>

              <div className="mt-8">
                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500 shadow-sm hover:shadow-md text-base px-4 py-2 rounded-lg"
                >
                  Contact Today
                </Link>
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
              The Mission
            </h2>
            <p className="text-lg text-neutral-600">
              Core values guide project and every deliverable, from the first consultation to
              the final delivery.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: 'Authenticity',
                description:
                  'Capturing real moments and genuine emotions. Not forced or fake—just authentic imagery that tells your true story.',
                icon: <HeartIcon size={32} strokeWidth={1.5} />,
              },
              {
                title: 'Excellence',
                description:
                  'Never compromise on quality. Every image is carefully crafted, edited, and delivered to meet the highest professional standards.',
                icon: <ShieldCheckIcon size={32} strokeWidth={1.5} />,
              },
              {
                title: 'Connection',
                description:
                  'Building relationships with our clients, understanding their vision and creating a comfortable environment for the best results.',
                icon: <UsersIcon size={32} strokeWidth={1.5} />,
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
              &quot;{BUSINESS.tagline}&quot;
            </p>
            <p className="mt-4 text-neutral-500">
              This motto is a reminder to bridge the gap between vision and reality,
              between the moment and its preservation.
            </p>
          </div>
        </Container>
      </Section>

      <ContactCTA />
    </>
  );
}
