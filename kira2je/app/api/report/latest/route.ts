import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });

  const report = await prisma.report.findFirst({
    where: { userId: session.userId },
    orderBy: { createdAt: 'desc' },
  });
  if (!report) return NextResponse.json({ ok: false, reportId: null });
  return NextResponse.json({ ok: true, reportId: report.id });
}
