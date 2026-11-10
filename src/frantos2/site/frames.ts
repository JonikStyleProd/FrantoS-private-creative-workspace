import type { Project, SitePage } from '../ws/types';
import { viewRoot } from './collections';
import { makeCtx } from './media';
import { applyAt, pageSpan, stateAt, targetsOf, MState } from './motion';
import type { MediaInfo } from './render';
import { renderPage } from './render';

/**
 * Artboards out of FrantoS, frame by frame. A frame is the page drawn without CSS motion, put into
 * its state at `t` ms (motion.ts applyAt — the same curves as the CSS), then turned into a picture.
 * Nothing depends on how fast the device is: every frame is exact.
 */

/**
 * An artboard is laid out at a design size (about 600 px on its short side) and drawn larger:
 * a 1080 post gets type and spacing in proportion, the way a designer would set it, not website-small.
 */
export const boardK = (b: { w: number; h: number }) => Math.max(1, Math.min(b.w, b.h) / 600);
export const boardLayout = (b: { w: number; h: number }) => {
  const k = boardK(b);
  return { w: Math.round(b.w / k), h: Math.round(b.h / k), k };
};

export const boardLength = (page: Pick<SitePage, 'root' | 'board'>, root = page.root) => Math.max(1000, pageSpan(root) + (page.board?.hold ?? 1000));
export const BOARD_SIZES: { id: string; label: string; w: number; h: number }[] = [
  { id: 'square', label: 'Square post', w: 1080, h: 1080 },
  { id: 'portrait', label: 'Portrait post', w: 1080, h: 1350 },
  { id: 'story', label: 'Story', w: 1080, h: 1920 },
  { id: 'wide', label: 'Landscape video', w: 1920, h: 1080 },
  { id: 'banner', label: 'Banner', w: 300, h: 250 },
  { id: 'leader', label: 'Wide banner', w: 728, h: 90 },
];

interface Job {
  p: Project;
  page: SitePage;
  media: Record<string, MediaInfo>;
  tr?: (s: string) => string;
  signal?: AbortSignal;
  onProgress?: (f: number) => void;
}

async function mount(job: Job) {
  const { p, page, media, tr } = job;
  const board = boardLayout(page.board!);
  const root = viewRoot(p, page);
  const { css, html } = renderPage({ ...page, root }, makeCtx(p, media, { mode: 'container', vh: `${board.h}px`, tr, motion: 'off', ids: true }));
  const host = document.createElement('div');
  host.setAttribute('aria-hidden', 'true');
  host.style.cssText = `position:fixed;left:-30000px;top:0;width:${board.w}px;height:${board.h}px;overflow:hidden;container:fs / inline-size;pointer-events:none;background:${page.theme.bg}`;
  host.innerHTML = `<style>${css}</style>${html}`;
  // videos stand still in frames
  host.querySelectorAll('video').forEach((v) => v.replaceWith(Object.assign(document.createElement('div'), { style: 'width:100%;height:100%;background:var(--c-surface)' })));
  document.body.appendChild(host);
  await Promise.all([document.fonts?.ready, ...Array.from(host.querySelectorAll('img')).map((i) => ((i.loading = 'eager'), i.decode().catch(() => undefined)))]);
  const { getFontEmbedCSS } = await import('html-to-image');
  const fontEmbedCSS = await getFontEmbedCSS(host);
  return { host, root, fontEmbedCSS, L: board };
}

