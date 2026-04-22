'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Logo } from '@/components/Logo';
import { BackButton } from '@/components/BackButton';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { ThemeToggle } from '@/components/ThemeToggle';
import { api } from '@/lib/api';
import { useI18n, messageForApiError } from '@/i18n';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [stage, setStage] = useState<'phone' | 'reset'>('phone');
  const [devCode, setDevCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function request(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const resp = await api.post<{ dev_code?: string | null }>('/api/auth/otp/request', {
        phone_number: phone,
        purpose: 'password_reset',
      });
      setDevCode(resp.dev_code ?? null);
      setStage('reset');
    } catch (err) {
      setError(messageForApiError(err, t));
    } finally {
      setBusy(false);
    }
  }

  async function reset(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await api.post('/api/auth/password/reset', {
        phone_number: phone,
        code,
        new_password: newPassword,
      });
      router.replace('/dashboard');
    } catch (err) {
      setError(messageForApiError(err, t));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-bg text-ink">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <BackButton href="/login" />
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
          <h1 className="font-serif text-3xl font-bold text-primary">{t('auth.resetTitle')}</h1>
          <p className="mt-1 text-ink/70 text-sm">{t('auth.resetSubtitle')}</p>
        </div>

        {stage === 'phone' ? (
          <form onSubmit={request} className="space-y-4">
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
        ) : (
          <form onSubmit={reset} className="space-y-4">
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
            <Field label={t('auth.newPassword')} hint={t('auth.passwordHint')}>
              <input
                className="input"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={8}
                required
              />
            </Field>
            {error && <p className="text-alert text-sm">{error}</p>}
            <button type="submit" disabled={busy} className="btn-primary w-full disabled:opacity-60">
              {busy ? '…' : t('auth.resetSubmit')}
            </button>
          </form>
        )}
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
