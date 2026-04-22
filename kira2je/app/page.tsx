'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
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
    if (!j.ok) return setError(j.error || 'Ada masalah');
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
    if (!j.ok) return setError(j.error || 'OTP salah');
    if (j.hasReport) router.push(`/dashboard?reportId=${j.reportId}`);
    else router.push('/onboarding');
  }

  return (
    <main className="min-h-screen flex flex-col px-6 pt-16 pb-10">
      <div className="flex-1 flex flex-col justify-center">
        <div className="text-center mb-10">
          <h1 className="serif text-5xl text-kira-teal mb-2">Kira2 je</h1>
          <p className="text-kira-muted">Faham menu anda dalam 5 minit</p>
        </div>

        {stage === 'phone' ? (
          <div className="card">
            <label className="block text-sm text-kira-muted mb-2">Nombor telefon</label>
            <div className="flex items-center gap-2">
              <div className="bg-kira-sage/50 rounded-btn px-4 py-3 font-semibold text-kira-dark">+60</div>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                inputMode="tel"
                className="input flex-1"
                placeholder="12-345 6789"
              />
            </div>
            <p className="text-xs text-kira-muted mt-3">
              Kami akan hantar kod 6 digit ke nombor ini.
            </p>
            <button
              onClick={sendOtp}
              disabled={loading}
              className="btn-primary w-full mt-5"
            >
              {loading ? 'Menghantar...' : 'Hantar kod'}
            </button>
          </div>
        ) : (
          <div className="card">
            <label className="block text-sm text-kira-muted mb-2">Kod OTP</label>
            <input
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric"
              className="input text-center text-2xl tracking-[0.5em] font-semibold"
              placeholder="••••••"
              autoFocus
            />
            <p className="text-xs text-kira-muted mt-3">Demo: masukkan apa-apa 6 digit</p>
            <button
              onClick={verifyOtp}
              disabled={loading || otp.length !== 6}
              className="btn-primary w-full mt-5 disabled:opacity-50"
            >
              {loading ? 'Menyemak...' : 'Masuk'}
            </button>
            <button
              onClick={() => {
                setStage('phone');
                setOtp('');
                setError(null);
              }}
              className="w-full mt-3 text-sm text-kira-muted underline"
            >
              Tukar nombor
            </button>
          </div>
        )}
        {error && <p className="mt-4 text-sm text-kira-red text-center">{error}</p>}
      </div>
      <footer className="text-center text-xs text-kira-muted">
        Untuk perniagaan makanan kecil di Malaysia
      </footer>
    </main>
  );
}
