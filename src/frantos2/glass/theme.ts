import { useSyncExternalStore } from 'react';

/** Light or dark glass. First visit follows the system; a choice is remembered. */
export type Theme = 'dark' | 'light';
const KEY = 'frantos-theme';
const ls = new Set<() => void>();

function initial(): Theme {
  try {
    const s = localStorage.getItem(KEY);
    if (s === 'dark' || s === 'light') return s;
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

let theme: Theme = typeof window === 'undefined' ? 'dark' : initial();

function apply() {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'light' ? '#f3f1ec' : '#101418');
}
apply();

export const getTheme = () => theme;

export function setTheme(t: Theme) {
  theme = t;
  try {
    localStorage.setItem(KEY, t);
  } catch {
    /* private mode */
  }
  apply();
  ls.forEach((f) => f());
}

export function useTheme() {
  const t = useSyncExternalStore(
    (f) => (ls.add(f), () => ls.delete(f)),
    () => theme,
    () => theme
  );
  return { theme: t, setTheme, toggle: () => setTheme(t === 'dark' ? 'light' : 'dark') };
}
