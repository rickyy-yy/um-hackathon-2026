'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, BarChart3, FileText, Upload, AlertTriangle, CheckCircle, GitMerge } from 'lucide-react';
import { LoadingDots } from '@/components/LoadingDots';
import Link from 'next/link';
import { AppHeader } from '@/components/AppHeader';

const MONTH_NAMES: Record<string, string> = {
  '01': 'January', '02': 'February', '03': 'March', '04': 'April',
  '05': 'May', '06': 'June', '07': 'July', '08': 'August',
  '09': 'September', '10': 'October', '11': 'November', '12': 'December',
};

function labelForMonth(ym: string): string {
  const [year, month] = ym.split('-');
  return `${MONTH_NAMES[month] ?? month} ${year}`;
}

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

type Preflight = { invoiceCount: number; posRows: number; posFileName: string | null; mappingCount: number; hasData: boolean };

function GenerateReportPageInner() {
  const searchParams = useSearchParams();
  const month = searchParams.get('month') ?? getCurrentMonth();
  const monthLabel = labelForMonth(month);

  const router = useRouter();
  const [preflight, setPreflight] = useState<Preflight | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/report/generate?month=${month}`)
      .then((r) => r.json())
      .then((j) => { if (j.ok) setPreflight(j as Preflight); })
      .catch(() => {});
  }, [month]);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/report/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? 'Failed to generate report');
        setLoading(false);
        return;
      }
      router.push(`/report/${month}`);
    } catch {
      setError('Network error. Please try again.');
      setLoading(false);
    }
  }

  const hasInvoices = (preflight?.invoiceCount ?? 0) > 0;
  const hasPos = (preflight?.posRows ?? 0) > 0;
  const hasData = preflight?.hasData ?? true;
  const hasMappings = (preflight?.mappingCount ?? 0) > 0;
  const needsMappings = hasInvoices && !hasMappings;

  return (
    <main className="min-h-screen flex flex-col">
      <AppHeader title="Generate Report" backHref="/dashboard" />
      <div className="flex-1 flex flex-col items-center justify-center px-5 pb-16 gap-6 max-w-md mx-auto w-full">
        <div className="card w-full py-8 space-y-5">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-full bg-accent-primary/10 flex items-center justify-center mx-auto">
              <BarChart3 className="w-7 h-7 text-accent-primary" />
            </div>
            <h2 className="font-semibold text-ink-primary text-lg">{monthLabel} report</h2>
          </div>

          {/* Data summary */}
          {preflight && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-ink-secondary uppercase tracking-wide">Data available</p>
              <div className={`flex items-center gap-3 px-4 py-3 rounded-btn border ${hasInvoices ? 'border-accent-secondary/30 bg-accent-secondary/5' : 'border-paper-200 bg-paper-100'}`}>
                <FileText size={16} className={hasInvoices ? 'text-accent-secondary' : 'text-ink-secondary'} />
                <span className="text-sm flex-1">
                  {hasInvoices ? `${preflight.invoiceCount} invoice${preflight.invoiceCount !== 1 ? 's' : ''}` : 'No invoices'}
                </span>
                {hasInvoices ? <CheckCircle size={14} className="text-accent-secondary" /> : <span className="text-xs text-ink-secondary">—</span>}
              </div>
              <div className={`flex items-center gap-3 px-4 py-3 rounded-btn border ${hasPos ? 'border-accent-secondary/30 bg-accent-secondary/5' : 'border-paper-200 bg-paper-100'}`}>
                <Upload size={16} className={hasPos ? 'text-accent-secondary' : 'text-ink-secondary'} />
                <span className="text-sm flex-1">
                  {hasPos ? `${preflight.posRows.toLocaleString()} sales rows${preflight.posFileName ? ` · ${preflight.posFileName}` : ''}` : 'No POS data'}
                </span>
                {hasPos ? <CheckCircle size={14} className="text-accent-secondary" /> : <span className="text-xs text-ink-secondary">—</span>}
              </div>

              {/* Ingredient mappings row */}
              {hasInvoices && (
                <div className={`flex items-center gap-3 px-4 py-3 rounded-btn border ${hasMappings ? 'border-accent-secondary/30 bg-accent-secondary/5' : 'border-red-200 bg-red-50'}`}>
                  <GitMerge size={16} className={hasMappings ? 'text-accent-secondary' : 'text-red-500'} />
                  <span className="text-sm flex-1">
                    {hasMappings ? `${preflight!.mappingCount} ingredient mapping${preflight!.mappingCount !== 1 ? 's' : ''}` : 'No ingredient mappings'}
                  </span>
                  {hasMappings
                    ? <CheckCircle size={14} className="text-accent-secondary" />
                    : <Link href="/mapping" className="text-xs font-semibold text-red-600 hover:underline shrink-0">Set up now</Link>}
                </div>
              )}

              {/* Partial data warning */}
              {hasData && (!hasInvoices || !hasPos) && (
                <div className="flex gap-2 px-3 py-2.5 rounded-btn bg-amber-50 border border-amber-200 text-amber-800 text-xs leading-relaxed">
                  <AlertTriangle size={13} className="shrink-0 mt-0.5" />
                  <p>
                    {!hasInvoices
                      ? 'No invoices for this month — expense and margin data will be missing from the report.'
                      : 'No POS data — revenue and top performer analysis will be missing. Expense trends will still be calculated.'}
                  </p>
                </div>
              )}

              {/* Mapping required warning */}
              {needsMappings && (
                <div className="flex gap-2 px-3 py-2.5 rounded-btn bg-red-50 border border-red-200 text-red-800 text-xs leading-relaxed">
                  <AlertTriangle size={13} className="shrink-0 mt-0.5" />
                  <p>Ingredient mappings are required to calculate margins and costs. <Link href="/mapping" className="font-semibold underline">Set up mappings</Link> before generating the report.</p>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="flex gap-2 px-3 py-2.5 rounded-btn bg-red-50 border border-red-200 text-red-800 text-xs leading-relaxed">
              <AlertTriangle size={13} className="shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          {!hasData && preflight ? (
            <div className="space-y-3">
              <p className="text-sm text-ink-secondary text-center">
                Upload some data for {monthLabel} first.
              </p>
              <div className="flex gap-2">
                <Link href={`/upload/invoice?month=${month}`} className="flex-1 btn-secondary text-sm text-center">
                  Add invoices
                </Link>
                <Link href={`/upload/pos?month=${month}`} className="flex-1 btn-secondary text-sm text-center">
                  Add POS data
                </Link>
              </div>
            </div>
          ) : (
            <button
              onClick={generate}
              disabled={loading || !preflight || needsMappings}
              className="btn-primary w-full disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating<LoadingDots className="text-white" />
                </span>
              ) : (
                `Generate ${monthLabel} report`
              )}
            </button>
          )}
        </div>
      </div>
    </main>
  );
}

export default function GenerateReportPage() {
  return (
    <Suspense>
      <GenerateReportPageInner />
    </Suspense>
  );
}
