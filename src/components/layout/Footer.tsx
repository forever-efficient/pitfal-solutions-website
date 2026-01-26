import Link from 'next/link';
import { Container } from '@/components/ui/Container';
import { InstagramIcon, FacebookIcon, LinkedInIcon } from '@/components/icons';

const footerLinks = {
  services: [
    { label: 'Brand Photography', href: '/services#brand' },
    { label: 'Portraits', href: '/services#portraits' },
    { label: 'Events', href: '/services#events' },
    { label: 'Commercial', href: '/services#commercial' },
  ],
  company: [
    { label: 'About', href: '/about' },
    { label: 'Portfolio', href: '/portfolio' },
    { label: 'Blog', href: '/blog' },
    { label: 'FAQ', href: '/faq' },
  ],
  legal: [
    { label: 'Privacy Policy', href: '/privacy' },
    { label: 'Terms of Service', href: '/terms' },
  ],
};

const socialLinks = [
  {
    label: 'Instagram',
    href: 'https://instagram.com/pitfalsolutions',
    icon: <InstagramIcon size={20} />,
  },
  {
    label: 'Facebook',
    href: 'https://facebook.com/pitfalsolutions',
    icon: <FacebookIcon size={20} />,
  },
  {
    label: 'LinkedIn',
    href: 'https://linkedin.com/company/pitfalsolutions',
    icon: <LinkedInIcon size={20} />,
  },
];

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-neutral-900 text-white">
      <Container size="xl" className="py-12 md:py-16">
        {/* Main footer content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand */}
          <div className="lg:col-span-1">
            <Link href="/" className="inline-block">
              <span className="text-2xl font-bold text-white">
                Pitfal <span className="font-light text-neutral-400">Solutions</span>
              </span>
            </Link>
            <p className="mt-4 text-neutral-400 text-sm">
              Professional photography and videography services in Denver, Colorado.
              Capturing moments that matter.
            </p>
            <p className="mt-2 text-accent-500 font-medium text-sm italic">
              &quot;Swing the Gap&quot;
            </p>

            {/* Social links */}
            <div className="flex gap-4 mt-6">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-neutral-400 hover:text-white transition-colors"
                  aria-label={social.label}
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Services */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Services
            </h3>
            <ul className="space-y-3">
              {footerLinks.services.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-neutral-400 hover:text-white transition-colors text-sm"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Company
            </h3>
            <ul className="space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-neutral-400 hover:text-white transition-colors text-sm"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Contact
            </h3>
            <ul className="space-y-3 text-sm text-neutral-400">
              <li>Denver, Colorado</li>
              <li>
                <a
                  href="mailto:info@pitfal.solutions"
                  className="hover:text-white transition-colors"
                >
                  info@pitfal.solutions
                </a>
              </li>
              <li>
                <a
                  href="tel:+13035551234"
                  className="hover:text-white transition-colors"
                >
                  (303) 555-1234
                </a>
              </li>
            </ul>

            {/* CTA */}
            <Link
              href="/contact"
              className="inline-block mt-6 px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Book a Session
            </Link>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-8 border-t border-neutral-800">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-neutral-500 text-sm">
              &copy; {currentYear} Pitfal Solutions. All rights reserved.
            </p>
            <div className="flex gap-6">
              {footerLinks.legal.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-neutral-500 hover:text-neutral-300 transition-colors text-sm"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </Container>
    </footer>
  );
}
