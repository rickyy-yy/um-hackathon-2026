// Shared demo scenario data — consumed by prisma/seed.ts AND
// scripts/generate-sample-csv.ts so the seeded dashboard and the
// sample-CSV upload path tell the same story (with the same numbers).

export type MenuSeed = {
  name: string;
  price: number;
  costPercent: number;
  category: string;
  isDelivery?: boolean;
  deliveryCommission?: number;
  addedAt?: Date;
  baseQtyPerDay: number;
  postEventQtyPerDay?: number;
};

// Two months of history: Feb is the prior period (before salted egg launch),
// Mar is the current period (with salted egg cannibalizing biasa).
// This gives analytics a real MoM delta to report instead of a synthetic one.
export const START = new Date('2026-02-01T00:00:00Z');
export const END = new Date('2026-03-30T00:00:00Z');
export const SALTED_EGG_LAUNCH = new Date('2026-03-15T00:00:00Z');

// Scaled ~3× down from original spec volumes so the profit/tax numbers
// land in a realistic "successful micro F&B" zone — not an enterprise zone.
// Cannibalization and delivery-trap ratios preserved.
export const MENU: MenuSeed[] = [
  { name: 'Nasi lemak ayam', price: 8.0, costPercent: 0.40, category: 'rice', baseQtyPerDay: 15 },
  {
    name: 'Nasi lemak biasa',
    price: 5.0,
    costPercent: 0.35,
    category: 'rice',
    baseQtyPerDay: 27,
    postEventQtyPerDay: 17,
  },
  {
    name: 'Nasi lemak salted egg',
    price: 12.0,
    costPercent: 0.52,
    category: 'rice',
    addedAt: SALTED_EGG_LAUNCH,
    baseQtyPerDay: 0,
    postEventQtyPerDay: 12,
  },
  { name: 'Mee goreng', price: 7.0, costPercent: 0.38, category: 'noodles', baseQtyPerDay: 10 },
  { name: 'Teh tarik', price: 2.5, costPercent: 0.25, category: 'drinks', baseQtyPerDay: 20 },
  {
    name: 'Milo dinosaur',
    price: 5.0,
    costPercent: 0.54,
    category: 'drinks',
    isDelivery: true,
    deliveryCommission: 0.30,
    baseQtyPerDay: 8,
  },
  { name: 'Roti bakar', price: 3.5, costPercent: 0.22, category: 'snacks', baseQtyPerDay: 7 },
  { name: 'Nasi goreng kampung', price: 7.5, costPercent: 0.40, category: 'rice', baseQtyPerDay: 8 },
  { name: 'Teh O ais', price: 2.0, costPercent: 0.20, category: 'drinks', baseQtyPerDay: 13 },
  { name: 'Maggi goreng', price: 6.0, costPercent: 0.35, category: 'noodles', baseQtyPerDay: 5 },
  { name: 'Kuih-muih', price: 1.5, costPercent: 0.45, category: 'snacks', baseQtyPerDay: 10 },
  { name: 'Air sirap', price: 2.0, costPercent: 0.15, category: 'drinks', baseQtyPerDay: 7 },
];

export const BENCHMARKS = [
  { itemName: 'nasi lemak', avgPrice: 7.20, minPrice: 5.50, maxPrice: 10.00, sampleSize: 42 },
  { itemName: 'teh tarik', avgPrice: 2.80, minPrice: 2.00, maxPrice: 3.50, sampleSize: 58 },
  { itemName: 'mee goreng', avgPrice: 7.80, minPrice: 6.00, maxPrice: 10.00, sampleSize: 36 },
  { itemName: 'nasi goreng', avgPrice: 8.00, minPrice: 6.50, maxPrice: 11.00, sampleSize: 49 },
  { itemName: 'roti bakar', avgPrice: 3.90, minPrice: 2.50, maxPrice: 5.00, sampleSize: 28 },
];

// Deterministic pseudo-random so reseeds and sample CSVs stay stable.
export function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function dayFactor(date: Date): number {
  const dow = date.getUTCDay();
  if (dow === 0 || dow === 6) return 1.15;
  if (dow === 1) return 0.85;
  return 1.0;
}

export type GeneratedSale = {
  itemName: string;
  date: Date;
  quantity: number;
  channel: string;
  price: number;
  costPercent: number;
  deliveryCommission?: number;
};

export function generateDailyRecords(
  menu: MenuSeed[] = MENU,
  startDate: Date = START,
  endDate: Date = END,
  rngSeed = 42
): GeneratedSale[] {
  const rand = mulberry32(rngSeed);
  const records: GeneratedSale[] = [];

  for (const m of menu) {
    for (
      let d = new Date(startDate);
      d <= endDate;
      d = new Date(d.getTime() + 86_400_000)
    ) {
      if (m.addedAt && d < m.addedAt) continue;
      const useBase =
        m.postEventQtyPerDay != null && d >= SALTED_EGG_LAUNCH ? false : true;
      const base = useBase ? m.baseQtyPerDay : (m.postEventQtyPerDay ?? m.baseQtyPerDay);
      if (base === 0) continue;

      const jitter = 0.85 + rand() * 0.3;
      const qty = Math.max(1, Math.round(base * dayFactor(d) * jitter));
      records.push({
        itemName: m.name,
        date: new Date(d),
        quantity: qty,
        channel: m.isDelivery ? (rand() > 0.5 ? 'grabfood' : 'dine-in') : 'dine-in',
        price: m.price,
        costPercent: m.costPercent,
        deliveryCommission: m.deliveryCommission,
      });
    }
  }

  return records;
}
