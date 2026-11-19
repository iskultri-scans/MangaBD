'use client';

import React, { useEffect, useState } from 'react';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { getAllGenres, type Genre } from '@/lib/firestore';
import { Mail, Shield } from 'lucide-react';

export default function DmcaPage() {
  const [genres, setGenres] = useState<Genre[]>([]);

  useEffect(() => {
    getAllGenres().then(setGenres);
  }, []);

  const genreSlugs = genres.map((g) => ({ name: g.name, slug: g.slug }));

  return (
    <PublicLayout genres={genreSlugs}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-12">
        <header className="pb-6 mb-8 border-b border-[var(--border-color)]">
          <div className="flex items-center gap-2 text-[var(--accent)] mb-1.5">
            <Shield size={16} />
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em]">
              Legal &amp; Attribution
            </span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-[var(--text-primary)]">
            DMCA &amp; Disclaimer
          </h1>
        </header>

        <div className="space-y-5 text-sm sm:text-[15px] text-[var(--text-secondary)] leading-relaxed">
          <section className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6">
            <h2 className="font-display text-lg font-bold tracking-tight text-[var(--text-primary)] mb-2">
              Important Notice
            </h2>
            <p>
              MangaBD does not host any manga files, scanlations, or translated content on its servers. This website functions solely as a directory and information resource for manga readers. All cover artwork, descriptions, and metadata displayed on this platform are presented for informational indexing only.
            </p>
          </section>

          <section className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6">
            <h2 className="font-display text-lg font-bold tracking-tight text-[var(--text-primary)] mb-2">
              External Links
            </h2>
            <p>
              The &quot;Read Now&quot; and chapter links across this site direct readers to external third-party websites. MangaBD has no control over, and assumes no responsibility for, the content, privacy policies, or practices of any third-party services. Users are encouraged to review the terms and policies of any external site they visit.
            </p>
          </section>

          <section className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6">
            <h2 className="font-display text-lg font-bold tracking-tight text-[var(--text-primary)] mb-2">
              Fan-Translated Content
            </h2>
            <p>
              Any fan-translated content referenced through external links is produced by independent translation groups. MangaBD does not produce, commission, or distribute fan translations. We acknowledge the original creators and copyright holders of every title and encourage supporting official licensed releases whenever available.
            </p>
          </section>

          <section className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6">
            <h2 className="font-display text-lg font-bold tracking-tight text-[var(--text-primary)] mb-2">
              Takedown Requests
            </h2>
            <p>
              If you are a copyright holder or an authorized representative and believe that a link indexed on this site infringes on your rights, please contact us using the address below. We review all valid takedown notices promptly upon verification.
            </p>
            <div className="flex items-center gap-2 mt-4">
              <Mail size={16} className="text-[var(--accent)]" />
              <a
                href="mailto:dmca@mangabd.app"
                className="text-[var(--accent)] hover:underline font-semibold"
              >
                dmca@mangabd.app
              </a>
            </div>
          </section>

          <div className="text-center pt-6 border-t border-[var(--border-color)]">
            <p className="text-xs text-[var(--text-muted)]">
              Created by MD MEHADI HASAN
            </p>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
