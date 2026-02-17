import type { Metadata, Viewport } from 'next';
import '@/styles/globals.css';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { BUSINESS, SEO } from '@/lib/constants';
import { LocalBusinessJsonLd } from '@/components/seo';
import { SiteShell } from '@/components/layout/SiteShell';

export const metadata: Metadata = {
  title: {
    default: `${BUSINESS.name} | Photography & Videography`,
    template: `%s | ${BUSINESS.name}`,
  },
  description: SEO.defaultDescription,
  keywords: [...SEO.keywords],
  authors: [{ name: BUSINESS.name }],
  creator: BUSINESS.name,
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || 'https://www.pitfal.solutions'
  ),
  openGraph: {
    type: SEO.openGraph.type,
    locale: SEO.openGraph.locale,
    url: '/',
    siteName: BUSINESS.name,
    title: `${BUSINESS.name} | Photography & Videography`,
    description: SEO.shortDescription,
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: `${BUSINESS.name} Photography`,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${BUSINESS.name} | Photography & Videography`,
    description: SEO.shortDescription,
    images: ['/og-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#030712' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-white font-sans text-neutral-900 antialiased">
        <LocalBusinessJsonLd />
        {/* Skip to main content link for accessibility */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-primary-600 focus:px-4 focus:py-2 focus:text-white"
        >
          Skip to main content
        </a>

        {/* Main application */}
        <SiteShell
          header={<Header />}
          footer={<Footer />}
        >
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </SiteShell>
      </body>
    </html>
  );
}
