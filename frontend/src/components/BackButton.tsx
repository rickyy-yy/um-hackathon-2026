'use client';

import Link from 'next/link';
import { useI18n } from '@/i18n';

export function BackButton({ href = '/', label }: { href?: string; label?: string }) {
  const { t } = useI18n();
  return (
    <Link href={href} className="btn-back" aria-label={label || t('nav.back')}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <line x1="19" y1="12" x2="5" y2="12" />
        <polyline points="12 19 5 12 12 5" />
      </svg>
      {label || t('nav.back')}
    </Link>
  );
}
