import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { llm } from '@/lib/llm';
import { getLocale } from '@/lib/i18n/server';

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });

  const locale = await getLocale();
  const { turnIndex, extracted, askedSoFar } = (await req.json()) as {
    turnIndex: number;
    extracted?: unknown;
    askedSoFar?: string[];
  };

  const turn = await llm({
    task: 'followup',
    turnIndex: turnIndex ?? 0,
    extracted: extracted ?? {},
    askedSoFar: askedSoFar ?? [],
    locale,
  });

  return NextResponse.json({ ok: true, turn });
}
