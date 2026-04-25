import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { llm } from '@/lib/llm';
import { getLocale } from '@/lib/i18n/server';
import type { InvoiceLineItem } from '@/lib/schemas';

type LineItem = InvoiceLineItem;

function parseLineItems(raw: unknown): LineItem[] {
  try {
    if (typeof raw === 'string') return JSON.parse(raw);
    if (Array.isArray(raw)) return raw as LineItem[];
    return [];
  } catch {
    return [];
  }
}

function parsePosData(raw: unknown): unknown[] {
  try {
    if (typeof raw === 'string') return JSON.parse(raw);
    if (Array.isArray(raw)) return raw;
    return [];
  } catch {
    return [];
  }
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  try {
    const { month } = (await req.json()) as { month: string };
    if (!month) return NextResponse.json({ ok: false, error: 'month is required' }, { status: 400 });

    const locale = await getLocale();

    // 1. Get confirmed invoices
    const invoiceRows = await prisma.invoice.findMany({
      where: { userId: session.userId, month, status: 'confirmed' },
    });
    const confirmedInvoices = invoiceRows.map((row) => ({
      id: row.id,
      supplierName: row.supplierName,
      invoiceDate: row.invoiceDate ? row.invoiceDate.toISOString().slice(0, 10) : null,
      total: row.total,
      lineItems: parseLineItems(row.lineItems),
    }));

    // 2. Get POS upload
    const posUpload = await prisma.posUpload.findUnique({
      where: { userId_month: { userId: session.userId, month } },
    });
    const salesData = posUpload ? parsePosData(posUpload.parsedData) : [];

    // 3. Get historical reports (last 3, excluding current month)
    const historicalReports = await prisma.report.findMany({
      where: { userId: session.userId, month: { not: month } },
      orderBy: { month: 'desc' },
      take: 3,
    });
    const historicalData = historicalReports.map((r) => {
      const mv = typeof r.monthView === 'string' ? JSON.parse(r.monthView) : r.monthView;
      return mv;
    });

    // 4. Get ingredient mappings
    const mappingRows = await prisma.ingredientMapping.findMany({
      where: { userId: session.userId },
    });
    const mappings = mappingRows.map((m) => ({
      ingredient: m.ingredient,
      supplier: m.supplier,
      menuItems: Array.isArray(m.menuItems) ? m.menuItems : (typeof m.menuItems === 'string' ? JSON.parse(m.menuItems) : []),
    }));

    // 5. Call LLM
    const result = await llm({
      task: 'report',
      salesData,
      expenseData: { invoices: confirmedInvoices },
      mappings,
      historicalData,
      locale,
    });

    // 6. Upsert report (stored as JSON strings in DB)
    const monthViewStr = JSON.stringify(result.monthView);
    const trendsViewStr = JSON.stringify(result.trendsView);
    await prisma.report.upsert({
      where: { userId_month: { userId: session.userId, month } },
      create: {
        userId: session.userId,
        month,
        monthView: monthViewStr,
        trendsView: trendsViewStr,
      },
      update: {
        monthView: monthViewStr,
        trendsView: trendsViewStr,
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
