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
        <AdminSidebar username={username} />
        <main className="flex-1 p-8 overflow-y-auto">{children}</main>
      </div>
    </ToastProvider>
  );
}