/** calls `each` with every frame as a canvas of exactly `w × h` */
export async function eachFrame(job: Job, opts: { fps: number; scale: number; w: number; h: number }, each: (c: HTMLCanvasElement, i: number, n: number) => Promise<void> | void) {
  const { toCanvas } = await import('html-to-image');
  const { host, root, fontEmbedCSS, L } = await mount(job);
  const rtl = job.page.dir === 'rtl';
  const out = document.createElement('canvas');
  out.width = opts.w;
  out.height = opts.h;
  const x = out.getContext('2d', { willReadFrequently: true })!;
  try {
    const len = boardLength(job.page, root);
    const n = Math.max(2, Math.round((len / 1000) * opts.fps));
    for (let i = 0; i < n; i++) {
      if (job.signal?.aborted) throw new DOMException('aborted', 'AbortError');
      applyAt(host, root, (i * 1000) / opts.fps, rtl);
      const c = await toCanvas(host, { width: L.w, height: L.h, pixelRatio: opts.scale * L.k, fontEmbedCSS, cacheBust: false, skipAutoScale: true, backgroundColor: job.page.theme.bg, style: { position: 'static', left: '0', top: '0' } });
      x.fillStyle = job.page.theme.bg;
      x.fillRect(0, 0, opts.w, opts.h);
      x.drawImage(c, 0, 0, opts.w, opts.h);
      await each(out, i, n);
      job.onProgress?.((i + 1) / n);
    }
  } finally {
    host.remove();
  }
}

const even = (v: number) => Math.max(2, Math.round(v / 2) * 2);
export const canVideo = () => typeof VideoEncoder !== 'undefined' && typeof VideoFrame !== 'undefined';

/** MP4 (H.264) through WebCodecs; `half` halves the size for a lighter file */
export async function boardVideo(job: Job, half = false): Promise<Blob> {
  const board = job.page.board!;
  const fps = board.fps ?? 30;
  const k = half ? 0.5 : 1;
  const W = even(board.w * k);
  const H = even(board.h * k);
  const { Muxer, ArrayBufferTarget } = await import('mp4-muxer');
  let config: VideoEncoderConfig | null = null;
  for (const codec of ['avc1.640033', 'avc1.640028', 'avc1.4d0028', 'avc1.42001f']) {
    const c = { codec, width: W, height: H, bitrate: Math.round(W * H * fps * 0.12), framerate: fps };
    if ((await VideoEncoder.isConfigSupported(c)).supported) {
      config = c;
      break;
    }
  }
  if (!config) throw new Error('no-codec');
  const target = new ArrayBufferTarget();
  const muxer = new Muxer({ target, video: { codec: 'avc', width: W, height: H, frameRate: fps }, fastStart: 'in-memory' });
  let fail: unknown = null;
  const enc = new VideoEncoder({ output: (chunk, meta) => muxer.addVideoChunk(chunk, meta), error: (e) => (fail = e) });
  enc.configure(config);
  await eachFrame(job, { fps, scale: (W / board.w) * 1, w: W, h: H }, async (c, i) => {
    if (fail) throw fail;
    const f = new VideoFrame(c, { timestamp: Math.round((i * 1e6) / fps), duration: Math.round(1e6 / fps) });
    enc.encode(f, { keyFrame: i % (fps * 2) === 0 });
    f.close();
    while (enc.encodeQueueSize > 6) await new Promise((r) => setTimeout(r, 4));
  });
  await enc.flush();
  enc.close();
  if (fail) throw fail;
  muxer.finalize();
  return new Blob([target.buffer], { type: 'video/mp4' });
}

/** a GIF: at most 600 px wide and 15 frames a second, looping when the board loops */
export async function boardGif(job: Job): Promise<Blob> {
  const board = job.page.board!;
  const { GIFEncoder, quantize, applyPalette } = await import('gifenc');
  const fps = 15;
  const k = Math.min(1, 600 / board.w);
  const W = Math.round(board.w * k);
  const H = Math.round(board.h * k);
  const enc = GIFEncoder();
  await eachFrame(job, { fps, scale: k, w: W, h: H }, (c, i) => {
    const { data } = c.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, W, H);
    const palette = quantize(data, 256);
    enc.writeFrame(applyPalette(data, palette), W, H, { palette, delay: Math.round(1000 / fps), ...(i === 0 ? { repeat: board.loop === false ? -1 : 0 } : {}) });
  });
  enc.finish();
  return new Blob([new Uint8Array(enc.bytes())], { type: 'image/gif' });
}

