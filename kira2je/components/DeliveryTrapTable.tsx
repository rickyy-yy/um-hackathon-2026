'use client';

import type { DeliveryTrap } from '@/lib/schemas';
import { useT } from '@/lib/i18n/client';

export function DeliveryTrapTable({
  traps,
  narrative,
}: {
  traps: DeliveryTrap[];
  narrative: string | null;
}) {
  const t = useT();
  if (traps.length === 0) return null;
  return (
    <div className="card">
      <h3 className="serif text-xl mb-2">{t('delivery.title')}</h3>
      <p className="text-sm text-kira-muted mb-4">{t('delivery.desc')}</p>
      <div className="overflow-x-auto -mx-2">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-kira-muted">
              <th className="px-2 py-2 font-medium">{t('dashboard.itemCol')}</th>
              <th className="px-2 py-2 font-medium text-right">{t('delivery.priceCol')}</th>
              <th className="px-2 py-2 font-medium text-right">{t('delivery.commissionCol')}</th>
              <th className="px-2 py-2 font-medium text-right">{t('delivery.netProfitCol')}</th>
            </tr>
          </thead>
          <tbody>
            {traps.map((tr) => (
              <tr key={tr.itemId} className="border-t border-kira-sage/40">
                <td className="px-2 py-3 font-medium">{tr.itemName}</td>
                <td className="px-2 py-3 text-right tabular-nums">RM{tr.price.toFixed(2)}</td>
                <td className="px-2 py-3 text-right tabular-nums">
                  {Math.round(tr.commission * 100)}%
                </td>
                <td className="px-2 py-3 text-right tabular-nums text-kira-red font-semibold">
                  RM{tr.effectiveMarginRm.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {narrative && <p className="mt-3 text-sm text-kira-dark leading-relaxed">{narrative}</p>}
    </div>
  );
}
