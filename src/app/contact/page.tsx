import { Metadata } from 'next';
import { Container, Section } from '@/components/ui/Container';
import { ContactForm } from '@/components/forms/ContactForm';
import { InstagramIcon, FacebookIcon, LinkedInIcon } from '@/components/icons';
import { BUSINESS, PAGE_META } from '@/lib/constants';

export const metadata: Metadata = {
  title: PAGE_META.contact.title,
  description: PAGE_META.contact.description,
};

export default function ContactPage() {
  return (
    <>
      {/* Hero */}
      <Section size="lg" className="pt-32 bg-neutral-50">
        <Container>
          <div className="max-w-3xl">
            <p className="text-primary-700 font-medium text-sm tracking-widest uppercase mb-3">
              Get in Touch
            </p>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-neutral-900 mb-6 font-display">
              Let&apos;s Capture Your Story Together
            </h1>
            <p className="text-xl text-neutral-600">
              Have a project in mind? Need to know more? Fill out the
              form below and you&apos;ll hear back within 24-48 hours.
            </p>
          </div>
        </Container>
      </Section>

      {/* Contact form section */}
      <Section size="lg" background="white">
        <Container>
          <div className="grid lg:grid-cols-3 gap-12">
            {/* Form */}
            <div className="lg:col-span-2">
              <ContactForm />
            </div>

            {/* Contact info */}
            <div className="space-y-8">
              {/* Location */}
              <div>
                <h3 className="text-lg font-semibold text-neutral-900 mb-3">
                  Location
                </h3>
                <p className="text-neutral-600">
                  {BUSINESS.location.full}
                  <br />
                  Serving the Denver Metro Area
                </p>
              </div>

              {/* Email */}
              <div>
                <h3 className="text-lg font-semibold text-neutral-900 mb-3">
                  Email
                </h3>
                <a
                  href={`mailto:${BUSINESS.contact.email}`}
                  className="text-primary-600 hover:underline"
                >
                  {BUSINESS.contact.email}
                </a>
              </div>

              {/* Phone */}
              <div>
                <h3 className="text-lg font-semibold text-neutral-900 mb-3">
                  Phone
                </h3>
                <a
                  href={`tel:${BUSINESS.contact.phone.replace(/[^+\d]/g, '')}`}
                  className="text-primary-600 hover:underline"
                >
                  {BUSINESS.contact.phone}
                </a>
              </div>

              {/* Hours */}
              <div>
                <h3 className="text-lg font-semibold text-neutral-900 mb-3">
                  Business Hours
                </h3>
                <ul className="text-neutral-600 space-y-1">
                  <li>Monday - Friday: 9am - 6pm</li>
                  <li>Saturday: 10am - 4pm</li>
                  <li>Sunday: By appointment</li>
                </ul>
              </div>

              {/* Social */}
              <div>
                <h3 className="text-lg font-semibold text-neutral-900 mb-3">
                  Follow Us
                </h3>
                <div className="flex gap-4">
                  <a
                    href={BUSINESS.social.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-neutral-500 hover:text-primary-600 transition-colors"
                    aria-label="Instagram"
                  >
                    <InstagramIcon size={24} title="Instagram" />
                  </a>
                  <a
                    href={BUSINESS.social.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-neutral-500 hover:text-primary-600 transition-colors"
                    aria-label="Facebook"
                  >
                    <FacebookIcon size={24} title="Facebook" />
                  </a>
                  <a
                    href={BUSINESS.social.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-neutral-500 hover:text-primary-600 transition-colors"
                    aria-label="LinkedIn"
                  >
                    <LinkedInIcon size={24} title="LinkedIn" />
                  </a>
                </div>
              </div>

              {/* Response time */}
              <div className="bg-primary-50 rounded-lg p-4">
                <p className="text-sm text-primary-800">
                  <strong>Quick response:</strong> Typical response to
                  inquiries within 24-48 hours during business days.
                </p>
              </div>
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}
