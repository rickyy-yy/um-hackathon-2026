import Link from 'next/link';
import { Share2 } from 'lucide-react';
import { mockReportData } from '@/lib/mocks';
import { ReportViewToggle } from '@/components/ReportViewToggle';

// ─── Report history sidebar entries ──────────────────────────────────────────

const HISTORY = [
  { slug: '2026-02', label: 'February 2026' },
  { slug: '2026-03', label: 'March 2026' },
  { slug: '2026-04', label: 'April 2026' },
];

function monthLabel(slug: string): string {
  const found = HISTORY.find((h) => h.slug === slug);
  if (found) return found.label;
  // Fallback: parse "YYYY-MM"
  const [year, month] = slug.split('-');
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString('en-MY', { month: 'long', year: 'numeric' });
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ReportPage({
  params,
}: {
  params: { month: string };
}) {
  const { month } = params;
  const report = mockReportData(month);
  const title = `${monthLabel(month)} Report`;

  return (
    <div className="min-h-screen bg-paper-100 flex flex-col">
      {/* Top header bar */}
      <header className="bg-accent-primary text-white px-5 lg:px-8 pt-5 pb-4 shrink-0">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <h1 className="text-xl font-semibold leading-tight">{title}</h1>
          <button
            aria-label="Share report"
            className="p-2 rounded-btn bg-white/15 hover:bg-white/25 transition-colors"
          >
            <Share2 size={18} />
          </button>
        </div>
      </header>

      {/* Body: sidebar + main */}
      <div className="flex-1 max-w-5xl mx-auto w-full flex gap-0 lg:gap-6 px-4 lg:px-8 py-6">
        {/* Sidebar — hidden on mobile */}
        <aside className="hidden lg:flex flex-col shrink-0 w-52 gap-1 pt-1">
          <p className="section-label mb-2">Report history</p>
          {HISTORY.map((h) => {
            const isCurrent = h.slug === month;
            return (
              <Link
                key={h.slug}
                href={`/report/${h.slug}`}
                className={`px-3 py-2.5 rounded-btn text-sm font-medium transition-colors ${
                  isCurrent
                    ? 'bg-accent-primary/10 text-accent-primary'
                    : 'text-ink-secondary hover:bg-paper-200 hover:text-ink-primary'
                }`}
              >
                {h.label}
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

        {/* Main content */}
        <main className="flex-1 min-w-0 space-y-6">
          <ReportViewToggle
            monthView={report.monthView}
            trendsView={report.trendsView}
          />
        </main>
      </div>
    </div>
  );
}
