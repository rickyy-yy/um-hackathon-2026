'use client';

import { useLocale } from '@/lib/i18n/client';
import type { Locale } from '@/lib/i18n/dictionary';

export function LanguageToggle() {
  const current = useLocale();

  async function swap() {
    const next: Locale = current === 'ms' ? 'en' : 'ms';
    await fetch('/api/locale', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ locale: next }),
    });
    window.location.reload();
  }

  return (
    <button
      onClick={swap}
      className="rounded-full bg-white/20 hover:bg-white/30 text-white text-xs font-semibold px-3 py-1.5 border border-white/40 transition-colors shrink-0"
      aria-label="Change language"
    >
      {current === 'ms' ? 'EN' : 'BM'}
    </button>
  );
}
