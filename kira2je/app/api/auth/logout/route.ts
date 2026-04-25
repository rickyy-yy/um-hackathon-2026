import { NextResponse } from 'next/server';
import { clearSession } from '@/lib/auth';

async function logout(request: Request) {
  await clearSession();
  return NextResponse.redirect(new URL('/', new URL(request.url).origin));
}

export const GET = logout;
export const POST = logout;
