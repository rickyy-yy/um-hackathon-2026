'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { useLocale } from '@/lib/i18n/client';
import type { Locale } from '@/lib/i18n/dictionary';

export function LanguageToggle() {
  const router = useRouter();
  const current = useLocale();
  const [isPending, startTransition] = useTransition();

  async function swap() {
    const next: Locale = current === 'ms' ? 'en' : 'ms';
    await fetch('/api/locale', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ locale: next }),
    });
    startTransition(() => router.refresh());
  }

  return (
    <button
      onClick={swap}
      disabled={isPending}
      className="fixed top-3 right-3 z-50 rounded-full bg-white/90 text-kira-dark text-xs font-semibold px-3 py-1.5 shadow-sm border border-kira-sage/70 hover:bg-white disabled:opacity-60"
      aria-label="Change language"
    >
      {current === 'ms' ? 'EN' : 'BM'}
    </button>
  );
}
