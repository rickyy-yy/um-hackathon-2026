'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Check } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type Lang = 'ms' | 'en';

const L: Record<Lang, {
  back: string; title: string; subtitle: string; langLabel: string;
  nameLabel: string; namePlaceholder: string;
  pronounLabel: string;
  stallLabel: string; stallPlaceholder: string;
  areaLabel: string; areaPlaceholder: string;
  submit: string; submitting: string; errorSave: string;
}> = {
  ms: {
    back: 'Kembali',
    title: 'Sikit info dulu, boss',
    subtitle: 'Kami nak kenal anda dengan lebih baik supaya laporan lebih tepat.',
    langLabel: 'Bahasa laporan',
    nameLabel: 'Nama anda',
    namePlaceholder: 'Cth: Aminah, Razif, Pak Mat',
    pronounLabel: 'Sapaan pilihan',
    stallLabel: 'Nama kedai / gerai',
    stallPlaceholder: 'Cth: Warung Aminah, Gerai Pak Mat',
    areaLabel: 'Kawasan / bandar',
    areaPlaceholder: 'Cth: Kajang, Cheras, Ipoh',
    submit: 'Teruskan →',
    submitting: 'Menyimpan...',
    errorSave: 'Gagal menyimpan. Cuba lagi.',
  },
  en: {
    back: 'Back',
    title: 'Quick intro, boss',
    subtitle: 'A few details so your report feels personal and accurate.',
    langLabel: 'Report language',
    nameLabel: 'Your name',
    namePlaceholder: 'e.g. Aminah, Razif, Pak Mat',
    pronounLabel: 'Preferred salutation',
    stallLabel: 'Shop / stall name',
    stallPlaceholder: 'e.g. Warung Aminah, Pak Mat Stall',
    areaLabel: 'Area / city',
    areaPlaceholder: 'e.g. Kajang, Cheras, Ipoh',
    submit: 'Continue →',
    submitting: 'Saving...',
    errorSave: 'Could not save. Please try again.',
  },
};

const PRONOUNS = ['Boss', 'Cik', 'Encik', 'Puan'];

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.07, duration: 0.35, ease: 'easeOut' },
  }),
};

