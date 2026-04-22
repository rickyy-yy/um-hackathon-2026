import type { ItemPerf } from '@/lib/schemas';

function barColor(status: ItemPerf['status']): string {
  if (status === 'Rugi') return '#D64933';
  if (status === 'Bahaya') return '#F0DD62';
  return '#0F6E56';
}

export function ProfitBars({ items }: { items: ItemPerf[] }) {
  const sorted = [...items].sort((a, b) => b.monthlyProfit - a.monthlyProfit);
  const max = Math.max(...sorted.map((i) => i.monthlyProfit), 1);
  return (
    <div className="space-y-3">
      {sorted.map((i) => {
        const pct = Math.max(2, (i.monthlyProfit / max) * 100);
        return (
          <div key={i.id}>
            <div className="flex justify-between text-sm mb-1">
              <span className="font-medium">{i.name}</span>
              <span className="text-kira-muted tabular-nums">
                RM{i.monthlyProfit.toLocaleString()}
              </span>
            </div>
            <div className="bar-track">
              <div
                className="bar-fill"
                style={{ width: `${pct}%`, background: barColor(i.status) }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
