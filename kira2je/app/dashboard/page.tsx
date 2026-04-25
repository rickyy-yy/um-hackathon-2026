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
} from 'lucide-react';
import { getSession } from '@/lib/auth';
import { serverT } from '@/lib/i18n/server';
import { mockReportData, DEMO_MONTHS } from '@/lib/mocks';

export const dynamic = 'force-dynamic';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatMonth(ym: string): string {
  // "2026-04" → "April 2026"
  const [y, m] = ym.split('-');
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString('en-MY', { month: 'long', year: 'numeric' });
}

function formatMonthShort(ym: string): string {
  // "2026-04" → "Apr 2026"
  const [y, m] = ym.split('-');
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString('en-MY', { month: 'short', year: 'numeric' });
}

function fmtRM(n: number): string {
  return `RM ${n.toLocaleString('en-MY', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  positive,
}: {
  label: string;
  value: string;
  sub?: string;
  positive?: boolean;
}) {
  return (
    <div className="card flex flex-col gap-1">
      <span className="section-label">{label}</span>
      <span
        className={[
          'text-2xl font-semibold tabular',
          positive === true
            ? 'text-accent-secondary'
            : positive === false
            ? 'text-danger'
            : 'text-ink-primary',
        ].join(' ')}
      >
        {value}
      </span>
      {sub && <span className="text-xs text-ink-secondary">{sub}</span>}
    </div>
  );
}

function StatusCard({
  icon,
  label,
  sublabel,
  ready,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
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
        <p className="text-sm font-medium text-ink-primary truncate">{label}</p>
        {sublabel && <p className="text-xs text-ink-secondary truncate">{sublabel}</p>}
      </div>
      <ChevronRight className="w-4 h-4 text-ink-secondary shrink-0 group-hover:text-ink-primary transition-colors" />
    </Link>
  );
}

function NudgeBanner({
  message,
  actionLabel,
  href,
}: {
  message: string;
  actionLabel: string;
  href: string;
}) {
  return (
    <div className="card border-accent-primary/20 bg-accent-primary/5 flex flex-col sm:flex-row sm:items-center gap-3">
      <AlertCircle className="w-5 h-5 text-accent-primary shrink-0 hidden sm:block" />
      <p className="flex-1 text-sm text-ink-primary leading-relaxed">{message}</p>
      <Link
        href={href}
        className="btn-primary text-sm text-center whitespace-nowrap self-start sm:self-auto"
      >
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

  // Current month
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // ── Demo / mock state ──
  // For hackathon: hardcode demo state (cast to number to avoid TS literal narrowing)
  const invoiceCount = 12 as number;
  const invoicesPending = 3 as number;
  const hasPOS = true as boolean;
  const hasReport = true as boolean;
  const businessName = 'Café Demo'; // fallback display name

  // Month to show (use currentMonth or fall back to hardcoded demo month)
  const displayMonth = currentMonth; // "2026-04" in demo
  const monthLabel = formatMonth(displayMonth); // "April 2026"
  const monthShort = displayMonth.slice(5, 7) === '04' ? 'April' : monthLabel;

  // Mock report data for stats
  const report = mockReportData('2026-04');
  const { totalRevenue, totalExpenses, estimatedProfit, marginPct } = report.monthView.summary;

  // ── Nudge logic ──
  let nudgeMessage: string;
  let nudgeAction: string;
  let nudgeHref: string;

  if (invoiceCount === 0) {
    nudgeMessage = t('dashboard.nudgeInvoices');
    nudgeAction = t('dashboard.uploadInvoice');
    nudgeHref = '/upload/invoice';
  } else if (!hasPOS) {
    nudgeMessage = t('dashboard.nudgePos', { n: invoiceCount, month: monthShort });
    nudgeAction = t('dashboard.uploadPos');
    nudgeHref = '/upload/pos';
  } else if (!hasReport) {
    nudgeMessage = t('dashboard.nudgeGenerate', { month: monthShort });
    nudgeAction = t('dashboard.generateReport');
    nudgeHref = '/report/generate';
  } else {
    nudgeMessage = t('dashboard.reportReady');
    nudgeAction = t('dashboard.viewReport');
    nudgeHref = `/report/${displayMonth}`;
  }

  // ── Sidebar months (hardcoded for demo) ──
  const sidebarMonths = DEMO_MONTHS; // ['2026-02', '2026-03', '2026-04']

  return (
    <div className="min-h-screen bg-paper-100 flex flex-col">
      {/* ── Header ── */}
      <header className="bg-paper-50 border-b border-paper-200 px-5 lg:px-8 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-lg font-bold text-ink-primary tracking-tight shrink-0">
              Kira2 je
            </span>
            <span className="hidden sm:block text-paper-200">|</span>
            <span className="hidden sm:block text-sm text-ink-secondary truncate">
              {businessName}
            </span>
          </div>
          <Link
            href="/api/auth/logout"
            className="btn-secondary flex items-center gap-2 text-sm py-2 min-h-0"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">{t('nav.logout')}</span>
          </Link>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="flex-1 flex max-w-5xl mx-auto w-full gap-0 lg:gap-6 px-0 lg:px-8 py-0 lg:py-6">

        {/* ── Sidebar (desktop only) ── */}
        <aside className="hidden lg:flex flex-col w-56 shrink-0">
          <div className="card py-4 px-3">
            <p className="section-label px-2 mb-3">Reports</p>
            <nav className="flex flex-col gap-0.5">
              {sidebarMonths.map((ym) => {
                const isCurrent = ym === displayMonth;
                return (
                  <Link
                    key={ym}
                    href={`/report/${ym}`}
                    className={[
                      'flex items-center justify-between px-2 py-2 rounded-btn text-sm transition-colors',
                      isCurrent
                        ? 'bg-accent-primary text-white font-semibold'
                        : 'text-ink-primary hover:bg-paper-100',
                    ].join(' ')}
                  >
                    {formatMonthShort(ym)}
                    {isCurrent && <CheckCircle className="w-3.5 h-3.5 opacity-80" />}
                  </Link>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* ── Main content ── */}
        <main className="flex-1 flex flex-col gap-4 px-4 py-4 lg:px-0 lg:py-0 min-w-0">

          {/* Page title */}
          <div>
            <h1 className="text-xl font-semibold text-ink-primary">
              {t('dashboard.title')}
            </h1>
            <p className="text-sm text-ink-secondary mt-0.5">
              {t('dashboard.month', { month: monthLabel })}
            </p>
          </div>

          {/* Nudge banner */}
          <NudgeBanner
            message={nudgeMessage}
            actionLabel={nudgeAction}
            href={nudgeHref}
          />

          {/* Status cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <StatusCard
              icon={<FileText className="w-5 h-5" />}
              label={t('dashboard.invoicesCount', {
                n: invoiceCount,
                s: invoiceCount === 1 ? '' : 's',
              })}
              sublabel={
                invoicesPending > 0
                  ? t('dashboard.invoicesPending', { n: invoicesPending })
                  : undefined
              }
              ready={invoiceCount > 0}
              href="/invoices"
            />

            <StatusCard
              icon={<Upload className="w-5 h-5" />}
              label={hasPOS ? t('dashboard.posUploaded') : t('dashboard.posMissing')}
              sublabel={hasPOS ? monthLabel : undefined}
              ready={hasPOS}
              href="/upload/pos"
            />

            <StatusCard
              icon={<BarChart3 className="w-5 h-5" />}
              label={hasReport ? t('dashboard.reportReady') : t('dashboard.noReport')}
              sublabel={hasReport ? monthLabel : undefined}
              ready={hasReport}
              href={hasReport ? `/report/${displayMonth}` : '/report/generate'}
            />
          </div>

          {/* Quick stats (shown when report exists) */}
          {hasReport && (
            <section>
              <p className="section-label mb-3">
                {monthLabel} summary
              </p>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatCard
                  label={t('dashboard.revenue')}
                  value={fmtRM(totalRevenue)}
                />
                <StatCard
                  label={t('dashboard.expenses')}
                  value={fmtRM(totalExpenses)}
                  positive={false}
                />
                <StatCard
                  label={t('dashboard.profit')}
                  value={fmtRM(estimatedProfit)}
                  positive={estimatedProfit > 0}
                />
                <StatCard
                  label={t('dashboard.margin')}
                  value={`${marginPct}%`}
                  positive={marginPct > 25}
                />
              </div>
            </section>
          )}

          {/* Empty state fallback */}
          {!hasReport && invoiceCount === 0 && (
            <div className="card flex flex-col items-center text-center py-12 gap-3">
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

          {/* Quick actions row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Link
              href="/upload/invoice"
              className="btn-secondary text-sm text-center py-2.5 min-h-0"
            >
              {t('dashboard.uploadInvoice')}
            </Link>
            <Link
              href="/upload/pos"
              className="btn-secondary text-sm text-center py-2.5 min-h-0"
            >
              {t('dashboard.uploadPos')}
            </Link>
            <Link
              href="/invoices"
              className="btn-secondary text-sm text-center py-2.5 min-h-0"
            >
              {t('dashboard.confirmQueue')}
            </Link>
            {hasReport ? (
              <Link
                href={`/report/${displayMonth}`}
                className="btn-primary text-sm text-center py-2.5 min-h-0"
              >
                {t('dashboard.viewReport')}
              </Link>
            ) : (
              <Link
                href="/report/generate"
                className="btn-primary text-sm text-center py-2.5 min-h-0"
              >
                {t('dashboard.generateReport')}
              </Link>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
