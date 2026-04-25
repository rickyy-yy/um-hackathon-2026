import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { llm } from '@/lib/llm';
import { getLocale } from '@/lib/i18n/server';
import type { InvoiceLineItem } from '@/lib/schemas';

export const maxDuration = 120;

type LineItem = InvoiceLineItem;

function parseJson<T>(raw: unknown, fallback: T): T {
  try {
    if (typeof raw === 'string') return JSON.parse(raw) as T;
    if (raw !== null && typeof raw === 'object') return raw as T;
    return fallback;
  } catch { return fallback; }
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  try {
    const { month } = (await req.json()) as { month: string };
    if (!month) return NextResponse.json({ ok: false, error: 'month is required' }, { status: 400 });

    const locale = await getLocale();

    // 1. Confirmed invoices for this month
    const invoiceRows = await prisma.invoice.findMany({
      where: { userId: session.userId, month, status: 'confirmed' },
    });
    const expenseData = {
      invoices: invoiceRows.map((row) => ({
        supplierName: row.supplierName,
        invoiceDate: row.invoiceDate ? row.invoiceDate.toISOString().slice(0, 10) : null,
        total: row.total,
        lineItems: parseJson<LineItem[]>(row.lineItems, []),
      })),
    };

    // 2. POS upload for this month
    const posUpload = await prisma.posUpload.findUnique({
      where: { userId_month: { userId: session.userId, month } },
    });
    const salesData = posUpload ? parseJson<unknown[]>(posUpload.parsedData, []) : [];

    // 3. Ingredient mappings
    const mappingRows = await prisma.ingredientMapping.findMany({
      where: { userId: session.userId },
    });
    const mappings = mappingRows.map((m) => ({
      ingredient: m.ingredient,
      supplier: m.supplier,
      menuItems: parseJson<string[]>(m.menuItems, []),
    }));

    // 4. Historical data — slim format (just revenue + margin per month)
    //    Prefer saved Report records; fall back to PosUpload revenue summaries.
    const pastMonths = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(month + '-01');
      d.setMonth(d.getMonth() - (i + 1));
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    });

    const [pastReports, pastPosUploads] = await Promise.all([
      prisma.report.findMany({
        where: { userId: session.userId, month: { in: pastMonths } },
        orderBy: { month: 'desc' },
      }),
      prisma.posUpload.findMany({
        where: { userId: session.userId, month: { in: pastMonths } },
        orderBy: { month: 'desc' },
      }),
    ]);

    const reportedMonths = new Set(pastReports.map((r) => r.month));

    const historicalData = [
      ...pastReports.map((r) => {
        const mv = parseJson<{ summary?: { totalRevenue?: number; totalExpenses?: number; marginPct?: number } }>(r.monthView, {});
        return {
          month: r.month,
          totalRevenue: mv.summary?.totalRevenue ?? null,
          totalExpenses: mv.summary?.totalExpenses ?? null,
          marginPct: mv.summary?.marginPct ?? null,
        };
      }),
      ...pastPosUploads
        .filter((p) => !reportedMonths.has(p.month))
        .map((p) => {
          const rows = parseJson<{ quantity?: number; unitPrice?: number }[]>(p.parsedData, []);
          const totalRevenue = rows.reduce((s, r) => s + (r.quantity ?? 0) * (r.unitPrice ?? 0), 0);
          return { month: p.month, totalRevenue, totalExpenses: null, marginPct: null };
        }),
    ].sort((a, b) => b.month.localeCompare(a.month));

    // 5. Run monthView and trendsView in parallel
    const [monthView, trendsView] = await Promise.all([
      llm({ task: 'report-month', salesData, expenseData, mappings, locale }),
      llm({ task: 'report-trends', currentMonthSummary: { month, salesData: salesData.length }, historicalData, locale }),
    ]);

    // 6. Upsert report
    await prisma.report.upsert({
      where: { userId_month: { userId: session.userId, month } },
      create: {
        userId: session.userId,
        month,
        monthView: JSON.stringify(monthView),
        trendsView: JSON.stringify(trendsView),
      },
      update: {
        monthView: JSON.stringify(monthView),
        trendsView: JSON.stringify(trendsView),
        generatedAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true, month });
  } catch (e) {
    const message = (e as Error)?.message ?? 'Unknown error';
    console.error('[report/generate]', message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
