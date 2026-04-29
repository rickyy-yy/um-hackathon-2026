import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { llm } from '@/lib/llm';
import { getLocale } from '@/lib/i18n/server';
import { assertBase64Payload, validateMonth } from '@/lib/uploads';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_IMAGES = 10;
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });

  const body = (await req.json()) as {
    images?: { name: string; base64: string; mimeType: string }[];
    month?: string;
  };
  const { images } = body;
  if (!images || images.length === 0) {
    return NextResponse.json({ ok: false, error: 'No images provided' }, { status: 400 });
  }
  if (images.length > MAX_IMAGES) {
    return NextResponse.json({ ok: false, error: `Upload up to ${MAX_IMAGES} images at a time` }, { status: 400 });
  }

  const locale = await getLocale();
  const month = validateMonth(body.month) ?? currentMonth();
  if (body.month && !validateMonth(body.month)) {
    return NextResponse.json({ ok: false, error: 'month must use YYYY-MM format' }, { status: 400 });
  }
  let count = 0;

  for (const img of images) {
    try {
      if (!ALLOWED_IMAGE_TYPES.has(img.mimeType)) {
        throw new Error('Unsupported image file type');
      }
      const imageBase64 = assertBase64Payload(img.base64, MAX_IMAGE_BYTES, img.name || 'Image');
      const result = await llm({ task: 'invoice-ocr', imageBase64, mimeType: img.mimeType, locale });
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
      const msg = (e as Error)?.message ?? 'Unknown error';
      console.error('[photo-upload] OCR failed:', msg);
      // Propagate a meaningful error on first failure so the UI can show it
      if (count === 0 && images.indexOf(img) === images.length - 1) {
        const isGemini = msg.includes('API key') || msg.includes('expired') || msg.includes('PERMISSION_DENIED');
        const userMsg = isGemini
          ? 'OCR service error: Gemini API key is expired. Please update GEMINI_API_KEY in .env.local.'
          : `OCR failed: ${msg}`;
        return NextResponse.json({ ok: false, error: userMsg }, { status: 422 });
      }
    }
  }

  if (count === 0) {
    return NextResponse.json({ ok: false, error: 'Could not read any of the provided images.' }, { status: 422 });
  }

  return NextResponse.json({ ok: true, count });
}
