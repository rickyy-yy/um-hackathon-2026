'use client';

import Link from 'next/link';
import { Logo } from '@/components/Logo';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useI18n } from '@/i18n';

export default function LandingPage() {
  const { t, dict } = useI18n();

  return (
    <main className="min-h-screen bg-bg text-ink">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Logo />
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <ThemeToggle />
          <Link href="/login" className="text-primary font-semibold hover:underline">
            {t('nav.login')}
          </Link>
          <Link href="/upload" className="btn-primary">
            {t('nav.tryNow')}
          </Link>
        </div>
      </nav>

      <section className="mx-auto max-w-6xl px-6 pt-10 pb-20">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="mb-4 text-primary font-semibold">{t('landing.subhead')}</p>
            <h1 className="font-serif text-5xl md:text-6xl font-bold text-primary leading-[1.05]">
              {t('landing.headline')}
            </h1>
            <p className="mt-6 text-lg text-ink/75 max-w-lg">{t('landing.description')}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/upload" className="btn-primary text-base">
                {t('landing.ctaPrimary')}
              </Link>
              <Link href="/login" className="btn-ghost">
                {t('landing.ctaSecondary')}
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="rounded-3xl bg-[rgb(var(--color-card))] p-6 shadow-card">
              <div className="rounded-2xl bg-primary p-5 text-white">
                <p className="text-xs uppercase tracking-wide opacity-80">Sept · 30 days</p>
                <div className="mt-3 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs opacity-80">Revenue</p>
                    <p className="font-serif text-3xl font-bold">RM18,420</p>
                    <p className="text-xs text-accent">↑ RM1,240</p>
                  </div>
                  <div>
                    <p className="text-xs opacity-80">Profit</p>
                    <p className="font-serif text-3xl font-bold">RM4,110</p>
                    <p className="text-xs text-alert">↓ RM380</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                <ItemRow name="Teh Ais" amount="+RM1,680" color="bg-primary" width="w-[95%]" />
                <ItemRow name="Nasi Lemak Ayam" amount="+RM1,420" color="bg-primary" width="w-[78%]" />
                <ItemRow name="Nasi Lemak Biasa" amount="+RM980" color="bg-accent" width="w-[55%]" />
                <ItemRow name="Roti Canai" amount="+RM340" color="bg-accent" width="w-[22%]" />
                <ItemRow name="Nasi Lemak Salted Egg" amount="−RM310" color="bg-alert" width="w-[18%]" alert />
              </div>
            </div>

            <div className="absolute -right-4 -top-4 rotate-6 rounded-2xl bg-accent px-3 py-2 text-sm font-bold text-primary shadow-card">
              · {dict.brand}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-surface/50 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="font-serif text-4xl font-bold text-primary mb-10">
            {t('landing.howItWorks')}
          </h2>
          <div className="grid gap-6 md:grid-cols-4">
            <Step n={1} title={t('landing.step1Title')} desc={t('landing.step1Desc')} />
            <Step n={2} title={t('landing.step2Title')} desc={t('landing.step2Desc')} />
            <Step n={3} title={t('landing.step3Title')} desc={t('landing.step3Desc')} />
            <Step n={4} title={t('landing.step4Title')} desc={t('landing.step4Desc')} />
          </div>
        </div>
      </section>

      <footer className="mx-auto max-w-6xl px-6 py-10 text-sm text-ink/60">
        {t('landing.footer')}
      </footer>
    </main>
  );
}

function ItemRow({
  name,
  amount,
  color,
  width,
  alert,
}: {
  name: string;
  amount: string;
  color: string;
  width: string;
  alert?: boolean;
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-ink">{name}</span>
        <span className={`font-semibold ${alert ? 'text-alert' : 'text-primary'}`}>{amount}</span>
      </div>
      <div className="mt-1 h-2 rounded-full bg-bg">
        <div className={`h-2 rounded-full ${color} ${width}`} />
      </div>
    </div>
  );
}

function Step({ n, title, desc }: { n: number; title: string; desc: string }) {
  return (
    <div>
      <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary font-serif text-xl font-bold text-accent">
        {n}
      </div>
      <h3 className="font-serif mt-3 text-xl font-bold text-primary">{title}</h3>
      <p className="mt-1 text-ink/70 text-sm">{desc}</p>
    </div>
  );
}
