/** Image mode: a small, predictable pixel pipeline (no WebGL, no ctx.filter — same result in every browser). */

export interface Adjust {
  exposure: number; // stops, -1.5..1.5
  contrast: number; // -1..1
  saturation: number; // -1..1
  warmth: number; // -1..1
  tint: number; // -1..1 (green ↔ magenta)
  fade: number; // 0..1 lifts the blacks
  vignette: number; // 0..1
  grain: number; // 0..1
}

export const NEUTRAL: Adjust = { exposure: 0, contrast: 0, saturation: 0, warmth: 0, tint: 0, fade: 0, vignette: 0, grain: 0 };

export const LOOKS: { id: string; name: string; adjust: Adjust }[] = [
  { id: 'none', name: 'Original', adjust: NEUTRAL },
  { id: 'studio', name: 'Studio clean', adjust: { ...NEUTRAL, exposure: 0.15, contrast: 0.12, saturation: -0.05 } },
  { id: 'warm', name: 'Warm film', adjust: { ...NEUTRAL, exposure: 0.05, contrast: 0.08, saturation: -0.08, warmth: 0.35, fade: 0.12, grain: 0.25 } },
  { id: 'cool', name: 'Cool matte', adjust: { ...NEUTRAL, contrast: -0.1, saturation: -0.2, warmth: -0.3, tint: 0.05, fade: 0.22 } },
  { id: 'punch', name: 'Punch', adjust: { ...NEUTRAL, contrast: 0.35, saturation: 0.3, vignette: 0.25 } },
  { id: 'faded', name: 'Faded', adjust: { ...NEUTRAL, contrast: -0.25, saturation: -0.3, fade: 0.35, warmth: 0.1 } },
  { id: 'mono', name: 'Mono', adjust: { ...NEUTRAL, contrast: 0.2, saturation: -1, grain: 0.3, vignette: 0.2 } },
  { id: 'night', name: 'Night', adjust: { ...NEUTRAL, exposure: -0.2, contrast: 0.25, saturation: -0.15, warmth: -0.2, tint: 0.1, vignette: 0.4 } },
];

export const ASPECTS: { id: string; r: number | null }[] = [
  { id: 'Original', r: null },
  { id: '1:1', r: 1 },
  { id: '4:5', r: 4 / 5 },
  { id: '3:2', r: 3 / 2 },
  { id: '16:9', r: 16 / 9 },
  { id: '9:16', r: 9 / 16 },
];

export interface Crop {
  aspect: number | null;
  zoom: number; // 1..4
  x: number; // -1..1 pan
  y: number;
}

/** the crop rectangle in source pixels */
export function cropRect(w: number, h: number, c: Crop) {
  const r = c.aspect ?? w / h;
  let cw = w;
  let ch = w / r;
  if (ch > h) {
    ch = h;
    cw = h * r;
  }
  cw /= c.zoom;
  ch /= c.zoom;
  const sx = ((w - cw) / 2) * (1 + c.x);
  const sy = ((h - ch) / 2) * (1 + c.y);
  return { sx, sy, sw: cw, sh: ch };
}

const clamp = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : v);

/** a soft round area with its own correction: centre and radius in fractions of the picture */
export interface Mask {
  x: number;
  y: number;
  r: number;
  feather: number;
  invert: boolean;
  adjust: Adjust;
}

const prep = (a: Adjust) => ({ ex: Math.pow(2, a.exposure), ct: 1 + a.contrast, sat: 1 + a.saturation, wr: 1 + a.warmth * 0.12, wb: 1 - a.warmth * 0.12, tg: 1 - a.tint * 0.08, lift: a.fade * 42 });
type Prep = ReturnType<typeof prep>;
const tone = (r: number, g: number, b: number, k: Prep): [number, number, number] => {
  r = r * k.ex * k.wr;
  g = g * k.ex * k.tg;
  b = b * k.ex * k.wb;
  r = (r - 128) * k.ct + 128;
  g = (g - 128) * k.ct + 128;
  b = (b - 128) * k.ct + 128;
  const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  r = l + (r - l) * k.sat;
  g = l + (g - l) * k.sat;
  b = l + (b - l) * k.sat;
  if (k.lift) {
    r = k.lift + r * (1 - k.lift / 255);
    g = k.lift + g * (1 - k.lift / 255);
    b = k.lift + b * (1 - k.lift / 255);
  }
  return [r, g, b];
};

/**
 * Apply `a` (and an optional local `mask`) to a copy of `src`.
 * Pixels left of `split` (0..1, LTR) stay original — the before/after wipe.
 */
