import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { computeAnalytics } from '@/lib/analytics';
import { llm } from '@/lib/llm';
import { getLocale } from '@/lib/i18n/server';

type Row = {
  item: string;
  price: number;
  quantity: number;
  date: string;
  channel?: string;
  cost_percent?: number | null;
  delivery_commission?: number | null;
};

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });

  const body = (await req.json()) as { rows: Row[] };
  const rows = body.rows?.filter((r) => r && r.item && r.price != null && r.quantity != null);
  if (!rows || rows.length === 0) {
    return NextResponse.json({ ok: false, error: 'Tiada data yang sah dalam fail' }, { status: 400 });
  }

  await prisma.salesRecord.deleteMany({
    where: { menuItem: { userId: session.userId } },
  });
  await prisma.menuItem.deleteMany({ where: { userId: session.userId } });

  const byItem = new Map<string, { price: number; costPercent?: number; commission?: number; channel?: string; first: Date }>();
  for (const r of rows) {
    const key = r.item.trim();
    const existing = byItem.get(key);
    const d = new Date(r.date);
    if (!existing) {
      byItem.set(key, {
        price: r.price,
        costPercent: r.cost_percent ?? undefined,
        commission: r.delivery_commission ?? undefined,
        channel: r.channel,
        first: d,
      });
    } else {
      if (d < existing.first) existing.first = d;
    }
  }

  const itemRecords: Record<string, string> = {};
  for (const [name, meta] of byItem) {
    const created = await prisma.menuItem.create({
      data: {
        userId: session.userId,
        name,
        price: meta.price,
        costPercent: meta.costPercent ?? 0.35,
        category: inferCategory(name),
        isDelivery: meta.channel === 'grabfood' || meta.channel === 'foodpanda' || meta.commission != null,
        deliveryCommission: meta.commission ?? null,
      },
    });
    itemRecords[name] = created.id;
  }

  await prisma.salesRecord.createMany({
    data: rows.map((r) => ({
      menuItemId: itemRecords[r.item.trim()]!,
      date: new Date(r.date),
      quantity: r.quantity,
      channel: r.channel ?? 'dine-in',
    })),
  });

  const analytics = await computeAnalytics(session.userId);
  const locale = await getLocale();
  let narration = null;
  try {
    narration = await llm({ task: 'report', analytics, locale });
  } catch {
    // non-fatal; dashboard will retry narration lazily
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

function inferCategory(name: string): string {
  const n = name.toLowerCase();
  if (/(nasi|rice)/.test(n)) return 'rice';
  if (/(mee|maggi|noodle)/.test(n)) return 'noodles';
  if (/(teh|milo|kopi|air|juice|sirap)/.test(n)) return 'drinks';
  return 'snacks';
}
