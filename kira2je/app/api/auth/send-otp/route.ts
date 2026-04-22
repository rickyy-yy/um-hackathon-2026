import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const { phone } = (await req.json()) as { phone?: string };
  if (!phone || phone.replace(/\D/g, '').length < 9) {
    return NextResponse.json({ ok: false, error: 'Nombor telefon tidak sah' }, { status: 400 });
  }
  return NextResponse.json({ ok: true, hint: 'Masukkan apa-apa 6 digit untuk demo' });
}
