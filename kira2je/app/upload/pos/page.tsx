'use client';

import { useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { Upload, CheckCircle } from 'lucide-react';
import { useT } from '@/lib/i18n/client';
import { AppHeader } from '@/components/AppHeader';

const CURRENT_MONTH = '2026-04';
const MONTH_LABEL = 'April 2026';
const SIMULATED_ROWS = 348;

type PosType = 'storehub' | 'loyverse' | 'custom';

type FilePreview = {
  name: string;
  base64: string;
  mimeType: string;
  /** Simulated row count for demo */
  rowCount: number;
};

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      resolve(dataUrl.split(',')[1] ?? '');
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function simulateRowCount(): number {
  // Vary slightly around SIMULATED_ROWS for realism
  return SIMULATED_ROWS + Math.floor(Math.random() * 20) - 10;
}

export default function PosUploadPage() {
  const t = useT();

  const [posType, setPosType] = useState<PosType>('storehub');
  const [filePreview, setFilePreview] = useState<FilePreview | null>(null);
  const [dragging, setDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [importedRows, setImportedRows] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setError(null);
    const base64 = await fileToBase64(file);
    setFilePreview({
      name: file.name,
      base64,
      mimeType: file.type || 'application/octet-stream',
      rowCount: simulateRowCount(),
    });
  }

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) await handleFile(file);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
  }, []);

  async function handleSubmit() {
    if (!filePreview) return;
    setSubmitting(true);
    setError(null);

    // MOCK: simulate 1.5s processing delay, no real API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    setImportedRows(filePreview.rowCount);
    setSuccess(true);
    setSubmitting(false);
  }

  const posTypes: { key: PosType; label: string }[] = [
    { key: 'storehub', label: t('pos.storehub') },
    { key: 'loyverse', label: t('pos.loyverse') },
    { key: 'custom', label: t('pos.custom') },
  ];

  if (success) {
    return (
      <main className="min-h-screen flex flex-col">
        <AppHeader title={t('pos.title')} backHref="/dashboard" />
        <div className="flex-1 flex flex-col items-center justify-center px-5 pb-16 gap-6">
          <div className="card w-full max-w-md text-center py-10 space-y-4">
            <CheckCircle size={48} className="text-accent-secondary mx-auto" />
            <p className="text-ink-primary font-medium text-lg">
              {t('pos.success', { n: importedRows, month: MONTH_LABEL })}
            </p>
            <Link href="/mapping" className="btn-primary inline-block mt-2">
              Review ingredient mapping
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col">
      <AppHeader title={t('pos.title')} backHref="/dashboard" />

      <div className="flex-1 px-5 pt-6 pb-20 max-w-2xl mx-auto w-full space-y-5">

        {/* Month indicator */}
        <div className="card-muted flex items-center gap-3 py-3 px-4">
          <div className="w-2 h-2 rounded-full bg-accent-primary shrink-0" />
          <p className="text-sm text-ink-primary">
            Uploading for{' '}
            <span className="font-semibold">{MONTH_LABEL}</span>
          </p>
        </div>

        {/* Description */}
        <p className="text-sm text-ink-secondary">
          {t('pos.desc', { month: MONTH_LABEL })}
        </p>

        {/* POS type tabs */}
        <div className="flex gap-2 bg-paper-100 p-1 rounded-btn">
          {posTypes.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setPosType(key)}
              className={`flex-1 py-2.5 text-sm font-medium rounded-[6px] transition-colors ${
                posType === key
                  ? 'bg-paper-50 text-ink-primary border border-paper-200'
                  : 'text-ink-secondary hover:text-ink-primary'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Drop zone */}
        {!filePreview ? (
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
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
            <Upload size={36} className={dragging ? 'text-accent-primary' : 'text-ink-secondary'} />
            <div className="text-center">
              <p className="font-medium text-ink-primary">{t('pos.dropzone')}</p>
              <p className="text-xs text-ink-secondary mt-1">XLSX, XLS, CSV</p>
            </div>
          </div>
        ) : (
          /* File selected preview */
          <div className="card space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-btn bg-paper-100 flex items-center justify-center shrink-0">
                  <Upload size={16} className="text-ink-secondary" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-ink-primary truncate">{filePreview.name}</p>
                  <p className="text-xs text-ink-secondary mt-0.5">
                    ~{filePreview.rowCount.toLocaleString()} rows detected
                  </p>
                </div>
              </div>
              <button
                onClick={() => { setFilePreview(null); setError(null); }}
                className="text-sm text-ink-secondary hover:underline shrink-0"
              >
                Change
              </button>
            </div>

            {/* Format hint */}
            <div className="bg-paper-100 rounded-btn px-4 py-3 text-xs text-ink-secondary space-y-1">
              <p className="font-medium text-ink-primary">
                {posType === 'storehub' && 'StoreHub format detected'}
                {posType === 'loyverse' && 'Loyverse format detected'}
                {posType === 'custom' && 'Custom format — columns will be auto-detected'}
              </p>
              <p>Columns: item name, price, quantity, date</p>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <p className="text-sm text-danger text-center">{error}</p>
        )}
      </div>

      {/* Sticky submit */}
      <div className="fixed bottom-0 left-0 right-0 bg-paper-50 border-t border-paper-200 px-5 py-4">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={handleSubmit}
            disabled={!filePreview || submitting}
            className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-2 h-2 rounded-full bg-white/70 animate-pulse" />
                <span className="w-2 h-2 rounded-full bg-white/70 animate-pulse [animation-delay:0.15s]" />
                <span className="w-2 h-2 rounded-full bg-white/70 animate-pulse [animation-delay:0.3s]" />
                <span>{t('pos.submitting')}</span>
              </span>
            ) : (
              t('pos.submit')
            )}
          </button>
        </div>
      </div>
    </main>
  );
}
