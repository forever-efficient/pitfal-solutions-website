import { Metadata } from 'next';
import { Container, Section } from '@/components/ui/Container';
import { ContactForm } from '@/components/forms/ContactForm';

export const metadata: Metadata = {
  title: 'Contact',
  description:
    'Get in touch with Pitfal Solutions for photography and videography inquiries. Based in Aurora, Colorado, serving the Denver metro area.',
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
              Let&apos;s Create Something Beautiful
            </h1>
            <p className="text-xl text-neutral-600">
              Have a project in mind? We&apos;d love to hear from you. Fill out the
              form below and we&apos;ll get back to you within 24-48 hours.
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
                  Aurora, Colorado
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
                  href="mailto:info@pitfal.solutions"
                  className="text-primary-600 hover:underline"
                >
                  info@pitfal.solutions
                </a>
              </div>

              {/* Phone */}
              <div>
                <h3 className="text-lg font-semibold text-neutral-900 mb-3">
                  Phone
                </h3>
                <a
                  href="tel:+13035551234"
                  className="text-primary-600 hover:underline"
                >
                  (303) 555-1234
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
                    href="https://instagram.com/pitfalsolutions"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-neutral-500 hover:text-primary-600 transition-colors"
                    aria-label="Instagram"
                  >
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" />
                    </svg>
                  </a>
                  <a
                    href="https://facebook.com/pitfalsolutions"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-neutral-500 hover:text-primary-600 transition-colors"
                    aria-label="Facebook"
                  >
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
                    </svg>
                  </a>
                  <a
                    href="https://linkedin.com/company/pitfalsolutions"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-neutral-500 hover:text-primary-600 transition-colors"
                    aria-label="LinkedIn"
                  >
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                    </svg>
                  </a>
                </div>
              </div>

              {/* Response time */}
              <div className="bg-primary-50 rounded-lg p-4">
                <p className="text-sm text-primary-800">
                  <strong>Quick response:</strong> We typically respond to
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
