import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });

  const { name, pronoun, stallName, area, locale } = (await req.json()) as {
    name?: string;
    pronoun?: string;
    stallName?: string;
    area?: string;
    locale?: string;
  };

  await prisma.user.update({
    where: { id: session.userId },
    data: { name, pronoun, stallName, area, locale },
  });

  if (locale === 'en' || locale === 'ms') {
    cookies().set('kira2je_locale', locale, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      httpOnly: false,
      sameSite: 'lax',
    });
  }

  return NextResponse.json({ ok: true });
}
