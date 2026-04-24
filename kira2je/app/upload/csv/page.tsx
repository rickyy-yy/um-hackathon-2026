'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { CheckCircle } from 'lucide-react';
import { useT } from '@/lib/i18n/client';
import { AppHeader } from '@/components/AppHeader';

// ── Internal row format sent to API ──────────────────────────────────────────

type Row = {
  item: string;
  price: number;
  quantity: number;
  date: string;
  channel?: string;
  cost_percent?: number;
  delivery_commission?: number;
};

// ── Column auto-detection ─────────────────────────────────────────────────────

const COL_ALIASES: Record<string, string[]> = {
  item:         ['item_name', 'item', 'name', 'product_name', 'menu_item', 'product', 'description', 'nama', 'nama_item', 'product name', 'item name', 'menu item'],
  price:        ['unit_price_rm', 'unit_price', 'price', 'selling_price', 'price_rm', 'unit_selling_price', 'harga', 'jualan'],
  quantity:     ['quantity', 'qty', 'units', 'sold', 'units_sold', 'pcs', 'jumlah', 'bilangan'],
  date:         ['date', 'sale_date', 'transaction_date', 'receipt_date', 'order_date', 'tarikh', 'created_at'],
  channel:      ['dine_in_takeaway', 'channel', 'order_type', 'service_type', 'dining_mode'],
  cost_rm:      ['unit_cost_rm', 'unit_cost', 'cost_rm', 'kos'],
  margin_pct:   ['gross_margin_pct', 'margin_pct', 'gross_margin'],
  cost_pct_col: ['cost_percent', 'cost_pct'],
  delivery_com: ['delivery_commission', 'commission', 'platform_fee', 'grab_commission', 'commission_rate'],
  is_refunded:  ['is_refunded', 'refunded', 'refund', 'cancelled', 'canceled', 'void', 'is refunded'],
};

const CHANNEL_MAP: Record<string, string> = {
  'dine-in': 'dine-in', 'dine_in': 'dine-in', 'dinein': 'dine-in', 'eat_in': 'dine-in',
  'makan_dalam': 'dine-in', 'makan dalam': 'dine-in',
  'takeaway': 'takeaway', 'take_away': 'takeaway', 'take-away': 'takeaway',
  'tapau': 'takeaway', 'to_go': 'takeaway', 'to go': 'takeaway',
  'grabfood': 'grabfood', 'grab_food': 'grabfood', 'grab': 'grabfood',
  'foodpanda': 'foodpanda', 'food_panda': 'foodpanda',
  'shopeefood': 'shopeefood', 'shopee_food': 'shopeefood',
};

function normKey(s: string) {
  return s.toLowerCase().trim().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
}

function detectCol(headers: string[], field: string): string | null {
  const aliases = COL_ALIASES[field] ?? [];
  for (const h of headers) {
    if (aliases.includes(normKey(h)) || aliases.includes(h.toLowerCase().trim())) return h;
  }
  return null;
}

