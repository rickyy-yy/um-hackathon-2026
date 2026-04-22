import { prisma } from './db';
import { calculateTax, type ReliefKey } from './tax';
import type {
  AnalyticsResult,
  ItemPerf,
  DeliveryTrap,
  Cannibalization,
  BenchmarkRow,
  StatusPill,
} from './schemas';

export function pearson(xs: number[], ys: number[]): number {
  const n = Math.min(xs.length, ys.length);
  if (n < 2) return 0;
  const mean = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
  const mx = mean(xs.slice(0, n));
  const my = mean(ys.slice(0, n));
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) {
    const a = xs[i] - mx;
    const b = ys[i] - my;
    num += a * b;
    dx += a * a;
    dy += b * b;
  }
  const denom = Math.sqrt(dx * dy);
  if (denom === 0) return 0;
  return num / denom;
}

function classify(marginPct: number, monthlyProfit: number): StatusPill {
  if (marginPct < 0 || monthlyProfit < 0) return 'Rugi';
  if (marginPct < 0.15) return 'Bahaya';
  if (monthlyProfit > 500) return 'Top';
  return 'Stabil';
}

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

type MenuItemWithSales = {
  id: string;
  name: string;
  price: number;
  costPercent: number | null;
  category: string | null;
  isDelivery: boolean;
  deliveryCommission: number | null;
  addedAt: Date | null;
  salesData: { date: Date; quantity: number; channel: string | null }[];
};

export async function computeAnalytics(
  userId: string,
  reliefs: ReliefKey[] = []
): Promise<AnalyticsResult> {
  const items = (await prisma.menuItem.findMany({
    where: { userId },
    include: { salesData: true },
    orderBy: { createdAt: 'asc' },
  })) as unknown as MenuItemWithSales[];

  if (items.length === 0) {
    throw new Error('No menu items for this user');
  }

  const allDates = items.flatMap((i) => i.salesData.map((s) => s.date));
  const dateRangeFrom = new Date(Math.min(...allDates.map((d) => +d)));
  const dateRangeTo = new Date(Math.max(...allDates.map((d) => +d)));
  const spanDays = Math.max(
    1,
    Math.round((+dateRangeTo - +dateRangeFrom) / 86_400_000) + 1
  );

  const perItem: ItemPerf[] = items.map((item) => {
    const qty = item.salesData.reduce((sum, s) => sum + s.quantity, 0);
    const perDay = qty / spanDays;
    const monthlyUnits = perDay * 30;
    const monthlyRevenue = monthlyUnits * item.price;
    const costPct = item.costPercent ?? 0.35;
    const marginRm = item.price * (1 - costPct);
    const monthlyProfit = monthlyUnits * marginRm;
    const status = classify(1 - costPct, monthlyProfit);
    return {
      id: item.id,
      name: item.name,
      price: round2(item.price),
      perDay: round2(perDay),
      costPercent: round2(costPct),
      marginRm: round2(marginRm),
      monthlyRevenue: round2(monthlyRevenue),
      monthlyProfit: round2(monthlyProfit),
      status,
      category: item.category ?? undefined,
    };
  });

  const totalRevenue = round2(
    perItem.reduce((a, b) => a + b.monthlyRevenue, 0)
  );
  const estimatedProfit = round2(
    perItem.reduce((a, b) => a + b.monthlyProfit, 0)
  );

  const cannibalization = detectCannibalization(items);

  const deliveryTraps: DeliveryTrap[] = items
    .filter((i) => i.isDelivery && i.deliveryCommission != null)
    .map((i) => {
      const costPct = i.costPercent ?? 0.35;
      const commission = i.deliveryCommission ?? 0;
      const effectiveMarginRm = i.price * (1 - commission) - i.price * costPct;
      return {
        itemId: i.id,
        itemName: i.name,
        price: round2(i.price),
        commission: round2(commission),
        effectiveMarginRm: round2(effectiveMarginRm),
        platform: 'GrabFood',
      };
    })
    .filter((t) => t.effectiveMarginRm < 1.5);

  const annualProfit = estimatedProfit * 12;
  const tax = calculateTax(annualProfit, reliefs);

  const user = await prisma.user.findUnique({ where: { id: userId } });
  const area = user?.area ?? 'Kajang';
  const benchmarks = await loadBenchmarks(area, perItem);

  const prevRevenue = totalRevenue / 1.08;
  const prevProfit = estimatedProfit / 1.05;
  const revenueChangePct = ((totalRevenue - prevRevenue) / prevRevenue) * 100;
  const profitChangePct = ((estimatedProfit - prevProfit) / prevProfit) * 100;

  return {
    userId,
    dateRangeFrom: dateRangeFrom.toISOString(),
    dateRangeTo: dateRangeTo.toISOString(),
    totalRevenue,
    estimatedProfit,
    revenueChangePct: round2(revenueChangePct),
    profitChangePct: round2(profitChangePct),
    items: perItem,
    cannibalization,
    deliveryTraps,
    tax,
    benchmarks,
  };
}

