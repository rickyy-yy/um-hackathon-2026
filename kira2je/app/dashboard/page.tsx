import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { llm } from '@/lib/llm';
import { mockReport } from '@/lib/mocks';
import type { AnalyticsResult, FullReport, ReportNarration } from '@/lib/schemas';
import { serverT } from '@/lib/i18n/server';
import type { Locale } from '@/lib/i18n/dictionary';
import { DashboardShell } from '@/components/DashboardShell';

export const dynamic = 'force-dynamic';

async function loadReport(
  userId: string,
  locale: Locale,
  reportId?: string
): Promise<{ id: string; full: FullReport } | null> {
  const report = reportId
    ? await prisma.report.findUnique({ where: { id: reportId } })
    : await prisma.report.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });
  if (!report || report.userId !== userId) return null;

  const parsed = JSON.parse(report.reportData) as {
    analytics: AnalyticsResult;
    narration: ReportNarration | null;
    narrationLocale?: Locale;
  };

  let narration = parsed.narration;
  if (!narration || parsed.narrationLocale !== locale) {
    // Race the LLM against a 7-second timeout; fall back to existing narration if slow
    const existing = narration;
    const timeoutFallback = new Promise<null>((resolve) => setTimeout(() => resolve(null), 7000));
    const fresh = await Promise.race([
      llm({ task: 'report', analytics: parsed.analytics, locale }).catch(() => null),
      timeoutFallback,
    ]);
    if (fresh) {
      narration = fresh;
      await prisma.report.update({
        where: { id: report.id },
        data: {
          reportData: JSON.stringify({
            analytics: parsed.analytics,
            narration,
            narrationLocale: locale,
          }),
        },
      });
    } else if (!narration) {
      // No cached narration and LLM timed out — fall back to mock so the page doesn't crash
      narration = mockReport(parsed.analytics, locale);
    }
  }

  return { id: report.id, full: { analytics: parsed.analytics, narration } };
}

export default async function Dashboard({
  searchParams,
}: {
  searchParams: { reportId?: string };
}) {
  const session = await getSession();
  if (!session) redirect('/');

  const { locale, t } = await serverT();
  const loaded = await loadReport(session.userId, locale, searchParams.reportId);
  if (!loaded) redirect('/onboarding');

  const { id, full } = loaded;
  const { analytics: a } = full;

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  const displayName = user?.name ?? t('dashboard.yourLabel');

  const dateFmt: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short' };
  const dateLocale = locale === 'en' ? 'en-MY' : 'ms-MY';
  const from = new Date(a.dateRangeFrom).toLocaleDateString(dateLocale, dateFmt);
  const to = new Date(a.dateRangeTo).toLocaleDateString(dateLocale, dateFmt);

  return (
    <main className="h-screen flex flex-col">
      <header className="bg-kira-teal text-white px-5 lg:px-8 pt-6 pb-5 shrink-0">
        <div className="flex justify-between items-center">
          <div>
            <div className="text-xs uppercase tracking-wider opacity-80">{displayName}</div>
            <h1 className="serif text-2xl leading-tight mt-1">{t('dashboard.reportTitle')}</h1>
            <div className="text-sm opacity-90 mt-1">
              {from} – {to}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/onboarding"
              className="text-sm font-medium bg-white/20 hover:bg-white/30 text-white border border-white/40 rounded-btn px-4 py-2.5 transition-colors whitespace-nowrap"
            >
              {t('dashboard.updateData')}
            </Link>
          </div>
        </div>
      </header>
      <DashboardShell
        report={full}
        reportId={id}
        shopName={user?.name ?? t('dashboard.yourLabel')}
      />
    </main>
  );
}
