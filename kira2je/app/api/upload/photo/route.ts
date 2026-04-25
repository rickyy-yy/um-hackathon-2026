import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { llm } from '@/lib/llm';
import { getLocale } from '@/lib/i18n/server';

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });

  const { images } = (await req.json()) as {
    images?: { name: string; base64: string; mimeType: string }[];
  };
  if (!images || images.length === 0) {
    return NextResponse.json({ ok: false, error: 'No images provided' }, { status: 400 });
  }

  const locale = await getLocale();
  const month = currentMonth();
  let count = 0;

  for (const img of images) {
    try {
      const result = await llm({ task: 'invoice-ocr', imageBase64: img.base64, mimeType: img.mimeType, locale });
      await prisma.invoice.create({
        data: {
          userId: session.userId,
          supplierName: result.supplierName ?? undefined,
          invoiceDate: result.invoiceDate ? new Date(result.invoiceDate) : undefined,
          total: result.total ?? undefined,
          lineItems: JSON.stringify(result.lineItems),
          ocrConfidence: result.confidence,
          status: 'pending',
          month,
        },
      });
      count++;
    } catch (e) {
      console.error('[photo-upload] failed for image:', (e as Error)?.message);
    }
  }

  if (count === 0) {
    return NextResponse.json({ ok: false, error: 'Could not process any images' }, { status: 422 });
  }

  return NextResponse.json({ ok: true, count });
}
