import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { computeAnalytics } from '@/lib/analytics';
import { llm } from '@/lib/llm';
import { getLocale } from '@/lib/i18n/server';

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });

  const { answers } = (await req.json()) as {
    answers: { items?: string; prices?: string; qty?: string; months?: string };
  };

  const itemNames = (answers.items ?? '')
    .split(/[,،]/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  if (itemNames.length === 0) {
    return NextResponse.json({ ok: false, error: 'No items found' }, { status: 400 });
  }

  const priceNums = extractNumbers(answers.prices ?? '');
  const qtyNums = extractNumbers(answers.qty ?? '');
  const months = Math.max(1, extractFirstNumber(answers.months ?? '') ?? 1);

  await prisma.salesRecord.deleteMany({
    where: { menuItem: { userId: session.userId } },
  });
  await prisma.menuItem.deleteMany({ where: { userId: session.userId } });

  const today = new Date();

  for (let i = 0; i < itemNames.length; i++) {
    const name = itemNames[i];
    const price = priceNums[i] ?? 5;
    const dailyQty = qtyNums[i] ?? 10;

    const item = await prisma.menuItem.create({
      data: {
        userId: session.userId,
        name,
        price,
        costPercent: 0.35,
        category: inferCategory(name),
      },
    });

    for (let m = 0; m < months; m++) {
      const date = new Date(today);
      date.setMonth(date.getMonth() - months + m);
      await prisma.salesRecord.create({
        data: {
          menuItemId: item.id,
          date,
          quantity: Math.round(dailyQty * 30),
          channel: 'dine-in',
        },
      });
    }
  }

  const analytics = await computeAnalytics(session.userId);
  const locale = await getLocale();
  let narration = null;
  try {
    narration = await llm({ task: 'report', analytics, locale });
  } catch {
    // non-fatal; dashboard will retry
  }

  const report = await prisma.report.create({
    data: {
      userId: session.userId,
      dateRangeFrom: new Date(analytics.dateRangeFrom),
      dateRangeTo: new Date(analytics.dateRangeTo),
      reportData: JSON.stringify({ analytics, narration, narrationLocale: locale }),
    },
  });

  return NextResponse.json({ ok: true, reportId: report.id });
}

function extractNumbers(text: string): number[] {
  return [...text.matchAll(/\d+(?:\.\d+)?/g)].map((m) => Number(m[0]));
}

function extractFirstNumber(text: string): number | null {
  const m = text.match(/\d+(?:\.\d+)?/);
  return m ? Number(m[0]) : null;
}

function inferCategory(name: string): string {
  const n = name.toLowerCase();
  if (/(nasi|rice)/.test(n)) return 'rice';
  if (/(mee|maggi|noodle)/.test(n)) return 'noodles';
  if (/(teh|milo|kopi|air|juice|sirap)/.test(n)) return 'drinks';
  return 'snacks';
}
