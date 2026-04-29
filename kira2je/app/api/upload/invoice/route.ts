import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { llm } from '@/lib/llm';
import { assertBase64Payload, validateMonth } from '@/lib/uploads';

const MAX_INVOICE_BYTES = 10 * 1024 * 1024;
const MAX_FILES = 10;
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);

type FilePayload = {
  name: string;
  base64: string;
  mimeType: string;
};

function currentMonth(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });

  const body = (await req.json()) as { files: FilePayload[]; month?: string };
  const files = body.files;
  if (!files || files.length === 0) {
    return NextResponse.json({ ok: false, error: 'No files provided' }, { status: 400 });
  }
  if (files.length > MAX_FILES) {
    return NextResponse.json({ ok: false, error: `Upload up to ${MAX_FILES} files at a time` }, { status: 400 });
  }

  const month = validateMonth(body.month) ?? currentMonth();
  if (body.month && !validateMonth(body.month)) {
    return NextResponse.json({ ok: false, error: 'month must use YYYY-MM format' }, { status: 400 });
  }
  let created = 0;
  let lastError: string | null = null;

  for (const file of files) {
    try {
      if (!ALLOWED_MIME_TYPES.has(file.mimeType)) {
        throw new Error('Unsupported invoice file type');
      }
      const imageBase64 = assertBase64Payload(file.base64, MAX_INVOICE_BYTES, file.name || 'Invoice file');
      const ocr = await llm({
        task: 'invoice-ocr',
        imageBase64,
        mimeType: file.mimeType,
      });

      await prisma.invoice.create({
        data: {
          userId: session.userId,
          supplierName: ocr.supplierName ?? null,
          invoiceDate: ocr.invoiceDate ? new Date(ocr.invoiceDate) : null,
          total: ocr.total ?? null,
          lineItems: JSON.stringify(ocr.lineItems ?? []),
          ocrConfidence: ocr.confidence ?? 'medium',
          status: 'pending',
          month,
        },
      });

      created++;
    } catch (err) {
      lastError = (err as Error)?.message ?? 'Unknown error';
      console.error('[invoice-upload] OCR or DB error for file', file.name, lastError);
    }
  }

  if (created === 0) {
    const isApiKey = lastError?.includes('API key') || lastError?.includes('leaked') || lastError?.includes('PERMISSION_DENIED');
    const userMsg = isApiKey
      ? 'OCR failed: API key issue. Please contact support.'
      : `Could not read ${files.length > 1 ? 'any of the' : 'the'} invoice${files.length > 1 ? 's' : ''}. Try a clearer photo or PDF.`;
    return NextResponse.json({ ok: false, error: userMsg }, { status: 422 });
  }

  return NextResponse.json({ ok: true, count: created });
}
