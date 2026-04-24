import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { serverT } from '@/lib/i18n/server';
import { AppHeader } from '@/components/AppHeader';
import { OnboardingCards } from '@/components/OnboardingCards';

export default async function Onboarding() {
  const session = await getSession();
  if (!session) redirect('/');
  const { t } = await serverT();

  const cards = [
    { href: '/upload/csv', icon: 'file', title: t('onboarding.csvTitle'), desc: t('onboarding.csvDesc') },
    { href: '/upload/photo', icon: 'camera', title: t('onboarding.photoTitle'), desc: t('onboarding.photoDesc') },
    { href: '/upload/chat', icon: 'chat', title: t('onboarding.chatTitle'), desc: t('onboarding.chatDesc') },
  ];

  return (
    <main className="min-h-screen flex flex-col">
      <AppHeader title={t('onboarding.title')} />
      <div className="flex-1 px-6 pt-6 pb-16 max-w-4xl mx-auto w-full">
        <p className="text-kira-muted mb-8">{t('onboarding.subtitle')}</p>
        <OnboardingCards cards={cards} skipLabel={t('onboarding.skipToDashboard')} />
      </div>
    </main>
  );
}
