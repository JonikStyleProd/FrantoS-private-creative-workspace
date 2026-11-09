/**
 * Project palette and material variations.
 * The palette is what the creator picked (or, until then, the dominant colours of the project's images).
 * Variations are built from colour relationships — no network, no AI: the same input gives the same set.
 */
import type { MaterialVariant, Project } from '../ws/types';
import { uid } from '../ws/store';

export function derivedPalette(p: Project, n = 10): string[] {
  const seen: string[] = [];
  const add = (c: string) => {
    if (seen.length >= n) return;
    if (seen.every((x) => dist(x, c) > 48)) seen.push(c);
  };
  // references first: they are where the colour decisions come from
  [...p.assets].sort((a, b) => Number(b.isReference) - Number(a.isReference)).forEach((a) => (a.palette ?? []).slice(0, 3).forEach(add));
  return seen;
}

export const projectPalette = (p: Project) => (p.palette?.length ? p.palette : derivedPalette(p));

/* ── colour maths ── */
export function hexToRgb(h: string) {
  const v = parseInt(h.replace('#', '').padEnd(6, '0').slice(0, 6), 16);
  return { r: (v >> 16) & 255, g: (v >> 8) & 255, b: v & 255 };
}
export const rgbToHex = (r: number, g: number, b: number) => '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
export function dist(a: string, b: string) {
  const x = hexToRgb(a);
  const y = hexToRgb(b);
  return Math.abs(x.r - y.r) + Math.abs(x.g - y.g) + Math.abs(x.b - y.b);
}
export function toHsl(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  const R = r / 255, G = g / 255, B = b / 255;
  const mx = Math.max(R, G, B), mn = Math.min(R, G, B);
  const l = (mx + mn) / 2;
  let h = 0, s = 0;
  if (mx !== mn) {
    const d = mx - mn;
    s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    h = mx === R ? (G - B) / d + (G < B ? 6 : 0) : mx === G ? (B - R) / d + 2 : (R - G) / d + 4;
    h *= 60;
  }
  return { h, s, l };
}
export function fromHsl(h: number, s: number, l: number) {
  h = ((h % 360) + 360) % 360;
  s = Math.max(0, Math.min(1, s));
  l = Math.max(0, Math.min(1, l));
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return rgbToHex((r + m) * 255, (g + m) * 255, (b + m) * 255);
}
export const luminance = (hex: string) => {
  const { r, g, b } = hexToRgb(hex);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
};

/**
 * Six material variations around the current one.
 * Uses the project palette when there is one, otherwise colour harmonies of the current glaze.
 */
export function variations(cur: MaterialVariant, palette: string[]): MaterialVariant[] {
  const top = toHsl(cur.topColor);
  const base = toHsl(cur.baseColor);
  const pal = palette.filter((c) => luminance(c) > 0.08 && luminance(c) < 0.95);
  const lightest = [...pal].sort((a, b) => luminance(b) - luminance(a))[0];
  const ideas: { name: string; base: MaterialVariant['base']; baseColor: string; topColor: string; blend: number; softness: number; roughness: number; gloss: number }[] = [
    { name: 'Complement', base: cur.base, baseColor: cur.baseColor, topColor: fromHsl(top.h + 180, Math.min(0.7, top.s), top.l), blend: cur.blend, softness: cur.softness, roughness: cur.roughness, gloss: cur.gloss },
    { name: 'Analogous', base: cur.base, baseColor: cur.baseColor, topColor: fromHsl(top.h + 32, top.s, top.l + 0.04), blend: Math.min(0.85, cur.blend + 0.08), softness: cur.softness, roughness: cur.roughness, gloss: cur.gloss },
    { name: 'Deep glaze', base: 'glaze', baseColor: fromHsl(top.h, top.s * 0.8, Math.max(0.14, top.l - 0.22)), topColor: fromHsl(top.h, top.s, Math.max(0.1, top.l - 0.3)), blend: 0.35, softness: 0.5, roughness: 0.18, gloss: 0.9 },
    { name: 'Matte stone', base: 'travertine', baseColor: fromHsl(base.h, base.s * 0.7, Math.min(0.86, base.l + 0.04)), topColor: fromHsl(base.h, base.s * 0.6, Math.max(0.3, base.l - 0.18)), blend: 0.62, softness: 0.4, roughness: 0.82, gloss: 0.05 },
    { name: 'Dipped', base: cur.base, baseColor: cur.baseColor, topColor: cur.topColor, blend: 0.78, softness: 0.04, roughness: Math.max(0.1, cur.roughness - 0.15), gloss: Math.min(1, cur.gloss + 0.4) },
    { name: 'Monochrome', base: 'clay', baseColor: fromHsl(top.h, top.s * 0.35, 0.78), topColor: fromHsl(top.h, top.s * 0.35, 0.62), blend: 0.5, softness: 0.7, roughness: 0.6, gloss: 0.2 },
  ];
  if (pal.length >= 2) {
    // the palette leads: its strongest colours become the first two ideas
    const strong = [...pal].sort((a, b) => toHsl(b).s - toHsl(a).s);
    ideas[0] = { ...ideas[0], name: 'From the palette', topColor: strong[0], baseColor: lightest ?? cur.baseColor };
    ideas[1] = { ...ideas[1], name: 'Palette, reversed', topColor: strong[1], baseColor: lightest ?? cur.baseColor, blend: 0.4 };
  }
  return ideas.map((x) => ({ ...x, id: uid('mv-') }));
}
