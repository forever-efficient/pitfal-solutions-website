import type { Metadata } from 'next';
import type { ReactNode } from 'react';

/** Prefer canonical /portfolio/{category}/{slug}/; production redirects at CloudFront. */
export const metadata: Metadata = {
  title: 'Gallery',
  robots: { index: false, follow: true },
};

export default function PortfolioViewerLayout({ children }: { children: ReactNode }) {
  return children;
}
