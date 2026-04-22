import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { llm } from '@/lib/llm';

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });

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
  });

  return NextResponse.json({ ok: true, turn });
}
