import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) return NextResponse.json({ ok: false }, { status: 404 });
  return NextResponse.json({ ok: true, user });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });

  const { name, businessName, businessType, posType, language } = (await req.json()) as {
    name?: string;
    businessName?: string;
    businessType?: string;
    posType?: string;
    language?: string;
  };

  await prisma.user.update({
    where: { id: session.userId },
    data: {
      name: name ?? businessName,
      businessName,
      businessType,
      posType,
      language: language ?? 'en',
    },
  });

  const locale = language === 'bm' ? 'bm' : 'en';
  cookies().set('kira2je_locale', locale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    httpOnly: false,
    sameSite: 'lax',
  });

  return NextResponse.json({ ok: true });
}
