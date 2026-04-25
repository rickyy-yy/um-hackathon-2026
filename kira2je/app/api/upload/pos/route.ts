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
import type { PosColumnMapping } from '@/lib/schemas';
import type { SalesRow } from '@/lib/schemas';

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });

  const body = (await req.json()) as {
    fileName: string;
    base64: string;
    month?: string;
    dryRun?: boolean;
  };

  const { fileName, base64, month: fallbackMonth = '2026-04', dryRun = false } = body;
  if (!fileName || !base64) {
    return NextResponse.json({ ok: false, error: 'fileName and base64 are required' }, { status: 400 });
  }

  let parsed;
  try {
    parsed = await parsePosFile(base64, fileName);
  } catch (err) {
    console.error('[pos-upload] parse error:', err);
    return NextResponse.json({ ok: false, error: 'Failed to parse file' }, { status: 422 });
  }

  let aiDetected = false;
  let aiMapping: PosColumnMapping | null = null;

  // ── LLM fallback for unknown format ─────────────────────────────────────────
  if (parsed.system === 'unknown' && parsed.previewRows.length > 0) {
    const headers = Object.keys(parsed.previewRows[0] ?? {});
    try {
      aiMapping = await llm({
        task: 'pos-column-mapping',
        headers,
        sampleRows: parsed.previewRows,
      });

      if (aiMapping.itemNameCol && aiMapping.quantityCol && aiMapping.unitPriceCol) {
        aiDetected = true;
        const { rows: sampleRows, warnings } = mapFromColumnMapping(parsed.previewRows, aiMapping);
        parsed = {
          ...parsed,
          system: 'custom-itemized' as const,
          systemLabel: `AI-detected (${aiMapping.confidence} confidence)`,
          usable: sampleRows.length > 0,
          rows: sampleRows,
          isAggregated: aiMapping.isAggregated,
          warnings,
          previewHeaders: headers.slice(0, 6),
        };
      }
    } catch (err) {
      console.warn('[pos-upload] LLM column mapping failed:', (err as Error)?.message);
    }
  }

  // ── For AI-detected: re-parse full file to get all rows ───────────────────
  // We need the full rows for both dry-run month detection and real import.
  let fullRows: SalesRow[] = parsed.rows;
  if (aiDetected && aiMapping) {
    try {
      const allRaw = await extractRawRows(base64, fileName);
      const { rows } = mapFromColumnMapping(allRaw, aiMapping);
      fullRows = rows;
    } catch (err) {
      console.warn('[pos-upload] full AI row mapping failed, using preview rows:', (err as Error)?.message);
    }
  }

  const detectedMonths = parsed.isAggregated ? [] : detectMonths(fullRows);

  // Dry run: return detection result without saving
  if (dryRun) {
    return NextResponse.json({
      ok: true,
      system: parsed.system,
      systemLabel: parsed.systemLabel,
      usable: parsed.usable,
      warnings: parsed.warnings,
      isAggregated: parsed.isAggregated,
      previewHeaders: parsed.previewHeaders,
      previewRows: parsed.previewRows,
      rowCount: parsed.rowCount,
      aiDetected,
      detectedMonths,
    });
  }

  // Real submit: check usable
  if (!parsed.usable) {
    return NextResponse.json({ ok: false, error: parsed.warnings[0] ?? 'File is not usable' }, { status: 422 });
  }

  // ── Split by month and upsert each ────────────────────────────────────────
  const monthGroups = parsed.isAggregated
    ? new Map([[fallbackMonth, fullRows]])
    : groupRowsByMonth(fullRows, fallbackMonth);

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
          posType: parsed.system,
          parsedData: parsedDataStr,
        },
        update: {
          fileName,
          rowCount: rows.length,
          posType: parsed.system,
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
    system: parsed.system,
    systemLabel: parsed.systemLabel,
    isAggregated: parsed.isAggregated,
    warnings: parsed.warnings,
    aiDetected,
    savedMonths,
  });
}
