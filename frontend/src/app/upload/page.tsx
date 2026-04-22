'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Logo } from '@/components/Logo';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { ThemeToggle } from '@/components/ThemeToggle';
import { ShopSwitcher } from '@/components/ShopSwitcher';
import { ChatPanel, type ChatMsg } from '@/components/ChatPanel';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/hooks';
import { useI18n, messageForApiError } from '@/i18n';

type Tab = 'file' | 'scan' | 'chat';

type ExtractedRow = {
  item_name: string | null;
  quantity_sold: number | null;
  selling_price: number | null;
  cost_per_unit: number | null;
  sale_date: string | null;
  payment_method: string | null;
  category?: string | null;
};

type Upload = {
  id: string;
  file_name: string;
  file_type: string;
  processing_status: string;
  extracted_data_json: {
    rows?: ExtractedRow[];
    missing_fields?: string[];
    uncertainties?: string[];
    error?: string;
  } | null;
};

export default function UploadPage() {
  const { user, loading } = useAuth();
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>('file');
  const [rows, setRows] = useState<ExtractedRow[]>([]);
  const [upload, setUpload] = useState<Upload | null>(null);

  const isGuest = !loading && !user;

  return (
    <div className="min-h-screen bg-bg text-ink">
      <header className="sticky top-0 z-10 bg-bg/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/">
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
        {isGuest && (
          <div className="mb-6 rounded-2xl border border-accent bg-accent/10 px-4 py-3 text-sm text-ink">
            <span className="font-semibold text-primary">•</span> {t('upload.guestBanner')}
          </div>
        )}

        <h1 className="font-serif text-4xl font-bold text-primary">{t('upload.title')}</h1>
        <p className="mt-2 text-ink/70">{t('upload.subtitle')}</p>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <TabCard
            active={tab === 'file'}
            onClick={() => setTab('file')}
            icon="📄"
            title="CSV · PDF · XLSX"
            desc="POS export or ledger file."
          />
          <TabCard
            active={tab === 'scan'}
            onClick={() => setTab('scan')}
            icon="📷"
            title="Photo"
            desc="Touch n Go, DuitNow, or handwritten ledger."
          />
          <TabCard
            active={tab === 'chat'}
            onClick={() => setTab('chat')}
            icon="💬"
            title="Chat with Kira"
            desc="Fill in data by talking."
          />
        </div>

        <div className="mt-6">
          {tab === 'file' && (
            <FileTab
              onProcessed={(u) => {
                setUpload(u);
                setRows(u.extracted_data_json?.rows || []);
              }}
            />
          )}
          {tab === 'scan' && (
            <ScanTab
              onProcessed={(u) => {
                setUpload(u);
                setRows(u.extracted_data_json?.rows || []);
              }}
            />
          )}
          {tab === 'chat' && (
            <ChatTab
              onDone={(collected) => {
                setRows(collectedToRows(collected));
              }}
            />
          )}
        </div>

        {rows.length > 0 && upload && (
          <DataReview upload={upload} rows={rows} setRows={setRows} isGuest={isGuest} />
        )}
      </main>
    </div>
  );
}

function collectedToRows(collected: any): ExtractedRow[] {
  const items: ExtractedRow[] = [];
  const period = collected?.reporting_period || {};
  const start = period.start_date || period.end_date || null;
  for (const m of collected?.menu_items || []) {
    items.push({
      item_name: m.item_name,
      quantity_sold: m.quantity_sold,
      selling_price: m.selling_price,
      cost_per_unit: m.cost_per_unit,
      sale_date: start,
      payment_method: null,
      category: m.category,
    });
  }
  return items;
}

