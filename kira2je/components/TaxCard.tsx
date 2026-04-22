'use client';

import { useMemo, useState } from 'react';
import { calculateTax, PERSONAL_RELIEFS, RELIEF_LABELS_BM, type ReliefKey } from '@/lib/tax';
import type { TaxBreakdown } from '@/lib/schemas';
import { TaxBracketBar } from './TaxBracketBar';

const OPTIONAL: ReliefKey[] = [
  'epf',
  'socso',
  'lifestyle',
  'medical_insurance',
  'education_insurance',
];

function shortLabel(key: ReliefKey): string {
  return RELIEF_LABELS_BM[key].split(' (')[0];
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
  const [selected, setSelected] = useState<Set<ReliefKey>>(new Set());
  const reliefs = useMemo(() => [...selected], [selected]);
  const current = useMemo(
    () => calculateTax(annualProfit, reliefs),
    [annualProfit, reliefs]
  );

  // Marginal tax saved by each currently-ticked relief
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
      <h3 className="serif text-xl mb-1">Anggaran cukai tahunan anda</h3>
      <p className="text-sm text-kira-muted mb-4">
        Berdasarkan untung bulanan dan pelepasan cukai.
      </p>

      {/* Top tax totals */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-kira-cream rounded-btn p-3">
          <div className="text-xs text-kira-muted">Cukai tahunan</div>
          <div className="serif text-2xl">
            RM{current.annualTax.toLocaleString()}
          </div>
        </div>
        <div className="bg-kira-cream rounded-btn p-3">
          <div className="text-xs text-kira-muted">Sebulan</div>
          <div className="serif text-2xl">
            RM{current.monthlyTax.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Bracket visualization */}
      <div className="mb-5 pt-3">
        <TaxBracketBar chargeableIncome={current.chargeableIncome} />
      </div>

      {/* Checkboxes — which optional reliefs apply */}
      <div className="mb-4">
        <div className="text-sm font-medium mb-2">Tambah pelepasan (kalau ada):</div>
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
              <span>{RELIEF_LABELS_BM[k]}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Itemized breakdown */}
      <div className="bg-kira-cream rounded-btn p-4 mb-3">
        <div className="text-sm font-semibold mb-3">Pelepasan cukai anda</div>

        <div className="space-y-2 text-sm">
          {/* Individual — always applied */}
          <div className="flex justify-between items-baseline">
            <div>
              <div className="font-medium">Pelepasan individu</div>
              <div className="text-xs text-kira-muted">
                Dikenakan secara automatik
              </div>
            </div>
            <div className="tabular-nums">
              RM{PERSONAL_RELIEFS.individual.toLocaleString()}
            </div>
          </div>

          {/* Each ticked optional relief */}
          {reliefs.map((r) => {
            const saved = savingsByRelief[r] ?? 0;
            return (
              <div key={r} className="flex justify-between items-baseline">
                <div>
                  <div className="font-medium">{shortLabel(r)}</div>
                  <div className="text-xs text-kira-teal">
                    Jimat RM{saved.toLocaleString()}/tahun
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
              Tick pelepasan di atas untuk lihat berapa anda jimat.
            </div>
          )}

          {/* Totals */}
          <div className="pt-2 mt-1 border-t border-kira-sage/60 space-y-1">
            <div className="flex justify-between items-baseline font-semibold">
              <span>Jumlah pelepasan</span>
              <span className="tabular-nums">
                RM{current.totalRelief.toLocaleString()}
              </span>
            </div>
            {totalSavings > 0 && (
              <div className="flex justify-between items-baseline text-kira-teal font-semibold">
                <span>Jumlah jimat cukai</span>
                <span className="tabular-nums">
                  RM{totalSavings.toLocaleString()}/tahun
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <details className="mb-3">
        <summary className="cursor-pointer text-sm font-medium text-kira-teal">
          Tunjuk kiraan cukai
        </summary>
        <div className="mt-2 text-sm space-y-1 text-kira-muted">
          <div className="flex justify-between">
            <span>Untung tahunan</span>
            <span className="tabular-nums">
              RM{current.annualProfit.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between">
            <span>− Jumlah pelepasan</span>
            <span className="tabular-nums">
              RM{current.totalRelief.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between font-semibold text-kira-dark">
            <span>Pendapatan bercukai</span>
            <span className="tabular-nums">
              RM{current.chargeableIncome.toLocaleString()}
            </span>
          </div>
        </div>
      </details>

      <p className="text-sm text-kira-dark leading-relaxed bg-kira-sage/30 rounded-btn p-3">
        {narrative}
      </p>
      <p className="text-xs text-kira-muted mt-2">
        Ini anggaran sahaja. Untuk filing sebenar, rujuk LHDN atau akauntan.
      </p>
    </div>
  );
}
