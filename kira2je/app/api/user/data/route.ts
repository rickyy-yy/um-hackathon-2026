import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session) {
    console.error('[user/data] no session');
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const month = searchParams.get('month');
  console.log('[user/data] DELETE userId=%s month=%s', session.userId, month);

  try {
    if (month) {
      await prisma.report.deleteMany({ where: { userId: session.userId, month } });
      await prisma.posUpload.deleteMany({ where: { userId: session.userId, month } });
      await prisma.invoice.deleteMany({ where: { userId: session.userId, month } });
    } else {
      await prisma.report.deleteMany({ where: { userId: session.userId } });
      await prisma.posUpload.deleteMany({ where: { userId: session.userId } });
      await prisma.invoice.deleteMany({ where: { userId: session.userId } });
      await prisma.ingredientMapping.deleteMany({ where: { userId: session.userId } });
      await prisma.menuItemOverride.deleteMany({ where: { userId: session.userId } });
    }
    console.log('[user/data] deleted ok');
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[user/data] error', e);
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
