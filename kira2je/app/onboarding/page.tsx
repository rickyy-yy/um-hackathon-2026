'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Step = 1 | 2 | 3 | 4;

const TOTAL_STEPS = 4;

// ─── Translation strings (client component — inline for simplicity) ───────────
const strings = {
  en: {
    'onboard.step1.title': 'Your business',
    'onboard.step1.nameLabel': 'Business name',
    'onboard.step1.namePlaceholder': 'e.g. Café Aminah',
    'onboard.step1.typeLabel': 'Business type',
    'onboard.step1.restaurant': 'Restaurant',
    'onboard.step1.cafe': 'Café',
    'onboard.step1.catering': 'Catering',
    'onboard.step1.other': 'Other',
    'onboard.step2.title': 'Language',
    'onboard.step2.desc': 'Choose your preferred language for reports and the app.',
    'onboard.step3.title': 'Your POS system',
    'onboard.step3.desc': 'This helps us parse your sales exports correctly.',
    'onboard.step3.storehub': 'StoreHub',
    'onboard.step3.loyverse': 'Loyverse',
    'onboard.step3.custom': 'Other / Custom',
    'onboard.step4.title': 'WhatsApp for invoices',
    'onboard.step4.desc':
      "Snap and send invoices to our WhatsApp bot — they’ll land in your confirmation queue automatically.",
    'onboard.step4.skip': 'Skip for now',
    'onboard.step4.connect': 'Connect WhatsApp',
    'onboard.next': 'Next',
    'onboard.finish': 'Go to dashboard',
  },
  bm: {
    'onboard.step1.title': 'Perniagaan anda',
    'onboard.step1.nameLabel': 'Nama perniagaan',
    'onboard.step1.namePlaceholder': 'cth. Kafe Aminah',
    'onboard.step1.typeLabel': 'Jenis perniagaan',
    'onboard.step1.restaurant': 'Restoran',
    'onboard.step1.cafe': 'Kafe',
    'onboard.step1.catering': 'Katering',
    'onboard.step1.other': 'Lain-lain',
    'onboard.step2.title': 'Bahasa',
    'onboard.step2.desc': 'Pilih bahasa pilihan untuk laporan dan apl.',
    'onboard.step3.title': 'Sistem POS anda',
    'onboard.step3.desc': 'Ini membantu kami mengurai eksport jualan anda dengan betul.',
    'onboard.step3.storehub': 'StoreHub',
    'onboard.step3.loyverse': 'Loyverse',
    'onboard.step3.custom': 'Lain / Tersuai',
    'onboard.step4.title': 'WhatsApp untuk invois',
    'onboard.step4.desc':
      'Snap dan hantar invois ke bot WhatsApp kami — ia akan masuk dalam baris gilir pengesahan secara automatik.',
    'onboard.step4.skip': 'Langkau buat masa ini',
    'onboard.step4.connect': 'Sambung WhatsApp',
    'onboard.next': 'Seterusnya',
    'onboard.finish': 'Pergi ke papan pemuka',
  },
} as const;

type Locale = 'en' | 'bm';
type StringKey = keyof (typeof strings)['en'];

function useT(locale: Locale) {
  return (key: StringKey) => strings[locale][key];
}

// ─── Step indicator ───────────────────────────────────────────────────────────
function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={[
            'h-1.5 rounded-full transition-all duration-300',
            i + 1 === current
              ? 'bg-accent-primary w-8'
              : i + 1 < current
              ? 'bg-accent-primary/40 w-4'
              : 'bg-paper-200 w-4',
          ].join(' ')}
        />
      ))}
      <span className="ml-1 text-xs text-ink-secondary">
        {current} of {total}
      </span>
    </div>
  );
}

// ─── Radio option ─────────────────────────────────────────────────────────────
function RadioOption({
  name,
  value,
  checked,
  onChange,
  label,
}: {
  name: string;
  value: string;
  checked: boolean;
  onChange: (v: string) => void;
  label: string;
}) {
  return (
    <label
      className={[
        'flex items-center gap-3 p-4 rounded-card border cursor-pointer transition-colors',
        checked
          ? 'border-accent-primary bg-accent-primary/5'
          : 'border-paper-200 bg-paper-50 hover:border-paper-200 hover:bg-paper-100',
      ].join(' ')}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={() => onChange(value)}
        className="accent-accent-primary w-4 h-4"
      />
      <span className="text-ink-primary font-medium">{label}</span>
    </label>
  );
}

