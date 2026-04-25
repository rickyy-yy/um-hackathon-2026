import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { parsePosFile } from '@/lib/pos-parser';

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
    });
  }

  // Real submit: require month, save to DB
  if (!month) {
    return NextResponse.json({ ok: false, error: 'month is required for import' }, { status: 400 });
  }
  if (!parsed.usable) {
    return NextResponse.json({ ok: false, error: parsed.warnings[0] ?? 'File is not usable' }, { status: 422 });
  }

  try {
    await prisma.posUpload.upsert({
      where: { userId_month: { userId: session.userId, month } },
      create: {
        userId: session.userId,
        month,
        fileName,
        rowCount: parsed.rowCount,
        posType: parsed.system,
        parsedData: parsed.rows as never,
      },
      update: {
        fileName,
        rowCount: parsed.rowCount,
        posType: parsed.system,
        parsedData: parsed.rows as never,
        createdAt: new Date(),
      },
    });
  } catch (err) {
    console.error('[pos-upload] DB error:', err);
    return NextResponse.json({ ok: false, error: 'Database error' }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    rowCount: parsed.rowCount,
    system: parsed.system,
    systemLabel: parsed.systemLabel,
    isAggregated: parsed.isAggregated,
    warnings: parsed.warnings,
  });
}
