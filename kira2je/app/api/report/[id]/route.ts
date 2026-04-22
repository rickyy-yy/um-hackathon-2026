import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { llm } from '@/lib/llm';
import { AnalyticsResult, FullReport } from '@/lib/schemas';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  const report = await prisma.report.findUnique({ where: { id: params.id } });
  if (!report || report.userId !== session.userId) {
    return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
  }

  const parsed = JSON.parse(report.reportData) as { analytics: AnalyticsResult; narration: unknown };
  let narration = parsed.narration;
  if (!narration) {
    narration = await llm({ task: 'report', analytics: parsed.analytics });
    await prisma.report.update({
      where: { id: report.id },
      data: { reportData: JSON.stringify({ analytics: parsed.analytics, narration }) },
    });
  }

  const full: FullReport = { analytics: parsed.analytics, narration: narration as FullReport['narration'] };
  return NextResponse.json({ ok: true, report: full });
}
