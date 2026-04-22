import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { LOCALE_COOKIE } from '@/lib/i18n/server';

export async function POST(req: Request) {
  const { locale } = (await req.json()) as { locale?: string };
  if (locale !== 'ms' && locale !== 'en') {
    return NextResponse.json({ ok: false, error: 'Invalid locale' }, { status: 400 });
  }
  cookies().set(LOCALE_COOKIE, locale, {
    httpOnly: false, // readable by client JS so the toggle can render current state
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
  return NextResponse.json({ ok: true, locale });
}
