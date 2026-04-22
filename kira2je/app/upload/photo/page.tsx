'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function UploadPhoto() {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addFiles(list: FileList | null) {
    if (!list) return;
    setFiles((prev) => [...prev, ...Array.from(list)]);
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
      setError(j.error || 'Gagal memproses gambar');
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
        <h1 className="serif text-2xl">Upload gambar</h1>
      </div>

      <label className="card-sage block text-center cursor-pointer mb-4">
        <input
          type="file"
          accept="image/*"
          multiple
          capture="environment"
          onChange={(e) => addFiles(e.target.files)}
          className="hidden"
        />
        <div className="text-4xl mb-3">📷</div>
        <div className="font-semibold mb-1">Ambil atau pilih gambar</div>
        <div className="text-sm text-kira-muted">
          Gambar buku akaun, resit, atau notebook jualan
        </div>
      </label>

      {files.length > 0 && (
        <div className="mb-4">
          <div className="text-sm text-kira-muted mb-2">
            {files.length} gambar dipilih
          </div>
          <div className="grid grid-cols-3 gap-2">
            {files.map((f, i) => (
              <div
                key={i}
                className="aspect-square bg-white rounded-btn border border-kira-sage/50 flex items-center justify-center text-xs text-kira-muted p-2 overflow-hidden"
              >
                {f.name.slice(0, 18)}
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={submit}
        disabled={uploading || files.length === 0}
        className="btn-primary w-full disabled:opacity-50"
      >
        {uploading ? 'Menganalisis gambar...' : 'Hantar gambar'}
      </button>

      {error && <p className="mt-4 text-sm text-kira-red text-center">{error}</p>}
    </main>
  );
}
