'use client';

import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { Logo } from '@/components/Logo';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { ThemeToggle } from '@/components/ThemeToggle';
import { ShopSwitcher } from '@/components/ShopSwitcher';
import { ChatPanel, type ChatMsg } from '@/components/ChatPanel';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/hooks';
import { useI18n, messageForApiError } from '@/i18n';
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

function ReportPageInner() {
  const { id } = useParams<{ id: string }>();
  const params = useSearchParams();
  const { user, loading } = useAuth();
  const { t } = useI18n();
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isGuest = (!loading && !user) || params.get('guest') === '1';

  useEffect(() => {
    api
      .get<Report>(`/api/reports/${id}`)
      .then(setReport)
      .catch((err) => setError(messageForApiError(err, t)));
  }, [id, t]);

  return (
    <div className="min-h-screen bg-bg text-ink">
      <header className="sticky top-0 z-10 bg-bg/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href={isGuest ? '/' : '/dashboard'}>
            <Logo />
          </Link>
          <nav className="flex items-center gap-3 text-sm">
            {user && <ShopSwitcher />}
            <LanguageSwitcher />
            <ThemeToggle />
            {isGuest ? (
              <Link href="/login" className="text-sm font-semibold text-primary hover:underline">
                {t('nav.alreadyHaveAccount')}
              </Link>
            ) : (
              <Link href="/dashboard" className="text-sm font-semibold text-primary hover:underline">
                {t('nav.dashboard')}
              </Link>
            )}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        {error && <div className="rounded-2xl bg-alert/10 p-5 text-alert">{error}</div>}
        {!report && !error && <p className="text-muted">Loading…</p>}
        {report && (
          <div className="space-y-6">
            <HeroStats report={report} />
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
            {isGuest ? <GuestSignupPrompt /> : <ExportBar report={report} />}
          </div>
        )}
      </main>
    </div>
  );
}

export default function ReportPage() {
  return (
    <Suspense fallback={<div className="p-10">Loading…</div>}>
      <ReportPageInner />
    </Suspense>
  );
}

function HeroStats({ report }: { report: Report }) {
  const agg = report.summary_json.aggregate_metrics;
  return (
    <div className="rounded-3xl bg-primary p-6 text-white">
      <p className="text-xs uppercase tracking-wide opacity-80">
        Report · {report.summary_json.reporting_period.label}
      </p>
      <h1 className="font-serif mt-1 text-3xl font-bold">{report.title}</h1>
      <div className="mt-4 grid gap-4 md:grid-cols-4">
        <Stat label="Revenue" value={rm(agg.total_revenue)} />
        <Stat label="Profit" value={rm(agg.gross_profit)} />
        <Stat label="Margin" value={`${agg.overall_margin_pct.toFixed(1)}%`} />
        <Stat label="Units sold" value={agg.total_items_sold.toLocaleString('en-MY')} />
      </div>
    </div>
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
    <div className="rounded-2xl bg-[rgb(var(--color-card))] p-5 shadow-card">
      <h2 className="font-serif text-xl font-bold text-primary">Menu breakdown</h2>
      <div className="mt-3 overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="text-left text-primary/80">
            <tr className="border-b border-primary/10">
              <th className="py-2 pr-2">Item</th>
              <th className="py-2 pr-2 text-right">Units</th>
              <th className="py-2 pr-2 text-right">Revenue</th>
              <th className="py-2 pr-2 text-right">Cost</th>
              <th className="py-2 pr-2 text-right">Profit</th>
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
  items: {
    item_name: string;
    current_margin_pct: number;
    previous_margin_pct: number;
    margin_drop_pct: number;
  }[];
}) {
  return (
    <div className="rounded-2xl bg-[rgb(var(--color-card))] p-5 shadow-card border-l-4 border-alert">
      <h2 className="font-serif text-xl font-bold text-alert">Margins dropping</h2>
      <ul className="mt-3 space-y-2">
        {items.map((i) => (
          <li key={i.item_name} className="text-sm text-ink">
            <b>{i.item_name}</b> — from {i.previous_margin_pct.toFixed(1)}% to{' '}
            {i.current_margin_pct.toFixed(1)}% (−{i.margin_drop_pct.toFixed(1)} pts)
          </li>
        ))}
      </ul>
    </div>
  );
}

