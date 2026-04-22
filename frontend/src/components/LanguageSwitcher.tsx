'use client';

import { useState } from 'react';
import { type Language, useI18n } from '@/i18n';
import { api } from '@/lib/api';

const LABELS: Record<Language, string> = { en: 'EN', ms: 'MS', zh: '中文' };

export function LanguageSwitcher() {
  const { lang, setLang } = useI18n();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Change language"
        className="nav-icon-btn w-auto px-3 text-xs font-semibold"
        onClick={() => setOpen((x) => !x)}
      >
        {LABELS[lang]}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-36 rounded-xl border border-primary/15 bg-[rgb(var(--color-card))] py-1 shadow-card z-30">
          {(Object.keys(LABELS) as Language[]).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => {
                setLang(l);
                setOpen(false);
                // Best-effort: if the user is logged in, remember the choice
                // server-side so other devices pick it up too. Fire-and-forget.
                api
                  .patch('/api/auth/me', { preferred_language: l })
                  .catch(() => {});
              }}
              className={`block w-full px-3 py-2 text-left text-sm hover:bg-primary/5 ${
                l === lang ? 'text-primary font-semibold' : 'text-ink'
              }`}
            >
              {LABELS[l]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