/** the last frame (everything in place) as PNG */
export async function boardPoster(job: Job): Promise<Blob> {
  const board = job.page.board!;
  const { toBlob } = await import('html-to-image');
  const { host, root, fontEmbedCSS, L } = await mount(job);
  try {
    applyAt(host, root, boardLength(job.page, root) + 10_000, job.page.dir === 'rtl');
    const b = await toBlob(host, { width: L.w, height: L.h, pixelRatio: (board.w / L.w), fontEmbedCSS, cacheBust: false, skipAutoScale: true, backgroundColor: job.page.theme.bg, style: { position: 'static', left: '0', top: '0' } });
    if (!b) throw new Error('capture');
    return b;
  } finally {
    host.remove();
  }
}

/* ───────── Lottie ───────── */

/**
 * A Lottie file of the board: what never moves becomes one background picture; every element that
 * moves (each child of a stagger, each word) becomes a picture layer whose position, scale, turn and
 * opacity follow the same curves, sampled every frame. A reveal and a blur become a fade, a count
 * becomes a fade: Lottie players do not draw those the same way everywhere.
 */
export async function boardLottie(job: Job): Promise<Blob> {
  const board = job.page.board!;
  const fps = board.fps ?? 30;
  const { toPng } = await import('html-to-image');
  const { host, root, fontEmbedCSS, L } = await mount(job);
  const rtl = job.page.dir === 'rtl';
  const K = board.w / L.w;
  try {
    // the elements that move, in drawing order
    const els: { el: HTMLElement; anim: Parameters<typeof stateAt>[0]; i: number; em: number }[] = [];
    for (const tg of targetsOf(root)) {
      const el = host.querySelector<HTMLElement>(`[data-n="${CSS.escape(tg.id)}"]`);
      if (!el) continue;
      if (tg.word !== undefined) {
        const em = parseFloat(getComputedStyle(el).fontSize) || 16;
        el.querySelectorAll<HTMLElement>('.w').forEach((w, i) => els.push({ el: w, anim: tg.anim, i, em }));
      } else els.push({ el, anim: tg.anim, i: tg.i, em: 16 });
    }
    const box = host.getBoundingClientRect();
    const opts = { fontEmbedCSS, cacheBust: false, skipAutoScale: true, pixelRatio: K };
    const parentOf = (el: HTMLElement) => els.findIndex((x) => x.el !== el && x.el.contains(el));
    // pictures: each element without the moving elements inside it; then the background without any
    const assets: { id: string; w: number; h: number; u: string; p: string; e: 1 }[] = [];
    const geo: { x: number; y: number; w: number; h: number }[] = [];
    for (let k = 0; k < els.length; k++) {
      const { el } = els[k];
      const inner = els.filter((x) => x.el !== el && el.contains(x.el));
      inner.forEach((x) => (x.el.style.visibility = 'hidden'));
      const r = el.getBoundingClientRect();
      geo.push({ x: r.left - box.left, y: r.top - box.top, w: Math.max(1, Math.ceil(r.width)), h: Math.max(1, Math.ceil(r.height)) });
      // the picture is drawn K times larger; the layer below is placed in board pixels
      const png = await toPng(el, { ...opts, width: geo[k].w, height: geo[k].h, style: { margin: '0', translate: 'none', scale: 'none', rotate: 'none', opacity: '1', clipPath: 'none', filter: 'none' } });
      inner.forEach((x) => (x.el.style.visibility = ''));
      assets.push({ id: `img_${k + 1}`, w: Math.round(geo[k].w * K), h: Math.round(geo[k].h * K), u: '', p: png, e: 1 });
      job.onProgress?.(((k + 1) / (els.length + 1)) * 0.8);
      if (job.signal?.aborted) throw new DOMException('aborted', 'AbortError');
    }
    els.forEach((x) => (x.el.style.visibility = 'hidden'));
    const bg = await toPng(host, { ...opts, width: L.w, height: L.h, backgroundColor: job.page.theme.bg, style: { position: 'static', left: '0', top: '0' } });
    els.forEach((x) => (x.el.style.visibility = ''));
    assets.push({ id: 'img_bg', w: board.w, h: board.h, u: '', p: bg, e: 1 });

    const len = boardLength(job.page, root);
    const n = Math.max(2, Math.round((len / 1000) * fps));
    const lin = { i: { x: [1], y: [1] }, o: { x: [0], y: [0] } };
    const track = (vals: number[][]) => {
      const same = (a: number[], b: number[]) => a.every((v, i) => Math.abs(v - b[i]) < 0.01);
      if (vals.every((v) => same(v, vals[0]))) return { a: 0, k: vals[0].length === 1 ? vals[0][0] : vals[0] };
      const k: object[] = [];
      vals.forEach((v, f) => {
        // keep a frame when it differs from the line through its neighbours
        const prev = vals[f - 1];
        const next = vals[f + 1];
        if (f > 0 && f < vals.length - 1 && same(prev, v) && same(v, next)) return;
        k.push(f < vals.length - 1 ? { t: f, s: v, ...lin } : { t: f, s: v });
      });
      return { a: 1, k };
    };
    const layers = els.map((x, k) => {
      const g = geo[k];
      const pi = parentOf(x.el);
      const origin = pi >= 0 ? { x: geo[pi].x, y: geo[pi].y } : { x: 0, y: 0 };
      const states: MState[] = Array.from({ length: n }, (_, f) => stateAt(x.anim, (f * 1000) / fps, x.i, rtl, x.em));
      const cx = (g.x - origin.x + g.w / 2) * K;
      const cy = (g.y - origin.y + g.h / 2) * K;
      return {
        ddd: 0,
        ind: k + 1,
        ty: 2,
        nm: (x.el.textContent ?? '').trim().slice(0, 40) || `Layer ${k + 1}`,
        refId: `img_${k + 1}`,
        sr: 1,
        ...(pi >= 0 ? { parent: pi + 1 } : {}),
        ks: {
          o: track(states.map((s) => [Math.round(s.opacity * (1 - s.clip / 100) * 1000) / 10])),
          r: track(states.map((s) => [Math.round(s.rotate * 100) / 100])),
          p: track(states.map((s) => [Math.round((cx + s.tx * K) * 100) / 100, Math.round((cy + s.ty * K) * 100) / 100, 0])),
          a: { a: 0, k: [(g.w * K) / 2, (g.h * K) / 2, 0] },
          s: track(states.map((s) => [Math.round(s.scale * 10000) / 100, Math.round(s.scale * 10000) / 100, 100])),
        },
        ao: 0,
        ip: 0,
        op: n,
        st: 0,
        bm: 0,
      };
    });
    const bgLayer = { ddd: 0, ind: els.length + 1, ty: 2, nm: 'Background', refId: 'img_bg', sr: 1, ks: { o: { a: 0, k: 100 }, r: { a: 0, k: 0 }, p: { a: 0, k: [board.w / 2, board.h / 2, 0] }, a: { a: 0, k: [board.w / 2, board.h / 2, 0] }, s: { a: 0, k: [100, 100, 100] } }, ao: 0, ip: 0, op: n, st: 0, bm: 0 };
    const json = { v: '5.7.4', fr: fps, ip: 0, op: n, w: board.w, h: board.h, nm: job.tr ? job.tr(job.page.title) : job.page.title, ddd: 0, assets, layers: [...layers.reverse(), bgLayer], markers: [], meta: { g: 'FrantoS' } };
    job.onProgress?.(1);
    return new Blob([JSON.stringify(json)], { type: 'application/json' });
  } finally {
    host.remove();
  }
}
