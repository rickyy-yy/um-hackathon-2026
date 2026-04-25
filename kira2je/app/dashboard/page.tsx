import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  FileText,
  Upload,
  BarChart3,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  LogOut,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';
import { getSession } from '@/lib/auth';
import { serverT } from '@/lib/i18n/server';
import { mockReportData, DEMO_MONTHS } from '@/lib/mocks';

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

  // Demo state
  const invoiceCount = 12 as number;
  const invoicesPending = 3 as number;
  const hasPOS = true as boolean;
  const hasReport = true as boolean;
  const businessName = 'Café Demo';

  const displayMonth = currentMonth;
  const monthLabel = formatMonth(displayMonth);
  const monthShort = displayMonth.slice(5, 7) === '04' ? 'April' : monthLabel;

  const report = mockReportData('2026-04');
  const { totalRevenue, totalExpenses, estimatedProfit, marginPct,
          momRevenuePct, momExpensesPct, momProfitPct, momMarginPp } = report.monthView.summary;

  // Sidebar: compute per-month summary data
  const sidebarData = DEMO_MONTHS.map((ym, i) => {
    const d = mockReportData(ym);
    const prev = i > 0 ? mockReportData(DEMO_MONTHS[i - 1]) : null;
    const marginTrend = prev
      ? d.monthView.summary.marginPct - prev.monthView.summary.marginPct
      : null;
    return {
      ym,
      label: formatMonthShort(ym),
      revenue: d.monthView.summary.totalRevenue,
      marginPct: d.monthView.summary.marginPct,
      marginTrend,
      hasData: true,
    };
  });

  // Nudge / insight banner
  let bannerMessage: string;
  let bannerAction: string;
  let bannerHref: string;

  if (hasReport && report.monthView.insightBanner) {
    bannerMessage = report.monthView.insightBanner;
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
  } else if (!hasReport) {
    bannerMessage = t('dashboard.nudgeGenerate', { month: monthShort });
    bannerAction = t('dashboard.generateReport');
    bannerHref = '/report/generate';
  } else {
    bannerMessage = t('dashboard.reportReady');
    bannerAction = t('dashboard.viewReport');
    bannerHref = `/report/${displayMonth}`;
  }

  // Warn if expenses growing faster than revenue
  const expensesWarning =
    momExpensesPct != null && momRevenuePct != null && momExpensesPct > momRevenuePct
      ? 'Growing faster than revenue'
      : undefined;

  return (
    <div className="min-h-screen bg-paper-100 flex flex-col">
      {/* Header */}
      <header className="bg-paper-50 border-b border-paper-200 px-5 lg:px-8 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-lg font-bold text-ink-primary tracking-tight shrink-0">Kira2 je</span>
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
            <p className="section-label px-2 mb-3">Reports</p>
            <nav className="flex flex-col gap-0.5">
              {sidebarData.map(({ ym, label, revenue, marginPct: mPct, marginTrend, hasData }) => {
                const isCurrent = ym === displayMonth;
                return (
                  <Link
                    key={ym}
                    href={`/report/${ym}`}
                    className={[
                      'flex flex-col px-2 py-2.5 rounded-btn text-sm transition-colors',
                      isCurrent
                        ? 'bg-accent-primary text-white'
                        : 'text-ink-primary hover:bg-paper-100',
                    ].join(' ')}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`font-semibold ${isCurrent ? 'text-white' : 'text-ink-primary'}`}>
                        {label}
                      </span>
                      {isCurrent && <CheckCircle className="w-3.5 h-3.5 opacity-80" />}
                    </div>
                    {hasData && (
                      <div className="flex items-center justify-between mt-0.5">
                        <span className={`text-xs tabular ${isCurrent ? 'text-white/75' : 'text-ink-secondary'}`}>
                          RM {(revenue / 1000).toFixed(1)}k
                        </span>
                        <span
                          className={`text-xs tabular flex items-center gap-0.5 ${
                            isCurrent
                              ? 'text-white/75'
                              : marginTrend == null
                              ? 'text-ink-secondary'
                              : marginTrend > 0
                              ? 'text-accent-secondary'
                              : 'text-danger'
                          }`}
                        >
                          {mPct}%
                          {marginTrend != null && marginTrend > 0 && <TrendingUp className="w-3 h-3" />}
                          {marginTrend != null && marginTrend < 0 && <TrendingDown className="w-3 h-3" />}
                        </span>
                      </div>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 flex flex-col gap-4 px-4 py-4 lg:px-0 lg:py-0 min-w-0">

          <div className="animate-fade-in-up" style={{ animationDelay: '0ms' }}>
            <h1 className="text-xl font-semibold text-ink-primary">{t('dashboard.title')}</h1>
            <p className="text-sm text-ink-secondary mt-0.5">{t('dashboard.month', { month: monthLabel })}</p>
          </div>

          <div className="animate-fade-in-up" style={{ animationDelay: '60ms' }}>
            <InsightBanner message={bannerMessage} actionLabel={bannerAction} href={bannerHref} />
          </div>

          {/* Status cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 animate-fade-in-up" style={{ animationDelay: '120ms' }}>
            <StatusCard
              icon={<FileText className="w-5 h-5" />}
              label={`${invoiceCount} invoices submitted`}
              sublabel={invoicesPending > 0 ? `${invoicesPending} need confirmation` : undefined}
              sublabelWarn={invoicesPending > 0}
              ready={invoiceCount > 0}
              href="/invoices"
            />
            <StatusCard
              icon={<Upload className="w-5 h-5" />}
              label={hasPOS ? 'POS data uploaded' : 'No POS data yet'}
              sublabel={hasPOS ? `${monthLabel} · storehub_apr2026.xlsx` : 'Upload your POS export to generate a report'}
              ready={hasPOS}
              href="/upload/pos"
            />
            <StatusCard
              icon={<BarChart3 className="w-5 h-5" />}
              label={hasReport ? 'Report ready' : 'Report not yet generated'}
              sublabel={hasReport ? `Generated Apr 25 · ${monthLabel}` : hasPOS && invoiceCount > 0 ? 'Tap to run analysis' : 'Waiting for POS data and invoices'}
              ready={hasReport}
              href={hasReport ? `/report/${displayMonth}` : '/report/generate'}
            />
          </div>

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
