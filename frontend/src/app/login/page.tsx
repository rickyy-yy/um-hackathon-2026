'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import { Logo } from '@/components/Logo';

type UserResponse = {
  id: string;
  email: string;
  business_name: string;
  has_reports: boolean;
};

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const justSignedUp = params.get('signed_up') === '1';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const user = await api.post<UserResponse>('/api/auth/login', { email, password });
      router.push(user.has_reports ? '/dashboard' : '/upload');
    } catch (err) {
      setError(err instanceof ApiError ? 'Invalid credentials' : 'Sesuatu tak kena.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-bg">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
        <Logo />

        <h1 className="mt-10 font-serif text-5xl font-bold text-primary leading-[1.05]">
          Selamat kembali.
        </h1>
        <p className="mt-3 text-ink/70">
          Masuk pantas — sama macam apps delivery yang dah biasa.
        </p>

        {justSignedUp && (
          <div className="mt-6 rounded-xl border-l-4 border-primary bg-surface/60 px-4 py-3 text-sm text-primary">
            Akaun anda dah siap. Sila log masuk.
          </div>
        )}

        <form onSubmit={submit} className="mt-8 space-y-5">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink/60">
              Email
            </label>
            <input
              type="email"
              required
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@warung.com"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink/60">
              Kata laluan
            </label>
            <input
              type="password"
              required
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <div className="rounded-xl border-l-4 border-alert bg-alert/10 px-4 py-3 text-sm text-alert">
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full text-base">
            {loading ? 'Masuk…' : 'Log masuk →'}
          </button>

          <p className="text-center text-sm text-ink/70">
            Belum daftar?{' '}
            <Link href="/signup" className="text-primary font-semibold">
              Daftar akaun
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="p-10">Loading…</div>}>
      <LoginForm />
    </Suspense>
  );
}
