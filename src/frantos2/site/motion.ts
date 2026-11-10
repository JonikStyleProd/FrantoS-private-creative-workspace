import { CURVES } from '../kits/curves';
import type { SiteAnim, SiteEnter, SiteHover, SiteKey, SiteNode } from '../ws/types';
import { colorCss } from './theme';
import { walk } from './model';

/**
 * Motion for pages. Entrances are CSS keyframes that wait paused until the element (or its container)
 * gets `.is-in` — on load or when scrolled into view. Keyframes animate the individual `translate`,
 * `scale` and `rotate` properties and end in the element's own state, so hover (which uses `transform`)
 * and parallax never fight them. Counting numbers and parallax need the tiny runtime below.
 */

export const ENTERS: { id: SiteEnter; label: string; text?: boolean }[] = [
  { id: 'fade', label: 'Fade in' },
  { id: 'rise', label: 'Rise' },
  { id: 'slide', label: 'Slide in' },
  { id: 'zoom', label: 'Zoom in' },
  { id: 'mask', label: 'Reveal' },
  { id: 'blur', label: 'Focus' },
  { id: 'words', label: 'Word by word', text: true },
  { id: 'count', label: 'Count up', text: true },
  { id: 'custom', label: 'Keyframes' },
];

export const easeCss = (id?: string) => {
  const c = CURVES.find((x) => x.id === id) ?? CURVES.find((x) => x.id === 'frantos')!;
  return `cubic-bezier(${c.v.join(',')})`;
};

export const defaultAnim = (enter: SiteEnter, n: SiteNode): SiteAnim => ({
  enter,
  trigger: 'scroll',
  dur: enter === 'words' ? 700 : enter === 'count' ? 1400 : enter === 'mask' ? 1000 : 800,
  delay: 0,
  ease: enter === 'zoom' || enter === 'mask' ? 'expo-out' : 'frantos',
  ...(enter === 'rise' || enter === 'slide' ? { dist: 32 } : {}),
  ...(enter === 'words' ? { stagger: 60 } : {}),
  ...(enter === 'custom'
    ? { keys: [{ at: 0, y: 40, opacity: 0, rotate: -4 }, { at: 0.6, y: -6, opacity: 1 }, { at: 1, y: 0, rotate: 0 }] }
    : {}),
  ...(n.type === 'section' || n.type === 'stack' || n.type === 'grid' ? { stagger: 90 } : {}),
});

const isBox = (n: SiteNode) => n.type === 'section' || n.type === 'stack' || n.type === 'grid';
/** a container with a stagger animates its children one after another, not itself */
export const staggers = (n: SiteNode) => !!n.anim && isBox(n) && !!n.anim.stagger && n.anim.enter !== 'words' && n.anim.enter !== 'count';

function frames(a: SiteAnim, rtl: boolean): string {
  const d = a.dist ?? 32;
  switch (a.enter) {
    case 'fade':
    case 'count':
      return 'from{opacity:0}to{opacity:1}';
    case 'rise':
      return `from{opacity:0;translate:0 ${d}px}to{opacity:1;translate:0 0}`;
    case 'slide':
      return `from{opacity:0;translate:${rtl ? d : -d}px 0}to{opacity:1;translate:0 0}`;
    case 'zoom':
      return 'from{opacity:0;scale:.9}to{opacity:1;scale:1}';
    case 'mask':
      return 'from{clip-path:inset(0 0 100% 0)}to{clip-path:inset(0 0 0 0)}';
    case 'blur':
      return 'from{opacity:0;filter:blur(14px)}to{opacity:1;filter:blur(0)}';
    case 'words':
      return 'from{opacity:0;translate:0 .55em}to{opacity:1;translate:0 0}';
    case 'custom': {
      const keys = [...(a.keys ?? [])].sort((x, y) => x.at - y.at);
      if (!keys.length || keys[0].at > 0) keys.unshift({ at: 0 });
      if (keys[keys.length - 1].at < 1) keys.push({ at: 1 });
      const k = (x: SiteKey) => `translate:${x.x ?? 0}px ${x.y ?? 0}px;scale:${x.scale ?? 1};rotate:${x.rotate ?? 0}deg;opacity:${x.opacity ?? 1}`;
      return keys.map((x) => `${Math.round(Math.max(0, Math.min(1, x.at)) * 1000) / 10}%{${k(x)}}`).join('');
    }
  }
}

