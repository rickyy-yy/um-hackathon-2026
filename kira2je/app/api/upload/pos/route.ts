import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

const DEMO_ROW_COUNT = 348;

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });

  const body = (await req.json()) as {
    fileName: string;
    base64: string;
    posType: string;
    month: string;
  };

  const { fileName, posType, month } = body;
  if (!fileName || !month) {
    return NextResponse.json({ ok: false, error: 'fileName and month are required' }, { status: 400 });
  }

  try {
    // Upsert so re-uploading for the same month replaces the previous record
    await prisma.posUpload.upsert({
      where: { userId_month: { userId: session.userId, month } },
      create: {
        userId: session.userId,
        month,
        fileName,
        rowCount: DEMO_ROW_COUNT,
        posType: posType ?? 'custom',
      },
      update: {
        fileName,
        rowCount: DEMO_ROW_COUNT,
        posType: posType ?? 'custom',
        createdAt: new Date(),
      },
    });
  } catch (err) {
    console.error('[pos-upload] DB error:', err);
    return NextResponse.json({ ok: false, error: 'Database error' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, rowCount: DEMO_ROW_COUNT });
}
