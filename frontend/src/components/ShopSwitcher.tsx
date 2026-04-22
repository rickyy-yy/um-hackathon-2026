'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useShops } from '@/lib/hooks';
import { useI18n } from '@/i18n';

export function ShopSwitcher() {
  const { shops, activeId, selectShop } = useShops();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  if (!shops || shops.length === 0) return null;
  const active = shops.find((s) => s.id === activeId) || shops[0];

  return (
    <div className="relative">
      <button
        type="button"
        className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-[rgb(var(--color-card))] px-3 py-1.5 text-sm text-ink hover:bg-primary/5 transition max-w-[220px]"
        onClick={() => setOpen((x) => !x)}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-accent" />
        <span className="truncate font-medium">{active.shop_name}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-64 rounded-xl border border-primary/15 bg-[rgb(var(--color-card))] py-1 shadow-card z-30">
          <p className="px-3 pb-1 pt-2 text-xs uppercase tracking-wide text-muted">
            {t('shop.switcherLabel')}
          </p>
          {shops.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                selectShop(s.id);
                setOpen(false);
              }}
              className={`flex w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-primary/5 ${
                s.id === active.id ? 'text-primary' : 'text-ink'
              }`}
            >
              <div className="flex-1 truncate">
                <div className="font-medium truncate">{s.shop_name}</div>
                <div className="text-xs text-muted">
                  {t(`shop.types.${s.shop_type}`, s.shop_type)}
                </div>
              </div>
              {s.id === active.id && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden>
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </button>
          ))}
          <div className="mt-1 border-t border-primary/10" />
          <Link
            href="/shops/new"
            className="block px-3 py-2 text-sm text-primary hover:bg-primary/5"
            onClick={() => setOpen(false)}
          >
            + {t('shop.addAnother')}
          </Link>
        </div>
      )}
    </div>
  );
}
