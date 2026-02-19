import { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Container, Section } from '@/components/ui/Container';
import { ContactCTA } from '@/components/sections';
import { HeartIcon, ShieldCheckIcon, UsersIcon } from '@/components/icons';
import { BUSINESS, PAGE_META, SITE_IMAGES } from '@/lib/constants';
import { getImageUrl } from '@/lib/utils';

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
              Built on Vision
            </h1>
            <p className="text-xl text-neutral-600">
              At Pitfal Solutions, problem solving is a passion. Whether through a lens,
              a drone, or a line of code — it&apos;s all about creating work that resonates and inspires.
            </p>
          </div>
        </Container>
      </Section>

      {/* Main content */}
      <Section size="lg" background="white">
        <Container>
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Photographer portrait */}
            <figure className="aspect-[4/5] bg-neutral-200 rounded-2xl overflow-hidden relative">
              <Image
                src={getImageUrl(SITE_IMAGES.about)}
                alt="Portrait of the Pitfal Solutions photographer"
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
              />
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
                  className="inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 bg-primary-700 text-white hover:bg-primary-800 focus:ring-primary-500 shadow-sm hover:shadow-md text-base px-4 py-2 rounded-lg"
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
              These core values guide every project and every deliverable — from the first
              consultation to the final delivery.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: 'Authenticity',
                description:
                  'Every project starts with listening. The goal is always to understand your vision and deliver work that genuinely represents you — not a generic template.',
                icon: <HeartIcon size={32} strokeWidth={1.5} />,
              },
              {
                title: 'Excellence',
                description:
                  'Quality is non-negotiable across every service. Whether it\'s a photo, a video, aerial footage, or a software build — every deliverable is held to the highest standard.',
                icon: <ShieldCheckIcon size={32} strokeWidth={1.5} />,
              },
              {
                title: 'Partnership',
                description:
                  'Great results come from collaboration. Building real relationships with clients means understanding their goals and staying invested from kickoff through delivery.',
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
              This motto is a reminder to bridge the gap between vision and 
              reality, overcoming all obstacles.
            </p>
          </div>
        </Container>
      </Section>

      <ContactCTA />
    </>
  );
}
