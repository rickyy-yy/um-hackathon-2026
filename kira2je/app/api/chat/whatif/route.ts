import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { llm } from '@/lib/llm';
import { getLocale } from '@/lib/i18n/server';
import type { FullReport } from '@/lib/schemas';

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });

  const { reportId, question } = (await req.json()) as {
    reportId?: string;
    question?: string;
  };
  if (!reportId || !question || question.trim().length < 4) {
    return NextResponse.json({ ok: false, error: 'Soalan terlalu pendek' }, { status: 400 });
  }

  const report = await prisma.report.findUnique({ where: { id: reportId } });
  if (!report || report.userId !== session.userId) {
    return NextResponse.json({ ok: false, error: 'Laporan tidak ditemui' }, { status: 404 });
  }

  const full = JSON.parse(report.reportData) as FullReport;
  if (!full.narration) {
    return NextResponse.json({ ok: false, error: 'Laporan belum siap' }, { status: 400 });
  }

  const locale = await getLocale();
  const answer = await llm({ task: 'whatif', report: full, question, locale });

  await prisma.whatIfTurn.create({
    data: {
      userId: session.userId,
      reportId,
      question,
      answer: JSON.stringify(answer),
    },
  });

  return NextResponse.json({ ok: true, answer });
}

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });

  const url = new URL(req.url);
  const reportId = url.searchParams.get('reportId');
  if (!reportId) return NextResponse.json({ ok: true, turns: [] });

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
