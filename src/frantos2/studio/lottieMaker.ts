/**
 * Studio · Motion · Lottie: ready-made vector animations (loaders and states) built as real Lottie
 * JSON — shape layers, not pictures — so they stay sharp at any size and weigh a few kilobytes.
 * Every preset loops seamlessly: periodic values are sampled over one cycle and end where they start.
 */

export type LottieKind = 'wave' | 'spinner' | 'ripple' | 'bars' | 'orbit' | 'check';

export interface LottieParams {
  kind: LottieKind;
  colors: [string, string, string];
  /** 0.5 – 2, multiplies the tempo */
  speed: number;
  /** 0.6 – 1.6, line weight and the size of the parts */
  weight: number;
  /** a background colour, or none for transparent */
  bg?: string;
}

export const LOTTIE_PRESETS: { id: LottieKind; label: string; hint: string; colors: [string, string, string]; base: number }[] = [
  { id: 'wave', label: 'Wave', hint: 'Three dots rising one after another, like the loader in Wavelength', colors: ['#1f6f8b', '#3fd08f', '#8cd1d9'], base: 1.2 },
  { id: 'spinner', label: 'Ring', hint: 'An arc that grows and runs around a quiet track', colors: ['#4f8bff', '#9fc0ff', '#4f8bff'], base: 1.6 },
  { id: 'ripple', label: 'Pulse', hint: 'Rings spreading from a dot: waiting, listening, live', colors: ['#ff6b4a', '#ff9a6b', '#ffd2bf'], base: 2 },
  { id: 'bars', label: 'Equaliser', hint: 'Five bars breathing out of step: sound, uploads, thinking', colors: ['#7b5cff', '#c06bff', '#ff7ab6'], base: 1.1 },
  { id: 'orbit', label: 'Orbit', hint: 'Two moons around a planet: syncing, connecting', colors: ['#e9b06a', '#9fb39a', '#5d7a8c'], base: 1.8 },
  { id: 'check', label: 'Done', hint: 'A circle draws itself, then the tick: saved, sent, paid', colors: ['#2fbf71', '#2fbf71', '#ffffff'], base: 2.2 },
];

export const preset = (k: LottieKind) => LOTTIE_PRESETS.find((p) => p.id === k)!;
export const defaultParams = (k: LottieKind): LottieParams => ({ kind: k, colors: [...preset(k).colors], speed: 1, weight: 1 });

const S = 512;
const C = S / 2;
const FR = 60;

/* ── building blocks ── */

const rgba = (hex: string, a = 1) => {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h.slice(0, 6), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255, a].map((v) => Math.round(v * 1000) / 1000);
};
const st = (k: unknown) => ({ a: 0, k });
const EASE = { o: { x: [0.42], y: [0] }, i: { x: [0.58], y: [1] } };
const LIN = { o: { x: [0], y: [0] }, i: { x: [1], y: [1] } };
const r2 = (v: number) => Math.round(v * 100) / 100;

type Key = { t: number; s: number[]; e?: 'ease' | 'lin' | 'hold' };
const anim = (keys: Key[]) => ({
  a: 1,
  k: keys.map((k, i) => {
    const last = i === keys.length - 1;
    const base = { t: r2(k.t), s: k.s.map(r2) };
    if (last) return base;
    if (k.e === 'hold') return { ...base, h: 1 };
    return { ...base, ...(k.e === 'lin' ? LIN : EASE) };
  }),
});

/** one cycle of a periodic value, sampled so the end meets the start */
const periodic = (fn: (u: number) => number[], D: number, n = 24): Key[] => Array.from({ length: n + 1 }, (_, i) => ({ t: (D * i) / n, s: fn(i / n), e: 'lin' as const }));

