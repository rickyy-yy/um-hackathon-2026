import Link from 'next/link';
import { Share2, TrendingUp, TrendingDown } from 'lucide-react';
import { mockReportData, DEMO_MONTHS } from '@/lib/mocks';
import { ReportViewToggle } from '@/components/ReportViewToggle';

const HISTORY = [
  { slug: '2026-02', label: 'February 2026' },
  { slug: '2026-03', label: 'March 2026' },
  { slug: '2026-04', label: 'April 2026' },
];

function monthLabel(slug: string): string {
  const found = HISTORY.find((h) => h.slug === slug);
  if (found) return found.label;
  const [year, month] = slug.split('-');
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString('en-MY', { month: 'long', year: 'numeric' });
}

function fmtK(n: number) {
  return `RM ${(n / 1000).toFixed(1)}k`;
}

export default async function ReportPage({ params }: { params: { month: string } }) {
  const { month } = params;
  const report = mockReportData(month);
  const title = `${monthLabel(month)} Report`;

  // Sidebar data: revenue + margin + trend per month
  const sidebarData = DEMO_MONTHS.map((ym, i) => {
    const d = mockReportData(ym);
    const prev = i > 0 ? mockReportData(DEMO_MONTHS[i - 1]) : null;
    const marginTrend = prev
      ? d.monthView.summary.marginPct - prev.monthView.summary.marginPct
      : null;
    return {
      ym,
      label: HISTORY.find((h) => h.slug === ym)?.label ?? ym,
      revenue: d.monthView.summary.totalRevenue,
      marginPct: d.monthView.summary.marginPct,
      marginTrend,
    };
  });

  return (
    <div className="min-h-screen bg-paper-100 flex flex-col">
      <header className="bg-accent-primary text-white px-5 lg:px-8 pt-5 pb-4 shrink-0">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold leading-tight">{title}</h1>
            <p className="text-xs text-white/60 mt-0.5">Generated Apr 25, 2026</p>
          </div>
          <button
            aria-label="Share report"
            className="p-2 rounded-btn bg-white/15 hover:bg-white/25 transition-colors"
          >
            <Share2 size={18} />
          </button>
        </div>
      </header>

      <div className="flex-1 max-w-5xl mx-auto w-full flex flex-col lg:flex-row gap-0 lg:gap-6 px-4 lg:px-8 py-6">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex flex-col shrink-0 w-52 gap-1 pt-1">
          <p className="section-label mb-2 px-1">Report history</p>
          {sidebarData.map(({ ym, label, revenue, marginPct, marginTrend }) => {
            const isCurrent = ym === month;
            return (
              <Link
                key={ym}
                href={`/report/${ym}`}
                className={`flex flex-col px-3 py-2.5 rounded-btn text-sm transition-colors ${
                  isCurrent
                    ? 'bg-accent-primary/10 text-accent-primary'
                    : 'text-ink-secondary hover:bg-paper-200 hover:text-ink-primary'
                }`}
              >
                <span className={`font-semibold ${isCurrent ? 'text-accent-primary' : 'text-ink-primary'}`}>
                  {label}
                </span>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="text-xs tabular text-ink-secondary">{fmtK(revenue)}</span>
                  <span
                    className={`text-xs tabular flex items-center gap-0.5 ${
                      marginTrend == null
                        ? 'text-ink-secondary'
                        : marginTrend > 0
                        ? 'text-accent-secondary'
                        : 'text-danger'
                    }`}
                  >
                    {marginPct}%
                    {marginTrend != null && marginTrend > 0 && <TrendingUp className="w-3 h-3" />}
                    {marginTrend != null && marginTrend < 0 && <TrendingDown className="w-3 h-3" />}
                  </span>
                </div>
              </Link>
            );
          })}
        </aside>

        {/* Mobile history strip */}
        <div className="lg:hidden w-full mb-4 flex gap-2 overflow-x-auto pb-1">
          {HISTORY.map((h) => {
            const isCurrent = h.slug === month;
            return (
              <Link
                key={h.slug}
                href={`/report/${h.slug}`}
                className={`shrink-0 px-3 py-1.5 rounded-btn text-xs font-medium border transition-colors ${
                  isCurrent
                    ? 'bg-accent-primary text-white border-accent-primary'
                    : 'bg-paper-50 text-ink-secondary border-paper-200'
                }`}
              >
                {h.label}
              </Link>
            );
          })}
        </div>

        <main className="flex-1 min-w-0 space-y-6">
          <ReportViewToggle
            monthView={report.monthView}
            trendsView={report.trendsView}
            month={month}
          />
        </main>
      </div>
    </div>
  );
}
