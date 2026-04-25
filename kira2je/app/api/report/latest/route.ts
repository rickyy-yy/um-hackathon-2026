import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { mockReportData } from '@/lib/mocks';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });

  const report = await prisma.report.findFirst({
    where: { userId: session.userId },
    orderBy: { generatedAt: 'desc' },
  });

  if (!report) {
    const mock = mockReportData('2026-04');
    return NextResponse.json({ ok: true, report: { month: '2026-04', ...mock }, isMock: true });
  }

  const monthView = typeof report.monthView === 'string'
    ? JSON.parse(report.monthView)
    : report.monthView;
  const trendsView = typeof report.trendsView === 'string'
    ? JSON.parse(report.trendsView)
    : report.trendsView;

  return NextResponse.json({ ok: true, report: { id: report.id, month: report.month, monthView, trendsView } });
}