const tr = (p: number[] = [0, 0], extra: Record<string, unknown> = {}) => ({ ty: 'tr', p: st(p), a: st([0, 0]), s: st([100, 100]), r: st(0), o: st(100), sk: st(0), sa: st(0), ...extra });
const ell = (d: number) => ({ ty: 'el', p: st([0, 0]), s: st([d, d]), d: 1 });
const rect = (w: number, h: number, r: number) => ({ ty: 'rc', p: st([0, 0]), s: st([w, h]), r: st(r), d: 1 });
const fill = (c: string, a = 1) => ({ ty: 'fl', c: st(rgba(c)), o: st(a * 100), r: 1 });
const stroke = (c: string, w: number, a = 1) => ({ ty: 'st', c: st(rgba(c)), o: st(a * 100), w: st(w), lc: 2, lj: 2, ml: 4 });
const path = (v: number[][], closed = false) => ({ ty: 'sh', ks: st({ i: v.map(() => [0, 0]), o: v.map(() => [0, 0]), v, c: closed }), d: 1 });
const group = (items: unknown[], t = tr()) => ({ ty: 'gr', it: [...items, t] });

let ind = 0;
const layer = (nm: string, op: number, shapes: unknown[], ks: Partial<Record<'o' | 'r' | 'p' | 's', unknown>> = {}) => ({
  ddd: 0,
  ind: ++ind,
  ty: 4,
  nm,
  sr: 1,
  ks: { o: st(100), r: st(0), p: st([C, C, 0]), a: st([0, 0, 0]), s: st([100, 100, 100]), ...ks },
  ao: 0,
  shapes,
  ip: 0,
  op,
  st: 0,
  bm: 0,
});

/* ── presets ── */

function wave(p: LottieParams, D: number) {
  const d = 62 * p.weight;
  const gap = 118;
  const lift = 84;
  return [0, 1, 2].map((i) =>
    layer(`dot ${i + 1}`, D, [group([ell(d), fill(p.colors[i])])], {
      p: anim(
        periodic((u) => {
          // a quick rise and fall in the first 55% of the cycle, each dot a little later
          const x = (u - i * 0.14 + 1) % 1;
          const b = x < 0.55 ? Math.sin((x / 0.55) * Math.PI) : 0;
          return [C + (i - 1) * gap, C + 30 - b * lift, 0];
        }, D, 36),
      ),
      s: anim(
        periodic((u) => {
          const x = (u - i * 0.14 + 1) % 1;
          const b = x < 0.55 ? Math.sin((x / 0.55) * Math.PI) : 0;
          return [100 - b * 8, 100 + b * 10, 100];
        }, D, 36),
      ),
    }),
  );
}

function spinner(p: LottieParams, D: number) {
  const d = 300;
  const w = 30 * p.weight;
  // the arc grows from its tail, then its tail catches up; the turn is chosen so the cycle closes
  const arc = layer(
    'arc',
    D,
    [
      group([
        ell(d),
        { ty: 'tm', s: anim([{ t: 0, s: [0] }, { t: D * 0.5, s: [0] }, { t: D, s: [65] }]), e: anim([{ t: 0, s: [5] }, { t: D * 0.5, s: [70] }, { t: D, s: [70] }]), o: st(0), m: 1 },
        stroke(p.colors[0], w),
      ]),
    ],
    { r: anim([{ t: 0, s: [0], e: 'lin' }, { t: D, s: [486] }]) },
  );
  const track = layer('track', D, [group([ell(d), stroke(p.colors[1], w, 0.22)])]);
  return [arc, track];
}

function ripple(p: LottieParams, D: number) {
  const rings = [0, 1, 2].map((i) => {
    const ph = i / 3;
    const fn = (u: number) => (u + ph) % 1;
    return layer(`ring ${i + 1}`, D, [group([ell(360), stroke(p.colors[i === 0 ? 1 : 2], 14 * p.weight)])], {
      s: anim(periodic((u) => { const x = fn(u); const k = 18 + (1 - (1 - x) ** 2) * 82; return [k, k, 100]; }, D, 48)),
      o: anim(periodic((u) => [100 * (1 - fn(u)) ** 1.2], D, 48)),
    });
  });
  const dot = layer('dot', D, [group([ell(92 * p.weight), fill(p.colors[0])])], {
    s: anim(periodic((u) => { const k = 100 + Math.sin(u * Math.PI * 6) * 7; return [k, k, 100]; }, D, 36)),
  });
  return [dot, ...rings];
}

