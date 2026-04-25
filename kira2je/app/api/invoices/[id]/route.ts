import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  const invoice = await prisma.invoice.findUnique({ where: { id: params.id } });
  if (!invoice || invoice.userId !== session.userId) {
    return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
  }

  const body = (await req.json()) as {
    supplierName?: string | null;
    invoiceDate?: string | null;
    total?: number | null;
    lineItems?: unknown;
    confidence?: string;
  };

  await prisma.invoice.update({
    where: { id: params.id },
    data: {
      ...(body.supplierName !== undefined && { supplierName: body.supplierName }),
      ...(body.invoiceDate !== undefined && {
        invoiceDate: body.invoiceDate ? new Date(body.invoiceDate) : null,
      }),
      ...(body.total !== undefined && { total: body.total }),
      ...(body.lineItems !== undefined && {
        lineItems: typeof body.lineItems === 'string'
          ? body.lineItems
          : JSON.stringify(body.lineItems),
      }),
      ...(body.confidence !== undefined && { ocrConfidence: body.confidence }),
    },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  const invoice = await prisma.invoice.findUnique({ where: { id: params.id } });
  if (!invoice || invoice.userId !== session.userId) {
    return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
  }

  await prisma.invoice.delete({ where: { id: params.id } });

  return NextResponse.json({ ok: true });
}
