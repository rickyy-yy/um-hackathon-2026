'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { api, ApiError } from '@/lib/api';
import { rm, scoreLabelMs } from '@/lib/format';

type MenuRow = {
  item_name: string;
  category: string | null;
  units_sold: number;
  total_revenue: number;
  total_cost: number;
  gross_profit: number;
  margin_pct: number;
  profitability_score: string;
  margin_change_vs_prev?: number;
};

type Report = {
  id: string;
  title: string;
  ai_recommendations: string;
  generated_at: string;
  summary_json: {
    reporting_period: { start_date: string; end_date: string; label: string };
    aggregate_metrics: {
      total_revenue: number;
      total_cogs: number;
      gross_profit: number;
      overall_margin_pct: number;
      total_items_sold: number;
      revenue_by_payment_method: Record<string, number>;
    };
    menu_item_breakdown: MenuRow[];
    declining_items: {
      item_name: string;
      current_margin_pct: number;
      previous_margin_pct: number;
      margin_drop_pct: number;
    }[];
    cannibalization_flags: {
      item_a: string;
      item_b: string;
      recommendation: string | null;
      potential_profit_uplift?: number;
    }[];
    tax_estimation: {
      estimated_annual_revenue: number;
      estimated_annual_expenses: number;
      estimated_taxable_income: number;
      estimated_tax: number;
      tax_bracket: string;
      note: string;
    };
  };
};

type ChatReply = {
  assistant_message: { content: string };
  quick_replies: string[];
};

export default function ReportPage() {
  const { id } = useParams<{ id: string }>();
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<Report>(`/api/reports/${id}`)
      .then(setReport)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : 'Gagal memuatkan laporan.'),
      );
  }, [id]);

  if (error) {
    return (
      <AppShell>
        <div className="rounded-2xl bg-white p-6 text-alert">{error}</div>
      </AppShell>
    );
  }

  if (!report) {
    return (
      <AppShell>
        <p className="text-ink/60">Memuatkan…</p>
      </AppShell>
    );
  }

  const agg = report.summary_json.aggregate_metrics;

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="rounded-3xl bg-primary p-6 text-white">
          <p className="text-xs uppercase tracking-wide opacity-80">
            Laporan · {report.summary_json.reporting_period.label}
          </p>
          <h1 className="font-serif mt-1 text-3xl font-bold">{report.title}</h1>
          <div className="mt-4 grid gap-4 md:grid-cols-4">
            <Stat label="Jumlah Jualan" value={rm(agg.total_revenue)} />
            <Stat label="Anggaran Untung" value={rm(agg.gross_profit)} />
            <Stat label="Margin" value={`${agg.overall_margin_pct.toFixed(1)}%`} />
            <Stat label="Unit Dijual" value={agg.total_items_sold.toLocaleString('en-MY')} />
          </div>
        </div>

        <MenuBreakdown rows={report.summary_json.menu_item_breakdown} />

        {report.summary_json.declining_items.length > 0 && (
          <DecliningAlerts items={report.summary_json.declining_items} />
        )}

        {report.summary_json.cannibalization_flags.length > 0 && (
          <CannibalWarnings flags={report.summary_json.cannibalization_flags} />
        )}

        <AIRecommendations text={report.ai_recommendations} />

        <TaxCard tax={report.summary_json.tax_estimation} />

        <StrategyChat reportId={report.id} />

        <ExportBar report={report} />
      </div>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs opacity-80">{label}</p>
      <p className="font-serif text-2xl font-bold">{value}</p>
    </div>
  );
}