function localDateStr(d: Date): string {
  // Use local year/month/day to avoid UTC offset shifting the date
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function normalizeDate(val: unknown): string | null {
  if (val instanceof Date && !isNaN(val.getTime())) return localDateStr(val);
  if (typeof val === 'string' && val.trim()) {
    // ISO date strings like "2026-03-01" are already correct
    if (/^\d{4}-\d{2}-\d{2}$/.test(val.trim())) return val.trim();
    const d = new Date(val);
    if (!isNaN(d.getTime())) return localDateStr(d);
  }
  if (typeof val === 'number' && val > 20000) {
    // Excel date serial (days since 1900-01-00, Lotus 1-2-3 off-by-two correction)
    const d = new Date(Math.round((val - 25569) * 86400 * 1000));
    if (!isNaN(d.getTime())) return localDateStr(d);
  }
  return null;
}

type MappedResult = {
  filename: string;
  rows: Row[];
  colMap: Record<string, string | null>;
  costSource: string;
  refundedCount: number;
  invalidCount: number;
};

function buildRows(headers: string[], raw: Record<string, unknown>[], filename: string): MappedResult {
  const colMap: Record<string, string | null> = {};
  for (const f of Object.keys(COL_ALIASES)) colMap[f] = detectCol(headers, f);

  let refundedCount = 0;
  let invalidCount = 0;
  const rows: Row[] = [];

  for (const r of raw) {
    // Skip refunded rows
    if (colMap.is_refunded) {
      const rv = r[colMap.is_refunded];
      if (rv === true || rv === 1 || String(rv).toLowerCase() === 'true') {
        refundedCount++;
        continue;
      }
    }

    const itemVal = colMap.item ? String(r[colMap.item] ?? '').trim() : '';
    const priceVal = colMap.price ? Number(r[colMap.price]) : NaN;
    const qtyRaw = colMap.quantity ? Number(r[colMap.quantity]) : NaN;
    const qtyVal = Math.round(qtyRaw);
    const dateVal = colMap.date ? normalizeDate(r[colMap.date]) : null;

    if (!itemVal || isNaN(priceVal) || priceVal <= 0 || isNaN(qtyRaw) || qtyVal <= 0 || !dateVal) {
      invalidCount++;
      continue;
    }

    // cost_percent: prefer explicit col > unit_cost/price > 1-margin
    let cost_percent: number | undefined;
    if (colMap.cost_pct_col) {
      const v = Number(r[colMap.cost_pct_col]);
      if (!isNaN(v) && v > 0 && v < 1) cost_percent = v;
    }
    if (cost_percent == null && colMap.cost_rm) {
      const costRm = Number(r[colMap.cost_rm]);
      if (!isNaN(costRm) && costRm > 0) cost_percent = +Math.min(0.99, costRm / priceVal).toFixed(4);
    }
    if (cost_percent == null && colMap.margin_pct) {
      const margin = Number(r[colMap.margin_pct]);
      if (!isNaN(margin) && margin > 0 && margin <= 1) cost_percent = +(1 - margin).toFixed(4);
    }

    let delivery_commission: number | undefined;
    if (colMap.delivery_com) {
      const v = Number(r[colMap.delivery_com]);
      if (!isNaN(v) && v > 0) delivery_commission = v;
    }

    const channelRaw = colMap.channel ? String(r[colMap.channel] ?? '') : '';
    const channel = CHANNEL_MAP[normKey(channelRaw)] ?? CHANNEL_MAP[channelRaw.toLowerCase().trim()] ?? 'dine-in';

    rows.push({ item: itemVal, price: priceVal, quantity: qtyVal, date: dateVal, channel, cost_percent, delivery_commission });
  }

  let costSource = 'default (35%)';
  if (colMap.cost_pct_col) costSource = colMap.cost_pct_col;
  else if (colMap.cost_rm && colMap.price) costSource = `${colMap.cost_rm} ÷ ${colMap.price}`;
  else if (colMap.margin_pct) costSource = `1 − ${colMap.margin_pct}`;

  return { filename, rows, colMap, costSource, refundedCount, invalidCount };
}

async function processFile(file: File): Promise<MappedResult> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';

  if (ext === 'csv') {
    return new Promise((resolve, reject) => {
      Papa.parse<Record<string, unknown>>(file, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true,
        complete: (r) => resolve(buildRows(r.meta.fields ?? [], r.data, file.name)),
        error: (e) => reject(new Error(e.message)),
      });
    });
  }

  // XLSX / XLS — read raw (dates come as Excel serials, handled in normalizeDate)
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);
  const headers = raw.length > 0 ? Object.keys(raw[0]) : [];
  return buildRows(headers, raw, file.name);
}

// ── Column mapping summary panel ──────────────────────────────────────────────

