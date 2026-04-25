import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { llm } from '@/lib/llm';

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

  const month = body.month ?? currentMonth();
  let created = 0;
  let lastError: string | null = null;

  for (const file of files) {
    try {
      const ocr = await llm({
        task: 'invoice-ocr',
        imageBase64: file.base64,
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
