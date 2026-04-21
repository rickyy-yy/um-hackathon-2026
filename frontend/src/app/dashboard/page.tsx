'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { api, ApiError } from '@/lib/api';
import { rm, scoreLabelMs } from '@/lib/format';

type ReportSummary = {
  id: string;
  report_month: string;
  title: string;
  status: string;
  generated_at: string;
  total_revenue: number | null;
  gross_profit: number | null;
};

type FullReport = {
  id: string;
  title: string;
  summary_json: {
    reporting_period: { start_date: string; end_date: string; label: string };
    aggregate_metrics: {
      total_revenue: number;
      gross_profit: number;
      total_items_sold: number;
      overall_margin_pct: number;
    };
    menu_item_breakdown: {
      item_name: string;
      units_sold: number;
      total_revenue: number;
      gross_profit: number;
      margin_pct: number;
      profitability_score: string;
    }[];
    cannibalization_flags: {
      item_a: string;
      item_b: string;
      recommendation: string | null;
    }[];
  };
  ai_recommendations: string;
  generated_at: string;
};

export default function DashboardPage() {
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [selected, setSelected] = useState<FullReport | null>(null);
  const [streamlitUrl, setStreamlitUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [dataStaleDays, setDataStaleDays] = useState<number | null>(null);

  useEffect(() => {
    api
      .get<ReportSummary[]>('/api/reports')
      .then((list) => {
        setReports(list);
        setLoading(false);
        if (list.length > 0) pickReport(list[0].id);
        if (list.length > 0) {
          const gen = new Date(list[0].generated_at);
          const days = Math.floor((Date.now() - gen.getTime()) / 86400000);
          if (days > 7) setDataStaleDays(days);
        }
      })
      .catch(() => setLoading(false));
  }, []);

  async function pickReport(id: string) {
    try {
      const r = await api.get<FullReport>(`/api/reports/${id}`);
      setSelected(r);
      const token = await api
        .post<{ token: string }>(`/api/dashboard/token?report_id=${id}`)
        .catch(() => null);
      const base = process.env.NEXT_PUBLIC_STREAMLIT_URL || 'http://localhost:8501';
      if (token) setStreamlitUrl(`${base}/?token=${token.token}&report_id=${id}`);
    } catch (err) {
      if (err instanceof ApiError) console.error(err);
    }
  }

  return (
    <AppShell>
      {loading ? (
        <p className="text-ink/60">Memuatkan…</p>
      ) : reports.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-6">
          <HeaderCard report={selected} />

          {dataStaleDays !== null && (
            <div className="rounded-2xl bg-white p-4 shadow-card border-l-4 border-alert">
              <p className="text-primary font-semibold">
                🤔 Data terakhir {dataStaleDays} hari lepas
              </p>
              <p className="text-sm text-ink/70">Cuba satu je dulu pun okay.</p>
              <Link href="/upload" className="mt-2 inline-block btn-accent text-sm">
                ↻ Kemaskini
              </Link>
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
            <aside className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-serif text-2xl font-bold text-primary">Laporan lepas</h2>
                <Link href="/upload" className="btn-accent text-sm">
                  + Baharu
                </Link>
              </div>
              {reports.map((r) => (
                <button
                  key={r.id}
                  onClick={() => pickReport(r.id)}
                  className={`w-full rounded-2xl border p-4 text-left transition ${
                    selected?.id === r.id
                      ? 'border-primary bg-white shadow-card'
                      : 'border-primary/10 bg-white/70 hover:bg-white'
                  }`}
                >
                  <p className="font-serif text-lg font-bold text-primary">{r.title}</p>
                  <p className="text-xs text-ink/60">
                    {new Date(r.generated_at).toLocaleDateString('ms-MY')}
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-1 text-sm">
                    <div>
                      <p className="text-xs text-ink/50">Jualan</p>
                      <p className="font-semibold text-primary">{rm(r.total_revenue)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-ink/50">Untung</p>
                      <p className="font-semibold text-primary">{rm(r.gross_profit)}</p>
                    </div>
                  </div>
                </button>
              ))}
            </aside>

            <section className="space-y-6">
              {selected && <MenuBreakdown report={selected} />}
              {selected &&
                selected.summary_json.cannibalization_flags?.length > 0 && (
                  <CannibalWarning
                    a={selected.summary_json.cannibalization_flags[0].item_a}
                    b={selected.summary_json.cannibalization_flags[0].item_b}
                  />
                )}
              {streamlitUrl && (
                <div className="rounded-2xl bg-white p-2 shadow-card">
                  <iframe
                    src={streamlitUrl}
                    className="h-[620px] w-full rounded-xl"
                    title="Streamlit charts"
                  />
                </div>
              )}
              {selected && (
                <Link
                  href={`/report/${selected.id}`}
                  className="inline-block btn-primary"
                >
                  Buka laporan penuh →
                </Link>
              )}
            </section>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function EmptyState() {
  return (
    <div className="rounded-3xl bg-white p-10 text-center shadow-card">
      <h2 className="font-serif text-3xl font-bold text-primary">
        Belum ada laporan lagi.
      </h2>
      <p className="mt-3 text-ink/70">
        Muat naik data jualan anda dulu — Kira akan sediakan laporan dalam beberapa minit.
      </p>
      <Link href="/upload" className="mt-6 inline-block btn-primary">
        Mulakan →
      </Link>
    </div>
  );
}

function HeaderCard({ report }: { report: FullReport | null }) {
  if (!report) return null;
  const a = report.summary_json.aggregate_metrics;
  return (
    <div className="rounded-3xl bg-primary p-6 text-white">
      <p className="text-xs uppercase tracking-wide opacity-80">
        Ringkasan · {report.summary_json.reporting_period.label}
      </p>
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <p className="text-xs opacity-80">Jumlah Jualan</p>
          <p className="font-serif text-4xl font-bold">{rm(a.total_revenue)}</p>
        </div>
        <div>
          <p className="text-xs opacity-80">Anggaran Untung</p>
          <p className="font-serif text-4xl font-bold">{rm(a.gross_profit)}</p>
          <p className="text-sm text-accent">Margin {a.overall_margin_pct.toFixed(1)}%</p>
        </div>
      </div>
    </div>
  );
}

function MenuBreakdown({ report }: { report: FullReport }) {
  const rows = report.summary_json.menu_item_breakdown;
  const max = Math.max(...rows.map((r) => Math.abs(r.gross_profit)), 1);
  return (
    <div className="rounded-2xl bg-white p-5 shadow-card">
      <h3 className="font-serif text-xl font-bold text-primary">Untung setiap menu</h3>
      <p className="text-sm text-ink/60">Disusun paling banyak untung → paling rugi</p>

      <ol className="mt-4 space-y-4">
        {rows.map((r, i) => {
          const barColor =
            r.profitability_score === 'green'
              ? 'bg-primary'
              : r.profitability_score === 'yellow'
              ? 'bg-accent'
              : 'bg-alert';
          const width = Math.round((Math.abs(r.gross_profit) / max) * 100);
          return (
            <li key={r.item_name}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-surface/60 text-xs font-bold text-primary">
                    {i + 1}
                  </span>
                  <p className="font-semibold text-ink">{r.item_name}</p>
                </div>
                <p
                  className={`font-bold ${
                    r.gross_profit >= 0 ? 'text-primary' : 'text-alert'
                  }`}
                >
                  {rm(r.gross_profit, r.gross_profit >= 0)}
                </p>
              </div>
              <div className="mt-2 h-2 rounded-full bg-bg">
                <div
                  className={`h-2 rounded-full ${barColor}`}
                  style={{ width: `${width}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-ink/60">
                {r.units_sold} unit · {scoreLabelMs(r.profitability_score)}
              </p>
            </li>
          );
        })}
      </ol>

      <div className="mt-4 flex items-center gap-4 text-xs">
        <Legend color="bg-primary" label="Sihat" />
        <Legend color="bg-accent" label="Perhati" />
        <Legend color="bg-alert" label="Rugi" />
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1">
      <span className={`inline-block h-2 w-2 rounded-full ${color}`} />
      <span className="text-ink/70">{label}</span>
    </div>
  );
}

function CannibalWarning({ a, b }: { a: string; b: string }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-card border-l-4 border-alert">
      <p className="text-xs font-bold uppercase tracking-wide text-alert">
        ⚠ Amaran · Menu Bergaduh
      </p>
      <h3 className="font-serif mt-1 text-lg font-bold text-ink">
        {a} makan jualan {b}
      </h3>
      <p className="mt-1 text-sm text-ink/70">
        Kira dah jumpa 2 menu yang bersaing untuk pelanggan yang sama. Lihat cadangan
        dalam laporan penuh.
      </p>
    </div>
  );
}
