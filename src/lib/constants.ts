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
  servicesOffering: 'Photography, Videography, Commercial Drone, AI, and Notary Services',
  contact: {
    email: 'info@pitfal.solutions',
  },
  social: {
    instagram: 'https://www.instagram.com/pitfal.solutions/',
    facebook: 'https://www.facebook.com/pitfal.solutions',
    linkedin: 'https://www.linkedin.com/in/thomas-archuleta/',
    twitter: 'https://x.com/pitfalsolutions',
    youtube: 'https://www.youtube.com/@pitfal.solutions',
    googleMaps: 'https://maps.app.goo.gl/Dt8zWCfByCu86axm6',
  },
} as const;

// =============================================================================
// SERVICE DEFINITIONS
// =============================================================================

export const SERVICES = {
  photography: {
    id: 'photography',
    title: 'Photography',
    shortDescription: 'Professional photography for every occasion',
    description:
      'Brands, portraits, events. Your story, sharply told.',
    features: [
      'Brand & product photography',
      'Portrait sessions',
      'Event coverage',
      'Headshots',
      'Lifestyle & editorial',
    ],
    image: 'site/services-photography.jpg',
    href: '/services/photography',
  },
  videography: {
    id: 'videography',
    title: 'Videography',
    shortDescription: 'Cinematic video production',
    description:
      'Concept to final cut. Every frame intentional.',
    features: [
      'Brand films',
      'Event videography',
      'Social media reels',
      'Interview & testimonial video',
      'Color grading & post-production',
    ],
    image: 'site/services-videography.jpg',
    href: '/services/videography',
  },
  drone: {
    id: 'drone',
    title: 'Commercial Drone',
    shortDescription: 'Aerial photography & videography',
    description:
      'New perspectives. FAA-certified, fully handled.',
    features: [
      'Aerial photography',
      'Aerial videography',
      'Construction & real estate',
      'Event overviews',
      'FAA Part 107 certified',
    ],
    image: 'site/services-drone.jpg',
    href: '/services/commercial-drone',
  },
  ai: {
    id: 'ai',
    title: 'AI & Software',
    shortDescription: 'AI consulting & custom development',
    description:
      'Smart tools, real leverage. Strategy through delivery.',
    features: [
      'AI consulting & strategy',
      'Custom AI integrations',
      'Website design & development',
      'Workflow automation',
      'Software prototyping',
    ],
    image: 'site/services-ai.jpg',
    href: '/services/ai-software',
  },
  notary: {
    id: 'notary',
    title: 'Colorado Notary',
    shortDescription: 'Mobile notary services across Colorado',
    description:
      'Colorado-commissioned. RULONA-compliant. Coming to you.',
    features: [
      'Mobile notary services',
      'Loan document signings',
      'Real estate closings',
      'Legal documents & affidavits',
      'Estate planning documents',
    ],
    image: 'site/services-notary.jpg',
    href: '/services/notary',
  },
} as const;

export type ServiceId = keyof typeof SERVICES;

// Service options for contact form
export const SERVICE_OPTIONS = [
  { value: 'photography', label: SERVICES.photography.title },
  { value: 'videography', label: SERVICES.videography.title },
  { value: 'drone', label: SERVICES.drone.title },
  { value: 'ai', label: SERVICES.ai.title },
  { value: 'notary', label: SERVICES.notary.title },
  { value: 'other', label: 'Other / Not Sure' },
] as const;

// =============================================================================
// SEO & METADATA
// =============================================================================

