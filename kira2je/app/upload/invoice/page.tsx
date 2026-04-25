'use client';

import { useState, useRef, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Camera, Upload, MessageCircle, ChevronDown, ChevronUp, CheckCircle } from 'lucide-react';
import { useT } from '@/lib/i18n/client';
import { AppHeader } from '@/components/AppHeader';

function getCurrentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

type FileEntry = {
  name: string;
  base64: string;
  mimeType: string;
};

type Tab = 'camera' | 'upload' | 'whatsapp';

function fileToEntry(file: File): Promise<FileEntry> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      // Strip the "data:<mime>;base64," prefix
      const base64 = dataUrl.split(',')[1] ?? '';
      resolve({ name: file.name, base64, mimeType: file.type || 'application/octet-stream' });
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function InvoiceUploadPageInner() {
  const searchParams = useSearchParams();
  const month = searchParams.get('month') ?? getCurrentMonth();
  const t = useT();

  const [tab, setTab] = useState<Tab>('upload');
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [dragging, setDragging] = useState(false);
  const [tipsOpen, setTipsOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successCount, setSuccessCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const dropRef = useRef<HTMLLabelElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function addFiles(incoming: FileList | null) {
    if (!incoming || incoming.length === 0) return;
    const entries = await Promise.all(Array.from(incoming).map(fileToEntry));
    setFiles((prev) => {
      const existing = new Set(prev.map((f) => f.name));
      const deduped = entries.filter((e) => !existing.has(e.name));
      return [...prev, ...deduped];
    });
  }

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    await addFiles(e.dataTransfer.files);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
  }, []);

  function removeFile(name: string) {
    setFiles((prev) => prev.filter((f) => f.name !== name));
  }

  async function handleSubmit() {
    if (files.length === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/upload/invoice', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ files, month }),
      });
      const json = await res.json();
      if (!json.ok) {
        setError(json.error ?? t('common.error'));
      } else {
        setSuccessCount(json.count ?? files.length);
        setFiles([]);
      }
    } catch (e) {
      setError((e as Error).message ?? t('common.error'));
    } finally {
      setSubmitting(false);
    }
  }

  const plural = (n: number) => (n === 1 ? '' : 's');
  const submitLabel = submitting
    ? t('invoice.submitting')
    : t('invoice.submit', { n: files.length, s: plural(files.length) });

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'camera', label: t('invoice.cameraTab'), icon: <Camera size={16} /> },
    { key: 'upload', label: t('invoice.uploadTab'), icon: <Upload size={16} /> },
    { key: 'whatsapp', label: t('invoice.waTab'), icon: <MessageCircle size={16} /> },
  ];

  if (successCount !== null) {
    return (
      <main className="min-h-screen flex flex-col">
        <AppHeader title={t('invoice.title')} backHref="/dashboard" />
        <div className="flex-1 flex flex-col items-center justify-center px-5 pb-16 gap-6">
          <div className="card w-full max-w-md text-center py-10 space-y-4">
            <CheckCircle size={48} className="text-accent-secondary mx-auto" />
            <p className="text-ink-primary font-medium text-lg">
              {t('invoice.success', { n: successCount, s: plural(successCount) })}
            </p>
            <div className="flex flex-col gap-2 w-full mt-2">
              <Link href={`/invoices?month=${month}`} className="btn-primary w-full text-center">
                Confirm invoices
              </Link>
              <Link href={`/report/generate?month=${month}`} className="btn-secondary w-full text-center text-sm">
                Skip to generate report
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col">
      <AppHeader title={t('invoice.title')} backHref="/dashboard" />

      <div className="flex-1 px-5 pt-6 pb-20 max-w-2xl mx-auto w-full space-y-5">

        {/* Tab switcher */}
        <div className="flex gap-2 bg-paper-100 p-1 rounded-btn">
          {tabs.map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium rounded-[6px] transition-colors ${
                tab === key
                  ? 'bg-paper-50 text-ink-primary border border-paper-200'
                  : 'text-ink-secondary hover:text-ink-primary'
              }`}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>

        {/* Camera tab */}
        {tab === 'camera' && (
          <div className="space-y-4">
            <label className="card flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-paper-100 transition-colors min-h-[200px]">
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => addFiles(e.target.files)}
              />
              <Camera size={40} className="text-accent-primary" />
              <span className="text-ink-primary font-medium">Take a photo of your invoice</span>
              <span className="text-xs text-ink-secondary">Opens your camera directly</span>
            </label>
          </div>
        )}

        {/* Upload tab */}
        {tab === 'upload' && (
          <div className="space-y-4">
            {/* Drop zone */}
            <label
              ref={dropRef}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`card flex flex-col items-center justify-center gap-3 cursor-pointer min-h-[180px] transition-colors ${
                dragging ? 'bg-accent-primary/5 border-accent-primary' : 'hover:bg-paper-100'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                multiple
                className="sr-only"
                onChange={(e) => addFiles(e.target.files)}
              />
              <Upload size={36} className={dragging ? 'text-accent-primary' : 'text-ink-secondary'} />
              <div className="text-center">
                <p className="font-medium text-ink-primary">{t('invoice.dropzone')}</p>
                <p className="text-xs text-ink-secondary mt-1">{t('invoice.dropzoneHint')}</p>
              </div>
            </label>

            {/* File list */}
            {files.length > 0 && (
              <div className="card space-y-2">
                {files.map((f) => (
                  <div key={f.name} className="flex items-center justify-between gap-3 py-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded-btn bg-paper-100 flex items-center justify-center shrink-0">
                        <Upload size={14} className="text-ink-secondary" />
                      </div>
                      <span className="text-sm text-ink-primary truncate">{f.name}</span>
                    </div>
                    <button
                      onClick={() => removeFile(f.name)}
                      className="text-xs text-danger shrink-0 hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* WhatsApp tab */}
        {tab === 'whatsapp' && (
          <div className="card space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#25D366]/15 flex items-center justify-center shrink-0">
                <MessageCircle size={20} className="text-[#25D366]" />
              </div>
              <div>
                <p className="font-medium text-ink-primary">WhatsApp bot</p>
                <p className="text-xs text-ink-secondary">+60-1234-5678</p>
              </div>
            </div>
            <p className="text-sm text-ink-primary leading-relaxed">
              Send invoice photos to{' '}
              <span className="font-semibold text-accent-primary">+60-1234-5678</span> on WhatsApp.
              They&apos;ll appear in your confirmation queue within minutes.
            </p>
            <div className="bg-paper-100 rounded-btn p-4 space-y-2 text-sm text-ink-secondary">
              <p>• Snap a clear photo of your invoice</p>
              <p>• Send it to the number above</p>
              <p>• Our bot will read and queue it automatically</p>
            </div>
          </div>
        )}

        {/* Tips section */}
        <div className="card">
          <button
            onClick={() => setTipsOpen((o) => !o)}
            className="w-full flex items-center justify-between text-left"
          >
            <span className="text-sm font-semibold text-ink-primary">{t('invoice.tipTitle')}</span>
            {tipsOpen ? (
              <ChevronUp size={16} className="text-ink-secondary shrink-0" />
            ) : (
              <ChevronDown size={16} className="text-ink-secondary shrink-0" />
            )}
          </button>
          {tipsOpen && (
            <ul className="mt-4 space-y-2.5 text-sm text-ink-secondary">
              {([
                t('invoice.tip1'),
                t('invoice.tip2'),
                t('invoice.tip3'),
              ] as string[]).map((tip, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-accent-secondary/20 text-accent-secondary flex items-center justify-center shrink-0 text-xs font-semibold">
                    {i + 1}
                  </span>
                  {tip}
                </li>
              ))}
            </ul>
          )}
        </div>

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
            disabled={files.length === 0 || submitting}
            className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitLabel}
          </button>
        </div>
      </div>
    </main>
  );
}

export default function InvoiceUploadPage() {
  return (
    <Suspense>
      <InvoiceUploadPageInner />
    </Suspense>
  );
}