/** how long a node's entrance takes in all, children and words included */
export function spanOf(n: SiteNode): number {
  const a = n.anim;
  if (!a) return 0;
  let extra = 0;
  if (staggers(n)) extra = Math.max(0, (n.children?.length ?? 1) - 1) * (a.stagger ?? 0);
  if (a.enter === 'words') extra = Math.max(0, (n.text ?? '').split(/\s+/).filter(Boolean).length - 1) * (a.stagger ?? 60);
  return a.delay + a.dur + extra;
}
export function pageSpan(root: SiteNode[]): number {
  let m = 0;
  walk(root, (n) => (m = Math.max(m, spanOf(n))));
  return m;
}

export type MotionMode = 'off' | 'on' | 'play';

/** CSS for entrances, hover states and parallax of every node in the tree */
export function motionCss(root: SiteNode[], rtl: boolean, mode: MotionMode, cls: (id: string) => string): string {
  const out: string[] = [];
  walk(root, (n) => {
    const c = cls(n.id);
    const sel = `.fs-page .${c}`;
    const a = n.anim;
    if (a && mode !== 'off') {
      const k = `k-${c}`;
      const ease = easeCss(a.ease);
      const loop = a.enter === 'custom' && a.loop;
      const fill = a.enter === 'custom' ? 'both' : 'backwards';
      out.push(`@keyframes ${k}{${frames(a, rtl)}}`);
      const run = (target: string, delay: string) => `${target}{animation:${k} ${a.dur}ms ${ease} ${delay} ${loop ? 'infinite' : '1'} ${fill};animation-play-state:paused}`;
      if (staggers(n)) {
        out.push(run(`.fs-page .sa-${c}`, `calc(${a.delay}ms + var(--i) * ${a.stagger}ms)`));
        out.push(`${sel}.is-in .sa-${c}{animation-play-state:running}`);
      } else if (a.enter === 'words') {
        out.push(run(`${sel} .w`, `calc(${a.delay}ms + var(--i) * ${a.stagger ?? 60}ms)`));
        out.push(`${sel} .w{display:inline-block}`, `${sel}.is-in .w{animation-play-state:running}`);
      } else {
        out.push(run(sel, `${a.delay}ms`), `${sel}.is-in{animation-play-state:running}`);
      }
    }
    const h = n.hover;
    if (h && (h.lift || (h.scale && h.scale !== 1) || h.bright || h.shadow || h.bg || h.color)) {
      const d = `${h.dur ?? 300}ms ${easeCss(h.ease)}`;
      out.push(`${sel}{transition:transform ${d},filter ${d},box-shadow ${d},background-color ${d},color ${d},opacity .2s}`);
      const tf = [h.lift ? `translateY(-${h.lift}px)` : '', h.scale && h.scale !== 1 ? `scale(${h.scale})` : ''].filter(Boolean).join(' ');
      const decl = [tf && `transform:${tf}`, h.bright && 'filter:brightness(1.08) saturate(1.05)', h.shadow && 'box-shadow:0 22px 48px -22px rgba(0,0,0,.42)', h.bg && `background-color:${colorCss(h.bg)}`, h.color && `color:${colorCss(h.color)}`].filter(Boolean).join(';');
      out.push(`${sel}:hover,${sel}:focus-visible{${decl}}`);
    }
  });
  if (mode === 'on') out.push('@media (prefers-reduced-motion: reduce){.fs-page *{animation:none!important;transition:none!important}}');
  return out.join('\n');
}

