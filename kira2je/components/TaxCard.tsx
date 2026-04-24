'use client';

import { useMemo, useState } from 'react';
import {
  calculateTax,
  PERSONAL_RELIEFS,
  type ReliefKey,
} from '@/lib/tax';
import type { TaxBreakdown } from '@/lib/schemas';
import { TaxBracketBar } from './TaxBracketBar';
import { useT } from '@/lib/i18n/client';

const OPTIONAL: ReliefKey[] = [
  'epf',
  'socso',
  'lifestyle',
  'medical_insurance',
  'education_insurance',
];

function shortLabel(t: (k: string) => string, key: ReliefKey): string {
  return t(`relief.${key}` as const).split(' (')[0];
}

export function TaxCard({
  initial: _initial,
  annualProfit,
  narrative,
}: {
  initial: TaxBreakdown;
  annualProfit: number;
  narrative: string;
}) {
  const t = useT();
  const [selected, setSelected] = useState<Set<ReliefKey>>(new Set());
  const reliefs = useMemo(() => [...selected], [selected]);
  const current = useMemo(
    () => calculateTax(annualProfit, reliefs),
    [annualProfit, reliefs]
  );

  const savingsByRelief = useMemo(() => {
    const baseTax = current.annualTax;
    const out: Partial<Record<ReliefKey, number>> = {};
    for (const r of reliefs) {
      const without = reliefs.filter((x) => x !== r);
      const taxWithout = calculateTax(annualProfit, without).annualTax;
      out[r] = Math.max(0, taxWithout - baseTax);
    }
    return out;
  }, [annualProfit, reliefs, current.annualTax]);

  const totalSavings = Object.values(savingsByRelief).reduce(
    (a, b) => a + (b ?? 0),
    0
  );

  function toggle(key: ReliefKey) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div className="card">
      <h3 className="serif text-xl mb-1">{t('tax.title')}</h3>
      <p className="text-sm text-kira-muted mb-4">{t('tax.subtitle')}</p>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-kira-cream rounded-btn p-3 min-w-0">
          <div className="text-xs text-kira-muted truncate">{t('tax.annual')}</div>
          <div className="serif text-lg sm:text-xl lg:text-2xl whitespace-nowrap overflow-hidden text-ellipsis">
            RM{current.annualTax.toLocaleString('ms-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
        <div className="bg-kira-cream rounded-btn p-3 min-w-0">
          <div className="text-xs text-kira-muted truncate">{t('tax.monthly')}</div>
          <div className="serif text-lg sm:text-xl lg:text-2xl whitespace-nowrap overflow-hidden text-ellipsis">
            RM{current.monthlyTax.toLocaleString('ms-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      <div className="mb-5 pt-3">
        <TaxBracketBar chargeableIncome={current.chargeableIncome} />
      </div>

      <div className="mb-4">
        <div className="text-sm font-medium mb-2">{t('tax.addReliefs')}</div>
        <div className="grid grid-cols-1 gap-1">
          {OPTIONAL.map((k) => (
            <label
              key={k}
              className="flex items-center gap-2 text-sm py-1 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selected.has(k)}
                onChange={() => toggle(k)}
                className="w-5 h-5 accent-kira-teal"
              />
              <span>{t(`relief.${k}` as const)}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="bg-kira-cream rounded-btn p-4 mb-3">
        <div className="text-sm font-semibold mb-3">{t('tax.yourReliefs')}</div>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between items-baseline">
            <div>
              <div className="font-medium">{t('tax.individualRelief')}</div>
              <div className="text-xs text-kira-muted">{t('tax.individualAuto')}</div>
            </div>
            <div className="tabular-nums">
              RM{PERSONAL_RELIEFS.individual.toLocaleString()}
            </div>
          </div>

          {reliefs.map((r) => {
            const saved = savingsByRelief[r] ?? 0;
            return (
              <div key={r} className="flex justify-between items-baseline">
                <div>
                  <div className="font-medium">{shortLabel(t as (k: string) => string, r)}</div>
                  <div className="text-xs text-kira-teal">
                    {t('tax.savesPerYear', { amount: saved.toLocaleString() })}
                  </div>
                </div>
                <div className="tabular-nums">
                  RM{PERSONAL_RELIEFS[r].toLocaleString()}
                </div>
              </div>
            );
          })}

          {reliefs.length === 0 && (
            <div className="text-xs text-kira-muted italic pt-1">
              {t('tax.tickReliefsHint')}
            </div>
          )}

          <div className="pt-2 mt-1 border-t border-kira-sage/60 space-y-1">
            <div className="flex justify-between items-baseline font-semibold">
              <span>{t('tax.totalRelief')}</span>
              <span className="tabular-nums">
                RM{current.totalRelief.toLocaleString()}
              </span>
            </div>
            {totalSavings > 0 && (
              <div className="flex justify-between items-baseline text-kira-teal font-semibold">
                <span>{t('tax.totalSavings')}</span>
                <span className="tabular-nums">
                  {t('tax.totalSavingsValue', { amount: totalSavings.toLocaleString() })}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <details className="mb-3">
        <summary className="cursor-pointer text-sm font-medium text-kira-teal">
          {t('tax.showCalc')}
        </summary>
        <div className="mt-2 text-sm space-y-1 text-kira-muted">
          <div className="flex justify-between">
            <span>{t('tax.annualProfit')}</span>
            <span className="tabular-nums">
              RM{current.annualProfit.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between">
            <span>{t('tax.minusRelief')}</span>
            <span className="tabular-nums">
              RM{current.totalRelief.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between font-semibold text-kira-dark">
            <span>{t('tax.chargeable')}</span>
            <span className="tabular-nums">
              RM{current.chargeableIncome.toLocaleString()}
            </span>
          </div>
        </div>
      </details>

      <p className="text-sm text-kira-dark leading-relaxed bg-kira-sage/30 rounded-btn p-3">
        {narrative}
      </p>
      <p className="text-xs text-kira-muted mt-2">{t('tax.disclaimer')}</p>
    </div>
  );
}
