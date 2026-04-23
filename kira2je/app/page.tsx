'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useT } from '@/lib/i18n/client';

export default function LoginPage() {
  const router = useRouter();
  const t = useT();
  const [phone, setPhone] = useState('12-345 6789');
  const [otp, setOtp] = useState('');
  const [stage, setStage] = useState<'phone' | 'otp'>('phone');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendOtp() {
    setError(null);
    setLoading(true);
    const r = await fetch('/api/auth/send-otp', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ phone: '+60' + phone }),
    });
    const j = await r.json();
    setLoading(false);
    if (!j.ok) return setError(j.error || t('common.error'));
    setStage('otp');
  }

  async function verifyOtp() {
    setError(null);
    setLoading(true);
    const r = await fetch('/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ phone: '+60' + phone, otp }),
    });
    const j = await r.json();
    setLoading(false);
    if (!j.ok) return setError(j.error || t('login.errorInvalidOtp'));
    if (j.hasReport) router.push(`/dashboard?reportId=${j.reportId}`);
    else router.push('/onboarding');
  }

  return (
    <main className="min-h-screen flex flex-col lg:flex-row">
      {/* Left brand panel — desktop only */}
      <div className="hidden lg:flex lg:flex-1 flex-col items-center justify-center bg-kira-teal px-16 py-20">
        <h1 className="serif text-7xl text-white mb-4">{t('app.title')}</h1>
        <p className="text-white/80 text-xl text-center max-w-xs">{t('app.tagline')}</p>
      </div>

      {/* Right form panel */}
      <div className="flex-1 lg:flex-none lg:w-[480px] flex flex-col px-6 pt-16 pb-10 lg:px-12 lg:justify-center">
        {/* Mobile-only title */}
        <div className="text-center mb-10 lg:hidden">
          <h1 className="serif text-5xl text-kira-teal mb-2">{t('app.title')}</h1>
          <p className="text-kira-muted">{t('app.tagline')}</p>
        </div>

        <div className="flex-1 flex flex-col justify-center lg:flex-none">
          <div className="max-w-sm mx-auto w-full">
            {stage === 'phone' ? (
              <div className="card">
                <label className="block text-sm text-kira-muted mb-2">
                  {t('login.phoneLabel')}
                </label>
                <div className="flex items-center gap-2">
                  <div className="bg-kira-sage/50 rounded-btn px-4 py-3 font-semibold text-kira-dark">
                    +60
                  </div>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    inputMode="tel"
                    className="input flex-1"
                    placeholder="12-345 6789"
                  />
                </div>
                <p className="text-xs text-kira-muted mt-3">{t('login.phoneHint')}</p>
                <button
                  onClick={sendOtp}
                  disabled={loading}
                  className="btn-primary w-full mt-5"
                >
                  {loading ? t('login.sending') : t('login.sendCode')}
                </button>
              </div>
            ) : (
              <div className="card">
                <label className="block text-sm text-kira-muted mb-2">
                  {t('login.otpLabel')}
                </label>
                <input
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  inputMode="numeric"
                  className="input text-center text-2xl tracking-[0.5em] font-semibold"
                  placeholder={t('login.otpPlaceholder')}
                  autoFocus
                />
                <p className="text-xs text-kira-muted mt-3">{t('login.otpHint')}</p>
                <button
                  onClick={verifyOtp}
                  disabled={loading || otp.length !== 6}
                  className="btn-primary w-full mt-5 disabled:opacity-50"
                >
                  {loading ? t('login.checking') : t('login.submit')}
                </button>
                <button
                  onClick={() => {
                    setStage('phone');
                    setOtp('');
                    setError(null);
                  }}
                  className="w-full mt-3 text-sm text-kira-muted underline"
                >
                  {t('login.changeNumber')}
                </button>
              </div>
            )}
            {error && <p className="mt-4 text-sm text-kira-red text-center">{error}</p>}
          </div>
        </div>

        <footer className="text-center text-xs text-kira-muted mt-8">
          {t('app.footer')}
        </footer>
      </div>
    </main>
  );
}
