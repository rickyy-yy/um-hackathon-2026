import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { setSession } from '@/lib/auth';

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('60')) return `+${digits}`;
  if (digits.startsWith('0')) return `+60${digits.slice(1)}`;
  return `+60${digits}`;
}

export async function POST(req: Request) {
  const { phone, otp } = (await req.json()) as { phone?: string; otp?: string };
  if (!phone || !otp || !/^\d{6}$/.test(otp)) {
    return NextResponse.json({ ok: false, error: 'OTP mesti 6 digit' }, { status: 400 });
  }

  const normalized = normalizePhone(phone);
  let user = await prisma.user.findUnique({ where: { phone: normalized } });
  let isNew = false;
  if (!user) {
    user = await prisma.user.create({ data: { phone: normalized } });
    isNew = true;
  }

  await setSession(user.id);

  const latestReport = await prisma.report.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({
    ok: true,
    isNew,
    hasProfile: !!user.name,
    hasReport: !!latestReport,
    reportId: latestReport?.id ?? null,
  });
}
