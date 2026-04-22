import { cookies } from 'next/headers';
import crypto from 'crypto';

const COOKIE_NAME = 'kira2je_session';
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function secret() {
  return process.env.SESSION_SECRET || 'dev-secret-change-me-before-prod';
}

function sign(value: string) {
  return crypto.createHmac('sha256', secret()).update(value).digest('base64url');
}

export function createSessionToken(userId: string) {
  const payload = Buffer.from(JSON.stringify({ userId, iat: Date.now() })).toString('base64url');
  const sig = sign(payload);
  return `${payload}.${sig}`;
}

export function verifySessionToken(token: string | undefined): { userId: string } | null {
  if (!token) return null;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  if (sign(payload) !== sig) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (typeof parsed.userId !== 'string') return null;
    return { userId: parsed.userId };
  } catch {
    return null;
  }
}

export async function setSession(userId: string) {
  const token = createSessionToken(userId);
  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function clearSession() {
  cookies().delete(COOKIE_NAME);
}

export async function getSession(): Promise<{ userId: string } | null> {
  const token = cookies().get(COOKIE_NAME)?.value;
  return verifySessionToken(token);
}
