import type { StatusPill as StatusPillT } from '@/lib/schemas';

const CLASS: Record<StatusPillT, string> = {
  Top: 'pill pill-top',
  Stabil: 'pill pill-stabil',
  Bahaya: 'pill pill-bahaya',
  Rugi: 'pill pill-rugi',
};

export function StatusPill({ status }: { status: StatusPillT }) {
  return <span className={CLASS[status]}>{status}</span>;
}
