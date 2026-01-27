import Link from 'next/link';
import { Container, Section } from '@/components/ui/Container';
import { EmailIcon, PhoneIcon, LocationIcon } from '@/components/icons';
import { BUSINESS, COPY } from '@/lib/constants';

export function ContactCTA() {
  return (
    <Section size="lg" background="transparent" className="bg-slate-700/90">
      <Container>
        <div className="text-center max-w-3xl mx-auto">
          {/* Content */}
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6 font-display">
            Ready to Capture Your Story?
          </h2>
          <p className="text-lg md:text-xl text-white/90 mb-8">
            {COPY.cta.contact.description}
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/contact"
              className="inline-flex items-center justify-center font-medium text-lg px-8 py-4 rounded-lg bg-primary-600 text-white hover:bg-primary-700 shadow-sm hover:shadow-md transition-all duration-200 min-w-[180px]"
            >
              {COPY.cta.contact.button}
            </Link>
            <Link
              href="/services"
              className="inline-flex items-center justify-center font-medium text-lg px-8 py-4 rounded-lg border-2 border-white text-white hover:bg-white/10 transition-all duration-200 min-w-[180px]"
            >
              View Packages
            </Link>
          </div>

          {/* Contact info */}
          <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-6 text-white/80">
            <a
              href={`mailto:${BUSINESS.contact.email}`}
              className="flex items-center gap-2 hover:text-white transition-colors"
            >
              <EmailIcon size={20} />
              {BUSINESS.contact.email}
            </a>
            <span className="hidden sm:block">|</span>
            <a
              href={`tel:${BUSINESS.contact.phone.replace(/[^+\d]/g, '')}`}
              className="flex items-center gap-2 hover:text-white transition-colors"
            >
              <PhoneIcon size={20} />
              {BUSINESS.contact.phone}
            </a>
            <span className="hidden sm:block">|</span>
            <span className="flex items-center gap-2">
              <LocationIcon size={20} />
              {BUSINESS.location.full}
            </span>
          </div>
        </div>
      </Container>
    </Section>
  );
}
