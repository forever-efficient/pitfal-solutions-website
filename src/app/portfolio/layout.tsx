import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { BUSINESS, SEO } from '@/lib/constants';

const description =
  'Browse Pitfal Solutions photography and video portfolio: brand work, portraits, events, aerial, and creative projects in Denver, Colorado.';

export const metadata: Metadata = {
  title: 'Portfolio',
  description,
  alternates: { canonical: '/portfolio/' },
  openGraph: {
    title: `Portfolio | ${BUSINESS.name}`,
    description,
    url: '/portfolio/',
  },
  twitter: {
    title: `Portfolio | ${BUSINESS.name}`,
    description,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
    },
  },
  keywords: [...SEO.keywords, 'Denver photographer portfolio', 'Denver videographer portfolio'],
};

export default function PortfolioLayout({ children }: { children: ReactNode }) {
  return children;
}
