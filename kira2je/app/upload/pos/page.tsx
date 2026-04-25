'use client';

import { useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  Upload,
  CheckCircle,
  AlertTriangle,
  Info,
  Loader2,
  X,
  ChevronRight,
} from 'lucide-react';
import { useT } from '@/lib/i18n/client';
import { AppHeader } from '@/components/AppHeader';
import type { PosColumnMapping } from '@/lib/schemas';

const CURRENT_MONTH = '2026-04';
const MONTH_LABEL = 'April 2026';

// ─── Constants ────────────────────────────────────────────────────────────────

const MONTH_NAMES: Record<string, string> = {
  '01': 'Jan', '02': 'Feb', '03': 'Mar', '04': 'Apr',
  '05': 'May', '06': 'Jun', '07': 'Jul', '08': 'Aug',
  '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dec',
};

function formatMonth(ym: string): string {
  const [year, month] = ym.split('-');
  return `${MONTH_NAMES[month] ?? month} ${year}`;
}

// ─── Stage machine ────────────────────────────────────────────────────────────

type Stage =
  | { kind: 'idle' }
  | { kind: 'reading'; fileName: string }
  | { kind: 'detecting'; fileName: string; base64: string }
  | {
      kind: 'confirming';
      fileName: string;
      base64: string;
      headers: string[];
      mapping: PosColumnMapping;
      previewRows: Record<string, unknown>[];
      totalRows: number;
      detectedMonths: string[];
      llmError: string | null;
    }
  | { kind: 'importing' }
  | { kind: 'done'; rowCount: number; savedMonths: string[] };

// ─── Step indicator ───────────────────────────────────────────────────────────

const STEPS = ['Read file', 'Detect columns', 'Confirm', 'Import'] as const;

function stageToStep(stage: Stage): number {
  switch (stage.kind) {
    case 'idle':      return 0;
    case 'reading':   return 0;
    case 'detecting': return 1;
    case 'confirming': return 2;
    case 'importing': return 3;
    case 'done':      return 4;
  }
}

