'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { ToastProvider } from '@/components/admin/Toast';
import { adminAuth } from '@/lib/api';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname.startsWith('/admin/login');
  const [username, setUsername] = useState('');
  const [checked, setChecked] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (isLoginPage) {
      setChecked(true);
      return;
    }

    adminAuth
      .check()
      .then((data) => {
        if (data.authenticated) {
          setAuthed(true);
          setUsername(data.username || '');
        } else {
          router.replace('/admin/login');
        }
      })
      .catch(() => {
        router.replace('/admin/login');
      })
      .finally(() => setChecked(true));
  }, [isLoginPage, router]);

  // Login page always renders immediately
  if (isLoginPage) {
    return <>{children}</>;
  }

  // Still checking auth
  if (!checked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-100">
        <div className="animate-pulse text-neutral-400">Loading...</div>
      </div>
    );
  }

  // Not authenticated, redirecting
  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-100">
        <div className="animate-pulse text-neutral-400">Redirecting...</div>
      </div>
    );
  }

  return (
    <ToastProvider>
      <div className="min-h-screen bg-neutral-100 flex">
        <AdminSidebar username={username} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex-1 flex flex-col min-w-0">
          {/* Mobile header with hamburger */}
          <header className="lg:hidden flex items-center gap-3 p-4 bg-white border-b border-neutral-200">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-1.5 text-neutral-600 hover:text-neutral-900"
              aria-label="Open menu"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <span className="font-display font-bold text-neutral-900 text-sm">Admin</span>
          </header>
          <main className="flex-1 p-4 lg:p-8 overflow-y-auto">{children}</main>
        </div>
      </div>
    </ToastProvider>
  );
}