function MenuBreakdown({ rows }: { rows: MenuRow[] }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-card">
      <h2 className="font-serif text-xl font-bold text-primary">Pecahan setiap menu</h2>
      <div className="mt-3 overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="text-left text-primary/80">
            <tr className="border-b border-primary/10">
              <th className="py-2 pr-2">Item</th>
              <th className="py-2 pr-2 text-right">Unit</th>
              <th className="py-2 pr-2 text-right">Jualan</th>
              <th className="py-2 pr-2 text-right">Kos</th>
              <th className="py-2 pr-2 text-right">Untung</th>
              <th className="py-2 pr-2 text-right">Margin</th>
              <th className="py-2 text-right">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.item_name} className="border-b border-primary/5">
                <td className="py-2 font-semibold text-ink">{r.item_name}</td>
                <td className="py-2 text-right">{r.units_sold}</td>
                <td className="py-2 text-right">{rm(r.total_revenue)}</td>
                <td className="py-2 text-right">{rm(r.total_cost)}</td>
                <td
                  className={`py-2 text-right font-semibold ${
                    r.gross_profit >= 0 ? 'text-primary' : 'text-alert'
                  }`}
                >
                  {rm(r.gross_profit, r.gross_profit >= 0)}
                </td>
                <td className="py-2 text-right">{r.margin_pct.toFixed(1)}%</td>
                <td className="py-2 text-right">
                  <ScoreBadge score={r.profitability_score} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ScoreBadge({ score }: { score: string }) {
  const cls =
    score === 'green'
      ? 'bg-primary text-white'
      : score === 'yellow'
      ? 'bg-accent text-ink'
      : 'bg-alert text-white';
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${cls}`}>
      {scoreLabelMs(score)}
    </span>
  );
}

function DecliningAlerts({
  items,
}: {
  items: { item_name: string; current_margin_pct: number; previous_margin_pct: number; margin_drop_pct: number }[];
}) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-card border-l-4 border-alert">
      <h2 className="font-serif text-xl font-bold text-alert">⚠ Margin jatuh</h2>
      <ul className="mt-3 space-y-2">
        {items.map((i) => (
          <li key={i.item_name} className="text-sm text-ink">
            <b>{i.item_name}</b> — turun dari {i.previous_margin_pct.toFixed(1)}% ke{' '}
            {i.current_margin_pct.toFixed(1)}% (−{i.margin_drop_pct.toFixed(1)} mata peratus)
          </li>
        ))}
      </ul>
    </div>
  );
}

function CannibalWarnings({
  flags,
}: {
  flags: { item_a: string; item_b: string; recommendation: string | null; potential_profit_uplift?: number }[];
}) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-card border-l-4 border-alert">
      <h2 className="font-serif text-xl font-bold text-alert">⚠ Menu bergaduh</h2>
      <ul className="mt-3 space-y-3 text-sm text-ink">
        {flags.map((f, i) => (
          <li key={i}>
            <b>{f.item_a}</b> makan jualan <b>{f.item_b}</b>.{' '}
            {f.potential_profit_uplift != null && (
              <>Potensi untung tambahan: {rm(f.potential_profit_uplift, true)}.</>
            )}
            {f.recommendation && <p className="mt-1 text-ink/80">{f.recommendation}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}

function AIRecommendations({ text }: { text: string }) {
  return (
    <div className="rounded-2xl bg-surface/50 p-5">
      <h2 className="font-serif text-xl font-bold text-primary">Cadangan Kira</h2>
      <div className="mt-2 whitespace-pre-wrap text-sm text-ink leading-relaxed">{text}</div>
    </div>
  );
}

function TaxCard({ tax }: { tax: Report['summary_json']['tax_estimation'] }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-card">
      <h2 className="font-serif text-xl font-bold text-primary">Anggaran cukai LHDN</h2>
      <div className="mt-3 grid gap-3 md:grid-cols-4">
        <Mini label="Pendapatan tahunan" value={rm(tax.estimated_annual_revenue)} />
        <Mini label="Perbelanjaan tahunan" value={rm(tax.estimated_annual_expenses)} />
        <Mini label="Pendapatan bercukai" value={rm(tax.estimated_taxable_income)} />
        <Mini label="Anggaran cukai" value={rm(tax.estimated_tax)} accent />
      </div>
      <p className="mt-3 text-xs text-ink/60">
        Bracket: <b>{tax.tax_bracket}</b>. {tax.note}
      </p>
    </div>
  );
}

function Mini({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl p-3 ${accent ? 'bg-accent' : 'bg-bg/70'}`}>
      <p className="text-xs text-ink/60">{label}</p>
      <p className="font-serif text-lg font-bold text-primary">{value}</p>
    </div>
  );
}

