import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ChevronLeft, RefreshCw, AlertTriangle } from 'lucide-react';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { mockReportData } from '@/lib/mocks';
import { ReportViewToggle } from '@/components/ReportViewToggle';

function monthLabel(slug: string): string {
  const [year, month] = slug.split('-');
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString('en-MY', { month: 'long', year: 'numeric' });
}

export default async function ReportPage({ params }: { params: { month: string } }) {
  const session = await getSession();
  if (!session) redirect('/');

  const { month } = params;

  const dbReport = await prisma.report.findUnique({
    where: { userId_month: { userId: session.userId, month } },
  });

  let reportData;
  let generatedAt = 'Demo data';
  let isEmptyReport = false;

  if (dbReport) {
    const mv = typeof dbReport.monthView === 'string' ? JSON.parse(dbReport.monthView) : dbReport.monthView;
    const tv = typeof dbReport.trendsView === 'string' ? JSON.parse(dbReport.trendsView) : dbReport.trendsView;
    reportData = { monthView: mv, trendsView: tv };
    generatedAt = new Date(dbReport.generatedAt).toLocaleDateString('en-MY', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    isEmptyReport = (mv?.summary?.totalRevenue ?? 0) === 0 && (mv?.summary?.totalExpenses ?? 0) === 0;
  } else {
    reportData = mockReportData(month);
    generatedAt = 'Demo data';
  }

  const title = `${monthLabel(month)} Report`;

  return (
    <div className="min-h-screen bg-paper-100 flex flex-col">
      <header className="bg-accent-primary text-white px-5 lg:px-8 pt-5 pb-4 shrink-0">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/dashboard"
              className="p-1.5 rounded-btn bg-white/15 hover:bg-white/25 transition-colors shrink-0"
              aria-label="Back to dashboard"
            >
              <ChevronLeft size={18} />
            </Link>
            <div className="min-w-0">
              <h1 className="text-xl font-semibold leading-tight">{title}</h1>
              <p className="text-xs text-white/60 mt-0.5">{generatedAt}</p>
            </div>
          </div>
          <Link
            href={`/report/generate?month=${month}`}
            className="p-2 rounded-btn bg-white/15 hover:bg-white/25 transition-colors shrink-0"
            aria-label="Regenerate report"
            title="Regenerate report"
          >
            <RefreshCw size={18} />
          </Link>
        </div>
      </header>

      {isEmptyReport && (
        <div className="bg-amber-50 border-b border-amber-200 px-5 py-3">
          <div className="max-w-3xl mx-auto flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-start gap-2 flex-1">
              <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">
                This report was generated without data — all values are zero. Upload invoices and POS data for {monthLabel(month)}, then regenerate.
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Link href={`/upload/past`} className="text-xs font-semibold text-amber-700 hover:underline whitespace-nowrap">
                Upload data
              </Link>
              <span className="text-amber-400">·</span>
              <Link href={`/report/generate?month=${month}`} className="text-xs font-semibold text-amber-700 hover:underline whitespace-nowrap">
                Regenerate
              </Link>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 lg:px-8 py-6">
        <ReportViewToggle
          monthView={reportData.monthView}
          trendsView={reportData.trendsView}
          month={month}
        />
      </main>
    </div>
  );
}
