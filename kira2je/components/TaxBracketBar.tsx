import { MALAYSIA_TAX_BRACKETS_YA2025 } from '@/lib/tax';

// Horizontal bar showing YA2025 tax brackets with a pin at the user's
// chargeable income. Scaled so brackets above ~1.5× the user's income
// (or RM100k minimum) are clipped — keeps the relevant rungs legible
// without the RM2M+ bracket dominating the view.
export function TaxBracketBar({
  chargeableIncome,
}: {
  chargeableIncome: number;
}) {
  const showUpTo = Math.max(100_000, chargeableIncome * 1.5);

  type Seg = { rate: number; min: number; max: number; width: number };
  const segments: Seg[] = [];
  for (const b of MALAYSIA_TAX_BRACKETS_YA2025) {
    const segMin = Math.max(0, b.min - 1);
    if (segMin >= showUpTo) break;
    const segMax = Math.min(showUpTo, b.max);
    segments.push({
      rate: b.rate,
      min: segMin,
      max: segMax,
      width: (segMax - segMin) / showUpTo,
    });
  }

  const userPct = Math.min(1, Math.max(0, chargeableIncome / showUpTo));
  const current = MALAYSIA_TAX_BRACKETS_YA2025.find(
    (b) => chargeableIncome >= b.min - 1 && chargeableIncome <= b.max
  );
  const next = MALAYSIA_TAX_BRACKETS_YA2025.find(
    (b) => b.min > chargeableIncome
  );

  return (
    <div>
      <div className="text-sm font-semibold mb-2">Kadar cukai anda</div>

      <div className="relative h-9 rounded-full overflow-hidden flex">
        {segments.map((s, i) => (
          <div
            key={i}
            className="h-full flex items-center justify-center text-[11px] font-semibold"
            style={{
              width: `${s.width * 100}%`,
              background: segmentColor(s.rate),
              color: s.rate <= 0.06 ? '#1A2E28' : 'white',
            }}
            title={`${Math.round(s.rate * 100)}%: RM${s.min.toLocaleString()} – RM${s.max === Infinity ? '∞' : s.max.toLocaleString()}`}
          >
            {Math.round(s.rate * 100)}%
          </div>
        ))}
        <div
          className="absolute top-[-4px] bottom-[-4px] w-[3px] bg-kira-dark rounded-full shadow-lg"
          style={{ left: `calc(${userPct * 100}% - 1.5px)` }}
          aria-label="Kedudukan anda"
        />
        <div
          className="absolute -top-6 text-[10px] text-kira-dark font-semibold whitespace-nowrap"
          style={{
            left: `${userPct * 100}%`,
            transform: 'translateX(-50%)',
          }}
        >
          ▼ anda
        </div>
      </div>

      <div className="flex justify-between text-[10px] text-kira-muted mt-1 tabular-nums">
        <span>RM0</span>
        <span>RM{(showUpTo / 1000).toFixed(0)}k</span>
      </div>

      {current && (
        <p className="text-sm mt-3 leading-relaxed">
          Anda sekarang dalam kadar{' '}
          <strong>{Math.round(current.rate * 100)}%</strong>
          {next && next.rate > current.rate && (
            <>
              . Kadar seterusnya ({Math.round(next.rate * 100)}%) bermula pada
              RM{next.min.toLocaleString()} — RM
              {(next.min - chargeableIncome).toLocaleString()} lagi.
            </>
          )}
        </p>
      )}
    </div>
  );
}

function segmentColor(rate: number): string {
  if (rate === 0) return '#0F6E56';
  if (rate <= 0.03) return '#2E8A6E';
  if (rate <= 0.06) return '#5FA883';
  if (rate <= 0.11) return '#C6DABF';
  if (rate <= 0.19) return '#F0DD62';
  if (rate <= 0.25) return '#E89B3A';
  return '#D64933';
}
