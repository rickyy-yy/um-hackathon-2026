import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { llm } from '@/lib/llm';
import type { AnalyticsResult, FullReport, ReportNarration } from '@/lib/schemas';
import { serverT } from '@/lib/i18n/server';
import { ItemTable } from '@/components/ItemTable';
import { ProfitBars } from '@/components/ProfitBars';
import { CannibalizationAlert } from '@/components/CannibalizationAlert';
import { DeliveryTrapTable } from '@/components/DeliveryTrapTable';
import { TaxCard } from '@/components/TaxCard';
import { ActionCards } from '@/components/ActionCards';
import { BenchmarkCard } from '@/components/BenchmarkCard';
import { WhatsAppShare } from '@/components/WhatsAppShare';
import type { Locale } from '@/lib/i18n/dictionary';

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
  // Regenerate if no narration, or if cached narration is in the wrong language
  if (!narration || parsed.narrationLocale !== locale) {
    narration = await llm({ task: 'report', analytics: parsed.analytics, locale });
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
  const { analytics: a, narration: n } = full;

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  const displayName = user?.name ?? t('dashboard.yourLabel');

  const dateFmt: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short' };
  const dateLocale = locale === 'en' ? 'en-MY' : 'ms-MY';
  const from = new Date(a.dateRangeFrom).toLocaleDateString(dateLocale, dateFmt);
  const to = new Date(a.dateRangeTo).toLocaleDateString(dateLocale, dateFmt);

  return (
    <main className="pb-20">
      {/* Header */}
      <header className="bg-kira-teal text-white px-5 pt-6 pb-5 rounded-b-3xl">
        <div className="flex justify-between items-start">
          <div>
            <div className="text-xs uppercase tracking-wider opacity-80">{displayName}</div>
            <h1 className="serif text-2xl leading-tight mt-1">{t('dashboard.reportTitle')}</h1>
            <div className="text-sm opacity-90 mt-1">
              {from} – {to}
            </div>
          </div>
          <Link
            href="/onboarding"
            className="text-xs bg-white/15 rounded-btn px-3 py-2 mr-12"
          >
            {t('dashboard.updateData')}
          </Link>
        </div>
      </header>

      <div className="px-5 -mt-4 space-y-4">
        {/* Summary */}
        <p className="text-sm text-kira-dark leading-relaxed bg-white rounded-card p-4">
          {n.summary}
        </p>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="card">
            <div className="text-xs text-kira-muted">{t('dashboard.revenue')}</div>
            <div className="serif text-2xl mt-1">
              RM{a.totalRevenue.toLocaleString()}
            </div>
            <div
              className={`text-xs mt-1 ${
                a.revenueChangePct >= 0 ? 'text-kira-teal' : 'text-kira-red'
              }`}
            >
              {a.revenueChangePct >= 0 ? '▲' : '▼'}{' '}
              {Math.abs(a.revenueChangePct).toFixed(1)}% {t('dashboard.vsLastMonth')}
            </div>
          </div>
          <div className="card">
            <div className="text-xs text-kira-muted">{t('dashboard.profit')}</div>
            <div className="serif text-2xl mt-1">
              RM{a.estimatedProfit.toLocaleString()}
            </div>
            <div
              className={`text-xs mt-1 ${
                a.profitChangePct >= 0 ? 'text-kira-teal' : 'text-kira-red'
              }`}
            >
              {a.profitChangePct >= 0 ? '▲' : '▼'}{' '}
              {Math.abs(a.profitChangePct).toFixed(1)}% {t('dashboard.vsLastMonth')}
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="serif text-xl mb-3">{t('dashboard.itemsTitle')}</h3>
          <ItemTable items={a.items} />
        </div>

        <div className="card">
          <h3 className="serif text-xl mb-1">{t('dashboard.profitBarsTitle')}</h3>
          <p className="text-sm text-kira-muted mb-4">{t('dashboard.profitBarsDesc')}</p>
          <ProfitBars items={a.items} />
        </div>

        <CannibalizationAlert data={a.cannibalization} narrative={n.cannibalizationNarrative} />

        <DeliveryTrapTable traps={a.deliveryTraps} narrative={n.deliveryNarrative} />

        <TaxCard
          initial={a.tax}
          annualProfit={a.estimatedProfit * 12}
          narrative={n.taxNarrative}
        />

        <div>
          <h3 className="serif text-xl mb-3 px-1">{t('dashboard.actionsTitle')}</h3>
          <ActionCards recommendations={n.recommendations} totalImpactRm={n.totalImpactRm} />
        </div>

        <BenchmarkCard rows={a.benchmarks} />

        <Link
          href={`/whatif?reportId=${id}`}
          className="btn-primary w-full text-center block mt-2"
        >
          {t('dashboard.whatifCta')}
        </Link>

        <WhatsAppShare report={full} shopName={user?.name ?? t('dashboard.yourLabel')} />

        <form action="/api/auth/logout" method="post" className="mt-4">
          <button className="w-full text-sm text-kira-muted underline">
            {t('nav.logout')}
          </button>
        </form>
      </div>
    </main>
  );
}
