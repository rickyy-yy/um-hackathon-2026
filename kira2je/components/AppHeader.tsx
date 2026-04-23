'use client';

import Link from 'next/link';
import { LanguageToggle } from './LanguageToggle';

export function AppHeader({
  title,
  subtitle,
  backHref,
}: {
  title: string;
  subtitle?: string;
  backHref?: string;
}) {
  return (
    <header className="bg-kira-teal text-white px-5 lg:px-8 pt-5 pb-4 shrink-0">
      <div className="flex justify-between items-center gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {backHref && (
            <Link href={backHref} className="text-white/90 text-xl shrink-0">
              ←
            </Link>
          )}
          <div className="min-w-0">
            <h1 className="serif text-xl leading-tight">{title}</h1>
            {subtitle && <p className="text-xs opacity-80 mt-0.5">{subtitle}</p>}
          </div>
        </div>
        <LanguageToggle />
      </div>
    </header>
  );
}
