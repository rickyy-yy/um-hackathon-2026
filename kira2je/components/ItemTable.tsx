'use client';

import { useState } from 'react';
import type { ItemPerf } from '@/lib/schemas';
import { StatusPill } from './StatusPill';
import { useT } from '@/lib/i18n/client';

type SortKey = 'name' | 'perDay' | 'price' | 'marginRm' | 'status';

export function ItemTable({ items }: { items: ItemPerf[] }) {
  const t = useT();
  const [sortBy, setSortBy] = useState<SortKey>('marginRm');
  const [asc, setAsc] = useState(false);

  const sorted = [...items].sort((a, b) => {
    const mult = asc ? 1 : -1;
    if (sortBy === 'name') return a.name.localeCompare(b.name) * mult;
    if (sortBy === 'status') return a.status.localeCompare(b.status) * mult;
    return ((a[sortBy] as number) - (b[sortBy] as number)) * mult;
  });

  function toggle(key: SortKey) {
    if (sortBy === key) setAsc(!asc);
    else {
      setSortBy(key);
      setAsc(false);
    }
  }

  const arrow = (k: SortKey) => (sortBy === k ? (asc ? ' ↑' : ' ↓') : '');

  return (
    <div className="overflow-x-auto -mx-2">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-kira-muted">
            <th onClick={() => toggle('name')} className="px-2 py-2 cursor-pointer font-medium">
              {t('dashboard.itemCol')}{arrow('name')}
            </th>
            <th onClick={() => toggle('perDay')} className="px-2 py-2 cursor-pointer font-medium text-right">
              {t('dashboard.perDayCol')}{arrow('perDay')}
            </th>
            <th onClick={() => toggle('price')} className="px-2 py-2 cursor-pointer font-medium text-right">
              {t('dashboard.priceCol')}{arrow('price')}
            </th>
            <th onClick={() => toggle('marginRm')} className="px-2 py-2 cursor-pointer font-medium text-right">
              {t('dashboard.marginCol')}{arrow('marginRm')}
            </th>
            <th onClick={() => toggle('status')} className="px-2 py-2 cursor-pointer font-medium">
              {t('dashboard.statusCol')}{arrow('status')}
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((i) => (
            <tr key={i.id} className="border-t border-kira-sage/40">
              <td className="px-2 py-3 font-medium">{i.name}</td>
              <td className="px-2 py-3 text-right tabular-nums">{i.perDay.toFixed(0)}</td>
              <td className="px-2 py-3 text-right tabular-nums">RM{i.price.toFixed(2)}</td>
              <td className="px-2 py-3 text-right tabular-nums">RM{i.marginRm.toFixed(2)}</td>
              <td className="px-2 py-3">
                <StatusPill status={i.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
