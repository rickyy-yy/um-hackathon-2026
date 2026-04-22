'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Logo } from '@/components/Logo';
import { useAuth } from '@/lib/hooks';
import { useI18n } from '@/i18n';
import { LanguageSwitcher } from './LanguageSwitcher';
import { ThemeToggle } from './ThemeToggle';
import { ShopSwitcher } from './ShopSwitcher';

export function AppShell({
  children,
  requireAuth = true,
  requireShop = true,
}: {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireShop?: boolean;
}) {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { t } = useI18n();
  const [shopCheckLoading, setShopCheckLoading] = useState(requireShop);

  useEffect(() => {
    if (loading) return;
    if (requireAuth && !user) {
      router.replace('/login');
      return;
    }
    if (!requireShop || !user) {
      setShopCheckLoading(false);
      return;
    }
    // Verify the user has at least one shop. If not, send them to the
    // welcome-shop flow.
    api
      .get<{ id: string }[]>('/api/shops')
      .then((list) => {
        if (list.length === 0) {
          router.replace('/shops/new?first=1');
        } else {
          setShopCheckLoading(false);
        }
      })
      .catch(() => setShopCheckLoading(false));
  }, [loading, user, requireAuth, requireShop, router]);

  async function logout() {
    await api.post('/api/auth/logout').catch(() => null);
    router.replace('/');
  }

  if (loading || shopCheckLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg text-muted">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg text-ink">
      <header className="sticky top-0 z-10 bg-bg/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/dashboard">
            <Logo />
          </Link>
          <nav className="flex items-center gap-3 text-sm">
            {user && <ShopSwitcher />}
            <Link href="/dashboard" className="hidden md:inline text-primary font-semibold hover:underline">
              {t('nav.dashboard')}
            </Link>
            <LanguageSwitcher />
            <ThemeToggle />
            {user ? (
              <button onClick={logout} className="text-sm font-semibold text-alert hover:underline">
                {t('nav.logout')}
              </button>
            ) : (
              <Link href="/login" className="text-sm font-semibold text-primary hover:underline">
                {t('nav.login')}
              </Link>
            )}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