export const SEO = {
  siteTitle: BUSINESS.name,
  titleTemplate: `%s | ${BUSINESS.name}`,
  defaultDescription: `Professional ${BUSINESS.servicesOffering} in ${BUSINESS.location.short}. Specializing in brand photography, portraits, and event coverage. ${BUSINESS.tagline}.`,
  shortDescription: `Professional ${BUSINESS.servicesOffering} in ${BUSINESS.location.short}.`,
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
    'notary',
    'Colorado notary',
    'mobile notary Denver',
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
    description: `Learn about ${BUSINESS.name} - Professional ${BUSINESS.servicesOffering} in ${BUSINESS.location.full}. The story, philosophy, and approach to capturing moments.`,
  },
  services: {
    title: 'Services',
    description: `Professional ${BUSINESS.servicesOffering}. View our full range of offerings.`,
  },
  servicesPhotography: {
    title: 'Photography',
    description: `Professional photography services in ${BUSINESS.location.full} — brand photography, portraits, events, headshots, and lifestyle imagery.`,
  },
  servicesVideography: {
    title: 'Videography',
    description: `Cinematic video production in ${BUSINESS.location.full} — brand films, event videography, social media reels, and post-production.`,
  },
  servicesDrone: {
    title: 'Commercial Drone',
    description: `FAA-compliant aerial photography and videography in ${BUSINESS.location.full}. Commercial drone services for real estate, events, and construction.`,
  },
  servicesAI: {
    title: 'AI & Software',
    description: `AI consulting, custom AI integrations, and website development from ${BUSINESS.name} in ${BUSINESS.location.full}.`,
  },
  servicesNotary: {
    title: 'Colorado Notary',
    description: `Mobile notary services in ${BUSINESS.location.full} — loan signings, real estate closings, legal documents, and estate planning. Colorado-commissioned, RULONA-compliant.`,
  },
  portfolio: {
    title: 'Portfolio',
    description: `View our photography and videography portfolio featuring brand photography, portrait sessions, and event coverage. Based in ${BUSINESS.location.full}.`,
  },
  contact: {
    title: 'Contact',
    description: `Get in touch with ${BUSINESS.name} for photography and videography inquiries. Based in ${BUSINESS.location.full}, serving almost anywhere.`,
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
    title: 'Delivering Solutions That Matter',
    subtitle: `Professional ${BUSINESS.servicesOffering} in ${BUSINESS.location.full}`,
    tagline: BUSINESS.tagline,
    cta: 'View Portfolio',
    ctaSecondary: 'Book Now',
  },
  footer: {
    description: `Professional ${BUSINESS.servicesOffering} in ${BUSINESS.location.full}.`,
    tagline: `"${BUSINESS.tagline}"`,
    copyright: `© ${new Date().getFullYear()} ${BUSINESS.name}. All rights reserved.`,
  },
  cta: {
    contact: {
      title: "Let's Create Something Amazing",
      description: `Whether you need a portrait session, event coverage, aerial view updates, or new AI tools for your business, your unique vision will be brought to life.`,
      button: 'Get in Touch',
    },
    booking: {
      title: 'Ready to Book?',
      description: 'Schedule your session today.',
      button: 'Book Now',
    },
  },
  about: {
    heroTitle: 'Built on Vision',
    heroDescription: 'Lens, drone, or code — work that resonates.',
    philosophyTitle: 'The Philosophy',
    philosophy: [
      "Excellence is built at the intersection of technical precision and creative vision. Whether the project involves a camera, a drone, or a line of code, the focus remains on delivering high-impact solutions that stand the test of time.",
      `Based in ${BUSINESS.location.full}, ${BUSINESS.name} brings a unique perspective to every engagement. Whether through photography, videography, or aerial drone work, combining professional expertise with a dedicated eye ensures the highest quality across all media.`,
      "Beyond the lens, the gap between vision and reality is bridged through custom AI services and software development. The same level of artistry and deliberate execution is brought to every project, ensuring both fleeting moments and complex business needs are met with excellence.",
    ],
    valuesTitle: 'Core Values',
    valuesDescription:
      'These values guide every project, from the first consultation to the final delivery.',
    taglineDescription:
      'This motto is a reminder to bridge the gap between vision and reality, overcoming all obstacles.',
  },
  values: [
    {
      title: 'Authenticity',
      description:
        'Real moments and genuine emotions. No forced poses, no fake smiles—just authentic imagery that tells your true story.',
    },
    {
      title: 'Excellence',
      description:
        'No compromises on quality. Every image is carefully crafted, edited, and delivered to meet the highest professional standards.',
    },
    {
      title: 'Connection',
      description:
        'Relationships are built on understanding the client vision and creating a comfortable environment for the best results.',
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
    { label: SERVICES.photography.title, href: SERVICES.photography.href },
    { label: SERVICES.videography.title, href: SERVICES.videography.href },
    { label: SERVICES.drone.title, href: SERVICES.drone.href },
    { label: SERVICES.ai.title, href: SERVICES.ai.href },
    { label: SERVICES.notary.title, href: SERVICES.notary.href },
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
    title: 'Brand Photography',
    description: 'Commercial and brand photography for businesses',
    image: 'site/portfolio-brands.jpg',
  },
  portraits: {
    slug: 'portraits',
    title: 'Portraits',
    description: 'Headshots, family portraits, and personal branding',
    image: 'site/portfolio-portraits.jpg',
  },
  events: {
    slug: 'events',
    title: 'Events',
    description: 'Corporate events, weddings, and special occasions',
    image: 'site/portfolio-events.jpg',
  },
  videography: {
    slug: 'videography',
    title: 'Videography',
    description: 'Brand films, event videography, and social media reels',
    image: 'site/portfolio-videography.jpg',
  },
  drone: {
    slug: 'drone',
    title: 'Commercial Drone',
    description: 'FAA-compliant aerial photography and videography',
    image: 'site/portfolio-drone.jpg',
  },
  ai: {
    slug: 'ai',
    title: 'AI & Software',
    description: 'Custom AI integrations and software development',
    image: 'site/portfolio-ai.jpg',
  },
} as const;

export type PortfolioCategorySlug = keyof typeof PORTFOLIO_CATEGORIES;

// =============================================================================
// SITE IMAGES (S3 keys — upload to s3://pitfal-prod-media/site/...)
// =============================================================================

export const BUILD_VERSION = Date.now();

export const SITE_IMAGES = {
  hero: 'site/hero-bg.jpg',
  about: 'site/about-portrait.jpg',
} as const;

// =============================================================================
// BLOG CATEGORIES
// =============================================================================

export const BLOG_CATEGORIES = {
  all: { slug: 'all', label: 'All Posts' },
  guides: { slug: 'guides', label: 'Guides' },
  'behind-the-scenes': { slug: 'behind-the-scenes', label: 'Behind the Scenes' },
  'client-stories': { slug: 'client-stories', label: 'Client Stories' },
} as const;

export type BlogCategorySlug = keyof typeof BLOG_CATEGORIES;
