import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import {
  parsePosFile,
  aggregateSalesRows,
  mapFromColumnMapping,
  extractRawRows,
  groupRowsByMonth,
  detectMonths,
} from '@/lib/pos-parser';
import { llm } from '@/lib/llm';
import { PosColumnMapping } from '@/lib/schemas';
import type { PosColumnMapping as PosColumnMappingType } from '@/lib/schemas';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });

  const uploads = await prisma.posUpload.findMany({
    where: { userId: session.userId },
    orderBy: { month: 'desc' },
    select: { month: true, fileName: true, rowCount: true, createdAt: true },
  });

  return NextResponse.json({ ok: true, uploads });
}

export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });

  const { month } = (await req.json()) as { month?: string };
  if (!month) return NextResponse.json({ ok: false, error: 'month required' }, { status: 400 });

  await prisma.posUpload.deleteMany({
    where: { userId: session.userId, month },
  });

  return NextResponse.json({ ok: true });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });

  const body = (await req.json()) as {
    fileName: string;
    base64: string;
    month?: string;
    dryRun?: boolean;
    confirmedMapping?: PosColumnMappingType;
  };

  const { fileName, base64, month: fallbackMonth = '2026-04', dryRun = false, confirmedMapping } = body;
  if (!fileName || !base64) {
    return NextResponse.json({ ok: false, error: 'fileName and base64 are required' }, { status: 400 });
  }

  // ── Dry run: parse headers + preview, call LLM for column mapping ────────────
  if (dryRun) {
    let parsed;
    try {
      parsed = await parsePosFile(base64, fileName);
    } catch (err) {
      console.error('[pos-upload] parse error:', err);
      return NextResponse.json({ ok: false, error: 'Failed to parse file' }, { status: 422 });
    }

    if (!parsed.ok) {
      return NextResponse.json({ ok: false, error: parsed.error }, { status: 422 });
    }

    // Call LLM to detect column mapping
    let mapping: PosColumnMappingType | null = null;
    let llmError: string | null = null;
    try {
      mapping = await llm({
        task: 'pos-column-mapping',
        headers: parsed.headers,
        sampleRows: parsed.previewRows,
      });
    } catch (err) {
      console.warn('[pos-upload] LLM column mapping failed:', (err as Error)?.message);
      llmError = "Couldn't auto-detect columns — please select them manually";
    }

    // If LLM failed, return a blank mapping so the UI can show the picker
    if (!mapping) {
      mapping = {
        itemNameCol: null,
        quantityCol: null,
        unitPriceCol: null,
        dateCol: null,
        categoryCol: null,
        channelCol: null,
        isRefundedCol: null,
        isAggregated: false,
        confidence: 'low',
      };
    }

    // Use dateCol to scan all rows for month detection
    let detectedMonths: string[] = [];
    if (!mapping.isAggregated && mapping.dateCol) {
      try {
        const allRaw = await extractRawRows(base64, fileName);
        const { rows } = mapFromColumnMapping(allRaw, mapping);
        detectedMonths = detectMonths(rows);
      } catch (err) {
        console.warn('[pos-upload] month detection failed:', (err as Error)?.message);
      }
    }

    return NextResponse.json({
      ok: true,
      headers: parsed.headers,
      mapping,
      previewRows: parsed.previewRows,
      totalRows: parsed.totalRows,
      detectedMonths,
      llmError,
    });
  }

  // ── Real import: use confirmedMapping from client ─────────────────────────────
  if (!confirmedMapping) {
    return NextResponse.json({ ok: false, error: 'confirmedMapping is required for real import' }, { status: 400 });
  }

  // Validate the mapping with Zod
  const parseResult = PosColumnMapping.safeParse(confirmedMapping);
  if (!parseResult.success) {
    return NextResponse.json({ ok: false, error: 'Invalid column mapping' }, { status: 400 });
  }
  const mapping = parseResult.data;

  // Parse full file
  let allRaw: Record<string, unknown>[];
  try {
    allRaw = await extractRawRows(base64, fileName);
  } catch (err) {
    console.error('[pos-upload] extractRawRows error:', err);
    return NextResponse.json({ ok: false, error: 'Failed to parse file' }, { status: 422 });
  }

  if (allRaw.length === 0) {
    return NextResponse.json({ ok: false, error: 'File appears to be empty or could not be parsed.' }, { status: 422 });
  }

  // Map to SalesRow[]
  const { rows: allRows, warnings } = mapFromColumnMapping(allRaw, mapping);

  if (allRows.length === 0) {
    return NextResponse.json({
      ok: false,
      error: warnings[0] ?? 'No rows could be mapped with the selected columns.',
    }, { status: 422 });
  }

  // Group by month and upsert
  const monthGroups = mapping.isAggregated
    ? new Map([[fallbackMonth, allRows]])
    : groupRowsByMonth(allRows, fallbackMonth);

  let totalRows = 0;
  const savedMonths: string[] = [];

  for (const [month, rows] of monthGroups) {
    const rowsToSave = rows.length > 200 ? aggregateSalesRows(rows) : rows;
    const parsedDataStr = JSON.stringify(rowsToSave);
    totalRows += rows.length;

    try {
      await prisma.posUpload.upsert({
        where: { userId_month: { userId: session.userId, month } },
        create: {
          userId: session.userId,
          month,
          fileName,
          rowCount: rows.length,
          posType: 'ai-detected',
          parsedData: parsedDataStr,
        },
        update: {
          fileName,
          rowCount: rows.length,
          posType: 'ai-detected',
          parsedData: parsedDataStr,
          createdAt: new Date(),
        },
      });
      savedMonths.push(month);
    } catch (err) {
      console.error(`[pos-upload] DB error for month ${month}:`, err);
    }
  }

  if (savedMonths.length === 0) {
    return NextResponse.json({ ok: false, error: 'Database error saving sales data.' }, { status: 500 });
  }

  console.log(`[pos-upload] saved ${totalRows} rows across ${savedMonths.length} months: ${savedMonths.join(', ')}`);

  return NextResponse.json({
    ok: true,
    rowCount: totalRows,
    savedMonths,
    warnings,
  });
}
