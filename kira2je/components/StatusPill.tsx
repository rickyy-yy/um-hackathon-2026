'use client';

import type { StatusPill as StatusPillT } from '@/lib/schemas';
import { useT } from '@/lib/i18n/client';

const CLASS: Record<StatusPillT, string> = {
  Top: 'pill pill-top',
  Stabil: 'pill pill-stabil',
  Bahaya: 'pill pill-bahaya',
  Rugi: 'pill pill-rugi',
};

export function StatusPill({ status }: { status: StatusPillT }) {
  const t = useT();
  return <span className={CLASS[status]}>{t(`status.${status}` as const)}</span>;
}
