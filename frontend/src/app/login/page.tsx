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

type Tab = 'password' | 'otp';

export default function LoginPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>('password');

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
          <h1 className="font-serif text-3xl font-bold text-primary">{t('auth.loginTitle')}</h1>
          <p className="mt-1 text-ink/70 text-sm">{t('auth.loginSubtitle')}</p>
        </div>

        <div className="mb-5 flex rounded-full border border-primary/20 bg-[rgb(var(--color-card))] p-1">
          <button
            className={`flex-1 rounded-full py-2 text-sm font-semibold transition ${
              tab === 'password' ? 'bg-primary text-white' : 'text-primary'
            }`}
            onClick={() => setTab('password')}
          >
            {t('auth.tabPassword')}
          </button>
          <button
            className={`flex-1 rounded-full py-2 text-sm font-semibold transition ${
              tab === 'otp' ? 'bg-primary text-white' : 'text-primary'
            }`}
            onClick={() => setTab('otp')}
          >
            {t('auth.tabOtp')}
          </button>
        </div>

        {tab === 'password' ? (
          <PasswordForm onDone={() => router.replace('/dashboard')} />
        ) : (
          <OtpForm onDone={() => router.replace('/dashboard')} />
        )}

        <div className="mt-6 flex items-center justify-between text-sm">
          <Link href="/forgot-password" className="text-primary hover:underline">
            {t('auth.forgot')}
          </Link>
          <Link href="/signup" className="text-primary hover:underline">
            {t('nav.signup')} →
          </Link>
        </div>
      </div>
    </main>
  );
}

function PasswordForm({ onDone }: { onDone: () => void }) {
  const { t } = useI18n();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await api.post('/api/auth/login/password', { phone_number: phone, password });
      onDone();
    } catch (err) {
      setError(messageForApiError(err, t));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label={t('auth.phone')} hint={t('auth.phoneHint')}>
        <input
          className="input"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          autoComplete="tel"
          inputMode="tel"
          required
          placeholder="+60123456789"
        />
      </Field>
      <Field label={t('auth.password')}>
        <input
          className="input"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />
      </Field>
      {error && <p className="text-alert text-sm">{error}</p>}
      <button type="submit" disabled={busy} className="btn-primary w-full disabled:opacity-60">
        {busy ? '…' : t('auth.submitLogin')}
      </button>
    </form>
  );
}

function OtpForm({ onDone }: { onDone: () => void }) {
  const { t } = useI18n();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [stage, setStage] = useState<'phone' | 'code'>('phone');
  const [devCode, setDevCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function requestCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const resp = await api.post<{ dev_code?: string | null }>('/api/auth/otp/request', {
        phone_number: phone,
        purpose: 'login',
      });
      setDevCode(resp.dev_code ?? null);
      setStage('code');
    } catch (err) {
      setError(messageForApiError(err, t));
    } finally {
      setBusy(false);
    }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await api.post('/api/auth/otp/verify', { phone_number: phone, code, purpose: 'login' });
      onDone();
    } catch (err) {
      setError(messageForApiError(err, t));
    } finally {
      setBusy(false);
    }
  }

  if (stage === 'phone') {
    return (
      <form onSubmit={requestCode} className="space-y-4">
        <Field label={t('auth.phone')} hint={t('auth.phoneHint')}>
          <input
            className="input"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            placeholder="+60123456789"
          />
        </Field>
        {error && <p className="text-alert text-sm">{error}</p>}
        <button type="submit" disabled={busy} className="btn-primary w-full disabled:opacity-60">
          {busy ? '…' : t('auth.sendOtp')}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={verify} className="space-y-4">
      <p className="rounded-xl bg-surface/50 px-4 py-3 text-sm text-ink">{t('auth.otpSent')}</p>
      {devCode && (
        <p className="rounded-xl border border-accent bg-accent/20 px-4 py-3 text-sm">
          <strong>{t('auth.otpDevNote')}</strong>
          <br />
          Code: <code className="font-mono text-base">{devCode}</code>
        </p>
      )}
      <Field label={t('auth.enterOtp')}>
        <input
          className="input tracking-[0.4em] text-center text-xl"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          inputMode="numeric"
          maxLength={8}
          required
        />
      </Field>
      {error && <p className="text-alert text-sm">{error}</p>}
      <button type="submit" disabled={busy} className="btn-primary w-full disabled:opacity-60">
        {busy ? '…' : t('auth.submitLogin')}
      </button>
    </form>
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