/* ───────── runtime ───────── */

/**
 * Start a rendered page's motion: load entrances at once, scroll ones as they come into view,
 * numbers count, depth moves with the scroll, Lottie plays. `all` starts everything at once (the editor's Play).
 * Self-contained on purpose: exported sites ship this very function as js/motion.js.
 */
export function motionRuntime(root: HTMLElement, opts: { all?: boolean; count?: boolean } = {}): () => void {
  const reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const still = reduced && !opts.all;
  const countUp = (el: HTMLElement, dur: number) => {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const nodes: Text[] = [];
    while (walker.nextNode()) nodes.push(walker.currentNode as Text);
    const t = nodes.find((x) => /\d/.test(x.data));
    if (!t) return;
    const src = t.data;
    const m = src.match(/\d[\d\s.,\u00a0\u202f]*\d|\d/);
    if (!m) return;
    const raw = m[0];
    const sepm = raw.match(/[\s.,\u00a0\u202f](?=\d{3}(\D|$))/);
    const sep = sepm ? sepm[0] : '';
    const target = parseInt(raw.replace(/\D/g, ''), 10);
    const fmt = (v: number) => {
      const s = String(Math.round(v));
      return sep ? s.replace(/\B(?=(\d{3})+(?!\d))/g, sep) : s;
    };
    const t0 = performance.now();
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / dur);
      t.data = src.replace(raw, fmt(target * (1 - Math.pow(1 - k, 3))));
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  const els = Array.from(root.querySelectorAll<HTMLElement>('[data-a]'));
  const start = (el: HTMLElement) => {
    if (el.classList.contains('is-in')) return;
    el.classList.add('is-in');
    if (el.dataset.count && opts.count !== false && !still) countUp(el, +el.dataset.count);
  };
  let io: IntersectionObserver | undefined;
  if (opts.all || still || typeof IntersectionObserver === 'undefined') els.forEach(start);
  else {
    const obs = new IntersectionObserver(
      (es) =>
        es.forEach((e) => {
          if (e.isIntersecting) {
            start(e.target as HTMLElement);
            obs.unobserve(e.target);
          }
        }),
      { threshold: 0.12, rootMargin: '0px 0px -6% 0px' }
    );
    io = obs;
    requestAnimationFrame(() => els.forEach((el) => (el.dataset.a === 'load' ? start(el) : obs.observe(el))));
  }
  // parallax
  const deep = still ? [] : Array.from(root.querySelectorAll<HTMLElement>('[data-depth]'));
  let raf = 0;
  const tick = () => {
    raf = 0;
    const vh = window.innerHeight;
    for (const el of deep) {
      const r = el.getBoundingClientRect();
      if (r.bottom < -200 || r.top > vh + 200) continue;
      el.style.translate = '0 ' + (-(r.top + r.height / 2 - vh / 2) * +(el.dataset.depth || 0)).toFixed(1) + 'px';
    }
  };
  const onScroll = () => {
    if (!raf) raf = requestAnimationFrame(tick);
  };
  if (deep.length) {
    document.addEventListener('scroll', onScroll, { capture: true, passive: true });
    window.addEventListener('resize', onScroll);
    tick();
  }
  // Lottie in an exported site: the player and the animation data come as scripts (works from file://)
  const w = window as unknown as { lottie?: { loadAnimation: (o: object) => { destroy: () => void } }; __fsLottie?: Record<string, object> };
  const players: { destroy: () => void }[] = [];
  if (w.lottie && w.__fsLottie)
    root.querySelectorAll<HTMLElement>('[data-lottie-key]').forEach((el) => {
      const data = w.__fsLottie![el.dataset.lottieKey!];
      if (data) players.push(w.lottie!.loadAnimation({ container: el, renderer: 'svg', loop: true, autoplay: !reduced, animationData: data }));
    });
  return () => {
    if (io) io.disconnect();
    cancelAnimationFrame(raf);
    document.removeEventListener('scroll', onScroll, { capture: true });
    window.removeEventListener('resize', onScroll);
    players.forEach((p) => p.destroy());
  };
}
export const runMotion = motionRuntime;

