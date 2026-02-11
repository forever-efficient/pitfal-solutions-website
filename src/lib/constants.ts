/**
 * Centralized constants for Pitfal Solutions website
 * Single source of truth for repeated strings and configuration
 */

// =============================================================================
// BUSINESS INFO
// =============================================================================

export const BUSINESS = {
  name: 'Pitfal Solutions',
  tagline: 'Swing the Gap',
  location: {
    city: 'Denver',
    state: 'Colorado',
    stateAbbrev: 'CO',
    full: 'Denver, Colorado',
    short: 'Denver, CO',
  },
  contact: {
    email: 'info@pitfal.solutions',
  },
  social: {
    instagram: 'https://instagram.com/pitfalsolutions',
    facebook: 'https://facebook.com/pitfalsolutions',
    linkedin: 'https://linkedin.com/company/pitfal-solutions',
  },
} as const;

// =============================================================================
// SERVICE DEFINITIONS
// =============================================================================

export const SERVICES = {
  brand: {
    id: 'brand',
    title: 'Brand Photography',
    shortDescription: 'Visual storytelling for businesses',
    description:
      'Elevate your brand with compelling visual content. From product photography to team headshots, create a cohesive visual identity that resonates with your audience.',
    features: [
      'Product photography',
      'Team headshots',
      'Office/workspace imagery',
      'Social media content',
      'Brand storytelling',
    ],
    image: '/images/services/brand.jpg',
    href: '/services#brand',
  },
  portraits: {
    id: 'portraits',
    title: 'Portrait Sessions',
    shortDescription: 'Authentic moments captured',
    description:
      'From professional headshots to family portraits, authentic moments are captured with genuine expressions to treasure for years to come.',
    features: [
      'Professional headshots',
      'Family portraits',
      'Couples sessions',
      'Senior portraits',
      'Personal branding',
    ],
    image: '/images/services/portraits.jpg',
    href: '/services#portraits',
  },
  events: {
    id: 'events',
    title: 'Event Coverage',
    shortDescription: 'Never miss a moment',
    description:
      'Comprehensive event documentation including corporate events, weddings, and special occasions. Never miss a moment.',
    features: [
      'Corporate events',
      'Weddings',
      'Conferences',
      'Private parties',
      'Live performances',
    ],
    image: '/images/services/events.jpg',
    href: '/services#events',
  },
} as const;

export type ServiceId = keyof typeof SERVICES;

// Service options for contact form
export const SERVICE_OPTIONS = [
  { value: 'brand', label: SERVICES.brand.title },
  { value: 'portrait', label: 'Portrait Session' },
  { value: 'event', label: SERVICES.events.title },
  { value: 'commercial', label: 'Commercial/Other' },
] as const;

// =============================================================================
// SEO & METADATA
// =============================================================================

export const SEO = {
  siteTitle: BUSINESS.name,
  titleTemplate: `%s | ${BUSINESS.name}`,
  defaultDescription: `Professional photography and videography services in ${BUSINESS.location.short}. Specializing in brand photography, portraits, and event coverage. ${BUSINESS.tagline}.`,
  shortDescription: `Professional photography and videography services in ${BUSINESS.location.short}.`,
  keywords: [
    'photography',
    'videography',
    'Denver photographer',
    'Colorado photography',
    'brand photography',
    'portrait photographer',
    'event photographer',
    'corporate photography',
    'professional headshots',
  ],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: BUSINESS.name,
  },
} as const;

// Page-specific metadata
export const PAGE_META = {
  home: {
    title: BUSINESS.name,
    description: SEO.defaultDescription,
  },
  about: {
    title: 'About',
    description: `Learn about ${BUSINESS.name} - Professional photography and videography services in ${BUSINESS.location.full}. Our story, philosophy, and approach to capturing moments.`,
  },
  services: {
    title: 'Services',
    description: `Professional photography and videography services including brand photography, portrait sessions, and event coverage. View our packages and pricing.`,
  },
  portfolio: {
    title: 'Portfolio',
    description: `View our photography and videography portfolio featuring brand photography, portrait sessions, and event coverage. Based in ${BUSINESS.location.full}.`,
  },
  contact: {
    title: 'Contact',
    description: `Get in touch with ${BUSINESS.name} for photography and videography inquiries. Based in ${BUSINESS.location.full}, serving the Denver metro area.`,
  },
  faq: {
    title: 'FAQ',
    description: `Frequently asked questions about ${BUSINESS.name} photography and videography services, pricing, booking, and more.`,
  },
  blog: {
    title: 'Blog',
    description: `Tips, guides, and stories from ${BUSINESS.name}. Photography insights, session prep guides, and behind-the-scenes content.`,
  },
  privacy: {
    title: 'Privacy Policy',
    description: `Privacy policy for ${BUSINESS.name}. Learn how we handle your data and protect your privacy.`,
  },
  terms: {
    title: 'Terms of Service',
    description: `Terms of service for ${BUSINESS.name}. Read our terms and conditions for using our services.`,
  },
} as const;

