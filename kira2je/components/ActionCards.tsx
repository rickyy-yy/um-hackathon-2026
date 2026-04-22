'use client';

import type { Recommendation } from '@/lib/schemas';
import { useT } from '@/lib/i18n/client';

export function ActionCards({
  recommendations,
  totalImpactRm,
}: {
  recommendations: Recommendation[];
  totalImpactRm: number;
}) {
  const t = useT();
  const monthSuffix = t('common.rmAmountSuffix');

  return (
    <div className="space-y-3">
      {recommendations.map((r) => (
        <div key={r.rank} className="card">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-kira-teal text-white flex items-center justify-center font-semibold shrink-0">
              {r.rank}
            </div>
            <div className="flex-1">
              <h4 className="font-semibold mb-1">{r.title}</h4>
              <p className="text-sm text-kira-muted leading-relaxed">{r.description}</p>
              <div className="mt-3 inline-flex items-center bg-kira-yellow rounded-btn px-3 py-1.5 text-sm font-semibold text-kira-dark">
                +RM{r.impactRm.toLocaleString()}
                {monthSuffix}
              </div>
            </div>
          </div>
        </div>
      ))}

      <div className="card bg-kira-teal text-white">
        <div className="text-sm opacity-80">{t('dashboard.totalImpact')}</div>
        <div className="serif text-3xl mt-1">
          {t('dashboard.totalImpactValue', { amount: totalImpactRm.toLocaleString() })}
        </div>
      </div>
    </div>
  );
}
