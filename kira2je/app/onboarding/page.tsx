import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { serverT } from '@/lib/i18n/server';
import { AppHeader } from '@/components/AppHeader';

export default async function Onboarding() {
  const session = await getSession();
  if (!session) redirect('/');
  const { t } = await serverT();

  return (
    <main className="min-h-screen flex flex-col">
      <AppHeader title={t('onboarding.title')} />

      <div className="flex-1 px-6 pt-6 pb-16 max-w-4xl mx-auto w-full">
        <p className="text-kira-muted mb-8">{t('onboarding.subtitle')}</p>

        <div className="grid gap-4 lg:grid-cols-3">
          <Link
            href="/upload/csv"
            className="card-sage block active:scale-[0.99] transition-transform"
          >
            <div className="flex items-start gap-4">
              <div className="text-3xl">📁</div>
              <div>
                <div className="font-semibold mb-1">{t('onboarding.csvTitle')}</div>
                <div className="text-sm text-kira-muted">{t('onboarding.csvDesc')}</div>
              </div>
            </div>
          </Link>

          <Link
            href="/upload/photo"
            className="card-sage block active:scale-[0.99] transition-transform"
          >
            <div className="flex items-start gap-4">
              <div className="text-3xl">📷</div>
              <div>
                <div className="font-semibold mb-1">{t('onboarding.photoTitle')}</div>
                <div className="text-sm text-kira-muted">{t('onboarding.photoDesc')}</div>
              </div>
            </div>
          </Link>

          <Link
            href="/upload/chat"
            className="card-sage block active:scale-[0.99] transition-transform"
          >
            <div className="flex items-start gap-4">
              <div className="text-3xl">💬</div>
              <div>
                <div className="font-semibold mb-1">{t('onboarding.chatTitle')}</div>
                <div className="text-sm text-kira-muted">{t('onboarding.chatDesc')}</div>
              </div>
            </div>
          </Link>
        </div>

        <div className="mt-8 text-center">
          <Link href="/dashboard" className="text-sm text-kira-muted underline">
            {t('onboarding.skipToDashboard')}
          </Link>
        </div>
      </div>
    </main>
  );
}
