// CSV/xlsx POS upload — now handled by /api/upload/pos
// This stub redirects legacy callers
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });

  // Accept old format for backward compat
  const body = (await req.json()) as { rows?: unknown[]; fileName?: string };
  const rowCount = body.rows?.length ?? 0;
  const month = currentMonth();

  await prisma.posUpload.upsert({
    where: { userId_month: { userId: session.userId, month } },
    create: { userId: session.userId, month, fileName: body.fileName ?? 'upload.csv', rowCount, posType: 'custom' },
    update: { rowCount, fileName: body.fileName ?? 'upload.csv' },
  });

  return NextResponse.json({ ok: true, rowCount });
}
