'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import { Logo } from '@/components/Logo';

const BUSINESS_TYPES: { value: string; label: string }[] = [
  { value: 'hawker_stall', label: 'Gerai / Hawker stall' },
  { value: 'roadside_vendor', label: 'Penjaja tepi jalan' },
  { value: 'cafe', label: 'Kafe' },
  { value: 'restaurant', label: 'Restoran' },
  { value: 'food_truck', label: 'Food truck' },
  { value: 'other', label: 'Lain-lain' },
];

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    email: '',
    password: '',
    confirm: '',
    business_name: '',
    business_type: 'hawker_stall',
    phone_number: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (form.password !== form.confirm) {
      setError('Kata laluan tidak sepadan');
      return;
    }
    setLoading(true);
    try {
      await api.post('/api/auth/signup', {
        email: form.email,
        password: form.password,
        business_name: form.business_name,
        business_type: form.business_type,
        phone_number: form.phone_number || null,
      });
      router.push('/login?signed_up=1');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Sesuatu tak kena. Cuba lagi.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-bg">
      <div className="mx-auto flex min-h-screen max-w-lg flex-col px-6 pt-10 pb-12">
        <Logo />

        <h1 className="mt-10 font-serif text-4xl font-bold text-primary leading-tight">
          Daftar akaun baru
        </h1>
        <p className="mt-3 text-ink/70">Faham menu anda dalam 5 minit. Percuma untuk cuba.</p>

        <form onSubmit={submit} className="mt-8 space-y-5">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink/60">
              Email
            </label>
            <input
              type="email"
              required
              className="input"
              placeholder="you@warung.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink/60">
              Nama kedai
            </label>
            <input
              type="text"
              required
              className="input"
              placeholder="Kedai Mak Cik Ros"
              value={form.business_name}
              onChange={(e) => setForm({ ...form, business_name: e.target.value })}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink/60">
              Jenis perniagaan
            </label>
            <select
              className="input"
              value={form.business_type}
              onChange={(e) => setForm({ ...form, business_type: e.target.value })}
            >
              {BUSINESS_TYPES.map((b) => (
                <option key={b.value} value={b.value}>
                  {b.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink/60">
              Nombor telefon (pilihan)
            </label>
            <div className="flex items-stretch overflow-hidden rounded-xl border border-primary/20 bg-white">
              <span className="flex items-center gap-1 border-r border-primary/10 bg-surface/40 px-3 text-sm font-semibold text-ink/70">
                🇲🇾 +60
              </span>
              <input
                type="tel"
                className="flex-1 bg-transparent px-4 py-3 focus:outline-none"
                placeholder="012 345 6789"
                value={form.phone_number}
                onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink/60">
              Kata laluan
            </label>
            <input
              type="password"
              required
              className="input"
              placeholder="Min 8 aksara, ada huruf besar &amp; nombor"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink/60">
              Sahkan kata laluan
            </label>
            <input
              type="password"
              required
              className="input"
              value={form.confirm}
              onChange={(e) => setForm({ ...form, confirm: e.target.value })}
            />
          </div>

          {error && (
            <div className="rounded-xl border-l-4 border-alert bg-alert/10 px-4 py-3 text-sm text-alert">
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full text-base">
            {loading ? 'Sedang daftar…' : 'Daftar →'}
          </button>

          <p className="text-center text-xs text-ink/60">
            Dengan daftar, anda bersetuju dengan{' '}
            <span className="text-primary font-semibold">Terma</span> ·{' '}
            <span className="text-primary font-semibold">Privasi</span>
          </p>

          <p className="text-center text-sm text-ink/70">
            Dah ada akaun?{' '}
            <Link href="/login" className="text-primary font-semibold">
              Log masuk
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
