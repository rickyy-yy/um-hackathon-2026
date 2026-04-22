import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { llm } from '@/lib/llm';
import { computeAnalytics } from '@/lib/analytics';

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });

  const { images } = (await req.json()) as {
    images: { name: string; base64: string; mimeType: string }[];
  };
  if (!images || images.length === 0) {
    return NextResponse.json({ ok: false, error: 'Tiada gambar dihantar' }, { status: 400 });
  }

  const aggregated: { name: string; quantity: number; price: number; date: string }[] = [];
  for (const img of images) {
    const result = await llm({
      task: 'ocr',
      imageBase64: img.base64,
      mimeType: img.mimeType,
    });
    aggregated.push(...result.items);
  }

  await prisma.salesRecord.deleteMany({
    where: { menuItem: { userId: session.userId } },
  });
  await prisma.menuItem.deleteMany({ where: { userId: session.userId } });

  const byItem = new Map<string, { price: number; first: Date }>();
  for (const r of aggregated) {
    const k = r.name.trim();
    const d = new Date(r.date);
    const existing = byItem.get(k);
    if (!existing || d < existing.first) byItem.set(k, { price: r.price, first: d });
  }

  const created: Record<string, string> = {};
  for (const [name, meta] of byItem) {
    const item = await prisma.menuItem.create({
      data: {
        userId: session.userId,
        name,
        price: meta.price,
        costPercent: guessCostPercent(name),
        category: inferCategory(name),
      },
    });
    created[name] = item.id;
  }

  await prisma.salesRecord.createMany({
    data: aggregated.map((r) => ({
      menuItemId: created[r.name.trim()]!,
      date: new Date(r.date),
      quantity: r.quantity,
      channel: 'dine-in',
    })),
  });

  const analytics = await computeAnalytics(session.userId);
  const report = await prisma.report.create({
    data: {
      userId: session.userId,
      dateRangeFrom: new Date(analytics.dateRangeFrom),
      dateRangeTo: new Date(analytics.dateRangeTo),
      reportData: JSON.stringify({ analytics, narration: null }),
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

function guessCostPercent(name: string): number {
  const n = name.toLowerCase();
  if (n.includes('salted egg')) return 0.52;
  if (n.includes('ayam')) return 0.40;
  if (/teh|milo|kopi|air|sirap/.test(n)) return 0.25;
  return 0.35;
}