function bars(p: LottieParams, D: number) {
  const n = 5;
  const w = 46 * p.weight;
  const h = 250;
  const step = 76;
  const cols = [p.colors[0], p.colors[1], p.colors[2], p.colors[1], p.colors[0]];
  const ph = [0, 0.35, 0.7, 0.2, 0.55];
  return Array.from({ length: n }, (_, i) =>
    layer(`bar ${i + 1}`, D, [group([rect(w, h, w / 2), fill(cols[i])])], {
      p: st([C + (i - (n - 1) / 2) * step, C, 0]),
      s: anim(periodic((u) => [100, 26 + 74 * (0.5 - 0.5 * Math.cos(2 * Math.PI * (u + ph[i]) * (i % 2 ? 1 : 2))), 100], D, 32)),
    }),
  );
}

function orbit(p: LottieParams, D: number) {
  const R = 150;
  const planet = layer('planet', D, [group([ell(110 * p.weight), fill(p.colors[0])])], {
    s: anim(periodic((u) => { const k = 100 + Math.sin(u * Math.PI * 2) * 4; return [k, k, 100]; }, D, 24)),
  });
  const moons = layer(
    'moons',
    D,
    [
      group([ell(46 * p.weight), fill(p.colors[1])], tr([R, 0])),
      group([ell(30 * p.weight), fill(p.colors[2])], tr([-R * 0.8, 0])),
    ],
    { r: anim([{ t: 0, s: [0], e: 'lin' }, { t: D, s: [360] }]) },
  );
  const ring = layer('path', D, [group([ell(R * 2), stroke(p.colors[2], 4 * p.weight, 0.3)]), group([ell(R * 1.6), stroke(p.colors[2], 3 * p.weight, 0.2)])]);
  return [moons, planet, ring];
}

function check(p: LottieParams, D: number) {
  const at = (x: number) => D * x;
  const out: Key[] = [{ t: 0, s: [100] }, { t: at(0.86), s: [100] }, { t: at(0.97), s: [0] }, { t: D, s: [0] }];
  const ring = layer('ring', D, [group([ell(300), { ty: 'tm', s: st(0), e: anim([{ t: 0, s: [0] }, { t: at(0.32), s: [100] }, { t: D, s: [100] }]), o: st(-90), m: 1 }, stroke(p.colors[0], 18 * p.weight)])], { o: anim(out) });
  const disc = layer('disc', D, [group([ell(300), fill(p.colors[1])])], {
    s: anim([{ t: 0, s: [0, 0, 100] }, { t: at(0.28), s: [0, 0, 100] }, { t: at(0.4), s: [108, 108, 100] }, { t: at(0.47), s: [100, 100, 100] }, { t: D, s: [100, 100, 100] }]),
    o: anim(out),
  });
  const tick = layer('tick', D, [group([path([[-62, 4], [-18, 48], [70, -44]]), { ty: 'tm', s: st(0), e: anim([{ t: 0, s: [0] }, { t: at(0.42), s: [0] }, { t: at(0.6), s: [100] }, { t: D, s: [100] }]), o: st(0), m: 1 }, stroke(p.colors[2], 30 * p.weight)])], {
    s: anim([{ t: 0, s: [100, 100, 100] }, { t: at(0.6), s: [100, 100, 100] }, { t: at(0.66), s: [112, 112, 100] }, { t: at(0.74), s: [100, 100, 100] }, { t: D, s: [100, 100, 100] }]),
    // hidden until it starts drawing: a round cap would otherwise show as a dot
    o: anim([{ t: 0, s: [0], e: 'hold' }, { t: at(0.43), s: [100] }, { t: at(0.86), s: [100] }, { t: at(0.97), s: [0] }, { t: D, s: [0] }]),
  });
  return [tick, disc, ring];
}

const BUILD: Record<LottieKind, (p: LottieParams, D: number) => unknown[]> = { wave, spinner, ripple, bars, orbit, check };

/** the length of one cycle in seconds */
export const cycleOf = (p: LottieParams) => preset(p.kind).base / Math.max(0.25, p.speed);

export function makeLottie(p: LottieParams, name: string) {
  ind = 0;
  const D = Math.max(12, Math.round(cycleOf(p) * FR));
  const layers = BUILD[p.kind](p, D);
  if (p.bg) layers.push(layer('background', D, [group([rect(S, S, 0), fill(p.bg)])]));
  return { v: '5.7.4', fr: FR, ip: 0, op: D, w: S, h: S, nm: name, ddd: 0, assets: [], layers, meta: { g: 'FrantoS · Studio' } };
}
