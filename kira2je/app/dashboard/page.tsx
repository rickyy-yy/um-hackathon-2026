import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  FileText,
  Upload,
  BarChart3,
  AlertCircle,
  ChevronRight,
  LogOut,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { serverT } from '@/lib/i18n/server';
import { mockReportData } from '@/lib/mocks';
import { DeleteDataButton } from '@/components/DeleteDataButton';

export const dynamic = 'force-dynamic';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatMonth(ym: string): string {
  const [y, m] = ym.split('-');
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString('en-MY', { month: 'long', year: 'numeric' });
}

function formatMonthShort(ym: string): string {
  const [y, m] = ym.split('-');
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString('en-MY', { month: 'short', year: 'numeric' });
}

function fmtRM(n: number): string {
  return `RM ${n.toLocaleString('en-MY', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function signedPct(n: number, suffix = '%'): string {
  return `${n > 0 ? '+' : ''}${n.toFixed(1)}${suffix}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  mom,
  momSuffix = '%',
  positive,
  warning,
}: {
  label: string;
  value: string;
  mom?: number | null;
  momSuffix?: string;
  positive?: boolean;
  warning?: string;
}) {
  return (
    <div className="card flex flex-col gap-1.5 animate-fade-in-up">
      <span className="section-label">{label}</span>
      <span
        className={[
          'text-2xl font-semibold tabular leading-tight',
          positive === true
            ? 'text-accent-secondary'
            : positive === false
            ? 'text-danger'
            : 'text-ink-primary',
        ].join(' ')}
      >
        {value}
      </span>
      {mom != null && (
        <span
          className={`text-xs font-medium tabular flex items-center gap-1 ${
            mom > 0 ? 'text-accent-secondary' : mom < 0 ? 'text-danger' : 'text-ink-secondary'
          }`}
        >
          {mom > 0 ? <TrendingUp className="w-3 h-3" /> : mom < 0 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
          {signedPct(mom, momSuffix)} vs last month
        </span>
      )}
      {warning && (
        <span className="text-xs text-amber-600 flex items-center gap-1">
          <AlertCircle className="w-3 h-3 shrink-0" />
          {warning}
        </span>
      )}
    </div>
  );
}

function StatusCard({
  icon,
  label,
  sublabel,
  sublabelWarn,
  ready,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  sublabelWarn?: boolean;
  ready: boolean;
  href: string;
}) {
  return (
    <Link href={href} className="card flex items-center gap-3 hover:bg-paper-100 transition-colors group">
      <div
        className={[
          'w-10 h-10 rounded-full flex items-center justify-center shrink-0',
          ready ? 'bg-accent-secondary/10 text-accent-secondary' : 'bg-paper-200 text-ink-secondary',
        ].join(' ')}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-ink-primary leading-snug">{label}</p>
        {sublabel && (
          <p className={`text-xs mt-0.5 ${sublabelWarn ? 'text-amber-600 font-medium' : 'text-ink-secondary'}`}>
            {sublabel}
          </p>
        )}
      </div>
      <ChevronRight className="w-4 h-4 text-ink-secondary shrink-0 group-hover:text-ink-primary transition-colors" />
    </Link>
  );
}

function InsightBanner({ message, actionLabel, href }: { message: string; actionLabel: string; href: string }) {
  return (
    <div className="card border-accent-primary/20 bg-accent-primary/5 flex flex-col sm:flex-row sm:items-center gap-3">
      <AlertCircle className="w-5 h-5 text-accent-primary shrink-0 hidden sm:block" />
      <p className="flex-1 text-sm text-ink-primary leading-relaxed">{message}</p>
      <Link href={href} className="btn-primary text-sm text-center whitespace-nowrap self-start sm:self-auto">
        {actionLabel}
      </Link>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect('/');

  const { t } = await serverT();

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // Real DB data
  const [invoiceCount, posUpload, dbReport, user, latestInvoice, pastReports] = await Promise.all([
    prisma.invoice.count({ where: { userId: session.userId, month: currentMonth } }),
    prisma.posUpload.findUnique({ where: { userId_month: { userId: session.userId, month: currentMonth } } }),
    prisma.report.findFirst({ where: { userId: session.userId, month: currentMonth } }),
    prisma.user.findUnique({ where: { id: session.userId }, select: { businessName: true, name: true } }),
    prisma.invoice.findFirst({ where: { userId: session.userId, month: currentMonth }, orderBy: { createdAt: 'desc' }, select: { createdAt: true } }),
    prisma.report.findMany({ where: { userId: session.userId }, orderBy: { month: 'desc' }, take: 6 }),
  ]);

  if (!user?.name) redirect('/onboarding');

  const hasPOS = posUpload !== null;
  const hasReport = dbReport !== null;

  // Stale: new invoice or POS upload added after the last report generation
  const isStale = hasReport && dbReport && (
    (latestInvoice && latestInvoice.createdAt > dbReport.generatedAt) ||
    (posUpload && posUpload.createdAt > dbReport.generatedAt)
  );
  const businessName = user?.businessName ?? 'My Business';

  const displayMonth = currentMonth;
  const monthLabel = formatMonth(displayMonth);
  const monthShort = displayMonth.slice(5, 7) === '04' ? 'April' : monthLabel;

  const report = mockReportData('2026-04');
  const { totalRevenue, totalExpenses, estimatedProfit, marginPct,
          momRevenuePct, momExpensesPct, momProfitPct, momMarginPp } = hasReport && dbReport
    ? (() => {
        const mv = typeof dbReport.monthView === 'string' ? JSON.parse(dbReport.monthView) : dbReport.monthView;
        return mv.summary;
      })()
    : report.monthView.summary;

  // Sidebar: real past reports only — skip zero-revenue reports (bad/empty data)
  const sidebarData = pastReports
    .map((r, i) => {
      const mv = typeof r.monthView === 'string' ? JSON.parse(r.monthView) : r.monthView as { summary?: { totalRevenue?: number; marginPct?: number } };
      const revenue = mv.summary?.totalRevenue ?? 0;
      const mPct = mv.summary?.marginPct ?? 0;
      const prev = pastReports[i + 1];
      let marginTrend: number | null = null;
      if (prev) {
        const pmv = typeof prev.monthView === 'string' ? JSON.parse(prev.monthView) : prev.monthView as { summary?: { marginPct?: number } };
        marginTrend = mPct - (pmv.summary?.marginPct ?? 0);
      }
      return { ym: r.month, label: formatMonthShort(r.month), revenue, marginPct: mPct, marginTrend };
    })
    .filter((r) => r.revenue > 0);

  // Nudge / insight banner — hasReport always wins over data-missing nudges
  let bannerMessage: string;
  let bannerAction: string;
  let bannerHref: string;

  const liveInsightBanner = hasReport && dbReport
    ? (() => {
        const mv = typeof dbReport.monthView === 'string' ? JSON.parse(dbReport.monthView) : dbReport.monthView as { insightBanner?: string };
        return mv.insightBanner ?? null;
      })()
    : null;

  if (isStale) {
    bannerMessage = `New data added since last report — regenerate to include latest invoices.`;
    bannerAction = 'Regenerate';
    bannerHref = '/report/generate';
  } else if (hasReport && liveInsightBanner) {
    bannerMessage = liveInsightBanner;
    bannerAction = t('dashboard.viewReport');
    bannerHref = `/report/${displayMonth}`;
  } else if (hasReport) {
    bannerMessage = t('dashboard.reportReady');
    bannerAction = t('dashboard.viewReport');
    bannerHref = `/report/${displayMonth}`;
  } else if (invoiceCount === 0) {
    bannerMessage = t('dashboard.nudgeInvoices');
    bannerAction = t('dashboard.uploadInvoice');
    bannerHref = '/upload/invoice';
  } else if (!hasPOS) {
    bannerMessage = t('dashboard.nudgePos', { n: invoiceCount, month: monthShort });
    bannerAction = t('dashboard.uploadPos');
    bannerHref = '/upload/pos';
  } else {
    bannerMessage = t('dashboard.nudgeGenerate', { month: monthShort });
    bannerAction = t('dashboard.generateReport');
    bannerHref = '/report/generate';
  }

  // Recommendations from latest report
  type Rec = { rank: number; title: string; description: string; estimatedMonthlyImpactRm: number };
  const recommendations: Rec[] = hasReport && dbReport
    ? (() => {
        const mv = typeof dbReport.monthView === 'string' ? JSON.parse(dbReport.monthView) : dbReport.monthView as { recommendations?: Rec[] };
        return mv.recommendations ?? [];
      })()
    : [];

  // Warn if expenses growing faster than revenue
  const expensesWarning =
    momExpensesPct != null && momRevenuePct != null && momExpensesPct > momRevenuePct
      ? 'Growing faster than revenue'
      : undefined;

  return (
    <div className="min-h-screen bg-paper-100 flex flex-col">
      {/* Header */}
      <header className="bg-paper-50 border-b border-paper-200 px-5 lg:px-8 py-2">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div style={{ height: 48, overflow: 'hidden', marginLeft: 8 }} className="shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="Kira2 je" style={{ height: 120, marginTop: -42 }} className="w-auto" />
            </div>
            <span className="hidden sm:block text-paper-200">|</span>
            <span className="hidden sm:block text-sm text-ink-secondary truncate">{businessName}</span>
          </div>
          <Link href="/api/auth/logout" className="btn-secondary flex items-center gap-2 text-sm py-2 min-h-0">
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">{t('nav.logout')}</span>
          </Link>
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 flex max-w-5xl mx-auto w-full gap-0 lg:gap-6 px-0 lg:px-8 py-0 lg:py-6">

        {/* Sidebar */}
        <aside className="hidden lg:flex flex-col w-56 shrink-0">
          <div className="card py-4 px-3">
            <div className="flex items-center justify-between px-2 mb-3">
              <p className="section-label">Past reports</p>
              <Link
                href="/upload/past"
                className="w-5 h-5 rounded-full bg-paper-200 hover:bg-accent-primary hover:text-white text-ink-secondary flex items-center justify-center text-xs font-bold transition-colors"
                title="Add data for a past month"
              >
                +
              </Link>
            </div>
            {sidebarData.length === 0 ? (
              <p className="text-xs text-ink-secondary px-2">No reports yet — generate your first report to see history here.</p>
            ) : (
              <nav className="flex flex-col gap-0.5">
                {sidebarData.map(({ ym, label, revenue, marginPct: mPct, marginTrend }) => (
                  <Link
                    key={ym}
                    href={`/report/${ym}`}
                    className="flex flex-col px-2 py-2.5 rounded-btn text-sm transition-colors text-ink-primary hover:bg-paper-100 group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-ink-primary">{label}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-ink-secondary opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="text-xs tabular text-ink-secondary">
                        RM {(revenue / 1000).toFixed(1)}k
                      </span>
                      <span
                        className={`text-xs tabular flex items-center gap-0.5 ${
                          marginTrend == null ? 'text-ink-secondary' : marginTrend > 0 ? 'text-accent-secondary' : 'text-danger'
                        }`}
                      >
                        {mPct}%
                        {marginTrend != null && marginTrend > 0 && <TrendingUp className="w-3 h-3" />}
                        {marginTrend != null && marginTrend < 0 && <TrendingDown className="w-3 h-3" />}
                      </span>
                    </div>
                  </Link>
                ))}
              </nav>
            )}
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 flex flex-col gap-4 px-4 py-4 lg:px-0 lg:py-0 min-w-0">

          <div className="animate-fade-in-up flex items-start justify-between gap-3" style={{ animationDelay: '0ms' }}>
            <div>
              <h1 className="text-xl font-semibold text-ink-primary">{t('dashboard.title')}</h1>
              <p className="text-sm text-ink-secondary mt-0.5">{t('dashboard.month', { month: monthLabel })}</p>
            </div>
            <DeleteDataButton month={currentMonth} monthLabel={monthLabel} />
          </div>

          <div className="animate-fade-in-up" style={{ animationDelay: '60ms' }}>
            <InsightBanner message={bannerMessage} actionLabel={bannerAction} href={bannerHref} />
          </div>

          {/* Status cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 animate-fade-in-up" style={{ animationDelay: '120ms' }}>
            <StatusCard
              icon={<FileText className="w-5 h-5" />}
              label={`${invoiceCount} invoice${invoiceCount !== 1 ? 's' : ''} submitted`}
              sublabel={invoiceCount > 0 ? 'Tap to view or edit' : undefined}
              ready={invoiceCount > 0}
              href="/invoices"
            />
            <StatusCard
              icon={<Upload className="w-5 h-5" />}
              label={hasPOS ? 'POS data uploaded' : 'No POS data yet'}
              sublabel={hasPOS && posUpload ? `${posUpload.fileName} · ${(posUpload.rowCount ?? 0).toLocaleString()} rows` : 'Upload your POS export to generate a report'}
              ready={hasPOS}
              href="/upload/pos"
            />
            <StatusCard
              icon={<BarChart3 className="w-5 h-5" />}
              label={hasReport ? (isStale ? 'Report (new data available)' : 'Report ready') : 'Report not yet generated'}
              sublabel={hasReport && dbReport
                ? `Generated ${new Date(dbReport.generatedAt).toLocaleDateString('en-MY', { day: 'numeric', month: 'short' })}`
                : hasPOS && invoiceCount > 0 ? 'Tap to run analysis' : 'Waiting for POS data and invoices'}
              sublabelWarn={!!isStale}
              ready={hasReport}
              href={hasReport ? `/report/${displayMonth}` : '/report/generate'}
            />
          </div>

          {/* Mobile: month history strip */}
          {sidebarData.length > 0 && (
            <div className="lg:hidden flex gap-2 overflow-x-auto pb-1 animate-fade-in-up" style={{ animationDelay: '150ms' }}>
              {sidebarData.map(({ ym, label, marginPct: mPct }) => (
                <Link
                  key={ym}
                  href={`/report/${ym}`}
                  className="shrink-0 flex flex-col px-3 py-2 rounded-btn border border-paper-200 bg-paper-50 hover:bg-paper-100 transition-colors"
                >
                  <span className="text-xs font-semibold text-ink-primary whitespace-nowrap">{label}</span>
                  <span className="text-[10px] text-ink-secondary">{mPct}% margin</span>
                </Link>
              ))}
            </div>
          )}

          {/* Quick stats */}
          {hasReport && (
            <section className="animate-fade-in-up" style={{ animationDelay: '180ms' }}>
              <p className="section-label mb-3">{monthLabel} summary</p>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatCard
                  label={t('dashboard.revenue')}
                  value={fmtRM(totalRevenue)}
                  mom={momRevenuePct}
                />
                <StatCard
                  label={t('dashboard.expenses')}
                  value={fmtRM(totalExpenses)}
                  mom={momExpensesPct}
                  positive={false}
                  warning={expensesWarning}
                />
                <StatCard
                  label={t('dashboard.profit')}
                  value={fmtRM(estimatedProfit)}
                  mom={momProfitPct}
                  positive={estimatedProfit > 0}
                />
                <StatCard
                  label={t('dashboard.margin')}
                  value={`${marginPct}%`}
                  mom={momMarginPp}
                  momSuffix="pp"
                  positive={marginPct > 25}
                />
              </div>
            </section>
          )}

          {/* Recommendations */}
          {recommendations.length > 0 && (
            <section className="animate-fade-in-up" style={{ animationDelay: '220ms' }}>
              <p className="section-label mb-3">Suggestions</p>
              <div className="flex flex-col gap-3">
                {recommendations.map((rec) => (
                  <div key={rec.rank} className="card flex gap-4 items-start">
                    <div className="w-7 h-7 rounded-full bg-accent-primary/10 text-accent-primary flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                      {rec.rank}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-ink-primary leading-snug">{rec.title}</p>
                        {rec.estimatedMonthlyImpactRm > 0 && (
                          <span className="text-xs font-semibold text-accent-secondary whitespace-nowrap shrink-0">
                            +RM {rec.estimatedMonthlyImpactRm.toLocaleString()}/mo
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-ink-secondary mt-1 leading-relaxed">{rec.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Empty state */}
          {!hasReport && invoiceCount === 0 && (
            <div className="card flex flex-col items-center text-center py-12 gap-3 animate-fade-in-up" style={{ animationDelay: '180ms' }}>
              <div className="w-12 h-12 rounded-full bg-paper-200 flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-ink-secondary" />
              </div>
              <h2 className="font-semibold text-ink-primary">{t('dashboard.emptyTitle')}</h2>
              <p className="text-sm text-ink-secondary max-w-xs">{t('dashboard.emptyDesc')}</p>
              <Link href="/upload/invoice" className="btn-primary mt-2 text-sm">
                {t('dashboard.uploadInvoice')}
              </Link>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
