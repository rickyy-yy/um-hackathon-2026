import { PrismaClient } from '@prisma/client';
import { computeAnalytics } from '../lib/analytics';

const prisma = new PrismaClient();

type MenuSeed = {
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

const START = new Date('2026-03-01T00:00:00Z');
const END = new Date('2026-03-30T00:00:00Z');
const SALTED_EGG_LAUNCH = new Date('2026-03-15T00:00:00Z');

const MENU: MenuSeed[] = [
  { name: 'Nasi lemak ayam', price: 8.0, costPercent: 0.40, category: 'rice', baseQtyPerDay: 45 },
  {
    name: 'Nasi lemak biasa',
    price: 5.0,
    costPercent: 0.35,
    category: 'rice',
    baseQtyPerDay: 80,
    postEventQtyPerDay: 50,
  },
  {
    name: 'Nasi lemak salted egg',
    price: 12.0,
    costPercent: 0.52,
    category: 'rice',
    addedAt: SALTED_EGG_LAUNCH,
    baseQtyPerDay: 0,
    postEventQtyPerDay: 35,
  },
  { name: 'Mee goreng', price: 7.0, costPercent: 0.38, category: 'noodles', baseQtyPerDay: 30 },
  { name: 'Teh tarik', price: 2.5, costPercent: 0.25, category: 'drinks', baseQtyPerDay: 60 },
  {
    name: 'Milo dinosaur',
    price: 5.0,
    costPercent: 0.54,
    category: 'drinks',
    isDelivery: true,
    deliveryCommission: 0.30,
    baseQtyPerDay: 25,
  },
  { name: 'Roti bakar', price: 3.5, costPercent: 0.22, category: 'snacks', baseQtyPerDay: 20 },
  { name: 'Nasi goreng kampung', price: 7.5, costPercent: 0.40, category: 'rice', baseQtyPerDay: 25 },
  { name: 'Teh O ais', price: 2.0, costPercent: 0.20, category: 'drinks', baseQtyPerDay: 40 },
  { name: 'Maggi goreng', price: 6.0, costPercent: 0.35, category: 'noodles', baseQtyPerDay: 15 },
  { name: 'Kuih-muih', price: 1.5, costPercent: 0.45, category: 'snacks', baseQtyPerDay: 30 },
  { name: 'Air sirap', price: 2.0, costPercent: 0.15, category: 'drinks', baseQtyPerDay: 20 },
];

const BENCHMARKS = [
  { itemName: 'nasi lemak', avgPrice: 7.20, minPrice: 5.50, maxPrice: 10.00, sampleSize: 42 },
  { itemName: 'teh tarik', avgPrice: 2.80, minPrice: 2.00, maxPrice: 3.50, sampleSize: 58 },
  { itemName: 'mee goreng', avgPrice: 7.80, minPrice: 6.00, maxPrice: 10.00, sampleSize: 36 },
  { itemName: 'nasi goreng', avgPrice: 8.00, minPrice: 6.50, maxPrice: 11.00, sampleSize: 49 },
  { itemName: 'roti bakar', avgPrice: 3.90, minPrice: 2.50, maxPrice: 5.00, sampleSize: 28 },
];

// Deterministic pseudo-random so reports are stable between reseeds.
function mulberry32(seed: number) {
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

async function main() {
  console.log('Resetting seed data...');
  await prisma.salesRecord.deleteMany();
  await prisma.whatIfTurn.deleteMany();
  await prisma.report.deleteMany();
  await prisma.menuItem.deleteMany();
  await prisma.user.deleteMany();
  await prisma.areaBenchmark.deleteMany();

  const aminah = await prisma.user.create({
    data: {
      phone: '+60123456789',
      name: 'Mak Cik Aminah',
      area: 'Kajang',
    },
  });
  console.log(`Created user: ${aminah.name} (${aminah.id})`);

  const rand = mulberry32(42);

  for (const m of MENU) {
    const item = await prisma.menuItem.create({
      data: {
        userId: aminah.id,
        name: m.name,
        price: m.price,
        costPercent: m.costPercent,
        category: m.category,
        isDelivery: m.isDelivery ?? false,
        deliveryCommission: m.deliveryCommission ?? null,
        addedAt: m.addedAt ?? null,
      },
    });

    const records: { menuItemId: string; date: Date; quantity: number; channel: string }[] = [];
    for (
      let d = new Date(START);
      d <= END;
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
        menuItemId: item.id,
        date: new Date(d),
        quantity: qty,
        channel: m.isDelivery ? (rand() > 0.5 ? 'grabfood' : 'dine-in') : 'dine-in',
      });
    }
    if (records.length > 0) {
      await prisma.salesRecord.createMany({ data: records });
    }
  }

  for (const b of BENCHMARKS) {
    await prisma.areaBenchmark.create({
      data: { ...b, area: 'Kajang' },
    });
  }

  const analytics = await computeAnalytics(aminah.id);
  const reportData = {
    analytics,
    narration: null,
  };

  const report = await prisma.report.create({
    data: {
      userId: aminah.id,
      dateRangeFrom: new Date(analytics.dateRangeFrom),
      dateRangeTo: new Date(analytics.dateRangeTo),
      reportData: JSON.stringify(reportData),
    },
  });

  console.log(`Seeded report ${report.id}`);
  console.log(`  Total revenue: RM${analytics.totalRevenue.toLocaleString()}`);
  console.log(`  Est. profit:   RM${analytics.estimatedProfit.toLocaleString()}`);
  console.log(`  Annual tax:    RM${analytics.tax.annualTax.toLocaleString()}`);
  console.log(
    `  Cannibalization: ${analytics.cannibalization.detected ? `${analytics.cannibalization.culpritItem} → ${analytics.cannibalization.victimItem}` : 'none'}`
  );
  console.log(`  Delivery traps: ${analytics.deliveryTraps.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