/** the runtime as a script file for exported sites */
export const motionScript = () => `/* FrantoS · page motion */\n(function(){var run=${motionRuntime.toString()};var go=function(){document.querySelectorAll('.fs-page').forEach(function(r){run(r,{})})};document.readyState==='loading'?document.addEventListener('DOMContentLoaded',go):go();})();\n`;

/**
 * One click: tasteful motion for a whole page. The first screens play on load as a short sequence
 * (eyebrow, headline word by word, text, buttons, picture); further down things enter as they are
 * scrolled to: grids of cards one by one, pictures zoom, headings rise. Header and footer stay still.
 */
export function autoMotion(root: SiteNode[]): SiteNode[] {
  let firstHeading = true;
  const hovers = (x: SiteNode): SiteNode => {
    const y = { ...x };
    if (!y.hover && y.type === 'button') y.hover = { lift: 2, dur: 220, ease: 'standard' };
    if (!y.hover && y.type === 'media') y.hover = { scale: 1.02, bright: true, dur: 500, ease: 'expo-out' };
    if (y.children) y.children = y.children.map(hovers);
    return y;
  };
  const isGroup = (n: SiteNode) => n.type === 'stack' && (n.children?.length ?? 0) > 1 && n.children!.every((k) => k.type === 'button');
  const isCards = (n: SiteNode) => n.type === 'grid' && (n.children?.length ?? 0) > 2 && n.children!.every((k) => k.type !== 'stack' || !(k.children ?? []).some((c) => c.type === 'heading' && c.level === 1));
  const section = (sec: SiteNode, onLoad: boolean): SiteNode => {
    if (sec.tag === 'header' || sec.tag === 'footer' || sec.tag === 'nav') return hovers(sec);
    let d = onLoad ? 100 : 0;
    const step = () => {
      const v = d;
      d = Math.min(d + 140, onLoad ? 900 : 420);
      return v;
    };
    const trig = onLoad ? 'load' : 'scroll';
    const fix = (n: SiteNode): SiteNode => {
      const x: SiteNode = { ...n };
      if (x.anim) return x;
      if (isCards(x)) return { ...x, anim: { enter: 'rise', trigger: 'scroll', dur: 800, delay: 0, ease: 'frantos', dist: 40, stagger: 110 } };
      if (isGroup(x)) return { ...x, anim: { enter: 'rise', trigger: trig, dur: 650, delay: step(), ease: 'frantos', dist: 16, stagger: 90 } };
      if (x.type === 'heading' && x.level === 1 && firstHeading) {
        firstHeading = false;
        return { ...x, anim: { enter: 'words', trigger: trig, dur: 750, delay: step(), ease: 'frantos', stagger: 70 } };
      }
      if (x.type === 'heading') return { ...x, anim: { enter: 'rise', trigger: trig, dur: 800, delay: step(), ease: 'frantos', dist: 24 } };
      if (x.type === 'text' || x.type === 'button') return { ...x, anim: { enter: 'fade', trigger: trig, dur: 700, delay: step(), ease: 'standard' } };
      if (x.type === 'media' || x.type === 'object') return { ...x, anim: { enter: onLoad ? 'mask' : 'zoom', trigger: trig, dur: onLoad ? 1100 : 1000, delay: onLoad ? 200 : 0, ease: 'expo-out' } };
      if (x.children) x.children = x.children.map(fix);
      return x;
    };
    return hovers(fix(sec));
  };
  let seen = 0;
  return root.map((s) => {
    const top = s.tag !== 'header' && seen++ === 0;
    return section(s, top);
  });
}

/* ───────── motion at any moment (frames for video, GIF and Lottie) ───────── */

