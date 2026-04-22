// Load .env.local before anything imports lib/llm (env is read at module init)
import { config as loadEnv } from 'dotenv';
import { resolve } from 'path';
loadEnv({ path: resolve(process.cwd(), '.env.local') });
loadEnv({ path: resolve(process.cwd(), '.env'), override: false });

import { PrismaClient } from '@prisma/client';
import { computeAnalytics } from '../lib/analytics';
import { llm } from '../lib/llm';
import { MENU, BENCHMARKS, generateDailyRecords } from '../lib/scenario';

const prisma = new PrismaClient();

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

    const records = generateDailyRecords([m])
      .filter((r) => r.itemName === m.name)
      .map((r) => ({
        menuItemId: item.id,
        date: r.date,
        quantity: r.quantity,
        channel: r.channel,
      }));

    if (records.length > 0) {
      await prisma.salesRecord.createMany({ data: records });
    }
  }

  for (const b of BENCHMARKS) {
    await prisma.areaBenchmark.create({ data: { ...b, area: 'Kajang' } });
  }

  const analytics = await computeAnalytics(aminah.id);
  // Pre-generate narration at seed time so the dashboard doesn't block on
  // an LLM round-trip on first load. Falls back to inline generation if this
  // ever fails (dashboard keeps a null-narration safety net).
  let narration = null;
  try {
    narration = await llm({ task: 'report', analytics, locale: 'ms' });
  } catch (e) {
    console.warn('Narration pre-gen failed, dashboard will retry:', e);
  }

  const report = await prisma.report.create({
    data: {
      userId: aminah.id,
      dateRangeFrom: new Date(analytics.dateRangeFrom),
      dateRangeTo: new Date(analytics.dateRangeTo),
      reportData: JSON.stringify({ analytics, narration, narrationLocale: 'ms' }),
    },
  });

  console.log(`Seeded report ${report.id}`);
  console.log(`  Total revenue: RM${analytics.totalRevenue.toLocaleString()}`);
  console.log(`  Est. profit:   RM${analytics.estimatedProfit.toLocaleString()}`);
  console.log(`  Annual tax:    RM${analytics.tax.annualTax.toLocaleString()}`);
  console.log(
    `  Cannibalization: ${
      analytics.cannibalization.detected
        ? `${analytics.cannibalization.culpritItem} → ${analytics.cannibalization.victimItem}`
        : 'none'
    }`
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
