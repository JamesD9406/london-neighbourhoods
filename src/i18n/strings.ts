// All text lives in one file per language: en.ts, es.ts, ar.ts.
import { en, type Strings } from './en';
import { es } from './es';
import { ar } from './ar';

export type { Strings };

export const LANGS = ['en', 'es', 'ar'] as const;
export type Lang = (typeof LANGS)[number];

export const LANG_META: Record<Lang, { label: string; dir: 'ltr' | 'rtl' }> = {
  en: { label: 'English', dir: 'ltr' },
  es: { label: 'Español', dir: 'ltr' },
  ar: { label: 'العربية', dir: 'rtl' },
};

export const STRINGS: Record<Lang, Strings> = { en, es, ar };