function ColMappingPanel({ colMap, costSource }: {
  colMap: Record<string, string | null>;
  costSource: string;
}) {
  const hasCost = costSource !== 'default (35%)';

  const fields = [
    { label: 'Item', key: 'item', required: true },
    { label: 'Harga', key: 'price', required: true },
    { label: 'Kuantiti', key: 'quantity', required: true },
    { label: 'Tarikh', key: 'date', required: true },
    { label: 'Channel', key: 'channel', required: false },
    { label: 'Kos %', key: '_cost', required: false, override: hasCost ? costSource : null, fallback: 'anggaran 35%' },
    { label: 'Komisyen', key: 'delivery_com', required: false },
    { label: 'Refund', key: 'is_refunded', required: false },
  ];

  return (
    <div className="card-sage py-3 px-4">
      <p className="text-[11px] uppercase tracking-wide font-semibold text-kira-muted mb-2.5">
        Kolom yang dikesan dari fail
      </p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
        {fields.map(({ label, key, required, override, fallback }) => {
          const col = override !== undefined ? override : colMap[key];
          const found = !!col;
          return (
            <div key={key} className="flex items-start gap-1.5 text-xs">
              {found
                ? <CheckCircle size={12} className="text-kira-teal mt-0.5 shrink-0" />
                : <span className={`w-3 h-3 rounded-full border mt-0.5 shrink-0 ${required ? 'border-kira-red bg-kira-red/20' : 'border-kira-muted/40'}`} />
              }
              <div className="min-w-0">
                <span className="text-kira-muted">{label}: </span>
                <span className={`font-medium ${found ? 'text-kira-dark' : required ? 'text-kira-red' : 'text-kira-muted/60'}`}>
                  {col ?? (fallback ?? '—')}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function UploadCsv() {
  const router = useRouter();
  const t = useT();
  const [result, setResult] = useState<MappedResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);

  async function handleFile(file: File) {
    setError(null);
    setResult(null);
    setProcessing(true);
    try {
      const mapped = await processFile(file);
      if (mapped.rows.length === 0) {
        setError(t('upload.csvError'));
      } else {
        setResult(mapped);
      }
    } catch (e) {
      setError((e as Error).message || t('common.error'));
    } finally {
      setProcessing(false);
    }
  }

  async function loadSample() {
    setError(null);
    setResult(null);
    setProcessing(true);
    try {
      const res = await fetch('/sample-warung.csv');
      const text = await res.text();
      const mapped = await new Promise<MappedResult>((resolve, reject) => {
        Papa.parse<Record<string, unknown>>(text, {
          header: true,
          skipEmptyLines: true,
          dynamicTyping: true,
          complete: (r) => resolve(buildRows(r.meta.fields ?? [], r.data, 'sample-warung.csv')),
          error: (e: { message: string }) => reject(new Error(e.message)),
        });
      });
      setResult(mapped);
    } catch (e) {
      setError((e as Error).message || t('common.error'));
    } finally {
      setProcessing(false);
    }
  }

  async function submit() {
    if (!result) return;
    setUploading(true);
    const res = await fetch('/api/upload/csv', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ rows: result.rows }),
    });
    const j = await res.json();
    setUploading(false);
    if (!j.ok) {
      setError(j.error || t('common.error'));
      return;
    }
    router.push(`/processing?reportId=${j.reportId}`);
  }

  return (
    <main className="min-h-screen flex flex-col">
      <AppHeader title={t('upload.csvTitle')} backHref="/onboarding" />
      <div className="flex-1 px-5 pt-6 pb-16 max-w-2xl mx-auto w-full">

        {/* Processing spinner */}
        {processing && (
          <div className="card text-center py-12 text-kira-muted">
            <div className="flex items-center justify-center gap-1.5 mb-3">
              <span className="w-2 h-2 rounded-full bg-kira-teal animate-pulse" />
              <span className="w-2 h-2 rounded-full bg-kira-teal animate-pulse [animation-delay:0.2s]" />
              <span className="w-2 h-2 rounded-full bg-kira-teal animate-pulse [animation-delay:0.4s]" />
            </div>
            Membaca dan mengesan kolom...
          </div>
        )}

        {/* File picker */}
        {!result && !processing && (
          <div className="space-y-4">
            <label className="card-sage block text-center cursor-pointer hover:bg-kira-sage/80 transition-colors">
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                className="hidden"
              />
              <div className="text-4xl mb-3">📄</div>
              <div className="font-semibold mb-1">{t('upload.csvPicker')}</div>
              <div className="text-sm text-kira-muted">CSV, XLSX, atau XLS — kami kesan kolom secara automatik</div>
            </label>

            <button
              onClick={loadSample}
              className="w-full flex items-center justify-center gap-2 border-2 border-kira-teal text-kira-teal font-semibold rounded-btn px-4 py-3 hover:bg-kira-teal hover:text-white transition-colors"
            >
              <span>✨</span>
              <span>{t('upload.csvUseSample')}</span>
              <span className="ml-auto text-sm opacity-70">→</span>
            </button>

            <p className="text-xs text-kira-muted text-center leading-relaxed">
              Kami sokong export dari StoreHub, Slurp, Qashier, dan mana-mana POS lain.{'\n'}
              Tak perlu format semula — kami kesan lajur yang perlu secara automatik.
            </p>
          </div>
        )}

        {/* Preview + mapping panel */}
        {result && !processing && (
          <div className="space-y-4">
            {/* File info */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs text-kira-muted">{t('upload.csvFileLabel')}</div>
                <div className="font-medium break-all">{result.filename}</div>
                <div className="text-xs text-kira-muted mt-0.5 space-x-2">
                  <span>{result.rows.length.toLocaleString()} baris sah</span>
                  {result.refundedCount > 0 && <span>· {result.refundedCount} refund ditapis</span>}
                  {result.invalidCount > 0 && <span>· {result.invalidCount} baris tak lengkap dilangkau</span>}
                </div>
              </div>
              <button
                onClick={() => { setResult(null); setError(null); }}
                className="text-sm text-kira-muted underline shrink-0"
              >
                {t('upload.csvChangeFile')}
              </button>
            </div>

            {/* Column mapping */}
            <ColMappingPanel colMap={result.colMap} costSource={result.costSource} />

            {/* Data preview */}
            <div className="card overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-kira-muted">
                    <th className="px-2 py-2">{t('upload.csvPreviewItem')}</th>
                    <th className="px-2 py-2 text-right">{t('upload.csvPreviewPrice')}</th>
                    <th className="px-2 py-2 text-right">{t('upload.csvPreviewQty')}</th>
                    <th className="px-2 py-2">{t('upload.csvPreviewDate')}</th>
                    <th className="px-2 py-2">Channel</th>
                  </tr>
                </thead>
                <tbody>
                  {result.rows.slice(0, 8).map((r, i) => (
                    <tr key={i} className="border-t border-kira-sage/40">
                      <td className="px-2 py-2 max-w-[140px] truncate">{r.item}</td>
                      <td className="px-2 py-2 text-right tabular-nums">RM{r.price.toFixed(2)}</td>
                      <td className="px-2 py-2 text-right tabular-nums">{r.quantity}</td>
                      <td className="px-2 py-2 text-kira-muted">{r.date}</td>
                      <td className="px-2 py-2 text-kira-muted">{r.channel}</td>
                    </tr>
                  ))}
                  {result.rows.length > 8 && (
                    <tr>
                      <td colSpan={5} className="px-2 py-2 text-center text-kira-muted">
                        {t('upload.csvMoreRows', { n: result.rows.length - 8 })}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <button onClick={submit} disabled={uploading} className="btn-primary w-full">
              {uploading ? t('upload.csvSubmitting') : t('upload.csvSubmit')}
            </button>
          </div>
        )}

        {error && <p className="mt-4 text-sm text-red-500 text-center">{error}</p>}
      </div>
    </main>
  );
}
