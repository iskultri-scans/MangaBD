'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { ScrollToTop } from '@/components/layout/ScrollToTop';
import { MobileMenu } from '@/components/layout/MobileMenu';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';

interface PublicLayoutProps {
  children: React.ReactNode;
  genres: { name: string; slug: string }[];
}

export function PublicLayout({ children, genres }: PublicLayoutProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  return (
    <>
      <Navbar
        genres={genres}
        mobileOpen={mobileMenuOpen}
        onOpenMobileMenu={() => setMobileMenuOpen(true)}
        onCloseMobileMenu={() => setMobileMenuOpen(false)}
      />
      <main className="flex-1">{children}</main>
      <div className="pb-14 lg:pb-0">
        <Footer genres={genres} />
      </div>
      <MobileBottomNav
        menuOpen={mobileMenuOpen}
        onOpenMenu={() => setMobileMenuOpen((prev) => !prev)}
      />
      <MobileMenu
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        genres={genres}
      />
      <ScrollToTop />
    </>
  );
}
