/**
 * Thin fetch wrapper.
 *
 * Endpoints are hit at the same origin the browser is on (`/api/...`), and
 * Next.js proxies them to the backend over the Docker network (see
 * `next.config.js`). Credentials are always included so the httpOnly
 * session/guest cookies travel with the request.
 */
export class ApiError extends Error {
  status: number;
  payload: unknown;
  /** Machine-readable error code extracted from the response detail (e.g. ERR_PHONE_INVALID). */
  code: string | null;

  constructor(status: number, code: string | null, message: string, payload: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.payload = payload;
  }
}

function extractCode(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const detail = (payload as Record<string, unknown>).detail;
  if (typeof detail === 'string' && /^ERR_[A-Z0-9_]+/.test(detail)) {
    return detail.split(':')[0];
  }
  return null;
}

function currentShopId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('kira2lah.shop_id');
}

function currentLanguage(): string {
  if (typeof window === 'undefined') return 'en';
  return localStorage.getItem('kira2lah.language') || 'en';
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Preferred-Language': currentLanguage(),
    ...((init.headers as Record<string, string>) || {}),
  };
  const shop = currentShopId();
  if (shop) headers['X-Shop-Id'] = shop;

  const res = await fetch(path, {
    credentials: 'include',
    ...init,
    headers,
  });

  let payload: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  if (!res.ok) {
    const detail =
      (payload && typeof payload === 'object' && 'detail' in payload
        ? String((payload as Record<string, unknown>).detail)
        : res.statusText) || 'Request failed';
    throw new ApiError(res.status, extractCode(payload), detail, payload);
  }
  return payload as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  upload: async <T>(path: string, formData: FormData): Promise<T> => {
    const headers: Record<string, string> = {
      'X-Preferred-Language': currentLanguage(),
    };
    const shop = currentShopId();
    if (shop) headers['X-Shop-Id'] = shop;

    const res = await fetch(path, {
      method: 'POST',
      credentials: 'include',
      headers,
      body: formData,
    });
    const text = await res.text();
    const payload = text ? JSON.parse(text) : null;
    if (!res.ok) {
      throw new ApiError(res.status, extractCode(payload), payload?.detail || res.statusText, payload);
    }
    return payload as T;
  },
};

export function setActiveShop(shopId: string | null) {
  if (typeof window === 'undefined') return;
  if (shopId) localStorage.setItem('kira2lah.shop_id', shopId);
  else localStorage.removeItem('kira2lah.shop_id');
}

export function getActiveShop(): string | null {
  return currentShopId();
}
