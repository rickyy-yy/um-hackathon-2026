'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Logo } from '@/components/Logo';
import { BackButton } from '@/components/BackButton';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { ThemeToggle } from '@/components/ThemeToggle';
import { api } from '@/lib/api';
import { useI18n, messageForApiError } from '@/i18n';

export default function SignupPage() {
  const router = useRouter();
  const { t, lang } = useI18n();

  const [form, setForm] = useState({
    phone_number: '',
    password: '',
    confirm: '',
    full_name: '',
    email: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (form.password !== form.confirm) {
      setError(t('errors.ERR_PASSWORD_WEAK'));
      return;
    }
    setBusy(true);
    try {
      await api.post('/api/auth/signup', {
        phone_number: form.phone_number,
        password: form.password,
        full_name: form.full_name || undefined,
        email: form.email || undefined,
        preferred_language: lang,
      });
      // On success the backend has already set the session cookie AND
      // adopted any guest data. Send the user to the welcome-shop flow.
      router.replace('/shops/new?first=1');
    } catch (err) {
      setError(messageForApiError(err, t));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-bg text-ink">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <BackButton />
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </nav>

      <div className="mx-auto max-w-md px-6 pb-16">
        <div className="mb-8 text-center">
          <div className="mb-4 flex justify-center">
            <Logo />
          </div>
          <h1 className="font-serif text-3xl font-bold text-primary">{t('auth.signupTitle')}</h1>
          <p className="mt-1 text-ink/70 text-sm">{t('auth.signupSubtitle')}</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <Field label={t('auth.phone')} hint={t('auth.phoneHint')}>
            <input
              className="input"
              type="tel"
              value={form.phone_number}
              onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
              autoComplete="tel"
              inputMode="tel"
              required
              placeholder="+60123456789"
            />
          </Field>

          <Field label={t('auth.password')} hint={t('auth.passwordHint')}>
            <input
              className="input"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </Field>

          <Field label={t('auth.password') + ' ✓'}>
            <input
              className="input"
              type="password"
              value={form.confirm}
              onChange={(e) => setForm({ ...form, confirm: e.target.value })}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </Field>

          <Field label={t('auth.fullName')}>
            <input
              className="input"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              autoComplete="name"
              maxLength={255}
            />
          </Field>

          <Field label={t('auth.email')} hint={t('auth.emailHint')}>
            <input
              className="input"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              autoComplete="email"
            />
          </Field>

          {error && <p className="text-alert text-sm">{error}</p>}

          <button type="submit" disabled={busy} className="btn-primary w-full disabled:opacity-60">
            {busy ? '…' : t('auth.submitSignup')}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          <Link href="/login" className="text-primary hover:underline">
            {t('nav.login')} →
          </Link>
        </p>
      </div>
    </main>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-ink">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}
