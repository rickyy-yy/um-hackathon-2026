import { prisma } from '../lib/db';

async function main() {
  const r = await prisma.report.findFirst({ orderBy: { createdAt: 'desc' } });
  if (!r) {
    console.log('No reports');
    return;
  }
  const d = JSON.parse(r.reportData);
  console.log('Current revenue:', d.analytics.totalRevenue);
  console.log('Current profit:', d.analytics.estimatedProfit);
  console.log('Revenue change %:', d.analytics.revenueChangePct);
  console.log('Profit change %:', d.analytics.profitChangePct);
  console.log(
    'Cannibalization:',
    d.analytics.cannibalization.culpritItem,
    '→',
    d.analytics.cannibalization.victimItem,
    'vol:',
    d.analytics.cannibalization.volumeBefore,
    '→',
    d.analytics.cannibalization.volumeAfter
  );
}

main().finally(() => prisma.$disconnect());