function StepIndicator({ stage }: { stage: Stage }) {
  const current = stageToStep(stage);
  return (
    <div className="flex items-center gap-0 text-xs overflow-x-auto">
      {STEPS.map((label, idx) => {
        const done = idx < current;
        const active = idx === current;
        return (
          <div key={label} className="flex items-center">
            <div className="flex items-center gap-1.5 px-1">
              <span
                className={[
                  'w-2 h-2 rounded-full shrink-0',
                  done   ? 'bg-accent-secondary'           : '',
                  active ? 'bg-accent-primary animate-pulse' : '',
                  !done && !active ? 'bg-paper-200 border border-paper-200' : '',
                ].join(' ')}
              />
              <span
                className={[
                  'whitespace-nowrap',
                  done   ? 'text-accent-secondary font-medium' : '',
                  active ? 'text-accent-primary font-semibold' : '',
                  !done && !active ? 'text-ink-secondary' : '',
                ].join(' ')}
              >
                {label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div className={`h-px w-6 shrink-0 mx-0.5 ${idx < current ? 'bg-accent-secondary' : 'bg-paper-200'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1] ?? '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function WarningCard({ text, isError }: { text: string; isError?: boolean }) {
  return (
    <div className={`flex gap-3 px-4 py-3 rounded-btn border text-sm leading-relaxed ${
      isError
        ? 'bg-red-50 border-red-200 text-red-800'
        : 'bg-amber-50 border-amber-200 text-amber-800'
    }`}>
      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
      <p>{text}</p>
    </div>
  );
}

function MonthsDetectedCard({ months }: { months: string[] }) {
  if (months.length === 0) return null;
  const label = months.length === 1
    ? formatMonth(months[0])
    : `${formatMonth(months[0])} – ${formatMonth(months[months.length - 1])}`;
  return (
    <div className="flex gap-3 px-4 py-3 rounded-btn border border-blue-200 bg-blue-50 text-blue-800 text-sm leading-relaxed">
      <Info className="w-4 h-4 shrink-0 mt-0.5" />
      <div>
        <p className="font-medium">
          {months.length} month{months.length > 1 ? 's' : ''} of data detected — {label}
        </p>
        <p className="text-xs mt-0.5 opacity-80">
          Each month will be imported separately so your historical reports stay accurate.
        </p>
      </div>
    </div>
  );
}

function PreviewTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: Record<string, unknown>[];
}) {
  if (!headers.length || !rows.length) return null;
  return (
    <div className="overflow-x-auto rounded-btn border border-paper-200">
      <table className="text-xs w-full">
        <thead>
          <tr className="bg-paper-100">
            {headers.map((h) => (
              <th key={h} className="px-3 py-2 text-left font-semibold text-ink-secondary whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t border-paper-100 hover:bg-paper-50">
              {headers.map((h) => (
                <td key={h} className="px-3 py-2 text-ink-primary whitespace-nowrap max-w-[180px] truncate">
                  {String(row[h] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Column picker field definitions ─────────────────────────────────────────

type MappingKey = keyof Omit<PosColumnMapping, 'isAggregated' | 'confidence'>;

const MAPPING_FIELDS: { label: string; key: MappingKey }[] = [
  { label: 'Item / Product Name', key: 'itemNameCol' },
  { label: 'Quantity',            key: 'quantityCol' },
  { label: 'Unit Price',          key: 'unitPriceCol' },
  { label: 'Date',                key: 'dateCol' },
  { label: 'Category',            key: 'categoryCol' },
  { label: 'Channel / Order type', key: 'channelCol' },
  { label: 'Refund flag',         key: 'isRefundedCol' },
];

function ColumnPicker({
  headers,
  mapping,
  onChange,
}: {
  headers: string[];
  mapping: PosColumnMapping;
  onChange: (m: PosColumnMapping) => void;
}) {
  const options = ['(none)', ...headers];

  function setCol(key: MappingKey, value: string) {
    onChange({ ...mapping, [key]: value === '(none)' ? null : value });
  }

  return (
    <div className="card space-y-3">
      <p className="section-label">Column mapping</p>
      <div className="space-y-2">
        {MAPPING_FIELDS.map(({ label, key }) => (
          <div key={key} className="flex items-center gap-3">
            <span className="text-sm text-ink-secondary w-44 shrink-0">{label}</span>
            <select
              className="input flex-1 text-sm py-1.5"
              value={(mapping[key] as string | null) ?? '(none)'}
              onChange={(e) => setCol(key, e.target.value)}
            >
              {options.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {/* isAggregated toggle */}
      <label className="flex items-start gap-3 pt-1 cursor-pointer select-none">
        <input
          type="checkbox"
          className="mt-0.5 accent-accent-primary"
          checked={mapping.isAggregated}
          onChange={(e) => onChange({ ...mapping, isAggregated: e.target.checked })}
        />
        <span className="text-sm text-ink-secondary leading-snug">
          Each row is already a period total (not individual transactions)
        </span>
      </label>

      {mapping.confidence !== 'high' && (
        <div className="flex gap-2 px-3 py-2 rounded-btn bg-amber-50 border border-amber-200 text-amber-800 text-xs">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>
            AI detected columns with{' '}
            <span className="font-semibold">{mapping.confidence}</span>{' '}
            confidence — check that the selections below look right.
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Mapped preview columns ───────────────────────────────────────────────────

function MappedPreview({
  mapping,
  rows,
}: {
  mapping: PosColumnMapping;
  rows: Record<string, unknown>[];
}) {
  const cols = [
    mapping.itemNameCol,
    mapping.quantityCol,
    mapping.unitPriceCol,
    mapping.dateCol,
  ].filter((c): c is string => !!c);

  if (cols.length === 0 || rows.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-ink-secondary uppercase tracking-wide">
        Preview — first {rows.length} rows
      </p>
      <PreviewTable headers={cols} rows={rows} />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PosUploadPage() {
  const t = useT();
  const [stage, setStage] = useState<Stage>({ kind: 'idle' });
  const [dragging, setDragging] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Local copy of mapping that the user can edit in the confirming stage
  const [editMapping, setEditMapping] = useState<PosColumnMapping | null>(null);

  async function handleFile(file: File) {
    setApiError(null);
    setEditMapping(null);
    setStage({ kind: 'reading', fileName: file.name });

    let base64: string;
    try {
      base64 = await fileToBase64(file);
    } catch {
      setApiError('Could not read file.');
      setStage({ kind: 'idle' });
      return;
    }

    setStage({ kind: 'detecting', fileName: file.name, base64 });

    try {
      const res = await fetch('/api/upload/pos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, base64, dryRun: true }),
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        setApiError(data.error ?? 'Could not analyse file.');
        setStage({ kind: 'idle' });
        return;
      }

      const mapping = data.mapping as PosColumnMapping;
      setEditMapping(mapping);
      setStage({
        kind: 'confirming',
        fileName: file.name,
        base64,
        headers: data.headers as string[],
        mapping,
        previewRows: data.previewRows as Record<string, unknown>[],
        totalRows: data.totalRows as number,
        detectedMonths: (data.detectedMonths as string[]) ?? [],
        llmError: (data.llmError as string | null) ?? null,
      });
    } catch {
      setApiError('Network error. Please try again.');
      setStage({ kind: 'idle' });
    }
  }

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) await handleFile(file);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setDragging(true); }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); setDragging(false); }, []);

  async function handleImport() {
    if (stage.kind !== 'confirming') return;
    const { fileName, base64, totalRows, detectedMonths } = stage;
    const confirmedMapping = editMapping ?? stage.mapping;

    setStage({ kind: 'importing' });
    setApiError(null);

    try {
      const res = await fetch('/api/upload/pos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName,
          base64,
          month: CURRENT_MONTH,
          dryRun: false,
          confirmedMapping,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        setApiError(data.error ?? 'Import failed. Please try again.');
        // Restore confirming stage
        setStage({
          kind: 'confirming',
          fileName,
          base64,
          headers: stage.headers,
          mapping: stage.mapping,
          previewRows: stage.previewRows,
          totalRows,
          detectedMonths,
          llmError: stage.llmError,
        });
        return;
      }

      setStage({ kind: 'done', rowCount: data.rowCount, savedMonths: data.savedMonths ?? [] });
    } catch {
      setApiError('Network error. Please try again.');
      setStage({
        kind: 'confirming',
        fileName,
        base64,
        headers: stage.headers,
        mapping: stage.mapping,
        previewRows: stage.previewRows,
        totalRows,
        detectedMonths,
        llmError: stage.llmError,
      });
    }
  }

  // ── Success screen ──────────────────────────────────────────────────────────
  if (stage.kind === 'done') {
    return (
      <main className="min-h-screen flex flex-col">
        <AppHeader title={t('pos.title')} backHref="/dashboard" />
        <div className="flex-1 flex flex-col items-center justify-center px-5 pb-16 gap-6">
          <div className="card w-full max-w-md text-center py-10 space-y-4">
            <CheckCircle size={48} className="text-accent-secondary mx-auto" />
            <p className="text-ink-primary font-medium text-lg">
              {stage.rowCount.toLocaleString()} rows imported
            </p>
            {stage.savedMonths.length > 1 ? (
              <p className="text-sm text-ink-secondary">
                {stage.savedMonths.length} months: {stage.savedMonths.map(formatMonth).join(', ')}
              </p>
            ) : (
              <p className="text-sm text-ink-secondary">
                {stage.savedMonths.length === 1 ? formatMonth(stage.savedMonths[0]) : MONTH_LABEL}
              </p>
            )}
            <Link href="/mapping" className="btn-primary inline-block mt-2">
              Review ingredient mapping
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const isDetecting = stage.kind === 'detecting' || stage.kind === 'reading';
  const isImporting = stage.kind === 'importing';
  const busy = isDetecting || isImporting;
  const confirming = stage.kind === 'confirming' ? stage : null;
  const activeMapping = editMapping ?? confirming?.mapping ?? null;

  return (
    <main className="min-h-screen flex flex-col">
      <AppHeader title={t('pos.title')} backHref="/dashboard" />

      <div className="flex-1 px-5 pt-6 pb-28 max-w-2xl mx-auto w-full space-y-4">

        {/* Step indicator */}
        <StepIndicator stage={stage} />

        {/* Month indicator */}
        <div className="card-muted flex items-center gap-3 py-3 px-4">
          <div className="w-2 h-2 rounded-full bg-accent-primary shrink-0" />
          <p className="text-sm text-ink-primary">
            Uploading for <span className="font-semibold">{MONTH_LABEL}</span>
          </p>
        </div>

        {/* Drop zone — idle state */}
        {stage.kind === 'idle' && (
          <>
            <p className="text-sm text-ink-secondary">
              {t('pos.desc', { month: MONTH_LABEL })}
            </p>
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`card flex flex-col items-center justify-center gap-3 cursor-pointer min-h-[180px] transition-colors ${
                dragging ? 'bg-accent-primary/5 border-accent-primary' : 'hover:bg-paper-100'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              />
              <Upload size={36} className={dragging ? 'text-accent-primary' : 'text-ink-secondary'} />
              <div className="text-center">
                <p className="font-medium text-ink-primary">{t('pos.dropzone')}</p>
                <p className="text-xs text-ink-secondary mt-1">XLSX, XLS, CSV — AI detects columns automatically</p>
              </div>
            </div>

            <div className="flex gap-3 px-4 py-3 rounded-btn border border-paper-200 bg-paper-50 text-xs text-ink-secondary">
              <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <p>
                Upload any spreadsheet export from your POS — Square, Loyverse, StoreHub, or any custom format.
                AI will detect the columns automatically and let you confirm before importing.
              </p>
            </div>
          </>
        )}

        {/* Reading / detecting spinner */}
        {(stage.kind === 'reading' || stage.kind === 'detecting') && (
          <div className="card flex items-center gap-4 py-6 px-5">
            <Loader2 className="w-6 h-6 animate-spin text-accent-primary shrink-0" />
            <div>
              <p className="font-medium text-ink-primary">
                {stage.kind === 'reading' ? 'Reading file…' : 'Detecting columns…'}
              </p>
              <p className="text-xs text-ink-secondary mt-0.5">{stage.fileName}</p>
            </div>
          </div>
        )}

        {/* Importing spinner */}
        {stage.kind === 'importing' && (
          <div className="card flex items-center gap-4 py-6 px-5">
            <Loader2 className="w-6 h-6 animate-spin text-accent-primary shrink-0" />
            <div>
              <p className="font-medium text-ink-primary">Importing…</p>
              <p className="text-xs text-ink-secondary mt-0.5">Saving rows to your account</p>
            </div>
          </div>
        )}

        {/* Confirming stage */}
        {confirming && activeMapping && (
          <>
            {/* File row */}
            <div className="card flex items-center gap-3 py-3 px-4">
              <div className="w-9 h-9 rounded-btn bg-paper-100 flex items-center justify-center shrink-0">
                <Upload size={15} className="text-ink-secondary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-ink-primary truncate">{confirming.fileName}</p>
                <p className="text-xs text-ink-secondary mt-0.5">{confirming.totalRows.toLocaleString()} rows</p>
              </div>
              <button
                onClick={() => {
                  setStage({ kind: 'idle' });
                  setApiError(null);
                  setEditMapping(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="text-ink-secondary hover:text-ink-primary transition-colors shrink-0"
                aria-label="Remove file"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* LLM error banner */}
            {confirming.llmError && (
              <div className="flex gap-3 px-4 py-3 rounded-btn border border-paper-200 bg-paper-50 text-ink-secondary text-sm leading-relaxed">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <p>{confirming.llmError}</p>
              </div>
            )}

            {/* Multi-month detection */}
            {confirming.detectedMonths.length > 0 && (
              <MonthsDetectedCard months={confirming.detectedMonths} />
            )}

            {/* Column picker */}
            <ColumnPicker
              headers={confirming.headers}
              mapping={activeMapping}
              onChange={(m) => setEditMapping(m)}
            />

            {/* Mapped preview table */}
            <MappedPreview mapping={activeMapping} rows={confirming.previewRows} />

            {/* Re-upload link */}
            <div className="flex items-center gap-2 text-xs text-ink-secondary">
              <ChevronRight className="w-3.5 h-3.5" />
              <button
                className="underline hover:text-ink-primary transition-colors"
                onClick={() => {
                  setStage({ kind: 'idle' });
                  setEditMapping(null);
                  setApiError(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
              >
                Choose a different file
              </button>
            </div>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
          </>
        )}

        {/* API error */}
        {apiError && <WarningCard text={apiError} isError />}
      </div>

      {/* Sticky footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-paper-50 border-t border-paper-200 px-5 py-4 z-10">
        <div className="max-w-2xl mx-auto">
          {stage.kind === 'idle' ? (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="btn-primary w-full"
            >
              Choose file
            </button>
          ) : confirming && activeMapping ? (
            <button
              onClick={handleImport}
              disabled={busy}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {confirming.detectedMonths.length > 1
                ? `Import ${confirming.totalRows.toLocaleString()} rows · ${confirming.detectedMonths.length} months`
                : `Import ${confirming.totalRows.toLocaleString()} rows`}
            </button>
          ) : isImporting ? (
            <button disabled className="btn-primary w-full opacity-50 cursor-not-allowed">
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Importing…
              </span>
            </button>
          ) : null}
        </div>
      </div>
    </main>
  );
}
