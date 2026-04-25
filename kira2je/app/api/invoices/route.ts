import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
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

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const month = searchParams.get('month');
  if (!month) return NextResponse.json({ ok: false, error: 'month is required' }, { status: 400 });

  const rows = await prisma.invoice.findMany({
    where: { userId: session.userId, month },
    orderBy: { createdAt: 'desc' },
  });

  const invoices = rows.map((row) => ({
    id: row.id,
    supplierName: row.supplierName ?? null,
    invoiceDate: row.invoiceDate ? row.invoiceDate.toISOString().slice(0, 10) : null,
    total: row.total ?? null,
    lineItems: parseLineItems(row.lineItems),
    confidence: row.ocrConfidence ?? 'low',
    status: row.status,
  }));

  return NextResponse.json({ ok: true, invoices });
}
