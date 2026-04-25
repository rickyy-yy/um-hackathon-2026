'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Upload, FileText, BarChart3, ChevronRight } from 'lucide-react';
import { AppHeader } from '@/components/AppHeader';

const MONTH_NAMES: Record<string, string> = {
  '01': 'January', '02': 'February', '03': 'March', '04': 'April',
  '05': 'May', '06': 'June', '07': 'July', '08': 'August',
  '09': 'September', '10': 'October', '11': 'November', '12': 'December',
};

function formatMonth(ym: string): string {
  const [year, month] = ym.split('-');
  return `${MONTH_NAMES[month] ?? month} ${year}`;
}

function getPastMonths(n = 12): string[] {
  const months: string[] = [];
  const now = new Date();
  for (let i = 1; i <= n; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return months;
}

export default function UploadPastPage() {
  const [selected, setSelected] = useState<string>(getPastMonths(1)[0]);
  const months = getPastMonths(12);

  return (
    <main className="min-h-screen flex flex-col">
      <AppHeader title="Add past month data" backHref="/dashboard" />

      <div className="flex-1 px-5 pt-6 pb-16 max-w-lg mx-auto w-full space-y-6">
        <div className="space-y-1">
          <p className="text-sm text-ink-secondary">
            Select a past month to upload invoices, POS sales data, and generate a report.
          </p>
        </div>

        {/* Month picker */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-ink-secondary uppercase tracking-wide">Month</label>
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="input w-full"
          >
            {months.map((m) => (
              <option key={m} value={m}>{formatMonth(m)}</option>
            ))}
          </select>
        </div>

        {/* Action cards */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-ink-secondary uppercase tracking-wide">
            Steps for {formatMonth(selected)}
          </p>

          <Link
            href={`/upload/invoice?month=${selected}`}
            className="card flex items-center gap-4 hover:bg-paper-100 transition-colors group"
          >
            <div className="w-10 h-10 rounded-full bg-paper-200 text-ink-secondary flex items-center justify-center shrink-0 group-hover:bg-accent-primary/10 group-hover:text-accent-primary transition-colors">
              <FileText size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-ink-primary">Upload invoices</p>
              <p className="text-xs text-ink-secondary mt-0.5">Scan or upload supplier invoices for {formatMonth(selected)}</p>
            </div>
            <ChevronRight size={16} className="text-ink-secondary shrink-0" />
          </Link>

          <Link
            href={`/upload/pos?month=${selected}`}
            className="card flex items-center gap-4 hover:bg-paper-100 transition-colors group"
          >
            <div className="w-10 h-10 rounded-full bg-paper-200 text-ink-secondary flex items-center justify-center shrink-0 group-hover:bg-accent-primary/10 group-hover:text-accent-primary transition-colors">
              <Upload size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-ink-primary">Upload POS data</p>
              <p className="text-xs text-ink-secondary mt-0.5">Import your sales export for {formatMonth(selected)}</p>
            </div>
            <ChevronRight size={16} className="text-ink-secondary shrink-0" />
          </Link>

          <Link
            href={`/report/generate?month=${selected}`}
            className="card flex items-center gap-4 hover:bg-paper-100 transition-colors group"
          >
            <div className="w-10 h-10 rounded-full bg-paper-200 text-ink-secondary flex items-center justify-center shrink-0 group-hover:bg-accent-primary/10 group-hover:text-accent-primary transition-colors">
              <BarChart3 size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-ink-primary">Generate report</p>
              <p className="text-xs text-ink-secondary mt-0.5">Run AI analysis for {formatMonth(selected)} once data is uploaded</p>
            </div>
            <ChevronRight size={16} className="text-ink-secondary shrink-0" />
          </Link>
        </div>
      </div>
    </main>
  );
}
