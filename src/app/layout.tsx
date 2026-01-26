import type { Metadata, Viewport } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import '@/styles/globals.css';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Pitfal Solutions | Photography & Videography',
    template: '%s | Pitfal Solutions',
  },
  description:
    'Professional photography and videography services in Aurora, CO. Specializing in brand photography, portraits, and event coverage. Swing the Gap.',
  keywords: [
    'photography',
    'videography',
    'Aurora Colorado',
    'brand photography',
    'portrait photographer',
    'event photography',
    'commercial photographer',
    'Denver photographer',
  ],
  authors: [{ name: 'Pitfal Solutions' }],
  creator: 'Pitfal Solutions',
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || 'https://www.pitfal.solutions'
  ),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    siteName: 'Pitfal Solutions',
    title: 'Pitfal Solutions | Photography & Videography',
    description:
      'Professional photography and videography services in Aurora, CO.',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Pitfal Solutions Photography',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pitfal Solutions | Photography & Videography',
    description:
      'Professional photography and videography services in Aurora, CO.',
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
    <html
      lang="en"
      className={`${inter.variable} ${playfair.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-white font-sans text-neutral-900 antialiased">
        {/* Skip to main content link for accessibility */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-primary-600 focus:px-4 focus:py-2 focus:text-white"
        >
          Skip to main content
        </a>

        {/* Main application */}
        <div className="flex min-h-screen flex-col">
          <Header />
          <main id="main-content" className="flex-1">
            <ErrorBoundary>
              {children}
            </ErrorBoundary>
          </main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
