'use client';

import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';

interface SiteShellProps {
  header: ReactNode;
  footer: ReactNode;
  children: ReactNode;
}

export function SiteShell({ header, footer, children }: SiteShellProps) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith('/admin');

  if (isAdmin) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen flex-col">
      {header}
      <main id="main-content" className="flex-1">
        {children}
      </main>
      {footer}
    </div>
  );
}