function TabCard({
  active,
  onClick,
  icon,
  title,
  desc,
}: {
  active: boolean;
  onClick: () => void;
  icon: string;
  title: string;
  desc: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-2xl border-2 p-5 text-left transition ${
        active
          ? 'border-primary bg-[rgb(var(--color-card))] shadow-card'
          : 'border-primary/10 bg-[rgb(var(--color-card))]/60 hover:bg-[rgb(var(--color-card))]'
      }`}
    >
      <span className="text-2xl" aria-hidden>
        {icon}
      </span>
      <h3 className="mt-2 font-serif text-xl font-bold text-primary">{title}</h3>
      <p className="mt-1 text-sm text-ink/70">{desc}</p>
    </button>
  );
}

function FileTab({ onProcessed }: { onProcessed: (u: Upload) => void }) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handle(files: FileList | null) {
    const f = files?.[0];
    if (!f) return;
    setBusy(true);
    setError(null);
    const fd = new FormData();
    fd.append('file', f);
    try {
      const u = await api.upload<Upload>('/api/upload/file', fd);
      if (u.processing_status === 'failed') {
        setError(u.extracted_data_json?.error || t('errors.generic'));
      }
      onProcessed(u);
    } catch (err) {
      setError(messageForApiError(err, t));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl bg-[rgb(var(--color-card))] p-10 shadow-card">
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          handle(e.dataTransfer.files);
        }}
        className="cursor-pointer rounded-2xl border-2 border-dashed border-primary/30 p-10 text-center hover:bg-bg/30"
      >
        <p className="text-5xl" aria-hidden>📥</p>
        <p className="mt-3 font-serif text-xl font-bold text-primary">
          Drop a file or click to pick
        </p>
        <p className="mt-1 text-sm text-ink/60">CSV · XLSX · PDF · JPG · PNG · max 10 MB</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept=".csv,.tsv,.xlsx,.xls,.pdf,.jpg,.jpeg,.png,.webp"
        onChange={(e) => handle(e.target.files)}
      />
      {busy && <p className="mt-4 text-center text-sm text-primary">✨ Kira is reading your data…</p>}
      {error && (
        <div className="mt-4 rounded-xl border-l-4 border-alert bg-alert/10 px-4 py-3 text-sm text-alert">
          {error}
        </div>
      )}
    </div>
  );
}

function ScanTab({ onProcessed }: { onProcessed: (u: Upload) => void }) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handle(files: FileList | null) {
    const f = files?.[0];
    if (!f) return;
    setBusy(true);
    setError(null);
    const fd = new FormData();
    fd.append('file', f);
    try {
      const u = await api.upload<Upload>('/api/upload/file', fd);
      onProcessed(u);
    } catch (err) {
      setError(messageForApiError(err, t));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl bg-[rgb(var(--color-card))] p-10 shadow-card text-center">
      <p className="text-5xl" aria-hidden>📷</p>
      <h3 className="mt-3 font-serif text-2xl font-bold text-primary">
        Take a photo or pick from gallery
      </h3>
      <p className="mt-2 text-sm text-ink/70">
        Kira reads handwritten ledgers, TnG/DuitNow screenshots, and POS receipts.
      </p>
      <button onClick={() => inputRef.current?.click()} className="btn-primary mt-6">
        📸 Open camera
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handle(e.target.files)}
      />
      {busy && <p className="mt-4 text-sm text-primary">✨ Kira is reading the image…</p>}
      {error && (
        <div className="mt-4 rounded-xl border-l-4 border-alert bg-alert/10 px-4 py-3 text-sm text-alert">
          {error}
        </div>
      )}
    </div>
  );
}

function ChatTab({ onDone }: { onDone: (collected: any) => void }) {
  const { t } = useI18n();
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [quick, setQuick] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (ready) return;
    api
      .post<any>('/api/chat/opening')
      .then((r) => {
        setMessages([{ role: 'assistant', content: r.assistant_message.content }]);
        setQuick(r.quick_replies || []);
        setReady(true);
      })
      .catch(() => setReady(true));
  }, [ready]);

  async function send(content: string) {
    if (!content.trim() || busy) return;
    const next: ChatMsg[] = [...messages, { role: 'user', content }];
    setMessages(next);
    setBusy(true);
    try {
      const r = await api.post<any>('/api/chat/message', { content });
      setMessages([...next, { role: 'assistant', content: r.assistant_message.content }]);
      setQuick(r.quick_replies || []);
      if (r.done && r.collected_data) onDone(r.collected_data);
    } catch (err) {
      setMessages([
        ...next,
        { role: 'assistant', content: messageForApiError(err, t) },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return <ChatPanel messages={messages} quickReplies={quick} onSend={send} busy={busy} />;
}

function DataReview({
  upload,
  rows,
  setRows,
  isGuest,
}: {
  upload: Upload;
  rows: ExtractedRow[];
  setRows: (r: ExtractedRow[]) => void;
  isGuest: boolean;
}) {
  const router = useRouter();
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const period = useMemo(() => {
    const dates = rows.map((r) => r.sale_date).filter(Boolean) as string[];
    if (dates.length === 0) return null;
    dates.sort();
    return { start: dates[0], end: dates[dates.length - 1] };
  }, [rows]);

  function updateCell<K extends keyof ExtractedRow>(i: number, key: K, value: ExtractedRow[K]) {
    const copy = rows.slice();
    copy[i] = { ...copy[i], [key]: value };
    setRows(copy);
  }

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      await api.put(`/api/upload/${upload.id}/confirm`, { rows });
      if (!period) {
        setError('Add a date to each row so we can calculate a period.');
        setBusy(false);
        return;
      }
      const report = await api.post<{ id: string }>('/api/reports/generate', {
        start_date: period.start,
        end_date: period.end,
      });
      router.push(`/report/${report.id}${isGuest ? '?guest=1' : ''}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('errors.generic'));
      setBusy(false);
    }
  }

  return (
    <div className="mt-10">
      <h2 className="font-serif text-2xl font-bold text-primary">Review & confirm</h2>
      <p className="text-sm text-ink/70">Edit any numbers Kira read wrong.</p>

      <div className="mt-4 overflow-auto rounded-2xl bg-[rgb(var(--color-card))] shadow-card">
        <table className="min-w-full text-sm">
          <thead className="bg-primary/5 text-primary">
            <tr>
              <th className="p-3 text-left">Item</th>
              <th className="p-3 text-right">Qty</th>
              <th className="p-3 text-right">Price</th>
              <th className="p-3 text-right">Cost</th>
              <th className="p-3 text-left">Date</th>
              <th className="p-3 text-left">Paid</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-primary/5">
                <td className="p-2">
                  <input
                    className="input py-2"
                    value={r.item_name || ''}
                    onChange={(e) => updateCell(i, 'item_name', e.target.value)}
                  />
                </td>
                <td className="p-2">
                  <input
                    type="number"
                    className="input py-2 text-right"
                    value={r.quantity_sold ?? ''}
                    onChange={(e) => updateCell(i, 'quantity_sold', Number(e.target.value) || null)}
                  />
                </td>
                <td className="p-2">
                  <input
                    type="number"
                    step="0.01"
                    className="input py-2 text-right"
                    value={r.selling_price ?? ''}
                    onChange={(e) => updateCell(i, 'selling_price', Number(e.target.value) || null)}
                  />
                </td>
                <td className="p-2">
                  <input
                    type="number"
                    step="0.01"
                    className="input py-2 text-right"
                    value={r.cost_per_unit ?? ''}
                    onChange={(e) => updateCell(i, 'cost_per_unit', Number(e.target.value) || null)}
                  />
                </td>
                <td className="p-2">
                  <input
                    type="date"
                    className="input py-2"
                    value={r.sale_date || ''}
                    onChange={(e) => updateCell(i, 'sale_date', e.target.value || null)}
                  />
                </td>
                <td className="p-2">
                  <select
                    className="input py-2"
                    value={r.payment_method || ''}
                    onChange={(e) => updateCell(i, 'payment_method', e.target.value || null)}
                  >
                    <option value="">—</option>
                    <option value="cash">Cash</option>
                    <option value="touch_n_go">Touch n Go</option>
                    <option value="duitnow">DuitNow</option>
                    <option value="card">Card</option>
                    <option value="other">Other</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {error && (
        <div className="mt-4 rounded-xl border-l-4 border-alert bg-alert/10 px-4 py-3 text-sm text-alert">
          {error}
        </div>
      )}

      <div className="mt-6 flex justify-end gap-3">
        <button onClick={confirm} disabled={busy} className="btn-primary">
          {busy ? '…' : 'Generate report →'}
        </button>
      </div>
    </div>
  );
}
