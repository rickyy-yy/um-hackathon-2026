import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { llm } from '@/lib/llm';
import { getLocale } from '@/lib/i18n/server';
import type { InvoiceLineItem } from '@/lib/schemas';

const CURRENT_MONTH = '2026-04';

function parseJson<T>(raw: unknown, fallback: T): T {
  try {
    if (typeof raw === 'string') return JSON.parse(raw) as T;
    if (raw !== null && typeof raw === 'object') return raw as T;
    return fallback;
  } catch {
    return fallback;
  }
}

function extractMenuItems(parsedData: unknown): string[] {
  const rows = parseJson<{ itemName?: string }[]>(parsedData, []);
  const names = rows.map((r) => r.itemName ?? '').filter(Boolean);
  return [...new Set(names)].sort();
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  const locale = await getLocale();

  // 1. Confirmed invoices for the month
  const invoices = await prisma.invoice.findMany({
    where: { userId: session.userId, month: CURRENT_MONTH, status: 'confirmed' },
  });

  // 2. Extract all line items → ingredients for the LLM
  const invoiceItems = invoices.flatMap((inv) => {
    const lines = parseJson<InvoiceLineItem[]>(inv.lineItems, []);
    return lines.map((li) => ({
      description: li.description,
      quantity: li.quantity,
      unit: li.unit,
      unitPrice: li.unitPrice,
      total: li.total,
      supplier: inv.supplierName ?? undefined,
    }));
  });

  // 3. POS upload menu items
  const posUpload = await prisma.posUpload.findUnique({
    where: { userId_month: { userId: session.userId, month: CURRENT_MONTH } },
  });
  const menuItems = posUpload ? extractMenuItems(posUpload.parsedData) : [];

  // 4. Existing saved mappings + overrides
  const [saved, savedOverrides] = await Promise.all([
    prisma.ingredientMapping.findMany({ where: { userId: session.userId } }),
    prisma.menuItemOverride.findMany({ where: { userId: session.userId } }),
  ]);
  const savedMappingsForLlm = saved.map((m) => ({
    ingredient: m.ingredient,
    supplier: m.supplier ?? undefined,
    menuItems: parseJson<string[]>(m.menuItems, []),
  }));
  const confirmedIngredients = new Set(saved.map((m) => m.ingredient));

  const overrides = savedOverrides.map((o) => ({
    itemName: o.itemName,
    type: o.type as 'service' | 'manual',
    manualCost: o.manualCost ?? undefined,
  }));
  const overriddenItems = new Set(savedOverrides.map((o) => o.itemName));

  const hasInvoices = invoiceItems.length > 0;
  const hasPos = menuItems.length > 0;

  if (!hasInvoices) {
    return NextResponse.json({
      ok: true,
      proposals: savedMappingsForLlm.map((m) => ({ ...m, confidence: 'high' as const })),
      confirmedIngredients: Array.from(confirmedIngredients),
      unmappedIngredients: [],
      unmappedMenuItems: [],
      menuItems,
      hasInvoices,
      hasPos,
      overrides,
    });
  }

  // 5. Call LLM — degrade gracefully if it fails
  let result;
  let llmError: string | null = null;
  try {
    result = await llm({
      task: 'ingredient-mapping',
      invoiceItems,
      menuItems,
      savedMappings: savedMappingsForLlm,
      locale,
    });
  } catch (e) {
    console.error('[mapping] LLM failed:', (e as Error)?.message);
    llmError = 'AI mapping failed — showing previously confirmed mappings only.';
  }

  // Filter unmapped menu items — exclude any that the user has already overridden
  const unmappedMenuItems = (result?.unmappedMenuItems ?? []).filter(
    (item) => !overriddenItems.has(item)
  );

  return NextResponse.json({
    ok: true,
    proposals: result?.mappings ?? savedMappingsForLlm.map((m) => ({ ...m, confidence: 'low' as const })),
    confirmedIngredients: Array.from(confirmedIngredients),
    unmappedIngredients: result?.unmappedIngredients ?? [],
    unmappedMenuItems,
    menuItems,
    hasInvoices,
    hasPos,
    overrides,
    llmError,
  });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  const body = (await req.json()) as {
    mappings: { ingredient: string; supplier?: string; menuItems: string[] }[];
    overrides?: { itemName: string; type: 'service' | 'manual'; manualCost?: number }[];
  };

  if (!Array.isArray(body.mappings)) {
    return NextResponse.json({ ok: false, error: 'mappings array required' }, { status: 400 });
  }

  await prisma.ingredientMapping.deleteMany({ where: { userId: session.userId } });

  if (body.mappings.length > 0) {
    await prisma.ingredientMapping.createMany({
      data: body.mappings.map((m) => ({
        userId: session.userId,
        ingredient: m.ingredient,
        supplier: m.supplier ?? null,
        menuItems: JSON.stringify(m.menuItems),
      })),
    });
  }

  // Upsert overrides
  if (body.overrides && body.overrides.length > 0) {
    for (const o of body.overrides) {
      await prisma.menuItemOverride.upsert({
        where: { userId_itemName: { userId: session.userId, itemName: o.itemName } },
        create: { userId: session.userId, itemName: o.itemName, type: o.type, manualCost: o.manualCost ?? null },
        update: { type: o.type, manualCost: o.manualCost ?? null },
      });
    }
  }

  return NextResponse.json({ ok: true, saved: body.mappings.length });
}
