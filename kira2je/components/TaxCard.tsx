'use client';

import { useState, useMemo } from 'react';
import { calculateTax, PERSONAL_RELIEFS, RELIEF_LABELS_BM, type ReliefKey } from '@/lib/tax';
import type { TaxBreakdown } from '@/lib/schemas';

const OPTIONAL: ReliefKey[] = ['epf', 'socso', 'lifestyle', 'medical_insurance', 'education_insurance'];

export function TaxCard({
  initial,
  annualProfit,
  narrative,
}: {
  initial: TaxBreakdown;
  annualProfit: number;
  narrative: string;
}) {
  const [selected, setSelected] = useState<Set<ReliefKey>>(new Set());
  const current = useMemo(
    () => calculateTax(annualProfit, [...selected]),
    [annualProfit, selected]
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
        Berdasarkan untung bulanan dan pelepasan cukai individu.
      </p>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-kira-cream rounded-btn p-3">
          <div className="text-xs text-kira-muted">Cukai tahunan</div>
          <div className="serif text-2xl">RM{current.annualTax.toLocaleString()}</div>
        </div>
        <div className="bg-kira-cream rounded-btn p-3">
          <div className="text-xs text-kira-muted">Sebulan</div>
          <div className="serif text-2xl">RM{current.monthlyTax.toLocaleString()}</div>
        </div>
      </div>

      <details className="mb-3">
        <summary className="cursor-pointer text-sm font-medium text-kira-teal">
          Tunjuk kiraan
        </summary>
        <div className="mt-2 text-sm space-y-1 text-kira-muted">
          <div className="flex justify-between">
            <span>Untung tahunan</span>
            <span className="tabular-nums">RM{current.annualProfit.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span>− Jumlah pelepasan</span>
            <span className="tabular-nums">RM{current.totalRelief.toLocaleString()}</span>
          </div>
          <div className="flex justify-between font-semibold text-kira-dark">
            <span>Pendapatan bercukai</span>
            <span className="tabular-nums">RM{current.chargeableIncome.toLocaleString()}</span>
          </div>
        </div>
      </details>

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

      <p className="text-sm text-kira-dark leading-relaxed bg-kira-sage/30 rounded-btn p-3">
        {narrative}
      </p>
      <p className="text-xs text-kira-muted mt-2">
        Ini anggaran sahaja. Untuk filing sebenar, rujuk LHDN atau akauntan.
      </p>
    </div>
  );
}
