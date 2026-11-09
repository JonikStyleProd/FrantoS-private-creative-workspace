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

/** Apply `a` to a copy of `src`. Pixels left of `split` (0..1, LTR) stay original — the before/after wipe. */
export function apply(src: ImageData, a: Adjust, split = 0): ImageData {
  const { width: w, height: h } = src;
  const out = new ImageData(new Uint8ClampedArray(src.data), w, h);
  const d = out.data;
  const ex = Math.pow(2, a.exposure);
  const ct = 1 + a.contrast;
  const sat = 1 + a.saturation;
  const wr = 1 + a.warmth * 0.12;
  const wb = 1 - a.warmth * 0.12;
  const tg = 1 - a.tint * 0.08;
  const lift = a.fade * 42;
  const cx = w / 2;
  const cy = h / 2;
  const maxR = Math.hypot(cx, cy);
  const sx = Math.round(split * w);
  // a fixed noise table: grain looks the same on every redraw
  const noise = a.grain > 0 ? new Float32Array(4096).map((_, i) => {
        const v = Math.sin(i * 12.9898) * 43758.5453;
        return v - Math.floor(v) - 0.5;
      }) : null;
  for (let y = 0; y < h; y++) {
    for (let x = sx; x < w; x++) {
      const i = (y * w + x) * 4;
      let r = d[i] * ex * wr;
      let g = d[i + 1] * ex * tg;
      let b = d[i + 2] * ex * wb;
      r = (r - 128) * ct + 128;
      g = (g - 128) * ct + 128;
      b = (b - 128) * ct + 128;
      const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      r = l + (r - l) * sat;
      g = l + (g - l) * sat;
      b = l + (b - l) * sat;
      if (lift) {
        r = lift + r * (1 - lift / 255);
        g = lift + g * (1 - lift / 255);
        b = lift + b * (1 - lift / 255);
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