export default function SetupPage() {
  const router = useRouter();
  const [lang, setLang] = useState<Lang>('ms');
  const [name, setName] = useState('');
  const [pronoun, setPronoun] = useState('Boss');
  const [stallName, setStallName] = useState('');
  const [area, setArea] = useState('');
  const [saving, setSaving] = useState(false);

  const l = L[lang];

  const steps = lang === 'ms'
    ? ['Masuk', 'Profil', 'Data']
    : ['Sign in', 'Profile', 'Data'];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    const res = await fetch('/api/user/profile', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), pronoun, stallName: stallName.trim(), area: area.trim(), locale: lang }),
    });
    const j = await res.json();
    setSaving(false);
    if (!j.ok) { toast.error(l.errorSave); return; }
    router.push('/onboarding');
  }

  return (
    <main className="min-h-screen flex flex-col bg-kira-cream">
      {/* Teal header */}
      <div className="bg-kira-teal text-white px-5 pt-8 pb-6 shrink-0">
        <motion.button
          type="button"
          onClick={() => router.push('/')}
          className="flex items-center gap-1.5 text-sm opacity-75 hover:opacity-100 transition-opacity mb-4"
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 0.75, x: 0 }}
          transition={{ duration: 0.3 }}
          whileHover={{ opacity: 1 }}
        >
          <ArrowLeft size={14} />
          {l.back}
        </motion.button>

        {/* Step indicator */}
        <motion.div
          className="flex items-center mb-5"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05 }}
        >
          {steps.map((label, i) => (
            <div key={i} className="flex items-center">
              <div className="flex flex-col items-center">
                <motion.div
                  className={cn(
                    'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2',
                    i + 1 === 2
                      ? 'bg-white text-kira-teal border-white'
                      : i + 1 < 2
                      ? 'bg-white/30 text-white border-white/40'
                      : 'bg-transparent text-white/40 border-white/25'
                  )}
                  animate={i + 1 === 2 ? { scale: [1, 1.12, 1] } : {}}
                  transition={{ duration: 0.4, delay: 0.3 }}
                >
                  {i + 1 < 2 ? <Check size={13} strokeWidth={3} /> : i + 1}
                </motion.div>
                <span className={cn('text-xs mt-1', i + 1 === 2 ? 'text-white font-semibold' : 'text-white/45')}>
                  {label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div className={cn('w-10 h-0.5 mb-4 mx-1', i + 1 < 2 ? 'bg-white/50' : 'bg-white/20')} />
              )}
            </div>
          ))}
        </motion.div>

        <motion.h1
          className="serif text-2xl leading-tight"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.15 }}
        >
          {l.title}
        </motion.h1>
        <motion.p
          className="text-sm opacity-80 mt-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.8 }}
          transition={{ duration: 0.4, delay: 0.25 }}
        >
          {l.subtitle}
        </motion.p>
      </div>

      <form onSubmit={submit} className="flex-1 px-5 pt-6 pb-10 max-w-md mx-auto w-full space-y-5">

        {/* Language picker */}
        <motion.div custom={0} variants={fadeUp} initial="hidden" animate="show">
          <label className="block text-xs text-kira-muted uppercase tracking-wide mb-2">{l.langLabel}</label>
          <div className="flex rounded-btn overflow-hidden border border-kira-sage">
            {(['ms', 'en'] as Lang[]).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setLang(v)}
                className={cn(
                  'flex-1 py-2.5 text-sm font-semibold transition-colors duration-200',
                  lang === v ? 'bg-kira-teal text-white' : 'bg-white text-kira-muted hover:bg-kira-sage/30'
                )}
              >
                {v === 'ms' ? 'Bahasa Melayu' : 'English'}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Pronoun */}
        <motion.div custom={1} variants={fadeUp} initial="hidden" animate="show">
          <label className="block text-xs text-kira-muted uppercase tracking-wide mb-2">{l.pronounLabel}</label>
          <div className="flex gap-2 flex-wrap">
            {PRONOUNS.map((p) => (
              <motion.button
                key={p}
                type="button"
                onClick={() => setPronoun(p)}
                className={cn(
                  'px-4 py-2 rounded-btn text-sm font-medium border transition-colors duration-150',
                  pronoun === p
                    ? 'bg-kira-teal text-white border-kira-teal'
                    : 'bg-white text-kira-dark border-kira-sage hover:border-kira-teal'
                )}
                whileTap={{ scale: 0.93 }}
              >
                {p}
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Name */}
        <motion.div custom={2} variants={fadeUp} initial="hidden" animate="show">
          <label className="block text-xs text-kira-muted uppercase tracking-wide mb-2">{l.nameLabel}</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={l.namePlaceholder}
            className="input w-full"
            required
          />
        </motion.div>

        {/* Stall name */}
        <motion.div custom={3} variants={fadeUp} initial="hidden" animate="show">
          <label className="block text-xs text-kira-muted uppercase tracking-wide mb-2">{l.stallLabel}</label>
          <input
            value={stallName}
            onChange={(e) => setStallName(e.target.value)}
            placeholder={l.stallPlaceholder}
            className="input w-full"
          />
        </motion.div>

        {/* Area */}
        <motion.div custom={4} variants={fadeUp} initial="hidden" animate="show">
          <label className="block text-xs text-kira-muted uppercase tracking-wide mb-2">{l.areaLabel}</label>
          <input
            value={area}
            onChange={(e) => setArea(e.target.value)}
            placeholder={l.areaPlaceholder}
            className="input w-full"
          />
        </motion.div>

        <motion.div custom={5} variants={fadeUp} initial="hidden" animate="show">
          <motion.button
            type="submit"
            disabled={saving || !name.trim()}
            className="btn-primary w-full disabled:opacity-40"
            whileTap={{ scale: 0.97 }}
          >
            {saving ? l.submitting : l.submit}
          </motion.button>
        </motion.div>
      </form>
    </main>
  );
}