function StrategyChat({ reportId }: { reportId: string }) {
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([
    {
      role: 'assistant',
      content:
        'Tanya saya apa-apa pasal menu anda. Contoh: "Kalau saya naikkan harga nasi lemak 50 sen?"',
    },
  ]);
  const [quick, setQuick] = useState<string[]>([
    'Kalau saya naikkan harga 50 sen?',
    'Item mana paling untung?',
    'Patut buang mana?',
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);

  async function send(content: string) {
    if (!content.trim() || busy) return;
    const next = [...messages, { role: 'user' as const, content }];
    setMessages(next);
    setInput('');
    setBusy(true);
    try {
      const r = await api.post<ChatReply>(`/api/chat/strategy/${reportId}`, { content });
      setMessages([...next, { role: 'assistant', content: r.assistant_message.content }]);
      setQuick(r.quick_replies || []);
    } catch (err) {
      setMessages([
        ...next,
        { role: 'assistant', content: 'Maaf, Kira ada masalah buat kiraan sekarang.' },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-3xl bg-white shadow-card">
      <div className="bg-primary px-5 py-4 text-white">
        <p className="font-bold">Tanya: "Kalau saya...?"</p>
        <p className="text-xs opacity-80">· Kira sedia menjawab</p>
      </div>
      <div className="space-y-3 bg-bg p-5 min-h-[260px]">
        {messages.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'flex justify-end' : ''}>
            <div className={m.role === 'assistant' ? 'sage-bubble max-w-[80%]' : 'user-bubble max-w-[80%]'}>
              {m.content}
            </div>
          </div>
        ))}
      </div>

      {quick.length > 0 && (
        <div className="flex flex-wrap gap-2 border-t border-primary/10 bg-white px-5 py-3">
          {quick.map((q) => (
            <button key={q} onClick={() => send(q)} className="chip text-sm">
              {q}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 border-t border-primary/10 bg-white px-4 py-3">
        <input
          className="input flex-1"
          placeholder="Tanya apa-apa…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send(input)}
          disabled={busy}
        />
        <button
          onClick={() => send(input)}
          disabled={busy || !input.trim()}
          className="btn-primary px-4 py-3"
          aria-label="Hantar"
        >
          →
        </button>
      </div>
    </div>
  );
}

function ExportBar({ report }: { report: Report }) {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [sending, setSending] = useState<'email' | 'whatsapp' | null>(null);
  const [note, setNote] = useState<string | null>(null);

  async function send(kind: 'email' | 'whatsapp') {
    const destination = kind === 'email' ? email : phone;
    if (!destination) return;
    setSending(kind);
    setNote(null);
    try {
      await api.post(`/api/reports/${report.id}/send/${kind}`, { destination });
      setNote('✔ Dihantar.');
    } catch (err) {
      setNote(err instanceof ApiError ? `Gagal: ${err.message}` : 'Gagal hantar.');
    } finally {
      setSending(null);
    }
  }

  return (
    <div className="rounded-2xl bg-white p-5 shadow-card">
      <h2 className="font-serif text-xl font-bold text-primary">Eksport &amp; kongsi</h2>
      <div className="mt-3 flex flex-wrap gap-3">
        <a className="btn-ghost" href={`/api/reports/${report.id}/export/pdf`} download>
          ⬇ PDF
        </a>
        <a className="btn-ghost" href={`/api/reports/${report.id}/export/xlsx`} download>
          ⬇ XLSX
        </a>
        <a className="btn-ghost" href={`/api/reports/${report.id}/export/docx`} download>
          ⬇ DOCX
        </a>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <div className="flex gap-2">
          <input
            type="email"
            placeholder="email@warung.com"
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button
            onClick={() => send('email')}
            disabled={!email || sending === 'email'}
            className="btn-accent"
          >
            Email
          </button>
        </div>
        <div className="flex gap-2">
          <input
            type="tel"
            placeholder="+60 12 345 6789"
            className="input"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <button
            onClick={() => send('whatsapp')}
            disabled={!phone || sending === 'whatsapp'}
            className="btn-accent"
          >
            WhatsApp
          </button>
        </div>
      </div>
      {note && <p className="mt-3 text-sm text-ink/70">{note}</p>}
    </div>
  );
}
