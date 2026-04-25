'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, BarChart3 } from 'lucide-react';
import { AppHeader } from '@/components/AppHeader';

const CURRENT_MONTH = '2026-04';

export default function GenerateReportPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/report/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month: CURRENT_MONTH }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? 'Failed to generate report');
        setLoading(false);
        return;
      }
      router.push(`/report/${CURRENT_MONTH}`);
    } catch {
      setError('Network error. Please try again.');
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col">
      <AppHeader title="Generate Report" backHref="/dashboard" />
      <div className="flex-1 flex flex-col items-center justify-center px-5 pb-16 gap-6 max-w-md mx-auto w-full">
        <div className="card w-full text-center py-10 space-y-4">
          <div className="w-16 h-16 rounded-full bg-accent-primary/10 flex items-center justify-center mx-auto">
            <BarChart3 className="w-8 h-8 text-accent-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-ink-primary text-lg">Ready to generate</h2>
            <p className="text-sm text-ink-secondary mt-1">
              This will analyse your invoices and POS data for April 2026 and generate your monthly report.
            </p>
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <button
            onClick={generate}
            disabled={loading}
            className="btn-primary w-full disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating… this may take a minute
              </span>
            ) : (
              'Generate April 2026 report'
            )}
          </button>
        </div>
      </div>
    </main>
  );
}