// =============================================================================
// UI COPY
// =============================================================================

export const COPY = {
  hero: {
    title: 'Capturing Moments That Matter',
    subtitle: `Professional photography and videography services in ${BUSINESS.location.full}`,
    tagline: BUSINESS.tagline,
    cta: 'View Portfolio',
    ctaSecondary: 'Book Now',
  },
  footer: {
    description: `Professional photography and videography services in ${BUSINESS.location.full}.`,
    tagline: `"${BUSINESS.tagline}"`,
    copyright: `© ${new Date().getFullYear()} ${BUSINESS.name}. All rights reserved.`,
  },
  cta: {
    contact: {
      title: "Let's Create Something Amazing",
      description: `Whether you need brand photography, a portrait session, or event coverage, your unique vision will be brought to life.`,
      button: 'Get in Touch',
    },
    booking: {
      title: 'Ready to Book?',
      description: 'Schedule your session today.',
      button: 'Book Now',
    },
  },
  about: {
    heroTitle: 'The Story Behind the Lens',
    heroDescription: `At ${BUSINESS.name}, story telling is a passion. Here, it's all about capturing authentic moments that resonate and inspire.`,
    philosophyTitle: 'The Philosophy',
    philosophy: [
      "Photography is more than just capturing images—it's about preserving emotions, telling stories, and creating visual narratives that stand the test of time.",
      `Based in ${BUSINESS.location.full}, ${BUSINESS.name} brings a unique perspective to every project. Combining technical excellence with creative vision ensures you get the highest quality when those fleeting moments are on the line.`,
      "Whether it's a corporate brand shoot, an intimate portrait session, or documenting a special event, the same level of dedication and artistry is brought to every project.",
    ],
    valuesTitle: 'What Drives Us',
    valuesDescription:
      'Our values guide everything we do, from the first consultation to the final delivery.',
    taglineDescription:
      'Our motto reminds us to bridge the gap between vision and reality, between the moment and its preservation.',
  },
  values: [
    {
      title: 'Authenticity',
      description:
        'We capture real moments and genuine emotions. No forced poses, no fake smiles—just authentic imagery that tells your true story.',
    },
    {
      title: 'Excellence',
      description:
        'We never compromise on quality. Every image is carefully crafted, edited, and delivered to meet the highest professional standards.',
    },
    {
      title: 'Connection',
      description:
        'We build relationships with our clients, understanding their vision and creating a comfortable environment for the best results.',
    },
  ],
} as const;

// =============================================================================
// PRICING PACKAGES
// =============================================================================

export const PACKAGES = {
  starter: {
    name: 'Starter',
    price: 299,
    description: 'Perfect for individuals needing professional headshots or portraits.',
    features: ['1-hour session', '10 edited photos', 'Online gallery', '1 location'],
  },
  professional: {
    name: 'Professional',
    price: 599,
    description: 'Ideal for small businesses and personal branding.',
    features: [
      '2-hour session',
      '25 edited photos',
      'Online gallery',
      '2 locations',
      'Outfit changes',
      'Basic retouching',
    ],
    popular: true,
  },
  premium: {
    name: 'Premium',
    price: 999,
    description: 'Complete coverage for events and comprehensive brand packages.',
    features: [
      '4-hour session',
      '50+ edited photos',
      'Online gallery',
      'Multiple locations',
      'Advanced retouching',
      'Print-ready files',
      'Rush delivery available',
    ],
  },
} as const;

// =============================================================================
// NAVIGATION
// =============================================================================

export const NAV_LINKS = {
  main: [
    { label: 'About', href: '/about' },
    { label: 'Services', href: '/services' },
    { label: 'Portfolio', href: '/portfolio' },
    { label: 'Contact', href: '/contact' },
  ],
  services: [
    { label: SERVICES.brand.title, href: SERVICES.brand.href },
    { label: 'Portraits', href: SERVICES.portraits.href },
    { label: SERVICES.events.title, href: SERVICES.events.href },
  ],
  company: [
    { label: 'About', href: '/about' },
    { label: 'Portfolio', href: '/portfolio' },
    { label: 'Contact', href: '/contact' },
    { label: 'FAQ', href: '/faq' },
    { label: 'Blog', href: '/blog' },
  ],
} as const;

// =============================================================================
// PORTFOLIO CATEGORIES
// =============================================================================

export const PORTFOLIO_CATEGORIES = {
  brands: {
    slug: 'brands',
    title: SERVICES.brand.title,
    description: 'Commercial and brand photography for businesses',
    image: '/images/portfolio/brands-cover.jpg',
  },
  portraits: {
    slug: 'portraits',
    title: 'Portraits',
    description: 'Headshots, family portraits, and personal branding',
    image: '/images/portfolio/portraits-cover.jpg',
  },
  events: {
    slug: 'events',
    title: 'Events',
    description: 'Corporate events, weddings, and special occasions',
    image: '/images/portfolio/events-cover.jpg',
  },
} as const;

export type PortfolioCategorySlug = keyof typeof PORTFOLIO_CATEGORIES;
