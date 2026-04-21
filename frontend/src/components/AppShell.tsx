'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { Logo } from '@/components/Logo';

type User = {
  id: string;
  email: string;
  business_name: string;
  business_type: string;
  has_reports: boolean;
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    api
      .get<User>('/api/auth/me')
      .then((u) => {
        setUser(u);
        setReady(true);
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) router.replace('/login');
        else setReady(true);
      });
  }, [router]);

  async function logout() {
    await api.post('/api/auth/logout').catch(() => null);
    router.replace('/');
  }

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg text-ink/50">
        Memuatkan…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg">
      <header className="sticky top-0 z-10 bg-bg/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href={user?.has_reports ? '/dashboard' : '/upload'}>
            <Logo />
          </Link>
          <nav className="flex items-center gap-5 text-sm font-semibold text-primary">
            <Link href="/dashboard" className="hover:underline">
              Dashboard
            </Link>
            <Link href="/upload" className="hover:underline">
              Upload
            </Link>
            {user && (
              <div className="flex items-center gap-3">
                <span className="hidden rounded-xl bg-surface/60 px-3 py-1 text-xs text-ink/70 md:inline">
                  {user.business_name}
                </span>
                <button onClick={logout} className="text-alert font-semibold">
                  Keluar
                </button>
              </div>
            )}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