function CannibalWarnings({
  flags,
}: {
  flags: {
    item_a: string;
    item_b: string;
    recommendation: string | null;
    potential_profit_uplift?: number;
  }[];
}) {
  return (
    <div className="rounded-2xl bg-[rgb(var(--color-card))] p-5 shadow-card border-l-4 border-alert">
      <h2 className="font-serif text-xl font-bold text-alert">Menu cannibalization</h2>
      <ul className="mt-3 space-y-3 text-sm text-ink">
        {flags.map((f, i) => (
          <li key={i}>
            <b>{f.item_a}</b> is eating into <b>{f.item_b}</b>.{' '}
            {f.potential_profit_uplift != null && (
              <>Potential uplift: {rm(f.potential_profit_uplift, true)}.</>
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
      <h2 className="font-serif text-xl font-bold text-primary">Kira's recommendations</h2>
      <div className="mt-2 whitespace-pre-wrap text-sm text-ink leading-relaxed">{text}</div>
    </div>
  );
}

function TaxCard({ tax }: { tax: Report['summary_json']['tax_estimation'] }) {
  return (
    <div className="rounded-2xl bg-[rgb(var(--color-card))] p-5 shadow-card">
      <h2 className="font-serif text-xl font-bold text-primary">LHDN tax estimate</h2>
      <div className="mt-3 grid gap-3 md:grid-cols-4">
        <Mini label="Annualised revenue" value={rm(tax.estimated_annual_revenue)} />
        <Mini label="Annualised expenses" value={rm(tax.estimated_annual_expenses)} />
        <Mini label="Taxable income" value={rm(tax.estimated_taxable_income)} />
        <Mini label="Estimated tax" value={rm(tax.estimated_tax)} accent />
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
  const { t, dict } = useI18n();
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [quick, setQuick] = useState<string[]>(dict.chat.emptySuggestions);
  const [busy, setBusy] = useState(false);

  async function send(content: string) {
    if (!content.trim() || busy) return;
    const next: ChatMsg[] = [...messages, { role: 'user', content }];
    setMessages(next);
    setBusy(true);
    try {
      const r = await api.post<{ assistant_message: { content: string }; quick_replies: string[] }>(
        `/api/chat/strategy/${reportId}`,
        { content },
      );
      setMessages([...next, { role: 'assistant', content: r.assistant_message.content }]);
      setQuick(r.quick_replies || []);
    } catch (err) {
      setMessages([...next, { role: 'assistant', content: messageForApiError(err, t) }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h2 className="mb-3 font-serif text-xl font-bold text-primary">Ask Kira: "What if…?"</h2>
      <ChatPanel messages={messages} quickReplies={quick} onSend={send} busy={busy} />
    </div>
  );
}

function GuestSignupPrompt() {
  const { t } = useI18n();
  return (
    <div className="rounded-3xl border-2 border-accent bg-accent/10 p-6 text-ink">
      <h2 className="font-serif text-2xl font-bold text-primary">{t('upload.signupPromptTitle')}</h2>
      <p className="mt-2 text-ink">{t('upload.signupPromptBody')}</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Link href="/signup" className="btn-primary">
          {t('upload.signupPromptCta')} →
        </Link>
        <Link href="/login" className="btn-ghost">
          {t('nav.login')}
        </Link>
      </div>
    </div>
  );
}

function ExportBar({ report }: { report: Report }) {
  const { t } = useI18n();
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
      setNote('✔ Sent.');
    } catch (err) {
      setNote(err instanceof ApiError ? messageForApiError(err, t) : t('errors.generic'));
    } finally {
      setSending(null);
    }
  }

  return (
    <div className="rounded-2xl bg-[rgb(var(--color-card))] p-5 shadow-card">
      <h2 className="font-serif text-xl font-bold text-primary">Export & share</h2>
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
            placeholder="+60123456789"
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