// ─── Main page component ──────────────────────────────────────────────────────
export default function OnboardingPage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>(1);
  const [locale, setLocale] = useState<Locale>('en');
  const [submitting, setSubmitting] = useState(false);

  // Form fields
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('restaurant');
  const [posType, setPosType] = useState('storehub');

  const t = useT(locale);

  // Immediately update locale cookie when user picks a language
  async function handleLocaleChange(next: Locale) {
    setLocale(next);
    try {
      await fetch('/api/locale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale: next }),
      });
    } catch {
      // non-fatal; locale will still be in state for the rest of onboarding
    }
  }

  async function handleFinish() {
    setSubmitting(true);
    try {
      await fetch('/api/user/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName,
          businessType,
          posType,
          language: locale,
          locale,
        }),
      });
    } catch {
      // continue anyway for hackathon demo
    }
    router.push('/dashboard');
  }

  function handleNext() {
    if (step < TOTAL_STEPS) {
      setStep((s) => (s + 1) as Step);
    } else {
      handleFinish();
    }
  }

  return (
    <main className="min-h-screen bg-paper-100 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* App wordmark */}
        <div className="mb-8 text-center">
          <span className="text-2xl font-bold text-ink-primary tracking-tight">Kira2 je</span>
        </div>

        <div className="card">
          <StepIndicator current={step} total={TOTAL_STEPS} />

          {/* ── Step 1: Business info ── */}
          {step === 1 && (
            <div>
              <h1 className="text-xl font-semibold text-ink-primary mb-6">
                {t('onboard.step1.title')}
              </h1>

              <div className="mb-5">
                <label className="section-label block mb-2">
                  {t('onboard.step1.nameLabel')}
                </label>
                <input
                  className="input"
                  type="text"
                  placeholder={t('onboard.step1.namePlaceholder')}
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="mb-6">
                <p className="section-label mb-3">{t('onboard.step1.typeLabel')}</p>
                <div className="flex flex-col gap-2">
                  {(
                    [
                      ['restaurant', t('onboard.step1.restaurant')],
                      ['cafe', t('onboard.step1.cafe')],
                      ['catering', t('onboard.step1.catering')],
                      ['other', t('onboard.step1.other')],
                    ] as [string, string][]
                  ).map(([val, label]) => (
                    <RadioOption
                      key={val}
                      name="businessType"
                      value={val}
                      checked={businessType === val}
                      onChange={setBusinessType}
                      label={label}
                    />
                  ))}
                </div>
              </div>

              <button
                className="btn-primary w-full"
                onClick={handleNext}
                disabled={!businessName.trim()}
              >
                {t('onboard.next')}
              </button>
            </div>
          )}

          {/* ── Step 2: Language ── */}
          {step === 2 && (
            <div>
              <h1 className="text-xl font-semibold text-ink-primary mb-2">
                {t('onboard.step2.title')}
              </h1>
              <p className="text-ink-secondary mb-6 text-sm leading-relaxed">
                {t('onboard.step2.desc')}
              </p>

              <div className="grid grid-cols-2 gap-3 mb-8">
                {(
                  [
                    ['en', 'English'],
                    ['bm', 'Bahasa Malaysia'],
                  ] as [Locale, string][]
                ).map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => handleLocaleChange(val)}
                    className={[
                      'rounded-card border py-5 text-center font-semibold transition-colors min-h-0',
                      locale === val
                        ? 'border-accent-primary bg-accent-primary text-white'
                        : 'border-paper-200 bg-paper-50 text-ink-primary hover:bg-paper-100',
                    ].join(' ')}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <button className="btn-primary w-full" onClick={handleNext}>
                {t('onboard.next')}
              </button>
            </div>
          )}

          {/* ── Step 3: POS system ── */}
          {step === 3 && (
            <div>
              <h1 className="text-xl font-semibold text-ink-primary mb-2">
                {t('onboard.step3.title')}
              </h1>
              <p className="text-ink-secondary mb-6 text-sm leading-relaxed">
                {t('onboard.step3.desc')}
              </p>

              <div className="flex flex-col gap-2 mb-8">
                {(
                  [
                    ['storehub', t('onboard.step3.storehub')],
                    ['loyverse', t('onboard.step3.loyverse')],
                    ['custom', t('onboard.step3.custom')],
                  ] as [string, string][]
                ).map(([val, label]) => (
                  <RadioOption
                    key={val}
                    name="posType"
                    value={val}
                    checked={posType === val}
                    onChange={setPosType}
                    label={label}
                  />
                ))}
              </div>

              <button className="btn-primary w-full" onClick={handleNext}>
                {t('onboard.next')}
              </button>
            </div>
          )}

          {/* ── Step 4: WhatsApp (optional) ── */}
          {step === 4 && (
            <div>
              <h1 className="text-xl font-semibold text-ink-primary mb-2">
                {t('onboard.step4.title')}
              </h1>
              <p className="text-ink-secondary mb-8 text-sm leading-relaxed">
                {t('onboard.step4.desc')}
              </p>

              {/* WhatsApp icon placeholder */}
              <div className="flex justify-center mb-8">
                <div className="w-20 h-20 rounded-full bg-[#25D366]/10 flex items-center justify-center">
                  <svg
                    viewBox="0 0 24 24"
                    className="w-10 h-10 fill-[#25D366]"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  className="btn-primary w-full"
                  onClick={handleNext}
                  disabled={submitting}
                >
                  {t('onboard.step4.connect')}
                </button>
                <button
                  className="btn-secondary w-full"
                  onClick={handleNext}
                  disabled={submitting}
                >
                  {submitting ? '…' : t('onboard.step4.skip')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
