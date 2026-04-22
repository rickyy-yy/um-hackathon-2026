'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { en, type I18nDict } from './en';
import { ms } from './ms';
import { zh } from './zh';

export type Language = 'en' | 'ms' | 'zh';
const DICTS: Record<Language, I18nDict> = { en, ms, zh };
const STORAGE_KEY = 'kira2lah.language';

type I18nContextValue = {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (path: string, fallback?: string) => string;
  dict: I18nDict;
};

const I18nContext = createContext<I18nContextValue | null>(null);

function detectInitialLanguage(): Language {
  if (typeof window === 'undefined') return 'en';
  const stored = localStorage.getItem(STORAGE_KEY) as Language | null;
  if (stored && stored in DICTS) return stored;
  const nav = navigator.language?.slice(0, 2).toLowerCase();
  if (nav === 'ms' || nav === 'zh') return nav;
  return 'en';
}

function lookup(dict: I18nDict, path: string): string | undefined {
  const parts = path.split('.');
  let cur: unknown = dict;
  for (const p of parts) {
    if (cur && typeof cur === 'object' && p in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[p];
    } else {
      return undefined;
    }
  }
  return typeof cur === 'string' ? cur : undefined;
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>('en');

  useEffect(() => {
    setLangState(detectInitialLanguage());
  }, []);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
    }
  }, [lang]);

  const setLang = useCallback((l: Language) => {
    setLangState(l);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, l);
    }
  }, []);

  const dict = DICTS[lang];
  const t = useCallback(
    (path: string, fallback?: string) => lookup(dict, path) ?? fallback ?? path,
    [dict]
  );

  return <I18nContext.Provider value={{ lang, setLang, t, dict }}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    // Fallback for server rendering — default to English.
    return {
      lang: 'en',
      setLang: () => {},
      dict: en,
      t: (path, fallback) => lookup(en, path) ?? fallback ?? path,
    };
  }
  return ctx;
}

export function messageForApiError(err: unknown, t: (key: string, fallback?: string) => string): string {
  const asAny = err as { code?: string | null; message?: string } | null;
  if (asAny?.code) {
    return t(`errors.${asAny.code}`, asAny.message || t('errors.generic'));
  }
  return asAny?.message || t('errors.generic');
}
