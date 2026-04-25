import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { parsePosFile, aggregateSalesRows, mapFromColumnMapping, extractRawRows } from '@/lib/pos-parser';
import { llm } from '@/lib/llm';
import type { PosColumnMapping } from '@/lib/schemas';

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });

  const body = (await req.json()) as {
    fileName: string;
    base64: string;
    month?: string;
    dryRun?: boolean;
  };

  const { fileName, base64, month, dryRun = false } = body;
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
          // Keep previewHeaders from the full headers list
          previewHeaders: headers.slice(0, 6),
        };
      }
    } catch (err) {
      console.warn('[pos-upload] LLM column mapping failed:', (err as Error)?.message);
    }
  }

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
    });
  }

  // Real submit: require month, check usable
  if (!month) {
    return NextResponse.json({ ok: false, error: 'month is required for import' }, { status: 400 });
  }
  if (!parsed.usable) {
    return NextResponse.json({ ok: false, error: parsed.warnings[0] ?? 'File is not usable' }, { status: 422 });
  }

  // For AI-detected files, apply mapping to all rows (not just the 5-row preview)
  let finalRows = parsed.rows;
  if (aiDetected && aiMapping) {
    try {
      const allRaw = await extractRawRows(base64, fileName);
      const { rows, warnings } = mapFromColumnMapping(allRaw, aiMapping);
      finalRows = rows;
      if (warnings.length) parsed.warnings = warnings;
      console.log(`[pos-upload] AI mapping applied to ${allRaw.length} rows → ${rows.length} SalesRows`);
    } catch (err) {
      console.warn('[pos-upload] full AI row mapping failed, using preview rows:', (err as Error)?.message);
    }
  }

  // Aggregate rows before saving to keep DB payload manageable
  const rowsToSave = finalRows.length > 200 ? aggregateSalesRows(finalRows) : finalRows;
  console.log(`[pos-upload] aggregated ${finalRows.length} → ${rowsToSave.length} rows for DB`);

  try {
    await prisma.posUpload.upsert({
      where: { userId_month: { userId: session.userId, month } },
      create: {
        userId: session.userId,
        month,
        fileName,
        rowCount: finalRows.length,
        posType: parsed.system,
        parsedData: rowsToSave as never,
      },
      update: {
        fileName,
        rowCount: finalRows.length,
        posType: parsed.system,
        parsedData: rowsToSave as never,
        createdAt: new Date(),
      },
    });
  } catch (err) {
    console.error('[pos-upload] DB error:', err);
    return NextResponse.json({ ok: false, error: 'Database error saving sales data.' }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    rowCount: finalRows.length,
    system: parsed.system,
    systemLabel: parsed.systemLabel,
    isAggregated: parsed.isAggregated,
    warnings: parsed.warnings,
    aiDetected,
  });
}
