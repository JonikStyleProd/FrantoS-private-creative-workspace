import { useSyncExternalStore } from 'react';
import { ru } from './ru';
import { he } from './he';

/**
 * FrantoS i18n: English source strings are the keys.
 *   t('Open demo workspace') → localized string, falls back to English.
 *   t('{n} open', { n: 3 })  → interpolation.
 * Hebrew switches the document to dir="rtl"; works (images, video, A/B) are never mirrored.
 */
export type Lang = 'en' | 'ru' | 'he';
export const LANGS: { id: Lang; label: string; name: string }[] = [
  { id: 'en', label: 'EN', name: 'English' },
  { id: 'ru', label: 'RU', name: 'Русский' },
  { id: 'he', label: 'עב', name: 'עברית' },
];

const DICTS: Record<Lang, Record<string, string>> = { en: {}, ru, he };
const KEY = 'frantos-lang';

function detect(): Lang {
  try {
    const saved = localStorage.getItem(KEY) ?? localStorage.getItem('frantos_language');
    if (saved === 'en' || saved === 'ru' || saved === 'he') return saved;
    const nav = (navigator.languages?.[0] || navigator.language || '').toLowerCase();
    if (nav.startsWith('he') || nav.startsWith('iw')) return 'he';
    if (nav.startsWith('ru')) return 'ru';
  } catch {
    /* ignore */
  }
  return 'en';
}

let lang: Lang = typeof window === 'undefined' ? 'en' : detect();
const ls = new Set<() => void>();

function apply() {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'he' ? 'rtl' : 'ltr';
}
apply();

export function setLang(l: Lang) {
  lang = l;
  try {
    localStorage.setItem(KEY, l);
    // keep the v1 atelier in step where it can follow (en/ru)
    if (l !== 'he') localStorage.setItem('frantos_language', l);
  } catch {
    /* ignore */
  }
  apply();
  ls.forEach((f) => f());
}

export function getLang() {
  return lang;
}

export function tr(s: string, vars?: Record<string, string | number>, l: Lang = lang) {
  let out = DICTS[l][s] ?? s;
  if (vars) for (const [k, v] of Object.entries(vars)) out = out.split(`{${k}}`).join(String(v));
  return out;
}

export function useI18n() {
  const l = useSyncExternalStore(
    (f) => (ls.add(f), () => ls.delete(f)),
    () => lang,
    () => lang
  );
  return {
    lang: l,
    dir: (l === 'he' ? 'rtl' : 'ltr') as 'rtl' | 'ltr',
    setLang,
    t: (s: string, vars?: Record<string, string | number>) => tr(s, vars, l),
    locale: l === 'ru' ? 'ru-RU' : l === 'he' ? 'he-IL' : 'en-GB',
  };
}

/** Relative time in the current language. */
export function ago(t: number, l: Lang = lang) {
  const s = Math.round((Date.now() - t) / 1000);
  const rtf = new Intl.RelativeTimeFormat(l === 'ru' ? 'ru' : l === 'he' ? 'he' : 'en', { numeric: 'auto', style: 'short' });
  if (s < 45) return tr('just now', undefined, l);
  const m = Math.round(s / 60);
  if (m < 60) return rtf.format(-m, 'minute');
  const h = Math.round(m / 60);
  if (h < 24) return rtf.format(-h, 'hour');
  const d = Math.round(h / 24);
  return rtf.format(-d, 'day');
}
