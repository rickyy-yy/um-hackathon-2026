import { PrismaClient } from '@prisma/client';
import { computeAnalytics } from '../lib/analytics';
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
  const report = await prisma.report.create({
    data: {
      userId: aminah.id,
      dateRangeFrom: new Date(analytics.dateRangeFrom),
      dateRangeTo: new Date(analytics.dateRangeTo),
      reportData: JSON.stringify({ analytics, narration: null }),
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
