const BASE64_PREFIX_RE = /^data:([^;]+);base64,/;

export function stripBase64Prefix(value: string): string {
  return value.replace(BASE64_PREFIX_RE, '');
}

export function decodedBase64Size(value: string): number {
  const base64 = stripBase64Prefix(value);
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor((base64.length * 3) / 4) - padding);
}

export function assertBase64Payload(value: string, maxBytes: number, label = 'File') {
  const base64 = stripBase64Prefix(value);
  if (!base64 || !/^[A-Za-z0-9+/=_-]+$/.test(base64)) {
    throw new Error(`${label} is not valid base64.`);
  }

  const size = decodedBase64Size(base64);
  if (size > maxBytes) {
    const mb = Math.floor(maxBytes / 1024 / 1024);
    throw new Error(`${label} is too large. Maximum size is ${mb}MB.`);
  }

  return base64;
}

export function validateMonth(value: string | undefined): string | null {
  if (!value) return null;
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value) ? value : null;
}

export function fileExtension(fileName: string): string {
  return fileName.split('.').pop()?.toLowerCase() ?? '';
}