/** what an element looks like at a moment of its entrance */
export interface MState {
  opacity: number;
  tx: number;
  ty: number;
  scale: number;
  rotate: number;
  /** % hidden from the bottom (the reveal) */
  clip: number;
  blur: number;
}
export const STILL: MState = { opacity: 1, tx: 0, ty: 0, scale: 1, rotate: 0, clip: 0, blur: 0 };

/** cubic-bezier easing, as CSS solves it */
export function bezier(x1: number, y1: number, x2: number, y2: number) {
  const cx = 3 * x1,
    bx = 3 * (x2 - x1) - cx,
    ax = 1 - cx - bx;
  const cy = 3 * y1,
    by = 3 * (y2 - y1) - cy,
    ay = 1 - cy - by;
  const sx = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sy = (t: number) => ((ay * t + by) * t + cy) * t;
  const dx = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) {
      const e = sx(t) - x;
      if (Math.abs(e) < 1e-6) break;
      const d = dx(t);
      if (Math.abs(d) < 1e-6) break;
      t -= e / d;
    }
    let lo = 0,
      hi = 1;
    if (Math.abs(sx(t) - x) > 1e-4)
      for (let i = 0; i < 30; i++) {
        t = (lo + hi) / 2;
        sx(t) < x ? (lo = t) : (hi = t);
      }
    return sy(t);
  };
}
const curveCache = new Map<string, (x: number) => number>();
const easeFn = (id?: string) => {
  const key = id ?? 'frantos';
  let f = curveCache.get(key);
  if (!f) {
    const c = CURVES.find((x) => x.id === key) ?? CURVES.find((x) => x.id === 'frantos')!;
    f = bezier(c.v[0], c.v[1], c.v[2], c.v[3]);
    curveCache.set(key, f);
  }
  return f;
};

function keyStates(a: SiteAnim, rtl: boolean, em: number): { at: number; s: Partial<MState> }[] {
  const d = a.dist ?? 32;
  switch (a.enter) {
    case 'fade':
    case 'count':
      return [{ at: 0, s: { opacity: 0 } }, { at: 1, s: {} }];
    case 'rise':
      return [{ at: 0, s: { opacity: 0, ty: d } }, { at: 1, s: {} }];
    case 'slide':
      return [{ at: 0, s: { opacity: 0, tx: rtl ? d : -d } }, { at: 1, s: {} }];
    case 'zoom':
      return [{ at: 0, s: { opacity: 0, scale: 0.9 } }, { at: 1, s: {} }];
    case 'mask':
      return [{ at: 0, s: { clip: 100 } }, { at: 1, s: {} }];
    case 'blur':
      return [{ at: 0, s: { opacity: 0, blur: 14 } }, { at: 1, s: {} }];
    case 'words':
      return [{ at: 0, s: { opacity: 0, ty: 0.55 * em } }, { at: 1, s: {} }];
    case 'custom': {
      const ks = [...(a.keys ?? [])].sort((x, y) => x.at - y.at).map((k) => ({ at: Math.max(0, Math.min(1, k.at)), s: { tx: k.x ?? 0, ty: k.y ?? 0, scale: k.scale ?? 1, rotate: k.rotate ?? 0, opacity: k.opacity ?? 1 } }));
      if (!ks.length || ks[0].at > 0) ks.unshift({ at: 0, s: { ...STILL } });
      if (ks[ks.length - 1].at < 1) ks.push({ at: 1, s: { ...STILL } });
      return ks;
    }
  }
}

