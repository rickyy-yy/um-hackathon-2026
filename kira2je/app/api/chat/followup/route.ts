// Deprecated: gap-filling conversation flow removed in pivot
import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json({ ok: false, error: 'This endpoint is no longer supported.' }, { status: 410 });
}
