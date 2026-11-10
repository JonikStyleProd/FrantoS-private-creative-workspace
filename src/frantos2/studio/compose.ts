/** Canvas mode: board presets, an automatic first layout, and the PNG export. */
import type { Board, BoardLayer, BrandFont, Project } from '../ws/types';
import { fontCss } from './brand';
import { assetUrl } from '../ws/media';
import { uid } from '../ws/store';
import { luminance, projectPalette } from './palette';

export const FORMATS = [
  { id: 'post', label: 'Post 4:5', w: 1080, h: 1350 },
  { id: 'square', label: 'Square', w: 1080, h: 1080 },
  { id: 'story', label: 'Story 9:16', w: 1080, h: 1920 },
  { id: 'slide', label: 'Slide 16:9', w: 1920, h: 1080 },
  { id: 'a4', label: 'A4 poster', w: 2480, h: 3508 },
  { id: 'phone', label: 'Phone screen', w: 1170, h: 2532 },
  { id: 'desktop', label: 'Desktop screen', w: 2880, h: 1800 },
];

export const FONT = "'Manrope Variable', 'Heebo Variable', system-ui, sans-serif";

const L = (l: Omit<BoardLayer, 'id'>): BoardLayer => ({ ...l, id: uid('l-') });

/** the best picture for a first layout: the cover, else an approved work, else any image */
function heroAsset(p: Project) {
  const approved = p.works.map((w) => w.versions.find((v) => v.id === w.approvedVersionId)?.assetId).filter(Boolean) as string[];
  const imgs = p.assets.filter((a) => a.kind === 'image');
  // an approved picture without type on it composes best; the cover often is a finished poster
  return imgs.find((a) => approved.includes(a.id) && a.id !== p.coverAssetId) ?? imgs.find((a) => a.id === p.coverAssetId) ?? imgs.find((a) => !a.isReference) ?? imgs[0];
}

/** A composed first board: picture, title, a line of copy, the palette. Everything stays editable. */
export function autoBoard(p: Project, f = FORMATS[0]): Omit<Board, 'id' | 'createdAt' | 'updatedAt'> {
  const pal = projectPalette(p).slice(0, 5);
  const bg = [...pal].sort((a, b) => luminance(b) - luminance(a))[0] ?? '#efe9df';
  const ink = luminance(bg) > 0.55 ? '#16130f' : '#f7f3ec';
  const hero = heroAsset(p);
  const obj = (p.objects ?? []).find((o) => o.thumb);
  const { w, h } = f;
  const m = Math.round(Math.min(w, h) * 0.07);
  const wide = w > h;
  const layers: BoardLayer[] = [];
  if (wide) {
    if (hero) layers.push(L({ kind: 'image', assetId: hero.id, x: Math.round(w * 0.45), y: 0, w: Math.round(w * 0.55), h, fit: 'cover' }));
    layers.push(L({ kind: 'text', text: p.title, x: m, y: m, w: Math.round(w * 0.38), h: 220, size: 96, weight: 800, color: ink, align: 'start' }));
    if (p.brief) layers.push(L({ kind: 'text', text: p.brief, x: m, y: m + 260, w: Math.round(w * 0.34), h: 260, size: 30, weight: 500, color: ink, align: 'start' }));
    if (pal.length) layers.push(L({ kind: 'palette', colors: pal, x: m, y: h - m - 64, w: Math.round(w * 0.3), h: 64, radius: 32 }));
  } else {
    const picH = Math.round(h * 0.62);
    if (hero) layers.push(L({ kind: 'image', assetId: hero.id, x: 0, y: 0, w, h: picH, fit: 'cover' }));
    else if (obj) layers.push(L({ kind: 'object', objectId: obj.id, x: m, y: m, w: w - 2 * m, h: picH - m, fit: 'contain' }));
    const size = Math.round(w * 0.085);
    layers.push(L({ kind: 'text', text: p.title, x: m, y: picH + m * 0.8, w: w - 2 * m, h: Math.round(size * 1.3), size, weight: 800, color: ink, align: 'start' }));
    if (p.brief) layers.push(L({ kind: 'text', text: p.brief, x: m, y: picH + m * 0.8 + size * 1.5, w: Math.round((w - 2 * m) * 0.8), h: Math.round(h * 0.12), size: Math.round(w * 0.026), weight: 500, color: ink, align: 'start' }));
    if (pal.length) layers.push(L({ kind: 'palette', colors: pal, x: m, y: h - m - Math.round(w * 0.05), w: Math.round(w * 0.42), h: Math.round(w * 0.05), radius: Math.round(w * 0.025) }));
  }
  return { title: `${p.title} · ${f.label}`, w, h, bg, layers };
}

async function loadImage(url: string) {
  const r = await fetch(url);
  return createImageBitmap(await r.blob());
}

function wrap(x: CanvasRenderingContext2D, text: string, width: number) {
  const out: string[] = [];
  for (const para of text.split('\n')) {
    let line = '';
    for (const word of para.split(/\s+/)) {
      const t = line ? `${line} ${word}` : word;
      if (x.measureText(t).width > width && line) {
        out.push(line);
        line = word;
      } else line = t;
    }
    out.push(line);
  }
  return out;
}

