import type { DeliveryTrap } from '@/lib/schemas';

export function DeliveryTrapTable({
  traps,
  narrative,
}: {
  traps: DeliveryTrap[];
  narrative: string | null;
}) {
  if (traps.length === 0) return null;
  return (
    <div className="card">
      <h3 className="serif text-xl mb-2">Perangkap platform delivery</h3>
      <p className="text-sm text-kira-muted mb-4">
        Item yang kelihatan laku di Grab/Foodpanda tapi untung kecil lepas komisyen.
      </p>
      <div className="overflow-x-auto -mx-2">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-kira-muted">
              <th className="px-2 py-2 font-medium">Item</th>
              <th className="px-2 py-2 font-medium text-right">Harga</th>
              <th className="px-2 py-2 font-medium text-right">Komisyen</th>
              <th className="px-2 py-2 font-medium text-right">Untung sebenar</th>
            </tr>
          </thead>
          <tbody>
            {traps.map((t) => (
              <tr key={t.itemId} className="border-t border-kira-sage/40">
                <td className="px-2 py-3 font-medium">{t.itemName}</td>
                <td className="px-2 py-3 text-right tabular-nums">RM{t.price.toFixed(2)}</td>
                <td className="px-2 py-3 text-right tabular-nums">
                  {Math.round(t.commission * 100)}%
                </td>
                <td className="px-2 py-3 text-right tabular-nums text-kira-red font-semibold">
                  RM{t.effectiveMarginRm.toFixed(2)}
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
