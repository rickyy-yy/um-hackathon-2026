import type { BenchmarkRow } from '@/lib/schemas';

export function BenchmarkCard({ rows }: { rows: BenchmarkRow[] }) {
  if (rows.length === 0) return null;
  return (
    <div className="card">
      <h3 className="serif text-xl mb-1">Perbandingan harga di kawasan anda</h3>
      <p className="text-sm text-kira-muted mb-4">
        Dalam 3km dari {rows[0].area} (sumber: platform delivery)
      </p>
      <div className="space-y-4">
        {rows.map((r) => {
          const yourPos = r.userPrice != null
            ? ((r.userPrice - r.minPrice) / Math.max(0.01, r.maxPrice - r.minPrice)) * 100
            : null;
          const avgPos = ((r.avgPrice - r.minPrice) / Math.max(0.01, r.maxPrice - r.minPrice)) * 100;
          return (
            <div key={r.itemName}>
              <div className="flex justify-between text-sm mb-2">
                <span className="font-medium capitalize">{r.itemName}</span>
                <span className="text-kira-muted">
                  {r.userPrice != null ? (
                    <>
                      Anda <span className="tabular-nums font-semibold text-kira-dark">RM{r.userPrice.toFixed(2)}</span> · Purata RM{r.avgPrice.toFixed(2)}
                    </>
                  ) : (
                    <>Purata RM{r.avgPrice.toFixed(2)}</>
                  )}
                </span>
              </div>
              <div className="relative h-3 bg-kira-sage/30 rounded-full">
                <div
                  className="absolute top-0 bottom-0 w-[1px] bg-kira-muted/60"
                  style={{ left: `${avgPos}%` }}
                  aria-label="Purata kawasan"
                />
                {yourPos != null && (
                  <div
                    className="absolute -top-1 -bottom-1 w-3 h-5 rounded-full bg-kira-teal border-2 border-white shadow"
                    style={{ left: `calc(${yourPos}% - 6px)` }}
                    aria-label="Harga anda"
                  />
                )}
              </div>
              <div className="flex justify-between text-[11px] text-kira-muted mt-1 tabular-nums">
                <span>RM{r.minPrice.toFixed(2)}</span>
                <span>RM{r.maxPrice.toFixed(2)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
