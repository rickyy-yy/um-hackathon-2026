'use client';

import { useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  Upload,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Info,
  Loader2,
  X,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { useT } from '@/lib/i18n/client';
import { AppHeader } from '@/components/AppHeader';
import type { PosSystem } from '@/lib/pos-parser';

const CURRENT_MONTH = '2026-04';
const MONTH_LABEL = 'April 2026';

// ─── Types ────────────────────────────────────────────────────────────────────

type ParsePreview = {
  system: PosSystem;
  systemLabel: string;
  usable: boolean;
  warnings: string[];
  isAggregated: boolean;
  previewHeaders: string[];
  previewRows: Record<string, unknown>[];
  rowCount: number;
  aiDetected?: boolean;
  detectedMonths?: string[];
};

type Stage =
  | { kind: 'idle' }
  | { kind: 'detecting'; fileName: string }
  | { kind: 'preview'; fileName: string; base64: string; preview: ParsePreview }
  | { kind: 'importing' }
  | { kind: 'done'; rowCount: number; systemLabel: string; savedMonths: string[] };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1] ?? '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

const SYSTEM_COLORS: Partial<Record<PosSystem, string>> = {
  'storehub-best-sellers': 'bg-blue-50 text-blue-700 border-blue-200',
  'storehub-daily':        'bg-blue-50 text-blue-700 border-blue-200',
  'square-items':          'bg-violet-50 text-violet-700 border-violet-200',
  'square-summary':        'bg-violet-50 text-violet-700 border-violet-200',
  'square-transactions':   'bg-violet-50 text-violet-700 border-violet-200',
  'loyverse-items':        'bg-emerald-50 text-emerald-700 border-emerald-200',
  'loyverse-receipts':     'bg-emerald-50 text-emerald-700 border-emerald-200',
  'loyverse-summary':      'bg-emerald-50 text-emerald-700 border-emerald-200',
  'custom-itemized':       'bg-amber-50 text-amber-700 border-amber-200',
  'unknown':               'bg-paper-100 text-ink-secondary border-paper-200',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function SystemBadge({
  system,
  label,
  usable,
  aiDetected,
}: {
  system: PosSystem;
  label: string;
  usable: boolean;
  aiDetected?: boolean;
}) {
  const color = SYSTEM_COLORS[system] ?? 'bg-paper-100 text-ink-secondary border-paper-200';
  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold ${color}`}>
      {aiDetected ? (
        <Sparkles className="w-3.5 h-3.5" />
      ) : usable ? (
        <CheckCircle className="w-3.5 h-3.5" />
      ) : (
        <AlertCircle className="w-3.5 h-3.5" />
      )}
      {label}
      {aiDetected && <span className="font-normal opacity-75">· AI detected</span>}
    </div>
  );
}

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

const MONTH_NAMES: Record<string, string> = {
  '01': 'Jan', '02': 'Feb', '03': 'Mar', '04': 'Apr',
  '05': 'May', '06': 'Jun', '07': 'Jul', '08': 'Aug',
  '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dec',
};

function formatMonth(ym: string): string {
  const [year, month] = ym.split('-');
  return `${MONTH_NAMES[month] ?? month} ${year}`;
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

function StoreHubGuidanceCard() {
  return (
    <div className="flex gap-3 px-4 py-3 rounded-btn border border-blue-200 bg-blue-50 text-blue-800 text-sm leading-relaxed">
      <Info className="w-4 h-4 shrink-0 mt-0.5" />
      <div className="space-y-1">
        <p className="font-medium">StoreHub export tip</p>
        <p>
          In BackOffice, go to <strong>Reports › Best Selling Products</strong> and set the
          date range to <strong>{MONTH_LABEL}</strong> before exporting. The file does not
          include dates per row, so the filter must match your target month.
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PosUploadPage() {
  const t = useT();
  const [stage, setStage] = useState<Stage>({ kind: 'idle' });
  const [dragging, setDragging] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setApiError(null);
    const base64 = await fileToBase64(file);
    setStage({ kind: 'detecting', fileName: file.name });

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

      setStage({
        kind: 'preview',
        fileName: file.name,
        base64,
        preview: data as ParsePreview,
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
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setDragging(true); }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); setDragging(false); }, []);

  async function handleImport() {
    if (stage.kind !== 'preview') return;
    const { fileName, base64, preview } = stage;
    if (!preview.usable) return;

    setStage({ kind: 'importing' });
    setApiError(null);

    try {
      const res = await fetch('/api/upload/pos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName, base64, month: CURRENT_MONTH, dryRun: false }),
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        setApiError(data.error ?? 'Import failed. Please try again.');
        setStage({ kind: 'preview', fileName, base64, preview });
        return;
      }

      setStage({ kind: 'done', rowCount: data.rowCount, systemLabel: data.systemLabel, savedMonths: data.savedMonths ?? [] });
    } catch {
      setApiError('Network error. Please try again.');
      setStage({ kind: 'preview', fileName, base64, preview });
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
            <p className="text-xs text-ink-secondary">{stage.systemLabel}</p>
            <Link href="/mapping" className="btn-primary inline-block mt-2">
              Review ingredient mapping
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const isDetecting = stage.kind === 'detecting';
  const isImporting = stage.kind === 'importing';
  const busy = isDetecting || isImporting;
  const preview = stage.kind === 'preview' ? stage.preview : null;
  const isStoreHub = preview?.system === 'storehub-best-sellers' || preview?.system === 'storehub-daily';

  return (
    <main className="min-h-screen flex flex-col">
      <AppHeader title={t('pos.title')} backHref="/dashboard" />

      <div className="flex-1 px-5 pt-6 pb-28 max-w-2xl mx-auto w-full space-y-4">

        {/* Month indicator */}
        <div className="card-muted flex items-center gap-3 py-3 px-4">
          <div className="w-2 h-2 rounded-full bg-accent-primary shrink-0" />
          <p className="text-sm text-ink-primary">
            Uploading for <span className="font-semibold">{MONTH_LABEL}</span>
          </p>
        </div>

        {/* Drop zone — hide once we have a preview */}
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
                <p className="text-xs text-ink-secondary mt-1">XLSX, XLS, CSV — auto-detected</p>
              </div>
            </div>

            {/* Supported formats hint */}
            <div className="flex gap-3 px-4 py-3 rounded-btn border border-paper-200 bg-paper-50 text-xs text-ink-secondary">
              <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <p>
                Supported: <strong>Square</strong> (Items CSV), <strong>Loyverse</strong> (Receipts by Item),{' '}
                <strong>StoreHub</strong> (Best Selling Products), or any spreadsheet — AI will detect the columns automatically.
              </p>
            </div>
          </>
        )}

        {/* Detecting spinner */}
        {isDetecting && (
          <div className="card flex items-center gap-4 py-6 px-5">
            <Loader2 className="w-6 h-6 animate-spin text-accent-primary shrink-0" />
            <div>
              <p className="font-medium text-ink-primary">Analysing file…</p>
              <p className="text-xs text-ink-secondary mt-0.5">{(stage as { fileName: string }).fileName}</p>
            </div>
          </div>
        )}

        {/* Preview state */}
        {preview && stage.kind === 'preview' && (
          <>
            {/* File row */}
            <div className="card flex items-center gap-3 py-3 px-4">
              <div className="w-9 h-9 rounded-btn bg-paper-100 flex items-center justify-center shrink-0">
                <Upload size={15} className="text-ink-secondary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-ink-primary truncate">{stage.fileName}</p>
                <p className="text-xs text-ink-secondary mt-0.5">{preview.rowCount.toLocaleString()} rows</p>
              </div>
              <button
                onClick={() => { setStage({ kind: 'idle' }); setApiError(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                className="text-ink-secondary hover:text-ink-primary transition-colors shrink-0"
                aria-label="Remove file"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* System badge */}
            <div className="flex items-center gap-3 flex-wrap">
              <SystemBadge
                system={preview.system}
                label={preview.systemLabel}
                usable={preview.usable}
                aiDetected={preview.aiDetected}
              />
              {preview.isAggregated && (
                <span className="text-xs text-ink-secondary">Period totals · no date per row</span>
              )}
            </div>

            {/* AI detected info banner */}
            {preview.aiDetected && preview.usable && (
              <div className="flex gap-3 px-4 py-3 rounded-btn border border-amber-200 bg-amber-50 text-amber-800 text-sm leading-relaxed">
                <Sparkles className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Custom format detected by AI</p>
                  <p className="text-xs mt-0.5 opacity-80">
                    Your file doesn&apos;t match a known POS export — AI mapped the columns automatically.
                    Check the preview below looks correct before importing.
                  </p>
                </div>
              </div>
            )}

            {/* Unknown + no AI mapping */}
            {preview.system === 'unknown' && !preview.aiDetected && !preview.usable && (
              <div className="flex gap-3 px-4 py-3 rounded-btn border border-paper-200 bg-paper-50 text-ink-secondary text-sm leading-relaxed">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-medium text-ink-primary">Format not recognised</p>
                  <p>
                    Try exporting from your POS as a CSV, or use the{' '}
                    <strong>Square Items</strong>, <strong>Loyverse Receipts by Item</strong>, or{' '}
                    <strong>StoreHub Best Selling Products</strong> report format.
                  </p>
                </div>
              </div>
            )}

            {/* Multi-month detection */}
            {(preview.detectedMonths?.length ?? 0) > 0 && (
              <MonthsDetectedCard months={preview.detectedMonths!} />
            )}

            {/* StoreHub guidance */}
            {isStoreHub && <StoreHubGuidanceCard />}

            {/* Warnings */}
            {preview.warnings.map((w, i) => (
              <WarningCard key={i} text={w} isError={!preview.usable && !preview.aiDetected} />
            ))}

            {/* Preview table */}
            {preview.usable && preview.previewHeaders.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-ink-secondary uppercase tracking-wide">
                  Preview — first {preview.previewRows.length} rows
                </p>
                <PreviewTable headers={preview.previewHeaders} rows={preview.previewRows} />
              </div>
            )}

            {/* Wrong report type: offer guidance to re-export */}
            {!preview.usable && preview.system !== 'unknown' && (
              <div className="card flex items-center gap-3 text-sm text-ink-primary py-3 px-4">
                <ChevronRight className="w-4 h-4 text-ink-secondary shrink-0" />
                <p>Select a different file or re-export from your POS system.</p>
              </div>
            )}
          </>
        )}

        {/* API error */}
        {apiError && <WarningCard text={apiError} isError />}

        {/* Hidden file input for re-upload from preview state */}
        {stage.kind === 'preview' && (
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
        )}
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
          ) : preview?.usable ? (
            <button
              onClick={handleImport}
              disabled={busy}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isImporting ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Importing…
                </span>
              ) : (preview.detectedMonths?.length ?? 0) > 1 ? (
                `Import ${preview.rowCount.toLocaleString()} rows · ${preview.detectedMonths!.length} months`
              ) : (
                `Import ${preview.rowCount.toLocaleString()} rows`
              )}
            </button>
          ) : preview && !preview.usable ? (
            <button
              onClick={() => { setStage({ kind: 'idle' }); setApiError(null); }}
              className="btn-secondary w-full"
            >
              Try a different file
            </button>
          ) : null}
        </div>
      </div>
    </main>
  );
}
