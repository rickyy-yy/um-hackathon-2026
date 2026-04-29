import { cookies } from 'next/headers';
import { DEFAULT_LOCALE, translate, type Locale, type TranslationKey } from './dictionary';

export const LOCALE_COOKIE = 'kira2je_locale';

export async function getLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const v = cookieStore.get(LOCALE_COOKIE)?.value;
  return v === 'en' || v === 'bm' ? v : DEFAULT_LOCALE;
}

export function t(key: TranslationKey, locale: Locale, vars?: Record<string, string | number>) {
  return translate(key, locale, vars);
}

// Helper to build a bound `t(key, vars?)` for a page where locale is already resolved.
export async function serverT() {
  const locale = await getLocale();
  return {
    locale,
    t: (key: TranslationKey, vars?: Record<string, string | number>) =>
      translate(key, locale, vars),
  };
}
