import type { Cannibalization } from '@/lib/schemas';

export function CannibalizationAlert({
  data,
  narrative,
}: {
  data: Cannibalization;
  narrative: string | null;
}) {
  if (!data.detected) return null;
  const before = data.volumeBefore ?? 0;
  const after = data.volumeAfter ?? 0;
  const max = Math.max(before, after, 1);
  const net = data.netMonthlyImpactRm ?? 0;

  return (
    <div className="rounded-card border-2 border-kira-red bg-white p-5">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-kira-red/15 flex items-center justify-center shrink-0">
          <span className="text-kira-red text-xl font-bold">!</span>
        </div>
        <div>
          <h3 className="serif text-xl text-kira-red">Tanda kanibalisasi dikesan</h3>
          <p className="text-sm text-kira-muted">
            {data.culpritItem} menarik jualan dari {data.victimItem}
          </p>
        </div>
      </div>

      <div className="space-y-3 mb-4">
        <div>
          <div className="flex justify-between text-xs text-kira-muted mb-1">
            <span>{data.victimItem} — sebelum</span>
            <span className="tabular-nums">{before}/hari</span>
          </div>
          <div className="bar-track">
            <div
              className="bar-fill"
              style={{ width: `${(before / max) * 100}%`, background: '#0F6E56' }}
            />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-xs text-kira-muted mb-1">
            <span>{data.victimItem} — sekarang</span>
            <span className="tabular-nums">{after}/hari</span>
          </div>
          <div className="bar-track">
            <div
              className="bar-fill"
              style={{ width: `${(after / max) * 100}%`, background: '#D64933' }}
            />
          </div>
        </div>
      </div>

      <div className="bg-kira-cream rounded-btn px-4 py-3">
        <div className="text-xs text-kira-muted">Net impact bulanan</div>
        <div className={`serif text-2xl ${net >= 0 ? 'text-kira-teal' : 'text-kira-red'}`}>
          {net >= 0 ? '+' : '−'}RM{Math.abs(net).toLocaleString()}
        </div>
      </div>

      {narrative && <p className="mt-3 text-sm text-kira-dark leading-relaxed">{narrative}</p>}
    </div>
  );
}