/** Draw the board at full size, the way the editor shows it. */
export async function renderBoard(p: Project, b: Board, rtl = false, brandFont?: BrandFont): Promise<Blob> {
  await document.fonts?.ready;
  const c = document.createElement('canvas');
  c.width = b.w;
  c.height = b.h;
  const x = c.getContext('2d')!;
  x.fillStyle = b.bg;
  x.fillRect(0, 0, b.w, b.h);
  for (const l of b.layers) {
    x.save();
    x.globalAlpha = l.opacity ?? 1;
    if (l.radius && l.kind !== 'text' && l.kind !== 'palette') {
      x.beginPath();
      x.roundRect(l.x, l.y, l.w, l.h, l.radius);
      x.clip();
    }
    if (l.kind === 'image' || l.kind === 'object') {
      const src = l.kind === 'image' ? await (async () => { const a = p.assets.find((q) => q.id === l.assetId); return a ? assetUrl(a, 'full') : undefined; })() : (p.objects ?? []).find((o) => o.id === l.objectId)?.thumb;
      if (src) {
        try {
          const img = await loadImage(src);
          const s = (l.fit === 'contain' ? Math.min : Math.max)(l.w / img.width, l.h / img.height);
          const dw = img.width * s;
          const dh = img.height * s;
          x.beginPath();
          x.rect(l.x, l.y, l.w, l.h);
          x.clip();
          x.drawImage(img, l.x + (l.w - dw) / 2, l.y + (l.h - dh) / 2, dw, dh);
        } catch {
          /* a missing picture leaves its frame empty */
        }
      }
    } else if (l.kind === 'rect') {
      x.fillStyle = l.fill ?? '#000';
      x.beginPath();
      x.roundRect(l.x, l.y, l.w, l.h, l.radius ?? 0);
      x.fill();
    } else if (l.kind === 'palette') {
      const cols = l.colors ?? [];
      const gap = Math.round(l.h * 0.18);
      const sw = (l.w - gap * (cols.length - 1)) / Math.max(1, cols.length);
      cols.forEach((col, i) => {
        x.fillStyle = col;
        x.beginPath();
        x.roundRect(l.x + i * (sw + gap), l.y, sw, l.h, l.radius ?? 0);
        x.fill();
      });
    } else if (l.kind === 'text') {
      const size = l.size ?? 48;
      x.font = `${l.weight ?? 600} ${size}px ${fontCss(l.font ?? brandFont)}`;
      x.fillStyle = l.color ?? '#000';
      x.textBaseline = 'top';
      x.direction = rtl ? 'rtl' : 'ltr';
      const al = l.align ?? 'start';
      x.textAlign = al === 'center' ? 'center' : (al === 'end') !== rtl ? 'right' : 'left';
      const ax = al === 'center' ? l.x + l.w / 2 : x.textAlign === 'right' ? l.x + l.w : l.x;
      const lh = size * 1.12;
      wrap(x, l.text ?? '', l.w).forEach((line, i) => x.fillText(line, ax, l.y + i * lh));
    }
    x.restore();
  }
  return new Promise((res, rej) => c.toBlob((bb) => (bb ? res(bb) : rej(new Error('encode'))), 'image/png'));
}

/** An empty board with a title and a frame for the picture — what templates start from. */
export function placeholderBoard(f: (typeof FORMATS)[number], title: string, line: string, bg: string, ink: string, accent: string): Omit<Board, 'id' | 'createdAt' | 'updatedAt'> {
  const { w, h } = f;
  const m = Math.round(Math.min(w, h) * 0.07);
  const wide = w > h;
  const size = Math.round(Math.min(w, h) * (wide ? 0.09 : 0.085));
  const layers: BoardLayer[] = wide
    ? [
        L({ kind: 'rect', x: Math.round(w * 0.5), y: m, w: Math.round(w * 0.5) - m, h: h - 2 * m, fill: accent, radius: 8, opacity: 0.35 }),
        L({ kind: 'text', text: title, x: m, y: m, w: Math.round(w * 0.42), h: size * 2.4, size, weight: 800, color: ink, align: 'start' }),
        L({ kind: 'text', text: line, x: m, y: h - m - size, w: Math.round(w * 0.4), h: size, size: Math.round(size * 0.32), weight: 500, color: ink, align: 'start' }),
      ]
    : [
        L({ kind: 'rect', x: m, y: m, w: w - 2 * m, h: Math.round(h * 0.58), fill: accent, radius: 8, opacity: 0.35 }),
        L({ kind: 'text', text: title, x: m, y: Math.round(h * 0.58) + m * 1.6, w: w - 2 * m, h: size * 2.4, size, weight: 800, color: ink, align: 'start' }),
        L({ kind: 'text', text: line, x: m, y: h - m - size * 0.8, w: w - 2 * m, h: size, size: Math.round(size * 0.32), weight: 500, color: ink, align: 'start' }),
      ];
  return { title: `${title} · ${f.label}`, w, h, bg, layers };
}

/** The same board in another format: layers keep their place relative to the edges; type scales with the short side. */
export function reflow(b: Board, f: (typeof FORMATS)[number]): Omit<Board, 'id' | 'createdAt' | 'updatedAt'> {
  const kx = f.w / b.w;
  const ky = f.h / b.h;
  const k = Math.min(kx, ky);
  const layers = b.layers.map((l) => {
    const pics = l.kind === 'image' || l.kind === 'object';
    // pictures fill their new frame; text and swatches keep their proportions
    const w = Math.round(pics ? l.w * kx : Math.min(f.w, l.w * kx));
    const h = Math.round(pics ? l.h * ky : l.h * k);
    return { ...l, id: uid('l-'), x: Math.round(l.x * kx), y: Math.round(l.y * ky), w, h, size: l.size ? Math.round(l.size * k) : l.size, radius: l.radius ? Math.round(l.radius * k) : l.radius };
  });
  return { title: b.title.replace(/ · [^·]+$/, '') + ` · ${f.label}`, w: f.w, h: f.h, bg: b.bg, layers, notes: b.notes };
}
