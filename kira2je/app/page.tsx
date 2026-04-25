'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useT } from '@/lib/i18n/client';

// ─── Typing animation ───────────────────────────────────────────────────────

const GREETINGS = [
  'Jom mula, boss!',
  "Let's go, boss!",
  '开始吧，老板！',
  'चलो शुरू करें, बॉस!',
  'Jom mula, boss!', // settles here after one full cycle
];

function useTypewriter() {
  const [text, setText] = useState('');
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    if (settled) return;
    const phrase = GREETINGS[phraseIdx];

    if (!deleting && text === phrase) {
      if (phraseIdx === GREETINGS.length - 1) { setSettled(true); return; }
      const t = setTimeout(() => setDeleting(true), 1800);
      return () => clearTimeout(t);
    }

    if (deleting && text === '') {
      setPhraseIdx(i => i + 1);
      setDeleting(false);
      return;
    }

    const delay = deleting ? 30 + Math.random() * 20 : 55 + Math.random() * 45;
    const t = setTimeout(() => {
      if (deleting) setText(p => p.slice(0, -1));
      else setText(phrase.slice(0, text.length + 1));
    }, delay);
    return () => clearTimeout(t);
  }, [text, deleting, phraseIdx, settled]);

  return { text, settled };
}

// ─── Shared visual components ────────────────────────────────────────────────

function DiamondPattern() {
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="diamonds" x="0" y="0" width="32" height="32" patternUnits="userSpaceOnUse">
          <path d="M16 3 L29 16 L16 29 L3 16 Z" fill="none" stroke="white" strokeWidth="0.8" strokeOpacity="0.12" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#diamonds)" />
    </svg>
  );
}

function KiraLogo({ className = 'text-5xl' }: { className?: string }) {
  return (
    <span className={`font-black tracking-tight leading-none text-white ${className}`}>
      Kira<span style={{ color: '#f5b731', fontSize: '1.12em' }}>2</span>Je
    </span>
  );
}

function TealHeader({ children }: { children?: React.ReactNode }) {
  return (
    <div className="relative overflow-hidden bg-accent-primary flex flex-col items-center justify-center text-center px-10 py-10">
      <DiamondPattern />
      <div className="relative z-10">
        <p className="text-white/45 text-[10px] tracking-[0.35em] uppercase font-semibold mb-3">
          Selamat Datang Ke
        </p>
        {children}
      </div>
    </div>
  );
}

