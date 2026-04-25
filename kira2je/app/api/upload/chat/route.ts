// Deprecated: text/chat input flow removed in pivot
import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json({ ok: false, error: 'This endpoint is no longer supported. Use /api/upload/invoice or /api/upload/pos instead.' }, { status: 410 });
}
