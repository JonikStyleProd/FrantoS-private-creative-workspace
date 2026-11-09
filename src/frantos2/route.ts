import { useSyncExternalStore } from 'react';

/**
 * Hash routes (no server rewrites needed on Vercel):
 *   #/                       landing
 *   #/story[/n]              finished story, viewer mode (n = slide)
 *   #/studio                 demo project editor
 *   #/studio/present[/n]     presentation launched from the editor
 *   #/overview, #/catalog …  legacy atelier (FrantoS v1), unchanged
 */
export type Route =
  | { name: 'landing' }
  | { name: 'story'; slide: number }
  | { name: 'studio' }
  | { name: 'present'; slide: number }
  | { name: 'legacy' }
  | { name: 'app' }
  | { name: 'afterhours' }
  | { name: 'team' }
  | { name: 'join'; token: string }
  | { name: 'guest'; token: string; workId?: string; q: URLSearchParams }
  | { name: 'case'; slug: string }
  | { name: 'pcase'; id: string }
  | { name: 'project'; id: string; tab: ProjectTab; sub?: string; q: URLSearchParams }
  | { name: 'pshow'; id: string; mode: 'presentation' | 'story'; slide: number };

export type ProjectTab = 'overview' | 'materials' | 'moodboard' | 'review' | 'stories';
const TABS: ProjectTab[] = ['overview', 'materials', 'moodboard', 'review', 'stories'];

const LEGACY = new Set(['overview', 'feed', 'catalog', 'workspace', 'moodboard', 'atmosphere', 'weather', 'atelier']);

export function parse(hash: string): Route {
  const raw = hash.replace(/^#\/?/, '');
  const [path, query = ''] = raw.split('?');
  const parts = path.split('/').filter(Boolean).map(decodeURIComponent);
  const [a, b, c, d] = parts;
  if (!a) return { name: 'landing' };
  if (a === 'app') return { name: 'app' };
  if (a === 'after-hours') return { name: 'afterhours' };
  if (a === 'team') return { name: 'team' };
  if (a === 'join' && b) return { name: 'join', token: b };
  if (a === 'r' && b) return { name: 'guest', token: b, workId: c, q: new URLSearchParams(query) };
  if (a === 'c' && b) return { name: 'case', slug: b };
  if (a === 'p' && b) {
    if (c === 'present') return { name: 'pshow', id: b, mode: 'presentation', slide: num(d) };
    if (c === 'stories' && d === 'play') return { name: 'pshow', id: b, mode: 'story', slide: num(parts[4]) };
    if (c === 'case') return { name: 'pcase', id: b };
    const tab = (TABS as string[]).includes(c ?? '') ? (c as ProjectTab) : 'overview';
    return { name: 'project', id: b, tab, sub: d, q: new URLSearchParams(query) };
  }
  if (a === 'story') return { name: 'story', slide: num(b) };
  if (a === 'studio') {
    // the stage-1 sequence editor now lives in the project model
    if (b === 'present') return { name: 'pshow', id: 'after-hours', mode: 'story', slide: num(c) };
    return { name: 'project', id: 'after-hours', tab: 'stories', q: new URLSearchParams() };
  }
  if (LEGACY.has(a)) return { name: 'legacy' };
  return { name: 'landing' };
}

const num = (s?: string) => {
  const n = parseInt(s ?? '', 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

let current = typeof window === 'undefined' ? '' : window.location.hash;
const listeners = new Set<() => void>();
const sync = () => {
  if (window.location.hash !== current) {
    current = window.location.hash;
    listeners.forEach((l) => l());
  }
};
if (typeof window !== 'undefined') {
  window.addEventListener('hashchange', sync);
  window.addEventListener('popstate', sync);
}

export function useHash() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => current,
    () => ''
  );
}

/** Navigate. `replace` keeps history clean for slide-by-slide changes. */
export function go(path: string, opts: { replace?: boolean } = {}) {
  const hash = path === '/' ? '#/' : `#${path}`;
  const depth = (window.history.state?.f2depth ?? 0) as number;
  if (opts.replace) window.history.replaceState({ f2depth: depth }, '', hash);
  else window.history.pushState({ f2depth: depth + 1 }, '', hash);
  sync();
}

/** Leave the current screen: real browser "back" when we came from inside the app, otherwise go to fallback. */
export function leave(fallback: string) {
  const depth = (window.history.state?.f2depth ?? 0) as number;
  if (depth > 0) window.history.back();
  else go(fallback, { replace: true });
}
