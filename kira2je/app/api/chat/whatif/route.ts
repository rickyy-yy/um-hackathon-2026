import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { llm } from '@/lib/llm';
import { getLocale } from '@/lib/i18n/server';
import { mockReportData, WHATIF_CACHE } from '@/lib/mocks';

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });

  const { reportId, month, question } = (await req.json()) as {
    reportId?: string;
    month?: string;
    question?: string;
  };
  if (!question || question.trim().length < 4) {
    return NextResponse.json({ ok: false, error: 'Question too short' }, { status: 400 });
  }

  const cached = WHATIF_CACHE[question.trim()];
  if (cached) return NextResponse.json({ ok: true, answer: cached });

  // Find report by id or month
  const reportMonth = month ?? '2026-04';
  let monthView: unknown;
  let trendsView: unknown;

  if (reportId) {
    const report = await prisma.report.findUnique({ where: { id: reportId } });
    if (!report || report.userId !== session.userId) {
      return NextResponse.json({ ok: false, error: 'Report not found' }, { status: 404 });
    }
    const data = typeof report.monthView === 'string'
      ? JSON.parse(report.monthView)
      : report.monthView;
    const trends = typeof report.trendsView === 'string'
      ? JSON.parse(report.trendsView)
      : report.trendsView;
    monthView = data;
    trendsView = trends;
  } else {
    // No reportId — try the user's most recent report, fall back to mock
    const latest = await prisma.report.findFirst({
      where: { userId: session.userId },
      orderBy: { generatedAt: 'desc' },
    });
    if (latest) {
      monthView = typeof latest.monthView === 'string' ? JSON.parse(latest.monthView) : latest.monthView;
      trendsView = typeof latest.trendsView === 'string' ? JSON.parse(latest.trendsView) : latest.trendsView;
    } else {
      const mock = mockReportData(reportMonth);
      monthView = mock.monthView;
      trendsView = mock.trendsView;
    }
  }

  const locale = await getLocale();
  const answer = await llm({ task: 'whatif', monthView, trendsView, question, locale });

  // Store the turn (best-effort)
  try {
    const report = await prisma.report.findFirst({
      where: { userId: session.userId, month: reportMonth },
    });
    if (report) {
      await prisma.whatIfTurn.create({
        data: { userId: session.userId, reportId: report.id, question, answer: JSON.stringify(answer) },
      });
    }
  } catch { /* non-blocking */ }

  return NextResponse.json({ ok: true, answer });
}

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });

  const url = new URL(req.url);
  const reportId = url.searchParams.get('reportId');

  if (!reportId) {
    // No reportId given — find the user's most recent report and redirect to it
    const latest = await prisma.report.findFirst({
      where: { userId: session.userId },
      orderBy: { generatedAt: 'desc' },
      select: { id: true },
    });
    return NextResponse.json({ ok: true, turns: [], reportId: latest?.id ?? null });
  }

  const turns = await prisma.whatIfTurn.findMany({
    where: { userId: session.userId, reportId },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json({
    ok: true,
    turns: turns.map((t) => ({
      id: t.id,
      question: t.question,
      answer: JSON.parse(t.answer),
      at: t.createdAt,
    })),
  });
}
