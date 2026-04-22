'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Papa from 'papaparse';
import { useT } from '@/lib/i18n/client';

type Row = {
  item: string;
  price: number;
  quantity: number;
  date: string;
  channel?: string;
  cost_percent?: number;
  delivery_commission?: number;
};

export default function UploadCsv() {
  const router = useRouter();
  const t = useT();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [filename, setFilename] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  function parseFile(file: File) {
    setError(null);
    setFilename(file.name);
    Papa.parse<Row>(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      complete: (result) => {
        const parsed = result.data.filter(
          (r) => r && r.item && typeof r.price === 'number' && typeof r.quantity === 'number'
        );
        if (parsed.length === 0) {
          setError(t('upload.csvError'));
          return;
        }
        setRows(parsed);
      },
      error: (err) => setError(err.message),
    });
  }

  async function loadSample() {
    setError(null);
    setFilename('sample-warung.csv');
    const res = await fetch('/sample-warung.csv');
    const text = await res.text();
    const result = Papa.parse<Row>(text, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
    });
    setRows(result.data);
  }

  async function submit() {
    if (!rows) return;
    setUploading(true);
    const res = await fetch('/api/upload/csv', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ rows }),
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
    <main className="px-5 pt-6 pb-16">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/onboarding" className="text-kira-dark text-xl">
          ←
        </Link>
        <h1 className="serif text-2xl">{t('upload.csvTitle')}</h1>
      </div>

      {!rows ? (
        <div className="space-y-4">
          <label className="card-sage block text-center cursor-pointer">
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={(e) => e.target.files?.[0] && parseFile(e.target.files[0])}
              className="hidden"
            />
            <div className="text-4xl mb-3">📄</div>
            <div className="font-semibold mb-1">{t('upload.csvPicker')}</div>
            <div className="text-sm text-kira-muted">{t('upload.csvFormat')}</div>
          </label>

          <button onClick={loadSample} className="btn-ghost w-full">
            {t('upload.csvUseSample')}
          </button>

          <div className="text-xs text-kira-muted text-center leading-relaxed whitespace-pre-line">
            {t('upload.csvFooter')}
          </div>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-xs text-kira-muted">{t('upload.csvFileLabel')}</div>
              <div className="font-medium">{filename}</div>
              <div className="text-xs text-kira-muted mt-1">
                {t('upload.csvRowsDetected', { n: rows.length })}
              </div>
            </div>
            <button
              onClick={() => {
                setRows(null);
                setFilename(null);
              }}
              className="text-sm text-kira-muted underline"
            >
              {t('upload.csvChangeFile')}
            </button>
          </div>

          <div className="card overflow-x-auto -mx-1 mb-4">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-kira-muted">
                  <th className="px-2 py-2">{t('upload.csvPreviewItem')}</th>
                  <th className="px-2 py-2 text-right">{t('upload.csvPreviewPrice')}</th>
                  <th className="px-2 py-2 text-right">{t('upload.csvPreviewQty')}</th>
                  <th className="px-2 py-2">{t('upload.csvPreviewDate')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 8).map((r, i) => (
                  <tr key={i} className="border-t border-kira-sage/40">
                    <td className="px-2 py-2">{r.item}</td>
                    <td className="px-2 py-2 text-right tabular-nums">
                      RM{Number(r.price).toFixed(2)}
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums">{r.quantity}</td>
                    <td className="px-2 py-2 text-kira-muted">{r.date}</td>
                  </tr>
                ))}
                {rows.length > 8 && (
                  <tr>
                    <td colSpan={4} className="px-2 py-2 text-center text-kira-muted">
                      {t('upload.csvMoreRows', { n: rows.length - 8 })}
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

      {error && <p className="mt-4 text-sm text-kira-red text-center">{error}</p>}
    </main>
  );
}