/** the state of one animated target at `t` ms; `i` is its place in a stagger (children or words) */
export function stateAt(a: SiteAnim, t: number, i = 0, rtl = false, em = 16): MState {
  const step = a.stagger ?? (a.enter === 'words' ? 60 : 0);
  let p = (t - a.delay - i * step) / a.dur;
  if (a.enter === 'custom' && a.loop && p > 1) p = p % 1;
  p = Math.max(0, Math.min(1, p));
  const ks = keyStates(a, rtl, em);
  let j = 0;
  while (j < ks.length - 2 && p > ks[j + 1].at) j++;
  const k0 = { ...STILL, ...ks[j].s };
  const k1 = { ...STILL, ...ks[j + 1].s };
  const span = ks[j + 1].at - ks[j].at || 1;
  // like CSS: the curve runs within each keyframe interval
  const e = easeFn(a.ease)((p - ks[j].at) / span);
  const out = { ...STILL };
  (Object.keys(STILL) as (keyof MState)[]).forEach((k) => (out[k] = k0[k] + (k1[k] - k0[k]) * e));
  return out;
}

/** every element that moves on its own: the node itself, each child of a stagger, or each word */
export interface Target {
  node: SiteNode;
  anim: SiteAnim;
  /** the element: data-n of the node or child */
  id: string;
  i: number;
  /** -1: the words inside the element move one by one */
  word?: number;
}
export function targetsOf(root: SiteNode[]): Target[] {
  const out: Target[] = [];
  walk(root, (n) => {
    const a = n.anim;
    if (!a) return;
    if (staggers(n)) (n.children ?? []).forEach((k, i) => out.push({ node: n, anim: a, id: k.id, i }));
    // words are counted on the drawn page (a translation can have more or fewer)
    else if (a.enter === 'words') out.push({ node: n, anim: a, id: n.id, i: 0, word: -1 });
    else out.push({ node: n, anim: a, id: n.id, i: 0 });
  });
  return out;
}

export function styleOf(s: MState) {
  return {
    opacity: String(Math.round(s.opacity * 1000) / 1000),
    translate: `${s.tx.toFixed(2)}px ${s.ty.toFixed(2)}px`,
    scale: String(Math.round(s.scale * 10000) / 10000),
    rotate: `${s.rotate.toFixed(2)}deg`,
    clipPath: s.clip > 0.01 ? `inset(0 0 ${s.clip.toFixed(2)}% 0)` : '',
    filter: s.blur > 0.01 ? `blur(${s.blur.toFixed(2)}px)` : '',
  };
}

/** put a page (drawn with data-n ids and no CSS motion) into its state at `t` ms */
export function applyAt(host: HTMLElement, root: SiteNode[], t: number, rtl: boolean) {
  for (const tg of targetsOf(root)) {
    const el = host.querySelector<HTMLElement>(`[data-n="${CSS.escape(tg.id)}"]`);
    if (!el) continue;
    if (tg.word !== undefined) {
      const em = parseFloat(getComputedStyle(el).fontSize) || 16;
      el.querySelectorAll<HTMLElement>('.w').forEach((w, i) => Object.assign(w.style, styleOf(stateAt(tg.anim, t, i, rtl, em))));
      continue;
    }
    Object.assign(el.style, styleOf(stateAt(tg.anim, t, tg.i, rtl)));
    if (tg.anim.enter === 'count') countAt(el, tg.anim, t);
  }
}
function countAt(el: HTMLElement, a: SiteAnim, t: number) {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let node: Text | null = null;
  while (walker.nextNode()) if (/\d/.test((walker.currentNode as Text).data) || (walker.currentNode as Text & { __o?: string }).__o) node = walker.currentNode as Text;
  if (!node) return;
  const n = node as Text & { __o?: string };
  n.__o ??= n.data;
  const src = n.__o;
  const m = src.match(/\d[\d\s.,  ]*\d|\d/);
  if (!m) return;
  const sep = m[0].match(/[\s.,  ](?=\d{3}(\D|$))/)?.[0] ?? '';
  const target = parseInt(m[0].replace(/\D/g, ''), 10);
  const k = Math.max(0, Math.min(1, (t - a.delay) / a.dur));
  const v = String(Math.round(target * (1 - Math.pow(1 - k, 3))));
  n.data = src.replace(m[0], sep ? v.replace(/\B(?=(\d{3})+(?!\d))/g, sep) : v);
}