export function apply(src: ImageData, a: Adjust, split = 0, mask?: Mask | null): ImageData {
  const { width: w, height: h } = src;
  const out = new ImageData(new Uint8ClampedArray(src.data), w, h);
  const d = out.data;
  const g0 = prep(a);
  const m0 = mask ? prep(mask.adjust) : null;
  const cx = w / 2;
  const cy = h / 2;
  const maxR = Math.hypot(cx, cy);
  const sx = Math.round(split * w);
  const mr = mask ? mask.r * Math.max(w, h) : 0;
  const mf = mask ? Math.max(1, mask.feather * mr) : 1;
  // a fixed noise table: grain looks the same on every redraw
  const noise =
    a.grain > 0
      ? new Float32Array(4096).map((_, i) => {
          const v = Math.sin(i * 12.9898) * 43758.5453;
          return v - Math.floor(v) - 0.5;
        })
      : null;
  for (let y = 0; y < h; y++) {
    for (let x = sx; x < w; x++) {
      const i = (y * w + x) * 4;
      let [r, g, b] = tone(d[i], d[i + 1], d[i + 2], g0);
      if (mask && m0) {
        const dd = Math.hypot(x - mask.x * w, y - mask.y * h);
        let k = dd <= mr - mf ? 1 : dd >= mr ? 0 : (mr - dd) / mf;
        k = k * k * (3 - 2 * k);
        if (mask.invert) k = 1 - k;
        if (k > 0) {
          const [r2, g2, b2] = tone(r, g, b, m0);
          r += (r2 - r) * k;
          g += (g2 - g) * k;
          b += (b2 - b) * k;
        }
      }
      if (a.vignette) {
        const k = 1 - a.vignette * Math.pow(Math.hypot(x - cx, y - cy) / maxR, 2.2);
        r *= k;
        g *= k;
        b *= k;
      }
      if (noise) {
        const n = noise[(x * 7 + y * 131) & 4095] * a.grain * 46;
        r += n;
        g += n;
        b += n;
      }
      d[i] = clamp(r);
      d[i + 1] = clamp(g);
      d[i + 2] = clamp(b);
    }
  }
  return out;
}

/**
 * Take a plain background away: grows from the edges through every pixel close in colour to the
 * edge it started from (tolerance 0–1), then softens the cut by one pixel. Works for studio shots
 * on a plain backdrop; a busy background stays — say so in the UI.
 */
export function cutout(src: ImageData, tolerance: number): ImageData {
  const { width: w, height: h } = src;
  const out = new ImageData(new Uint8ClampedArray(src.data), w, h);
  const d = out.data;
  const tol = (tolerance * 255) ** 2 * 3;
  const seen = new Uint8Array(w * h);
  const q = new Int32Array(w * h);
  let head = 0;
  let tail = 0;
  const seedR = new Float32Array(w * h);
  const seedG = new Float32Array(w * h);
  const seedB = new Float32Array(w * h);
  const push = (p: number, r: number, g: number, b: number) => {
    seen[p] = 1;
    seedR[p] = r;
    seedG[p] = g;
    seedB[p] = b;
    q[tail++] = p;
  };
  for (let x = 0; x < w; x++)
    for (const y of [0, h - 1]) {
      const p = y * w + x;
      if (!seen[p]) push(p, d[p * 4], d[p * 4 + 1], d[p * 4 + 2]);
    }
  for (let y = 0; y < h; y++)
    for (const x of [0, w - 1]) {
      const p = y * w + x;
      if (!seen[p]) push(p, d[p * 4], d[p * 4 + 1], d[p * 4 + 2]);
    }
  while (head < tail) {
    const p = q[head++];
    d[p * 4 + 3] = 0;
    const x = p % w;
    const y = (p / w) | 0;
    const nb = [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, y > 0 ? p - w : -1, y < h - 1 ? p + w : -1];
    for (const n of nb) {
      if (n < 0 || seen[n]) continue;
      const dr = d[n * 4] - seedR[p];
      const dg = d[n * 4 + 1] - seedG[p];
      const db = d[n * 4 + 2] - seedB[p];
      if (dr * dr + dg * dg + db * db <= tol) push(n, seedR[p], seedG[p], seedB[p]);
      else seen[n] = 2; // edge of the object
    }
  }
  // soften: object pixels touching the background get partial alpha
  for (let p = 0; p < w * h; p++) {
    if (seen[p] !== 2) continue;
    d[p * 4 + 3] = 170;
  }
  return out;
}
