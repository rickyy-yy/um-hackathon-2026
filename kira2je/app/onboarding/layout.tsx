import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (session) {
    const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { name: true } });
    if (user?.name) redirect('/dashboard');
  }
  return <>{children}</>;
}
