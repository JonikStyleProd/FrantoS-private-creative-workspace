/**
 * Files beyond photos and video: screens, SVG, Lottie, fonts, code, links and sound.
 * Each one gets a picture of itself (a preview drawn here) so it sits in the library, on boards and in
 * links like any image; the original file stays with it for the specimen, player or code view.
 */
import type { AssetFormat } from './types';

export const FORMAT_ACCEPT = '.svg,image/svg+xml,.json,.ttf,.otf,.woff,.woff2,.html,.htm,.css,.js,.jsx,.ts,.tsx,.md,.txt,.vue,.svelte,.py,audio/*';

const CODE_EXT: Record<string, string> = { html: 'html', htm: 'html', css: 'css', js: 'js', jsx: 'jsx', ts: 'ts', tsx: 'tsx', md: 'md', txt: 'text', vue: 'vue', svelte: 'svelte', py: 'python', json: 'json' };
const ext = (name: string) => (name.match(/\.([a-z0-9]+)$/i)?.[1] ?? '').toLowerCase();

/** what a file is, or null for a plain picture or video */
export async function sniff(file: File): Promise<{ format: AssetFormat; lang?: string } | null> {
  const e = ext(file.name);
  if (file.type === 'image/svg+xml' || e === 'svg') return { format: 'svg' };
  if (['ttf', 'otf', 'woff', 'woff2'].includes(e) || file.type.startsWith('font/')) return { format: 'font' };
  if (file.type.startsWith('audio/')) return { format: 'audio' };
  if (e === 'json') {
    try {
      const j = JSON.parse(await file.slice(0, 4 * 1024 * 1024).text());
      if (j && typeof j === 'object' && 'layers' in j && ('fr' in j || 'v' in j)) return { format: 'lottie' };
    } catch {
      /* not JSON we can read: treat as code */
    }
    return { format: 'code', lang: 'json' };
  }
  if (CODE_EXT[e]) return { format: 'code', lang: CODE_EXT[e] };
  return null;
}

/** a phone, tablet or desktop screen, guessed from the proportions of a UI picture */
export function deviceFor(w: number, h: number): 'phone' | 'tablet' | 'desktop' {
  const r = w / h;
  if (r < 0.62) return 'phone';
  if (r < 1.05) return 'tablet';
  return 'desktop';
}

/* ───────── previews ───────── */

const W = 960;
const H = 720;
const INK = '#14171c';
const PAPER = '#f3efe7';

function canvas(w = W, h = H) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return { c, g: c.getContext('2d')! };
}
const toBlob = (c: HTMLCanvasElement) => new Promise<Blob | null>((r) => c.toBlob(r, 'image/webp', 0.86));

function label(g: CanvasRenderingContext2D, text: string, x: number, y: number, color: string) {
  g.font = '700 22px Manrope, system-ui, sans-serif';
  g.fillStyle = color;
  g.fillText(text.toUpperCase(), x, y);
}

/** SVG: drawn on paper at its own proportions */
export async function svgPreview(file: Blob) {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const iw = img.naturalWidth || 800;
    const ih = img.naturalHeight || 600;
    const s = Math.min(1, 1600 / Math.max(iw, ih));
    const w = Math.max(240, Math.round(iw * s));
    const h = Math.max(240, Math.round(ih * s));
    const { c, g } = canvas(w, h);
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, w, h);
    g.drawImage(img, 0, 0, w, h);
    return { w: iw, h: ih, thumb: await toBlob(c) };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** a font: its name, "Aa" and a line of the alphabet in the face itself */
export async function fontPreview(file: Blob, name: string) {
  const family = `ff-${Math.random().toString(36).slice(2, 8)}`;
  const face = new FontFace(family, await file.arrayBuffer());
  await face.load();
  (document.fonts as unknown as { add: (f: FontFace) => void }).add(face);
  const { c, g } = canvas();
  g.fillStyle = PAPER;
  g.fillRect(0, 0, W, H);
  label(g, 'Typeface', 56, 76, '#8a8478');
  g.fillStyle = INK;
  g.font = `340px ${family}`;
  g.fillText('Aa', 48, 420);
  g.font = `44px ${family}`;
  g.fillText(name.slice(0, 32), 56, 540);
  g.font = `30px ${family}`;
  g.fillStyle = '#4a463f';
  g.fillText('ABCDEFGHIJKLM abcdefghijklm 0123456789', 56, 610, W - 112);
  g.fillText('אבגדהוזחטי · абвгдеёжзий', 56, 660, W - 112);
  return { w: W, h: H, thumb: await toBlob(c) };
}

