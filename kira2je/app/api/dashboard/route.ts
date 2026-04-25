import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const month = searchParams.get('month');
  if (!month) return NextResponse.json({ ok: false, error: 'month is required' }, { status: 400 });

  const [invoiceCount, invoicesPending, posUpload, report, user] = await Promise.all([
    prisma.invoice.count({ where: { userId: session.userId, month } }),
    prisma.invoice.count({ where: { userId: session.userId, month, status: 'pending' } }),
    prisma.posUpload.findUnique({ where: { userId_month: { userId: session.userId, month } } }),
    prisma.report.findFirst({ where: { userId: session.userId, month } }),
    prisma.user.findUnique({ where: { id: session.userId }, select: { businessName: true } }),
  ]);

  return NextResponse.json({
    ok: true,
    invoiceCount,
    invoicesPending,
    posUpload: posUpload
      ? { fileName: posUpload.fileName, rowCount: posUpload.rowCount ?? 0, posType: posUpload.posType ?? '' }
      : null,
    report: report ? { id: report.id, generatedAt: report.generatedAt.toISOString() } : null,
    businessName: user?.businessName ?? null,
  });
}
