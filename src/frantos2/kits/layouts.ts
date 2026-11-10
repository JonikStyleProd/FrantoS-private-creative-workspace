import type { Board, BoardLayer, Project } from '../ws/types';
import { uid } from '../ws/store';

type Draft = Omit<Board, 'id' | 'createdAt' | 'updatedAt'>;
const L = (l: Omit<BoardLayer, 'id'>): BoardLayer => ({ ...l, id: uid('l-') });

/** what a board is made of: its pictures (largest first), its texts (largest first), its palette */
function parts(b: Board) {
  const pics = b.layers.filter((l) => (l.kind === 'image' || l.kind === 'object') && !l.hidden).sort((x, y) => y.w * y.h - x.w * x.h);
  const texts = b.layers.filter((l) => l.kind === 'text' && !l.hidden && l.text?.trim()).sort((x, y) => (y.size ?? 0) - (x.size ?? 0));
  const pal = b.layers.find((l) => l.kind === 'palette')?.colors;
  const ink = texts[0]?.color ?? '#16130f';
  return { pics, texts, pal, ink };
}
const pic = (src: BoardLayer, x: number, y: number, w: number, h: number, radius = 0): BoardLayer => L({ kind: src.kind, assetId: src.assetId, objectId: src.objectId, x, y, w, h, fit: src.kind === 'object' ? 'contain' : 'cover', radius });
const text = (src: BoardLayer | undefined, fallback: string, x: number, y: number, w: number, h: number, size: number, color: string, weight = 800, align: BoardLayer['align'] = 'start'): BoardLayer =>
  L({ kind: 'text', text: src?.text ?? fallback, font: src?.font, x, y, w, h, size: Math.round(size), weight, color, align });

/** Four compositions of the same pictures and words: hero, grid, full bleed, editorial. */
export function fourLayouts(b: Board): { name: string; board: Draft }[] {
  const { pics, texts, pal, ink } = parts(b);
  const { w: W, h: H } = b;
  const S = Math.min(W, H);
  const m = Math.round(S * 0.06);
  const g = Math.round(S * 0.025);
  const title = texts[0];
  const sub = texts[1];
  const tall = H > W * 1.15;
  const base = { title: b.title, w: W, h: H, bg: b.bg, notes: b.notes };
  const out: { name: string; board: Draft }[] = [];

  // 1. hero and a stack
  {
    const ls: BoardLayer[] = [];
    if (tall) {
      if (pics[0]) ls.push(pic(pics[0], m, m, W - m * 2, H * 0.58, S * 0.02));
      pics.slice(1, 3).forEach((p, i) => ls.push(pic(p, m + i * ((W - m * 2 - g) / 2 + g), H * 0.58 + m + g, (W - m * 2 - g) / 2, H * 0.2, S * 0.02)));
      ls.push(text(title, b.title, m, H * 0.82, W - m * 2, S * 0.12, S * 0.085, ink));
    } else {
      if (pics[0]) ls.push(pic(pics[0], 0, 0, W * 0.58, H));
      const n = Math.max(1, Math.min(2, pics.length - 1));
      pics.slice(1, 3).forEach((p, i) => ls.push(pic(p, W * 0.58 + g, m + i * ((H * 0.5 - m) / n), W * 0.42 - g - m, (H * 0.5 - m) / n - g, S * 0.015)));
      ls.push(text(title, b.title, W * 0.58 + g, H * 0.58, W * 0.42 - g - m, S * 0.2, S * 0.075, ink));
      if (sub) ls.push(text(sub, '', W * 0.58 + g, H * 0.58 + S * 0.2, W * 0.42 - g - m, S * 0.1, S * 0.032, ink, 500));
    }
    if (pal) ls.push(L({ kind: 'palette', colors: pal, x: tall ? m : W * 0.58 + g, y: H - m - S * 0.05, w: tall ? W * 0.5 : W * 0.42 - g - m, h: S * 0.05, radius: S * 0.025 }));
    out.push({ name: 'Hero and stack', board: { ...base, layers: ls } });
  }
  // 2. even grid with a band of words
  {
    const ls: BoardLayer[] = [];
    const band = H * 0.24;
    const cols = pics.length >= 4 ? 2 : Math.max(1, Math.min(3, pics.length));
    const rows = pics.length >= 4 ? 2 : 1;
    const cw = (W - m * 2 - g * (cols - 1)) / cols;
    const ch = (H - band - m * 2 - g * (rows - 1)) / rows;
    pics.slice(0, cols * rows).forEach((p, i) => ls.push(pic(p, m + (i % cols) * (cw + g), m + Math.floor(i / cols) * (ch + g), cw, ch, S * 0.012)));
    ls.push(text(title, b.title, m, H - band + g, W - m * 2, band * 0.5, S * 0.07, ink));
    if (sub) ls.push(text(sub, '', m, H - band * 0.42, W * 0.7, band * 0.3, S * 0.03, ink, 500));
    out.push({ name: 'Grid', board: { ...base, layers: ls } });
  }
  // 3. full bleed with a scrim
  {
    const ls: BoardLayer[] = [];
    if (pics[0]) ls.push(pic(pics[0], 0, 0, W, H));
    ls.push(L({ kind: 'rect', x: 0, y: H * 0.55, w: W, h: H * 0.45, fill: '#000000', opacity: 0.45 }));
    ls.push(text(title, b.title, m, H * 0.62, W - m * 2, S * 0.2, S * 0.11, '#ffffff'));
    pics.slice(1, 4).forEach((p, i) => ls.push(pic(p, m + i * (S * 0.16 + g), H - m - S * 0.16, S * 0.16, S * 0.16, S * 0.02)));
    out.push({ name: 'Full bleed', board: { ...base, bg: '#111111', layers: ls } });
  }
  // 4. editorial: words first, pictures in a row
  {
    const ls: BoardLayer[] = [];
    ls.push(text(title, b.title, m, m, W - m * 2, S * 0.26, S * 0.15, ink));
    const row = pics.slice(0, 3);
    const n = Math.max(1, row.length);
    const cw = (W - m * 2 - g * (n - 1)) / n;
    const top = m + S * 0.3;
    row.forEach((p, i) => ls.push(pic(p, m + i * (cw + g), top, cw, H - top - m - (pal ? S * 0.09 : 0), 0)));
    if (pal) ls.push(L({ kind: 'palette', colors: pal, x: m, y: H - m - S * 0.05, w: W * 0.4, h: S * 0.05, radius: 0 }));
    out.push({ name: 'Editorial', board: { ...base, layers: ls } });
  }
  return out;
}

/** the moodboard as a board: same arrangement, at slide size */
export function boardFromMoodboard(p: Project): Draft | null {
  if (!p.moodboard.length) return null;
  const W = 1920;
  const H = 1200;
  const layers: BoardLayer[] = [...p.moodboard]
    .sort((a, b) => a.z - b.z)
    .map((mi) => {
      const a = p.assets.find((x) => x.id === mi.assetId);
      if (!a) return null;
      const w = mi.w * W;
      const h = (w * a.h) / Math.max(1, a.w);
      return L({ kind: 'image', assetId: a.id, x: Math.round(mi.x * W), y: Math.round(mi.y * H), w: Math.round(w), h: Math.round(h), fit: 'cover', rot: mi.rot, radius: 6 });
    })
    .filter((x): x is BoardLayer => !!x);
  return { title: `${p.title} — moodboard`, w: W, h: H, bg: '#ece6dc', layers };
}