/** code: the first lines, set in mono on a dark sheet with the file name as a tab */
export async function codePreview(text: string, name: string, lang: string) {
  const { c, g } = canvas();
  g.fillStyle = '#12151a';
  g.fillRect(0, 0, W, H);
  g.fillStyle = '#1c2129';
  g.fillRect(0, 0, W, 70);
  ['#ff6b5e', '#ffc04a', '#3fcf6b'].forEach((col, i) => {
    g.fillStyle = col;
    g.beginPath();
    g.arc(36 + i * 26, 35, 8, 0, Math.PI * 2);
    g.fill();
  });
  g.font = '600 22px "JetBrains Mono", ui-monospace, monospace';
  g.fillStyle = '#c9d1dc';
  g.fillText(name, 130, 43);
  g.fillStyle = '#ff9a6b';
  g.textAlign = 'end';
  g.fillText(lang.toUpperCase(), W - 30, 43);
  g.textAlign = 'start';
  const lines = text.replace(/\t/g, '  ').split('\n').slice(0, 19);
  g.font = '22px "JetBrains Mono", ui-monospace, monospace';
  lines.forEach((l, i) => {
    g.fillStyle = '#4b5563';
    g.fillText(String(i + 1).padStart(2, ' '), 26, 116 + i * 31);
    const tone = /^\s*(\/\/|#|<!--|\/\*|\*)/.test(l) ? '#6b7a8c' : /^\s*(import|export|const|let|function|return|class|def|from)\b/.test(l) ? '#9db8ff' : /^\s*[.#@a-z-]+[^:]*\{/.test(l) ? '#ffcf70' : /^\s*</.test(l) ? '#7fe0a1' : '#e6e9ee';
    g.fillStyle = tone;
    g.fillText(l.slice(0, 64), 74, 116 + i * 31);
  });
  return { w: W, h: H, thumb: await toBlob(c) };
}

/** a link: the site's name large, the address under it */
export async function linkPreview(url: string, title?: string) {
  let host = url;
  try {
    host = new URL(url).hostname.replace(/^www\./, '');
  } catch {
    /* keep as typed */
  }
  const { c, g } = canvas(W, 600);
  const hue = [...host].reduce((n, ch) => (n * 31 + ch.charCodeAt(0)) % 360, 7);
  const grd = g.createLinearGradient(0, 0, W, 600);
  grd.addColorStop(0, `hsl(${hue} 46% 22%)`);
  grd.addColorStop(1, `hsl(${(hue + 40) % 360} 52% 12%)`);
  g.fillStyle = grd;
  g.fillRect(0, 0, W, 600);
  g.fillStyle = 'rgba(255,255,255,0.1)';
  g.fillRect(48, 48, W - 96, 52);
  g.fillStyle = 'rgba(255,255,255,0.75)';
  g.font = '500 24px Manrope, system-ui, sans-serif';
  g.fillText(url.slice(0, 60), 72, 82);
  label(g, 'Website', 56, 210, 'rgba(255,255,255,0.6)');
  g.fillStyle = '#ffffff';
  g.font = '800 92px Manrope, system-ui, sans-serif';
  g.fillText((title || host).slice(0, 18), 52, 330, W - 104);
  g.font = '500 30px Manrope, system-ui, sans-serif';
  g.fillStyle = 'rgba(255,255,255,0.8)';
  g.fillText(host, 56, 400);
  return { w: W, h: 600, thumb: await toBlob(c) };
}

/** sound: a waveform of the whole file and its length */
export async function audioPreview(file: Blob, name: string) {
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ac = new AC();
  let duration = 0;
  let peaks: number[] = [];
  try {
    const buf = await ac.decodeAudioData(await file.arrayBuffer());
    duration = buf.duration;
    const d = buf.getChannelData(0);
    const n = 180;
    const step = Math.floor(d.length / n) || 1;
    for (let i = 0; i < n; i++) {
      let m = 0;
      for (let j = i * step; j < (i + 1) * step && j < d.length; j += 8) m = Math.max(m, Math.abs(d[j]));
      peaks.push(m);
    }
  } finally {
    ac.close();
  }
  const top = Math.max(0.01, ...peaks);
  peaks = peaks.map((p) => p / top);
  const { c, g } = canvas(W, 540);
  g.fillStyle = '#16181d';
  g.fillRect(0, 0, W, 540);
  label(g, 'Sound', 56, 76, 'rgba(255,255,255,0.55)');
  g.fillStyle = '#ffffff';
  g.font = '800 44px Manrope, system-ui, sans-serif';
  g.fillText(name.slice(0, 34), 56, 136, W - 112);
  const mid = 340;
  peaks.forEach((p, i) => {
    const x = 56 + i * ((W - 112) / peaks.length);
    const h = Math.max(3, p * 150);
    g.fillStyle = i % 2 ? '#ff9a6b' : '#ffb995';
    g.fillRect(x, mid - h / 2, 3, h);
  });
  g.fillStyle = 'rgba(255,255,255,0.7)';
  g.font = '600 26px "JetBrains Mono", ui-monospace, monospace';
  const m = Math.floor(duration / 60);
  g.fillText(`${m}:${String(Math.round(duration - m * 60)).padStart(2, '0')}`, 56, 490);
  return { w: W, h: 540, duration, thumb: await toBlob(c) };
}

/** Lottie: the frame a third of the way in, drawn by the player itself */
export async function lottiePreview(json: unknown) {
  const { default: lottie } = await import('lottie-web/build/player/lottie_light');
  const j = json as { w?: number; h?: number };
  const w = j.w || 512;
  const h = j.h || 512;
  const host = document.createElement('div');
  host.style.cssText = `position:fixed;left:-99999px;top:0;width:${w}px;height:${h}px`;
  document.body.appendChild(host);
  try {
    const anim = lottie.loadAnimation({ container: host, renderer: 'svg', loop: false, autoplay: false, animationData: json });
    await new Promise<void>((r) => (anim.isLoaded ? r() : anim.addEventListener('DOMLoaded', () => r())));
    anim.goToAndStop(Math.floor(anim.totalFrames / 3), true);
    const svg = host.querySelector('svg')!;
    svg.setAttribute('width', String(w));
    svg.setAttribute('height', String(h));
    const xml = new XMLSerializer().serializeToString(svg);
    const res = await svgPreview(new Blob([xml], { type: 'image/svg+xml' }));
    const duration = anim.totalFrames / (anim.frameRate || 30);
    anim.destroy();
    return { ...res, duration };
  } finally {
    host.remove();
  }
}
