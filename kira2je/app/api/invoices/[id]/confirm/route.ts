import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  const invoice = await prisma.invoice.findUnique({ where: { id: params.id } });
  if (!invoice || invoice.userId !== session.userId) {
    return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
  }

  await prisma.invoice.update({
    where: { id: params.id },
    data: { status: 'confirmed' },
  });

  return NextResponse.json({ ok: true });
}
