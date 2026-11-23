'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { ToastProvider } from '@/components/ui/Toast';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isLoginPage = pathname === '/admin/login';
  const { user, isAdmin, loading: authLoading, signOut } = useAuth();

  const isAuthorized = !authLoading && user && isAdmin;
  const shouldRedirect = !authLoading && !isLoginPage && (!user || !isAdmin);

  useEffect(() => {
    if (shouldRedirect) {
      if (!user) {
        router.push('/admin/login');
      } else {
        router.push('/');
      }
    }
  }, [shouldRedirect, user, router]);

  if (shouldRedirect) {
    return null;
  }

  if (isLoginPage) {
    return <ToastProvider>{children}</ToastProvider>;
  }

  if (authLoading || !isAuthorized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--bg-primary)]">
        <div className="skeleton w-10 h-10 rounded-full" />
      </div>
    );
  }

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/admin/login');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  return (
    <ToastProvider>
      <div className="flex min-h-screen bg-[var(--bg-primary)]">
        <AdminSidebar onSignOut={handleSignOut} />
        <div className="flex-1 min-w-0 overflow-auto">
          <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-[var(--border-color)] bg-[var(--bg-secondary)]">
            <div className="text-xs sm:text-sm text-[var(--text-muted)] truncate">
              Signed in as <strong className="text-[var(--text-primary)] font-semibold">{user.email}</strong>
            </div>
            <ThemeToggle />
          </div>
          <div className="p-4 sm:p-6 lg:p-8 max-w-6xl pb-24 lg:pb-8 w-full">
            {children}
          </div>
        </div>
      </div>
    </ToastProvider>
  );
}