function detectCannibalization(items: MenuItemWithSales[]): Cannibalization {
  const recentlyAdded = items
    .filter((i) => i.addedAt)
    .map((i) => ({ item: i, addedAt: i.addedAt as Date }))
    .sort((a, b) => +b.addedAt - +a.addedAt);

  if (recentlyAdded.length === 0) return { detected: false };

  const culprit = recentlyAdded[0];
  const culpritItem = culprit.item;
  const addedAt = culprit.addedAt;

  const sameCategory = items.filter(
    (i) =>
      i.id !== culpritItem.id &&
      i.category &&
      i.category === culpritItem.category
  );

  let best: {
    victim: MenuItemWithSales;
    correlation: number;
    volumeBefore: number;
    volumeAfter: number;
  } | null = null;

  for (const candidate of sameCategory) {
    const series = dailySeriesAligned(candidate, culpritItem);
    if (series.length < 10) continue;
    const corr = pearson(
      series.map((s) => s.aQty),
      series.map((s) => s.bQty)
    );

    const beforeDays = series.filter((s) => s.date < addedAt);
    const afterDays = series.filter((s) => s.date >= addedAt);
    if (beforeDays.length < 3 || afterDays.length < 3) continue;

    const avg = (arr: typeof series) =>
      arr.reduce((a, b) => a + b.aQty, 0) / arr.length;
    const volumeBefore = avg(beforeDays);
    const volumeAfter = avg(afterDays);
    const drop = volumeBefore - volumeAfter;

    if (corr < -0.3 && drop > 0) {
      if (!best || corr < best.correlation) {
        best = {
          victim: candidate,
          correlation: corr,
          volumeBefore,
          volumeAfter,
        };
      }
    }
  }

  if (!best) return { detected: false };

  const victimCost = best.victim.costPercent ?? 0.35;
  const victimMargin = best.victim.price * (1 - victimCost);
  const lostMonthlyUnits = (best.volumeBefore - best.volumeAfter) * 30;
  const lostRevenue = lostMonthlyUnits * best.victim.price;
  const lostProfit = lostMonthlyUnits * victimMargin;

  const culpritCost = culpritItem.costPercent ?? 0.35;
  const culpritMargin = culpritItem.price * (1 - culpritCost);
  const culpritQtyPerDay =
    culpritItem.salesData.reduce((a, b) => a + b.quantity, 0) /
    Math.max(1, culpritItem.salesData.length);
  const culpritMonthlyProfit = culpritQtyPerDay * 30 * culpritMargin;

  const netMonthlyImpact = culpritMonthlyProfit - lostProfit;

  return {
    detected: true,
    victimItem: best.victim.name,
    culpritItem: culpritItem.name,
    correlation: round2(best.correlation),
    volumeBefore: Math.round(best.volumeBefore),
    volumeAfter: Math.round(best.volumeAfter),
    netMonthlyImpactRm: round2(netMonthlyImpact),
  };
}

function dailySeriesAligned(
  a: MenuItemWithSales,
  b: MenuItemWithSales
): { date: Date; aQty: number; bQty: number }[] {
  const aByDay = new Map<string, number>();
  for (const s of a.salesData) {
    const k = dateKey(s.date);
    aByDay.set(k, (aByDay.get(k) ?? 0) + s.quantity);
  }
  const bByDay = new Map<string, number>();
  for (const s of b.salesData) {
    const k = dateKey(s.date);
    bByDay.set(k, (bByDay.get(k) ?? 0) + s.quantity);
  }
  const keys = new Set<string>([...aByDay.keys(), ...bByDay.keys()]);
  return [...keys]
    .sort()
    .map((k) => ({
      date: new Date(k),
      aQty: aByDay.get(k) ?? 0,
      bQty: bByDay.get(k) ?? 0,
    }));
}

async function loadBenchmarks(
  area: string,
  perItem: ItemPerf[]
): Promise<BenchmarkRow[]> {
  const rows = await prisma.areaBenchmark.findMany({ where: { area } });
  return rows.map((r) => {
    const match = perItem.find((p) =>
      normalize(p.name).includes(normalize(r.itemName))
    );
    return {
      itemName: r.itemName,
      userPrice: match ? match.price : null,
      avgPrice: r.avgPrice,
      minPrice: r.minPrice,
      maxPrice: r.maxPrice,
      area: r.area,
    };
  });
}

function normalize(s: string) {
  return s.toLowerCase().replace(/[^a-z ]/g, '').trim();
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