function ReceiptIllustration() {
  return (
    <svg viewBox="0 0 56 72" fill="none" className="w-10 h-14 text-ink-secondary/30">
      <path d="M8 4H48V64L44 60L40 64L36 60L32 64L28 60L24 64L20 60L16 64L12 60L8 64Z"
        stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <line x1="16" y1="18" x2="40" y2="18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="16" y1="28" x2="40" y2="28" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="16" y1="38" x2="30" y2="38" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="16" y1="48" x2="36" y2="48" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function BarChartIllustration() {
  return (
    <svg viewBox="0 0 72 56" fill="none" className="w-14 h-10 text-ink-secondary/30">
      <line x1="8" y1="48" x2="64" y2="48" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="8" y1="10" x2="8" y2="48" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <rect x="13" y="28" width="11" height="20" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <rect x="30" y="13" width="11" height="35" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <rect x="47" y="20" width="11" height="28" rx="2" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function Illustrations() {
  return (
    <div className="flex items-end justify-center gap-6 opacity-70">
      <ReceiptIllustration />
      <BarChartIllustration />
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function LoginPage() {
  const router = useRouter();
  const t = useT();
  const [phone, setPhone] = useState('12-345 6789');
  const [otp, setOtp] = useState('');
  const [stage, setStage] = useState<'phone' | 'otp'>('phone');
  const [loading, setLoading] = useState(false);
  const { text: greeting, settled } = useTypewriter();

  async function sendOtp() {
    setLoading(true);
    const r = await fetch('/api/auth/send-otp', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ phone: '+60' + phone }),
    });
    const j = await r.json();
    setLoading(false);
    if (!j.ok) { toast.error(j.error || t('common.error')); return; }
    setStage('otp');
  }

  async function verifyOtp() {
    setLoading(true);
    const r = await fetch('/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ phone: '+60' + phone, otp }),
    });
    const j = await r.json();
    setLoading(false);
    if (!j.ok) { toast.error(j.error || t('login.errorInvalidOtp')); return; }
    if (!j.hasProfile) router.push('/setup');
    else if (j.hasReport) router.push(`/dashboard?reportId=${j.reportId}`);
    else router.push('/onboarding');
  }

  return (
    <main className="h-screen lg:h-auto lg:min-h-screen flex flex-col lg:flex-row overflow-y-auto">

      {/* ── MOBILE: teal header ── */}
      <motion.div
        className="lg:hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <TealHeader>
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.15, duration: 0.45, ease: 'easeOut' }}
          >
            <KiraLogo className="text-5xl" />
          </motion.div>
        </TealHeader>
      </motion.div>

      {/* ── MOBILE: cream form sheet ── */}
      <motion.div
        className="lg:hidden flex-1 bg-paper-50 rounded-t-3xl -mt-5 px-6 pt-10 pb-8 flex flex-col"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.45, ease: 'easeOut' }}
      >
        <AnimatePresence mode="wait">
          {stage === 'phone' ? (
            <motion.div key="phone-m"
              initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.25 }}
            >
              <h2 className="serif text-2xl text-ink-primary mb-1 min-h-[2rem]">
                {greeting}
                <span className={`ml-0.5 ${settled ? 'invisible' : 'animate-cursor'}`}>|</span>
              </h2>
              <p className="text-sm text-ink-secondary mb-5">
                Masukkan nombor telefon anda. Kami akan hantar kod 6 digit.
              </p>
              <div className="flex items-center gap-2 mb-5">
                <div className="bg-paper-200/50 rounded-btn px-4 py-3 font-semibold text-ink-primary shrink-0">+60</div>
                <input value={phone} onChange={(e) => setPhone(e.target.value)}
                  inputMode="tel" className="input flex-1 bg-white" placeholder="12-345 6789" />
              </div>
              <motion.button onClick={sendOtp} disabled={loading}
                className="btn-primary w-full" whileTap={{ scale: 0.97 }}>
                {loading ? 'Menghantar...' : 'Hantar kod'}
              </motion.button>
            </motion.div>
          ) : (
            <motion.div key="otp-m"
              initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }} transition={{ duration: 0.25 }}
            >
              <h2 className="serif text-2xl text-ink-primary mb-1">{t('login.otpLabel')}</h2>
              <p className="text-sm text-ink-secondary mb-5">{t('login.otpHint')}</p>
              <input value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                onPaste={(e) => {
                  const p = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
                  if (p) { e.preventDefault(); setOtp(p); }
                }}
                inputMode="numeric"
                className="input text-center text-2xl tracking-[0.5em] font-semibold mb-5 bg-white"
                placeholder={t('login.otpPlaceholder')} autoFocus />
              <motion.button onClick={verifyOtp} disabled={loading || otp.length !== 6}
                className="btn-primary w-full disabled:opacity-50 mb-3" whileTap={{ scale: 0.97 }}>
                {loading ? 'Menyemak...' : t('login.submit')}
              </motion.button>
              <button onClick={() => { setStage('phone'); setOtp(''); }}
                className="w-full text-sm text-ink-secondary underline">
                {t('login.changeNumber')}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-auto pt-8">
          <Illustrations />
          <p className="mt-4 text-center text-xs text-ink-secondary">
            Untuk bisnes F&amp;B kecil di Malaysia
          </p>
        </div>
      </motion.div>

      {/* ── DESKTOP: teal left panel ── */}
      <motion.div
        className="hidden lg:flex relative overflow-hidden lg:flex-1 flex-col items-center justify-center bg-accent-primary px-16 py-20"
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <DiamondPattern />
        <motion.div
          className="relative z-10 text-center"
          initial={{ opacity: 0, y: 16, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <p className="text-white/45 text-[11px] tracking-[0.35em] uppercase font-semibold mb-4">
            Selamat Datang Ke
          </p>
          <KiraLogo className="text-7xl" />
        </motion.div>
      </motion.div>

      {/* ── DESKTOP: right cream form panel ── */}
      <div className="hidden lg:flex lg:flex-none lg:w-[480px] bg-paper-50 flex-col items-center justify-center px-12">
        <div className="w-full max-w-sm">
          <AnimatePresence mode="wait">
            {stage === 'phone' ? (
              <motion.div key="phone-d"
                initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.3 }}
              >
                <h2 className="serif text-2xl text-ink-primary mb-1 min-h-[2rem]">
                  {greeting}
                  <span className={`ml-0.5 ${settled ? 'invisible' : 'animate-cursor'}`}>|</span>
                </h2>
                <p className="text-sm text-ink-secondary mb-5">
                  Masukkan nombor telefon anda. Kami akan hantar kod 6 digit.
                </p>
                <div className="flex items-center gap-2 mb-5">
                  <div className="bg-paper-200/50 rounded-btn px-4 py-3 font-semibold text-ink-primary shrink-0">+60</div>
                  <input value={phone} onChange={(e) => setPhone(e.target.value)}
                    inputMode="tel" className="input flex-1" placeholder="12-345 6789" />
                </div>
                <motion.button onClick={sendOtp} disabled={loading}
                  className="btn-primary w-full" whileTap={{ scale: 0.97 }}>
                  {loading ? 'Menghantar...' : 'Hantar kod'}
                </motion.button>
              </motion.div>
            ) : (
              <motion.div key="otp-d"
                initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 24 }} transition={{ duration: 0.3 }}
              >
                <h2 className="serif text-2xl text-ink-primary mb-1">{t('login.otpLabel')}</h2>
                <p className="text-sm text-ink-secondary mb-5">{t('login.otpHint')}</p>
                <input value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  onPaste={(e) => {
                    const p = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
                    if (p) { e.preventDefault(); setOtp(p); }
                  }}
                  inputMode="numeric"
                  className="input text-center text-2xl tracking-[0.5em] font-semibold mb-5"
                  placeholder={t('login.otpPlaceholder')} autoFocus />
                <motion.button onClick={verifyOtp} disabled={loading || otp.length !== 6}
                  className="btn-primary w-full disabled:opacity-50 mb-3" whileTap={{ scale: 0.97 }}>
                  {loading ? 'Menyemak...' : t('login.submit')}
                </motion.button>
                <button onClick={() => { setStage('phone'); setOtp(''); }}
                  className="w-full text-sm text-ink-secondary underline">
                  {t('login.changeNumber')}
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-8">
            <Illustrations />
            <p className="mt-4 text-center text-xs text-ink-secondary">
              Untuk bisnes F&amp;B kecil di Malaysia
            </p>
          </div>
        </div>
      </div>

    </main>
  );
}
