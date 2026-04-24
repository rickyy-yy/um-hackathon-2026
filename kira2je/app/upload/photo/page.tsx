'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useT } from '@/lib/i18n/client';
import { AppHeader } from '@/components/AppHeader';

export default function UploadPhoto() {
  const router = useRouter();
  const t = useT();
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  function addFiles(list: FileList | null) {
    if (!list) return;
    setFiles((prev) => [...prev, ...Array.from(list)]);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  }

  async function submit() {
    if (files.length === 0) return;
    setUploading(true);
    setError(null);

    const images: { name: string; base64: string; mimeType: string }[] = [];
    for (const f of files) {
      const buf = await f.arrayBuffer();
      const b64 = Buffer.from(buf).toString('base64');
      images.push({ name: f.name, base64: b64, mimeType: f.type || 'image/jpeg' });
    }

    const res = await fetch('/api/upload/photo', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ images }),
    });
    const j = await res.json();
    setUploading(false);
    if (!j.ok) {
      setError(j.error || t('upload.photoError'));
      return;
    }
    router.push(`/processing?reportId=${j.reportId}`);
  }

  return (
    <main className="min-h-screen flex flex-col">
      <AppHeader title={t('upload.photoTitle')} backHref="/onboarding" />
      <div className="flex-1 px-5 pt-6 pb-16 max-w-2xl mx-auto w-full">

      <label
        className={`block text-center cursor-pointer mb-4 border-2 border-dashed rounded-xl p-8 transition-colors ${
          dragging
            ? 'border-kira-teal bg-kira-teal/10'
            : 'border-kira-sage bg-kira-sage/30 hover:border-kira-teal hover:bg-kira-teal/5'
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept="image/*"
          multiple
          capture="environment"
          onChange={(e) => addFiles(e.target.files)}
          className="hidden"
        />
        <div className="text-4xl mb-3">📷</div>
        <div className="font-semibold mb-1">{t('upload.photoPicker')}</div>
        <div className="text-sm text-kira-muted">{t('upload.photoDesc')}</div>
        <div className="text-xs text-kira-muted mt-2 opacity-70">
          {dragging ? '↓ Lepas di sini' : 'Klik atau seret & lepas gambar di sini'}
        </div>
      </label>

      {files.length > 0 && (
        <div className="mb-4">
          <div className="text-sm text-kira-muted mb-2">
            {t('upload.photoSelected', { n: files.length })}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {files.map((f, i) => (
              <div
                key={i}
                className="aspect-square bg-white rounded-btn border border-kira-sage/50 overflow-hidden relative"
              >
                <img
                  src={URL.createObjectURL(f)}
                  alt={f.name}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={submit}
        disabled={uploading || files.length === 0}
        className="btn-primary w-full disabled:opacity-40"
      >
        {uploading
          ? t('upload.photoSubmitting')
          : files.length === 0
          ? 'Pilih gambar dahulu ↑'
          : t('upload.photoSubmit')}
      </button>

      {error && (
        <div className="mt-4 rounded-xl bg-kira-red/10 border border-kira-red/30 p-4">
          <p className="text-sm text-kira-red font-medium mb-1">{error}</p>
          {error.includes('item') && (
            <p className="text-xs text-kira-muted">
              Petua: OCR berfungsi terbaik dengan resit bercetak. Untuk rekod tulisan tangan, pastikan gambar terang dan tulisan jelas.
            </p>
          )}
        </div>
      )}
      </div>
    </main>
  );
}
